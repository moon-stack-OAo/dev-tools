var _mqttClient = null;
var _mqttSubs = []; // { topic, qos, color }
var _mqttLogs = []; // 限 500 条
var _mqttFilterTopic = null; // null=全部
var MQTT_LOG_MAX = 500;
var MQTT_PREVIEW_LEN = 400;
var MQTT_TOPIC_COLORS = [
    '#34d399',
    '#60a5fa',
    '#f472b6',
    '#fbbf24',
    '#a78bfa',
    '#fb7185',
    '#22d3ee',
    '#c084fc',
];
var MQTT_PRESET_MAX = 5;
var MQTT_PRESET_KEY = 'codedeck_mqtt_presets';
var _mqttStats = { connectedAt: null, recv: 0, sent: 0, recvBytes: 0, sentBytes: 0 };
var _mqttStatsTimer = null;

function mqttColorForIndex(i) {
    var n = MQTT_TOPIC_COLORS.length;
    var idx = ((Number(i) || 0) % n + n) % n;
    return MQTT_TOPIC_COLORS[idx];
}

function mqttNormalizePreset(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var url = raw.url !== undefined && raw.url !== null ? String(raw.url).trim() : '';
    if (!url) return null;
    var name = raw.name !== undefined && raw.name !== null ? String(raw.name).trim() : '';
    if (!name) {
        try {
            name = new URL(url).hostname || url;
        } catch (e) {
            name = url;
        }
    }
    var id = raw.id !== undefined && raw.id !== null && String(raw.id).trim() !== ''
        ? String(raw.id)
        : String(Date.now());
    var protocolVersion = 5;
    if (parseInt(raw.protocolVersion, 10) === 4) protocolVersion = 4;
    var keepalive = 60;
    var ka = parseInt(raw.keepalive, 10);
    if (!isNaN(ka) && ka >= 0) keepalive = ka;
    var connectTimeoutSec = 30;
    var ct = parseInt(raw.connectTimeoutSec, 10);
    if (!isNaN(ct) && ct > 0) connectTimeoutSec = ct;
    var willRaw = raw.will && typeof raw.will === 'object' ? raw.will : {};
    var willQos = 0;
    var wq = parseInt(willRaw.qos, 10);
    if (wq === 1 || wq === 2) willQos = wq;
    return {
        id: id,
        name: name,
        url: url,
        clientId: raw.clientId !== undefined && raw.clientId !== null ? String(raw.clientId) : '',
        username: raw.username !== undefined && raw.username !== null ? String(raw.username) : '',
        password: raw.password !== undefined && raw.password !== null ? String(raw.password) : '',
        protocolVersion: protocolVersion,
        clean: raw.clean === undefined ? true : !!raw.clean,
        keepalive: keepalive,
        connectTimeoutSec: connectTimeoutSec,
        will: {
            enabled: !!willRaw.enabled,
            topic: willRaw.topic !== undefined && willRaw.topic !== null ? String(willRaw.topic) : '',
            payload: willRaw.payload !== undefined && willRaw.payload !== null ? String(willRaw.payload) : '',
            qos: willQos,
            retain: !!willRaw.retain,
        },
    };
}

function mqttUpsertPreset(list, preset) {
    var src = Array.isArray(list) ? list.slice() : [];
    var p = mqttNormalizePreset(preset);
    if (!p) return src;
    var idx = -1;
    for (var i = 0; i < src.length; i++) {
        if (src[i] && String(src[i].id) === p.id) {
            idx = i;
            break;
        }
    }
    if (idx >= 0) {
        src[idx] = p;
    } else {
        src.unshift(p);
    }
    if (src.length > MQTT_PRESET_MAX) {
        src = src.slice(0, MQTT_PRESET_MAX);
    }
    return src;
}

function mqttRemovePreset(list, id) {
    var src = Array.isArray(list) ? list : [];
    var sid = id === undefined || id === null ? '' : String(id);
    return src.filter(function (p) {
        return p && String(p.id) !== sid;
    });
}

function mqttSerializePresets(list) {
    var src = Array.isArray(list) ? list : [];
    var out = [];
    for (var i = 0; i < src.length; i++) {
        var p = mqttNormalizePreset(src[i]);
        if (p) out.push(p);
    }
    if (out.length > MQTT_PRESET_MAX) out = out.slice(0, MQTT_PRESET_MAX);
    return JSON.stringify(out);
}

function mqttParsePresets(jsonStr) {
    if (jsonStr === undefined || jsonStr === null || String(jsonStr).trim() === '') {
        return [];
    }
    try {
        var parsed = JSON.parse(String(jsonStr));
        if (!Array.isArray(parsed)) return [];
        var out = [];
        for (var i = 0; i < parsed.length; i++) {
            var p = mqttNormalizePreset(parsed[i]);
            if (p) out.push(p);
        }
        if (out.length > MQTT_PRESET_MAX) out = out.slice(0, MQTT_PRESET_MAX);
        return out;
    } catch (e) {
        return [];
    }
}

function mqttFormatDuration(ms) {
    var n = Number(ms);
    if (!isFinite(n) || n < 0) n = 0;
    var total = Math.floor(n / 1000);
    var h = Math.floor(total / 3600);
    var m = Math.floor((total % 3600) / 60);
    var s = total % 60;
    function pad(x) {
        return x < 10 ? '0' + x : String(x);
    }
    return pad(h) + ':' + pad(m) + ':' + pad(s);
}

function mqttFormatBytes(n) {
    if (typeof formatBytes === 'function') return formatBytes(n);
    var num = Number(n);
    if (!isFinite(num) || num < 0) return '0 B';
    if (num < 1024) return Math.round(num) + ' B';
    if (num < 1024 * 1024) return (num / 1024).toFixed(1) + ' KB';
    return (num / 1024 / 1024).toFixed(2) + ' MB';
}

function mqttStatsText(stats, now) {
    stats = stats || {};
    var recv = Number(stats.recv) || 0;
    var sent = Number(stats.sent) || 0;
    var bytes = (Number(stats.recvBytes) || 0) + (Number(stats.sentBytes) || 0);
    var dur = '00:00:00';
    if (stats.connectedAt != null) {
        var end = stats.stoppedAt != null
            ? Number(stats.stoppedAt)
            : typeof now === 'number'
                ? now
                : Date.now();
        dur = mqttFormatDuration(end - Number(stats.connectedAt));
    }
    return '↑' + sent + ' ↓' + recv + ' · ' + mqttFormatBytes(bytes) + ' · ' + dur;
}

function mqttBuildExport(logs, meta) {
    meta = meta || {};
    return {
        exportedAt: meta.exportedAt || new Date().toISOString(),
        filter: meta.filter || {},
        stats: meta.stats || {},
        messages: Array.isArray(logs) ? logs : [],
    };
}

/** MQTT 通配：+ 单层，# 多层（须在末尾）；空/null 过滤视为匹配全部 */
function mqttTopicMatchesFilter(msgTopic, filterTopic) {
    if (filterTopic === undefined || filterTopic === null || String(filterTopic).trim() === '') {
        return true;
    }
    var filter = String(filterTopic);
    var topic = msgTopic === undefined || msgTopic === null ? '' : String(msgTopic);
    if (topic === filter) return true;

    // 首层通配不匹配 $ 系统主题（MQTT 3.1.1）
    if (topic.charAt(0) === '$') {
        var first = filter.split('/')[0];
        if (first === '#' || first === '+') return false;
    }

    var fParts = filter.split('/');
    var tParts = topic.split('/');
    for (var i = 0; i < fParts.length; i++) {
        var fp = fParts[i];
        if (fp === '#') return true;
        if (i >= tParts.length) return false;
        if (fp === '+') continue;
        if (fp !== tParts[i]) return false;
    }
    return fParts.length === tParts.length;
}

