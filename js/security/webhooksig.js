// Webhook 签名：HMAC-SHA256 生成 / 校验
// 通用 hex|base64、GitHub sha256=hex、Stripe 风格 t=...,v1=...

/**
 * @param {ArrayBuffer|Uint8Array} buf
 * @returns {string}
 */
function whsBufToHex(buf) {
    return Array.from(new Uint8Array(buf))
        .map(function (b) {
            return b.toString(16).padStart(2, '0');
        })
        .join('');
}

/**
 * @param {ArrayBuffer|Uint8Array} buf
 * @returns {string}
 */
function whsBufToBase64(buf) {
    const arr = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < arr.length; i += chunk) {
        bin += String.fromCharCode.apply(null, arr.subarray(i, i + chunk));
    }
    if (typeof btoa === 'function') {
        return btoa(bin);
    }
    // Node
    return Buffer.from(arr).toString('base64');
}

/**
 * HMAC-SHA256 原始字节
 * @param {string} secret
 * @param {string} payload
 * @returns {Promise<Uint8Array>}
 */
async function whsHmacSha256(secret, payload) {
    const enc = new TextEncoder();
    const keyBytes = enc.encode(secret == null ? '' : String(secret));
    const dataBytes = enc.encode(payload == null ? '' : String(payload));

    if (typeof crypto !== 'undefined' && crypto.subtle) {
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyBytes,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign'],
        );
        const sig = await crypto.subtle.sign('HMAC', cryptoKey, dataBytes);
        return new Uint8Array(sig);
    }

    // Node 测试环境
    const nodeCrypto = require('crypto');
    const mac = nodeCrypto.createHmac('sha256', Buffer.from(keyBytes)).update(Buffer.from(dataBytes)).digest();
    return new Uint8Array(mac);
}

/**
 * 构造待签名字符串
 * @param {string} body
 * @param {object} [opts]
 * @param {string|number} [opts.timestamp] 若提供则 Stripe 风格: timestamp + '.' + body
 * @returns {string}
 */
function whsBuildSignedPayload(body, opts) {
    opts = opts || {};
    const b = body == null ? '' : String(body);
    if (opts.timestamp !== undefined && opts.timestamp !== null && opts.timestamp !== '') {
        return String(opts.timestamp) + '.' + b;
    }
    return b;
}

/**
 * 生成 Webhook 签名
 * @param {string} secret
 * @param {string} body
 * @param {object} [options]
 * @param {'hex'|'base64'|'github'|'stripe'} [options.style='hex']
 * @param {string|number} [options.timestamp] Stripe / 带时间戳时使用
 * @returns {Promise<{signature:string, signedPayload:string, hex:string, base64:string}>}
 */
async function generateWebhookSignature(secret, body, options) {
    options = options || {};
    const style = options.style || 'hex';
    const signedPayload = whsBuildSignedPayload(body, options);
    const raw = await whsHmacSha256(secret, signedPayload);
    const hex = whsBufToHex(raw);
    const base64 = whsBufToBase64(raw);

    let signature;
    if (style === 'github') {
        signature = 'sha256=' + hex;
    } else if (style === 'stripe') {
        const t = options.timestamp !== undefined && options.timestamp !== null ? String(options.timestamp) : '';
        if (!t) {
            throw new Error('Stripe 风格需要 timestamp');
        }
        signature = 't=' + t + ',v1=' + hex;
    } else if (style === 'base64') {
        signature = base64;
    } else {
        signature = hex;
    }

    return {
        signature: signature,
        signedPayload: signedPayload,
        hex: hex,
        base64: base64,
    };
}

/**
 * 常量时间比较（字符串）
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function whsTimingSafeEqual(a, b) {
    const sa = String(a || '');
    const sb = String(b || '');
    if (sa.length !== sb.length) {
        // 仍做一次比较避免简单短路泄露长度（长度不同必 false）
        let x = 0;
        const n = Math.max(sa.length, sb.length);
        for (let i = 0; i < n; i++) {
            x |= (sa.charCodeAt(i) || 0) ^ (sb.charCodeAt(i) || 0);
        }
        return false;
    }
    let diff = 0;
    for (let i = 0; i < sa.length; i++) {
        diff |= sa.charCodeAt(i) ^ sb.charCodeAt(i);
    }
    return diff === 0;
}

/**
 * 从签名头中提取可比较的 hex/base64 列表
 * @param {string} provided
 * @returns {string[]}
 */
function whsNormalizeProvided(provided) {
    const s = String(provided || '').trim();
    if (!s) return [];
    // Stripe: t=...,v1=hex[,v1=hex2]
    if (/^t=\d+/i.test(s) || s.indexOf('v1=') >= 0) {
        const parts = s.split(',');
        const out = [];
        parts.forEach(function (p) {
            const m = p.trim().match(/^v1=(.+)$/i);
            if (m) out.push(m[1].trim().toLowerCase());
        });
        return out;
    }
    // GitHub: sha256=hex
    const gh = s.match(/^sha256=(.+)$/i);
    if (gh) {
        return [gh[1].trim().toLowerCase()];
    }
    // 纯 hex 或 base64
    if (/^[0-9a-fA-F]+$/.test(s) && s.length % 2 === 0) {
        return [s.toLowerCase()];
    }
    return [s];
}

