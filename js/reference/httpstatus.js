const HTTP_STATUS = {
    '1xx': [
        {code: 100, text: 'Continue', desc: '继续'},
        {code: 101, text: 'Switching Protocols', desc: '切换协议'},
    ],
    '2xx': [
        {code: 200, text: 'OK', desc: '请求成功'},
        {code: 201, text: 'Created', desc: '已创建'},
        {code: 202, text: 'Accepted', desc: '已接受'},
        {code: 203, text: 'Non-Authoritative Information', desc: '非授权信息'},
        {code: 204, text: 'No Content', desc: '无内容'},
        {code: 205, text: 'Reset Content', desc: '重置内容'},
        {code: 206, text: 'Partial Content', desc: '部分内容'},
    ],
    '3xx': [
        {code: 300, text: 'Multiple Choices', desc: '多种选择'},
        {code: 301, text: 'Moved Permanently', desc: '永久重定向'},
        {code: 302, text: 'Found', desc: '临时重定向'},
        {code: 303, text: 'See Other', desc: '查看其他位置'},
        {code: 304, text: 'Not Modified', desc: '未修改'},
        {code: 307, text: 'Temporary Redirect', desc: '临时重定向(保持请求方法)'},
        {code: 308, text: 'Permanent Redirect', desc: '永久重定向(保持请求方法)'},
    ],
    '4xx': [
        {code: 400, text: 'Bad Request', desc: '请求错误'},
        {code: 401, text: 'Unauthorized', desc: '未授权'},
        {code: 403, text: 'Forbidden', desc: '禁止访问'},
        {code: 404, text: 'Not Found', desc: '未找到'},
        {code: 405, text: 'Method Not Allowed', desc: '方法不允许'},
        {code: 406, text: 'Not Acceptable', desc: '无法接受'},
        {code: 408, text: 'Request Timeout', desc: '请求超时'},
        {code: 409, text: 'Conflict', desc: '冲突'},
        {code: 410, text: 'Gone', desc: '资源已删除'},
        {code: 415, text: 'Unsupported Media Type', desc: '不支持的媒体类型'},
        {code: 422, text: 'Unprocessable Entity', desc: '无法处理的实体'},
        {code: 429, text: 'Too Many Requests', desc: '请求过多'},
    ],
    '5xx': [
        {code: 500, text: 'Internal Server Error', desc: '服务器内部错误'},
        {code: 501, text: 'Not Implemented', desc: '未实现'},
        {code: 502, text: 'Bad Gateway', desc: '网关错误'},
        {code: 503, text: 'Service Unavailable', desc: '服务不可用'},
        {code: 504, text: 'Gateway Timeout', desc: '网关超时'},
        {code: 505, text: 'HTTP Version Not Supported', desc: 'HTTP 版本不支持'},
    ],
};

const HTTP_METHODS = [
    {method: 'GET', desc: '获取资源', safe: true, idempotent: true},
    {method: 'HEAD', desc: '获取响应头(无响应体)', safe: true, idempotent: true},
    {method: 'POST', desc: '创建资源', safe: false, idempotent: false},
    {method: 'PUT', desc: '完整更新资源', safe: false, idempotent: true},
    {method: 'PATCH', desc: '部分更新资源', safe: false, idempotent: false},
    {method: 'DELETE', desc: '删除资源', safe: false, idempotent: true},
    {method: 'OPTIONS', desc: '获取支持的请求方法', safe: true, idempotent: true},
];

function httpStatusRender() {
    const container = document.getElementById('httpStatusContent');
    if (!container) return;
    container.innerHTML = '';

    const methodColors = {
        GET: '#4caf50',
        HEAD: '#607d8b',
        POST: '#ff9800',
        PUT: '#2196f3',
        PATCH: '#9c27b0',
        DELETE: '#f44336',
        OPTIONS: '#607d8b',
    };

    const methodSection = document.createElement('div');
    methodSection.style.cssText = 'margin-bottom:16px';
    methodSection.innerHTML =
        '<div style="font-size:12px;font-weight:600;color:var(--accent);padding:6px 0;border-bottom:1px solid var(--border);margin-bottom:8px">HTTP 方法</div>';
    HTTP_METHODS.forEach((m) => {
        const card = document.createElement('div');
        card.className = 'ref-card';
        const col = methodColors[m.method] || 'var(--text)';
        card.innerHTML = `<div class="ref-cmd-head"><code style="background:var(--bg-input);padding:2px 10px;border-radius:4px;font-size:13px;color:${col};font-weight:600;white-space:nowrap">${m.method}</code><span class="ref-cmd-desc">${m.desc}</span><span style="font-size:11px;color:var(--text-muted)">${m.safe ? '安全 ' : ''}${m.idempotent ? '幂等' : ''}</span></div>`;
        methodSection.appendChild(card);
    });
    container.appendChild(methodSection);

    Object.entries(HTTP_STATUS).forEach(([cat, items]) => {
        const section = document.createElement('div');
        section.style.cssText = 'margin-bottom:16px';
        const catLabel =
            cat +
            ' ' +
            ({'1xx': '信息', '2xx': '成功', '3xx': '重定向', '4xx': '客户端错误', '5xx': '服务器错误'}[cat] || '');
        section.innerHTML = `<div style="font-size:12px;font-weight:600;color:var(--accent);padding:6px 0;border-bottom:1px solid var(--border);margin-bottom:8px">${catLabel}</div>`;
        items.forEach((item) => {
            const card = document.createElement('div');
            card.className = 'ref-card';
            const statusCol =
                item.code < 200
                    ? '#607d8b'
                    : item.code < 300
                        ? '#4caf50'
                        : item.code < 400
                            ? '#2196f3'
                            : item.code < 500
                                ? '#ff9800'
                                : '#f44336';
            card.innerHTML = `<div class="ref-cmd-head"><code style="background:var(--bg-input);padding:2px 10px;border-radius:4px;font-size:13px;color:${statusCol};font-weight:600;min-width:42px;text-align:center">${item.code}</code><span style="color:var(--accent2);font-weight:500;min-width:120px">${item.text}</span><span class="ref-cmd-desc">${item.desc}</span></div>`;
            section.appendChild(card);
        });
        container.appendChild(section);
    });
}

registerInit('httpstatus', httpStatusRender);