function mqttFilterLogs(logs, opts) {
    opts = opts || {};
    var src = Array.isArray(logs) ? logs : [];
    var topic = opts.topic;
    var dir = opts.dir || 'all';
    var hasTopic = topic !== undefined && topic !== null && String(topic).trim() !== '';
    var kw = opts.keyword !== undefined && opts.keyword !== null ? String(opts.keyword).trim().toLowerCase() : '';
    var out = [];
    for (var i = 0; i < src.length; i++) {
        var e = src[i];
        if (!e) continue;
        if (dir === 'in' || dir === 'out') {
            if (e.dir !== dir) continue;
        }
        if (hasTopic) {
            if (e.dir === 'system') continue;
            if (!mqttTopicMatchesFilter(e.topic, topic)) continue;
        }
        if (kw) {
            var hay = String(e.payload || '') + '\0' + String(e.topic || '') + '\0' + String(e.message || '');
            if (hay.toLowerCase().indexOf(kw) === -1) continue;
        }
        out.push(e);
    }
    return out;
}

function mqttPrettyPayload(text) {
    var raw = text === undefined || text === null ? '' : String(text);
    var trimmed = raw.trim();
    if (!trimmed) return { json: false, text: raw };
    try {
        var obj = JSON.parse(trimmed);
        return { json: true, text: JSON.stringify(obj, null, 2) };
    } catch (e) {
        return { json: false, text: raw };
    }
}

function mqttColorForTopic(topic) {
    if (!topic || !_mqttSubs.length) return '';
    var i;
    for (i = 0; i < _mqttSubs.length; i++) {
        if (_mqttSubs[i].topic === topic) return _mqttSubs[i].color || '';
    }
    for (i = 0; i < _mqttSubs.length; i++) {
        if (mqttTopicMatchesFilter(topic, _mqttSubs[i].topic)) {
            return _mqttSubs[i].color || '';
        }
    }
    return '';
}

function mqttGenClientId() {
    var rand = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    return 'codedeck-' + rand;
}

function mqttValidateBrokerUrl(url) {
    if (url === undefined || url === null || String(url).trim() === '') {
        return { ok: false, error: '请输入 Broker URL' };
    }
    var raw = String(url).trim();
    var lower = raw.toLowerCase();
    if (lower.indexOf('mqtt://') === 0 || lower.indexOf('mqtts://') === 0) {
        return { ok: false, error: '浏览器仅支持 WebSocket，请使用 ws:// 或 wss://' };
    }
    if (lower.indexOf('tcp://') === 0 || lower.indexOf('ssl://') === 0) {
        return { ok: false, error: '不支持 tcp/ssl 直连，请使用 ws:// 或 wss://' };
    }
    if (lower.indexOf('ws://') !== 0 && lower.indexOf('wss://') !== 0) {
        return { ok: false, error: 'URL 须以 ws:// 或 wss:// 开头' };
    }
    try {
        var u = new URL(raw);
        if (u.protocol !== 'ws:' && u.protocol !== 'wss:') {
            return { ok: false, error: '仅允许 ws: / wss: 协议' };
        }
        if (!u.hostname) {
            return { ok: false, error: 'URL 缺少主机名' };
        }
        return { ok: true, normalized: u.href };
    } catch (e) {
        return { ok: false, error: 'URL 格式无效' };
    }
}

/** 由表单字段拼 Broker URL（浏览器仅 ws/wss） */
function mqttBuildBrokerUrl(parts) {
    parts = parts || {};
    var scheme = parts.scheme === 'wss:' || parts.scheme === 'wss' ? 'wss:' : 'ws:';
    var host = parts.host !== undefined && parts.host !== null ? String(parts.host).trim() : '';
    if (!host) {
        return { ok: false, error: '请输入服务器地址', url: '' };
    }
    if (/[\s/]/.test(host) || host.indexOf(':') !== -1) {
        return { ok: false, error: '主机名不能包含空格、/ 或端口（端口请单独填写）', url: '' };
    }
    var portNum = parseInt(parts.port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        return { ok: false, error: '端口须为 1–65535', url: '' };
    }
    var path = parts.path !== undefined && parts.path !== null ? String(parts.path).trim() : '';
    if (!path) path = '/';
    if (path.charAt(0) !== '/') path = '/' + path;
    var url = scheme + '//' + host + ':' + portNum + path;
    var v = mqttValidateBrokerUrl(url);
    if (!v.ok) return { ok: false, error: v.error, url: url };
    // 保留显式端口（避免 URL.href 省略 80/443）
    return { ok: true, url: url, scheme: scheme, host: host, port: portNum, path: path };
}

/** 从完整 URL 拆成表单字段 */
function mqttParseBrokerUrl(url) {
    var v = mqttValidateBrokerUrl(url);
    if (!v.ok) {
        return {
            ok: false,
            error: v.error,
            scheme: 'ws:',
            host: '',
            port: 8083,
            path: '/mqtt',
        };
    }
    try {
        var u = new URL(v.normalized);
        var port = u.port ? parseInt(u.port, 10) : u.protocol === 'wss:' ? 443 : 80;
        var path = u.pathname || '/';
        if (u.search) path += u.search;
        return {
            ok: true,
            scheme: u.protocol === 'wss:' ? 'wss:' : 'ws:',
            host: u.hostname,
            port: port,
            path: path || '/',
            url: v.normalized,
        };
    } catch (e) {
        return {
            ok: false,
            error: 'URL 格式无效',
            scheme: 'ws:',
            host: '',
            port: 8083,
            path: '/mqtt',
        };
    }
}

function mqttValidateTopic(topic, forSubscribe) {
    if (topic === undefined || topic === null || String(topic).trim() === '') {
        return { ok: false, error: '请输入主题' };
    }
    var t = String(topic).trim();
    if (t.indexOf('\0') !== -1) {
        return { ok: false, error: '主题不能包含空字符' };
    }
    if (t.length > 65535) {
        return { ok: false, error: '主题过长' };
    }
    if (!forSubscribe) {
        if (t.indexOf('+') !== -1 || t.indexOf('#') !== -1) {
            return { ok: false, error: '发布主题不能包含通配符 + 或 #' };
        }
    } else {
        var parts = t.split('/');
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i];
            if (p.indexOf('+') !== -1 && p !== '+') {
                return { ok: false, error: '通配符 + 须单独占一层' };
            }
            if (p.indexOf('#') !== -1) {
                if (p !== '#') {
                    return { ok: false, error: '通配符 # 须单独占一层' };
                }
                if (i !== parts.length - 1) {
                    return { ok: false, error: '通配符 # 只能出现在主题末尾' };
                }
            }
        }
    }
    return { ok: true, topic: t };
}

/** 批量订阅输入：按换行 / 逗号 / 分号拆分，去重保序 */
function mqttParseSubTopics(text) {
    if (text === undefined || text === null || String(text).trim() === '') {
        return { ok: false, error: '请输入主题', topics: [] };
    }
    var raw = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    var parts = raw.split(/[\n,;]+/);
    var topics = [];
    var seen = {};
    var invalid = [];
    for (var i = 0; i < parts.length; i++) {
        var piece = parts[i].trim();
        if (!piece) continue;
        var v = mqttValidateTopic(piece, true);
        if (!v.ok) {
            invalid.push(piece + '（' + v.error + '）');
            continue;
        }
        if (seen[v.topic]) continue;
        seen[v.topic] = true;
        topics.push(v.topic);
    }
    if (invalid.length > 0 && topics.length === 0) {
        return { ok: false, error: '主题无效: ' + invalid[0], topics: [], invalid: invalid };
    }
    if (topics.length === 0) {
        return { ok: false, error: '请输入主题', topics: [] };
    }
    return {
        ok: true,
        topics: topics,
        invalid: invalid,
        skippedInvalid: invalid.length,
    };
}

function mqttFormatPayloadPreview(payload, maxLen) {
    var s = payload === undefined || payload === null ? '' : String(payload);
    var n = typeof maxLen === 'number' && maxLen > 0 ? maxLen : 200;
    if (s.length <= n) return s;
    return s.slice(0, n) + '…(' + s.length + ' chars)';
}

