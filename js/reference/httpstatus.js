// HTTP 状态码 / 方法速查 — 数据 + RefEngine 挂载（ADR PR-2.2）

const HTTP_STATUS = {
    '1xx': [
        { code: 100, text: 'Continue', desc: '继续' },
        { code: 101, text: 'Switching Protocols', desc: '切换协议' },
    ],
    '2xx': [
        { code: 200, text: 'OK', desc: '请求成功' },
        { code: 201, text: 'Created', desc: '已创建' },
        { code: 202, text: 'Accepted', desc: '已接受' },
        { code: 203, text: 'Non-Authoritative Information', desc: '非授权信息' },
        { code: 204, text: 'No Content', desc: '无内容' },
        { code: 205, text: 'Reset Content', desc: '重置内容' },
        { code: 206, text: 'Partial Content', desc: '部分内容' },
    ],
    '3xx': [
        { code: 300, text: 'Multiple Choices', desc: '多种选择' },
        { code: 301, text: 'Moved Permanently', desc: '永久重定向' },
        { code: 302, text: 'Found', desc: '临时重定向' },
        { code: 303, text: 'See Other', desc: '查看其他位置' },
        { code: 304, text: 'Not Modified', desc: '未修改' },
        { code: 307, text: 'Temporary Redirect', desc: '临时重定向(保持请求方法)' },
        { code: 308, text: 'Permanent Redirect', desc: '永久重定向(保持请求方法)' },
    ],
    '4xx': [
        { code: 400, text: 'Bad Request', desc: '请求错误' },
        { code: 401, text: 'Unauthorized', desc: '未授权' },
        { code: 403, text: 'Forbidden', desc: '禁止访问' },
        { code: 404, text: 'Not Found', desc: '未找到' },
        { code: 405, text: 'Method Not Allowed', desc: '方法不允许' },
        { code: 406, text: 'Not Acceptable', desc: '无法接受' },
        { code: 408, text: 'Request Timeout', desc: '请求超时' },
        { code: 409, text: 'Conflict', desc: '冲突' },
        { code: 410, text: 'Gone', desc: '资源已删除' },
        { code: 415, text: 'Unsupported Media Type', desc: '不支持的媒体类型' },
        { code: 422, text: 'Unprocessable Entity', desc: '无法处理的实体' },
        { code: 429, text: 'Too Many Requests', desc: '请求过多' },
    ],
    '5xx': [
        { code: 500, text: 'Internal Server Error', desc: '服务器内部错误' },
        { code: 501, text: 'Not Implemented', desc: '未实现' },
        { code: 502, text: 'Bad Gateway', desc: '网关错误' },
        { code: 503, text: 'Service Unavailable', desc: '服务不可用' },
        { code: 504, text: 'Gateway Timeout', desc: '网关超时' },
        { code: 505, text: 'HTTP Version Not Supported', desc: 'HTTP 版本不支持' },
    ],
};

const HTTP_METHODS = [
    { method: 'GET', desc: '获取资源', safe: true, idempotent: true },
    { method: 'HEAD', desc: '获取响应头(无响应体)', safe: true, idempotent: true },
    { method: 'POST', desc: '创建资源', safe: false, idempotent: false },
    { method: 'PUT', desc: '完整更新资源', safe: false, idempotent: true },
    { method: 'PATCH', desc: '部分更新资源', safe: false, idempotent: false },
    { method: 'DELETE', desc: '删除资源', safe: false, idempotent: true },
    { method: 'OPTIONS', desc: '获取支持的请求方法', safe: true, idempotent: true },
];

/** 转为 RefEngine 标准分组（含方法 + 状态码） */
function httpstatusToGroups() {
    const methodColors = {
        GET: '#4caf50',
        HEAD: '#607d8b',
        POST: '#ff9800',
        PUT: '#2196f3',
        PATCH: '#9c27b0',
        DELETE: '#f44336',
        OPTIONS: '#607d8b',
    };
    const groups = [
        {
            cat: 'HTTP 方法',
            items: HTTP_METHODS.map(function (m) {
                const flags = (m.safe ? '安全 ' : '') + (m.idempotent ? '幂等' : '');
                return {
                    name: m.method,
                    desc: m.desc + (flags ? ' · ' + flags.trim() : ''),
                    color: methodColors[m.method] || 'var(--text)',
                };
            }),
        },
    ];
    const catLabel = {
        '1xx': '信息',
        '2xx': '成功',
        '3xx': '重定向',
        '4xx': '客户端错误',
        '5xx': '服务器错误',
    };
    Object.keys(HTTP_STATUS).forEach(function (cat) {
        groups.push({
            cat: cat + ' ' + (catLabel[cat] || ''),
            items: HTTP_STATUS[cat].map(function (item) {
                var statusCol =
                    item.code < 200
                        ? '#607d8b'
                        : item.code < 300
                          ? '#4caf50'
                          : item.code < 400
                            ? '#2196f3'
                            : item.code < 500
                              ? '#ff9800'
                              : '#f44336';
                return {
                    name: String(item.code),
                    desc: item.text + ' — ' + item.desc,
                    color: statusCol,
                };
            }),
        });
    });
    return groups;
}

function httpStatusRender() {
    if (typeof RefEngine === 'undefined' || !RefEngine.mount) {
        return;
    }
    RefEngine.mount({
        containerId: 'httpStatusContent',
        data: httpstatusToGroups(),
        renderExtraHead: function (_item, _esc) {
            // 颜色已用 name code 展示，无需额外
            return '';
        },
    });
}

if (typeof registerInit === 'function') {
    registerInit('httpstatus', httpStatusRender);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        HTTP_STATUS: HTTP_STATUS,
        HTTP_METHODS: HTTP_METHODS,
        httpstatusToGroups: httpstatusToGroups,
    };
}
