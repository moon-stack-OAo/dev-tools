var _mqttClient = null;
var _mqttSubs = []; // { topic, qos }
var _mqttLogs = []; // 限 500 条
var MQTT_LOG_MAX = 500;

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

    var log = document.getElementById('mqttLog');
    if (!log) return;

    var empty = log.querySelector('.mqtt-log-empty');
    if (empty) empty.remove();

    var div = document.createElement('div');
    div.className = 'mqtt-msg ' + (dir === 'in' || dir === 'out' || dir === 'system' ? dir : 'system');

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

    var bodyText = entry.payload || entry.message || '';
    if (bodyText) {
        var bodyEl = document.createElement('pre');
        bodyEl.className = 'mqtt-msg-body';
        bodyEl.textContent = mqttFormatPayloadPreview(bodyText, 2000);
        div.appendChild(bodyEl);
    }

    log.appendChild(div);

    while (log.children.length > MQTT_LOG_MAX) {
        log.removeChild(log.firstChild);
    }
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
            if (!btn) return;
            var topic = btn.getAttribute('data-mqtt-unsub');
            if (topic) mqttUnsubscribe(topic);
        });
    }

    if (_mqttSubs.length === 0) {
        list.innerHTML = '<div class="mqtt-sub-empty">暂无订阅</div>';
        return;
    }

    list.innerHTML = '';
    _mqttSubs.forEach(function (sub) {
        var div = document.createElement('div');
        div.className = 'mqtt-sub-item';

        var topicSpan = document.createElement('span');
        topicSpan.className = 'mqtt-sub-topic';
        topicSpan.textContent = sub.topic;
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

function mqttConnect() {
    var urlEl = document.getElementById('mqttUrl');
    var url = urlEl ? urlEl.value.trim() : '';
    var v = mqttValidateBrokerUrl(url);
    if (!v.ok) {
        toast(v.error);
        return;
    }

    if (typeof mqtt === 'undefined' || typeof mqtt.connect !== 'function') {
        toast('mqtt.js 未加载');
        return;
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

    var protocolVersion = 4;
    if (protocolEl) {
        var pv = parseInt(protocolEl.value, 10);
        if (pv === 5) protocolVersion = 5;
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
    if (!silent) {
        mqttUpdateStatus('已断开', 'disconnected');
    }
}

function mqttSubscribe() {
    if (!mqttIsConnected()) {
        toast('请先连接 Broker');
        return;
    }
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
                if (!_mqttSubs.some(function (s) {
                    return s.topic === g.topic;
                })) {
                    _mqttSubs.push({ topic: g.topic, qos: gQos });
                }
                okTopics.push(g.topic);
                mqttAddLog('out', { topic: g.topic, qos: gQos, message: 'SUBSCRIBE' });
            });
        } else {
            toAdd.forEach(function (t) {
                if (!_mqttSubs.some(function (s) {
                    return s.topic === t;
                })) {
                    _mqttSubs.push({ topic: t, qos: qos });
                }
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
    });
}

function mqttUnsubscribe(topic) {
    if (!topic) return;
    if (!mqttIsConnected()) {
        _mqttSubs = _mqttSubs.filter(function (s) {
            return s.topic !== topic;
        });
        mqttRenderSubs();
        return;
    }
    _mqttClient.unsubscribe(topic, function (err) {
        if (err) {
            mqttAddLog('system', { message: '取消订阅失败 ' + topic + ': ' + (err.message || err) });
            toast('取消订阅失败');
            return;
        }
        _mqttSubs = _mqttSubs.filter(function (s) {
            return s.topic !== topic;
        });
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
        mqttRenderSubs();
        toast('已清空订阅列表');
        return;
    }
    _mqttClient.unsubscribe(topics, function (err) {
        if (err) {
            mqttAddLog('system', { message: '全部取消失败: ' + (err.message || err) });
            toast('全部取消失败');
            return;
        }
        topics.forEach(function (t) {
            mqttAddLog('out', { topic: t, message: 'UNSUBSCRIBE' });
        });
        _mqttSubs = [];
        mqttRenderSubs();
        toast('已取消全部订阅（' + topics.length + '）');
    });
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
    var payload = payloadEl ? payloadEl.value : '';

    _mqttClient.publish(tv.topic, payload, { qos: qos, retain: retain }, function (err) {
        if (err) {
            mqttAddLog('system', { message: '发布失败: ' + (err.message || err) });
            toast('发布失败: ' + (err.message || err));
            return;
        }
        mqttAddLog('out', {
            topic: tv.topic,
            qos: qos,
            retain: retain,
            payload: payload,
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

function mqttCopyLog() {
    if (_mqttLogs.length === 0) {
        toast('没有日志可复制');
        return;
    }
    var text = _mqttLogs.map(mqttLogLineText).join('\n');
    if (typeof safeCopy === 'function') {
        safeCopy(text, '日志已复制');
    } else if (typeof copyText === 'function') {
        copyText(text);
        toast('日志已复制');
    } else {
        toast('复制不可用');
    }
}

function mqttInit() {
    mqttRandomClientId();
    mqttUpdateStatus('未连接', 'disconnected');
    mqttRenderSubs();
}

if (typeof registerInit === 'function') {
    registerInit('mqtt', mqttInit);
}

if (typeof window !== 'undefined') {
    window.mqttConnect = mqttConnect;
    window.mqttDisconnect = mqttDisconnect;
    window.mqttSubscribe = mqttSubscribe;
    window.mqttUnsubscribe = mqttUnsubscribe;
    window.mqttUnsubscribeAll = mqttUnsubscribeAll;
    window.mqttPublish = mqttPublish;
    window.mqttClearLog = mqttClearLog;
    window.mqttCopyLog = mqttCopyLog;
    window.mqttRandomClientId = mqttRandomClientId;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        mqttGenClientId: mqttGenClientId,
        mqttValidateBrokerUrl: mqttValidateBrokerUrl,
        mqttValidateTopic: mqttValidateTopic,
        mqttParseSubTopics: mqttParseSubTopics,
        mqttFormatPayloadPreview: mqttFormatPayloadPreview,
        mqttLogLineText: mqttLogLineText,
    };
}
