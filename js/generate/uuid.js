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
    // RFC 9562 UUID v7：前 48 位为 Unix 毫秒时间戳（大端序），
    // 紧接 4 位版本号 ver=0111，再接 12 位随机 rand_a，
    // 之后 2 位变体 variant=10，最后 62 位随机 rand_b。
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    const ts = Date.now();
    const v = new DataView(b.buffer);
    // 高 32 位写入 byte 0-3（大端序）：48 位时间戳 = 高 32 位（byte 0-3）+ 低 16 位（byte 4-5）
    v.setUint32(0, Math.floor(ts / 0x10000), false);
    // 低 16 位写入 byte 4-5（大端序），与上一步合起来共 48 位时间戳
    v.setUint16(4, ts & 0xffff, false);
    // 设置版本位 v7（byte 6 高 4 位置 0111）
    b[6] = (b[6] & 0x0f) | 0x70;
    // 设置变体位（byte 8 高 2 位置 10，RFC 4122 / RFC 9562）
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
