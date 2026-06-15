function genUUID(ver, count) {
    count = count || 1;
    const list = document.getElementById('uuidList');
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
        const uuid = ver === 'v7' ? uuidV7() : crypto.randomUUID();
        const div = document.createElement('div');
        div.className = 'uuid-item';
        div.innerHTML = `<span>${uuid}</span><button class="sm outline" onclick="copyText(this.parentElement.querySelector('span'))">复制</button>`;
        frag.appendChild(div);
    }
    list.insertBefore(frag, list.firstChild);
    while (list.children.length > 20) list.removeChild(list.lastChild);
    setStatus(`已生成 ${count} 个 UUID ${ver}`);
}

function uuidClear() {
    document.getElementById('uuidList').innerHTML = '<div style="color:var(--text-dim);font-size:13px;padding:8px 0">点击按钮生成 UUID</div>';
    setStatus('已清空');
}

function uuidV7() {
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x70;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
