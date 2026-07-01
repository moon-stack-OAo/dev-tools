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

function httpSwitchSideTabByName(name) {
    const tabs = document.querySelectorAll('.http-side-tabs .api-tab');
    for (const t of tabs) {
        const oc = t.getAttribute('onclick') || '';
        if (oc.indexOf("'" + name + "'") >= 0) {
            httpSwitchSideTab(t, name);
            return;
        }
    }
    const root = document.querySelector('.http-side');
    if (root) {
        root.querySelectorAll('.api-tab-panel').forEach((p) => p.classList.remove('active'));
        const panel = document.getElementById('http-' + name + '-panel');
        if (panel) panel.classList.add('active');
    }
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

    return { method, url, headers: mergedHeaders, body, bodyType, isBodyDisabled, hasContentType };
}

function httpBuildFetchOpts(cfg) {
    const opts = { method: cfg.method };
    const headerObj = {};
    cfg.headers.forEach(([k, v]) => (headerObj[k] = v));

    const usesBody = cfg.body && !cfg.isBodyDisabled && cfg.bodyType !== 'none';
    if (usesBody) {
        if (cfg.bodyType === 'json' && !cfg.hasContentType) headerObj['Content-Type'] = 'application/json';
        else if (cfg.bodyType === 'form' && !cfg.hasContentType)
            headerObj['Content-Type'] = 'application/x-www-form-urlencoded';
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
        if (cfg.bodyType === 'json' && !cfg.hasContentType)
            parts.push(`  -H ${httpShellQuote('Content-Type: application/json')}`);
        else if (cfg.bodyType === 'form' && !cfg.hasContentType)
            parts.push(`  -H ${httpShellQuote('Content-Type: application/x-www-form-urlencoded')}`);
        else if (cfg.bodyType === 'text' && !cfg.hasContentType)
            parts.push(`  -H ${httpShellQuote('Content-Type: text/plain')}`);
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

    httpSwitchSideTabByName('curl');

    setStatus('已生成 cURL 命令');
}

let _httpLastBlob = null;
let _httpLastContentType = '';
let _httpLastFilename = '';

function httpIsTextType(contentType) {
    if (!contentType) return true;
    const ct = contentType.toLowerCase();
    if (ct.startsWith('text/')) return true;
    if (ct.includes('json')) return true;
    if (ct.includes('xml')) return true;
    if (ct.includes('javascript')) return true;
    if (ct.includes('x-www-form-urlencoded')) return true;
    if (ct.includes('html')) return true;
    if (ct.includes('plain')) return true;
    return false;
}

function httpIsPreviewable(contentType) {
    if (!contentType) return false;
    const ct = contentType.toLowerCase();
    if (ct.startsWith('image/')) return true;
    if (ct === 'application/pdf') return true;
    if (ct.startsWith('video/')) return true;
    if (ct.startsWith('audio/')) return true;
    return false;
}

function httpFormatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + ' MB';
    return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

function httpExtractFilename(disposition, url, contentType) {
    const m = disposition && disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)/i);
    if (m) {
        try {
            return decodeURIComponent(m[1]);
        } catch (e) {
            return m[1];
        }
    }
    const extMap = {
        'application/pdf': '.pdf',
        'application/zip': '.zip',
        'application/json': '.json',
        'application/xml': '.xml',
        'application/octet-stream': '.bin',
        'application/x-gzip': '.gz',
        'application/x-tar': '.tar',
        'application/msword': '.doc',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
        'application/vnd.ms-excel': '.xls',
        'text/plain': '.txt',
        'text/html': '.html',
        'text/csv': '.csv',
        'text/xml': '.xml',
        'image/png': '.png',
        'image/jpeg': '.jpg',
        'image/gif': '.gif',
        'image/svg+xml': '.svg',
        'image/webp': '.webp',
    };
    try {
        const u = new URL(url, location.href);
        const pathname = u.pathname;
        const last = pathname.substring(pathname.lastIndexOf('/') + 1);
        if (last && /\.[a-zA-Z0-9]{1,5}$/.test(last)) return last;
        if (last && last.length > 0 && last.length < 100) {
            const ext = extMap[contentType] || '';
            return last + ext;
        }
    } catch (e) {
        /* ignore */
    }
    const ext = extMap[contentType] || '';
    return 'response' + ext;
}