function mqttLogLineText(entry) {
    if (!entry) return '';
    var dirLabel = entry.dir === 'in' ? 'IN' : entry.dir === 'out' ? 'OUT' : 'SYS';
    var parts = ['[' + (entry.time || '') + ']', dirLabel];
    if (entry.topic) parts.push('topic=' + entry.topic);
    if (entry.qos !== undefined && entry.qos !== null && entry.dir !== 'system') {
        parts.push('qos=' + entry.qos);
    }
    if (entry.retain) parts.push('retain');
    if (entry.payload !== undefined && entry.payload !== null && entry.payload !== '') {
        parts.push(entry.payload);
    } else if (entry.message) {
        parts.push(entry.message);
    }
    return parts.join(' ');
}

function mqttStatusClass(kind) {
    if (kind === 'connected') return 'ws-status connected';
    if (kind === 'connecting') return 'ws-status connecting';
    if (kind === 'error') return 'ws-status disconnected';
    return 'ws-status disconnected';
}

function mqttUpdateStatus(text, kind) {
    var statusEl = document.getElementById('mqttStatus');
    if (!statusEl) return;
    statusEl.className = mqttStatusClass(kind || 'disconnected');
    statusEl.innerHTML = '<span class="ws-dot"></span> ' + escapeHtml(text);
}

function mqttIsConnected() {
    return _mqttClient && _mqttClient.connected;
}

function mqttPayloadToString(payload) {
    if (payload === undefined || payload === null) return '';
    if (typeof payload === 'string') return payload;
    try {
        if (typeof Buffer !== 'undefined' && Buffer.isBuffer && Buffer.isBuffer(payload)) {
            return payload.toString('utf8');
        }
    } catch (e) {
        /* ignore */
    }
    if (payload instanceof Uint8Array || (payload && payload.buffer instanceof ArrayBuffer)) {
        try {
            if (typeof TextDecoder !== 'undefined') {
                return new TextDecoder('utf-8', { fatal: false }).decode(payload);
            }
        } catch (e) {
            /* fallthrough */
        }
        var arr = payload instanceof Uint8Array ? payload : new Uint8Array(payload);
        var hex = [];
        var max = Math.min(arr.length, 64);
        for (var i = 0; i < max; i++) {
            hex.push(('0' + arr[i].toString(16)).slice(-2));
        }
        return '[hex] ' + hex.join(' ') + (arr.length > max ? ' …' : '');
    }
    try {
        return String(payload);
    } catch (e) {
        return '[binary]';
    }
}

function mqttAddLog(dir, meta) {
    meta = meta || {};
    var entry = {
        dir: dir || 'system',
        time: new Date().toLocaleTimeString(),
        topic: meta.topic || '',
        qos: meta.qos,
        retain: !!meta.retain,
        payload: meta.payload !== undefined ? String(meta.payload) : '',
        message: meta.message || '',
    };
    _mqttLogs.push(entry);
    if (_mqttLogs.length > MQTT_LOG_MAX) {
        _mqttLogs = _mqttLogs.slice(_mqttLogs.length - MQTT_LOG_MAX);
    }
    mqttRenderLog();
}

function mqttGetDirFilter() {
    var el = document.getElementById('mqttDirFilter');
    var v = el ? el.value : 'all';
    return v === 'in' || v === 'out' ? v : 'all';
}

function mqttGetKwFilter() {
    var el = document.getElementById('mqttKwFilter');
    return el ? el.value : '';
}

function mqttUpdateFilterLabel() {
    var el = document.getElementById('mqttFilterLabel');
    if (!el) return;
    el.textContent = _mqttFilterTopic ? _mqttFilterTopic : '全部';
}

function mqttSetFilter(topic) {
    if (topic === undefined || topic === null || topic === '' || topic === _mqttFilterTopic) {
        _mqttFilterTopic = null;
    } else {
        _mqttFilterTopic = String(topic);
    }
    mqttRenderSubs();
    mqttRenderLog();
}

function mqttOnDirFilterChange() {
    mqttRenderLog();
}

function mqttCreateMsgEl(entry) {
    var dir = entry.dir === 'in' || entry.dir === 'out' || entry.dir === 'system' ? entry.dir : 'system';
    var div = document.createElement('div');
    div.className = 'mqtt-msg ' + dir;

    var color = dir !== 'system' ? mqttColorForTopic(entry.topic) : '';
    if (color) div.style.borderLeftColor = color;

    var head = document.createElement('div');
    head.className = 'mqtt-msg-head';

    var dirEl = document.createElement('span');
    dirEl.className = 'mqtt-msg-dir';
    dirEl.textContent = dir === 'in' ? 'IN' : dir === 'out' ? 'OUT' : 'SYS';
    head.appendChild(dirEl);

    if (entry.topic) {
        var topicEl = document.createElement('span');
        topicEl.className = 'mqtt-msg-topic';
        topicEl.textContent = entry.topic;
        head.appendChild(topicEl);
    }

    if (entry.dir !== 'system' && entry.qos !== undefined && entry.qos !== null) {
        var qosEl = document.createElement('span');
        qosEl.className = 'mqtt-msg-meta';
        qosEl.textContent = 'QoS ' + entry.qos;
        head.appendChild(qosEl);
    }

    if (entry.retain) {
        var retEl = document.createElement('span');
        retEl.className = 'mqtt-msg-meta mqtt-msg-retain';
        retEl.textContent = 'retain';
        head.appendChild(retEl);
    }

    var timeEl = document.createElement('span');
    timeEl.className = 'mqtt-msg-time';
    timeEl.textContent = entry.time;
    head.appendChild(timeEl);

    div.appendChild(head);

    var rawBody = entry.payload || entry.message || '';
    if (rawBody) {
        var pretty = mqttPrettyPayload(rawBody);
        var fullText = pretty.text;
        var collapsed = fullText.length > MQTT_PREVIEW_LEN;
        var bodyEl = document.createElement('pre');
        bodyEl.className = 'mqtt-msg-body' + (pretty.json ? ' is-json' : '');
        bodyEl.textContent = collapsed ? mqttFormatPayloadPreview(fullText, MQTT_PREVIEW_LEN) : fullText;
        if (collapsed) {
            bodyEl.classList.add('is-collapsible');
            bodyEl.setAttribute('data-full', fullText);
            bodyEl.setAttribute('data-preview', mqttFormatPayloadPreview(fullText, MQTT_PREVIEW_LEN));
        }
        div.appendChild(bodyEl);
    }

    return div;
}

function mqttRenderLog() {
    mqttBindLogDelegate();
    mqttBindKwFilter();
    var log = document.getElementById('mqttLog');
    mqttUpdateFilterLabel();
    if (!log) return;

    var filtered = mqttFilterLogs(_mqttLogs, {
        topic: _mqttFilterTopic,
        dir: mqttGetDirFilter(),
        keyword: mqttGetKwFilter(),
    });

    log.innerHTML = '';
    if (filtered.length === 0) {
        var empty = document.createElement('div');
        empty.className = 'mqtt-log-empty';
        empty.textContent = _mqttLogs.length === 0 ? '等待连接…' : '无匹配消息';
        log.appendChild(empty);
        return;
    }

    var frag = document.createDocumentFragment();
    for (var i = 0; i < filtered.length; i++) {
        frag.appendChild(mqttCreateMsgEl(filtered[i]));
    }
    log.appendChild(frag);
    log.scrollTop = log.scrollHeight;
}

function mqttRenderSubs() {
    var list = document.getElementById('mqttSubList');
    var countEl = document.getElementById('mqttSubCount');
    if (countEl) {
        countEl.textContent = _mqttSubs.length + ' 个订阅';
    }
    if (!list) return;

    if (!list.dataset.mqttDelegate) {
        list.dataset.mqttDelegate = '1';
        list.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-mqtt-unsub]');
            if (btn) {
                var unsubTopic = btn.getAttribute('data-mqtt-unsub');
                if (unsubTopic) mqttUnsubscribe(unsubTopic);
                return;
            }
            var item = e.target.closest('[data-mqtt-filter]');
            if (!item || !list.contains(item)) return;
            var filterTopic = item.getAttribute('data-mqtt-filter');
            if (filterTopic) mqttSetFilter(filterTopic);
        });
    }

    if (_mqttSubs.length === 0) {
        list.innerHTML = '<div class="mqtt-sub-empty">暂无订阅</div>';
        return;
    }

    list.innerHTML = '';
    _mqttSubs.forEach(function (sub) {
        var div = document.createElement('div');
        div.className = 'mqtt-sub-item' + (_mqttFilterTopic === sub.topic ? ' is-active' : '');
        div.setAttribute('data-mqtt-filter', sub.topic);
        if (sub.color) div.style.borderLeftColor = sub.color;

        var topicSpan = document.createElement('span');
        topicSpan.className = 'mqtt-sub-topic';
        topicSpan.textContent = sub.topic;
        topicSpan.title = sub.topic;
        div.title = sub.topic;
        div.appendChild(topicSpan);

        var qosSpan = document.createElement('span');
        qosSpan.className = 'mqtt-sub-qos';
        qosSpan.textContent = 'QoS ' + sub.qos;
        div.appendChild(qosSpan);

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'outline';
        btn.textContent = '取消';
        btn.setAttribute('data-mqtt-unsub', sub.topic);
        div.appendChild(btn);

        list.appendChild(div);
    });
}

