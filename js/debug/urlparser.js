function urlParserParse() {
    const input = document.getElementById('urlparserInput').value.trim();
    const out = document.getElementById('urlparserOutput');
    if (!input) {
        out.textContent = '请输入 URL';
        out.className = 'output-box error';
        return;
    }
    let url;
    try {
        url = new URL(input);
    } catch (e) {
        out.textContent = '无效的 URL: ' + e.message;
        out.className = 'output-box error';
        return;
    }
    const lines = [];
    lines.push('协议 (protocol) : ' + url.protocol);
    lines.push('用户名 (username): ' + (url.username || '(空)'));
    lines.push('密码 (password)  : ' + (url.password || '(空)'));
    lines.push('主机 (host)     : ' + url.hostname);
    lines.push('端口 (port)     : ' + (url.port || '(默认)'));
    lines.push('完整 host:port  : ' + url.host);
    lines.push('源 (origin)     : ' + url.origin);
    lines.push('路径 (pathname) : ' + url.pathname);
    lines.push('查询字符串 (search) : ' + (url.search || '(空)'));
    lines.push('Hash (hash)     : ' + (url.hash || '(空)'));
    lines.push('Href            : ' + url.href);

    const params = [];
    for (const [k, v] of url.searchParams.entries()) {
        params.push({key: k, value: v});
    }
    if (params.length) {
        lines.push('');
        lines.push('查询参数 (解析) :');
        params.forEach((p, i) => {
            lines.push(`  ${i + 1}. ${p.key} = ${p.value}`);
        });
        const obj = {};
        params.forEach((p) => {
            if (obj[p.key] !== undefined) {
                if (!Array.isArray(obj[p.key])) obj[p.key] = [obj[p.key]];
                obj[p.key].push(p.value);
            } else {
                obj[p.key] = p.value;
            }
        });
        lines.push('');
        lines.push('查询参数 (对象) :');
        lines.push(JSON.stringify(obj, null, 2));
    } else {
        lines.push('');
        lines.push('查询参数 (解析) : (无)');
    }
    out.textContent = lines.join('\n');
    out.className = 'output-box';
    setStatus('URL 解析完成');
}

function urlParserFillSample() {
    document.getElementById('urlparserInput').value =
        'https://user:pass@example.com:8080/path/to?a=1&b=hello%20world&c=3#section-2';
    urlParserParse();
}

function urlEncEncode() {
    const input = document.getElementById('urlEncInput').value;
    const out = document.getElementById('urlEncOutput');
    try {
        out.textContent = encodeURIComponent(input);
        out.className = 'output-box';
        setStatus('URL Component 编码完成');
    } catch (e) {
        out.textContent = '编码失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function urlEncDecode() {
    const input = document.getElementById('urlEncInput').value;
    const out = document.getElementById('urlEncOutput');
    try {
        out.textContent = decodeURIComponent(input);
        out.className = 'output-box';
        setStatus('URL Component 解码完成');
    } catch (e) {
        out.textContent = '解码失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function urlEncEncodeUri() {
    const input = document.getElementById('urlEncInput').value;
    const out = document.getElementById('urlEncOutput');
    try {
        out.textContent = encodeURI(input);
        out.className = 'output-box';
        setStatus('完整 URL 编码完成');
    } catch (e) {
        out.textContent = '编码失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function urlEncDecodeUri() {
    const input = document.getElementById('urlEncInput').value;
    const out = document.getElementById('urlEncOutput');
    try {
        out.textContent = decodeURI(input);
        out.className = 'output-box';
        setStatus('完整 URL 解码完成');
    } catch (e) {
        out.textContent = '解码失败: ' + e.message;
        out.className = 'output-box error';
    }
}
