// 图片 Base64 互转

let img2b64Files = [];
let img2b64ActiveIdx = -1;
let b642imgCurrentUrl = null;
let b642imgCurrentName = 'image';

function imgbase64SwitchTab(tab) {
    const tabs = document.querySelectorAll('#panel-imgbase64 .tab-bar .tab');
    const contents = document.querySelectorAll('#panel-imgbase64 .tab-content');
    tabs.forEach((t, i) => {
        const map = ['encode', 'decode'];
        t.classList.toggle('active', map[i] === tab);
    });
    contents.forEach(c => c.classList.toggle('active', c.id === 'imgbase64Tab-' + tab));
}

function img2b64RenderList() {
    const list = document.getElementById('img2b64List');
    const out = document.getElementById('img2b64Output');
    if (!img2b64Files.length) {
        list.innerHTML = '<div style="font-size:12px;color:var(--text-muted);padding:8px 4px">（暂无文件）</div>';
        out.value = '';
        return;
    }
    list.innerHTML = '';
    img2b64Files.forEach((f, i) => {
        const item = document.createElement('div');
        item.className = 'img2b64-item' + (i === img2b64ActiveIdx ? ' active' : '');
        const sizeKb = (f.dataUrl.length / 1024).toFixed(1);
        item.innerHTML = `<img class="img2b64-thumb" src="${f.dataUrl}"><div class="img2b64-info"><div class="img2b64-name">${escapeHtmlImg(f.name)}</div><div class="img2b64-meta">${f.mime || '?'} · ${f.size} bytes · Base64 ${sizeKb} KB</div></div><button class="outline sm" onclick="event.stopPropagation();img2b64Remove(${i})" title="删除">&#10005;</button>`;
        item.addEventListener('click', () => img2b64Select(i));
        list.appendChild(item);
    });
    if (img2b64ActiveIdx < 0 || img2b64ActiveIdx >= img2b64Files.length) {
        img2b64ActiveIdx = 0;
    }
    if (img2b64ActiveIdx >= 0) {
        out.value = img2b64Files[img2b64ActiveIdx].dataUrl;
    }
}

function img2b64Select(i) {
    img2b64ActiveIdx = i;
    img2b64RenderList();
}

function img2b64Remove(i) {
    img2b64Files.splice(i, 1);
    if (img2b64ActiveIdx >= img2b64Files.length) img2b64ActiveIdx = img2b64Files.length - 1;
    img2b64RenderList();
}

function img2b64HandleFiles(files) {
    if (!files || !files.length) return;
    const tasks = [];
    Array.from(files).forEach(f => {
        if (!f.type.startsWith('image/')) {
            toast(`已跳过非图片: ${f.name}`);
            return;
        }
        tasks.push(new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({name: f.name, size: f.size, mime: f.type, dataUrl: reader.result});
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(f);
        }));
    });
    Promise.all(tasks).then(results => {
        img2b64Files = img2b64Files.concat(results);
        if (img2b64ActiveIdx < 0 && img2b64Files.length) img2b64ActiveIdx = 0;
        img2b64RenderList();
        setStatus(`已加载 ${results.length} 个文件，共 ${img2b64Files.length} 个`);
    }).catch(err => {
        toast('读取文件失败: ' + err.message);
    });
}

function img2b64CopyDataUrl() {
    const out = document.getElementById('img2b64Output');
    if (!out.value) {
        toast('没有可复制的内容');
        return;
    }
    safeCopy(out.value, 'DataURL 已复制');
}

function img2b64CopyPure() {
    const out = document.getElementById('img2b64Output');
    if (!out.value) {
        toast('没有可复制的内容');
        return;
    }
    const pure = out.value.includes(',') ? out.value.split(',')[1] : out.value;
    safeCopy(pure, '纯 Base64 已复制');
}

function img2b64Download() {
    if (!img2b64Files.length) {
        toast('没有可下载的内容');
        return;
    }
    let text = '';
    img2b64Files.forEach(f => {
        text += `# ${f.name}\n# ${f.mime} | ${f.size} bytes\n${f.dataUrl}\n\n`;
    });
    const blob = new Blob([text], {type: 'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'images-base64.txt';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
    }, 100);
    toast('已下载 images-base64.txt');
}

function img2b64Clear() {
    img2b64Files = [];
    img2b64ActiveIdx = -1;
    document.getElementById('img2b64File').value = '';
    img2b64RenderList();
    setStatus('已清空');
}

function b642imgExtract(input) {
    const s = input.trim();
    const m = s.match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
    if (m) {
        return {mime: m[1] || 'image/png', data: m[3]};
    }
    return {mime: 'image/png', data: s};
}

function b642imgRender() {
    const input = document.getElementById('b642imgInput').value;
    const preview = document.getElementById('b642imgPreview');
    const meta = document.getElementById('b642imgMeta');
    if (!input.trim()) {
        preview.innerHTML = '<div class="placeholder">（请先输入 Base64 内容）</div>';
        meta.textContent = '';
        b642imgCurrentUrl = null;
        return;
    }
    const {mime, data} = b642imgExtract(input);
    if (!data) {
        preview.innerHTML = '<div class="placeholder" style="color:var(--danger)">（Base64 内容为空）</div>';
        meta.textContent = '';
        b642imgCurrentUrl = null;
        return;
    }
    const url = `data:${mime};base64,${data}`;
    b642imgCurrentUrl = url;
    const ext = mime.split('/')[1] || 'png';
    b642imgCurrentName = `image.${ext}`;
    const img = new Image();
    img.onload = () => {
        const sizeKb = (data.length / 1024).toFixed(1);
        meta.innerHTML = `<span><b>${escapeHtmlImg(mime)}</b></span><span>尺寸 <b>${img.naturalWidth} × ${img.naturalHeight}</b></span><span>Base64 <b>${sizeKb} KB</b></span><span>原文 <b>${data.length}</b> 字符</span>`;
        preview.innerHTML = '';
        preview.appendChild(img);
        setStatus('图片渲染成功');
    };
    img.onerror = () => {
        preview.innerHTML = '<div class="placeholder" style="color:var(--danger)">（无效的 Base64 图片数据）</div>';
        meta.innerHTML = '<span style="color:var(--danger)">渲染失败，请检查内容</span>';
        b642imgCurrentUrl = null;
    };
    img.src = url;
    preview.innerHTML = '<div class="placeholder">（加载中...）</div>';
}

function b642imgDownload() {
    if (!b642imgCurrentUrl) {
        toast('请先渲染图片');
        return;
    }
    const a = document.createElement('a');
    a.href = b642imgCurrentUrl;
    a.download = b642imgCurrentName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast('已下载 ' + b642imgCurrentName);
}

function b642imgClear() {
    document.getElementById('b642imgInput').value = '';
    document.getElementById('b642imgPreview').innerHTML = '<div class="placeholder">（请先输入 Base64 内容）</div>';
    document.getElementById('b642imgMeta').textContent = '';
    b642imgCurrentUrl = null;
}

function escapeHtmlImg(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function imgbase64Init() {
    img2b64RenderList();
    document.getElementById('b642imgPreview').innerHTML = '<div class="placeholder">（请先输入 Base64 内容）</div>';
    const drop = document.getElementById('img2b64Drop');
    if (drop) {
        drop.addEventListener('dragover', e => {
            e.preventDefault();
            drop.classList.add('dragover');
        });
        drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
        drop.addEventListener('drop', e => {
            e.preventDefault();
            drop.classList.remove('dragover');
            if (e.dataTransfer && e.dataTransfer.files) {
                img2b64HandleFiles(e.dataTransfer.files);
            }
        });
    }
}