function mqttRandomClientId() {
    var el = document.getElementById('mqttClientId');
    if (el) el.value = mqttGenClientId();
}

function mqttToggleSettings() {
    var el = document.querySelector('#panel-mqtt .mqtt-settings');
    var btn = document.getElementById('mqttSettingsToggle');
    if (!el) return;
    var collapsed = el.classList.toggle('is-collapsed');
    if (btn) {
        btn.textContent = collapsed ? '连接设置 ▾' : '连接设置 ▴';
    }
}

function mqttSwitchSettingsTab(tab) {
    var name = tab === 'advanced' ? 'advanced' : 'basic';
    var root = document.querySelector('#panel-mqtt .mqtt-settings');
    if (!root) return;
    var tabs = root.querySelectorAll('.mqtt-settings-tabs .tab');
    for (var i = 0; i < tabs.length; i++) {
        var t = tabs[i];
        var active = t.getAttribute('data-mqtt-tab') === name;
        t.classList.toggle('active', active);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
    }
    var panels = root.querySelectorAll('.mqtt-tab-panel');
    for (var j = 0; j < panels.length; j++) {
        var p = panels[j];
        var on = p.getAttribute('data-mqtt-tab-panel') === name;
        p.classList.toggle('active', on);
        if (on) p.removeAttribute('hidden');
        else p.setAttribute('hidden', '');
    }
}

function mqttReadBrokerPartsFromForm() {
    var schemeEl = document.getElementById('mqttScheme');
    var hostEl = document.getElementById('mqttHost');
    var portEl = document.getElementById('mqttPort');
    var pathEl = document.getElementById('mqttPath');
    return {
        scheme: schemeEl ? schemeEl.value : 'ws:',
        host: hostEl ? hostEl.value : '',
        port: portEl ? portEl.value : '8083',
        path: pathEl ? pathEl.value : '/mqtt',
    };
}

function mqttSyncBrokerUrlFromParts() {
    var built = mqttBuildBrokerUrl(mqttReadBrokerPartsFromForm());
    var hidden = document.getElementById('mqttUrl');
    var preview = document.getElementById('mqttUrlPreview');
    if (built.ok) {
        if (hidden) hidden.value = built.url;
        if (preview) preview.textContent = built.url;
    } else {
        if (hidden) hidden.value = '';
        if (preview) {
            var host = (document.getElementById('mqttHost') || {}).value || 'host';
            var port = (document.getElementById('mqttPort') || {}).value || '8083';
            var path = (document.getElementById('mqttPath') || {}).value || '/mqtt';
            var schemeEl = document.getElementById('mqttScheme');
            var scheme = schemeEl && schemeEl.value === 'wss:' ? 'wss:' : 'ws:';
            if (path && path.charAt(0) !== '/') path = '/' + path;
            preview.textContent = scheme + '//' + (String(host).trim() || 'host') + ':' + port + (path || '/mqtt');
        }
    }
    mqttUpdateConnSummary();
    return built;
}

function mqttFillBrokerPartsFromUrl(url) {
    var parsed = mqttParseBrokerUrl(url);
    if (!parsed.ok) return false;
    mqttSetInputValue('mqttScheme', parsed.scheme);
    mqttSetInputValue('mqttHost', parsed.host);
    mqttSetInputValue('mqttPort', parsed.port);
    mqttSetInputValue('mqttPath', parsed.path);
    var hidden = document.getElementById('mqttUrl');
    if (hidden) hidden.value = parsed.url || url;
    mqttSyncBrokerUrlFromParts();
    return true;
}

function mqttOnBrokerPartsChange() {
    mqttSyncBrokerUrlFromParts();
}

function mqttUpdateConnSummary() {
    var el = document.getElementById('mqttConnSummary');
    if (!el) return;
    var nameEl = document.getElementById('mqttConnName');
    var name = nameEl ? String(nameEl.value || '').trim() : '';
    var built = mqttBuildBrokerUrl(mqttReadBrokerPartsFromForm());
    var text;
    if (built.ok) {
        text = name ? name + ' · ' + built.url : built.url;
    } else {
        text = name || '未配置连接';
    }
    el.textContent = text;
    el.title = built.ok ? built.url : text;
}

function mqttConnect() {
    var built = mqttSyncBrokerUrlFromParts();
    if (!built.ok) {
        toast(built.error || '请完善服务器地址');
        var settings = document.querySelector('#panel-mqtt .mqtt-settings');
        if (settings && settings.classList.contains('is-collapsed')) {
            mqttToggleSettings();
        }
        return;
    }
    var v = mqttValidateBrokerUrl(built.url);
    if (!v.ok) {
        toast(v.error);
        return;
    }

    if (typeof mqtt === 'undefined' || typeof mqtt.connect !== 'function') {
        toast('mqtt.js 未加载');
        return;
    }

    var willEnabledEl = document.getElementById('mqttWillEnabled');
    var willOption = null;
    if (willEnabledEl && willEnabledEl.checked) {
        var willTopicEl = document.getElementById('mqttWillTopic');
        var willPayloadEl = document.getElementById('mqttWillPayload');
        var willQosEl = document.getElementById('mqttWillQos');
        var willRetainEl = document.getElementById('mqttWillRetain');
        var willTopic = willTopicEl ? willTopicEl.value.trim() : '';
        var willV = mqttValidateTopic(willTopic, false);
        if (!willV.ok) {
            toast('LWT: ' + willV.error);
            return;
        }
        var willQos = 0;
        if (willQosEl) {
            var wq = parseInt(willQosEl.value, 10);
            if (wq === 1 || wq === 2) willQos = wq;
        }
        willOption = {
            topic: willV.topic,
            payload: willPayloadEl ? String(willPayloadEl.value) : '',
            qos: willQos,
            retain: willRetainEl ? !!willRetainEl.checked : false,
        };
    }

    mqttDisconnect(true);

    var clientIdEl = document.getElementById('mqttClientId');
    var clientId = clientIdEl ? clientIdEl.value.trim() : '';
    if (!clientId) {
        clientId = mqttGenClientId();
        if (clientIdEl) clientIdEl.value = clientId;
    }

    var usernameEl = document.getElementById('mqttUsername');
    var passwordEl = document.getElementById('mqttPassword');
    var cleanEl = document.getElementById('mqttClean');
    var keepAliveEl = document.getElementById('mqttKeepAlive');
    var timeoutEl = document.getElementById('mqttConnectTimeout');
    var protocolEl = document.getElementById('mqttProtocol');

    var protocolVersion = 5;
    if (protocolEl) {
        var pv = parseInt(protocolEl.value, 10);
        if (pv === 4) protocolVersion = 4;
        else if (pv === 5) protocolVersion = 5;
    }

    var keepalive = 60;
    if (keepAliveEl) {
        var ka = parseInt(keepAliveEl.value, 10);
        if (!isNaN(ka) && ka >= 0) keepalive = ka;
    }

    var connectTimeout = 30000;
    if (timeoutEl) {
        var ct = parseInt(timeoutEl.value, 10);
        if (!isNaN(ct) && ct > 0) connectTimeout = ct * 1000;
    }

    var options = {
        clientId: clientId,
        clean: cleanEl ? !!cleanEl.checked : true,
        keepalive: keepalive,
        connectTimeout: connectTimeout,
        protocolVersion: protocolVersion,
        reconnectPeriod: 0,
    };

    var username = usernameEl ? usernameEl.value : '';
    var password = passwordEl ? passwordEl.value : '';
    if (username) options.username = username;
    if (password) options.password = password;
    if (willOption) options.will = willOption;

    mqttUpdateStatus('连接中…', 'connecting');
    mqttAddLog('system', { message: '正在连接 ' + v.normalized });

    try {
        _mqttClient = mqtt.connect(v.normalized, options);
    } catch (e) {
        mqttUpdateStatus('错误', 'error');
        mqttAddLog('system', { message: '连接错误: ' + (e && e.message ? e.message : String(e)) });
        toast('连接失败: ' + (e && e.message ? e.message : String(e)));
        _mqttClient = null;
        return;
    }

    _mqttClient.on('connect', function () {
        mqttResetStatsOnConnect();
        mqttUpdateStatus('已连接', 'connected');
        mqttAddLog('system', { message: '已连接 ' + v.normalized + ' (clientId=' + clientId + ')' });
        if (_mqttSubs.length > 0 && _mqttClient) {
            _mqttSubs.forEach(function (sub) {
                _mqttClient.subscribe(sub.topic, { qos: sub.qos }, function (err) {
                    if (err) {
                        mqttAddLog('system', {
                            message: '重订阅失败 ' + sub.topic + ': ' + (err.message || err),
                        });
                    }
                });
            });
        }
    });

    _mqttClient.on('message', function (topic, payload, packet) {
        var text = mqttPayloadToString(payload);
        mqttBumpRecv(text);
        mqttAddLog('in', {
            topic: topic,
            qos: packet && packet.qos !== undefined ? packet.qos : 0,
            retain: !!(packet && packet.retain),
            payload: text,
        });
    });

    _mqttClient.on('error', function (err) {
        var msg = err && err.message ? err.message : String(err || '未知错误');
        mqttUpdateStatus('错误', 'error');
        mqttAddLog('system', { message: '错误: ' + msg });
        toast('MQTT 错误: ' + msg);
    });

    _mqttClient.on('close', function () {
        mqttStopStatsTimer(true);
        mqttUpdateStatus('已断开', 'disconnected');
        mqttAddLog('system', { message: '连接已关闭' });
    });

    _mqttClient.on('offline', function () {
        mqttUpdateStatus('离线', 'disconnected');
        mqttAddLog('system', { message: '客户端离线' });
    });

    _mqttClient.on('reconnect', function () {
        mqttUpdateStatus('重连中…', 'connecting');
        mqttAddLog('system', { message: '正在重连…' });
    });
}

