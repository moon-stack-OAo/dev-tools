// JWT 验签：HS256/HS384/HS512（纯 JS HMAC-SHA256 + Node/WebCrypto 兜底）与时间声明校验
// RS256/RS384/RS512 浏览器 Web Crypto 异步验签

// ---------- Base64URL ----------
function jwtvPadBase64Url(s) {
    const pad = s.length % 4;
    if (pad === 0) return s;
    return s + '='.repeat(4 - pad);
}

function jwtvB64UrlToBytes(seg) {
    const b64 = jwtvPadBase64Url(String(seg).replace(/-/g, '+').replace(/_/g, '/'));
    if (typeof atob === 'function') {
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return bytes;
    }
    return new Uint8Array(Buffer.from(b64, 'base64'));
}

function jwtvB64UrlToString(seg) {
    const bytes = jwtvB64UrlToBytes(seg);
    if (typeof TextDecoder !== 'undefined') {
        return new TextDecoder().decode(bytes);
    }
    return Buffer.from(bytes).toString('utf8');
}

function jwtvBytesToB64Url(bytes) {
    const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let bin = '';
    for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
    let b64;
    if (typeof btoa === 'function') {
        b64 = btoa(bin);
    } else {
        b64 = Buffer.from(arr).toString('base64');
    }
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function jwtvStrToBytes(str) {
    if (typeof TextEncoder !== 'undefined') {
        return new TextEncoder().encode(str == null ? '' : String(str));
    }
    return new Uint8Array(Buffer.from(str == null ? '' : String(str), 'utf8'));
}

// ---------- 纯 JS SHA-256（RFC 6234）----------
function jwtvRotr(n, b) {
    return (n >>> b) | (n << (32 - b));
}

function jwtvSha256(bytes) {
    const K = new Uint32Array([
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ]);
    const H = new Uint32Array([
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ]);
    const len = bytes.length;
    const bitLenHi = Math.floor(len / 0x20000000);
    const bitLenLo = (len << 3) >>> 0;
    const zeros = (56 - ((len + 1) % 64) + 64) % 64;
    const padded = new Uint8Array(len + 1 + zeros + 8);
    padded.set(bytes);
    padded[len] = 0x80;
    const dv = new DataView(padded.buffer);
    dv.setUint32(padded.length - 8, bitLenHi, false);
    dv.setUint32(padded.length - 4, bitLenLo, false);

    const w = new Uint32Array(64);
    for (let i = 0; i < padded.length; i += 64) {
        for (let j = 0; j < 16; j++) w[j] = dv.getUint32(i + j * 4, false);
        for (let j = 16; j < 64; j++) {
            const s0 = jwtvRotr(w[j - 15], 7) ^ jwtvRotr(w[j - 15], 18) ^ (w[j - 15] >>> 3);
            const s1 = jwtvRotr(w[j - 2], 17) ^ jwtvRotr(w[j - 2], 19) ^ (w[j - 2] >>> 10);
            w[j] = (w[j - 16] + s0 + w[j - 7] + s1) >>> 0;
        }
        let a = H[0],
            b = H[1],
            c = H[2],
            d = H[3],
            e = H[4],
            f = H[5],
            g = H[6],
            h = H[7];
        for (let j = 0; j < 64; j++) {
            const S1 = jwtvRotr(e, 6) ^ jwtvRotr(e, 11) ^ jwtvRotr(e, 25);
            const ch = (e & f) ^ (~e & g);
            const t1 = (h + S1 + ch + K[j] + w[j]) >>> 0;
            const S0 = jwtvRotr(a, 2) ^ jwtvRotr(a, 13) ^ jwtvRotr(a, 22);
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const t2 = (S0 + maj) >>> 0;
            h = g;
            g = f;
            f = e;
            e = (d + t1) >>> 0;
            d = c;
            c = b;
            b = a;
            a = (t1 + t2) >>> 0;
        }
        H[0] = (H[0] + a) >>> 0;
        H[1] = (H[1] + b) >>> 0;
        H[2] = (H[2] + c) >>> 0;
        H[3] = (H[3] + d) >>> 0;
        H[4] = (H[4] + e) >>> 0;
        H[5] = (H[5] + f) >>> 0;
        H[6] = (H[6] + g) >>> 0;
        H[7] = (H[7] + h) >>> 0;
    }
    const out = new Uint8Array(32);
    const odv = new DataView(out.buffer);
    for (let i = 0; i < 8; i++) odv.setUint32(i * 4, H[i], false);
    return out;
}

function jwtvHmacSha256(keyBytes, dataBytes) {
    const block = 64;
    let key = keyBytes instanceof Uint8Array ? keyBytes : new Uint8Array(keyBytes);
    if (key.length > block) key = jwtvSha256(key);
    const padded = new Uint8Array(block);
    padded.set(key);
    const oKey = new Uint8Array(block);
    const iKey = new Uint8Array(block);
    for (let i = 0; i < block; i++) {
        oKey[i] = padded[i] ^ 0x5c;
        iKey[i] = padded[i] ^ 0x36;
    }
    const inner = new Uint8Array(block + dataBytes.length);
    inner.set(iKey);
    inner.set(dataBytes, block);
    const innerHash = jwtvSha256(inner);
    const outer = new Uint8Array(block + 32);
    outer.set(oKey);
    outer.set(innerHash, block);
    return jwtvSha256(outer);
}

function jwtvTimingSafeEqual(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
}

/**
 * 解析 JWT 三段
 * @param {string} token
 * @returns {{ ok: boolean, header?: object, payload?: object, parts?: string[], signingInput?: string, msg: string }}
 */
function jwtVerifyParse(token) {
    if (token == null || !String(token).trim()) {
        return { ok: false, msg: '请输入 JWT Token' };
    }
    const raw = String(token).trim();
    const parts = raw.split('.');
    if (parts.length !== 3) {
        return { ok: false, msg: '无效的 JWT 格式（需要 3 段 header.payload.signature）' };
    }
    try {
        const header = JSON.parse(jwtvB64UrlToString(parts[0]));
        const payload = JSON.parse(jwtvB64UrlToString(parts[1]));
        return {
            ok: true,
            header: header,
            payload: payload,
            parts: parts,
            signingInput: parts[0] + '.' + parts[1],
            msg: '解析成功',
        };
    } catch (e) {
        return { ok: false, msg: 'JWT 解码失败: ' + (e && e.message ? e.message : String(e)) };
    }
}

/**
 * 校验时间声明 exp / nbf / iat
 * @param {object} payload
 * @param {{ clockSkew?: number, now?: number }} [options]
 * @returns {string[]} errors
 */
function jwtVerifyClaims(payload, options) {
    options = options || {};
    const skew = options.clockSkew != null ? Number(options.clockSkew) : 60;
    const now = options.now != null ? Number(options.now) : Math.floor(Date.now() / 1000);
    const errors = [];
    if (payload == null || typeof payload !== 'object') return errors;
    if (typeof payload.exp === 'number') {
        if (now > payload.exp + skew) {
            errors.push('Token 已过期 (exp=' + payload.exp + ', now=' + now + ')');
        }
    }
    if (typeof payload.nbf === 'number') {
        if (now + skew < payload.nbf) {
            errors.push('Token 尚未生效 (nbf=' + payload.nbf + ', now=' + now + ')');
        }
    }
    if (typeof payload.iat === 'number') {
        if (payload.iat > now + skew) {
            errors.push('签发时间在未来 (iat=' + payload.iat + ', now=' + now + ')');
        }
    }
    return errors;
}

/**
 * HMAC 同步验签（优先纯 JS HS256；HS384/HS512 需 Node crypto 或调用异步版）
 * @param {string} token
 * @param {string} secret
 * @param {{ clockSkew?: number, now?: number }} [options]
 * @returns {{ ok: boolean, valid: boolean, header: object|null, payload: object|null, errors: string[], msg: string }}
 */
function jwtVerifyHmac(token, secret, options) {
    options = options || {};
    const empty = { ok: false, valid: false, header: null, payload: null, errors: [], msg: '' };
    const parsed = jwtVerifyParse(token);
    if (!parsed.ok) {
        return Object.assign({}, empty, { errors: [parsed.msg], msg: parsed.msg });
    }
    const header = parsed.header;
    const payload = parsed.payload;
    const alg = (header && header.alg) || '';
    const errors = [];

    if (!secret && secret !== '') {
        errors.push('请输入密钥');
        return { ok: false, valid: false, header: header, payload: payload, errors: errors, msg: errors.join('; ') };
    }

    if (alg !== 'HS256' && alg !== 'HS384' && alg !== 'HS512') {
        errors.push('同步验签仅支持 HS256/HS384/HS512，当前 alg=' + alg);
        return { ok: false, valid: false, header: header, payload: payload, errors: errors, msg: errors.join('; ') };
    }

    let sigOk = false;
    try {
        const dataBytes = jwtvStrToBytes(parsed.signingInput);
        const keyBytes = jwtvStrToBytes(secret);
        let mac;
        if (alg === 'HS256') {
            mac = jwtvHmacSha256(keyBytes, dataBytes);
        } else {
            // Node 测试环境兜底
            const nodeCrypto = typeof require === 'function' ? require('crypto') : null;
            if (!nodeCrypto) {
                errors.push(alg + ' 需异步验签（Web Crypto）或 Node crypto');
                return {
                    ok: false,
                    valid: false,
                    header: header,
                    payload: payload,
                    errors: errors,
                    msg: errors.join('; '),
                };
            }
            const hashName = alg === 'HS384' ? 'sha384' : 'sha512';
            mac = new Uint8Array(
                nodeCrypto.createHmac(hashName, Buffer.from(keyBytes)).update(Buffer.from(dataBytes)).digest(),
            );
        }
        const expected = jwtvBytesToB64Url(mac);
        const actual = parsed.parts[2];
        sigOk = expected === actual || jwtvTimingSafeEqual(jwtvB64UrlToBytes(expected), jwtvB64UrlToBytes(actual));
        if (!sigOk) errors.push('签名无效（密钥错误或 Token 被篡改）');
    } catch (e) {
        errors.push('验签失败: ' + (e && e.message ? e.message : String(e)));
        sigOk = false;
    }

    const claimErrors = jwtVerifyClaims(payload, options);
    claimErrors.forEach(function (e) {
        errors.push(e);
    });

    const valid = sigOk && claimErrors.length === 0;
    return {
        ok: true,
        valid: valid,
        header: header,
        payload: payload,
        errors: errors,
        msg: valid ? '验签通过' : errors.join('; ') || '验签失败',
    };
}

/**
 * 异步验签：HS + RS（Web Crypto / Node）
 * @param {string} token
 * @param {string} key
 * @param {{ clockSkew?: number, now?: number }} [options]
 * @returns {Promise<{ ok: boolean, valid: boolean, header: object|null, payload: object|null, errors: string[], msg: string }>}
 */
async function jwtVerify(token, key, options) {
    options = options || {};
    const empty = { ok: false, valid: false, header: null, payload: null, errors: [], msg: '' };
    const parsed = jwtVerifyParse(token);
    if (!parsed.ok) {
        return Object.assign({}, empty, { errors: [parsed.msg], msg: parsed.msg });
    }
    const header = parsed.header;
    const payload = parsed.payload;
    const alg = (header && header.alg) || '';
    const errors = [];

    if (key == null || String(key) === '') {
        errors.push('请输入密钥或公钥');
        return { ok: false, valid: false, header: header, payload: payload, errors: errors, msg: errors.join('; ') };
    }

    let sigOk = false;
    try {
        if (alg === 'HS256' || alg === 'HS384' || alg === 'HS512') {
            if (alg === 'HS256') {
                const r = jwtVerifyHmac(token, key, options);
                // 重新计算 claims 外的签名结果
                return r;
            }
            const dataBytes = jwtvStrToBytes(parsed.signingInput);
            const keyBytes = jwtvStrToBytes(key);
            let mac;
            if (typeof crypto !== 'undefined' && crypto.subtle) {
                const hashMap = { HS384: 'SHA-384', HS512: 'SHA-512' };
                const cryptoKey = await crypto.subtle.importKey(
                    'raw',
                    keyBytes,
                    { name: 'HMAC', hash: hashMap[alg] },
                    false,
                    ['sign'],
                );
                mac = new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, dataBytes));
            } else if (typeof require === 'function') {
                const nodeCrypto = require('crypto');
                const hashName = alg === 'HS384' ? 'sha384' : 'sha512';
                mac = new Uint8Array(
                    nodeCrypto.createHmac(hashName, Buffer.from(keyBytes)).update(Buffer.from(dataBytes)).digest(),
                );
            } else {
                errors.push('当前环境不支持 ' + alg);
                return {
                    ok: false,
                    valid: false,
                    header: header,
                    payload: payload,
                    errors: errors,
                    msg: errors.join('; '),
                };
            }
            const expected = jwtvBytesToB64Url(mac);
            sigOk = expected === parsed.parts[2];
            if (!sigOk) errors.push('签名无效（密钥错误或 Token 被篡改）');
        } else if (alg === 'RS256' || alg === 'RS384' || alg === 'RS512') {
            if (typeof crypto === 'undefined' || !crypto.subtle) {
                errors.push('RS 算法需要 Web Crypto API（浏览器环境）');
                return {
                    ok: false,
                    valid: false,
                    header: header,
                    payload: payload,
                    errors: errors,
                    msg: errors.join('; '),
                };
            }
            const hashMap = { RS256: 'SHA-256', RS384: 'SHA-384', RS512: 'SHA-512' };
            const pem = String(key).trim();
            const lines = pem
                .split(/\r?\n/)
                .filter(function (l) {
                    return l && !l.startsWith('-----');
                });
            const b64 = jwtvPadBase64Url(lines.join('').replace(/\s+/g, ''));
            let keyData;
            if (typeof atob === 'function') {
                const bin = atob(b64);
                keyData = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) keyData[i] = bin.charCodeAt(i);
            } else {
                keyData = new Uint8Array(Buffer.from(b64, 'base64'));
            }
            let cryptoKey;
            try {
                cryptoKey = await crypto.subtle.importKey(
                    'spki',
                    keyData.buffer,
                    { name: 'RSASSA-PKCS1-v1_5', hash: hashMap[alg] },
                    false,
                    ['verify'],
                );
            } catch (e1) {
                // 尝试 PKCS#1 RSAPublicKey 包装失败时给出提示
                errors.push('RSA 公钥导入失败，请使用 SPKI PEM（BEGIN PUBLIC KEY）: ' + e1.message);
                return {
                    ok: false,
                    valid: false,
                    header: header,
                    payload: payload,
                    errors: errors,
                    msg: errors.join('; '),
                };
            }
            const dataBytes = jwtvStrToBytes(parsed.signingInput);
            const sigBytes = jwtvB64UrlToBytes(parsed.parts[2]);
            sigOk = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, sigBytes, dataBytes);
            if (!sigOk) errors.push('签名无效（公钥不匹配或 Token 被篡改）');
        } else {
            errors.push('不支持的算法: ' + alg + '（支持 HS256/384/512、RS256/384/512）');
            return {
                ok: false,
                valid: false,
                header: header,
                payload: payload,
                errors: errors,
                msg: errors.join('; '),
            };
        }
    } catch (e) {
        errors.push('验签失败: ' + (e && e.message ? e.message : String(e)));
        sigOk = false;
    }

    const claimErrors = jwtVerifyClaims(payload, options);
    claimErrors.forEach(function (e) {
        errors.push(e);
    });
    const valid = sigOk && claimErrors.length === 0;
    return {
        ok: true,
        valid: valid,
        header: header,
        payload: payload,
        errors: errors,
        msg: valid ? '验签通过' : errors.join('; ') || '验签失败',
    };
}

