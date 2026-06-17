function curlMethodChange(el) {
    const v = el.value;
    el.className = 'method-' + v;
    const bodyArea = document.getElementById('curlBody');
    const bodyType = document.getElementById('curlBodyType');
    const isBodyDisabled = v === 'GET' || v === 'HEAD';
    bodyArea.disabled = isBodyDisabled;
    bodyType.disabled = isBodyDisabled;
    bodyArea.style.opacity = isBodyDisabled ? '0.5' : '1';
}

function curlAddHeader(key, val) {
    const container = document.getElementById('curlHeadersList');
    const row = document.createElement('div');
    row.className = 'api-kv-row';
    const k = (key || '').replace(/"/g, '&quot;');
    const v = (val || '').replace(/"/g, '&quot;');
    row.innerHTML = `<input type="text" placeholder="Header 名称" value="${k}"><input type="text" placeholder="Header 值" value="${v}"><button class="outline sm" onclick="this.parentElement.remove()" title="删除">&#10005;</button>`;
    container.appendChild(row);
}

function curlAddQuery(key, val) {
    const container = document.getElementById('curlQueryList');
    const row = document.createElement('div');
    row.className = 'api-kv-row';
    const k = (key || '').replace(/"/g, '&quot;');
    const v = (val || '').replace(/"/g, '&quot;');
    row.innerHTML = `<input type="text" placeholder="参数名" value="${k}"><input type="text" placeholder="参数值" value="${v}"><button class="outline sm" onclick="this.parentElement.remove()" title="删除">&#10005;</button>`;
    container.appendChild(row);
}

function curlCollectKv(listId) {
    const result = [];
    document.querySelectorAll('#' + listId + ' .api-kv-row').forEach(row => {
        const inputs = row.querySelectorAll('input');
        const key = inputs[0].value.trim();
        const val = inputs[1].value;
        if (key) result.push([key, val]);
    });
    return result;
}

function curlShellQuote(s) {
    if (s === undefined || s === null) return "''";
    const str = String(s);
    if (str === '') return "''";
    if (!/[^A-Za-z0-9_\-./:=?&%@,+]/.test(str)) return str;
    return "'" + str.replace(/'/g, "'\\''") + "'";
}

function curlGenerate() {
    const out = document.getElementById('curlOutput');
    const method = document.getElementById('curlMethod').value;
    let url = document.getElementById('curlUrl').value.trim();
    const headers = curlCollectKv('curlHeadersList');
    const query = curlCollectKv('curlQueryList');
    const bodyType = document.getElementById('curlBodyType').value;
    const body = document.getElementById('curlBody').value;

    if (!url) {
        out.textContent = '请输入 URL';
        out.className = 'output-box error';
        toast('请输入 URL');
        return;
    }

    if (query.length) {
        try {
            const u = new URL(url);
            query.forEach(([k, v]) => u.searchParams.append(k, v));
            url = u.toString();
        } catch (e) {
            const sep = url.includes('?') ? '&' : '?';
            const qs = query.map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');
            url += sep + qs;
        }
    }

    const parts = [];
    const usesBody = body && method !== 'GET' && method !== 'HEAD' && bodyType !== 'none';

    if (method === 'GET' || method === 'HEAD') {
        parts.push(`curl ${curlShellQuote(url)}`);
    } else {
        parts.push(`curl -X ${method} ${curlShellQuote(url)}`);
    }

    let hasContentType = false;
    headers.forEach(([k, v]) => {
        parts.push(`  -H ${curlShellQuote(k + ': ' + v)}`);
        if (k.toLowerCase() === 'content-type') hasContentType = true;
    });

    if (usesBody) {
        if (bodyType === 'json' && !hasContentType) {
            parts.push(`  -H ${curlShellQuote('Content-Type: application/json')}`);
        } else if (bodyType === 'form' && !hasContentType) {
            parts.push(`  -H ${curlShellQuote('Content-Type: application/x-www-form-urlencoded')}`);
        }
        parts.push(`  --data-raw ${curlShellQuote(body)}`);
    }

    out.textContent = parts.join(' \\\n');
    out.className = 'output-box';
    setStatus('已生成 curl 命令');
}

function curlParse() {
    const text = document.getElementById('curlInput').value.trim();
    const out = document.getElementById('curlOutput');
    if (!text) {
        toast('请粘贴 curl 命令');
        return;
    }
    if (!/^curl(\s|$)/i.test(text)) {
        out.textContent = '请输入以 curl 开头的命令';
        out.className = 'output-box error';
        return;
    }
    let s = text.replace(/^curl\s+/i, '');
    s = s.replace(/\\\r?\n/g, ' ').replace(/\s+/g, ' ').trim();

    let method = 'GET';
    const xMatch = s.match(/-X\s+('([^']*)'|"([^"]*)"|(\S+))/);
    if (xMatch) {
        method = (xMatch[2] || xMatch[3] || xMatch[4] || 'GET').toUpperCase();
        s = s.replace(/-X\s+('([^']*)'|"([^"]*)"|(\S+))/, '');
    }
    document.getElementById('curlMethod').value = method;
    curlMethodChange(document.getElementById('curlMethod'));

    const tokens = curlTokenize(s);
    const headers = [];
    const queries = [];
    let bodyVal = '';
    let hasBodyFlag = false;
    let bodyType = 'none';
    let url = '';
    let dropQueryFromUrl = false;

    let i = 0;
    while (i < tokens.length) {
        const t = tokens[i];
        if (t === '-H' || t === '--header') {
            const v = tokens[++i] || '';
            const idx = v.indexOf(':');
            if (idx > 0) {
                const k = v.slice(0, idx).trim();
                const val = v.slice(idx + 1).trim();
                headers.push([k, val]);
            }
            i++;
        } else if (t === '-G' || t === '--get') {
            i++;
        } else if (t === '-d' || t === '--data' || t === '--data-raw' || t === '--data-binary' || t === '--data-urlencode') {
            const v = tokens[++i] || '';
            bodyVal += (bodyVal ? '&' : '') + v;
            hasBodyFlag = true;
            bodyType = t === '--data-urlencode' ? 'form' : 'raw';
            i++;
        } else if (t === '--url') {
            url = tokens[++i] || url;
            i++;
        } else if (t.startsWith('--url=')) {
            url = t.slice('--url='.length);
            i++;
        } else if (t.startsWith('-')) {
            // 跳过未知 flag 及其可能的后续值
            if (t.includes('=')) {
                i++;
            } else if (tokens[i + 1] && !tokens[i + 1].startsWith('-')) {
                i += 2;
            } else {
                i++;
            }
        } else {
            if (!url) url = t;
            i++;
        }
    }

    document.getElementById('curlHeadersList').innerHTML = '';
    if (headers.length) {
        headers.forEach(([k, v]) => curlAddHeader(k, v));
    } else {
        curlAddHeader();
    }

    document.getElementById('curlQueryList').innerHTML = '';
    if (dropQueryFromUrl && url) {
        try {
            const u = new URL(url);
            u.searchParams.forEach((v, k) => queries.push([k, v]));
            url = u.origin + u.pathname;
        } catch (e) {
        }
    }
    if (queries.length) {
        queries.forEach(([k, v]) => curlAddQuery(k, v));
    } else {
        curlAddQuery();
    }
    document.getElementById('curlUrl').value = url;

    if (hasBodyFlag) {
        document.getElementById('curlBody').value = bodyVal;
        document.getElementById('curlBodyType').value = bodyType;
    } else {
        document.getElementById('curlBody').value = '';
        document.getElementById('curlBodyType').value = 'none';
    }

    out.textContent = '解析完成，请检查左侧表单。已填入 URL=' + (url || '(空)') + ' / 方法=' + method + ' / ' + headers.length + ' 个 Header / ' + (queries.length || 0) + ' 个 Query' + (hasBodyFlag ? ' / Body=' + bodyVal.length + ' 字符' : '');
    out.className = 'output-box';
    setStatus('curl 解析完成');
}

function curlTokenize(s) {
    const tokens = [];
    let i = 0;
    while (i < s.length) {
        while (i < s.length && /\s/.test(s[i])) i++;
        if (i >= s.length) break;
        if (s[i] === "'") {
            const end = s.indexOf("'", i + 1);
            if (end === -1) {
                tokens.push(s.slice(i + 1));
                break;
            }
            tokens.push(s.slice(i + 1, end));
            i = end + 1;
        } else if (s[i] === '"') {
            const end = s.indexOf('"', i + 1);
            if (end === -1) {
                tokens.push(s.slice(i + 1));
                break;
            }
            tokens.push(s.slice(i + 1, end));
            i = end + 1;
        } else {
            let j = i;
            while (j < s.length && !/\s/.test(s[j]) && s[j] !== "'" && s[j] !== '"') j++;
            tokens.push(s.slice(i, j));
            i = j;
        }
    }
    return tokens;
}

function curlReset() {
    document.getElementById('curlMethod').value = 'GET';
    curlMethodChange(document.getElementById('curlMethod'));
    document.getElementById('curlUrl').value = '';
    document.getElementById('curlHeadersList').innerHTML = '';
    document.getElementById('curlQueryList').innerHTML = '';
    document.getElementById('curlBody').value = '';
    document.getElementById('curlBodyType').value = 'none';
    document.getElementById('curlInput').value = '';
    document.getElementById('curlOutput').textContent = '点击「生成 curl 命令」查看结果';
    document.getElementById('curlOutput').className = 'output-box';
    curlAddHeader();
    curlAddQuery();
    setStatus('已重置');
}

function curlInit() {
    if (document.getElementById('curlHeadersList') && !document.querySelector('#curlHeadersList .api-kv-row')) {
        curlAddHeader('Content-Type', 'application/json');
        curlAddQuery();
    }
    const sel = document.getElementById('curlMethod');
    if (sel) curlMethodChange(sel);
}