function mqttDisconnect(silent) {
    if (_mqttClient) {
        try {
            _mqttClient.end(true);
        } catch (e) {
            /* ignore */
        }
        try {
            _mqttClient.removeAllListeners();
        } catch (e) {
            /* ignore */
        }
        _mqttClient = null;
    }
    mqttStopStatsTimer(true);
    if (!silent) {
        mqttUpdateStatus('已断开', 'disconnected');
    }
}

function mqttOpenSubModal() {
    var modal = document.getElementById('mqttSubModal');
    if (modal) modal.hidden = false;
    var topicEl = document.getElementById('mqttSubTopic');
    if (topicEl) {
        topicEl.focus();
    }
}

function mqttCloseSubModal() {
    var modal = document.getElementById('mqttSubModal');
    if (modal) modal.hidden = true;
}

function mqttSubscribe() {
    var topicEl = document.getElementById('mqttSubTopic');
    var qosEl = document.getElementById('mqttSubQos');
    var raw = topicEl ? topicEl.value : '';
    var parsed = mqttParseSubTopics(raw);
    if (!parsed.ok) {
        toast(parsed.error);
        return;
    }
    var qos = 0;
    if (qosEl) {
        var q = parseInt(qosEl.value, 10);
        if (q === 1 || q === 2) qos = q;
    }

    var existing = {};
    _mqttSubs.forEach(function (s) {
        existing[s.topic] = true;
    });
    var toAdd = parsed.topics.filter(function (t) {
        return !existing[t];
    });
    var skippedDup = parsed.topics.length - toAdd.length;

    if (toAdd.length === 0) {
        toast(skippedDup > 0 ? '所选主题均已订阅' : '请输入主题');
        return;
    }

    // 未连接：先加入本地列表，连接成功后由 connect 回调自动 subscribe
    if (!mqttIsConnected()) {
        toAdd.forEach(function (t) {
            mqttPushSub(t, qos);
            mqttAddLog('system', {
                message: '待连接后订阅 ' + t + ' (QoS ' + qos + ')',
            });
        });
        mqttRenderSubs();
        var offlineMsg =
            toAdd.length === 1
                ? '已添加 ' + toAdd[0] + '（连接后自动订阅）'
                : '已添加 ' + toAdd.length + ' 个主题（连接后自动订阅）';
        if (skippedDup > 0) offlineMsg += '（跳过 ' + skippedDup + ' 个已有）';
        if (parsed.skippedInvalid > 0) offlineMsg += '（忽略 ' + parsed.skippedInvalid + ' 个无效）';
        toast(offlineMsg);
        if (topicEl && toAdd.length === parsed.topics.length && !parsed.skippedInvalid) {
            topicEl.value = '';
        }
        mqttCloseSubModal();
        return;
    }

    // mqtt.js：对象形式一次订阅多主题
    var subMap = {};
    toAdd.forEach(function (t) {
        subMap[t] = { qos: qos };
    });

    _mqttClient.subscribe(subMap, function (err, granted) {
        if (err) {
            mqttAddLog('system', { message: '订阅失败: ' + (err.message || err) });
            toast('订阅失败: ' + (err.message || err));
            return;
        }
        var okTopics = [];
        if (Array.isArray(granted) && granted.length > 0) {
            granted.forEach(function (g) {
                if (!g || g.topic === undefined) return;
                // 0x80 = 订阅失败（MQTT 3.1.1）
                if (g.qos === 128 || g.qos === 0x80) {
                    mqttAddLog('system', { message: '订阅被拒 ' + g.topic });
                    return;
                }
                var gQos = typeof g.qos === 'number' && g.qos >= 0 && g.qos <= 2 ? g.qos : qos;
                mqttPushSub(g.topic, gQos);
                okTopics.push(g.topic);
                mqttAddLog('out', { topic: g.topic, qos: gQos, message: 'SUBSCRIBE' });
            });
        } else {
            toAdd.forEach(function (t) {
                mqttPushSub(t, qos);
                okTopics.push(t);
                mqttAddLog('out', { topic: t, qos: qos, message: 'SUBSCRIBE' });
            });
        }
        mqttRenderSubs();
        if (okTopics.length === 0) {
            toast('订阅失败（Broker 拒绝）');
            return;
        }
        var msg =
            okTopics.length === 1
                ? '已订阅 ' + okTopics[0]
                : '已订阅 ' + okTopics.length + ' 个主题';
        if (skippedDup > 0) msg += '（跳过 ' + skippedDup + ' 个已订阅）';
        if (parsed.skippedInvalid > 0) msg += '（忽略 ' + parsed.skippedInvalid + ' 个无效）';
        toast(msg);
        if (topicEl && okTopics.length === parsed.topics.length && !parsed.skippedInvalid) {
            topicEl.value = '';
        }
        mqttCloseSubModal();
    });
}

function mqttPushSub(topic, qos) {
    if (_mqttSubs.some(function (s) {
        return s.topic === topic;
    })) {
        return;
    }
    _mqttSubs.push({
        topic: topic,
        qos: qos,
        color: mqttColorForIndex(_mqttSubs.length),
    });
}

function mqttRemoveSub(topic) {
    _mqttSubs = _mqttSubs.filter(function (s) {
        return s.topic !== topic;
    });
    if (_mqttFilterTopic === topic) {
        _mqttFilterTopic = null;
    }
}

