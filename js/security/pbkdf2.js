// T11 PBKDF2 密码哈希工具
// 仅实现 PBKDF2（Web Crypto API），Argon2 待后续增强
// 完全本地运行，使用浏览器原生 crypto.subtle.deriveBits
// 输出标准 PHC 格式：$pbkdf2-sha256$iterations$salt_b64$hash_b64

// === 1. 核心算法 ===
async function pbkdf2(password, salt, iterations, dkLen, algorithm) {
    if (algorithm == null) algorithm = 'SHA-256';
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        {name: 'PBKDF2'},
        false,
        ['deriveBits']
    );
    const saltBytes = typeof salt === 'string' ? enc.encode(salt) : salt;
    const bits = await crypto.subtle.deriveBits(
        {name: 'PBKDF2', salt: saltBytes, iterations: iterations, hash: algorithm},
        keyMaterial,
        dkLen * 8
    );
    return new Uint8Array(bits);
}

// === 2. Base64 编解码（标准非 URL-safe）===
function bytesToBase64(bytes) {
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
}

function base64ToBytes(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
}

function bytesToHex(bytes) {
    return Array.from(bytes).map(function (b) {
        return b.toString(16).padStart(2, '0');
    }).join('');
}

// === 3. 标准 PHC 格式编解码 ===
function formatPBKDF2(algorithm, iterations, salt, hash) {
    const algoName = algorithm === 'SHA-512' ? 'pbkdf2-sha512' : 'pbkdf2-sha256';
    return '$' + algoName + '$' + iterations + '$' + bytesToBase64(salt) + '$' + bytesToBase64(hash);
}

function parsePBKDF2(formatted) {
    if (!formatted || typeof formatted !== 'string') {
        throw new Error('格式字符串不能为空');
    }
    const trimmed = formatted.trim();
    const parts = trimmed.split('$');
    if (parts.length !== 5 || parts[0] !== '') {
        throw new Error('格式错误，应为: $pbkdf2-sha256$iterations$salt$hash');
    }
    const algo = parts[1].toLowerCase();
    if (algo !== 'pbkdf2-sha256' && algo !== 'pbkdf2-sha512') {
        throw new Error('不支持的算法: ' + parts[1]);
    }
    const iterations = parseInt(parts[2], 10);
    if (!Number.isFinite(iterations) || iterations < 1) {
        throw new Error('iterations 无效: ' + parts[2]);
    }
    let salt;
    let hash;
    try {
        salt = base64ToBytes(parts[3]);
        hash = base64ToBytes(parts[4]);
    } catch (e) {
        throw new Error('Base64 解码失败: ' + e.message);
    }
    return {
        algorithm: algo === 'pbkdf2-sha512' ? 'SHA-512' : 'SHA-256',
        iterations: iterations,
        salt: salt,
        hash: hash,
    };
}

// === 4. 常时间比较（防时序攻击）===
function constantTimeEquals(a, b) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
}

// === 5. Salt 随机生成 ===
function randomSalt(length) {
    return crypto.getRandomValues(new Uint8Array(length));
}

// ============================================================
// === UI 控制 ===
// ============================================================
let _pbkdf2LastFormatted = '';

function _pbkdf2ReadConfig() {
    const algoRadio = document.querySelector('input[name="pbkdf2Algo"]:checked');
    const algo = algoRadio ? algoRadio.value : 'SHA-256';
    const password = document.getElementById('pbkdf2Password').value;
    const saltLen = parseInt(document.getElementById('pbkdf2SaltLen').value, 10) || 16;
    const iterations = parseInt(document.getElementById('pbkdf2Iterations').value, 10) || 100000;
    const dkLen = parseInt(document.getElementById('pbkdf2DkLen').value, 10) || 32;
    return {algo: algo, password: password, saltLen: saltLen, iterations: iterations, dkLen: dkLen};
}

