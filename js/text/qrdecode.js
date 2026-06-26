// T9 二维码解析工具
// 依赖：jsQR（已本地化到 /lib/jsqr.min.js）
// 完全本地运行，图片不上传

let _qrdecodeLastData = null;

const QRDECODE_URI_PATTERNS = [
    { type: 'URL',      regex: /^https?:\/\//i },
    { type: 'WiFi',     regex: /^WIFI:/i },
    { type: 'vCard',    regex: /^BEGIN:VCARD/i },
    { type: 'otpauth',  regex: /^otpauth:\/\//i },
    { type: 'Email',    regex: /^mailto:/i },
    { type: '电话',      regex: /^tel:/i },
    { type: '短信',      regex: /^sms:/i },
    { type: '地理坐标',  regex: /^geo:/i },
];

function _qrdecodeClassify(data) {
    for (const p of QRDECODE_URI_PATTERNS) {
        if (p.regex.test(data)) return p.type;
    }
    return '文本';
}

function _qrdecodeParseWifi(data) {
    const m = data.match(/^WIFI:([^;]*);S:([^;]*);(?:P:([^;]*);)?(?:T:([^;]*);)?(?:H:[^;]*;)?;?$/i);
    if (!m) return null;
    return { auth: m[4] || 'nopass', ssid: m[2] || '', password: m[3] || '' };
}

function _qrdecodeParseVcard(data) {
    const get = field => {
        const m = data.match(new RegExp('^' + field + ':(.+)$', 'mi'));
        return m ? m[1].trim() : '';
    };
    return { name: get('FN') || get('N'), tel: get('TEL'), email: get('EMAIL') };
}

async function _qrdecodeLoadImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function _qrdecodeResize(img, maxDim = 1000) {
    if (img.width <= maxDim && img.height <= maxDim) return img;
    const ratio = Math.min(maxDim / img.width, maxDim / img.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * ratio);
    canvas.height = Math.round(img.height * ratio);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const newImg = new Image();
    newImg.src = canvas.toDataURL('image/png');
    return new Promise(resolve => { newImg.onload = () => resolve(newImg); });
}

function _qrdecodeDecode(canvas) {
    if (typeof jsQR !== 'function') {
        throw new Error('jsQR 库未加载');
    }
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
    });
    return code ? { type: 'qrcode', data: code.data } : null;
}

function _qrdecodeShow(img, result) {
    const preview = document.getElementById('qrdecodePreview');
    const resultBox = document.getElementById('qrdecodeResult');
    const meta = document.getElementById('qrdecodeMeta');

    preview.innerHTML = '';
    const previewImg = document.createElement('img');
    previewImg.src = img.src;
    previewImg.style.cssText = 'max-width:200px;max-height:200px;border-radius:6px;border:1px solid var(--border);background:#fff';
    preview.appendChild(previewImg);

    const data = result.data;
    _qrdecodeLastData = data;
    const type = _qrdecodeClassify(data);

    resultBox.innerHTML = '';
    const typeEl = document.createElement('div');
    typeEl.style.cssText = 'font-size:12px;color:var(--text-dim);margin-bottom:4px';
    typeEl.textContent = '类型: ' + type;
    resultBox.appendChild(typeEl);

    const dataEl = document.createElement('div');
    dataEl.style.cssText = 'font-family:var(--font);font-size:13px;background:var(--bg-input);padding:8px 10px;border-radius:4px;word-break:break-all;white-space:pre-wrap;max-height:160px;overflow:auto';
    dataEl.textContent = data;
    resultBox.appendChild(dataEl);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:6px;margin-top:8px;flex-wrap:wrap';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'sm outline';
    copyBtn.textContent = '复制内容';
    copyBtn.addEventListener('click', () => safeCopy(data, '已复制解析结果'));
    btnRow.appendChild(copyBtn);

    if (/^https?:\/\//i.test(data)) {
        const openBtn = document.createElement('button');
        openBtn.className = 'sm outline';
        openBtn.textContent = '打开链接';
        openBtn.addEventListener('click', () => window.open(data, '_blank', 'noopener'));
        btnRow.appendChild(openBtn);
    }

    const regenBtn = document.createElement('button');
    regenBtn.className = 'sm outline';
    regenBtn.innerHTML = '<i class="bi bi-arrow-left-right"></i> 用此内容生成二维码';
    regenBtn.addEventListener('click', () => qrdecodeGotoGenerate(data));
    btnRow.appendChild(regenBtn);

    resultBox.appendChild(btnRow);

    if (type === 'WiFi') {
        const wifi = _qrdecodeParseWifi(data);
        if (wifi) {
            const detail = document.createElement('div');
            detail.style.cssText = 'margin-top:8px;padding:8px;background:rgba(0,212,170,.05);border:1px solid var(--border);border-radius:4px;font-size:12px;line-height:1.7';
            detail.innerHTML = '<b>WiFi 信息:</b><br>网络名(SSID): ' + (wifi.ssid || '-') + '<br>密码: ' + (wifi.password || '-') + '<br>加密: ' + wifi.auth;
            resultBox.appendChild(detail);
        }
    } else if (type === 'vCard') {
        const v = _qrdecodeParseVcard(data);
        if (v.name || v.tel || v.email) {
            const detail = document.createElement('div');
            detail.style.cssText = 'margin-top:8px;padding:8px;background:rgba(0,212,170,.05);border:1px solid var(--border);border-radius:4px;font-size:12px;line-height:1.7';
            detail.innerHTML = '<b>联系人:</b><br>姓名: ' + (v.name || '-') + '<br>电话: ' + (v.tel || '-') + '<br>邮箱: ' + (v.email || '-');
            resultBox.appendChild(detail);
        }
    } else if (type === 'otpauth') {
        const detail = document.createElement('div');
        detail.style.cssText = 'margin-top:8px;padding:8px;background:rgba(167,139,250,.08);border:1px solid var(--border);border-radius:4px;font-size:12px;color:var(--accent)';
        detail.innerHTML = '💡 检测到 <b>otpauth</b> URI，可前往 <b>TOTP 动态令牌</b> 工具粘贴使用';
        resultBox.appendChild(detail);
    }

    meta.textContent = '✓ 解析成功';
    meta.style.color = 'var(--accent)';
    setStatus('✓ 二维码解析成功');
}

