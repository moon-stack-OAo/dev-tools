// 图片压缩：JPEG/PNG/WebP 互转 + 质量调节 + 批量处理

const IC_EXT_MAP = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
};

let icItems = [];

function icFormatBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(2) + ' MB';
}

function icBaseName(name) {
    const i = name.lastIndexOf('.');
    return i > 0 ? name.substring(0, i) : name;
}

function icOutName(originalName, mime) {
    return icBaseName(originalName) + '.' + IC_EXT_MAP[mime];
}

function icResolveFormat(item) {
    const sel = document.getElementById('icFormat').value;
    if (sel !== 'origin') return sel;
    if (item.file.type && IC_EXT_MAP[item.file.type]) return item.file.type;
    return 'image/jpeg';
}

function icCurrentOptions() {
    return {
        format: document.getElementById('icFormat').value,
        quality: parseInt(document.getElementById('icQuality').value, 10) / 100,
        maxWidth: parseInt(document.getElementById('icMaxWidth').value, 10) || 0,
    };
}

function icCompressOne(item, opts) {
    return new Promise((resolve) => {
        const targetMime = icResolveFormat(item);
        const url = URL.createObjectURL(item.file);
        const img = new Image();
        img.onload = () => {
            let w = img.naturalWidth;
            let h = img.naturalHeight;
            if (opts.maxWidth > 0 && w > opts.maxWidth) {
                h = Math.round((h * opts.maxWidth) / w);
                w = opts.maxWidth;
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (targetMime === 'image/jpeg') {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, w, h);
            }
            ctx.drawImage(img, 0, 0, w, h);
            canvas.toBlob(
                (blob) => {
                    URL.revokeObjectURL(url);
                    if (!blob) {
                        resolve({ ok: false, error: 'Canvas 编码失败' });
                        return;
                    }
                    resolve({ ok: true, blob, width: w, height: h, mime: targetMime });
                },
                targetMime,
                targetMime === 'image/png' ? undefined : opts.quality
            );
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve({ ok: false, error: '图片解码失败' });
        };
        img.src = url;
    });
}

function icRender() {
    const list = document.getElementById('icList');
    const toolbar = document.getElementById('icToolbar');
    const stats = document.getElementById('icStats');
    if (!icItems.length) {
        list.innerHTML = '<div class="ic-empty">请先添加图片</div>';
        toolbar.style.display = 'none';
        return;
    }
    toolbar.style.display = '';
    const total = icItems.length;
    const done = icItems.filter((it) => it.status === 'done').length;
    const origSum = icItems.reduce((s, it) => s + it.file.size, 0);
    const compSum = icItems.reduce((s, it) => s + (it.outBlob ? it.outBlob.size : 0), 0);
    const ratio = origSum > 0 && compSum > 0 ? Math.round((1 - compSum / origSum) * 100) : 0;
    stats.textContent = `共 ${total} 张 · 已处理 ${done} · 原始 ${icFormatBytes(origSum)} → 压缩后 ${icFormatBytes(compSum)}（节省 ${ratio}%）`;

    list.innerHTML = '';
    icItems.forEach((it, idx) => {
        const row = document.createElement('div');
        row.className = 'ic-item';
        const ratioNum = it.outBlob && it.file.size ? (1 - it.outBlob.size / it.file.size) * 100 : 0;
        const ratioStr = it.outBlob && it.file.size ? ratioNum.toFixed(1) + '%' : '-';
        const status =
            it.status === 'done'
                ? '✓ 已完成'
                : it.status === 'processing'
                  ? '⏳ 处理中...'
                  : it.status === 'error'
                    ? `✗ ${it.error}`
                    : '○ 待处理';
        const statusCls = it.status === 'done' ? 'ok' : it.status === 'error' ? 'err' : 'pending';
        const origUrl = it.origUrl;
        const compUrl = it.outUrl || '';
        row.innerHTML = `
            <div class="ic-thumbs">
                <div class="ic-thumb"><img src="${origUrl}" alt="原图"><div class="ic-thumb-label">原图</div></div>
                <div class="ic-thumb"><img src="${compUrl || origUrl}" alt="压缩后"><div class="ic-thumb-label">压缩后</div></div>
            </div>
            <div class="ic-info">
                <div class="ic-name" title="${escapeHtml(it.file.name)}">${escapeHtml(it.file.name)}</div>
                <div class="ic-meta">
                    <span>${it.file.type || '?'}</span>
                    <span>${icFormatBytes(it.file.size)}</span>
                    <span class="ic-status ${statusCls}">${status}</span>
                </div>
                <div class="ic-result">
                    ${
                        it.outBlob
                            ? `<span>→ ${it.outMime}</span><span>${it.outWidth}×${it.outHeight}</span><span>${icFormatBytes(it.outBlob.size)}</span><span class="ic-ratio">${ratioNum >= 0 ? '↓ ' : '↑ '}${ratioStr === '-' ? '-' : Math.abs(ratioNum).toFixed(1) + '%'}</span>`
                            : '<span style="color:var(--text-muted)">尚未处理</span>'
                    }
                </div>
            </div>
            <div class="ic-actions">
                <button class="outline sm" onclick="icCompressOneByIdx(${idx})" ${it.status === 'processing' ? 'disabled' : ''}>${it.status === 'done' ? '重新压缩' : '压缩'}</button>
                <button class="outline sm" onclick="icDownloadOne(${idx})" ${it.outBlob ? '' : 'disabled'}>下载</button>
                <button class="outline sm" onclick="icRemove(${idx})" title="移除">✕</button>
            </div>
        `;
        list.appendChild(row);
    });
}