function _pbkdf2ShowOutput(formatted, hashBytes, iterations, elapsedMs) {
    document.getElementById('pbkdf2Output').textContent = formatted;
    document.getElementById('pbkdf2HashHex').textContent = bytesToHex(hashBytes);
    const meta = document.getElementById('pbkdf2Meta');
    meta.style.color = 'var(--text-muted)';
    meta.textContent = hashBytes.length * 8 + ' bit · ' + iterations.toLocaleString() + ' 次迭代 · ' + elapsedMs + ' ms';
    _pbkdf2LastFormatted = formatted;
}

function _pbkdf2ShowError(msg) {
    document.getElementById('pbkdf2Output').textContent = '';
    document.getElementById('pbkdf2HashHex').textContent = '';
    const meta = document.getElementById('pbkdf2Meta');
    meta.style.color = 'var(--danger)';
    meta.textContent = '✗ ' + msg;
    _pbkdf2LastFormatted = '';
}

async function pbkdf2Generate() {
    const cfg = _pbkdf2ReadConfig();
    if (!cfg.password) {
        toast('请输入密码');
        return;
    }
    if (cfg.iterations < 1) {
        toast('iterations 必须 ≥ 1');
        return;
    }
    const btn = document.querySelector('#panel-pbkdf2 button[onclick="pbkdf2Generate()"]');
    if (btn) {
        btn.disabled = true;
        btn.textContent = '计算中…';
    }
    const meta = document.getElementById('pbkdf2Meta');
    meta.style.color = 'var(--accent)';
    meta.textContent = '正在计算（UI 不会冻结）…';
    const start = performance.now();
    try {
        const salt = randomSalt(cfg.saltLen);
        const hash = await pbkdf2(cfg.password, salt, cfg.iterations, cfg.dkLen, cfg.algo);
        const elapsed = Math.round(performance.now() - start);
        const formatted = formatPBKDF2(cfg.algo, cfg.iterations, salt, hash);
        _pbkdf2ShowOutput(formatted, hash, cfg.iterations, elapsed);
        setStatus('✓ PBKDF2-' + cfg.algo + ' 计算完成（' + elapsed + ' ms）');
    } catch (e) {
        _pbkdf2ShowError(e.message);
        toast('生成失败: ' + e.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '生成哈希';
        }
    }
}

async function pbkdf2Verify() {
    const password = document.getElementById('pbkdf2VerifyPwd').value;
    const out = document.getElementById('pbkdf2VerifyOutput');
    if (!_pbkdf2LastFormatted) {
        out.textContent = '请先生成哈希';
        out.style.color = 'var(--danger)';
        return;
    }
    if (!password) {
        out.textContent = '请输入待验证密码';
        out.style.color = 'var(--danger)';
        return;
    }
    try {
        const params = parsePBKDF2(_pbkdf2LastFormatted);
        const start = performance.now();
        const hash = await pbkdf2(password, params.salt, params.iterations, params.hash.length, params.algorithm);
        const elapsed = Math.round(performance.now() - start);
        if (constantTimeEquals(hash, params.hash)) {
            out.style.color = 'var(--accent)';
            out.textContent = '✓ 匹配（' + elapsed + ' ms）';
            setStatus('✓ 密码匹配');
        } else {
            out.style.color = 'var(--danger)';
            out.textContent = '✗ 不匹配（' + elapsed + ' ms）';
            setStatus('✗ 密码不匹配');
        }
    } catch (e) {
        out.style.color = 'var(--danger)';
        out.textContent = '✗ 验证失败: ' + e.message;
    }
}

