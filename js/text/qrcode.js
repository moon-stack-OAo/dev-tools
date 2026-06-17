// 二维码生成

let qrcodeCurrentDataUrl = null;

function qrcodeGenerate() {
    const text = document.getElementById('qrcodeInput').value;
    const canvas = document.getElementById('qrcodeCanvas');
    const meta = document.getElementById('qrcodeMeta');
    if (!text) {
        meta.textContent = '请输入内容';
        meta.style.color = 'var(--danger)';
        return;
    }
    if (typeof QRCode === 'undefined') {
        meta.textContent = 'qrcode 库未加载';
        meta.style.color = 'var(--danger)';
        return;
    }
    const level = document.getElementById('qrcodeLevel').value;
    const size = Math.max(64, Math.min(1024, parseInt(document.getElementById('qrcodeSize').value, 10) || 256));
    const margin = Math.max(0, Math.min(32, parseInt(document.getElementById('qrcodeMargin').value, 10) || 4));
    const fg = document.getElementById('qrcodeFgText').value || '#000000';
    const bg = document.getElementById('qrcodeBgText').value || '#ffffff';
    const opts = {
        errorCorrectionLevel: level,
        width: size,
        margin: margin,
        color: {dark: fg, light: bg}
    };
    QRCode.toCanvas(canvas, text, opts, err => {
        if (err) {
            meta.textContent = '生成失败: ' + err.message;
            meta.style.color = 'var(--danger)';
            qrcodeCurrentDataUrl = null;
            return;
        }
        qrcodeCurrentDataUrl = canvas.toDataURL('image/png');
        meta.style.color = 'var(--text-muted)';
        meta.textContent = `尺寸 ${canvas.width}×${canvas.height} · 纠错 ${level} · 边距 ${margin} · 长度 ${text.length} 字符`;
        setStatus('二维码生成成功');
    });
}

function qrcodeDownload() {
    if (!qrcodeCurrentDataUrl) {
        toast('请先生成二维码');
        return;
    }
    const a = document.createElement('a');
    a.href = qrcodeCurrentDataUrl;
    a.download = 'qrcode.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast('已下载 qrcode.png');
}

async function qrcodeCopyImage() {
    if (!qrcodeCurrentDataUrl) {
        toast('请先生成二维码');
        return;
    }
    const canvas = document.getElementById('qrcodeCanvas');
    if (!navigator.clipboard || !window.ClipboardItem) {
        toast('当前浏览器不支持图片复制');
        return;
    }
    try {
        const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
        await navigator.clipboard.write([new ClipboardItem({'image/png': blob})]);
        toast('图片已复制到剪贴板');
    } catch (e) {
        toast('复制图片失败: ' + e.message);
    }
}

function qrcodeSyncColor(pickerId, textId) {
    const picker = document.getElementById(pickerId);
    const text = document.getElementById(textId);
    text.value = picker.value;
    text.style.borderColor = picker.value;
}

// 事件代理
document.addEventListener('input', e => {
    if (!e.target) return;
    if (e.target.id === 'qrcodeFg') qrcodeSyncColor('qrcodeFg', 'qrcodeFgText');
    if (e.target.id === 'qrcodeBg') qrcodeSyncColor('qrcodeBg', 'qrcodeBgText');
    if (e.target.id === 'qrcodeFgText' || e.target.id === 'qrcodeBgText') {
        const v = e.target.value.trim();
        if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) {
            e.target.style.borderColor = v;
        }
    }
});
