const HTTP_HEADERS = [
    // 通用
    {
        name: 'Cache-Control',
        dir: '通用',
        example: 'no-cache, max-age=3600',
        desc: '缓存控制：no-cache / no-store / max-age / public / private',
    },
    {
        name: 'Connection',
        dir: '通用',
        example: 'keep-alive | close',
        desc: '连接管理：keep-alive 长连接 / close 短连接（HTTP/1.1 默认 keep-alive）',
    },
    {name: 'Date', dir: '通用', example: 'Tue, 15 Apr 2025 12:00:00 GMT', desc: '消息发送时间（RFC 1123 格式）'},
    {name: 'Pragma', dir: '通用', example: 'no-cache', desc: 'HTTP/1.0 兼容的缓存控制（HTTP/1.1 用 Cache-Control）'},
    {name: 'Trailer', dir: '通用', example: 'Expires', desc: 'chunked 编码尾部 header 字段名列表'},
    {
        name: 'Transfer-Encoding',
        dir: '通用',
        example: 'chunked',
        desc: '传输编码：chunked 分块传输（响应体长度未知时使用）',
    },
    {name: 'Upgrade', dir: '通用', example: 'websocket', desc: '协议升级（HTTP Upgrade 到 WebSocket 等）'},
    {name: 'Via', dir: '通用', example: '1.1 proxy.example.com', desc: '代理服务器信息（每经过一层代理追加）'},
    {
        name: 'Warning',
        dir: '通用',
        example: '110 - "Response is Stale"',
        desc: '代理对消息状态的警告（已基本被弃用）',
    },

    // 请求
    {
        name: 'Accept',
        dir: '请求',
        example: 'application/json, text/html',
        desc: '客户端可接受的响应内容类型（支持 q 权重）',
    },
    {name: 'Accept-Charset', dir: '请求', example: 'utf-8, iso-8859-1;q=0.5', desc: '客户端可接受的字符集'},
    {name: 'Accept-Encoding', dir: '请求', example: 'gzip, deflate, br', desc: '客户端可接受的内容编码（压缩）'},
    {
        name: 'Accept-Language',
        dir: '请求',
        example: 'zh-CN,zh;q=0.9,en;q=0.8',
        desc: '客户端可接受的语言（用于国际化）',
    },
    {
        name: 'Authorization',
        dir: '请求',
        example: 'Bearer eyJhbGciOi...',
        desc: '认证凭证：Basic / Bearer token / Digest 等',
    },
    {name: 'Cookie', dir: '请求', example: 'sid=abc123; theme=dark', desc: '客户端发送的 Cookie'},
    {
        name: 'Host',
        dir: '请求',
        example: 'api.example.com:8080',
        desc: '目标主机（HTTP/1.1 必填，区分同一 IP 多域名）',
    },
    {name: 'If-Match', dir: '请求', example: '"67ab43"', desc: '条件请求：ETag 匹配才执行（乐观锁 / 防止并发修改）'},
    {
        name: 'If-Modified-Since',
        dir: '请求',
        example: 'Thu, 01 Jan 2025 00:00:00 GMT',
        desc: '条件请求：资源在指定时间后修改才返回',
    },
    {name: 'If-None-Match', dir: '请求', example: '"67ab43"', desc: '条件请求：ETag 不匹配才返回（304 缓存协商）'},
    {name: 'Origin', dir: '请求', example: 'https://example.com', desc: '请求来源（CORS 必读，POST / 跨域自动携带）'},
    {name: 'Referer', dir: '请求', example: 'https://example.com/page', desc: '来源页面 URL（拼写错误的历史遗留）'},
    {name: 'User-Agent', dir: '请求', example: 'Mozilla/5.0 ... Chrome/120', desc: '用户代理（浏览器、爬虫识别）'},
    {
        name: 'X-Forwarded-For',
        dir: '请求',
        example: '203.0.113.1, 10.0.0.1',
        desc: '客户端真实 IP（代理层追加，逗号分隔）',
    },
    {name: 'X-Real-IP', dir: '请求', example: '203.0.113.1', desc: '客户端真实 IP（Nginx 代理常用）'},
    {name: 'X-Request-Id', dir: '请求', example: '550e8400-e29b-41d4-a716', desc: '请求追踪 ID（分布式链路追踪）'},
    {name: 'X-Correlation-Id', dir: '请求', example: 'abc-123-xyz', desc: '关联 ID（跨服务追踪业务流）'},

    // 响应
    {
        name: 'Access-Control-Allow-Origin',
        dir: '响应',
        example: 'https://example.com',
        desc: 'CORS 允许的来源（* 或具体域）',
    },
    {
        name: 'Access-Control-Allow-Methods',
        dir: '响应',
        example: 'GET, POST, PUT, DELETE',
        desc: 'CORS 允许的 HTTP 方法',
    },
    {
        name: 'Access-Control-Allow-Headers',
        dir: '响应',
        example: 'Content-Type, Authorization',
        desc: 'CORS 允许的请求头',
    },
    {name: 'Access-Control-Allow-Credentials', dir: '响应', example: 'true', desc: 'CORS 是否允许携带 Cookie'},
    {name: 'Access-Control-Max-Age', dir: '响应', example: '86400', desc: '预检请求（OPTIONS）结果缓存秒数'},
    {name: 'Age', dir: '响应', example: '120', desc: '响应在代理缓存中已存在秒数'},
    {
        name: 'Content-Disposition',
        dir: '响应',
        example: 'attachment; filename="a.pdf"',
        desc: '内容处置：inline 直接显示 / attachment 下载',
    },
    {name: 'Content-Encoding', dir: '响应', example: 'gzip', desc: '内容编码：gzip / deflate / br'},
    {name: 'Content-Language', dir: '响应', example: 'zh-CN', desc: '内容语言'},
    {name: 'Content-Length', dir: '响应', example: '1024', desc: '响应体字节长度'},
    {name: 'Content-Type', dir: '响应', example: 'application/json; charset=utf-8', desc: '响应体 MIME 类型与编码'},
    {name: 'ETag', dir: '响应', example: '"67ab43"', desc: '资源版本标识（强 / 弱 ETag）'},
    {name: 'Expires', dir: '响应', example: 'Thu, 01 Dec 2025 16:00:00 GMT', desc: '资源过期时间（HTTP/1.0 缓存）'},
    {name: 'Last-Modified', dir: '响应', example: 'Tue, 15 Apr 2025 12:00:00 GMT', desc: '资源最后修改时间'},
    {
        name: 'Location',
        dir: '响应',
        example: 'https://example.com/new',
        desc: '重定向目标 URL（301 / 302 / 201 / 3xx）',
    },
    {name: 'Server', dir: '响应', example: 'nginx/1.25.0', desc: '服务器软件信息（建议隐藏或模糊化）'},
    {
        name: 'Set-Cookie',
        dir: '响应',
        example: 'sid=abc; Path=/; HttpOnly; Secure',
        desc: '设置 Cookie（可指定 Path / Domain / Max-Age / HttpOnly / Secure / SameSite）',
    },
    {
        name: 'Strict-Transport-Security',
        dir: '响应',
        example: 'max-age=31536000; includeSubDomains',
        desc: 'HSTS：强制 HTTPS（首次 HTTPS 响应后生效）',
    },
    {name: 'X-Content-Type-Options', dir: '响应', example: 'nosniff', desc: '禁止浏览器 MIME 嗅探'},
    {
        name: 'X-Frame-Options',
        dir: '响应',
        example: 'DENY | SAMEORIGIN',
        desc: '是否允许在 <iframe> 中展示（防点击劫持）',
    },
    {
        name: 'X-XSS-Protection',
        dir: '响应',
        example: '1; mode=block',
        desc: '浏览器 XSS 过滤（已基本弃用，由 CSP 替代）',
    },
    {
        name: 'Content-Security-Policy',
        dir: '响应',
        example: "default-src 'self'",
        desc: 'CSP：限制资源加载来源（防 XSS）',
    },
    {name: 'WWW-Authenticate', dir: '响应', example: 'Bearer realm="api"', desc: '认证方式提示（401 响应携带）'},
    {name: 'Allow', dir: '响应', example: 'GET, POST', desc: '资源允许的 HTTP 方法（405 响应携带）'},
];

