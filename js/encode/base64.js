function b64Encode() {
    const raw = document.getElementById('b64Input').value;
    const out = document.getElementById('b64Output');
    if (!raw) {
        out.textContent = '请输入内容';
        out.className = 'output-box error';
        return;
    }
    try {
        let enc = btoa(unescape(encodeURIComponent(raw)));
        if (document.getElementById('b64UrlSafe').checked) enc = enc.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        out.textContent = enc;
        out.className = 'output-box';
        setStatus('编码成功');
    } catch (e) {
        out.textContent = '编码失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function b64Decode() {
    const raw = document.getElementById('b64Input').value;
    const out = document.getElementById('b64Output');
    if (!raw) {
        out.textContent = '请输入内容';
        out.className = 'output-box error';
        return;
    }
    try {
        let p = raw;
        if (document.getElementById('b64UrlSafe').checked) {
            p = p.replace(/-/g, '+').replace(/_/g, '/');
            while (p.length % 4) p += '=';
        }
        out.textContent = decodeURIComponent(escape(atob(p)));
        out.className = 'output-box';
        setStatus('解码成功');
    } catch (e) {
        out.textContent = '解码失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function b64FileEncode() {
    const file = document.getElementById('b64File').files[0];
    const out = document.getElementById('b64Output');
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        out.textContent = reader.result.split(',')[1];
        out.className = 'output-box';
        setStatus('文件 Base64 编码完成，大小: ' + file.size + ' bytes');
    };
    reader.onerror = () => {
        out.textContent = '读取文件失败';
        out.className = 'output-box error';
    };
    reader.readAsDataURL(file);
}
