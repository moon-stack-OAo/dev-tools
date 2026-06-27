// JWT 生成 / 签名工具
// 支持 HS256/HS384/HS512 (HMAC) 与 RS256/RS384/RS512 (RSA)

function b64urlEncode(bytes) {
    let str = '';
    const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    for (let i = 0; i < arr.length; i++) str += String.fromCharCode(arr[i]);
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function b64urlEncodeString(str) {
    return b64urlEncode(new TextEncoder().encode(str));
}

function pemToArrayBuffer(pem) {
    const lines = pem
        .trim()
        .split(/\r?\n/)
        .filter((l) => l && !l.startsWith('-----'));
    const b64 = lines.join('');
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
}

function isPem(text) {
    return text && /-----BEGIN [A-Z ]+-----/.test(text);
}

let jwtGenDefaultsLoaded = false;

function jwtGenInit() {
    if (jwtGenDefaultsLoaded) return;
    jwtGenDefaultsLoaded = true;
    const headerEl = document.getElementById('jwtgenHeader');
    const payloadEl = document.getElementById('jwtgenPayload');
    const now = Math.floor(Date.now() / 1000);
    headerEl.value = JSON.stringify({ alg: 'HS256', typ: 'JWT' }, null, 2);
    payloadEl.value = JSON.stringify(
        {
            sub: 'user123',
            iat: now,
            exp: now + 3600,
        },
        null,
        2
    );
    updateJwtExpStatus();
}

function updateJwtExpStatus() {
    const payloadEl = document.getElementById('jwtgenPayload');
    const statusEl = document.getElementById('jwtgenStatus');
    try {
        const p = JSON.parse(payloadEl.value || '{}');
        if (typeof p.exp === 'number') {
            const e = new Date(p.exp * 1000);
            const expired = e < new Date();
            statusEl.textContent = `exp = ${e.toISOString()}  ${expired ? '已过期' : '有效'}`;
            statusEl.style.color = expired ? 'var(--danger)' : 'var(--accent)';
        } else {
            statusEl.textContent = '(无 exp 字段)';
            statusEl.style.color = 'var(--text-muted)';
        }
    } catch (e) {
        statusEl.textContent = '';
    }
}

function jwtGenAddField(name, value) {
    const payloadEl = document.getElementById('jwtgenPayload');
    let p;
    try {
        p = JSON.parse(payloadEl.value || '{}');
    } catch (e) {
        toast('Payload 不是合法 JSON');
        return;
    }
    p[name] = value;
    payloadEl.value = JSON.stringify(p, null, 2);
    updateJwtExpStatus();
}

function jwtGenAddNow(field) {
    if (field === 'iat' || field === 'nbf') {
        jwtGenAddField(field, Math.floor(Date.now() / 1000));
    } else if (field === 'exp') {
        try {
            const p = JSON.parse(document.getElementById('jwtgenPayload').value || '{}');
            const base = typeof p.iat === 'number' ? p.iat : Math.floor(Date.now() / 1000);
            jwtGenAddField('exp', base + 3600);
        } catch (e) {
            jwtGenAddField('exp', Math.floor(Date.now() / 1000) + 3600);
        }
    } else if (field === 'jti') {
        const arr = new Uint8Array(16);
        crypto.getRandomValues(arr);
        const hex = Array.from(arr)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
        jwtGenAddField('jti', hex);
    }
}

async function jwtGenGenerate() {
    const algo = document.getElementById('jwtgenAlgo').value;
    const headerStr = document.getElementById('jwtgenHeader').value.trim();
    const payloadStr = document.getElementById('jwtgenPayload').value.trim();
    const secret = document.getElementById('jwtgenSecret').value;
    const out = document.getElementById('jwtgenOutput');

    let header, payload;
    try {
        header = JSON.parse(headerStr);
    } catch (e) {
        out.textContent = 'Header JSON 解析失败: ' + e.message;
        out.className = 'output-box error';
        return;
    }
    try {
        payload = JSON.parse(payloadStr);
    } catch (e) {
        out.textContent = 'Payload JSON 解析失败: ' + e.message;
        out.className = 'output-box error';
        return;
    }
    if (!secret) {
        out.textContent = '请输入密钥';
        out.className = 'output-box error';
        return;
    }

    try {
        const enc = new TextEncoder();
        const headerB64 = b64urlEncodeString(JSON.stringify(header));
        const payloadB64 = b64urlEncodeString(JSON.stringify(payload));
        const signingInput = headerB64 + '.' + payloadB64;
        const data = enc.encode(signingInput);
        let signature;

        if (algo.startsWith('HS')) {
            const hashMap = { HS256: 'SHA-256', HS384: 'SHA-384', HS512: 'SHA-512' };
            const hashName = hashMap[algo];
            const key = await crypto.subtle.importKey(
                'raw',
                enc.encode(secret),
                { name: 'HMAC', hash: hashName },
                false,
                ['sign']
            );
            const sig = await crypto.subtle.sign('HMAC', key, data);
            signature = b64urlEncode(sig);
        } else if (algo.startsWith('RS')) {
            const hashMap = { RS256: 'SHA-256', RS384: 'SHA-384', RS512: 'SHA-512' };
            const hashName = hashMap[algo];
            let keyData;
            if (isPem(secret)) {
                keyData = pemToArrayBuffer(secret);
            } else {
                const cleaned = secret.replace(/\s+/g, '');
                try {
                    keyData = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0)).buffer;
                } catch (e) {
                    out.textContent = '私钥格式错误：需为 PEM 或 Base64';
                    out.className = 'output-box error';
                    return;
                }
            }
            const key = await crypto.subtle.importKey(
                'pkcs8',
                keyData,
                { name: 'RSASSA-PKCS1-v1_5', hash: hashName },
                false,
                ['sign']
            );
            const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, data);
            signature = b64urlEncode(sig);
        } else {
            out.textContent = '不支持的算法: ' + algo;
            out.className = 'output-box error';
            return;
        }

        const token = signingInput + '.' + signature;
        out.textContent = token;
        out.className = 'output-box';
        updateJwtExpStatus();
        setStatus('JWT 已生成 (' + algo + ')');
    } catch (e) {
        out.textContent = '生成失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function jwtGenClear() {
    document.getElementById('jwtgenHeader').value = '';
    document.getElementById('jwtgenPayload').value = '';
    document.getElementById('jwtgenSecret').value = '';
    document.getElementById('jwtgenOutput').textContent = '';
    document.getElementById('jwtgenStatus').textContent = '';
    setStatus('已清空');
}

registerInit('jwtgen', jwtGenInit);