let httpheaderSearchTimer = null;

function httpheaderRender(filter) {
    const container = document.getElementById('httpheaderContent');
    if (!container) return;
    filter = (filter || '').trim().toLowerCase();
    container.innerHTML = '';
    const list = filter
        ? HTTP_HEADERS.filter(
            (h) =>
                h.name.toLowerCase().includes(filter) ||
                h.example.toLowerCase().includes(filter) ||
                h.desc.toLowerCase().includes(filter) ||
                h.dir.toLowerCase().includes(filter)
        )
        : HTTP_HEADERS;
    if (!list.length) {
        container.innerHTML = '<div style="color:var(--text-muted);padding:20px;text-align:center">无匹配结果</div>';
        return;
    }

    const dirColor = {通用: '#607d8b', 请求: '#2196f3', 响应: '#4caf50'};
    const header = document.createElement('div');
    header.style.cssText =
        'display:grid;grid-template-columns:240px 60px 240px 1fr;background:var(--bg-input);font-weight:600;border-radius:4px;padding:6px 0;margin-bottom:6px;font-size:12px;position:sticky;top:0;z-index:5';
    header.innerHTML = `
        <span style="padding:4px 10px">Header</span>
        <span style="padding:4px 10px">方向</span>
        <span style="padding:4px 10px">值示例</span>
        <span style="padding:4px 10px">说明</span>
    `;
    container.appendChild(header);

    list.forEach((h) => {
        const row = document.createElement('div');
        row.style.cssText =
            'display:grid;grid-template-columns:240px 60px 240px 1fr;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px;cursor:pointer;transition:background .12s;border-radius:4px';
        row.onmouseenter = () => (row.style.background = 'var(--glass)');
        row.onmouseleave = () => (row.style.background = '');
        row.innerHTML = `
            <span style="padding:4px 10px"><code style="background:var(--bg-input);padding:2px 6px;border-radius:3px;color:var(--accent2);font-weight:600;font-size:12px">${h.name}</code></span>
            <span style="padding:4px 10px"><span style="background:${dirColor[h.dir] || '#607d8b'};color:#fff;padding:1px 6px;border-radius:3px;font-size:10px">${h.dir}</span></span>
            <span style="padding:4px 10px;color:var(--text-muted);font-family:var(--font);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${h.example}</span>
            <span style="padding:4px 10px;color:var(--text-dim)">${h.desc}</span>
        `;
        row.addEventListener('click', () => safeCopy(h.name));
        container.appendChild(row);
    });
}

function httpheaderSearch() {
    clearTimeout(httpheaderSearchTimer);
    httpheaderSearchTimer = setTimeout(() => {
        httpheaderRender(document.getElementById('httpheaderSearch').value);
    }, 200);
}

registerInit('httpheader', httpheaderRender);
