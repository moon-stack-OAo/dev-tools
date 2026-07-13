// AES 加密 / 解密（AES-256-CBC / AES-256-GCM）
// 使用随机 Salt（PBKDF2）+ 随机 IV

const SALT_SIZE = 16; // 128 bit
const IV_SIZE = 16; // 128 bit

/** 将 Uint8Array 转为 Base64，分块避免大数组栈溢出 */
function aesBytesToBase64(bytes) {
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
}

/** 将 Base64 转为 Uint8Array */
function aesBase64ToBytes(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
}

/**
 * 按加解密模式派生 AES-256 密钥。
 * Web Crypto 要求 deriveKey 的 algorithm.name 与后续 encrypt/decrypt 一致。
 * @param {string} pwd
 * @param {BufferSource} salt
 * @param {'gcm'|'cbc'|string} mode
 */
async function aesDeriveKey(pwd, salt, mode) {
    const algoName = mode === 'gcm' ? 'AES-GCM' : 'AES-CBC';
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(pwd),
        'PBKDF2',
        false,
        ['deriveKey'],
    );
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        key,
        { name: algoName, length: 256 },
        false,
        ['encrypt', 'decrypt'],
    );
}

/**
 * 纯函数：AES 加密，返回 Base64（salt + iv + ciphertext）
 * @param {string} plaintext
 * @param {string} password
 * @param {'gcm'|'cbc'|string} mode
 * @returns {Promise<string>}
 */
async function aesEncryptData(plaintext, password, mode) {
    if (!plaintext || !password) {
        throw new Error('请输入明文和密码');
    }
    const salt = crypto.getRandomValues(new Uint8Array(SALT_SIZE));
    const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE));
    const key = await aesDeriveKey(password, salt, mode);
    const algoName = mode === 'gcm' ? 'AES-GCM' : 'AES-CBC';
    const data = new TextEncoder().encode(plaintext);
    const encrypted = await crypto.subtle.encrypt({ name: algoName, iv }, key, data);
    const combined = new Uint8Array(SALT_SIZE + IV_SIZE + encrypted.byteLength);
    combined.set(salt);
    combined.set(iv, SALT_SIZE);
    combined.set(new Uint8Array(encrypted), SALT_SIZE + IV_SIZE);
    return aesBytesToBase64(combined);
}

/**
 * 纯函数：AES 解密
 * @param {string} ciphertextB64
 * @param {string} password
 * @param {'gcm'|'cbc'|string} mode
 * @returns {Promise<string>}
 */
async function aesDecryptData(ciphertextB64, password, mode) {
    if (!ciphertextB64 || !password) {
        throw new Error('请输入密文和密码');
    }
    const raw = aesBase64ToBytes(ciphertextB64.trim());
    if (raw.length < SALT_SIZE + IV_SIZE) {
        throw new Error('密文数据太短');
    }
    const salt = raw.slice(0, SALT_SIZE);
    const iv = raw.slice(SALT_SIZE, SALT_SIZE + IV_SIZE);
    const data = raw.slice(SALT_SIZE + IV_SIZE);
    const key = await aesDeriveKey(password, salt, mode);
    const algoName = mode === 'gcm' ? 'AES-GCM' : 'AES-CBC';
    const decrypted = await crypto.subtle.decrypt({ name: algoName, iv }, key, data);
    return new TextDecoder().decode(decrypted);
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
        out.textContent = await aesEncryptData(input, pwd, mode);
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
        out.textContent = await aesDecryptData(input, pwd, mode);
    } catch (e) {
        out.textContent = '解密失败: 密码错误或数据损坏';
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SALT_SIZE,
        IV_SIZE,
        aesDeriveKey,
        aesEncryptData,
        aesDecryptData,
        aesBytesToBase64,
        aesBase64ToBytes,
    };
}
