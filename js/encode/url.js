function urlEncode() {
    const raw = document.getElementById('urlInput').value;
    const out = document.getElementById('urlOutput');
    if (!raw) {
        out.textContent = '请输入内容';
        out.className = 'output-box error';
        return;
    }
    try {
        out.textContent = document.getElementById('urlComponent').checked ? encodeURIComponent(raw) : encodeURI(raw);
        out.className = 'output-box';
        setStatus('URL 编码成功');
    } catch (e) {
        out.textContent = '编码失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function urlDecode() {
    const raw = document.getElementById('urlInput').value;
    const out = document.getElementById('urlOutput');
    if (!raw) {
        out.textContent = '请输入内容';
        out.className = 'output-box error';
        return;
    }
    try {
        out.textContent = document.getElementById('urlComponent').checked ? decodeURIComponent(raw) : decodeURI(raw);
        out.className = 'output-box';
        setStatus('URL 解码成功');
    } catch (e) {
        out.textContent = '解码失败: ' + e.message;
        out.className = 'output-box error';
    }
}