function mqttUnsubscribe(topic) {
    if (!topic) return;
    if (!mqttIsConnected()) {
        mqttRemoveSub(topic);
        mqttRenderSubs();
        mqttRenderLog();
        return;
    }
    _mqttClient.unsubscribe(topic, function (err) {
        if (err) {
            mqttAddLog('system', { message: '取消订阅失败 ' + topic + ': ' + (err.message || err) });
            toast('取消订阅失败');
            return;
        }
        mqttRemoveSub(topic);
        mqttRenderSubs();
        mqttAddLog('out', { topic: topic, message: 'UNSUBSCRIBE' });
    });
}

function mqttUnsubscribeAll() {
    if (_mqttSubs.length === 0) {
        toast('暂无订阅');
        return;
    }
    var topics = _mqttSubs.map(function (s) {
        return s.topic;
    });
    if (!mqttIsConnected()) {
        _mqttSubs = [];
        _mqttFilterTopic = null;
        mqttRenderSubs();
        mqttRenderLog();
        toast('已清空订阅列表');
        return;
    }
    _mqttClient.unsubscribe(topics, function (err) {
        if (err) {
            mqttAddLog('system', { message: '全部取消失败: ' + (err.message || err) });
            toast('全部取消失败');
            return;
        }
        _mqttSubs = [];
        _mqttFilterTopic = null;
        mqttRenderSubs();
        topics.forEach(function (t) {
            mqttAddLog('out', { topic: t, message: 'UNSUBSCRIBE' });
        });
        toast('已取消全部订阅（' + topics.length + '）');
    });
}

/** 将输入按编码格式转为可发布的 payload */
function mqttEncodePublishPayload(raw, format) {
    var text = raw === undefined || raw === null ? '' : String(raw);
    var fmt = format ? String(format).toLowerCase() : 'text';
    if (fmt === 'json') {
        var trimmed = text.trim();
        if (!trimmed) {
            return { ok: false, error: 'JSON Payload 不能为空' };
        }
        try {
            var obj = JSON.parse(trimmed);
            var compact = JSON.stringify(obj);
            return {
                ok: true,
                format: 'json',
                data: compact,
                logText: compact,
                bytes: mqttUtf8ByteLength(compact),
            };
        } catch (e) {
            return { ok: false, error: 'JSON 无效: ' + (e && e.message ? e.message : String(e)) };
        }
    }
    if (fmt === 'hex') {
        var hex = text.replace(/\s+/g, '').replace(/^0x/i, '');
        if (!hex) {
            return { ok: true, format: 'hex', data: new Uint8Array(0), logText: '', bytes: 0 };
        }
        if (hex.length % 2 !== 0) {
            return { ok: false, error: 'Hex 长度须为偶数' };
        }
        if (!/^[0-9a-fA-F]+$/.test(hex)) {
            return { ok: false, error: 'Hex 仅允许 0-9 a-f' };
        }
        var arr = new Uint8Array(hex.length / 2);
        for (var i = 0; i < arr.length; i++) {
            arr[i] = parseInt(hex.substr(i * 2, 2), 16);
        }
        return {
            ok: true,
            format: 'hex',
            data: arr,
            logText: '[hex] ' + hex.toLowerCase(),
            bytes: arr.length,
        };
    }
    if (fmt === 'base64') {
        var b64 = text.replace(/\s+/g, '');
        if (!b64) {
            return { ok: true, format: 'base64', data: new Uint8Array(0), logText: '', bytes: 0 };
        }
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(b64) || b64.length % 4 !== 0) {
            return { ok: false, error: 'Base64 格式无效' };
        }
        try {
            var bin;
            if (typeof atob === 'function') {
                var s = atob(b64);
                bin = new Uint8Array(s.length);
                for (var j = 0; j < s.length; j++) bin[j] = s.charCodeAt(j);
            } else if (typeof Buffer !== 'undefined') {
                bin = new Uint8Array(Buffer.from(b64, 'base64'));
            } else {
                return { ok: false, error: '当前环境不支持 Base64 解码' };
            }
            return {
                ok: true,
                format: 'base64',
                data: bin,
                logText: '[base64] ' + b64,
                bytes: bin.length,
            };
        } catch (e2) {
            return { ok: false, error: 'Base64 解码失败' };
        }
    }
    // text（默认）
    return {
        ok: true,
        format: 'text',
        data: text,
        logText: text,
        bytes: mqttUtf8ByteLength(text),
    };
}

function mqttUtf8ByteLength(str) {
    if (str === undefined || str === null || str === '') return 0;
    try {
        if (typeof TextEncoder !== 'undefined') {
            return new TextEncoder().encode(String(str)).length;
        }
    } catch (e) {
        /* fallthrough */
    }
    try {
        if (typeof Buffer !== 'undefined') {
            return Buffer.byteLength(String(str), 'utf8');
        }
    } catch (e2) {
        /* fallthrough */
    }
    return String(str).length;
}

function mqttPubFormatPlaceholder(format) {
    var fmt = format ? String(format).toLowerCase() : 'text';
    if (fmt === 'json') return '{"msg":"hello","ts":1700000000}';
    if (fmt === 'hex') return '48656c6c6f  或  0x48656c6c6f';
    if (fmt === 'base64') return 'SGVsbG8=';
    return 'Payload 文本';
}

function mqttOnPubFormatChange() {
    var fmtEl = document.getElementById('mqttPubFormat');
    var payloadEl = document.getElementById('mqttPubPayload');
    if (!payloadEl) return;
    var fmt = fmtEl ? fmtEl.value : 'text';
    payloadEl.placeholder = mqttPubFormatPlaceholder(fmt);
}

function mqttPublish() {
    if (!mqttIsConnected()) {
        toast('请先连接 Broker');
        return;
    }
    var topicEl = document.getElementById('mqttPubTopic');
    var qosEl = document.getElementById('mqttPubQos');
    var retainEl = document.getElementById('mqttPubRetain');
    var payloadEl = document.getElementById('mqttPubPayload');
    var formatEl = document.getElementById('mqttPubFormat');

    var topic = topicEl ? topicEl.value.trim() : '';
    var tv = mqttValidateTopic(topic, false);
    if (!tv.ok) {
        toast(tv.error);
        return;
    }

    var qos = 0;
    if (qosEl) {
        var q = parseInt(qosEl.value, 10);
        if (q === 1 || q === 2) qos = q;
    }
    var retain = retainEl ? !!retainEl.checked : false;
    var raw = payloadEl ? payloadEl.value : '';
    var format = formatEl ? formatEl.value : 'text';
    var encoded = mqttEncodePublishPayload(raw, format);
    if (!encoded.ok) {
        toast(encoded.error);
        return;
    }

    _mqttClient.publish(tv.topic, encoded.data, { qos: qos, retain: retain }, function (err) {
        if (err) {
            mqttAddLog('system', { message: '发布失败: ' + (err.message || err) });
            toast('发布失败: ' + (err.message || err));
            return;
        }
        mqttBumpSentBytes(encoded.bytes);
        mqttAddLog('out', {
            topic: tv.topic,
            qos: qos,
            retain: retain,
            payload: encoded.logText,
            format: encoded.format,
        });
    });
}

function mqttClearLog() {
    _mqttLogs = [];
    var log = document.getElementById('mqttLog');
    if (log) {
        log.innerHTML = '<div class="mqtt-log-empty">日志已清空</div>';
    }
    if (typeof setStatus === 'function') setStatus('日志已清空');
}

function mqttGetFilteredLogs() {
    return mqttFilterLogs(_mqttLogs, {
        topic: _mqttFilterTopic,
        dir: mqttGetDirFilter(),
        keyword: mqttGetKwFilter(),
    });
}

function mqttCopyLog() {
    var filtered = mqttGetFilteredLogs();
    if (filtered.length === 0) {
        toast('没有日志可复制');
        return;
    }
    var text = filtered.map(mqttLogLineText).join('\n');
    if (typeof safeCopy === 'function') {
        safeCopy(text, '日志已复制');
    } else if (typeof copyText === 'function') {
        copyText(text);
        toast('日志已复制');
    } else {
        toast('复制不可用');
    }
}