/**
 * 校验 Webhook 签名
 * @param {string} secret
 * @param {string} body
 * @param {string} providedSignature
 * @param {object} [options]
 * @param {string|number} [options.timestamp]
 * @param {'hex'|'base64'|'github'|'stripe'|'auto'} [options.style='auto']
 * @returns {Promise<{valid:boolean, expected:string, hex:string, base64:string, signedPayload:string}>}
 */
async function verifyWebhookSignature(secret, body, providedSignature, options) {
    options = options || {};
    let style = options.style || 'auto';
    const provided = String(providedSignature || '').trim();

    // 自动推断
    if (style === 'auto') {
        if (/^sha256=/i.test(provided)) style = 'github';
        else if (/^t=\d+/i.test(provided) || provided.indexOf('v1=') >= 0) style = 'stripe';
        else if (/^[0-9a-fA-F]{64}$/.test(provided)) style = 'hex';
        else style = 'base64';
    }

    // Stripe 头里的 t 可覆盖 timestamp
    let timestamp = options.timestamp;
    if (style === 'stripe') {
        const tm = provided.match(/(?:^|,)\s*t=(\d+)/i);
        if (tm) timestamp = tm[1];
        if (timestamp === undefined || timestamp === null || timestamp === '') {
            throw new Error('Stripe 风格需要 timestamp');
        }
    }

    const gen = await generateWebhookSignature(secret, body, {
        style: style === 'auto' ? 'hex' : style,
        timestamp: timestamp,
    });

    const candidates = whsNormalizeProvided(provided);
    let valid = false;
    if (style === 'base64') {
        valid = candidates.some(function (c) {
            return whsTimingSafeEqual(c, gen.base64);
        });
    } else {
        valid = candidates.some(function (c) {
            return whsTimingSafeEqual(c.toLowerCase(), gen.hex);
        });
    }

    return {
        valid: valid,
        expected: gen.signature,
        hex: gen.hex,
        base64: gen.base64,
        signedPayload: gen.signedPayload,
    };
}

// ========== UI ==========

async function whsGenerate() {
    const secret = document.getElementById('whsSecret').value;
    const body = document.getElementById('whsBody').value;
    const style = document.getElementById('whsStyle').value;
    const ts = document.getElementById('whsTimestamp').value.trim();
    const out = document.getElementById('whsOutput');
    if (!secret) {
        out.textContent = '请输入密钥';
        out.className = 'output-box error';
        return;
    }
    try {
        const opts = { style: style };
        if (ts) opts.timestamp = ts;
        if (style === 'stripe' && !ts) {
            opts.timestamp = String(Math.floor(Date.now() / 1000));
            document.getElementById('whsTimestamp').value = opts.timestamp;
        }
        const r = await generateWebhookSignature(secret, body, opts);
        out.textContent =
            '签名:\n' +
            r.signature +
            '\n\nHex:\n' +
            r.hex +
            '\n\nBase64:\n' +
            r.base64 +
            '\n\nSigned Payload:\n' +
            r.signedPayload;
        out.className = 'output-box';
        setStatus('签名已生成');
    } catch (e) {
        out.textContent = '失败: ' + e.message;
        out.className = 'output-box error';
    }
}

async function whsVerify() {
    const secret = document.getElementById('whsSecret').value;
    const body = document.getElementById('whsBody').value;
    const style = document.getElementById('whsStyle').value;
    const ts = document.getElementById('whsTimestamp').value.trim();
    const provided = document.getElementById('whsProvided').value;
    const out = document.getElementById('whsOutput');
    if (!secret) {
        out.textContent = '请输入密钥';
        out.className = 'output-box error';
        return;
    }
    if (!provided) {
        out.textContent = '请输入待校验签名';
        out.className = 'output-box error';
        return;
    }
    try {
        const opts = { style: style === 'hex' || style === 'base64' || style === 'github' || style === 'stripe' ? style : 'auto' };
        if (ts) opts.timestamp = ts;
        const r = await verifyWebhookSignature(secret, body, provided, opts);
        out.textContent =
            (r.valid ? '✓ 签名有效' : '✗ 签名无效') +
            '\n\n期望:\n' +
            r.expected +
            '\n\nHex:\n' +
            r.hex +
            '\n\nBase64:\n' +
            r.base64;
        out.className = r.valid ? 'output-box' : 'output-box error';
        setStatus(r.valid ? '校验通过' : '校验失败');
    } catch (e) {
        out.textContent = '失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function whsClear() {
    document.getElementById('whsSecret').value = '';
    document.getElementById('whsBody').value = '';
    document.getElementById('whsTimestamp').value = '';
    document.getElementById('whsProvided').value = '';
    document.getElementById('whsOutput').textContent = '';
    setStatus('已清空');
}

function whsLoadSample() {
    document.getElementById('whsSecret').value = 'whsec_test_secret';
    document.getElementById('whsBody').value = '{"id":1,"event":"ping"}';
    document.getElementById('whsTimestamp').value = '1609459200';
    document.getElementById('whsStyle').value = 'github';
    document.getElementById('whsProvided').value = '';
    setStatus('已加载示例');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateWebhookSignature: generateWebhookSignature,
        verifyWebhookSignature: verifyWebhookSignature,
        whsHmacSha256: whsHmacSha256,
        whsBuildSignedPayload: whsBuildSignedPayload,
        whsBufToHex: whsBufToHex,
        whsTimingSafeEqual: whsTimingSafeEqual,
    };
}
