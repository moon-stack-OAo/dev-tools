// OAuth2 PKCE：code_verifier / code_challenge(S256) / authorize URL

/**
 * Base64URL（无 padding）
 * @param {ArrayBuffer|Uint8Array} buf
 * @returns {string}
 */
function pkceBase64Url(buf) {
    const arr = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < arr.length; i += chunk) {
        bin += String.fromCharCode.apply(null, arr.subarray(i, i + chunk));
    }
    let b64;
    if (typeof btoa === 'function') {
        b64 = btoa(bin);
    } else {
        b64 = Buffer.from(arr).toString('base64');
    }
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

/**
 * 安全随机字节
 * @param {number} len
 * @returns {Uint8Array}
 */
function pkceRandomBytes(len) {
    const out = new Uint8Array(len);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(out);
        return out;
    }
    const nodeCrypto = require('crypto');
    return new Uint8Array(nodeCrypto.randomBytes(len));
}

/**
 * SHA-256
 * @param {string} text
 * @returns {Promise<Uint8Array>}
 */
async function pkceSha256(text) {
    const data = new TextEncoder().encode(text);
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        const dig = await crypto.subtle.digest('SHA-256', data);
        return new Uint8Array(dig);
    }
    const nodeCrypto = require('crypto');
    return new Uint8Array(nodeCrypto.createHash('sha256').update(text, 'utf8').digest());
}

/**
 * 生成 PKCE 对
 * @param {object} [options]
 * @param {number} [options.verifierLength=64] 43–128
 * @param {string} [options.verifier] 固定 verifier（测试用）
 * @returns {Promise<{code_verifier:string, code_challenge:string, code_challenge_method:string}>}
 */
async function generatePkce(options) {
    options = options || {};
    let verifier = options.verifier;
    if (!verifier) {
        let len = options.verifierLength == null ? 64 : Number(options.verifierLength);
        if (!isFinite(len)) len = 64;
        if (len < 43) len = 43;
        if (len > 128) len = 128;
        // 用 base64url 随机，保证 [A-Za-z0-9-._~]
        const bytes = pkceRandomBytes(Math.ceil((len * 3) / 4) + 4);
        verifier = pkceBase64Url(bytes).slice(0, len);
        // 若不够长再补
        while (verifier.length < len) {
            verifier += pkceBase64Url(pkceRandomBytes(32));
            verifier = verifier.slice(0, len);
        }
    }
    if (verifier.length < 43 || verifier.length > 128) {
        throw new Error('code_verifier 长度须为 43–128');
    }
    if (!/^[A-Za-z0-9\-._~]+$/.test(verifier)) {
        throw new Error('code_verifier 含非法字符');
    }
    const hash = await pkceSha256(verifier);
    const challenge = pkceBase64Url(hash);
    return {
        code_verifier: verifier,
        code_challenge: challenge,
        code_challenge_method: 'S256',
    };
}

/**
 * 构造授权 URL
 * @param {object} params
 * @param {string} params.authorizeUrl
 * @param {string} params.clientId
 * @param {string} params.redirectUri
 * @param {string} [params.scope]
 * @param {string} [params.state]
 * @param {string} params.codeChallenge
 * @param {string} [params.codeChallengeMethod='S256']
 * @param {object} [params.extra] 额外 query
 * @returns {string}
 */
function buildAuthorizeUrl(params) {
    params = params || {};
    const base = String(params.authorizeUrl || '').trim();
    if (!base) throw new Error('缺少 authorizeUrl');
    const clientId = params.clientId;
    if (clientId == null || clientId === '') throw new Error('缺少 client_id');
    const redirectUri = params.redirectUri;
    if (redirectUri == null || redirectUri === '') throw new Error('缺少 redirect_uri');
    const challenge = params.codeChallenge;
    if (challenge == null || challenge === '') throw new Error('缺少 code_challenge');

    const q = [];
    function add(k, v) {
        if (v === undefined || v === null || v === '') return;
        q.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(v)));
    }
    add('response_type', params.responseType || 'code');
    add('client_id', clientId);
    add('redirect_uri', redirectUri);
    add('scope', params.scope);
    add('state', params.state);
    add('code_challenge', challenge);
    add('code_challenge_method', params.codeChallengeMethod || 'S256');
    if (params.extra && typeof params.extra === 'object') {
        Object.keys(params.extra).forEach(function (k) {
            add(k, params.extra[k]);
        });
    }

    const sep = base.indexOf('?') >= 0 ? '&' : '?';
    return base + sep + q.join('&');
}

