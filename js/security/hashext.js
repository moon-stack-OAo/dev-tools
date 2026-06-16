// Hash 扩展工具
// 新增算法：CRC32、CRC32C、Adler32、RIPEMD-160、SHA-3 系列
// SM3 见 gmsm 工具

// === CRC32 (标准 IEEE 802.3) ===
const CRC32_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        t[i] = c >>> 0;
    }
    return t;
})();

function crc32Bytes(bytes) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ bytes[i]) & 0xFF];
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

// === CRC32C (Castagnoli) ===
const CRC32C_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) c = (c & 1) ? (0x82F63B78 ^ (c >>> 1)) : (c >>> 1);
        t[i] = c >>> 0;
    }
    return t;
})();

function crc32cBytes(bytes) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) crc = (crc >>> 8) ^ CRC32C_TABLE[(crc ^ bytes[i]) & 0xFF];
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

// === Adler32 ===
function adler32Bytes(bytes) {
    let a = 1, b = 0;
    for (let i = 0; i < bytes.length; i++) {
        a = (a + bytes[i]) % 65521;
        b = (b + a) % 65521;
    }
    return ((b << 16) | a) >>> 0;
}

// RIPEMD-160 暂未实现。Web Crypto API 不支持该算法，
// 纯 JS 实现复杂度较高（双轨 + 80 步 + 5 个非线性函数），
// 如有需要可引入第三方库（如 js-ripemd160）。
function ripemd160Bytes(_bytes) {
    throw new Error('RIPEMD-160 暂未实现，请用 SHA-256 / SHA3-256 / SM3 替代');
}

function bufToHex8(buf) {
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashextCompute() {
    const input = document.getElementById('hashextInput').value;
    const out = document.getElementById('hashextResults');
    out.innerHTML = '';
    if (!input) {
        toast('请输入内容');
        return;
    }
    const enc = new TextEncoder();
    const data = enc.encode(input);
    const items = [];

    // CRC32 / CRC32C / Adler32（同步）
    items.push({label: 'CRC32 (IEEE 802.3)', value: crc32Bytes(data).toString(16).padStart(8, '0')});
    items.push({label: 'CRC32C (Castagnoli)', value: crc32cBytes(data).toString(16).padStart(8, '0')});
    items.push({label: 'Adler32', value: adler32Bytes(data).toString(16).padStart(8, '0')});

    // SHA-3 系列（Web Crypto API）
    const sha3Algos = ['SHA3-224', 'SHA3-256', 'SHA3-384', 'SHA3-512'];
    for (const algo of sha3Algos) {
        try {
            const buf = await crypto.subtle.digest(algo, data);
            items.push({label: algo, value: bufToHex8(buf)});
        } catch (e) {
            items.push({label: algo, value: '不支持（浏览器版本过低）', error: true});
        }
    }

    // RIPEMD-160
    try {
        const v = ripemd160Bytes(data);
        items.push({label: 'RIPEMD-160', value: v});
    } catch (e) {
        items.push({label: 'RIPEMD-160', value: e.message, error: true});
    }

    // SM3
    if (typeof window.sm3 === 'function') {
        try {
            items.push({label: 'SM3 (国密)', value: window.sm3(input)});
        } catch (e) {
            items.push({label: 'SM3 (国密)', value: '计算失败: ' + e.message, error: true});
        }
    } else {
        items.push({label: 'SM3 (国密)', value: '库未加载（请同时启用国密工具）', error: true});
    }

    items.forEach(it => {
        const div = document.createElement('div');
        div.className = 'uuid-item';
        div.innerHTML = `<span style="color:var(--text-dim);width:170px;flex-shrink:0">${it.label}</span><span class="hash-val" style="font-size:12px;${it.error ? 'color:var(--danger)' : ''}">${it.value}</span><button class="sm outline" onclick="copyText(this.parentElement.querySelector('.hash-val'))">复制</button>`;
        out.appendChild(div);
    });
    setStatus('Hash 扩展计算完成');
}

function hashextClear() {
    document.getElementById('hashextInput').value = '';
    document.getElementById('hashextResults').innerHTML = '';
    setStatus('已清空');
}