function _qrdecodeShowError(msg) {
    const preview = document.getElementById('qrdecodePreview');
    const resultBox = document.getElementById('qrdecodeResult');
    const meta = document.getElementById('qrdecodeMeta');
    preview.innerHTML = '<div style="color:var(--text-dim);font-size:12px;padding:40px 0;text-align:center">无预览</div>';
    resultBox.innerHTML = '';
    meta.textContent = '✗ ' + msg;
    meta.style.color = 'var(--danger)';
    setStatus('✗ ' + msg);
    _qrdecodeLastData = null;
}

async function qrdecodeHandleFile(file) {
    if (!file || !file.type.startsWith('image/')) {
        toast('请选择图片文件');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        toast('图片超过 5MB，已自动压缩');
    }
    try {
        let img = await _qrdecodeLoadImage(file);
        img = await _qrdecodeResize(img);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);

        const result = _qrdecodeDecode(canvas);
        if (result) {
            _qrdecodeShow(img, result);
        } else {
            _qrdecodeShowError('未识别到二维码（图片可能模糊或损坏）');
        }
    } catch (e) {
        _qrdecodeShowError('解析失败: ' + e.message);
        console.error(e);
    }
}

function qrdecodeGotoGenerate(data) {
    if (typeof openTool === 'function') {
        openTool('qrcode');
    } else {
        const allPanels = document.querySelectorAll('.tool-panel');
        allPanels.forEach(p => p.classList.remove('active'));
        const qrcodePanel = document.getElementById('panel-qrcode');
        if (qrcodePanel) qrcodePanel.classList.add('active');
    }
    setTimeout(() => {
        const input = document.getElementById('qrcodeInput');
        if (input) {
            input.value = data;
            input.focus();
            toast('已预填到二维码生成器，按"生成"即可');
        }
    }, 150);
}

function qrdecodeClear() {
    const fileInput = document.getElementById('qrdecodeFile');
    if (fileInput) fileInput.value = '';
    const preview = document.getElementById('qrdecodePreview');
    const resultBox = document.getElementById('qrdecodeResult');
    const meta = document.getElementById('qrdecodeMeta');
    preview.innerHTML = '<div style="color:var(--text-dim);font-size:12px;padding:40px 0;text-align:center">等待上传图片</div>';
    resultBox.innerHTML = '';
    meta.textContent = '等待上传';
    meta.style.color = 'var(--text-muted)';
    _qrdecodeLastData = null;
}

function qrdecodeInit() {
    const dropZone = document.getElementById('qrdecodeDrop');
    const fileInput = document.getElementById('qrdecodeFile');
    if (!dropZone || !fileInput) return;

    dropZone.addEventListener('click', e => {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') fileInput.click();
    });

    fileInput.addEventListener('change', e => {
        const file = e.target.files && e.target.files[0];
        if (file) qrdecodeHandleFile(file);
    });

    dropZone.addEventListener('dragover', e => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--accent)';
        dropZone.style.background = 'rgba(0,212,170,.06)';
    });
    dropZone.addEventListener('dragleave', e => {
        e.preventDefault();
        dropZone.style.borderColor = '';
        dropZone.style.background = '';
    });
    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.style.borderColor = '';
        dropZone.style.background = '';
        const file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) qrdecodeHandleFile(file);
    });

    document.addEventListener('paste', e => {
        if (!e.clipboardData) return;
        const items = e.clipboardData.items;
        for (const item of items) {
            if (item.type && item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                    qrdecodeHandleFile(file);
                    toast('已从剪贴板粘贴图片');
                    return;
                }
            }
        }
    });
}

registerInit('qrdecode', qrdecodeInit);
