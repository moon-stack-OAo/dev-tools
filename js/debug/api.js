function apiMethodChange(el) {
    const v = el.value;
    el.className = 'method-' + v;
}

function apiSwitchTab(tab, name) {
    document.querySelectorAll('.api-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.api-tab-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('api-' + name + '-panel').classList.add('active');
}

function apiAddHeader(key, val) {
    const container = document.getElementById('apiHeadersList');
    const row = document.createElement('div');
    row.className = 'api-kv-row';
    const k = key || '';
    const v = val || '';
    row.innerHTML = `<input type="text" placeholder="Header 名称" value="${k.replace(/"/g, '&quot;')}"><input type="text" placeholder="Header 值" value="${v.replace(/"/g, '&quot;')}"><button class="outline sm" onclick="this.parentElement.remove()" title="删除">&#10005;</button>`;
    container.appendChild(row);
}

function apiCollectHeaders() {
    const headers = {};
    document.querySelectorAll('#apiHeadersList .api-kv-row').forEach(row => {
        const inputs = row.querySelectorAll('input');
        const key = inputs[0].value.trim();
        const val = inputs[1].value.trim();
        if (key) headers[key] = val;
    });
    const authHeaders = apiCollectAuth();
    Object.assign(headers, authHeaders);
    return headers;
}

function apiAuthChange() {
    const type = document.getElementById('apiAuthType').value;
    const container = document.getElementById('apiAuthFields');
    container.innerHTML = '';
    if (type === 'none') {
        container.innerHTML = '<div class="api-auth-hint">无需认证</div>';
    } else if (type === 'bearer') {
        container.innerHTML = `
      <div class="api-kv-row"><input type="text" placeholder="Token" id="apiAuthBearer"></div>
      <div class="api-auth-hint">将添加 Header: Authorization: Bearer &lt;token&gt;</div>`;
    } else if (type === 'basic') {
        container.innerHTML = `
      <div class="api-kv-row"><input type="text" placeholder="Username" id="apiAuthUser"></div>
      <div class="api-kv-row"><input type="password" placeholder="Password" id="apiAuthPass"></div>
      <div class="api-auth-hint">将添加 Header: Authorization: Basic &lt;base64&gt;</div>`;
    } else if (type === 'apikey') {
        container.innerHTML = `
      <div class="api-kv-row"><input type="text" placeholder="Header 名称" id="apiAuthKeyName" value="X-API-Key"></div>
      <div class="api-kv-row"><input type="text" placeholder="API Key 值" id="apiAuthKeyVal"></div>
      <div class="api-auth-hint">将添加自定义 Header</div>`;
    }
}

function apiCollectAuth() {
    const type = document.getElementById('apiAuthType').value;
    if (type === 'none') return {};
    if (type === 'bearer') {
        const token = document.getElementById('apiAuthBearer')?.value?.trim();
        return token ? {Authorization: 'Bearer ' + token} : {};
    }
    if (type === 'basic') {
        const user = document.getElementById('apiAuthUser')?.value?.trim();
        const pass = document.getElementById('apiAuthPass')?.value?.trim();
        if (user && pass) {
            const encoded = btoa(unescape(encodeURIComponent(user + ':' + pass)));
            return {Authorization: 'Basic ' + encoded};
        }
        return {};
    }
    if (type === 'apikey') {
        const name = document.getElementById('apiAuthKeyName')?.value?.trim();
        const val = document.getElementById('apiAuthKeyVal')?.value?.trim();
        return name && val ? {[name]: val} : {};
    }
    return {};
}

function apiSend() {
    const method = document.getElementById('apiMethod').value;
    const url = document.getElementById('apiUrl').value.trim();
    const headers = apiCollectHeaders();
    const bodyRaw = document.getElementById('apiBody').value.trim();
    if (!url) {
        toast('请输入 URL');
        return;
    }
    const opts = {method, headers};
    if (bodyRaw && ['POST', 'PUT', 'PATCH'].includes(method)) {
        opts.body = bodyRaw;
        if (!headers['Content-Type']) {
            const ct = document.getElementById('apiBodyType').value;
            opts.headers['Content-Type'] = ct;
        }
    }
    const respEl = document.getElementById('apiResponse'), statusEl = document.getElementById('apiStatus'),
        metaEl = document.getElementById('apiMeta'), bodyEl = document.getElementById('apiBodyOutput');
    respEl.style.display = 'block';
    statusEl.textContent = '请求中...';
    statusEl.className = 'resp-status';
    metaEl.textContent = '';
    bodyEl.textContent = '';
    setStatus('API 请求中...');
    const start = performance.now();
    fetch(url, opts).then(async resp => {
        const elapsed = ((performance.now() - start) / 1000).toFixed(2);
        const code = resp.status;
        const cls = code < 300 ? 'status-2xx' : code < 400 ? 'status-3xx' : code < 500 ? 'status-4xx' : 'status-5xx';
        statusEl.textContent = code + ' ' + resp.statusText;
        statusEl.className = 'resp-status ' + cls;
        const text = await resp.text();
        metaEl.textContent = elapsed + 's  |  ' + (text.length) + ' bytes';
        try {
            bodyEl.textContent = JSON.stringify(JSON.parse(text), null, 2);
        } catch (e) {
            bodyEl.textContent = text;
        }
        setStatus('API 请求完成 (' + resp.status + ')');
    }).catch(err => {
        statusEl.textContent = '错误';
        statusEl.className = 'resp-status status-5xx';
        metaEl.textContent = '';
        bodyEl.textContent = '请求失败: ' + err.message;
        setStatus('API 请求失败');
    });
}

function apiClear() {
    document.getElementById('apiUrl').value = '';
    document.getElementById('apiBody').value = '';
    document.getElementById('apiHeadersList').innerHTML = '';
    apiAddHeader('Content-Type', 'application/json');
    document.getElementById('apiResponse').style.display = 'none';
    document.getElementById('apiMethod').value = 'GET';
    apiMethodChange(document.getElementById('apiMethod'));
    setStatus('已重置');
}

function apiInit() {
    if (!document.getElementById('apiHeadersList')) return;
    if (!document.querySelector('#apiHeadersList .api-kv-row')) {
        apiAddHeader('Content-Type', 'application/json');
    }
    apiAuthChange();
}

registerInit('api', apiInit);