function mqttExportStamp(d) {
    var dt = d instanceof Date ? d : new Date();
    function pad(n) {
        return n < 10 ? '0' + n : String(n);
    }
    return (
        dt.getFullYear() +
        pad(dt.getMonth() + 1) +
        pad(dt.getDate()) +
        '-' +
        pad(dt.getHours()) +
        pad(dt.getMinutes()) +
        pad(dt.getSeconds())
    );
}

function mqttExportLog() {
    var filtered = mqttGetFilteredLogs();
    if (filtered.length === 0) {
        toast('没有日志可导出');
        return;
    }
    if (typeof downloadBlob !== 'function') {
        toast('导出不可用');
        return;
    }
    var data = mqttBuildExport(filtered, {
        exportedAt: new Date().toISOString(),
        filter: {
            topic: _mqttFilterTopic,
            dir: mqttGetDirFilter(),
            keyword: mqttGetKwFilter(),
        },
        stats: {
            connectedAt: _mqttStats.connectedAt,
            recv: _mqttStats.recv,
            sent: _mqttStats.sent,
            recvBytes: _mqttStats.recvBytes,
            sentBytes: _mqttStats.sentBytes,
        },
    });
    var json = JSON.stringify(data, null, 2);
    downloadBlob('mqtt-log-' + mqttExportStamp(new Date()) + '.json', new Blob([json], { type: 'application/json' }));
    if (typeof setStatus === 'function') setStatus('已导出 ' + filtered.length + ' 条日志');
}

function mqttBindLogDelegate() {
    var log = document.getElementById('mqttLog');
    if (!log || log.dataset.mqttLogDelegate) return;
    log.dataset.mqttLogDelegate = '1';
    log.addEventListener('click', function (e) {
        var msg = e.target.closest('.mqtt-msg');
        if (!msg || !log.contains(msg)) return;
        var body = msg.querySelector('.mqtt-msg-body.is-collapsible');
        if (!body) return;
        var expanded = body.classList.toggle('is-expanded');
        var full = body.getAttribute('data-full');
        var preview = body.getAttribute('data-preview');
        body.textContent = expanded && full ? full : preview || body.textContent;
    });
}

function mqttBindKwFilter() {
    var el = document.getElementById('mqttKwFilter');
    if (!el || el.dataset.mqttBound) return;
    el.dataset.mqttBound = '1';
    var handler = typeof debounce === 'function' ? debounce(mqttRenderLog, 200) : mqttRenderLog;
    el.addEventListener('input', handler);
}

function mqttResetStatsOnConnect() {
    _mqttStats = { connectedAt: Date.now(), recv: 0, sent: 0, recvBytes: 0, sentBytes: 0 };
    mqttStartStatsTimer();
}

function mqttStopStatsTimer(freeze) {
    if (_mqttStatsTimer) {
        clearInterval(_mqttStatsTimer);
        _mqttStatsTimer = null;
    }
    if (freeze && _mqttStats.connectedAt != null && _mqttStats.stoppedAt == null) {
        _mqttStats.stoppedAt = Date.now();
    }
    mqttRenderStats();
}

function mqttStartStatsTimer() {
    if (_mqttStatsTimer) {
        clearInterval(_mqttStatsTimer);
        _mqttStatsTimer = null;
    }
    _mqttStatsTimer = setInterval(mqttRenderStats, 1000);
    mqttRenderStats();
}

function mqttBumpRecv(payload) {
    _mqttStats.recv += 1;
    _mqttStats.recvBytes += payload === undefined || payload === null ? 0 : String(payload).length;
    mqttRenderStats();
}

function mqttBumpSent(payload) {
    _mqttStats.sent += 1;
    _mqttStats.sentBytes += payload === undefined || payload === null ? 0 : String(payload).length;
    mqttRenderStats();
}

function mqttBumpSentBytes(n) {
    _mqttStats.sent += 1;
    var bytes = typeof n === 'number' && n >= 0 ? n : 0;
    _mqttStats.sentBytes += bytes;
    mqttRenderStats();
}

function mqttRenderStats() {
    var el = document.getElementById('mqttStats');
    if (!el) return;
    if (!_mqttStats.connectedAt && _mqttStats.recv === 0 && _mqttStats.sent === 0) {
        el.textContent = '';
        return;
    }
    el.textContent = mqttStatsText(_mqttStats, Date.now());
}

function mqttLoadPresets() {
    try {
        if (typeof localStorage === 'undefined') return [];
        return mqttParsePresets(localStorage.getItem(MQTT_PRESET_KEY));
    } catch (e) {
        return [];
    }
}

function mqttPersistPresets(list) {
    try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(MQTT_PRESET_KEY, mqttSerializePresets(list));
    } catch (e) {
        /* ignore quota / private mode */
    }
}

function mqttRenderPresetSelect(selectedId) {
    var sel = document.getElementById('mqttPresetSelect');
    if (!sel) return;
    var list = mqttLoadPresets();
    var keep = selectedId !== undefined ? selectedId : sel.value;
    sel.innerHTML = '';
    var empty = document.createElement('option');
    empty.value = '';
    empty.textContent = '选择预设…';
    sel.appendChild(empty);
    for (var i = 0; i < list.length; i++) {
        var p = list[i];
        if (!p) continue;
        var opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        sel.appendChild(opt);
    }
    var found = false;
    for (var j = 0; j < list.length; j++) {
        if (list[j] && String(list[j].id) === String(keep)) {
            found = true;
            break;
        }
    }
    sel.value = found ? String(keep) : '';
}

function mqttSetInputValue(id, value) {
    var el = document.getElementById(id);
    if (el) el.value = value === undefined || value === null ? '' : String(value);
}

function mqttSetChecked(id, checked) {
    var el = document.getElementById(id);
    if (el) el.checked = !!checked;
}

function mqttCollectFormPreset(id, name) {
    mqttSyncBrokerUrlFromParts();
    var urlEl = document.getElementById('mqttUrl');
    var nameEl = document.getElementById('mqttConnName');
    var protocolEl = document.getElementById('mqttProtocol');
    var keepAliveEl = document.getElementById('mqttKeepAlive');
    var timeoutEl = document.getElementById('mqttConnectTimeout');
    var willQosEl = document.getElementById('mqttWillQos');
    var presetName = name;
    if (!presetName) {
        presetName = nameEl && nameEl.value.trim() ? nameEl.value.trim() : mqttDefaultPresetName();
    }
    return mqttNormalizePreset({
        id: id,
        name: presetName,
        url: urlEl ? urlEl.value : '',
        clientId: (document.getElementById('mqttClientId') || {}).value || '',
        username: (document.getElementById('mqttUsername') || {}).value || '',
        password: (document.getElementById('mqttPassword') || {}).value || '',
        protocolVersion: protocolEl ? parseInt(protocolEl.value, 10) : 5,
        clean: document.getElementById('mqttClean') ? document.getElementById('mqttClean').checked : true,
        keepalive: keepAliveEl ? parseInt(keepAliveEl.value, 10) : 60,
        connectTimeoutSec: timeoutEl ? parseInt(timeoutEl.value, 10) : 30,
        will: {
            enabled: document.getElementById('mqttWillEnabled')
                ? document.getElementById('mqttWillEnabled').checked
                : false,
            topic: (document.getElementById('mqttWillTopic') || {}).value || '',
            payload: (document.getElementById('mqttWillPayload') || {}).value || '',
            qos: willQosEl ? parseInt(willQosEl.value, 10) : 0,
            retain: document.getElementById('mqttWillRetain')
                ? document.getElementById('mqttWillRetain').checked
                : false,
        },
    });
}

