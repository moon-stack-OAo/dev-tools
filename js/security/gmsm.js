// 国密 SM2 / SM3 / SM4
// 依赖：window.sm2 / window.sm3 / window.sm4（由 /lib/sm2.min.js, sm3.min.js, sm4.min.js 提供）

function hexToBase64(hex) {
    if (hex.length % 2 !== 0) {
        hex = '0' + hex;  // 奇数长度补前导零，保持兼容
    }
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
}

function base64ToHex(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function gmsmSwitchTab(tab) {
    const tabs = document.querySelectorAll('#panel-gmsm .tab-bar .tab');
    const contents = document.querySelectorAll('#panel-gmsm .tab-content');
    tabs.forEach(t => t.classList.toggle('active', t.textContent.trim() === tab));
    contents.forEach(c => c.classList.toggle('active', c.id === 'gmsmTab-' + tab));
}

function ensureSmLoaded() {
    if (typeof window.sm3 === 'undefined' || typeof window.sm4 === 'undefined' || typeof window.sm2 === 'undefined') {
        toast('国密库未加载');
        return false;
    }
    return true;
}

function gmsmClear() {
    document.getElementById('sm3Input').value = '';
    document.getElementById('sm3Output').textContent = '';
    document.getElementById('sm4Input').value = '';
    document.getElementById('sm4Pwd').value = '';
    document.getElementById('sm4Iv').value = '';
    document.getElementById('sm4Output').textContent = '';
    document.getElementById('sm2PubKey').value = '';
    document.getElementById('sm2PrivKey').value = '';
    document.getElementById('sm2Input').value = '';
    document.getElementById('sm2Output').textContent = '';
    document.getElementById('sm2SigInput').value = '';
    document.getElementById('sm2SigOut').value = '';
    document.getElementById('sm2SigCheckInput').value = '';
    document.getElementById('sm2SigCheckSig').value = '';
    document.getElementById('sm2SigCheckResult').textContent = '';
    setStatus('已清空');
}

// === SM3 ===
function gmsmSm3() {
    if (!ensureSmLoaded()) return;
    const input = document.getElementById('sm3Input').value;
    const out = document.getElementById('sm3Output');
    if (!input) { out.textContent = '请输入文本'; out.className = 'output-box error'; return; }
    try {
        const hash = window.sm3(input);
        out.textContent = hash;
        out.className = 'output-box';
        setStatus('SM3 计算完成');
    } catch (e) {
        out.textContent = '计算失败: ' + e.message;
        out.className = 'output-box error';
    }
}

// === SM4 ===
function gmsmSm4Encrypt() {
    if (!ensureSmLoaded()) return;
    const input = document.getElementById('sm4Input').value;
    const pwd = document.getElementById('sm4Pwd').value;
    const iv = document.getElementById('sm4Iv').value.trim();
    const out = document.getElementById('sm4Output');
    if (!input) { out.textContent = '请输入明文'; out.className = 'output-box error'; return; }
    if (!pwd || pwd.length !== 16) { out.textContent = 'SM4 密钥必须为 16 个字符（128 bit）'; out.className = 'output-box error'; return; }
    try {
        const opts = { mode: 'cbc', padding: 'pkcs#7' };
        if (iv) {
            if (iv.length !== 16) { out.textContent = 'IV 必须为 16 个字符（128 bit）'; out.className = 'output-box error'; return; }
            opts.iv = iv;
        }
        const ct = window.sm4.encrypt(input, pwd, opts);
        out.textContent = ct;
        out.className = 'output-box';
        setStatus('SM4 加密完成');
    } catch (e) {
        out.textContent = '加密失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function gmsmSm4Decrypt() {
    if (!ensureSmLoaded()) return;
    const input = document.getElementById('sm4Input').value.trim();
    const pwd = document.getElementById('sm4Pwd').value;
    const iv = document.getElementById('sm4Iv').value.trim();
    const out = document.getElementById('sm4Output');
    if (!input) { out.textContent = '请输入密文 (Base64)'; out.className = 'output-box error'; return; }
    if (!pwd || pwd.length !== 16) { out.textContent = 'SM4 密钥必须为 16 个字符（128 bit）'; out.className = 'output-box error'; return; }
    try {
        const opts = { mode: 'cbc', padding: 'pkcs#7' };
        if (iv) {
            if (iv.length !== 16) { out.textContent = 'IV 必须为 16 个字符（128 bit）'; out.className = 'output-box error'; return; }
            opts.iv = iv;
        }
        const pt = window.sm4.decrypt(input, pwd, opts);
        out.textContent = pt;
        out.className = 'output-box';
        setStatus('SM4 解密完成');
    } catch (e) {
        out.textContent = '解密失败: ' + e.message;
        out.className = 'output-box error';
    }
}

// === SM2 ===
function gmsmSm2Gen() {
    if (!ensureSmLoaded()) return;
    const out = document.getElementById('sm2Output');
    try {
        const kp = window.sm2.generateKeyPairHex();
        document.getElementById('sm2PrivKey').value = kp.privateKey;
        document.getElementById('sm2PubKey').value = kp.publicKey;
        out.textContent = '已生成 SM2 密钥对（hex 编码，长度 64 / 130）';
        out.className = 'output-box';
        setStatus('SM2 密钥对已生成');
    } catch (e) {
        out.textContent = '生成失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function gmsmSm2Encrypt() {
    if (!ensureSmLoaded()) return;
    const input = document.getElementById('sm2Input').value;
    const pubKey = document.getElementById('sm2PubKey').value.trim();
    const out = document.getElementById('sm2Output');
    if (!input) { out.textContent = '请输入明文'; out.className = 'output-box error'; return; }
    if (!pubKey) { out.textContent = '请先生成密钥对或粘贴公钥'; out.className = 'output-box error'; return; }
    try {
        const ct = window.sm2.doEncrypt(input, pubKey);
        out.textContent = ct;
        out.className = 'output-box';
        setStatus('SM2 加密完成（C1C3C2 模式）');
    } catch (e) {
        out.textContent = '加密失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function gmsmSm2Decrypt() {
    if (!ensureSmLoaded()) return;
    const input = document.getElementById('sm2Input').value.trim();
    const privKey = document.getElementById('sm2PrivKey').value.trim();
    const out = document.getElementById('sm2Output');
    if (!input) { out.textContent = '请输入密文 (hex)'; out.className = 'output-box error'; return; }
    if (!privKey) { out.textContent = '请先生成密钥对或粘贴私钥'; out.className = 'output-box error'; return; }
    try {
        const pt = window.sm2.doDecrypt(input, privKey);
        out.textContent = pt;
        out.className = 'output-box';
        setStatus('SM2 解密完成');
    } catch (e) {
        out.textContent = '解密失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function gmsmSm2Sign() {
    if (!ensureSmLoaded()) return;
    const input = document.getElementById('sm2SigInput').value;
    const privKey = document.getElementById('sm2PrivKey').value.trim();
    const out = document.getElementById('sm2SigOut');
    if (!input) { out.value = '请输入原文'; return; }
    if (!privKey) { out.value = '请先生成密钥对'; return; }
    try {
        const sigHex = window.sm2.doSignature(input, privKey);
        out.value = hexToBase64(sigHex);
        setStatus('SM2 签名完成 (withSM3)');
    } catch (e) {
        out.value = '签名失败: ' + e.message;
    }
}

function gmsmSm2Verify() {
    if (!ensureSmLoaded()) return;
    const input = document.getElementById('sm2SigCheckInput').value;
    const sigB64 = document.getElementById('sm2SigCheckSig').value.trim();
    const pubKey = document.getElementById('sm2PubKey').value.trim();
    const out = document.getElementById('sm2SigCheckResult');
    if (!input || !sigB64 || !pubKey) {
        out.textContent = '请输入原文、签名和公钥';
        out.className = 'output-box error';
        return;
    }
    try {
        let sigHex;
        try {
            sigHex = base64ToHex(sigB64);
        } catch (e) {
            sigHex = sigB64;
        }
        const ok = window.sm2.doVerifySignature(input, sigHex, pubKey);
        out.textContent = ok ? '✓ 验签通过' : '✗ 验签失败';
        out.className = 'output-box' + (ok ? '' : ' error');
        out.style.color = ok ? 'var(--accent)' : 'var(--danger)';
        setStatus(ok ? 'SM2 验签通过' : 'SM2 验签失败');
    } catch (e) {
        out.textContent = '验签失败: ' + e.message;
        out.className = 'output-box error';
    }
}