function icAddFiles(files) {
    if (!files || !files.length) return;
    let added = 0;
    Array.from(files).forEach((f) => {
        if (!f.type.startsWith('image/')) {
            toast(`已跳过非图片: ${f.name}`);
            return;
        }
        icItems.push({
            file: f,
            origUrl: URL.createObjectURL(f),
            status: 'pending',
        });
        added++;
    });
    if (added > 0) {
        icRender();
        setStatus(`已添加 ${added} 张图片，共 ${icItems.length} 张`);
    }
}

function icRemove(idx) {
    const it = icItems[idx];
    if (it.origUrl) URL.revokeObjectURL(it.origUrl);
    if (it.outUrl) URL.revokeObjectURL(it.outUrl);
    icItems.splice(idx, 1);
    icRender();
    setStatus('已移除一张图片');
}

function icClear() {
    icItems.forEach((it) => {
        if (it.origUrl) URL.revokeObjectURL(it.origUrl);
        if (it.outUrl) URL.revokeObjectURL(it.outUrl);
    });
    icItems = [];
    document.getElementById('icFile').value = '';
    icRender();
    setStatus('已清空');
}

async function icCompressOneByIdx(idx) {
    const it = icItems[idx];
    if (!it) return;
    if (it.outUrl) URL.revokeObjectURL(it.outUrl);
    it.outUrl = null;
    it.outBlob = null;
    it.status = 'processing';
    icRender();
    const opts = icCurrentOptions();
    const r = await icCompressOne(it, opts);
    if (r.ok) {
        it.status = 'done';
        it.outBlob = r.blob;
        it.outMime = r.mime;
        it.outWidth = r.width;
        it.outHeight = r.height;
        it.outUrl = URL.createObjectURL(r.blob);
    } else {
        it.status = 'error';
        it.error = r.error;
    }
    icRender();
}

async function icCompressAll() {
    if (!icItems.length) return;
    const opts = icCurrentOptions();
    setStatus('正在批量压缩...');
    for (let i = 0; i < icItems.length; i++) {
        const it = icItems[i];
        if (it.outUrl) URL.revokeObjectURL(it.outUrl);
        it.outUrl = null;
        it.outBlob = null;
        it.status = 'processing';
        icRender();
        const r = await icCompressOne(it, opts);
        if (r.ok) {
            it.status = 'done';
            it.outBlob = r.blob;
            it.outMime = r.mime;
            it.outWidth = r.width;
            it.outHeight = r.height;
            it.outUrl = URL.createObjectURL(r.blob);
        } else {
            it.status = 'error';
            it.error = r.error;
        }
        icRender();
    }
    setStatus('批量压缩完成');
}

function icDownloadOne(idx) {
    const it = icItems[idx];
    if (!it || !it.outBlob) {
        toast('请先压缩该图片');
        return;
    }
    const a = document.createElement('a');
    a.href = it.outUrl;
    a.download = icOutName(it.file.name, it.outMime);
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast('已下载 ' + a.download);
}

async function icDownloadZip() {
    const done = icItems.filter((it) => it.outBlob);
    if (!done.length) {
        toast('没有可打包的压缩结果');
        return;
    }
    if (typeof JSZip === 'undefined') {
        toast('JSZip 未加载');
        return;
    }
    setStatus('正在打包 ZIP...');
    const zip = new JSZip();
    const folder = zip.folder('compressed-images');
    const nameMap = {};
    done.forEach((it) => {
        let name = icOutName(it.file.name, it.outMime);
        if (nameMap[name]) {
            const base = icBaseName(name);
            const ext = name.substring(base.length);
            let n = 1;
            while (nameMap[`${base}_${n}${ext}`]) n++;
            name = `${base}_${n}${ext}`;
        }
        nameMap[name] = true;
        folder.file(name, it.outBlob);
    });
    try {
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'compressed-images.zip';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setStatus('已打包下载 ' + done.length + ' 张图片');
    } catch (e) {
        toast('打包失败: ' + e.message);
    }
}

function icUpdateQualityLabel() {
    document.getElementById('icQualityVal').textContent = document.getElementById('icQuality').value;
}

function icOnFormatChange() {
    const fmt = document.getElementById('icFormat').value;
    const isPng = fmt === 'image/png';
    const slider = document.getElementById('icQuality');
    slider.disabled = isPng;
    document.getElementById('icQualityField').classList.toggle('disabled', isPng);
}

function icCompressInit() {
    icRender();
    icUpdateQualityLabel();
    icOnFormatChange();
    const drop = document.getElementById('icDrop');
    const file = document.getElementById('icFile');
    drop.addEventListener('click', () => file.click());
    drop.addEventListener('dragover', (e) => {
        e.preventDefault();
        drop.classList.add('dragover');
    });
    drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
    drop.addEventListener('drop', (e) => {
        e.preventDefault();
        drop.classList.remove('dragover');
        if (e.dataTransfer && e.dataTransfer.files) icAddFiles(e.dataTransfer.files);
    });
    file.addEventListener('change', (e) => {
        if (e.target.files) icAddFiles(e.target.files);
        e.target.value = '';
    });
    document.getElementById('icQuality').addEventListener('input', icUpdateQualityLabel);
    document.getElementById('icFormat').addEventListener('change', icOnFormatChange);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { icCompressOne, IC_EXT_MAP };
}

if (typeof registerInit === 'function') {
    registerInit('image-compress', icCompressInit);
} else if (typeof registerInit !== 'undefined') {
    registerInit('image-compress', icCompressInit);
}