async function pbkdf2VerifyFormatted() {
    const password = document.getElementById('pbkdf2VerifyPwd').value;
    const formatted = document.getElementById('pbkdf2VerifyHash').value.trim();
    const out = document.getElementById('pbkdf2VerifyOutput');
    if (!formatted) {
        out.textContent = '请粘贴 PHC 格式字符串';
        out.style.color = 'var(--danger)';
        return;
    }
    if (!password) {
        out.textContent = '请输入待验证密码';
        out.style.color = 'var(--danger)';
        return;
    }
    try {
        const params = parsePBKDF2(formatted);
        const start = performance.now();
        const hash = await pbkdf2(password, params.salt, params.iterations, params.hash.length, params.algorithm);
        const elapsed = Math.round(performance.now() - start);
        if (constantTimeEquals(hash, params.hash)) {
            out.style.color = 'var(--accent)';
            out.textContent = '✓ 匹配（' + params.algorithm + ' · ' + params.iterations.toLocaleString() + ' 次 · ' + elapsed + ' ms）';
        } else {
            out.style.color = 'var(--danger)';
            out.textContent = '✗ 不匹配（' + elapsed + ' ms）';
        }
    } catch (e) {
        out.style.color = 'var(--danger)';
        out.textContent = '✗ 解析/验证失败: ' + e.message;
    }
}

function pbkdf2RandomSalt() {
    const out = document.getElementById('pbkdf2SaltPreview');
    const salt = randomSalt(16);
    out.textContent = '随机 Salt (16B Base64): ' + bytesToBase64(salt);
    out.style.color = 'var(--accent)';
}

function pbkdf2Clear() {
    document.getElementById('pbkdf2Password').value = '';
    document.getElementById('pbkdf2SaltPreview').textContent = '';
    document.getElementById('pbkdf2Output').textContent = '';
    document.getElementById('pbkdf2HashHex').textContent = '';
    document.getElementById('pbkdf2Meta').textContent = '';
    document.getElementById('pbkdf2VerifyPwd').value = '';
    document.getElementById('pbkdf2VerifyHash').value = '';
    document.getElementById('pbkdf2VerifyOutput').textContent = '';
    _pbkdf2LastFormatted = '';
    setStatus('已清空');
}

function pbkdf2Copy(format) {
    if (!_pbkdf2LastFormatted) {
        toast('请先生成哈希');
        return;
    }
    if (format === 'phc') {
        safeCopy(_pbkdf2LastFormatted, '已复制 PHC 格式');
    } else if (format === 'hex') {
        safeCopy(document.getElementById('pbkdf2HashHex').textContent, '已复制 HEX');
    }
}

function pbkdf2Init() {
    const passwordEl = document.getElementById('pbkdf2Password');
    const iterEl = document.getElementById('pbkdf2Iterations');
    const dkLenEl = document.getElementById('pbkdf2DkLen');
    const saltLenEl = document.getElementById('pbkdf2SaltLen');
    const algoRadios = document.querySelectorAll('input[name="pbkdf2Algo"]');
    if (!passwordEl || !iterEl || !dkLenEl || !saltLenEl) return;

    const syncMeta = function () {
        const meta = document.getElementById('pbkdf2Meta');
        const algo = document.querySelector('input[name="pbkdf2Algo"]:checked');
        const algoName = algo ? algo.value : 'SHA-256';
        const iters = parseInt(iterEl.value, 10) || 100000;
        const dk = parseInt(dkLenEl.value, 10) || 32;
        const sl = parseInt(saltLenEl.value, 10) || 16;
        meta.style.color = 'var(--text-muted)';
        meta.textContent = '参数: ' + algoName + ' · ' + iters.toLocaleString() + ' 次 · Salt ' + sl + 'B · 输出 ' + dk + 'B';
    };

    iterEl.addEventListener('input', syncMeta);
    dkLenEl.addEventListener('input', syncMeta);
    saltLenEl.addEventListener('input', syncMeta);
    algoRadios.forEach(function (r) {
        r.addEventListener('change', syncMeta);
    });
    syncMeta();
}

// === Node 导出（仅用于 Node 测试；浏览器忽略）===
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        pbkdf2: pbkdf2,
        bytesToBase64: bytesToBase64,
        base64ToBytes: base64ToBytes,
        bytesToHex: bytesToHex,
        formatPBKDF2: formatPBKDF2,
        parsePBKDF2: parsePBKDF2,
        constantTimeEquals: constantTimeEquals,
        randomSalt: randomSalt,
    };
}