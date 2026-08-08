let _sseLogEntries = [];

function sseStatusClass(kind) {
    if (kind === 'connected') return 'ws-status connected';
    if (kind === 'connecting') return 'ws-status connecting';
    return 'ws-status disconnected';
}

function sseUpdateStatus(text, kind) {
    var statusEl = document.getElementById('sseStatus');
    if (!statusEl) return;
    statusEl.className = sseStatusClass(kind || 'disconnected');
    statusEl.innerHTML = '<span class="ws-dot"></span> ' + escapeHtml(text);
}

// SSE 连接
function sseConnect() {
    var url = document.getElementById('sseUrl').value.trim();
    var headersStr = document.getElementById('sseHeaders').value.trim();
    var filterEl = document.getElementById('sseFilter');
    var filter = filterEl ? filterEl.value.trim() : '';

    if (!url) {
        toast('请输入 SSE 端点 URL');
        return;
    }

    sseDisconnect();

    var headers = {};
    if (headersStr) {
        try {
            headers = JSON.parse(headersStr);
        } catch (e) {
            toast('请求头 JSON 格式错误');
            return;
        }
    }

    var filterTypes = filter
        ? filter
              .split(',')
              .map(function (f) {
                  return f.trim();
              })
              .filter(function (f) {
                  return f;
              })
        : [];

    try {
        sseUpdateStatus('连接中…', 'connecting');

        // EventSource 不支持自定义请求头；用 fetch stream 实现 SSE
        var controller = new AbortController();
        window._sseController = controller;

        fetch(url, {
            method: 'GET',
            headers: Object.assign({ Accept: 'text/event-stream' }, headers),
            signal: controller.signal,
        })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status + ' ' + response.statusText);
                }

                sseUpdateStatus('已连接', 'connected');
                sseAddLog('system', '已连接到 ' + url, null);

                var reader = response.body.getReader();
                var decoder = new TextDecoder();
                var buffer = '';

                function read() {
                    reader
                        .read()
                        .then(function (result) {
                            if (result.done) {
                                sseAddLog('system', '连接已关闭', null);
                                sseUpdateStatus('已断开', 'disconnected');
                                return;
                            }

                            buffer += decoder.decode(result.value, { stream: true });
                            var lines = buffer.split('\n');
                            buffer = lines.pop() || '';

                            var eventType = 'message';
                            var eventId = null;
                            var data = '';

                            lines.forEach(function (line) {
                                if (line.startsWith('event:')) {
                                    eventType = line.substring(6).trim();
                                } else if (line.startsWith('id:')) {
                                    eventId = line.substring(3).trim();
                                } else if (line.startsWith('data:')) {
                                    data += (data ? '\n' : '') + line.substring(5).trim();
                                } else if (line === '') {
                                    if (data) {
                                        if (
                                            filterTypes.length === 0 ||
                                            filterTypes.indexOf(eventType) !== -1
                                        ) {
                                            sseAddLog(eventType, data, eventId);
                                        }
                                    }
                                    eventType = 'message';
                                    eventId = null;
                                    data = '';
                                }
                            });

                            read();
                        })
                        .catch(function (error) {
                            if (error.name !== 'AbortError') {
                                sseAddLog('error', '读取错误: ' + error.message, null);
                                sseUpdateStatus('错误', 'disconnected');
                            }
                        });
                }

                read();
            })
            .catch(function (error) {
                if (error.name !== 'AbortError') {
                    sseAddLog('error', '连接失败: ' + error.message, null);
                    sseUpdateStatus('连接失败', 'disconnected');
                }
            });
    } catch (e) {
        sseAddLog('error', '连接错误: ' + e.message, null);
        sseUpdateStatus('错误', 'disconnected');
    }
}

function sseDisconnect() {
    if (window._sseController) {
        window._sseController.abort();
        window._sseController = null;
    }
    sseUpdateStatus('已断开', 'disconnected');
}

function sseEntryTypeClass(type) {
    if (type === 'system' || type === 'error' || type === 'message' || type === 'notification') {
        return 'type-' + type;
    }
    return 'type-other';
}

function sseAddLog(type, data, eventId) {
    var log = document.getElementById('sseLog');
    if (!log) return;

    var empty = log.querySelector('.sse-log-empty');
    if (empty) empty.remove();

    var entry = {
        type: type,
        data: data,
        eventId: eventId,
        timestamp: new Date().toLocaleTimeString(),
    };
    _sseLogEntries.push(entry);

    var div = document.createElement('div');
    div.className = 'sse-entry ' + sseEntryTypeClass(type);

    var head = document.createElement('div');
    head.className = 'sse-entry-head';

    var typeEl = document.createElement('span');
    typeEl.className = 'sse-entry-type';
    typeEl.textContent = type;
    head.appendChild(typeEl);

    if (eventId) {
        var idEl = document.createElement('span');
        idEl.className = 'sse-entry-id';
        idEl.textContent = 'ID: ' + eventId;
        head.appendChild(idEl);
    }

    var timeEl = document.createElement('span');
    timeEl.className = 'sse-entry-time';
    timeEl.textContent = entry.timestamp;
    head.appendChild(timeEl);

    div.appendChild(head);

    var dataEl = document.createElement('pre');
    dataEl.className = 'sse-entry-data';
    try {
        dataEl.textContent = JSON.stringify(JSON.parse(data), null, 2);
    } catch (e) {
        dataEl.className = 'sse-entry-data plain';
        dataEl.textContent = data;
    }
    div.appendChild(dataEl);

    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}

function sseClear() {
    var log = document.getElementById('sseLog');
    if (log) {
        log.innerHTML = '<div class="sse-log-empty">日志已清空</div>';
    }
    _sseLogEntries = [];
    setStatus('日志已清空');
}

function sseCopyLog() {
    if (_sseLogEntries.length === 0) {
        toast('没有日志可复制');
        return;
    }

    var text = _sseLogEntries
        .map(function (entry) {
            var line = '[' + entry.timestamp + '] ' + entry.type;
            if (entry.eventId) line += ' (ID: ' + entry.eventId + ')';
            line += ': ' + entry.data;
            return line;
        })
        .join('\n');

    safeCopy(text, '日志已复制');
}

registerInit('sse', function () {
    sseUpdateStatus('未连接', 'disconnected');
});