/**
 * Token 请求参数说明（不实际发请求）
 * @param {object} params
 * @returns {{url:string, method:string, headers:object, body:string, form:object}}
 */
function buildTokenRequestHint(params) {
    params = params || {};
    const form = {
        grant_type: 'authorization_code',
        code: params.code || '<authorization_code>',
        redirect_uri: params.redirectUri || '<redirect_uri>',
        client_id: params.clientId || '<client_id>',
        code_verifier: params.codeVerifier || '<code_verifier>',
    };
    if (params.clientSecret) {
        form.client_secret = params.clientSecret;
    }
    const body = Object.keys(form)
        .map(function (k) {
            return encodeURIComponent(k) + '=' + encodeURIComponent(form[k]);
        })
        .join('&');
    return {
        url: params.tokenUrl || 'https://auth.example.com/oauth/token',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body,
        form: form,
    };
}

// ========== UI ==========

async function pkceGenerate() {
    const lenEl = document.getElementById('pkceVerifierLen');
    const len = parseInt(lenEl.value, 10) || 64;
    const out = document.getElementById('pkceOutput');
    try {
        const r = await generatePkce({ verifierLength: len });
        document.getElementById('pkceVerifier').value = r.code_verifier;
        document.getElementById('pkceChallenge').value = r.code_challenge;
        out.textContent =
            'code_verifier:\n' +
            r.code_verifier +
            '\n\ncode_challenge (S256):\n' +
            r.code_challenge +
            '\n\ncode_challenge_method: S256';
        out.className = 'output-box';
        setStatus('PKCE 已生成');
    } catch (e) {
        out.textContent = '失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function pkceBuildUrl() {
    const out = document.getElementById('pkceOutput');
    try {
        const url = buildAuthorizeUrl({
            authorizeUrl: document.getElementById('pkceAuthUrl').value,
            clientId: document.getElementById('pkceClientId').value,
            redirectUri: document.getElementById('pkceRedirect').value,
            scope: document.getElementById('pkceScope').value,
            state: document.getElementById('pkceState').value,
            codeChallenge: document.getElementById('pkceChallenge').value,
        });
        document.getElementById('pkceAuthResult').value = url;
        const hint = buildTokenRequestHint({
            tokenUrl: document.getElementById('pkceTokenUrl').value,
            clientId: document.getElementById('pkceClientId').value,
            redirectUri: document.getElementById('pkceRedirect').value,
            codeVerifier: document.getElementById('pkceVerifier').value,
            code: '<从回调 ?code= 获取>',
        });
        out.textContent =
            'Authorize URL:\n' +
            url +
            '\n\n--- Token 请求示例 ---\n' +
            hint.method +
            ' ' +
            hint.url +
            '\nContent-Type: ' +
            hint.headers['Content-Type'] +
            '\n\n' +
            hint.body;
        out.className = 'output-box';
        setStatus('Authorize URL 已构造');
    } catch (e) {
        out.textContent = '失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function pkceClear() {
    ['pkceVerifier', 'pkceChallenge', 'pkceAuthResult', 'pkceClientId', 'pkceRedirect', 'pkceScope', 'pkceState'].forEach(
        function (id) {
            const el = document.getElementById(id);
            if (el) el.value = '';
        },
    );
    document.getElementById('pkceOutput').textContent = '';
    setStatus('已清空');
}

function pkceLoadSample() {
    document.getElementById('pkceAuthUrl').value = 'https://auth.example.com/oauth/authorize';
    document.getElementById('pkceTokenUrl').value = 'https://auth.example.com/oauth/token';
    document.getElementById('pkceClientId').value = 'my-client-id';
    document.getElementById('pkceRedirect').value = 'https://app.example.com/callback';
    document.getElementById('pkceScope').value = 'openid profile';
    document.getElementById('pkceState').value = 'xyz123';
    document.getElementById('pkceVerifierLen').value = '64';
    setStatus('已加载示例，请先生成 PKCE');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generatePkce: generatePkce,
        buildAuthorizeUrl: buildAuthorizeUrl,
        buildTokenRequestHint: buildTokenRequestHint,
        pkceBase64Url: pkceBase64Url,
        pkceSha256: pkceSha256,
    };
}
