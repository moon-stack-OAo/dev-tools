let rsaKeyPair = null;

async function rsaGenKeys() {
    const out = document.getElementById('rsaOutput');
    const bits = parseInt(document.getElementById('rsaBits').value);
    try {
        rsaKeyPair = await crypto.subtle.generateKey(
            {name: 'RSA-OAEP', modulusLength: bits, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256'},
            true, ['encrypt', 'decrypt']);
        const pub = await crypto.subtle.exportKey('spki', rsaKeyPair.publicKey);
        const priv = await crypto.subtle.exportKey('pkcs8', rsaKeyPair.privateKey);
        const pubB64 = btoa(String.fromCharCode(...new Uint8Array(pub)));
        const privB64 = btoa(String.fromCharCode(...new Uint8Array(priv)));
        document.getElementById('rsaPubKey').value = pubB64;
        document.getElementById('rsaPrivKey').value = privB64;
        out.textContent = '密钥对生成成功 (' + bits + ' bit)';
    } catch (e) {
        out.textContent = '生成失败: ' + e.message;
    }
}

async function rsaEncrypt() {
    const out = document.getElementById('rsaOutput');
    const input = document.getElementById('rsaInput').value;
    let pubKey = document.getElementById('rsaPubKey').value.trim();
    if (!input) {
        out.textContent = '请输入明文';
        return;
    }
    try {
        let key;
        if (pubKey) {
            const raw = Uint8Array.from(atob(pubKey), c => c.charCodeAt(0));
            key = await crypto.subtle.importKey('spki', raw, {name: 'RSA-OAEP', hash: 'SHA-256'}, false, ['encrypt']);
        } else if (rsaKeyPair) {
            key = rsaKeyPair.publicKey;
        } else {
            out.textContent = '请先生成密钥对或粘贴公钥';
            return;
        }
        const encrypted = await crypto.subtle.encrypt({name: 'RSA-OAEP'}, key, new TextEncoder().encode(input));
        out.textContent = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
    } catch (e) {
        out.textContent = '加密失败: ' + e.message;
    }
}

async function rsaDecrypt() {
    const out = document.getElementById('rsaOutput');
    const input = document.getElementById('rsaInput').value;
    let privKey = document.getElementById('rsaPrivKey').value.trim();
    if (!input) {
        out.textContent = '请输入密文';
        return;
    }
    try {
        let key;
        if (privKey) {
            const raw = Uint8Array.from(atob(privKey), c => c.charCodeAt(0));
            key = await crypto.subtle.importKey('pkcs8', raw, {name: 'RSA-OAEP', hash: 'SHA-256'}, false, ['decrypt']);
        } else if (rsaKeyPair) {
            key = rsaKeyPair.privateKey;
        } else {
            out.textContent = '请先生成密钥对或粘贴私钥';
            return;
        }
        const raw = Uint8Array.from(atob(input.trim()), c => c.charCodeAt(0));
        const decrypted = await crypto.subtle.decrypt({name: 'RSA-OAEP'}, key, raw);
        out.textContent = new TextDecoder().decode(decrypted);
    } catch (e) {
        out.textContent = '解密失败: ' + e.message;
    }
}