// ---------- UI ----------
const JWTV_SAMPLE_TOKEN =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.XbPfbIHMI6arZ3Y922BhjWgQzWXcXNrz0ogtVhfEd2o';
const JWTV_SAMPLE_SECRET = 'secret';

function jwtvFormatResult(result) {
    const lines = [];
    lines.push('valid: ' + (result.valid ? 'true' : 'false'));
    lines.push('msg: ' + (result.msg || ''));
    if (result.header) {
        lines.push('');
        lines.push('// Header');
        lines.push(JSON.stringify(result.header, null, 2));
    }
    if (result.payload) {
        lines.push('');
        lines.push('// Payload (claims)');
        lines.push(JSON.stringify(result.payload, null, 2));
        if (typeof result.payload.exp === 'number') {
            lines.push('// exp → ' + new Date(result.payload.exp * 1000).toISOString());
        }
        if (typeof result.payload.nbf === 'number') {
            lines.push('// nbf → ' + new Date(result.payload.nbf * 1000).toISOString());
        }
        if (typeof result.payload.iat === 'number') {
            lines.push('// iat → ' + new Date(result.payload.iat * 1000).toISOString());
        }
    }
    if (result.errors && result.errors.length) {
        lines.push('');
        lines.push('// Errors');
        result.errors.forEach(function (e) {
            lines.push('- ' + e);
        });
    }
    return lines.join('\n');
}

