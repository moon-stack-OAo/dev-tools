// AES 加密 / 解密（AES-256-CBC / AES-256-GCM）
// 使用随机 Salt（PBKDF2）+ 随机 IV

const SALT_SIZE = 16;   // 128 bit
const IV_SIZE = 16;     // 128 bit

async function aesDeriveKey(pwd, salt) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pwd), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
        {name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256'},
        key,
        {name: 'AES-GCM', length: 256},  // deriveKey 时 name 不影响派生，最终加解密会按 mode 使用
        false,
        ['encrypt', 'decrypt']
    );
}

async function aesEncrypt() {
    const input = document.getElementById('aesInput').value;
    const pwd = document.getElementById('aesPwd').value;
    const mode = document.getElementById('aesMode').value;
    const out = document.getElementById('aesOutput');
    if (!input || !pwd) {
        out.textContent = '请输入明文和密码';
        return;
    }
    try {
        const salt = crypto.getRandomValues(new Uint8Array(SALT_SIZE));
        const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE));
        const key = await aesDeriveKey(pwd, salt);
        const algoName = mode === 'gcm' ? 'AES-GCM' : 'AES-CBC';
        const data = new TextEncoder().encode(input);
        const encrypted = await crypto.subtle.encrypt({name: algoName, iv}, key, data);
        // 组装：salt(16) + iv(16) + ciphertext
        const combined = new Uint8Array(SALT_SIZE + IV_SIZE + encrypted.byteLength);
        combined.set(salt);
        combined.set(iv, SALT_SIZE);
        combined.set(new Uint8Array(encrypted), SALT_SIZE + IV_SIZE);
        out.textContent = btoa(String.fromCharCode(...combined));
    } catch (e) {
        out.textContent = '加密失败: ' + e.message;
    }
}

async function aesDecrypt() {
    const input = document.getElementById('aesInput').value;
    const pwd = document.getElementById('aesPwd').value;
    const mode = document.getElementById('aesMode').value;
    const out = document.getElementById('aesOutput');
    if (!input || !pwd) {
        out.textContent = '请输入密文和密码';
        return;
    }
    try {
        const raw = Uint8Array.from(atob(input.trim()), c => c.charCodeAt(0));
        if (raw.length < SALT_SIZE + IV_SIZE) {
            out.textContent = '密文数据太短';
            return;
        }
        const salt = raw.slice(0, SALT_SIZE);
        const iv = raw.slice(SALT_SIZE, SALT_SIZE + IV_SIZE);
        const data = raw.slice(SALT_SIZE + IV_SIZE);
        const key = await aesDeriveKey(pwd, salt);
        const algoName = mode === 'gcm' ? 'AES-GCM' : 'AES-CBC';
        const decrypted = await crypto.subtle.decrypt({name: algoName, iv}, key, data);
        out.textContent = new TextDecoder().decode(decrypted);
    } catch (e) {
        out.textContent = '解密失败: 密码错误或数据损坏';
    }
}
