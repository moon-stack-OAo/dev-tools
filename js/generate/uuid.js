function genUUID() {
    const ver = (document.getElementById('uuidVer') || {}).value || 'v4';
    const count = Math.min(Math.max(parseInt((document.getElementById('uuidCount') || {}).value) || 1, 1), 100);
    const hyphen = (document.getElementById('uuidHyphen') || {}).checked !== false;
    const upper = (document.getElementById('uuidUpper') || {}).checked;
    const list = document.getElementById('uuidList');
    if (!list) return;
    const empty = list.querySelector('.uuid-empty');
    if (empty) empty.remove();
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
        let uuid = ver === 'v7' ? uuidV7() : crypto.randomUUID();
        if (!hyphen) uuid = uuid.replace(/-/g, '');
        if (upper) uuid = uuid.toUpperCase();
        const div = document.createElement('div');
        div.className = 'uuid-item';
        div.innerHTML = `<span class="uuid-badge uuid-badge-${ver}">${ver.toUpperCase()}</span><span class="uuid-val">${uuid}</span><button class="sm outline" onclick="copyText(this.parentElement.querySelector('.uuid-val'))">复制</button>`;
        frag.appendChild(div);
    }
    list.insertBefore(frag, list.firstChild);
    while (list.children.length > 50) list.removeChild(list.lastChild);
    const copyAllBtn = document.getElementById('uuidCopyAllBtn');
    if (copyAllBtn) copyAllBtn.style.display = '';
    setStatus(`已生成 ${count} 个 UUID ${ver}`);
}

function uuidClear() {
    const list = document.getElementById('uuidList');
    if (!list) return;
    list.innerHTML = '<div class="uuid-empty">点击「生成」按钮创建 UUID</div>';
    const copyAllBtn = document.getElementById('uuidCopyAllBtn');
    if (copyAllBtn) copyAllBtn.style.display = 'none';
    setStatus('已清空');
}

function uuidCopyAll() {
    const spans = document.querySelectorAll('#uuidList .uuid-item .uuid-val');
    if (!spans.length) return;
    const text = Array.from(spans)
        .map((s) => s.textContent)
        .join('\n');
    safeCopy(text, `已复制 ${spans.length} 个 UUID`);
}

function uuidV7() {
    // RFC 9562 UUID v7：前 48 位为 Unix 毫秒时间戳（大端序），
    // 紧接 4 位版本号 ver=0111，再接 12 位随机 rand_a，
    // 之后 2 位变体 variant=10，最后 62 位随机 rand_b。
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    const ts = Date.now();
    const v = new DataView(b.buffer);
    v.setUint32(0, Math.floor(ts / 0x10000), false);
    v.setUint16(4, ts & 0xffff, false);
    b[6] = (b[6] & 0x0f) | 0x70;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b)
        .map((x) => x.toString(16).padStart(2, '0'))
        .join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