function mqttFillFormFromPreset(preset) {
    var p = mqttNormalizePreset(preset);
    if (!p) return false;
    mqttSetInputValue('mqttConnName', p.name || '');
    mqttSetInputValue('mqttUrl', p.url);
    mqttFillBrokerPartsFromUrl(p.url);
    mqttSetInputValue('mqttClientId', p.clientId);
    mqttSetInputValue('mqttUsername', p.username);
    mqttSetInputValue('mqttPassword', p.password);
    mqttSetInputValue('mqttProtocol', String(p.protocolVersion));
    mqttSetChecked('mqttClean', p.clean);
    mqttSetInputValue('mqttKeepAlive', p.keepalive);
    mqttSetInputValue('mqttConnectTimeout', p.connectTimeoutSec);
    mqttSetChecked('mqttWillEnabled', p.will.enabled);
    mqttSetInputValue('mqttWillTopic', p.will.topic);
    mqttSetInputValue('mqttWillPayload', p.will.payload);
    mqttSetInputValue('mqttWillQos', String(p.will.qos));
    mqttSetChecked('mqttWillRetain', p.will.retain);
    mqttUpdateConnSummary();
    return true;
}

function mqttApplyPreset() {
    var sel = document.getElementById('mqttPresetSelect');
    var id = sel ? sel.value : '';
    if (!id) {
        toast('请先选择预设');
        return;
    }
    var list = mqttLoadPresets();
    var found = null;
    for (var i = 0; i < list.length; i++) {
        if (list[i] && String(list[i].id) === String(id)) {
            found = list[i];
            break;
        }
    }
    if (!found) {
        toast('预设不存在');
        mqttRenderPresetSelect('');
        return;
    }
    mqttFillFormFromPreset(found);
    toast('已应用预设「' + found.name + '」');
}

function mqttDefaultPresetName() {
    var nameEl = document.getElementById('mqttConnName');
    if (nameEl && nameEl.value.trim()) return nameEl.value.trim();
    var hostEl = document.getElementById('mqttHost');
    if (hostEl && hostEl.value.trim()) return hostEl.value.trim();
    var urlEl = document.getElementById('mqttUrl');
    var url = urlEl ? urlEl.value.trim() : '';
    if (url) {
        try {
            var host = new URL(url).hostname;
            if (host) return host;
        } catch (e) {
            /* ignore */
        }
        return url;
    }
    return '预设 ' + new Date().toLocaleTimeString();
}

function mqttSavePreset() {
    var sel = document.getElementById('mqttPresetSelect');
    var id = sel ? sel.value : '';
    if (!id) {
        mqttSavePresetAs();
        return;
    }
    var list = mqttLoadPresets();
    var existing = null;
    for (var i = 0; i < list.length; i++) {
        if (list[i] && String(list[i].id) === String(id)) {
            existing = list[i];
            break;
        }
    }
    if (!existing) {
        mqttSavePresetAs();
        return;
    }
    var preset = mqttCollectFormPreset(existing.id, existing.name);
    if (!preset) {
        toast('请先填写 Broker URL');
        return;
    }
    list = mqttUpsertPreset(list, preset);
    mqttPersistPresets(list);
    mqttRenderPresetSelect(preset.id);
    toast('已保存预设「' + preset.name + '」');
}

function mqttSavePresetAs() {
    var name = '';
    if (typeof prompt === 'function') {
        var typed = prompt('预设名称', mqttDefaultPresetName());
        if (typed === null) return;
        name = String(typed).trim();
    }
    if (!name) name = mqttDefaultPresetName();
    var preset = mqttCollectFormPreset(String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8), name);
    if (!preset) {
        toast('请先填写 Broker URL');
        return;
    }
    var list = mqttUpsertPreset(mqttLoadPresets(), preset);
    mqttPersistPresets(list);
    mqttRenderPresetSelect(preset.id);
    toast('已另存为「' + preset.name + '」');
}

function mqttDeletePreset() {
    var sel = document.getElementById('mqttPresetSelect');
    var id = sel ? sel.value : '';
    if (!id) {
        toast('请先选择预设');
        return;
    }
    var list = mqttLoadPresets();
    var name = '';
    for (var i = 0; i < list.length; i++) {
        if (list[i] && String(list[i].id) === String(id)) {
            name = list[i].name;
            break;
        }
    }
    list = mqttRemovePreset(list, id);
    mqttPersistPresets(list);
    mqttRenderPresetSelect('');
    toast(name ? '已删除预设「' + name + '」' : '已删除预设');
}

function mqttBindSubModal() {
    var modal = document.getElementById('mqttSubModal');
    if (!modal || modal.dataset.mqttBound) return;
    modal.dataset.mqttBound = '1';
    modal.addEventListener('click', function (e) {
        if (e.target === modal) mqttCloseSubModal();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal && !modal.hidden) {
            mqttCloseSubModal();
        }
    });
}

function mqttBindConnName() {
    var el = document.getElementById('mqttConnName');
    if (!el || el.dataset.mqttBound) return;
    el.dataset.mqttBound = '1';
    el.addEventListener('input', mqttUpdateConnSummary);
}

function mqttInit() {
    mqttRandomClientId();
    mqttUpdateStatus('未连接', 'disconnected');
    mqttBindLogDelegate();
    mqttBindKwFilter();
    mqttBindSubModal();
    mqttBindConnName();
    mqttSyncBrokerUrlFromParts();
    mqttRenderPresetSelect();
    mqttRenderSubs();
    mqttRenderLog();
    mqttRenderStats();
    mqttUpdateConnSummary();
}

if (typeof registerInit === 'function') {
    registerInit('mqtt', mqttInit);
}

if (typeof window !== 'undefined') {
    window.mqttConnect = mqttConnect;
    window.mqttDisconnect = mqttDisconnect;
    window.mqttOpenSubModal = mqttOpenSubModal;
    window.mqttCloseSubModal = mqttCloseSubModal;
    window.mqttOnBrokerPartsChange = mqttOnBrokerPartsChange;
    window.mqttSwitchSettingsTab = mqttSwitchSettingsTab;
    window.mqttSubscribe = mqttSubscribe;
    window.mqttUnsubscribe = mqttUnsubscribe;
    window.mqttUnsubscribeAll = mqttUnsubscribeAll;
    window.mqttPublish = mqttPublish;
    window.mqttOnPubFormatChange = mqttOnPubFormatChange;
    window.mqttClearLog = mqttClearLog;
    window.mqttCopyLog = mqttCopyLog;
    window.mqttRandomClientId = mqttRandomClientId;
    window.mqttToggleSettings = mqttToggleSettings;
    window.mqttSetFilter = mqttSetFilter;
    window.mqttOnDirFilterChange = mqttOnDirFilterChange;
    window.mqttApplyPreset = mqttApplyPreset;
    window.mqttSavePreset = mqttSavePreset;
    window.mqttSavePresetAs = mqttSavePresetAs;
    window.mqttDeletePreset = mqttDeletePreset;
    window.mqttExportLog = mqttExportLog;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        mqttGenClientId: mqttGenClientId,
        mqttValidateBrokerUrl: mqttValidateBrokerUrl,
        mqttBuildBrokerUrl: mqttBuildBrokerUrl,
        mqttParseBrokerUrl: mqttParseBrokerUrl,
        mqttValidateTopic: mqttValidateTopic,
        mqttParseSubTopics: mqttParseSubTopics,
        mqttFormatPayloadPreview: mqttFormatPayloadPreview,
        mqttLogLineText: mqttLogLineText,
        mqttTopicMatchesFilter: mqttTopicMatchesFilter,
        mqttFilterLogs: mqttFilterLogs,
        mqttPrettyPayload: mqttPrettyPayload,
        mqttColorForIndex: mqttColorForIndex,
        MQTT_TOPIC_COLORS: MQTT_TOPIC_COLORS,
        MQTT_PRESET_MAX: MQTT_PRESET_MAX,
        MQTT_PRESET_KEY: MQTT_PRESET_KEY,
        mqttNormalizePreset: mqttNormalizePreset,
        mqttUpsertPreset: mqttUpsertPreset,
        mqttRemovePreset: mqttRemovePreset,
        mqttSerializePresets: mqttSerializePresets,
        mqttParsePresets: mqttParsePresets,
        mqttFormatDuration: mqttFormatDuration,
        mqttFormatBytes: mqttFormatBytes,
        mqttStatsText: mqttStatsText,
        mqttBuildExport: mqttBuildExport,
        mqttEncodePublishPayload: mqttEncodePublishPayload,
        mqttPubFormatPlaceholder: mqttPubFormatPlaceholder,
    };
}