async function jwtverifyRun() {
    const tokenEl = document.getElementById('jwtvToken');
    const keyEl = document.getElementById('jwtvKey');
    const skewEl = document.getElementById('jwtvSkew');
    const out = document.getElementById('jwtvOutput');
    if (!tokenEl || !keyEl || !out) return;
    const token = tokenEl.value;
    const key = keyEl.value;
    const skew = skewEl ? parseInt(skewEl.value, 10) : 60;
    const options = { clockSkew: Number.isFinite(skew) ? skew : 60 };
    try {
        const result = await jwtVerify(token, key, options);
        out.textContent = jwtvFormatResult(result);
        out.className = 'output-box' + (result.valid ? '' : ' error');
        if (typeof setStatus === 'function') setStatus(result.msg);
    } catch (e) {
        out.textContent = '验签异常: ' + e.message;
        out.className = 'output-box error';
    }
}

function jwtverifyLoadSample() {
    const tokenEl = document.getElementById('jwtvToken');
    const keyEl = document.getElementById('jwtvKey');
    if (tokenEl) tokenEl.value = JWTV_SAMPLE_TOKEN;
    if (keyEl) keyEl.value = JWTV_SAMPLE_SECRET;
    jwtverifyRun();
}

function jwtverifyClear() {
    const tokenEl = document.getElementById('jwtvToken');
    const keyEl = document.getElementById('jwtvKey');
    const out = document.getElementById('jwtvOutput');
    if (tokenEl) tokenEl.value = '';
    if (keyEl) keyEl.value = '';
    if (out) {
        out.textContent = '';
        out.className = 'output-box';
    }
    if (typeof setStatus === 'function') setStatus('已清空');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        jwtVerifyParse: jwtVerifyParse,
        jwtVerifyHmac: jwtVerifyHmac,
        jwtVerify: jwtVerify,
        jwtVerifyClaims: jwtVerifyClaims,
        jwtvHmacSha256: jwtvHmacSha256,
        jwtvSha256: jwtvSha256,
        jwtvBytesToB64Url: jwtvBytesToB64Url,
        jwtvB64UrlToBytes: jwtvB64UrlToBytes,
        jwtvPadBase64Url: jwtvPadBase64Url,
    };
}
