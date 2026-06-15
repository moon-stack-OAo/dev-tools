function javaEscape() {
    const raw = document.getElementById('javaInput').value;
    const out = document.getElementById('javaOutput');
    if (!raw) {
        out.textContent = '请输入内容';
        out.className = 'output-box error';
        return;
    }
    let r = raw;
    r = r.replace(/\\/g, '\\\\');
    r = r.replace(/\t/g, '\\t');
    r = r.replace(/\n/g, '\\n');
    r = r.replace(/\r/g, '\\r');
    r = r.replace(/\f/g, '\\f');
    r = r.replace(/\b/g, '\\b');
    r = r.replace(/"/g, '\\"');
    out.textContent = r;
    out.className = 'output-box';
    setStatus('Java 转义完成');
}

function javaUnescape() {
    const raw = document.getElementById('javaInput').value;
    const out = document.getElementById('javaOutput');
    if (!raw) {
        out.textContent = '请输入内容';
        out.className = 'output-box error';
        return;
    }
    try {
        let r = raw;
        r = r.replace(/\\t/g, '\t');
        r = r.replace(/\\n/g, '\n');
        r = r.replace(/\\r/g, '\r');
        r = r.replace(/\\f/g, '\f');
        r = r.replace(/\\b/g, '\b');
        r = r.replace(/\\"/g, '"');
        r = r.replace(/\\\\/g, '\\');
        r = r.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
        out.textContent = r;
        out.className = 'output-box';
        setStatus('Java 反转义完成');
    } catch (e) {
        out.textContent = '反转义失败: ' + e.message;
        out.className = 'output-box error';
    }
}