function httpDownloadResponse() {
    if (!_httpLastBlob) {
        toast('暂无响应可下载');
        return;
    }
    const url = URL.createObjectURL(_httpLastBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = _httpLastFilename || 'response.bin';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('已触发下载: ' + (_httpLastFilename || 'response.bin'));
}

function httpOpenInNewTab() {
    if (!_httpLastBlob) {
        toast('暂无响应可打开');
        return;
    }
    const url = URL.createObjectURL(_httpLastBlob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    toast('已在新窗口打开');
}

function httpApplyProxy(url, useProxy) {
    if (!useProxy) return url;
    return '/__cors_proxy?target=' + encodeURIComponent(url);
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
    const actionsEl = document.getElementById('httpRespActions');
    const openBtn = document.getElementById('httpOpenBtn');

    respEl.style.display = 'block';
    emptyEl.style.display = 'none';
    actionsEl.style.display = 'none';
    statusEl.textContent = '请求中...';
    statusEl.className = 'resp-status';
    metaEl.textContent = '';
    bodyEl.textContent = '';
    bodyEl.className = 'resp-body';
    _httpLastBlob = null;
    _httpLastContentType = '';
    _httpLastFilename = '';

    const sideTabs = document.querySelectorAll('.http-side-tabs .api-tab');
    sideTabs.forEach((t) => t.classList.remove('active'));
    sideTabs[0].classList.add('active');
    document.querySelectorAll('.http-side-panel').forEach((p) => p.classList.remove('active'));
    document.getElementById('http-response-panel').classList.add('active');

    const useProxy = !!document.getElementById('httpOptProxy') && document.getElementById('httpOptProxy').checked;
    const requestUrl = httpApplyProxy(cfg.url, useProxy);

    const start = performance.now();
    setStatus('HTTP 请求中...' + (useProxy ? ' (本地代理)' : ''));
    _httpInflight = fetch(requestUrl, opts);
    _httpInflight
        .then(async (resp) => {
            const elapsed = ((performance.now() - start) / 1000).toFixed(2);
            const code = resp.status;
            const cls =
                code < 300 ? 'status-2xx' : code < 400 ? 'status-3xx' : code < 500 ? 'status-4xx' : 'status-5xx';
            statusEl.textContent = code + ' ' + resp.statusText;
            statusEl.className = 'resp-status ' + cls;

            const contentType = (resp.headers.get('content-type') || '').toLowerCase().split(';')[0].trim();
            const disposition = resp.headers.get('content-disposition') || '';
            const blob = await resp.blob();
            const size = blob.size;
            _httpLastBlob = blob;
            _httpLastContentType = contentType;
            _httpLastFilename = httpExtractFilename(disposition, cfg.url, contentType);

            metaEl.textContent = elapsed + 's  |  ' + httpFormatBytes(size) + '  |  ' + (contentType || '-');
            actionsEl.style.display = 'flex';

            const previewable = httpIsPreviewable(contentType);
            openBtn.style.display = previewable ? '' : 'none';

            const isText = httpIsTextType(contentType);
            if (isText && size < 5 * 1024 * 1024) {
                const text = await blob.text();
                bodyEl.className = 'resp-body';
                try {
                    bodyEl.textContent = JSON.stringify(JSON.parse(text), null, 2);
                } catch (e) {
                    bodyEl.textContent = text;
                }
            } else {
                bodyEl.className = 'resp-body http-blob-hint';
                let iconCls = 'bi-file-earmark';
                let label = (contentType || '二进制文件') + ' 已就绪';
                if (previewable && contentType.startsWith('image/')) iconCls = 'bi-image';
                else if (contentType === 'application/pdf') iconCls = 'bi-file-earmark-pdf';
                else if (contentType.startsWith('video/')) iconCls = 'bi-film';
                else if (contentType.startsWith('audio/')) iconCls = 'bi-music-note-beamed';
                else iconCls = 'bi-file-earmark-zip';

                const tip = previewable ? '点击「打开」在新窗口预览，或「下载」保存文件' : '点击「下载」保存文件';
                let html =
                    '<div class="http-blob-icon"><i class="bi ' +
                    iconCls +
                    '"></i></div>' +
                    '<div class="http-blob-info">' +
                    label +
                    '<br><span class="http-blob-meta">' +
                    httpFormatBytes(size) +
                    (contentType ? ' · ' + contentType : '') +
                    '</span></div>' +
                    '<div class="http-blob-tip">' +
                    tip +
                    '</div>';

                if (previewable && contentType.startsWith('image/')) {
                    const blobUrl = URL.createObjectURL(blob);
                    html += '<div class="http-blob-preview"><img src="' + blobUrl + '" alt="preview"></div>';
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
                }
                bodyEl.innerHTML = html;
            }

            setStatus('HTTP 请求完成 (' + resp.status + ')');
        })
        .catch((err) => {
            const isTimeout = err.name === 'TimeoutError' || /timeout/i.test(err.message || '');
            const isAbort = err.name === 'AbortError' || /aborted/i.test(err.message || '');
            statusEl.textContent = isTimeout ? '超时' : isAbort ? '已取消' : '错误';
            statusEl.className = 'resp-status status-5xx';
            metaEl.textContent = '';
            bodyEl.innerHTML = httpBuildErrorDiagnosis(err, cfg);
            bodyEl.className = 'resp-body http-error-body';
            actionsEl.style.display = 'none';
            _httpLastBlob = null;
            setStatus('HTTP 请求失败');
        })
        .finally(() => {
            _httpInflight = null;
            httpSaveHistory(cfg);
        });
}

function httpBodyTypeChange() {
    const t = document.getElementById('httpBodyType').value;
    const hint = document.getElementById('httpBodyHint');
    const body = document.getElementById('httpBody');
    const map = {
        none: '不发送请求体',
        json: 'json 格式将自动添加 Content-Type: application/json',
        form: 'form-urlencoded 格式（key=value&key2=value2），自动添加 Content-Type: application/x-www-form-urlencoded',
        text: '纯文本格式，自动添加 Content-Type: text/plain',
        raw: '原始数据，请手动在 Headers 中设置 Content-Type',
    };
    hint.textContent = map[t] || '';
    const phMap = {
        json: '{"name":"张三","age":25}',
        form: 'key1=value1&key2=value2',
        text: '任意文本内容...',
        raw: '任意原始数据，由 Content-Type 决定解析方式',
        none: '当前类型为 none，不会发送 body',
    };
    body.placeholder = phMap[t] || '';
}

function httpFormatJson() {
    const body = document.getElementById('httpBody');
    const text = body.value.trim();
    if (!text) {
        toast('Body 为空');
        return;
    }
    try {
        const obj = JSON.parse(text);
        body.value = JSON.stringify(obj, null, 2);
        toast('已美化');
    } catch (e) {
        toast('不是合法 JSON: ' + e.message);
    }
}

function httpCompressJson() {
    const body = document.getElementById('httpBody');
    const text = body.value.trim();
    if (!text) {
        toast('Body 为空');
        return;
    }
    try {
        const obj = JSON.parse(text);
        body.value = JSON.stringify(obj);
        toast('已压缩');
    } catch (e) {
        toast('不是合法 JSON: ' + e.message);
    }
}

function httpClearBody() {
    const body = document.getElementById('httpBody');
    if (!body.value) return;
    body.value = '';
    toast('已清空');
}

function httpBuildErrorDiagnosis(err, cfg) {
    const msg = err.message || String(err);
    let title = '请求失败';
    let icon = 'bi-exclamation-triangle';
    let causes = [];
    let solutions = [];

    if (err.name === 'TimeoutError' || /timeout/i.test(msg)) {
        title = '请求超时';
        icon = 'bi-hourglass-bottom';
        causes.push('目标服务器在 ' + (cfg.timeout || 30) + ' 秒内未响应');
        solutions.push('检查网络是否通畅');
        solutions.push('确认目标服务是否在运行');
        solutions.push('在 Options 标签增大超时时间');
    } else if (err.name === 'AbortError' || /aborted/i.test(msg)) {
        title = '请求已取消';
        icon = 'bi-x-circle';
        causes.push('用户主动中止或页面切换');
    } else if (err instanceof TypeError && /failed to fetch/i.test(msg)) {
        title = '网络请求失败 (Failed to fetch)';
        icon = 'bi-wifi-off';
        const isHttps = location.protocol === 'https:';
        const isHttp = /^http:\/\//i.test(cfg.url);
        const LOCAL_HOST = /^(localhost|127\.0\.0\.1|::1|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/i;
        const isTargetLocal = LOCAL_HOST.test((cfg.url.match(/^https?:\/\/([^\/:?#]+)/i) || [])[1] || cfg.url);
        const isPageLocal = location.protocol === 'file:' || LOCAL_HOST.test(location.hostname);

        if (isHttps && isHttp) {
            causes.push('HTTPS 页面访问 HTTP 资源（混合内容被浏览器拦截）');
            solutions.push('将目标服务升级到 HTTPS，或在 HTTP 服务端设置重定向到 HTTPS');
        } else if (isTargetLocal && isPageLocal) {
            causes.push('如果浏览器直接访问 URL 能打开，但工具 fetch 失败，常见原因：');
            causes.push(
                '1) CORS 跨域拦截：服务端未返回 Access-Control-Allow-Origin（浏览器地址栏不受限，fetch 才受限）'
            );
            causes.push('2) 鉴权缺失：网关需要 Cookie / Token / Referer，浏览器地址栏会自动带，fetch 不会');
            causes.push('3) 服务只监听 127.0.0.1，局域网其他机器访问不到（应监听 0.0.0.0）');
            causes.push('4) 端口被防火墙拦截');
            solutions.push('终端验证网络层：curl ' + cfg.url + '（能通 = 网络 OK，问题在 HTTP 层）');
            solutions.push('curl + 响应头：curl -I ' + cfg.url + ' 查看 Access-Control-Allow-Origin');
            solutions.push('若是 CORS：让后端加响应头 Access-Control-Allow-Origin: *');
            solutions.push('若是鉴权：在 Auth 标签加 Cookie / Authorization，在 Headers 加 Referer/Origin');
            solutions.push('按 F12 网络面板看 OPTIONS 预检 / 401 / 403 等具体状态');
        } else if (isTargetLocal && !isPageLocal) {
            causes.push('当前页面部署在公网，无法访问本机 / 局域网地址（CORS + 浏览器安全策略）');
            solutions.push('仅在本机 / VPN 内网使用本工具访问本地服务');
            solutions.push('团队共享：部署 API 代理（ngrok / Cloudflare Tunnel / 自建 relay）');
            solutions.push('或给目标服务加 HTTPS + CORS 后部署到公网');
        } else {
            causes.push('可能原因：');
            causes.push('1) CORS 跨域限制 — 服务端未返回 Access-Control-Allow-Origin 响应头');
            causes.push('2) 网络断开 / DNS 解析失败 / 目标主机不可达');
            causes.push('3) 协议错误（HTTPS 证书无效、TLS 握手失败）');
            solutions.push('按 F12 打开「网络」面板查看具体失败请求详情');
            solutions.push('若是 CORS 错误：在目标服务端响应头添加 Access-Control-Allow-Origin: *（开发环境）');
            solutions.push('若是公司 API：联系后端确认已开启跨域白名单');
        }
    } else {
        causes.push(msg);
    }

    let html = '<div class="http-error-diagnosis">';
    html += '<div class="http-error-title"><i class="bi ' + icon + '"></i> ' + title + '</div>';
    html += '<div class="http-error-section"><b>可能原因：</b><ul>';
    causes.forEach((c) => (html += '<li>' + escapeHtml(c) + '</li>'));
    html += '</ul></div>';
    if (solutions.length) {
        html += '<div class="http-error-section"><b>建议：</b><ul>';
        solutions.forEach((s) => (html += '<li>' + escapeHtml(s) + '</li>'));
        html += '</ul></div>';
    }
    html += '<div class="http-error-tech">原始错误: ' + escapeHtml(msg) + '</div>';
    html += '</div>';
    return html;
}

function httpCopyResponse() {
    const bodyEl = document.getElementById('httpBodyOutput');
    if (bodyEl.classList.contains('http-blob-hint')) {
        toast('二进制响应请使用「下载」按钮');
        return;
    }
    const body = bodyEl.textContent;
    if (!body) {
        toast('响应为空');
        return;
    }
    navigator.clipboard
        .writeText(body)
        .then(() => toast('已复制响应 Body'))
        .catch(() => toast('复制失败'));
}

function httpClearCurlInput() {
    document.getElementById('httpCurlInput').value = '';
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
    s = s
        .replace(/\\\r?\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    let method = 'GET';
    const xMatch = s.match(/(?:-X|--request)\s+('([^']*)'|"([^"]*)"|(\S+))/);
    if (xMatch) {
        method = (xMatch[2] || xMatch[3] || xMatch[4] || 'GET').toUpperCase();
        s = s.replace(/(?:-X|--request)\s+('([^']*)'|"([^"]*)"|(\S+))/, '');
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
    let useGetFlag = false;
    const opts = {
        follow: false,
        insecure: false,
        compressed: false,
        verbose: false,
        includeHeader: false,
        silent: false,
        timeout: '',
        ua: '',
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
                        } catch (e) {}
                    } else {
                        headers.push([k, val]);
                    }
                } else {
                    headers.push([k, val]);
                }
            }
            i++;
        } else if (t === '-G' || t === '--get') {
            useGetFlag = true;
            i++;
        } else if (t === '-d' || t === '--data' || t === '--data-raw' || t === '--data-binary' || t === '--data-urlencode') {
            let v = tokens[++i] || '';
            if (t === '--data-urlencode') {
                try {
                    v = decodeURIComponent(v);
                } catch (e) {}
            }
            if (useGetFlag) {
                v.split('&').forEach(function (seg) {
                    const eq = seg.indexOf('=');
                    if (eq > 0) queries.push([seg.slice(0, eq), seg.slice(eq + 1)]);
                    else if (seg) queries.push([seg, '']);
                });
            } else {
                bodyVal += (bodyVal ? '&' : '') + v;
                hasBodyFlag = true;
                bodyType = t === '--data-urlencode' ? 'form' : 'raw';
            }
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
        } else if (bodyType === 'raw') {
            const trimmed = bodyVal.trim();
            if (
                (trimmed.startsWith('{') || trimmed.startsWith('[')) &&
                (function () {
                    try {
                        JSON.parse(trimmed);
                        return true;
                    } catch (e) {
                        return false;
                    }
                })()
            ) {
                document.getElementById('httpBodyType').value = 'json';
            } else {
                document.getElementById('httpBodyType').value = 'raw';
            }
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
            let buf = '';
            i++;
            while (i < s.length && s[i] !=='\''") {
                if (s[i] === '\\' && i + 1 < s.length && (s[i + 1] ==='\''" || s[i + 1] === '\\')) {
                    buf += s[i + 1];
                    i += 2;
                } else {
                    buf += s[i];
                    i++;
                }
            }
            tokens.push(buf);
            if (i < s.length) i++;
        } else if (s[i] === '"') {
            let buf = '';
            i++;
            while (i < s.length && s[i] !== '"') {
                if (s[i] === '\\' && i + 1 < s.length) {
                    buf += s[i + 1];
                    i += 2;
                } else {
                    buf += s[i];
                    i++;
                }
            }
            tokens.push(buf);
            if (i < s.length) i++;
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
    document.getElementById('httpBody').value = JSON.stringify({ name: '张三', age: 25 }, null, 2);
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
    httpRenderHistory();

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

const _httpHistoryKey = 'httpdebug_history';
const _httpHistoryMax = 50;

function httpSaveHistory(cfg) {
    try {
        const item = {
            id: Date.now(),
            method: cfg.method,
            url: cfg.url,
            headers: cfg.headers,
            body: cfg.body,
            bodyType: cfg.bodyType,
            time: new Date().toLocaleString(),
        };
        let list = JSON.parse(localStorage.getItem(_httpHistoryKey) || '[]');
        list.unshift(item);
        if (list.length > _httpHistoryMax) list = list.slice(0, _httpHistoryMax);
        localStorage.setItem(_httpHistoryKey, JSON.stringify(list));
        httpRenderHistory();
    } catch (e) {
    }
}

function httpLoadHistory() {
    try {
        return JSON.parse(localStorage.getItem(_httpHistoryKey) || '[]');
    } catch (e) {
        return [];
    }
}

function httpRenderHistory() {
    const container = document.getElementById('httpHistoryList');
    if (!container) return;
    const list = httpLoadHistory();
    if (!list.length) {
        container.innerHTML = '<div class="http-history-empty">暂无历史记录</div>';
        return;
    }
    const methodColors = { GET: 'get', POST: 'post', PUT: 'put', DELETE: 'delete', PATCH: 'patch' };
    container.innerHTML = list
        .map((item) => {
            const cls = methodColors[item.method] || 'get';
            const shortUrl = item.url.length > 50 ? item.url.slice(0, 47) + '...' : item.url;
            return (
                '<div class="http-history-item" onclick="httpRestoreHistory(' +
                item.id +
                ')">' +
                '<span class="http-history-method ' +
                cls +
                '">' +
                item.method +
                '</span>' +
                '<span class="http-history-url" title="' +
                escapeHtml(item.url) +
                '">' +
                escapeHtml(shortUrl) +
                '</span>' +
                '<span class="http-history-time">' +
                escapeHtml(item.time || '') +
                '</span>' +
                '<button class="outline sm" onclick="event.stopPropagation();httpDeleteHistory(' +
                item.id +
                ')" title="删除">&#10005;</button>' +
                '</div>'
            );
        })
        .join('');
}

function httpRestoreHistory(id) {
    const list = httpLoadHistory();
    const item = list.find((h) => h.id === id);
    if (!item) return;
    document.getElementById('httpMethod').value = item.method;
    httpMethodChange(document.getElementById('httpMethod'));
    document.getElementById('httpUrl').value = item.url;
    document.getElementById('httpHeadersList').innerHTML = '';
    if (item.headers && item.headers.length) {
        item.headers.forEach(([k, v]) => httpAddHeader(k, v));
    } else {
        httpAddHeader();
    }
    document.getElementById('httpBodyType').value = item.bodyType || 'none';
    httpBodyTypeChange();
    document.getElementById('httpBody').value = item.body || '';
    httpUpdateTabCounts();
    httpSwitchTab(document.querySelector('.http-tabs .api-tab'), 'params');
    toast('已恢复历史请求');
}

function httpDeleteHistory(id) {
    let list = httpLoadHistory();
    list = list.filter((h) => h.id !== id);
    localStorage.setItem(_httpHistoryKey, JSON.stringify(list));
    httpRenderHistory();
    toast('已删除');
}

function httpClearHistory() {
    if (!confirm('确定清空所有历史记录？')) return;
    localStorage.removeItem(_httpHistoryKey);
    httpRenderHistory();
    toast('历史已清空');
}
