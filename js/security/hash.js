async function hashCompute(type) {
    const raw = document.getElementById('hashInput').value;
    if (!raw) {
        toast('请输入内容');
        return;
    }
    const container = document.getElementById('hashResults');
    const enc = new TextEncoder();
    const data = enc.encode(raw);
    let result;
    const label = {md5: 'MD5', sha1: 'SHA-1', sha256: 'SHA-256', sha512: 'SHA-512'}[type];
    try {
        if (type === 'md5') {
            result = md5(raw);
        } else {
            const algo = {sha1: 'SHA-1', sha256: 'SHA-256', sha512: 'SHA-512'}[type];
            const hashBuffer = await crypto.subtle.digest(algo, data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            result = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        }
        let existing = container.querySelector(`[data-type="${type}"]`);
        if (existing) {
            existing.querySelector('.hash-val').textContent = result;
        } else {
            const div = document.createElement('div');
            div.className = 'uuid-item';
            div.setAttribute('data-type', type);
            div.innerHTML = `<span style="color:var(--text-dim);width:70px;flex-shrink:0">${escapeHtml(label)}</span><span class="hash-val" style="font-size:12px">${escapeHtml(result)}</span><button class="sm outline" onclick="copyText(this.parentElement.querySelector('.hash-val'))">复制</button>`;
            container.appendChild(div);
        }
        setStatus(`${label} 计算完成`);
    } catch (e) {
        toast(`${label} 计算失败: ${e.message}`);
    }
}

function hashClear() {
    document.getElementById('hashResults').innerHTML = '';
    setStatus('已清空');
}
