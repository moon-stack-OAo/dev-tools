function charsetDetect() {
    const input = document.getElementById('charsetInput');
    const sel = document.getElementById('charsetEnc');
    const output = document.getElementById('charsetOutput');
    const raw = input.value;
    if (!raw) {
        output.textContent = '请先输入文本';
        return;
    }
    const bytes = new TextEncoder().encode(raw);
    const encodings = ['utf-8', 'gbk', 'gb2312', 'iso-8859-1', 'shift-jis', 'euc-kr', 'big5'];
    const results = [];
    for (const enc of encodings) {
        try {
            const decoded = new TextDecoder(enc, {fatal: true}).decode(bytes);
            if (decoded.length === raw.length) results.push(enc);
        } catch (e) {
            /* not this encoding */
        }
    }
    sel.value = results.includes('utf-8') ? 'utf-8' : results[0] || 'utf-8';
    charsetConvert();
}

function charsetConvert() {
    const input = document.getElementById('charsetInput');
    const enc = document.getElementById('charsetEnc').value;
    const output = document.getElementById('charsetOutput');
    try {
        const bytes = new TextEncoder().encode(input.value);
        const decoded = new TextDecoder(enc).decode(bytes);
        output.textContent = decoded;
    } catch (e) {
        output.textContent = '编码转换失败';
    }
}
