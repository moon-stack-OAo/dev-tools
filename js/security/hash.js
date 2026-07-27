/** ArrayBuffer / Uint8Array → 小写 hex */
function hashBytesToHex(buf) {
    return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

/**
 * 计算摘要（纯逻辑，不依赖 DOM）
 * @param {'md5'|'sha1'|'sha256'|'sha512'} type
 * @param {string} raw
 * @returns {Promise<string>} 小写 hex
 */
async function hashDigest(type, raw) {
    if (type === "md5") {
        if (typeof md5 !== "function") throw new Error("md5 库未加载");
        return md5(raw);
    }
    const algo = {sha1: "SHA-1", sha256: "SHA-256", sha512: "SHA-512"}[type];
    if (!algo) throw new Error("不支持的算法: " + type);
    const hashBuffer = await crypto.subtle.digest(
        algo,
        new TextEncoder().encode(raw),
    );
    return hashBytesToHex(hashBuffer);
}

async function hashCompute(type) {
    const raw = document.getElementById("hashInput").value;
    if (!raw) {
        toast("请输入内容");
        return;
    }
    const container = document.getElementById("hashResults");
    let result;
    const label = {
        md5: "MD5",
        sha1: "SHA-1",
        sha256: "SHA-256",
        sha512: "SHA-512",
    }[type];
    try {
        result = await hashDigest(type, raw);
        let existing = container.querySelector(`[data-type="${type}"]`);
        if (existing) {
            existing.querySelector(".hash-val").textContent = result;
        } else {
            const div = document.createElement("div");
            div.className = "uuid-item";
            div.setAttribute("data-type", type);
            div.innerHTML = `<span style="color:var(--text-dim);width:70px;flex-shrink:0">${escapeHtml(label)}</span><span class="hash-val" style="font-size:12px">${escapeHtml(result)}</span><button class="sm outline" onclick="copyText(this.parentElement.querySelector('.hash-val'))">复制</button>`;
            container.appendChild(div);
        }
        setStatus(`${label} 计算完成`);
    } catch (e) {
        toast(`${label} 计算失败: ${e.message}`);
    }
}

function hashClear() {
    document.getElementById("hashResults").innerHTML = "";
    setStatus("已清空");
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = {hashBytesToHex, hashDigest};
}
