// Hash 扩展工具
// 实际可用：CRC32、CRC32C、Adler32、SM3
// 说明：浏览器 Web Crypto 不支持 SHA-3 / RIPEMD-160，故不提供这两类算法

// === CRC32 (标准 IEEE 802.3) ===
const CRC32_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[i] = c >>> 0;
    }
    return t;
})();

function crc32Bytes(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++)
        crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ bytes[i]) & 0xff];
    return (crc ^ 0xffffffff) >>> 0;
}

// === CRC32C (Castagnoli) ===
const CRC32C_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) c = c & 1 ? 0x82f63b78 ^ (c >>> 1) : c >>> 1;
        t[i] = c >>> 0;
    }
    return t;
})();

function crc32cBytes(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++)
        crc = (crc >>> 8) ^ CRC32C_TABLE[(crc ^ bytes[i]) & 0xff];
    return (crc ^ 0xffffffff) >>> 0;
}

// === Adler32 ===
function adler32Bytes(bytes) {
    let a = 1,
        b = 0;
    for (let i = 0; i < bytes.length; i++) {
        a = (a + bytes[i]) % 65521;
        b = (b + a) % 65521;
    }
    return ((b << 16) | a) >>> 0;
}

async function hashextCompute() {
    const input = document.getElementById("hashextInput").value;
    const out = document.getElementById("hashextResults");
    out.innerHTML = "";
    if (!input) {
        toast("请输入内容");
        return;
    }
    const enc = new TextEncoder();
    const data = enc.encode(input);
    const items = [];

    items.push({
        label: "CRC32 (IEEE 802.3)",
        value: crc32Bytes(data).toString(16).padStart(8, "0"),
    });
    items.push({
        label: "CRC32C (Castagnoli)",
        value: crc32cBytes(data).toString(16).padStart(8, "0"),
    });
    items.push({
        label: "Adler32",
        value: adler32Bytes(data).toString(16).padStart(8, "0"),
    });

    // SM3（依赖 sm3.min.js，与国密工具共用）
    if (typeof window.sm3 === "function") {
        try {
            items.push({label: "SM3 (国密)", value: window.sm3(input)});
        } catch (e) {
            items.push({
                label: "SM3 (国密)",
                value: "计算失败: " + e.message,
                error: true,
            });
        }
    } else {
        items.push({
            label: "SM3 (国密)",
            value: "库未加载（请刷新页面后重试）",
            error: true,
        });
    }

    items.forEach((it) => {
        const div = document.createElement("div");
        div.className = "uuid-item";
        div.innerHTML = `<span style="color:var(--text-dim);width:170px;flex-shrink:0">${it.label}</span><span class="hash-val" style="font-size:12px;${it.error ? "color:var(--danger)" : ""}">${it.value}</span><button class="sm outline" onclick="copyText(this.parentElement.querySelector('.hash-val'))">复制</button>`;
        out.appendChild(div);
    });
    setStatus("Hash 扩展计算完成");
}

function hashextClear() {
    document.getElementById("hashextInput").value = "";
    document.getElementById("hashextResults").innerHTML = "";
    setStatus("已清空");
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = {crc32Bytes, crc32cBytes, adler32Bytes};
}
