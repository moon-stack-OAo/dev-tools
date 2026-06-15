const AES_SALT = new Uint8Array([16, 32, 48, 64, 80, 96, 112, 128]);

async function aesDeriveKey(pwd, mode) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pwd), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: AES_SALT, iterations: 10000, hash: 'SHA-256' },
        key, { name: mode === 'gcm' ? 'AES-GCM' : 'AES-CBC', length: 256 }, false, ['encrypt', 'decrypt']);
}

async function aesEncrypt() {
    const input = document.getElementById('aesInput').value;
    const pwd = document.getElementById('aesPwd').value;
    const mode = document.getElementById('aesMode').value;
    const out = document.getElementById('aesOutput');
    if (!input || !pwd) { out.textContent = '请输入明文和密码'; return; }
    try {
        const iv = crypto.getRandomValues(new Uint8Array(16));
        const key = await aesDeriveKey(pwd, mode);
        const data = new TextEncoder().encode(input);
        const encrypted = await crypto.subtle.encrypt({ name: mode === 'gcm' ? 'AES-GCM' : 'AES-CBC', iv }, key, data);
        const combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv); combined.set(new Uint8Array(encrypted), iv.length);
        out.textContent = btoa(String.fromCharCode(...combined));
    } catch (e) { out.textContent = '加密失败: ' + e.message; }
}

async function aesDecrypt() {
    const input = document.getElementById('aesInput').value;
    const pwd = document.getElementById('aesPwd').value;
    const mode = document.getElementById('aesMode').value;
    const out = document.getElementById('aesOutput');
    if (!input || !pwd) { out.textContent = '请输入密文和密码'; return; }
    try {
        const raw = Uint8Array.from(atob(input.trim()), c => c.charCodeAt(0));
        const iv = raw.slice(0, 16);
        const data = raw.slice(16);
        const key = await aesDeriveKey(pwd, mode);
        const decrypted = await crypto.subtle.decrypt({ name: mode === 'gcm' ? 'AES-GCM' : 'AES-CBC', iv }, key, data);
        out.textContent = new TextDecoder().decode(decrypted);
    } catch (e) { out.textContent = '解密失败: 密码错误或数据损坏'; }
}
