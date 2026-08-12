// 视频调试：本地/URL/M3U/HLS 播放 · 元数据 · 事件日志 · 截帧

var _vdObjectUrl = null;
var _vdLastFrame = null; // { blob, dataUrl, width, height, time }
var _vdLogEntries = []; // { t, level, msg }
var _vdBound = false;
var _vdFileMeta = null; // { name, size, type } | null
var _vdLastTimeUpdate = 0;
var _vdHls = null; // hls.js 实例
var _vdChannels = []; // M3U 解析后的频道
var _vdChannelIndex = -1;
var _vdPlayMode = ''; // direct | hls | playlist
var _vdActiveUrl = '';
var _vdProxyAvailable = null; // null=未探测；true/false
var _vdUseProxy = false; // 当前加载是否走同源 CORS 代理

/**
 * 格式化时长
 * @param {number} sec
 * @returns {string}
 */
function vdFormatDuration(sec) {
    if (sec == null || !isFinite(sec)) return '—';
    var s = Math.max(0, Number(sec));
    var totalMs = Math.round(s * 1000);
    var ms = totalMs % 1000;
    var totalSec = Math.floor(totalMs / 1000);
    var h = Math.floor(totalSec / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var secPart = totalSec % 60;
    var msStr = String(ms).padStart(3, '0');
    var ss = String(secPart).padStart(2, '0');
    if (h > 0) {
        return h + ':' + String(m).padStart(2, '0') + ':' + ss + '.' + msStr;
    }
    return m + ':' + ss + '.' + msStr;
}

/**
 * readyState 映射
 * @param {number} n
 * @returns {string}
 */
function vdFormatReadyState(n) {
    var map = {
        0: 'HAVE_NOTHING',
        1: 'HAVE_METADATA',
        2: 'HAVE_CURRENT_DATA',
        3: 'HAVE_FUTURE_DATA',
        4: 'HAVE_ENOUGH_DATA',
    };
    if (map[n] != null) return map[n];
    return 'READY(' + n + ')';
}

/**
 * networkState 映射
 * @param {number} n
 * @returns {string}
 */
function vdFormatNetworkState(n) {
    var map = {
        0: 'NETWORK_EMPTY',
        1: 'NETWORK_IDLE',
        2: 'NETWORK_LOADING',
        3: 'NETWORK_NO_SOURCE',
    };
    if (map[n] != null) return map[n];
    return 'NETWORK(' + n + ')';
}

/**
 * MediaError 中文说明
 * @param {number} code
 * @returns {string}
 */
function vdMediaErrorMessage(code) {
    var map = {
        1: '用户中止加载 (MEDIA_ERR_ABORTED)',
        2: '网络错误 (MEDIA_ERR_NETWORK)',
        3: '解码失败 (MEDIA_ERR_DECODE)',
        4: '不支持的格式/源 (MEDIA_ERR_SRC_NOT_SUPPORTED)',
    };
    if (map[code] != null) return map[code];
    return '未知媒体错误 (code=' + code + ')';
}

/**
 * canPlayType 结果标签
 * @param {string|*} videoElOrCanPlayResult
 * @returns {string}
 */
function vdCanPlayLabel(videoElOrCanPlayResult) {
    var r = videoElOrCanPlayResult;
    if (r && typeof r === 'object' && typeof r.canPlayType === 'function') {
        return '—';
    }
    var s = r == null ? '' : String(r);
    if (s === '') return '不支持';
    if (s === 'maybe') return '可能';
    if (s === 'probably') return '很可能';
    return s;
}

/**
 * 时间范围列表格式化
 * @param {{ length: number, start: function, end: function }|null} tr
 * @returns {string}
 */
function vdFormatTimeRanges(tr) {
    if (!tr || !tr.length) return '—';
    var parts = [];
    for (var i = 0; i < tr.length; i++) {
        try {
            parts.push(vdFormatDuration(tr.start(i)) + '–' + vdFormatDuration(tr.end(i)));
        } catch (e) {
            /* ignore */
        }
    }
    return parts.length ? parts.join(', ') : '—';
}

/**
 * 从 video 元素解析快照 meta
 * @param {HTMLVideoElement|object|null} video
 * @returns {object}
 */
function vdParseVideoSnapshot(video) {
    if (!video) {
        return {
            source: '',
            width: 0,
            height: 0,
            duration: NaN,
            currentTime: 0,
            paused: true,
            muted: false,
            volume: 1,
            playbackRate: 1,
            readyState: 0,
            networkState: 0,
            seekable: null,
            buffered: null,
            error: null,
        };
    }
    var err = null;
    if (video.error) {
        err = {
            code: video.error.code,
            message: video.error.message || vdMediaErrorMessage(video.error.code),
        };
    }
    return {
        source: video.currentSrc || video.src || '',
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
        duration: video.duration,
        currentTime: video.currentTime || 0,
        paused: !!video.paused,
        muted: !!video.muted,
        volume: video.volume != null ? video.volume : 1,
        playbackRate: video.playbackRate != null ? video.playbackRate : 1,
        readyState: video.readyState != null ? video.readyState : 0,
        networkState: video.networkState != null ? video.networkState : 0,
        seekable: video.seekable || null,
        buffered: video.buffered || null,
        error: err,
    };
}

/**
 * 构建媒体信息纯文本
 * @param {object} meta
 * @returns {string}
 */
function vdBuildMediaInfo(meta) {
    meta = meta || {};
    var lines = [];
    lines.push('来源: ' + (meta.source || '—'));
    if (meta.fileName) {
        lines.push('文件名: ' + meta.fileName);
    }
    if (meta.fileSize != null && meta.fileSize !== '') {
        var sizeStr =
            typeof formatBytes === 'function'
                ? formatBytes(meta.fileSize)
                : String(meta.fileSize) + ' B';
        lines.push('文件大小: ' + sizeStr);
    }
    if (meta.mime) {
        lines.push('MIME: ' + meta.mime);
    }
    lines.push(
        '分辨率: ' +
            (meta.width && meta.height ? meta.width + ' × ' + meta.height : '—')
    );
    lines.push('时长: ' + vdFormatDuration(meta.duration));
    lines.push('当前时间: ' + vdFormatDuration(meta.currentTime));
    lines.push('状态: ' + (meta.paused ? '暂停' : '播放中'));
    lines.push('静音: ' + (meta.muted ? '是' : '否'));
    lines.push(
        '音量: ' +
            (meta.volume != null && isFinite(meta.volume)
                ? Math.round(meta.volume * 100) + '%'
                : '—')
    );
    lines.push(
        '倍速: ' +
            (meta.playbackRate != null && isFinite(meta.playbackRate)
                ? meta.playbackRate + 'x'
                : '—')
    );
    lines.push(
        'readyState: ' +
            meta.readyState +
            ' (' +
            vdFormatReadyState(meta.readyState) +
            ')'
    );
    lines.push(
        'networkState: ' +
            meta.networkState +
            ' (' +
            vdFormatNetworkState(meta.networkState) +
            ')'
    );
    lines.push('可 seek: ' + vdFormatTimeRanges(meta.seekable));
    lines.push('已缓冲: ' + vdFormatTimeRanges(meta.buffered));
    if (meta.error) {
        var em =
            typeof meta.error === 'object'
                ? meta.error.message || vdMediaErrorMessage(meta.error.code)
                : String(meta.error);
        lines.push('错误: ' + em);
    } else {
        lines.push('错误: 无');
    }
    return lines.join('\n');
}

/**
 * 校验截帧源
 * @param {HTMLVideoElement|object|null} video
 * @returns {{ ok: boolean, error?: string, width?: number, height?: number, time?: number }}
 */
function vdValidateCaptureSource(video) {
    if (!video) {
        return { ok: false, error: '无视频元素' };
    }
    var w = video.videoWidth || 0;
    var h = video.videoHeight || 0;
    if (!w || !h) {
        return { ok: false, error: '视频尚未就绪或无有效画面尺寸' };
    }
    return {
        ok: true,
        width: w,
        height: h,
        time: video.currentTime || 0,
    };
}

/**
 * 是否像 M3U 播放列表正文（#EXTM3U 或 #EXTINF 列表，非纯 HLS 分片清单也可）
 * @param {string} text
 * @returns {boolean}
 */
function vdLooksLikeM3u(text) {
    if (!text || typeof text !== 'string') return false;
    var t = text.replace(/^\uFEFF/, '').trim();
    if (!t) return false;
    if (/^#EXTM3U/im.test(t)) return true;
    if (/#EXTINF\s*:/i.test(t) && /https?:\/\//i.test(t)) return true;
    return false;
}

/**
 * 是否像 HLS 媒体播放列表（含分片），而非仅频道目录
 * @param {string} text
 * @returns {boolean}
 */
function vdLooksLikeHlsMediaPlaylist(text) {
    if (!text || typeof text !== 'string') return false;
    var t = text;
    if (/#EXT-X-TARGETDURATION/i.test(t)) return true;
    if (/#EXT-X-STREAM-INF/i.test(t)) return true;
    if (/#EXT-X-MEDIA-SEQUENCE/i.test(t)) return true;
    if (/#EXTINF\s*:/i.test(t) && /\.ts(\?|$)/im.test(t)) return true;
    if (/#EXTINF\s*:/i.test(t) && /#EXT-X-ENDLIST/i.test(t)) return true;
    return false;
}

/**
 * URL 扩展名是否像 m3u / m3u8
 * @param {string} url
 * @returns {{ isM3u: boolean, isM3u8: boolean }}
 */
function vdUrlPlaylistHint(url) {
    var u = String(url || '').split('#')[0].split('?')[0].toLowerCase();
    return {
        isM3u: /\.m3u$/i.test(u),
        isM3u8: /\.m3u8$/i.test(u),
    };
}

/**
 * 解析 EXTINF 行属性与标题
 * @param {string} line #EXTINF:...
 * @returns {{ duration: number, title: string, attrs: object }}
 */
function vdParseExtinf(line) {
    var raw = String(line || '');
    var m = raw.match(/^#EXTINF\s*:\s*(-?\d+(?:\.\d+)?)?\s*(.*)$/i);
    if (!m) {
        return { duration: -1, title: '', attrs: {} };
    }
    var duration = m[1] != null && m[1] !== '' ? parseFloat(m[1]) : -1;
    var rest = (m[2] || '').trim();
    var title = '';
    var attrPart = rest;
    var comma = rest.lastIndexOf(',');
    if (comma >= 0) {
        attrPart = rest.slice(0, comma).trim();
        title = rest.slice(comma + 1).trim();
    }
    var attrs = {};
    var re = /([A-Za-z0-9_-]+)="([^"]*)"/g;
    var am;
    while ((am = re.exec(attrPart))) {
        attrs[am[1].toLowerCase()] = am[2];
    }
    return {
        duration: isFinite(duration) ? duration : -1,
        title: title,
        attrs: attrs,
    };
}

/**
 * 相对 URL 基于 base 解析
 * @param {string} baseUrl
 * @param {string} ref
 * @returns {string}
 */
function vdResolveUrl(baseUrl, ref) {
    var r = String(ref || '').trim();
    if (!r) return '';
    if (/^https?:\/\//i.test(r) || /^blob:/i.test(r) || /^data:/i.test(r)) return r;
    try {
        if (typeof URL !== 'undefined') {
            return new URL(r, baseUrl || 'https://local.invalid/').href;
        }
    } catch (e) {
        /* ignore */
    }
    return r;
}

/**
 * 解析 M3U / M3U8 文本为频道条目
 * @param {string} text
 * @param {string} [baseUrl]
 * @returns {{ header: object, items: Array<{ title: string, group: string, logo: string, url: string, duration: number, attrs: object }> }}
 */
function vdParseM3u(text, baseUrl) {
    var raw = String(text || '').replace(/^\uFEFF/, '');
    var lines = raw.split(/\r?\n/);
    var header = {};
    var items = [];
    var pending = null;
    var i;
    for (i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;
        if (line.charAt(0) === '#') {
            if (/^#EXTM3U/i.test(line)) {
                var hm = line.match(/([A-Za-z0-9_-]+)="([^"]*)"/g);
                if (hm) {
                    hm.forEach(function (pair) {
                        var pm = pair.match(/([A-Za-z0-9_-]+)="([^"]*)"/);
                        if (pm) header[pm[1].toLowerCase()] = pm[2];
                    });
                }
                continue;
            }
            if (/^#EXTINF/i.test(line)) {
                pending = vdParseExtinf(line);
                continue;
            }
            // 其它标签忽略（HLS 分片清单里由 hls.js 处理）
            continue;
        }
        // URL 行
        var url = vdResolveUrl(baseUrl, line);
        if (!url) continue;
        var title = (pending && pending.title) || '';
        var attrs = (pending && pending.attrs) || {};
        if (!title) {
            title = attrs['tvg-name'] || attrs['tvg-id'] || '频道 ' + (items.length + 1);
        }
        items.push({
            title: title,
            group: attrs['group-title'] || attrs.group || '',
            logo: attrs['tvg-logo'] || attrs.logo || '',
            url: url,
            duration: pending ? pending.duration : -1,
            attrs: attrs,
        });
        pending = null;
    }
    return { header: header, items: items };
}

/**
 * 判断是否应作为「频道列表」展示（多条目 IPTV），而非单流 HLS
 * @param {{ items: Array }} parsed
 * @param {string} text
 * @returns {boolean}
 */
function vdIsChannelPlaylist(parsed, text) {
    if (!parsed || !parsed.items || !parsed.items.length) return false;
    // HLS 媒体/主播放列表交给 hls.js，即使解析出多条 segment
    if (vdLooksLikeHlsMediaPlaylist(text)) return false;
    if (parsed.items.length >= 2) return true;
    // 单条目目录（EXTINF + 一条流 URL）仍可当频道
    return true;
}

function vdDestroyHls() {
    if (_vdHls) {
        try {
            _vdHls.destroy();
        } catch (e) {
            /* ignore */
        }
        _vdHls = null;
    }
}

function vdRevokeObjectUrl() {
    if (_vdObjectUrl) {
        try {
            URL.revokeObjectURL(_vdObjectUrl);
        } catch (e) {
            /* ignore */
        }
        _vdObjectUrl = null;
    }
}

function vdClearMediaSource() {
    vdDestroyHls();
    vdRevokeObjectUrl();
    var video = document.getElementById('vdPlayer');
    if (video) {
        try {
            video.pause();
        } catch (e) {
            /* ignore */
        }
        try {
            video.removeAttribute('src');
            video.load();
        } catch (err) {
            /* ignore */
        }
    }
    _vdActiveUrl = '';
    _vdPlayMode = '';
    _vdUseProxy = false;
}

function vdStatusClass(kind) {
    if (kind === 'connected') return 'ws-status connected';
    if (kind === 'connecting') return 'ws-status connecting';
    return 'ws-status disconnected';
}

function vdUpdateStatus(text, cls) {
    var el = document.getElementById('vdStatus');
    if (!el) return;
    el.className = vdStatusClass(cls || 'disconnected');
    el.innerHTML = '<span class="ws-dot"></span> ' + escapeHtml(text || '');
}

function vdRenderLog() {
    var log = document.getElementById('vdLog');
    if (!log) return;
    if (_vdLogEntries.length === 0) {
        log.innerHTML = '<div class="vd-log-empty">暂无事件日志</div>';
        return;
    }
    var html = '';
    for (var i = 0; i < _vdLogEntries.length; i++) {
        var e = _vdLogEntries[i];
        var lv = e.level || 'info';
        html +=
            '<div class="vd-log-entry level-' +
            escapeHtml(lv) +
            '">' +
            '<span class="vd-log-time">' +
            escapeHtml(e.t) +
            '</span> ' +
            '<span class="vd-log-level">[' +
            escapeHtml(lv) +
            ']</span> ' +
            '<span class="vd-log-msg">' +
            escapeHtml(e.msg) +
            '</span></div>';
    }
    log.innerHTML = html;
    log.scrollTop = log.scrollHeight;
}

function vdAddLog(level, msg) {
    var t = new Date().toLocaleTimeString();
    _vdLogEntries.push({ t: t, level: level || 'info', msg: String(msg || '') });
    if (_vdLogEntries.length > 300) {
        _vdLogEntries = _vdLogEntries.slice(_vdLogEntries.length - 300);
    }
    vdRenderLog();
}

function vdClearLog() {
    _vdLogEntries = [];
    vdRenderLog();
    if (typeof setStatus === 'function') setStatus('日志已清空');
}

function vdCopyLog() {
    if (_vdLogEntries.length === 0) {
        if (typeof toast === 'function') toast('没有日志可复制');
        return;
    }
    var text = _vdLogEntries
        .map(function (e) {
            return '[' + e.t + '] [' + e.level + '] ' + e.msg;
        })
        .join('\n');
    if (typeof safeCopy === 'function') {
        safeCopy(text, '日志已复制');
    }
}

function vdCopyInfo() {
    var info = document.getElementById('vdInfo');
    var text = info ? info.textContent || info.innerText || '' : '';
    if (!text.trim()) {
        if (typeof toast === 'function') toast('没有信息可复制');
        return;
    }
    if (typeof safeCopy === 'function') {
        safeCopy(text, '媒体信息已复制');
    }
}

function vdRefreshInfo() {
    var video = document.getElementById('vdPlayer');
    var snap = vdParseVideoSnapshot(video);
    if (_vdFileMeta) {
        snap.fileName = _vdFileMeta.name;
        snap.fileSize = _vdFileMeta.size;
        snap.mime = _vdFileMeta.type;
    }
    if (_vdActiveUrl && !snap.source) {
        snap.source = _vdActiveUrl;
    }
    if (_vdPlayMode) {
        snap.source =
            (snap.source || _vdActiveUrl || '') +
            (_vdPlayMode ? '  [' + _vdPlayMode + ']' : '');
    }
    if (_vdChannelIndex >= 0 && _vdChannels[_vdChannelIndex]) {
        var ch = _vdChannels[_vdChannelIndex];
        snap.fileName = (snap.fileName ? snap.fileName + ' / ' : '') + ch.title;
        if (ch.group) {
            snap.mime = (snap.mime ? snap.mime + ' · ' : '') + '分组: ' + ch.group;
        }
    }
    var text = vdBuildMediaInfo(snap);
    var infoEl = document.getElementById('vdInfo');
    if (infoEl) infoEl.textContent = text;

    var metaEl = document.getElementById('vdMeta');
    if (metaEl) {
        var short =
            (snap.width && snap.height ? snap.width + '×' + snap.height : '—') +
            ' · ' +
            vdFormatDuration(snap.currentTime) +
            ' / ' +
            vdFormatDuration(snap.duration) +
            ' · ' +
            (snap.paused ? '暂停' : '播放');
        if (_vdChannels.length) {
            short += ' · 频道 ' + (_vdChannelIndex >= 0 ? _vdChannelIndex + 1 : '—') + '/' + _vdChannels.length;
        }
        metaEl.textContent = short;
    }
}

function vdHideChannels() {
    _vdChannels = [];
    _vdChannelIndex = -1;
    var box = document.getElementById('vdChannels');
    if (box) box.hidden = true;
    var badge = document.getElementById('vdChannelBadge');
    if (badge) {
        badge.hidden = true;
        badge.textContent = '';
    }
    var list = document.getElementById('vdChannelList');
    if (list) list.innerHTML = '';
    var filter = document.getElementById('vdChannelFilter');
    if (filter) filter.value = '';
    var cnt = document.getElementById('vdChannelsCount');
    if (cnt) cnt.textContent = '';
}

function vdRenderChannels(filterText) {
    var list = document.getElementById('vdChannelList');
    var box = document.getElementById('vdChannels');
    var cnt = document.getElementById('vdChannelsCount');
    if (!list || !box) return;
    if (!_vdChannels.length) {
        box.hidden = true;
        return;
    }
    box.hidden = false;
    var q = String(filterText || '')
        .trim()
        .toLowerCase();
    var html = '';
    var shown = 0;
    for (var i = 0; i < _vdChannels.length; i++) {
        var c = _vdChannels[i];
        var hay = (c.title + ' ' + c.group + ' ' + c.url).toLowerCase();
        if (q && hay.indexOf(q) < 0) continue;
        shown++;
        var active = i === _vdChannelIndex ? ' active' : '';
        html +=
            '<button type="button" class="vd-channel-item' +
            active +
            '" data-idx="' +
            i +
            '" onclick="vdSelectChannel(' +
            i +
            ')">' +
            '<span class="vd-channel-title">' +
            escapeHtml(c.title) +
            '</span>' +
            (c.group
                ? '<span class="vd-channel-group">' + escapeHtml(c.group) + '</span>'
                : '') +
            '<span class="vd-channel-url" title="' +
            escapeHtml(c.url) +
            '">' +
            escapeHtml(c.url) +
            '</span></button>';
    }
    if (!shown) {
        html = '<div class="vd-log-empty">无匹配频道</div>';
    }
    list.innerHTML = html;
    if (cnt) {
        cnt.textContent =
            shown === _vdChannels.length
                ? _vdChannels.length + ' 个'
                : shown + ' / ' + _vdChannels.length;
    }
}

function vdFilterChannels() {
    var filter = document.getElementById('vdChannelFilter');
    vdRenderChannels(filter ? filter.value : '');
}

function vdSetChannelBadge(title) {
    var badge = document.getElementById('vdChannelBadge');
    if (!badge) return;
    if (!title) {
        badge.hidden = true;
        badge.textContent = '';
        return;
    }
    badge.hidden = false;
    badge.textContent = title;
}

/**
 * hls.js Loader：在 load 前把跨源 URL 改写为同源代理
 * @returns {Function|undefined} Loader 构造函数
 */
function vdCreateProxiedHlsLoader() {
    if (typeof Hls === 'undefined' || !Hls.DefaultConfig || !Hls.DefaultConfig.loader) {
        return undefined;
    }
    var BaseLoader = Hls.DefaultConfig.loader;
    function ProxiedLoader(config) {
        var loader = new BaseLoader(config);
        var origLoad = loader.load.bind(loader);
        loader.load = function (context, conf, callbacks) {
            if (
                context &&
                context.url &&
                _vdUseProxy &&
                vdIsCrossOrigin(context.url)
            ) {
                context.url = vdProxyUrl(context.url);
            }
            return origLoad(context, conf, callbacks);
        };
        // 透传 abort/destroy
        return loader;
    }
    return ProxiedLoader;
}

/**
 * 使用 hls.js 或原生 HLS 播放
 * @param {string} url
 * @param {HTMLVideoElement} video
 * @returns {boolean} 是否已接管
 */
function vdAttachHls(url, video) {
    vdDestroyHls();
    if (typeof Hls !== 'undefined' && Hls.isSupported && Hls.isSupported()) {
        var useProxy =
            _vdUseProxy ||
            (vdIsCrossOrigin(url) && _vdProxyAvailable === true);
        if (useProxy) {
            _vdUseProxy = true;
            vdAddLog('info', 'HLS 经同源代理加载清单/分片');
        }
        var hlsOpts = {
            enableWorker: true,
            lowLatencyMode: false,
        };
        if (_vdUseProxy) {
            var ProxiedLoader = vdCreateProxiedHlsLoader();
            if (ProxiedLoader) {
                hlsOpts.loader = ProxiedLoader;
            }
            hlsOpts.fetchSetup = function (context, initParams) {
                if (context && context.url && vdIsCrossOrigin(context.url)) {
                    context.url = vdProxyUrl(context.url);
                }
                return new Request(context.url, initParams || {});
            };
        }
        var hls = new Hls(hlsOpts);
        _vdHls = hls;
        hls.on(Hls.Events.ERROR, function (event, data) {
            if (!data) return;
            var msg = (data.type || 'error') + ' ' + (data.details || '');
            if (data.fatal) {
                // 网络错误且尚未用代理：探测代理后重建
                if (
                    data.type === Hls.ErrorTypes.NETWORK_ERROR &&
                    !_vdUseProxy &&
                    vdIsCrossOrigin(url)
                ) {
                    vdAddLog('warn', 'HLS 网络错误，尝试同源代理…');
                    vdProbeCorsProxy().then(function (ok) {
                        if (!ok) {
                            vdAddLog(
                                'error',
                                'HLS fatal: ' +
                                    msg +
                                    '（无 /__cors_proxy，跨域流无法播放）'
                            );
                            vdUpdateStatus('HLS 错误', 'disconnected');
                            if (typeof toast === 'function') {
                                toast('跨域流被拦截且无本地代理');
                            }
                            return;
                        }
                        _vdUseProxy = true;
                        vdDestroyHls();
                        vdAttachHls(url, video);
                    });
                    return;
                }
                vdAddLog('error', 'HLS fatal: ' + msg);
                vdUpdateStatus('HLS 错误', 'disconnected');
                if (typeof toast === 'function') toast('HLS 播放失败: ' + (data.details || data.type));
                try {
                    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                        hls.startLoad();
                    } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                        hls.recoverMediaError();
                    }
                } catch (e) {
                    /* ignore */
                }
            } else {
                vdAddLog('warn', 'HLS: ' + msg);
            }
        });
        hls.on(Hls.Events.MANIFEST_PARSED, function () {
            vdAddLog('info', 'HLS manifest 已解析');
            vdUpdateStatus('已加载', 'connected');
            var p = video.play();
            if (p && typeof p.catch === 'function') {
                p.catch(function () {
                    /* 自动播放可能被拦截 */
                });
            }
            vdRefreshInfo();
        });
        hls.loadSource(url);
        hls.attachMedia(video);
        _vdPlayMode = 'hls';
        _vdActiveUrl = url;
        return true;
    }
    // Safari 等原生 HLS（无法注入代理改写，跨域仍可能失败）
    if (video.canPlayType && video.canPlayType('application/vnd.apple.mpegurl')) {
        var nativeSrc =
            _vdUseProxy && vdIsCrossOrigin(url) ? vdProxyUrl(url) : url;
        video.src = nativeSrc;
        video.load();
        _vdPlayMode = 'hls-native';
        _vdActiveUrl = url;
        return true;
    }
    return false;
}

/**
 * 播放媒体 URL（直链或 HLS）
 * @param {string} url
 * @param {{ forceHls?: boolean }} [opts]
 */
/**
 * 设置 video 的 CORS 模式：
 * - 跨域直链不要设 crossorigin（否则源站无 ACAO 时连播放都会失败，如多数演示 MP4）
 * - 同源 / blob / 经代理的 URL 可设 anonymous，便于截帧
 * @param {HTMLVideoElement} video
 * @param {string} srcUrl 实际赋给 video.src 的地址
 */
function vdApplyVideoCorsMode(video, srcUrl) {
    if (!video) return;
    var same =
        !srcUrl ||
        /^blob:|^data:/i.test(srcUrl) ||
        !vdIsCrossOrigin(srcUrl) ||
        (srcUrl.indexOf('/__cors_proxy') === 0);
    if (same) {
        video.crossOrigin = 'anonymous';
    } else {
        try {
            video.removeAttribute('crossorigin');
        } catch (e) {
            /* ignore */
        }
        try {
            video.crossOrigin = null;
        } catch (err) {
            /* ignore */
        }
    }
}

function vdPlayMediaUrl(url, opts) {
    opts = opts || {};
    var video = document.getElementById('vdPlayer');
    if (!video || !url) return;

    vdDestroyHls();
    try {
        video.pause();
    } catch (e) {
        /* ignore */
    }
    video.removeAttribute('src');

    var hint = vdUrlPlaylistHint(url);
    var wantHls = opts.forceHls || hint.isM3u8;

    if (wantHls) {
        if (vdAttachHls(url, video)) {
            vdUpdateStatus('加载中…', 'connecting');
            vdAddLog('info', 'HLS 加载: ' + url);
            if (typeof setStatus === 'function') setStatus('正在加载 HLS…');
            vdRefreshInfo();
            return;
        }
        vdAddLog('warn', '当前环境无 hls.js 且不支持原生 HLS，尝试直链');
    }

    // 直链：有同源代理时优先走代理（可播放 + 可截帧）；否则裸 src（仅播放，跨域截帧会失败）
    var playUrl = url;
    if (
        vdIsCrossOrigin(url) &&
        (_vdUseProxy || _vdProxyAvailable === true) &&
        !/^blob:|^data:/i.test(url)
    ) {
        playUrl = vdProxyUrl(url);
        _vdUseProxy = true;
        vdAddLog('info', '直链经同源代理加载（便于跨域与截帧）');
    }

    vdApplyVideoCorsMode(video, playUrl);
    video.src = playUrl;
    video.load();
    _vdPlayMode = 'direct';
    _vdActiveUrl = url;
    vdUpdateStatus('加载中…', 'connecting');
    vdAddLog('info', '直链加载: ' + url);
    if (typeof setStatus === 'function') setStatus('正在加载视频…');
    vdRefreshInfo();
}

function vdSelectChannel(index) {
    var i = Number(index);
    if (!isFinite(i) || i < 0 || i >= _vdChannels.length) return;
    _vdChannelIndex = i;
    var ch = _vdChannels[i];
    vdSetChannelBadge(ch.title);
    vdRenderChannels(
        document.getElementById('vdChannelFilter')
            ? document.getElementById('vdChannelFilter').value
            : ''
    );
    vdAddLog(
        'info',
        '切换频道: ' + ch.title + (ch.group ? ' [' + ch.group + ']' : '')
    );
    // IPTV 条目多数为 HLS 或直播；优先 HLS
    var forceHls =
        vdUrlPlaylistHint(ch.url).isM3u8 ||
        /m3u8/i.test(ch.url) ||
        !/\.(mp4|webm|ogg|mov|mkv)(\?|$)/i.test(ch.url);
    vdPlayMediaUrl(ch.url, { forceHls: forceHls });
}

/**
 * 应用已解析的 M3U 频道列表
 * @param {string} text
 * @param {string} [baseUrl]
 * @param {string} [label]
 * @returns {boolean} 是否作为频道列表处理
 */
function vdApplyPlaylistText(text, baseUrl, label) {
    if (!vdLooksLikeM3u(text)) return false;
    var parsed = vdParseM3u(text, baseUrl);
    if (!vdIsChannelPlaylist(parsed, text)) {
        // 单流 HLS 清单：直接交给 hls
        return false;
    }
    if (!parsed.items.length) {
        if (typeof toast === 'function') toast('M3U 中未解析到频道');
        vdAddLog('warn', 'M3U 无有效条目');
        return true;
    }
    _vdChannels = parsed.items;
    _vdChannelIndex = -1;
    _vdPlayMode = 'playlist';
    _vdFileMeta = _vdFileMeta || null;
    vdRenderChannels('');
    vdUpdateStatus('列表 ' + parsed.items.length + ' 频道', 'connected');
    vdAddLog(
        'info',
        '已解析 M3U' +
            (label ? ' (' + label + ')' : '') +
            '：' +
            parsed.items.length +
            ' 个频道'
    );
    if (typeof setStatus === 'function') {
        setStatus('M3U 已加载，请选择频道');
    }
    if (typeof toast === 'function') {
        toast('已加载 ' + parsed.items.length + ' 个频道，请点选播放');
    }
    // 自动选第一项
    vdSelectChannel(0);
    return true;
}

/**
 * 同源 CORS 代理 URL（与 httpdebug 一致）
 * @param {string} url
 * @returns {string}
 */
function vdProxyUrl(url) {
    return '/__cors_proxy?target=' + encodeURIComponent(url);
}

/**
 * 是否应视为跨源（需代理候选）
 * @param {string} url
 * @returns {boolean}
 */
function vdIsCrossOrigin(url) {
    try {
        if (typeof location === 'undefined' || !url) return true;
        if (/^blob:|^data:/i.test(url)) return false;
        var u = new URL(url, location.href);
        return u.origin !== location.origin;
    } catch (e) {
        return true;
    }
}

/**
 * 探测 /__cors_proxy 是否可用
 * @returns {Promise<boolean>}
 */
function vdProbeCorsProxy() {
    if (_vdProxyAvailable !== null) return Promise.resolve(_vdProxyAvailable);
    return fetch('/__cors_proxy', { method: 'GET', cache: 'no-store' })
        .then(function (resp) {
            var by = (resp.headers.get('x-proxied-by') || '').toLowerCase();
            if (by.indexOf('dev-tools-cors-proxy') >= 0) {
                _vdProxyAvailable = true;
                return true;
            }
            var ct = (resp.headers.get('content-type') || '').toLowerCase();
            // 静态站 SPA 回退 index.html → 代理未部署
            if (ct.indexOf('text/html') >= 0) {
                _vdProxyAvailable = false;
                return false;
            }
            if (resp.status === 400) {
                return resp.text().then(function (t) {
                    _vdProxyAvailable =
                        typeof t === 'string' &&
                        /Missing target/i.test(t) &&
                        ct.indexOf('text/html') < 0;
                    return _vdProxyAvailable;
                });
            }
            _vdProxyAvailable = false;
            return false;
        })
        .catch(function () {
            _vdProxyAvailable = false;
            return false;
        });
}

/**
 * fetch 文本：直连失败时自动经同源代理重试（绕过 CORS）
 * @param {string} url
 * @returns {Promise<string|null>}
 */
function vdFetchText(url) {
    function doFetch(reqUrl, viaProxy) {
        return fetch(reqUrl, { credentials: 'omit', mode: 'cors', cache: 'no-store' }).then(
            function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.text().then(function (text) {
                    if (viaProxy) {
                        _vdUseProxy = true;
                        vdAddLog('info', '已通过同源代理拉取（绕过 CORS）');
                    }
                    return text;
                });
            }
        );
    }

    return doFetch(url, false).catch(function (err) {
        var msg = err && err.message ? err.message : String(err);
        vdAddLog('warn', '直连拉取失败: ' + msg);
        if (!vdIsCrossOrigin(url)) {
            vdAddLog('error', '拉取失败: ' + msg);
            return null;
        }
        return vdProbeCorsProxy().then(function (ok) {
            if (!ok) {
                vdAddLog(
                    'error',
                    '拉取失败（CORS）。当前无 /__cors_proxy：请用 Docker/Vite dev，或 npm run cors-proxy + nginx 反代'
                );
                if (typeof toast === 'function') {
                    toast('跨域被拦截且无本地代理，无法拉取 M3U');
                }
                return null;
            }
            vdAddLog('info', '改用同源代理重试…');
            return doFetch(vdProxyUrl(url), true).catch(function (err2) {
                vdAddLog(
                    'error',
                    '代理拉取仍失败: ' +
                        (err2 && err2.message ? err2.message : err2)
                );
                return null;
            });
        });
    });
}

function vdBindPlayerEvents(video) {
    if (!video || video._vdEventsBound) return;
    video._vdEventsBound = true;

    function on(name, level, msgFn) {
        video.addEventListener(name, function () {
            var msg = typeof msgFn === 'function' ? msgFn() : name;
            vdAddLog(level || 'info', msg);
            if (name !== 'timeupdate') {
                vdRefreshInfo();
            }
        });
    }

    on('loadstart', 'info', function () {
        return 'loadstart';
    });
    on('loadedmetadata', 'info', function () {
        vdUpdateStatus('已加载', 'connected');
        if (typeof setStatus === 'function') setStatus('视频已加载');
        return (
            'loadedmetadata ' +
            (video.videoWidth || 0) +
            '×' +
            (video.videoHeight || 0) +
            ' duration=' +
            vdFormatDuration(video.duration)
        );
    });
    on('loadeddata', 'info', function () {
        return 'loadeddata';
    });
    on('canplay', 'info', function () {
        return 'canplay';
    });
    on('canplaythrough', 'info', function () {
        return 'canplaythrough';
    });
    on('play', 'info', function () {
        return 'play';
    });
    on('playing', 'info', function () {
        return 'playing';
    });
    on('pause', 'info', function () {
        return 'pause @ ' + vdFormatDuration(video.currentTime);
    });
    on('waiting', 'warn', function () {
        return 'waiting（缓冲中）';
    });
    on('stalled', 'warn', function () {
        return 'stalled（网络停滞）';
    });
    on('suspend', 'info', function () {
        return 'suspend';
    });
    on('ended', 'info', function () {
        return 'ended';
    });
    on('seeked', 'info', function () {
        return 'seeked → ' + vdFormatDuration(video.currentTime);
    });
    on('progress', 'info', function () {
        return 'progress buffered=' + vdFormatTimeRanges(video.buffered);
    });
    on('ratechange', 'info', function () {
        return 'ratechange → ' + video.playbackRate + 'x';
    });
    on('volumechange', 'info', function () {
        return (
            'volumechange volume=' +
            video.volume +
            ' muted=' +
            video.muted
        );
    });
    on('error', 'error', function () {
        var code = video.error ? video.error.code : '?';
        var m = video.error ? vdMediaErrorMessage(video.error.code) : '未知错误';
        vdUpdateStatus('错误', 'disconnected');
        // code=4：跨域 + crossorigin、CSP media-src、或真不支持的格式
        if (code === 4) {
            m +=
                '（排查：1) 去掉 crossorigin 后硬刷新 2) CSP 是否含 media-src https: 3) 链接是否可在新标签直接打开）';
        }
        return 'error code=' + code + ' ' + m;
    });

    video.addEventListener('timeupdate', function () {
        var now = Date.now();
        if (now - _vdLastTimeUpdate < 250) return;
        _vdLastTimeUpdate = now;
        vdRefreshInfo();
    });
}

function vdLoadUrl() {
    var input = document.getElementById('vdUrl');
    var url = input ? String(input.value || '').trim() : '';
    if (!url) {
        if (typeof toast === 'function') toast('请输入视频 URL');
        return;
    }
    var video = document.getElementById('vdPlayer');
    if (!video) return;

    vdClearMediaSource();
    vdHideChannels();
    _vdFileMeta = null;
    _vdLastFrame = null;
    var shot = document.getElementById('vdShot');
    if (shot) shot.innerHTML = '<div class="vd-shot-empty">点击截帧</div>';

    var hint = vdUrlPlaylistHint(url);

    function afterProxyReady() {
        // .m3u 或疑似列表：先 fetch 文本解析
        if (hint.isM3u || hint.isM3u8 || /\.m3u/i.test(url)) {
            vdUpdateStatus('拉取列表…', 'connecting');
            vdAddLog('info', '拉取: ' + url);
            if (typeof setStatus === 'function') setStatus('正在拉取播放列表…');
            vdFetchText(url).then(function (text) {
                if (text == null) {
                    // fetch 失败：m3u8 仍尝试 hls（内部会再走代理）
                    if (hint.isM3u8) {
                        vdPlayMediaUrl(url, { forceHls: true });
                        return;
                    }
                    if (typeof toast === 'function') {
                        toast('无法拉取列表（CORS 或网络错误）');
                    }
                    vdUpdateStatus('拉取失败', 'disconnected');
                    return;
                }
                if (vdApplyPlaylistText(text, url, '远程')) {
                    return;
                }
                if (vdLooksLikeHlsMediaPlaylist(text) || hint.isM3u8) {
                    vdPlayMediaUrl(url, { forceHls: true });
                    return;
                }
                vdPlayMediaUrl(url, { forceHls: hint.isM3u8 });
            });
            return;
        }

        vdUpdateStatus('加载中…', 'connecting');
        vdAddLog('info', '加载 URL: ' + url);
        var forceHls = !/\.(mp4|webm|ogg|ogv|mov|mkv)(\?|$)/i.test(url);
        // 跨源且代理可用：预启用，减少 HLS 首包失败
        if (forceHls && vdIsCrossOrigin(url) && _vdProxyAvailable) {
            _vdUseProxy = true;
        }
        if (forceHls && typeof Hls !== 'undefined' && Hls.isSupported && Hls.isSupported()) {
            vdPlayMediaUrl(url, { forceHls: true });
            return;
        }
        vdPlayMediaUrl(url, { forceHls: false });
    }

    // 跨源先探测代理，便于 M3U/HLS 一次成功
    if (vdIsCrossOrigin(url)) {
        vdProbeCorsProxy().then(function () {
            afterProxyReady();
        });
    } else {
        afterProxyReady();
    }
}

function vdPickFile() {
    var file = document.getElementById('vdFile');
    if (file) file.click();
}

function vdOnFileChange(e) {
    var input = e && e.target ? e.target : document.getElementById('vdFile');
    var file = input && input.files && input.files[0] ? input.files[0] : null;
    if (!file) return;

    var video = document.getElementById('vdPlayer');
    if (!video) return;

    vdClearMediaSource();
    vdHideChannels();
    _vdLastFrame = null;
    var shot = document.getElementById('vdShot');
    if (shot) shot.innerHTML = '<div class="vd-shot-empty">点击截帧</div>';

    _vdFileMeta = { name: file.name, size: file.size, type: file.type || '' };
    var nameLower = (file.name || '').toLowerCase();
    var isPlaylist =
        /\.m3u8?$/i.test(nameLower) ||
        /mpegurl|m3u/i.test(file.type || '');

    vdAddLog(
        'info',
        '加载本地文件: ' +
            file.name +
            ' (' +
            (typeof formatBytes === 'function' ? formatBytes(file.size) : file.size + ' B') +
            ')'
    );

    if (isPlaylist) {
        var reader = new FileReader();
        reader.onload = function () {
            var text = String(reader.result || '');
            if (vdApplyPlaylistText(text, '', file.name)) {
                return;
            }
            if (vdLooksLikeHlsMediaPlaylist(text) || /\.m3u8$/i.test(nameLower)) {
                _vdObjectUrl = URL.createObjectURL(file);
                vdPlayMediaUrl(_vdObjectUrl, { forceHls: true });
                return;
            }
            if (typeof toast === 'function') toast('无法识别该播放列表');
            vdUpdateStatus('无法识别', 'disconnected');
        };
        reader.onerror = function () {
            if (typeof toast === 'function') toast('读取文件失败');
        };
        reader.readAsText(file);
        return;
    }

    _vdObjectUrl = URL.createObjectURL(file);
    vdPlayMediaUrl(_vdObjectUrl, {
        forceHls: /\.m3u8$/i.test(nameLower),
    });
    if (typeof setStatus === 'function') setStatus('正在加载本地视频…');
}

function vdReset() {
    vdClearMediaSource();
    vdHideChannels();
    _vdFileMeta = null;
    _vdLastFrame = null;
    var shot = document.getElementById('vdShot');
    if (shot) shot.innerHTML = '<div class="vd-shot-empty">点击截帧</div>';
    var url = document.getElementById('vdUrl');
    if (url) url.value = '';
    var file = document.getElementById('vdFile');
    if (file) file.value = '';
    vdClearLog();
    vdUpdateStatus('未加载', 'disconnected');
    vdRefreshInfo();
    if (typeof setStatus === 'function') setStatus('已重置');
}

function vdPlay() {
    var video = document.getElementById('vdPlayer');
    if (!video || !video.src) {
        if (typeof toast === 'function') toast('请先加载视频');
        return;
    }
    var p = video.play();
    if (p && typeof p.catch === 'function') {
        p.catch(function (err) {
            vdAddLog('error', 'play 失败: ' + (err && err.message ? err.message : err));
            if (typeof toast === 'function') toast('播放失败: ' + (err && err.message ? err.message : err));
        });
    }
}

function vdPause() {
    var video = document.getElementById('vdPlayer');
    if (video) {
        try {
            video.pause();
        } catch (e) {
            /* ignore */
        }
    }
}

/** 播放/暂停切换（HTML 绑定） */
function vdTogglePlay() {
    var video = document.getElementById('vdPlayer');
    if (!video || !video.src) {
        if (typeof toast === 'function') toast('请先加载视频');
        return;
    }
    if (video.paused) {
        vdPlay();
    } else {
        vdPause();
    }
}

function vdOnRateChange() {
    var rate = document.getElementById('vdRate');
    var video = document.getElementById('vdPlayer');
    if (!rate || !video) return;
    var v = parseFloat(rate.value);
    if (isFinite(v) && v > 0) {
        video.playbackRate = v;
    }
}

function vdSetRate() {
    vdOnRateChange();
}

function vdOnLoopChange() {
    var loop = document.getElementById('vdLoop');
    var video = document.getElementById('vdPlayer');
    if (!loop || !video) return;
    video.loop = !!loop.checked;
}

function vdToggleLoop() {
    vdOnLoopChange();
}

function vdDownloadShot() {
    vdDownloadFrame();
}

function vdCapture() {
    var video = document.getElementById('vdPlayer');
    var check = vdValidateCaptureSource(video);
    if (!check.ok) {
        if (typeof toast === 'function') toast(check.error || '无法截帧');
        return;
    }

    try {
        if (typeof document === 'undefined') {
            _vdLastFrame = {
                blob: null,
                dataUrl: 'data:image/png;base64,',
                width: check.width,
                height: check.height,
                time: check.time,
            };
            return;
        }
        var canvas = document.createElement('canvas');
        canvas.width = check.width;
        canvas.height = check.height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, check.width, check.height);
        var dataUrl = canvas.toDataURL('image/png');
        _vdLastFrame = {
            blob: null,
            dataUrl: dataUrl,
            width: check.width,
            height: check.height,
            time: check.time,
        };

        if (canvas.toBlob) {
            canvas.toBlob(function (blob) {
                if (blob && _vdLastFrame) _vdLastFrame.blob = blob;
            }, 'image/png');
        }

        var shot = document.getElementById('vdShot');
        if (shot) {
            shot.innerHTML =
                '<img alt="截帧" src="' +
                dataUrl +
                '" style="max-width:100%;height:auto;"/>' +
                '<div class="vd-shot-meta">' +
                check.width +
                '×' +
                check.height +
                ' @ ' +
                vdFormatDuration(check.time) +
                '</div>';
        }
        vdAddLog(
            'info',
            '截帧 ' + check.width + '×' + check.height + ' @ ' + vdFormatDuration(check.time)
        );
        if (typeof toast === 'function') toast('截帧成功');
        if (typeof setStatus === 'function') setStatus('截帧完成');
    } catch (err) {
        var msg = err && err.message ? err.message : String(err);
        vdAddLog('error', '截帧失败: ' + msg);
        if (typeof toast === 'function') {
            toast('可能是跨域视频导致画布被污染');
        }
    }
}

function vdDownloadFrame() {
    if (!_vdLastFrame || !_vdLastFrame.dataUrl) {
        if (typeof toast === 'function') toast('请先截帧');
        return;
    }
    var t = _vdLastFrame.time != null ? _vdLastFrame.time : 0;
    var name = 'frame-' + vdFormatDuration(t).replace(/:/g, '-') + '.png';

    function triggerDownload(blob) {
        if (typeof downloadBlob === 'function') {
            downloadBlob(name, blob);
        } else {
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = name;
            a.click();
            setTimeout(function () {
                try {
                    URL.revokeObjectURL(a.href);
                } catch (e) {
                    /* ignore */
                }
            }, 1000);
        }
        if (typeof toast === 'function') toast('已下载: ' + name);
    }

    if (_vdLastFrame.blob) {
        triggerDownload(_vdLastFrame.blob);
        return;
    }

    try {
        var dataUrl = _vdLastFrame.dataUrl;
        var parts = dataUrl.split(',');
        var mime = (parts[0].match(/:(.*?);/) || [])[1] || 'image/png';
        var bin = atob(parts[1] || '');
        var arr = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        triggerDownload(new Blob([arr], { type: mime }));
    } catch (e) {
        var a2 = document.createElement('a');
        a2.href = _vdLastFrame.dataUrl;
        a2.download = name;
        a2.click();
        if (typeof toast === 'function') toast('已下载: ' + name);
    }
}

function vdInit() {
    if (_vdBound) return;
    _vdBound = true;

    var file = document.getElementById('vdFile');
    if (file) file.addEventListener('change', vdOnFileChange);

    var rate = document.getElementById('vdRate');
    if (rate) {
        rate.addEventListener('change', vdOnRateChange);
    }

    var loop = document.getElementById('vdLoop');
    if (loop) {
        loop.addEventListener('change', vdOnLoopChange);
    }

    var video = document.getElementById('vdPlayer');
    if (video) {
        vdBindPlayerEvents(video);
        if (rate) {
            var rv = parseFloat(rate.value);
            if (isFinite(rv) && rv > 0) video.playbackRate = rv;
        }
        if (loop) video.loop = !!loop.checked;
    }

    vdUpdateStatus('未加载', 'disconnected');
    vdRefreshInfo();
    // 后台探测代理，不阻塞 UI
    vdProbeCorsProxy().then(function (ok) {
        if (ok) {
            vdAddLog('info', '同源 CORS 代理可用（跨域 M3U/HLS 将自动走代理）');
        }
    });
}

if (typeof window !== 'undefined') {
    window.vdLoadUrl = vdLoadUrl;
    window.vdPickFile = vdPickFile;
    window.vdReset = vdReset;
    window.vdPlay = vdPlay;
    window.vdPause = vdPause;
    window.vdTogglePlay = vdTogglePlay;
    window.vdCapture = vdCapture;
    window.vdDownloadFrame = vdDownloadFrame;
    window.vdDownloadShot = vdDownloadShot;
    window.vdCopyInfo = vdCopyInfo;
    window.vdCopyLog = vdCopyLog;
    window.vdClearLog = vdClearLog;
    window.vdOnRateChange = vdOnRateChange;
    window.vdOnLoopChange = vdOnLoopChange;
    window.vdSetRate = vdSetRate;
    window.vdToggleLoop = vdToggleLoop;
    window.vdSelectChannel = vdSelectChannel;
    window.vdFilterChannels = vdFilterChannels;
}

if (typeof registerInit === 'function') {
    registerInit('videodebug', vdInit);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        vdFormatDuration: vdFormatDuration,
        vdFormatReadyState: vdFormatReadyState,
        vdFormatNetworkState: vdFormatNetworkState,
        vdMediaErrorMessage: vdMediaErrorMessage,
        vdCanPlayLabel: vdCanPlayLabel,
        vdBuildMediaInfo: vdBuildMediaInfo,
        vdValidateCaptureSource: vdValidateCaptureSource,
        vdParseVideoSnapshot: vdParseVideoSnapshot,
        vdFormatTimeRanges: vdFormatTimeRanges,
        vdLooksLikeM3u: vdLooksLikeM3u,
        vdLooksLikeHlsMediaPlaylist: vdLooksLikeHlsMediaPlaylist,
        vdUrlPlaylistHint: vdUrlPlaylistHint,
        vdParseExtinf: vdParseExtinf,
        vdResolveUrl: vdResolveUrl,
        vdParseM3u: vdParseM3u,
        vdIsChannelPlaylist: vdIsChannelPlaylist,
        vdProxyUrl: vdProxyUrl,
        vdIsCrossOrigin: vdIsCrossOrigin,
    };
}
