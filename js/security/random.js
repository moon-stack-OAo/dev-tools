function randGen(len, chars) {
    const n = chars.length;
    const maxValid = 256 - (256 % n);
    let result = '';
    const arr = new Uint8Array(len);
    let remaining = len;
    let attempts = 0;
    while (remaining > 0) {
        crypto.getRandomValues(arr.subarray(0, remaining));
        let written = 0;
        for (let i = 0; i < remaining; i++) {
            if (arr[i] < maxValid) {
                result += chars[arr[i] % n];
                written++;
            }
        }
        remaining -= written;
        attempts++;
        if (attempts > 100) break;
    }
    return result;
}

function randPassword() {
    const len = parseInt(document.getElementById('randomLen').value) || 16;
    let chars = '';
    if (document.getElementById('randUpper').checked) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (document.getElementById('randLower').checked) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (document.getElementById('randDigit').checked) chars += '0123456789';
    if (document.getElementById('randSpecial').checked) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    if (!chars) {
        toast('请至少选择一个字符集');
        return;
    }
    const list = document.getElementById('randomList');
    const div = document.createElement('div');
    div.className = 'uuid-item';
    div.innerHTML = `<span>${randGen(len, chars)}</span><button class="sm outline" onclick="copyText(this.parentElement.querySelector('span'))">复制</button>`;
    list.insertBefore(div, list.firstChild);
    while (list.children.length > 20) list.removeChild(list.lastChild);
    setStatus('密码已生成');
}

function randToken() {
    const len = parseInt(document.getElementById('randomLen').value) || 32;
    const bytes = new Uint8Array(len);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const list = document.getElementById('randomList');
    const div = document.createElement('div');
    div.className = 'uuid-item';
    div.innerHTML = `<span>${hex}</span><button class="sm outline" onclick="copyText(this.parentElement.querySelector('span'))">复制</button>`;
    list.insertBefore(div, list.firstChild);
    while (list.children.length > 20) list.removeChild(list.lastChild);
    setStatus('Hex Token 已生成');
}

function randPin() {
    const digits = '0123456789';
    const pin = randGen(6, digits);
    const list = document.getElementById('randomList');
    const div = document.createElement('div');
    div.className = 'uuid-item';
    div.innerHTML = `<span>${pin}</span><button class="sm outline" onclick="copyText(this.parentElement.querySelector('span'))">复制</button>`;
    list.insertBefore(div, list.firstChild);
    while (list.children.length > 20) list.removeChild(list.lastChild);
    setStatus('PIN 已生成');
}

function randomClear() {
    document.getElementById('randomList').innerHTML = '<div style="color:var(--text-dim);font-size:13px;padding:8px 0">点击按钮生成随机内容</div>';
    setStatus('已清空');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { randGen };
}
