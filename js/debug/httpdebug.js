/* HTTP 调试工具 - 合并了原 API 调试与 Curl 生成 */
let _httpFormat = 'multi';
let _httpInflight = null;

function httpMethodChange(el) {
    const v = el.value;
    el.className = 'http-method-sel method-' + v;
    const bodyArea = document.getElementById('httpBody');
    const bodyType = document.getElementById('httpBodyType');
    const isBodyDisabled = v === 'GET' || v === 'HEAD';
    bodyArea.disabled = isBodyDisabled;
    bodyType.disabled = isBodyDisabled;
    bodyArea.style.opacity = isBodyDisabled ? '0.5' : '1';
    bodyType.style.opacity = isBodyDisabled ? '0.5' : '1';
}

function httpSwitchTab(el, name) {
    el.parentElement.querySelectorAll('.api-tab').forEach((t) => t.classList.remove('active'));
    el.classList.add('active');
    const root = el.closest('.http-form');
    root.querySelectorAll('.api-tab-panel').forEach((p) => p.classList.remove('active'));
    document.getElementById('http-' + name + '-panel').classList.add('active');
}

function httpSwitchSideTab(el, name) {
    el.parentElement.querySelectorAll('.api-tab').forEach((t) => t.classList.remove('active'));
    el.classList.add('active');
    const root = el.closest('.http-side');
    root.querySelectorAll('.api-tab-panel').forEach((p) => p.classList.remove('active'));
    document.getElementById('http-' + name + '-panel').classList.add('active');
}

function httpSetFormat(fmt) {
    _httpFormat = fmt;
    document.getElementById('httpFmtMulti').classList.toggle('active', fmt === 'multi');
    document.getElementById('httpFmtSingle').classList.toggle('active', fmt === 'single');
    const out = document.getElementById('httpCurlOutput');
    if (out && out.dataset.cmd) out.textContent = httpFormatOutput(out.dataset.cmd);
}

function httpUpdateTabCounts() {
    const qEl = document.getElementById('httpParamsCount');
    const hEl = document.getElementById('httpHeadersCount');
    if (qEl) qEl.textContent = httpCountKv('httpQueryList');
    if (hEl) hEl.textContent = httpCountKv('httpHeadersList');
}

function httpCountKv(listId) {
    const rows = document.querySelectorAll('#' + listId + ' .api-kv-row');
    const set = new Set();
    rows.forEach((r) => {
        const k = r.querySelectorAll('input')[0].value.trim();
        if (k) set.add(k);
    });
    return set.size;
}

