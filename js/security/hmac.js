// HMAC 计算工具
// 支持 HMAC-MD5 / HMAC-SHA1 / HMAC-SHA256 / HMAC-SHA384 / HMAC-SHA512
// MD5 走纯 JS 实现，SHA 系列优先使用 Web Crypto API

// === HMAC-MD5 纯 JS 实现 ===
// 基于 RFC 2104 + RFC 1321
const MD5_BLOCK = 64;
const MD5_S = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];
const MD5_K = new Uint32Array([
    0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
    0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
    0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
    0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
    0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
    0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
    0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
    0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
]);

function rotl32(n, b) {
    n = n | 0;
    b = b & 31;
    return (n << b) | (n >>> (32 - b));
}

function md5Cycle(x, k) {
    let a = x[0], b = x[1], c = x[2], d = x[3];
    for (let i = 0; i < 64; i++) {
        let f, g;
        if (i < 16) { f = (b & c) | (~b & d); g = i; }
        else if (i < 32) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16; }
        else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16; }
        else { f = c ^ (b | ~d); g = (7 * i) % 16; }
        const t = d;
        d = c; c = b;
        b = (b + rotl32((a + f + MD5_K[i] + k[g]) | 0, MD5_S[i])) | 0;
        a = t;
    }
    x[0] = (x[0] + a) | 0;
    x[1] = (x[1] + b) | 0;
    x[2] = (x[2] + c) | 0;
    x[3] = (x[3] + d) | 0;
}

function md5Bytes(bytes) {
    const len = bytes.length;
    const zeros = (56 - (len + 1) % 64 + 64) % 64;
    const totalLen = len + 1 + zeros + 8;
    const padded = new Uint8Array(totalLen);
    padded.set(bytes);
    padded[len] = 0x80;
    const dv = new DataView(padded.buffer);
    dv.setUint32(padded.length - 8, (len * 8) >>> 0, true);
    dv.setUint32(padded.length - 4, Math.floor(len / 0x20000000), true);

    const x = new Uint32Array([0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476]);
    const k = new Uint32Array(16);
    for (let i = 0; i < padded.length; i += 64) {
        for (let j = 0; j < 16; j++) k[j] = dv.getUint32(i + j * 4, true);
        md5Cycle(x, k);
    }
    const out = new Uint8Array(16);
    const odv = new DataView(out.buffer);
    odv.setUint32(0, x[0], true);
    odv.setUint32(4, x[1], true);
    odv.setUint32(8, x[2], true);
    odv.setUint32(12, x[3], true);
    return out;
}

function hmacMd5Bytes(key, data) {
    if (key.length > MD5_BLOCK) key = md5Bytes(key);
    const paddedKey = new Uint8Array(MD5_BLOCK);
    paddedKey.set(key);
    const oKey = new Uint8Array(MD5_BLOCK);
    const iKey = new Uint8Array(MD5_BLOCK);
    for (let i = 0; i < MD5_BLOCK; i++) {
        oKey[i] = paddedKey[i] ^ 0x5c;
        iKey[i] = paddedKey[i] ^ 0x36;
    }
    const inner = md5Bytes(new Uint8Array([...iKey, ...data]));
    return md5Bytes(new Uint8Array([...oKey, ...inner]));
}

function bufToHex(buf) {
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacCompute() {
    const msg = document.getElementById('hmacInput').value;
    const key = document.getElementById('hmacKey').value;
    const algo = document.getElementById('hmacAlgo').value;
    const outFmt = document.getElementById('hmacFormat').value;
    const out = document.getElementById('hmacOutput');
    if (!key) {
        out.textContent = '请输入密钥';
        out.className = 'output-box error';
        return;
    }
    if (!msg) {
        out.textContent = '请输入待签名内容';
        out.className = 'output-box error';
        return;
    }
    try {
        const enc = new TextEncoder();
        const data = enc.encode(msg);
        let result;
        let label = algo;
        if (algo === 'MD5') {
            // Web Crypto API 不支持 HMAC-MD5，使用纯 JS 实现
            const kBytes = enc.encode(key);
            const mac = hmacMd5Bytes(kBytes, data);
            result = outFmt === 'hex' ? bufToHex(mac) : btoa(String.fromCharCode(...mac));
            label = 'HMAC-MD5';
        } else {
            const algoMap = { SHA1: 'SHA-1', SHA256: 'SHA-256', SHA384: 'SHA-384', SHA512: 'SHA-512' };
            const hashName = algoMap[algo];
            const cryptoKey = await crypto.subtle.importKey(
                'raw', enc.encode(key),
                { name: 'HMAC', hash: hashName },
                false, ['sign']
            );
            const sig = await crypto.subtle.sign('HMAC', cryptoKey, data);
            result = outFmt === 'hex' ? bufToHex(sig) : btoa(String.fromCharCode(...new Uint8Array(sig)));
            label = 'HMAC-' + algo.replace('SHA', 'SHA-');
        }
        out.textContent = result;
        out.className = 'output-box';
        setStatus(label + ' 计算完成');
    } catch (e) {
        out.textContent = '计算失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function hmacClear() {
    document.getElementById('hmacInput').value = '';
    document.getElementById('hmacKey').value = '';
    document.getElementById('hmacOutput').textContent = '';
    setStatus('已清空');
}
