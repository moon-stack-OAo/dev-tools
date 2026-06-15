function unicodeEncode() {
    const raw = document.getElementById('unicodeInput').value;
    const out = document.getElementById('unicodeOutput');
    if (!raw) {
        out.textContent = '请输入内容';
        out.className = 'output-box error';
        return;
    }
    let r = '';
    for (const ch of raw) {
        const code = ch.charCodeAt(0);
        if (code < 0x80 && ch !== '\\') r += ch;
        else r += '\\u' + code.toString(16).padStart(4, '0');
    }
    out.textContent = r;
    out.className = 'output-box';
    setStatus('Unicode 编码完成');
}

function unicodeDecode() {
    const raw = document.getElementById('unicodeInput').value;
    const out = document.getElementById('unicodeOutput');
    if (!raw) {
        out.textContent = '请输入内容';
        out.className = 'output-box error';
        return;
    }
    try {
        let r = raw;
        const hasUnicodeEscape = /\\u[0-9a-fA-F]{4}/.test(r);
        if (hasUnicodeEscape) {
            r = r.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
        } else {
            r = raw;
        }
        out.textContent = r;
        out.className = 'output-box';
        setStatus('Unicode 解码完成');
    } catch (e) {
        out.textContent = '解码失败: ' + e.message;
        out.className = 'output-box error';
    }
}