function httpAddHeader(key, val) {
    const container = document.getElementById('httpHeadersList');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'api-kv-row';
    const k = (key || '').replace(/"/g, '&quot;');
    const v = (val || '').replace(/"/g, '&quot;');
    row.innerHTML = `<input type="text" placeholder="Header 名称" value="${k}"><input type="text" placeholder="Header 值" value="${v}"><button class="outline sm" onclick="this.parentElement.remove();httpUpdateTabCounts()" title="删除">&#10005;</button>`;
    container.appendChild(row);
    httpUpdateTabCounts();
}

function httpAddQuery(key, val) {
    const container = document.getElementById('httpQueryList');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'api-kv-row';
    const k = (key || '').replace(/"/g, '&quot;');
    const v = (val || '').replace(/"/g, '&quot;');
    row.innerHTML = `<input type="text" placeholder="参数名" value="${k}"><input type="text" placeholder="参数值" value="${v}"><button class="outline sm" onclick="this.parentElement.remove();httpUpdateTabCounts()" title="删除">&#10005;</button>`;
    container.appendChild(row);
    httpUpdateTabCounts();
}

function httpQuickHeader(key, val) {
    const container = document.getElementById('httpHeadersList');
    if (!container) return;
    const rows = container.querySelectorAll('.api-kv-row');
    for (const row of rows) {
        const inputs = row.querySelectorAll('input');
        if (inputs[0].value.trim().toLowerCase() === key.toLowerCase()) {
            inputs[1].value = val + inputs[1].value.replace(/^Bearer\s*/, '');
            inputs[1].focus();
            return;
        }
    }
    httpAddHeader(key, val);
}

function httpCollectKv(listId) {
    const result = [];
    document.querySelectorAll('#' + listId + ' .api-kv-row').forEach((row) => {
        const inputs = row.querySelectorAll('input');
        const key = inputs[0].value.trim();
        const val = inputs[1].value;
        if (key) result.push([key, val]);
    });
    return result;
}

function httpShellQuote(s) {
    if (s === undefined || s === null) return "''";
    const str = String(s);
    if (str === '') return "''";
    if (!/[^A-Za-z0-9_\-./:=?&%@,+]/.test(str)) return str;
    return "'" + str.replace(/'/g, "'\\''") + "'";
}

function httpFormatOutput(cmd) {
    if (_httpFormat === 'single') return cmd.replace(/ \\\n/g, ' ');
    return cmd;
}

function httpCollectAuthHeaders() {
    const type = document.getElementById('httpAuthType');
    if (!type) return [];
    const v = type.value;
    if (v === 'none') return [];
    const out = [];
    if (v === 'bearer') {
        const token = (document.getElementById('httpAuthBearer') || {}).value || '';
        if (token) out.push(['Authorization', 'Bearer ' + token]);
    } else if (v === 'basic') {
        const user = (document.getElementById('httpAuthUser') || {}).value || '';
        const pwd = (document.getElementById('httpAuthPwd') || {}).value || '';
        if (user || pwd) {
            try {
                out.push(['Authorization', 'Basic ' + btoa(unescape(encodeURIComponent(user + ':' + pwd)))]);
            } catch (e) {
                toast('Basic Auth 编码失败');
            }
        }
    } else if (v === 'apikey') {
        const name = (document.getElementById('httpAuthApiName') || {}).value || '';
        const val = (document.getElementById('httpAuthApiVal') || {}).value || '';
        const loc = (document.getElementById('httpAuthApiLoc') || {}).value || 'header';
        if (name && val) {
            if (loc === 'header') {
                out.push([name, val]);
            } else if (loc === 'query') {
                out.push(['__apikey__', name + '=' + val]);
            }
        }
    }
    return out;
}

function httpAuthChange() {
    const root = document.getElementById('httpAuthFields');
    if (!root) return;
    const v = document.getElementById('httpAuthType').value;
    let html = '';
    if (v === 'bearer') {
        html = `<div class="flex gap-6" style="align-items:center"><span class="label" style="margin:0;width:80px">Token</span>
                <input id="httpAuthBearer" type="text" placeholder="eyJhbGciOi..." style="flex:1" oninput="httpGenerate()"></div>`;
    } else if (v === 'basic') {
        html = `<div class="flex gap-6 mb-8" style="align-items:center"><span class="label" style="margin:0;width:80px">用户名</span>
                <input id="httpAuthUser" type="text" placeholder="username" style="flex:1" oninput="httpGenerate()"></div>
                <div class="flex gap-6" style="align-items:center"><span class="label" style="margin:0;width:80px">密码</span>
                <input id="httpAuthPwd" type="password" placeholder="password" style="flex:1" oninput="httpGenerate()"></div>`;
    } else if (v === 'apikey') {
        html = `<div class="flex gap-6 mb-8" style="align-items:center"><span class="label" style="margin:0;width:80px">参数名</span>
                <input id="httpAuthApiName" type="text" placeholder="X-API-Key" style="flex:1" oninput="httpGenerate()"></div>
                <div class="flex gap-6 mb-8" style="align-items:center"><span class="label" style="margin:0;width:80px">Value</span>
                <input id="httpAuthApiVal" type="text" placeholder="key value" style="flex:1" oninput="httpGenerate()"></div>
                <div class="flex gap-6" style="align-items:center"><span class="label" style="margin:0;width:80px">位置</span>
                <select id="httpAuthApiLoc" style="width:200px" onchange="httpGenerate()">
                    <option value="header">Header 头</option>
                    <option value="query">Query 参数</option>
                </select></div>`;
    }
    root.innerHTML = html;
}

function httpBuildRequestConfig() {
    const method = document.getElementById('httpMethod').value;
    let url = document.getElementById('httpUrl').value.trim();
    let headers = httpCollectKv('httpHeadersList');
    let query = httpCollectKv('httpQueryList');
    const bodyType = document.getElementById('httpBodyType').value;
    const body = document.getElementById('httpBody').value;
    const isBodyDisabled = method === 'GET' || method === 'HEAD';

    const authHeaders = httpCollectAuthHeaders();
    const authApiKeyQuery = authHeaders.filter(([k]) => k === '__apikey__').map(([, v]) => v.split('='));
    const authOnlyHeaders = authHeaders.filter(([k]) => k !== '__apikey__');
    if (authApiKeyQuery.length) query = query.concat(authApiKeyQuery);

    let hasContentType = false;
    headers.forEach(([k]) => {
        if (k.toLowerCase() === 'content-type') hasContentType = true;
    });

    const mergedHeaders = headers.slice();
    authOnlyHeaders.forEach((ah) => {
        const idx = mergedHeaders.findIndex((h) => h[0].toLowerCase() === ah[0].toLowerCase());
        if (idx >= 0) mergedHeaders[idx] = ah;
        else mergedHeaders.push(ah);
    });

    if (query.length) {
        try {
            const u = new URL(url);
            query.forEach(([k, v]) => {
                if (!u.searchParams.has(k)) u.searchParams.append(k, v);
            });
            url = u.toString();
        } catch (e) {
            const sep = url.includes('?') ? '&' : '?';
            const qs = query.map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');
            url += sep + qs;
        }
    }

    return {method, url, headers: mergedHeaders, body, bodyType, isBodyDisabled, hasContentType};
}

function httpBuildFetchOpts(cfg) {
    const opts = {method: cfg.method};
    const headerObj = {};
    cfg.headers.forEach(([k, v]) => (headerObj[k] = v));

    const usesBody = cfg.body && !cfg.isBodyDisabled && cfg.bodyType !== 'none';
    if (usesBody) {
        if (cfg.bodyType === 'json' && !cfg.hasContentType) headerObj['Content-Type'] = 'application/json';
        else if (cfg.bodyType === 'form' && !cfg.hasContentType) headerObj['Content-Type'] = 'application/x-www-form-urlencoded';
        else if (cfg.bodyType === 'text' && !cfg.hasContentType) headerObj['Content-Type'] = 'text/plain';
        opts.body = cfg.body;
    }
    opts.headers = headerObj;
    if (document.getElementById('httpOptCompressed').checked) {
        opts.headers['Accept-Encoding'] = opts.headers['Accept-Encoding'] || 'gzip, deflate';
    }
    const timeout = parseInt(document.getElementById('httpOptTimeout').value, 10);
    if (timeout > 0) {
        opts.signal = AbortSignal.timeout(timeout * 1000);
    }
    return opts;
}

function httpGenerate() {
    const out = document.getElementById('httpCurlOutput');
    const stats = document.getElementById('httpStats');
    const cfg = httpBuildRequestConfig();
    if (!cfg.url) {
        out.textContent = '请输入 URL';
        out.className = 'output-box http-curl-output error';
        out.dataset.cmd = '';
        stats.style.display = 'none';
        toast('请输入 URL');
        return;
    }

    const parts = [];
    const usesBody = cfg.body && !cfg.isBodyDisabled && cfg.bodyType !== 'none';
    if (cfg.isBodyDisabled) parts.push(`curl ${httpShellQuote(cfg.url)}`);
    else parts.push(`curl -X ${cfg.method} ${httpShellQuote(cfg.url)}`);

    cfg.headers.forEach(([k, v]) => parts.push(`  -H ${httpShellQuote(k + ': ' + v)}`));

    if (usesBody) {
        if (cfg.bodyType === 'json' && !cfg.hasContentType) parts.push(`  -H ${httpShellQuote('Content-Type: application/json')}`);
        else if (cfg.bodyType === 'form' && !cfg.hasContentType) parts.push(`  -H ${httpShellQuote('Content-Type: application/x-www-form-urlencoded')}`);
        else if (cfg.bodyType === 'text' && !cfg.hasContentType) parts.push(`  -H ${httpShellQuote('Content-Type: text/plain')}`);
        parts.push(`  --data-raw ${httpShellQuote(cfg.body)}`);
    }

    if (document.getElementById('httpOptFollow').checked) parts.push('  -L');
    if (document.getElementById('httpOptInsecure').checked) parts.push('  -k');
    if (document.getElementById('httpOptCompressed').checked) parts.push('  --compressed');
    if (document.getElementById('httpOptVerbose').checked) parts.push('  -v');
    if (document.getElementById('httpOptIncludeHeader').checked) parts.push('  -i');
    if (document.getElementById('httpOptSilent').checked) parts.push('  -s');

    const timeout = parseInt(document.getElementById('httpOptTimeout').value, 10);
    if (timeout > 0) parts.push(`  --max-time ${timeout}`);

    const ua = document.getElementById('httpOptUA').value.trim();
    if (ua) parts.push(`  -A ${httpShellQuote(ua)}`);

    const cmd = parts.join(' \\\n');
    out.textContent = httpFormatOutput(cmd);
    out.className = 'output-box http-curl-output';
    out.dataset.cmd = cmd;

    document.getElementById('httpStatMethod').textContent = cfg.method;
    document.getElementById('httpStatUrl').textContent = cfg.url.length > 60 ? cfg.url.slice(0, 57) + '...' : cfg.url;
    document.getElementById('httpStatHeaders').textContent = cfg.headers.length;
    document.getElementById('httpStatBody').textContent = cfg.body ? cfg.body.length : 0;
    stats.style.display = 'flex';

    setStatus('已生成 cURL 命令');
}

function httpSend() {
    if (_httpInflight) {
        _httpInflight.abort();
        _httpInflight = null;
    }
    const cfg = httpBuildRequestConfig();
    if (!cfg.url) {
        toast('请输入 URL');
        return;
    }

    const opts = httpBuildFetchOpts(cfg);
    if (!opts.headers['Content-Type'] && cfg.body && cfg.bodyType !== 'raw' && cfg.bodyType !== 'none') {
        opts.headers['Content-Type'] = 'application/json';
    }

    const statusEl = document.getElementById('httpStatus');
    const metaEl = document.getElementById('httpMeta');
    const bodyEl = document.getElementById('httpBodyOutput');
    const respEl = document.getElementById('httpResponse');
    const emptyEl = document.getElementById('httpResponseEmpty');

    respEl.style.display = 'block';
    emptyEl.style.display = 'none';
    statusEl.textContent = '请求中...';
    statusEl.className = 'resp-status';
    metaEl.textContent = '';
    bodyEl.textContent = '';

    const sideTabs = document.querySelectorAll('.http-side-tabs .api-tab');
    sideTabs.forEach((t) => t.classList.remove('active'));
    sideTabs[0].classList.add('active');
    document.querySelectorAll('.http-side-panel').forEach((p) => p.classList.remove('active'));
    document.getElementById('http-response-panel').classList.add('active');

    const start = performance.now();
    setStatus('HTTP 请求中...');
    _httpInflight = fetch(cfg.url, opts);
    _httpInflight
        .then(async (resp) => {
            const elapsed = ((performance.now() - start) / 1000).toFixed(2);
            const code = resp.status;
            const cls = code < 300 ? 'status-2xx' : code < 400 ? 'status-3xx' : code < 500 ? 'status-4xx' : 'status-5xx';
            statusEl.textContent = code + ' ' + resp.statusText;
            statusEl.className = 'resp-status ' + cls;
            const text = await resp.text();
            metaEl.textContent = elapsed + 's  |  ' + text.length + ' bytes  |  ' + (resp.headers.get('content-type') || '-');
            try {
                bodyEl.textContent = JSON.stringify(JSON.parse(text), null, 2);
            } catch (e) {
                bodyEl.textContent = text;
            }
            setStatus('HTTP 请求完成 (' + resp.status + ')');
        })
        .catch((err) => {
            statusEl.textContent = err.name === 'TimeoutError' ? '超时' : '错误';
            statusEl.className = 'resp-status status-5xx';
            metaEl.textContent = '';
            bodyEl.textContent = '请求失败: ' + (err.message || err);
            setStatus('HTTP 请求失败');
        })
        .finally(() => {
            _httpInflight = null;
        });
}

function httpCopyResponse() {
    const body = document.getElementById('httpBodyOutput').textContent;
    if (!body) {
        toast('响应为空');
        return;
    }
    navigator.clipboard
        .writeText(body)
        .then(() => toast('已复制响应 Body'))
        .catch(() => toast('复制失败'));
}

function httpParse() {
    const text = document.getElementById('httpCurlInput').value.trim();
    if (!text) {
        toast('请粘贴 curl 命令');
        return;
    }
    if (!/^curl(\s|$)/i.test(text)) {
        toast('请输入以 curl 开头的命令');
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
    const methodSel = document.getElementById('httpMethod');
    methodSel.value = method;
    httpMethodChange(methodSel);

    const tokens = httpTokenize(s);
    const headers = [];
    const queries = [];
    let bodyVal = '';
    let hasBodyFlag = false;
    let bodyType = 'none';
    let url = '';
    const opts = {
        follow: false,
        insecure: false,
        compressed: false,
        verbose: false,
        includeHeader: false,
        silent: false,
        timeout: '',
        ua: ''
    };

    let i = 0;
    while (i < tokens.length) {
        const t = tokens[i];
        if (t === '-H' || t === '--header') {
            const v = tokens[++i] || '';
            const idx = v.indexOf(':');
            if (idx > 0) {
                const k = v.slice(0, idx).trim();
                const val = v.slice(idx + 1).trim();
                if (k.toLowerCase() === 'authorization') {
                    if (/^Bearer\s+/i.test(val)) {
                        document.getElementById('httpAuthType').value = 'bearer';
                        httpAuthChange();
                        const el = document.getElementById('httpAuthBearer');
                        if (el) el.value = val.replace(/^Bearer\s+/i, '');
                    } else if (/^Basic\s+/i.test(val)) {
                        document.getElementById('httpAuthType').value = 'basic';
                        httpAuthChange();
                        try {
                            const decoded = decodeURIComponent(escape(atob(val.replace(/^Basic\s+/i, ''))));
                            const idx2 = decoded.indexOf(':');
                            const u = document.getElementById('httpAuthUser');
                            const p = document.getElementById('httpAuthPwd');
                            if (u) u.value = idx2 >= 0 ? decoded.slice(0, idx2) : decoded;
                            if (p) p.value = idx2 >= 0 ? decoded.slice(idx2 + 1) : '';
                        } catch (e) {
                        }
                    } else {
                        headers.push([k, val]);
                    }
                } else {
                    headers.push([k, val]);
                }
            }
            i++;
        } else if (t === '-G' || t === '--get') {
            i++;
        } else if (
            t === '-d' ||
            t === '--data' ||
            t === '--data-raw' ||
            t === '--data-binary' ||
            t === '--data-urlencode'
        ) {
            const v = tokens[++i] || '';
            bodyVal += (bodyVal ? '&' : '') + v;
            hasBodyFlag = true;
            bodyType = t === '--data-urlencode' ? 'form' : 'raw';
            i++;
        } else if (t === '-L' || t === '--location') {
            opts.follow = true;
            i++;
        } else if (t === '-k' || t === '--insecure') {
            opts.insecure = true;
            i++;
        } else if (t === '--compressed') {
            opts.compressed = true;
            i++;
        } else if (t === '-v' || t === '--verbose') {
            opts.verbose = true;
            i++;
        } else if (t === '-i' || t === '--include') {
            opts.includeHeader = true;
            i++;
        } else if (t === '-s' || t === '--silent') {
            opts.silent = true;
            i++;
        } else if (t === '--max-time' || t === '--connect-timeout') {
            opts.timeout = tokens[++i] || '';
            i++;
        } else if (t.startsWith('--max-time=') || t.startsWith('--connect-timeout=')) {
            opts.timeout = t.split('=')[1] || '';
            i++;
        } else if (t === '-A' || t === '--user-agent') {
            opts.ua = tokens[++i] || '';
            i++;
        } else if (t.startsWith('-A=')) {
            opts.ua = t.slice(3);
            i++;
        } else if (t === '--url') {
            url = tokens[++i] || url;
            i++;
        } else if (t.startsWith('--url=')) {
            url = t.slice('--url='.length);
            i++;
        } else if (t.startsWith('-')) {
            if (t.includes('=')) i++;
            else if (tokens[i + 1] && !tokens[i + 1].startsWith('-')) i += 2;
            else i++;
        } else {
            if (!url) url = t;
            i++;
        }
    }

    if (url) {
        try {
            const u = new URL(url);
            u.searchParams.forEach((v, k) => queries.push([k, v]));
            url = u.origin + u.pathname;
        } catch (e) {
        }
    }

    document.getElementById('httpHeadersList').innerHTML = '';
    if (headers.length) headers.forEach(([k, v]) => httpAddHeader(k, v));
    else httpAddHeader();

    document.getElementById('httpQueryList').innerHTML = '';
    if (queries.length) queries.forEach(([k, v]) => httpAddQuery(k, v));
    else httpAddQuery();

    document.getElementById('httpUrl').value = url;

    if (hasBodyFlag) {
        document.getElementById('httpBody').value = bodyVal;
        if (bodyType === 'form' && bodyVal.includes('=')) {
            document.getElementById('httpBodyType').value = 'form';
        } else if (bodyType === 'raw' && (bodyVal.trim().startsWith('{') || bodyVal.trim().startsWith('['))) {
            document.getElementById('httpBodyType').value = 'json';
        } else {
            document.getElementById('httpBodyType').value = bodyType === 'form' ? 'form' : 'raw';
        }
    } else {
        document.getElementById('httpBody').value = '';
        document.getElementById('httpBodyType').value = 'none';
    }

    document.getElementById('httpOptFollow').checked = opts.follow;
    document.getElementById('httpOptInsecure').checked = opts.insecure;
    document.getElementById('httpOptCompressed').checked = opts.compressed;
    document.getElementById('httpOptVerbose').checked = opts.verbose;
    document.getElementById('httpOptIncludeHeader').checked = opts.includeHeader;
    document.getElementById('httpOptSilent').checked = opts.silent;
    document.getElementById('httpOptTimeout').value = opts.timeout;
    document.getElementById('httpOptUA').value = opts.ua;

    httpUpdateTabCounts();
    httpMethodChange(document.getElementById('httpMethod'));

    toast('解析完成: ' + method + ' / ' + headers.length + ' Header / ' + queries.length + ' Query');
    setStatus('cURL 解析完成');
}

function httpTokenize(s) {
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

function httpFillSample() {
    document.getElementById('httpMethod').value = 'POST';
    httpMethodChange(document.getElementById('httpMethod'));
    document.getElementById('httpUrl').value = 'https://jsonplaceholder.typicode.com/users';
    document.getElementById('httpHeadersList').innerHTML = '';
    httpAddHeader('Content-Type', 'application/json');
    httpAddHeader('Accept', 'application/json');
    document.getElementById('httpQueryList').innerHTML = '';
    httpAddQuery('page', '1');
    httpAddQuery('size', '20');
    document.getElementById('httpBodyType').value = 'json';
    document.getElementById('httpBody').value = JSON.stringify({name: '张三', age: 25}, null, 2);
    document.getElementById('httpAuthType').value = 'none';
    httpAuthChange();
    document.getElementById('httpOptFollow').checked = true;
    document.getElementById('httpOptCompressed').checked = true;
    document.getElementById('httpOptVerbose').checked = false;
    httpUpdateTabCounts();
    httpGenerate();
    toast('已加载示例');
}

function httpReset() {
    if (_httpInflight) {
        _httpInflight.abort();
        _httpInflight = null;
    }
    document.getElementById('httpMethod').value = 'GET';
    httpMethodChange(document.getElementById('httpMethod'));
    document.getElementById('httpUrl').value = '';
    document.getElementById('httpHeadersList').innerHTML = '';
    document.getElementById('httpQueryList').innerHTML = '';
    document.getElementById('httpBody').value = '';
    document.getElementById('httpBodyType').value = 'none';
    document.getElementById('httpCurlInput').value = '';
    document.getElementById('httpCurlOutput').textContent = '点击「生成 cURL」查看结果';
    document.getElementById('httpCurlOutput').className = 'output-box http-curl-output';
    document.getElementById('httpCurlOutput').dataset.cmd = '';
    document.getElementById('httpStats').style.display = 'none';
    document.getElementById('httpResponse').style.display = 'none';
    document.getElementById('httpResponseEmpty').style.display = 'flex';
    document.getElementById('httpAuthType').value = 'none';
    httpAuthChange();
    document.getElementById('httpOptFollow').checked = true;
    document.getElementById('httpOptInsecure').checked = false;
    document.getElementById('httpOptCompressed').checked = false;
    document.getElementById('httpOptVerbose').checked = false;
    document.getElementById('httpOptIncludeHeader').checked = false;
    document.getElementById('httpOptSilent').checked = false;
    document.getElementById('httpOptTimeout').value = '';
    document.getElementById('httpOptUA').value = '';
    httpAddHeader('Content-Type', 'application/json');
    httpAddQuery();
    setStatus('已重置');
}

function httpInit() {
    if (document.getElementById('httpHeadersList') && !document.querySelector('#httpHeadersList .api-kv-row')) {
        httpAddHeader('Content-Type', 'application/json');
        httpAddQuery();
    }
    const sel = document.getElementById('httpMethod');
    if (sel) httpMethodChange(sel);
    httpAuthChange();
    httpUpdateTabCounts();

    const urlInput = document.getElementById('httpUrl');
    if (urlInput) {
        urlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                httpSend();
            }
        });
    }
}

registerInit('httpdebug', httpInit);