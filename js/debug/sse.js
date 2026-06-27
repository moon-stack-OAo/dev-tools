let _sseEventSource = null;
let _sseLogEntries = [];

// SSE 连接
function sseConnect() {
    const url = document.getElementById('sseUrl').value.trim();
    const headersStr = document.getElementById('sseHeaders').value.trim();
    const filter = document.getElementById('sseFilter').value.trim();
    const statusEl = document.getElementById('sseStatus');

    if (!url) {
        toast('请输入 SSE 端点 URL');
        return;
    }

    // 断开现有连接
    sseDisconnect();

    // 解析请求头
    let headers = {};
    if (headersStr) {
        try {
            headers = JSON.parse(headersStr);
        } catch (e) {
            toast('请求头 JSON 格式错误');
            return;
        }
    }

    // 解析过滤器
    const filterTypes = filter
        ? filter
            .split(',')
            .map((f) => f.trim())
            .filter((f) => f)
        : [];

    try {
        statusEl.textContent = '连接中...';
        statusEl.style.color = '#ffd93d';

        // EventSource 不支持自定义请求头，需要使用 polyfill 或 fetch
        // 这里使用 fetch 实现 SSE
        const controller = new AbortController();
        window._sseController = controller;

        fetch(url, {
            method: 'GET',
            headers: {
                Accept: 'text/event-stream',
                ...headers,
            },
            signal: controller.signal,
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status + ' ' + response.statusText);
                }

                statusEl.textContent = '已连接';
                statusEl.style.color = '#4ecdc4';
                sseAddLog('system', '已连接到 ' + url, null);

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                function read() {
                    reader
                        .read()
                        .then(({done, value}) => {
                            if (done) {
                                sseAddLog('system', '连接已关闭', null);
                                sseUpdateStatus('已断开', '#ff6b6b');
                                return;
                            }

                            buffer += decoder.decode(value, {stream: true});
                            const lines = buffer.split('\n');
                            buffer = lines.pop() || '';

                            let eventType = 'message';
                            let eventId = null;
                            let data = '';

                            lines.forEach((line) => {
                                if (line.startsWith('event:')) {
                                    eventType = line.substring(6).trim();
                                } else if (line.startsWith('id:')) {
                                    eventId = line.substring(3).trim();
                                } else if (line.startsWith('data:')) {
                                    data += (data ? '\n' : '') + line.substring(5).trim();
                                } else if (line === '') {
                                    // 空行表示事件结束
                                    if (data) {
                                        // 应用过滤器
                                        if (filterTypes.length === 0 || filterTypes.includes(eventType)) {
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
                        .catch((error) => {
                            if (error.name !== 'AbortError') {
                                sseAddLog('error', '读取错误: ' + error.message, null);
                                sseUpdateStatus('错误', '#ff6b6b');
                            }
                        });
                }

                read();
            })
            .catch((error) => {
                if (error.name !== 'AbortError') {
                    sseAddLog('error', '连接失败: ' + error.message, null);
                    sseUpdateStatus('连接失败', '#ff6b6b');
                }
            });
    } catch (e) {
        sseAddLog('error', '连接错误: ' + e.message, null);
        statusEl.textContent = '错误';
        statusEl.style.color = '#ff6b6b';
    }
}

// SSE 断开
function sseDisconnect() {
    if (window._sseController) {
        window._sseController.abort();
        window._sseController = null;
    }
    sseUpdateStatus('已断开', 'var(--text-dim)');
}

// 更新状态显示
function sseUpdateStatus(text, color) {
    const statusEl = document.getElementById('sseStatus');
    statusEl.textContent = text;
    statusEl.style.color = color;
}

// 添加日志条目
function sseAddLog(type, data, eventId) {
    const log = document.getElementById('sseLog');
    const entry = {
        type: type,
        data: data,
        eventId: eventId,
        timestamp: new Date().toLocaleTimeString(),
    };
    _sseLogEntries.push(entry);

    const div = document.createElement('div');
    div.style.cssText =
        'margin-bottom:6px;padding:6px 8px;background:var(--glass);border-radius:4px;border-left:3px solid ' +
        getTypeColor(type);

    let html = '<div style="display:flex;justify-content:space-between;margin-bottom:4px">';
    html += '<span style="color:' + getTypeColor(type) + ';font-weight:600">' + escapeHtml(type) + '</span>';
    html += '<span style="color:var(--text-dim);font-size:11px">' + entry.timestamp + '</span>';
    html += '</div>';

    if (eventId) {
        html +=
            '<div style="color:var(--text-dim);font-size:11px;margin-bottom:2px">ID: ' + escapeHtml(eventId) + '</div>';
    }

    // 尝试格式化 JSON
    try {
        const json = JSON.parse(data);
        html +=
            '<pre style="margin:0;font-size:11px;white-space:pre-wrap;overflow-x:auto">' +
            escapeHtml(JSON.stringify(json, null, 2)) +
            '</pre>';
    } catch {
        html += '<div style="font-size:11px;word-break:break-all">' + escapeHtml(data) + '</div>';
    }

    div.innerHTML = html;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}

// 获取类型颜色
function getTypeColor(type) {
    switch (type) {
        case 'system':
            return '#4ecdc4';
        case 'error':
            return '#ff6b6b';
        case 'message':
            return '#45b7d1';
        case 'notification':
            return '#ffd93d';
        default:
            return '#96ceb4';
    }
}

// HTML 转义

// 清空日志
function sseClear() {
    const log = document.getElementById('sseLog');
    log.innerHTML = '<div style="color:var(--text-dim)">日志已清空</div>';
    _sseLogEntries = [];
    setStatus('日志已清空');
}

// 复制日志
function sseCopyLog() {
    if (_sseLogEntries.length === 0) {
        toast('没有日志可复制');
        return;
    }

    const text = _sseLogEntries
        .map((entry) => {
            let line = '[' + entry.timestamp + '] ' + entry.type;
            if (entry.eventId) line += ' (ID: ' + entry.eventId + ')';
            line += ': ' + entry.data;
            return line;
        })
        .join('\n');

    safeCopy(text, '日志已复制');
}

registerInit('sse', function () {
    // 初始化
});
