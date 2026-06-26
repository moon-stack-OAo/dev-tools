// TOTP / HOTP 动态令牌生成与校验工具
// 遵循 RFC 6238 (TOTP) 和 RFC 4226 (HOTP)
// 完全本地运行，使用浏览器原生 crypto.subtle
// 无网络请求，不写入 LocalStorage，刷新即清空密钥

// === 1. Base32 解码（密钥标准化）===
const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(input) {
    const cleaned = input.replace(/[\s=-]/g, '').toUpperCase();
    const bytes = [];
    let buffer = 0;
    let bits = 0;
    for (const c of cleaned) {
        const val = B32_ALPHABET.indexOf(c);
        if (val < 0) throw new Error('非法 Base32 字符: ' + c);
        buffer = (buffer << 5) | val;
        bits += 5;
        if (bits >= 8) {
            bytes.push((buffer >> (bits - 8)) & 0xFF);
            bits -= 8;
        }
    }
    return new Uint8Array(bytes);
}

// === 2. HMAC（支持 SHA-1 / SHA-256 / SHA-512）===
async function hmacHash(key, message, algorithm) {
    const algoMap = {
        'SHA1': 'SHA-1', 'SHA-1': 'SHA-1',
        'SHA256': 'SHA-256', 'SHA-256': 'SHA-256',
        'SHA512': 'SHA-512', 'SHA-512': 'SHA-512',
    };
    const hashName = algoMap[algorithm] || 'SHA-1';
    const cryptoKey = await crypto.subtle.importKey(
        'raw', key,
        { name: 'HMAC', hash: hashName },
        false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', cryptoKey, message);
    return new Uint8Array(sig);
}

// === 3. 共享核心：HMAC + 动态截断（RFC 4226 §5.3）===
async function generateOtp(secretB32, counter, digits, algorithm) {
    const key = base32Decode(secretB32);
    const counterBytes = new Uint8Array(8);
    let c = counter;
    for (let i = 7; i >= 0; i--) {
        counterBytes[i] = c & 0xFF;
        c = Math.floor(c / 256);
    }
    const hash = await hmacHash(key, counterBytes, algorithm);
    const offset = hash[hash.length - 1] & 0x0F;
    const code = ((hash[offset] & 0x7F) << 24) |
        ((hash[offset + 1] & 0xFF) << 16) |
        ((hash[offset + 2] & 0xFF) << 8) |
        (hash[offset + 3] & 0xFF);
    return String(code % Math.pow(10, digits)).padStart(digits, '0');
}

// === 4. TOTP（RFC 6238）===
// time 单位：毫秒（兼容 Date.now()）
// period 单位：秒
async function totp(secretB32, time, period, digits, algorithm) {
    if (time == null) time = Date.now();
    if (period == null) period = 30;
    if (digits == null) digits = 6;
    if (algorithm == null) algorithm = 'SHA-1';
    const counter = Math.floor(time / 1000 / period);
    return generateOtp(secretB32, counter, digits, algorithm);
}

// === 5. HOTP（RFC 4226）===
// counter 为递增整数，每次使用 +1，不再复用 TOTP 时间公式
async function hotp(secretB32, counter, digits, algorithm) {
    if (counter == null) counter = 0;
    if (digits == null) digits = 6;
    if (algorithm == null) algorithm = 'SHA-1';
    return generateOtp(secretB32, counter, digits, algorithm);
}

// === 6. otpauth:// URI 解析 ===
function parseOtpauthUri(uri) {
    if (!uri || typeof uri !== 'string') throw new Error('URI 不能为空');
    const trimmed = uri.trim();
    if (!trimmed.toLowerCase().startsWith('otpauth://')) {
        throw new Error('URI 必须以 otpauth:// 开头');
    }
    const url = new URL(trimmed);
    if (url.protocol !== 'otpauth:') throw new Error('非 otpauth URI');

    const type = (url.host || '').toLowerCase();
    if (type !== 'totp' && type !== 'hotp') {
        throw new Error('不支持的 OTP 类型: ' + type);
    }

    const rawLabel = url.pathname.replace(/^\/+/, '');
    const label = rawLabel ? decodeURIComponent(rawLabel) : '';

    const secret = url.searchParams.get('secret');
    if (!secret) throw new Error('URI 缺少 secret 参数');

    let issuer = url.searchParams.get('issuer') || '';
    let account = label;
    const colonIdx = label.indexOf(':');
    if (colonIdx >= 0) {
        const labelIssuer = label.slice(0, colonIdx).trim();
        const labelAccount = label.slice(colonIdx + 1).trim();
        if (labelIssuer && !issuer) issuer = labelIssuer;
        if (labelAccount) account = labelAccount;
    }

    let algo = (url.searchParams.get('algorithm') || 'SHA1').toUpperCase();
    if (algo === 'SHA1') algo = 'SHA-1';
    else if (algo === 'SHA256') algo = 'SHA-256';
    else if (algo === 'SHA512') algo = 'SHA-512';

    const digitsStr = url.searchParams.get('digits') || '6';
    const periodStr = url.searchParams.get('period') || '30';
    const digits = parseInt(digitsStr, 10) || 6;
    const period = parseInt(periodStr, 10) || 30;

    const counterStr = url.searchParams.get('counter');
    const counter = counterStr != null ? parseInt(counterStr, 10) : null;

    return {
        type,
        issuer,
        account,
        secret,
        algorithm: algo,
        digits,
        period,
        counter,
    };
}

// === 7. 验证 OTP（±1 step 时间漂移容错）===
async function verifyOtp(input, secretB32, period, digits, algorithm) {
    if (period == null) period = 30;
    if (digits == null) digits = 6;
    if (algorithm == null) algorithm = 'SHA-1';
    const trimmed = String(input == null ? '' : input).replace(/\s+/g, '');
    if (!trimmed) return { valid: false };
    const now = Date.now();
    for (const offset of [-1, 0, 1]) {
        const time = now + offset * period * 1000;
        const code = await totp(secretB32, time, period, digits, algorithm);
        if (code === trimmed) return { valid: true, offset };
    }
    return { valid: false };
}

// === 8. 格式化显示（4 8 2 7 9 3）===
function formatOtp(code, digits) {
    const d = digits || (code ? code.length : 6);
    if (d === 6 && code.length === 6) return code.slice(0, 3) + ' ' + code.slice(3);
    if (d === 8 && code.length === 8) return code.slice(0, 4) + ' ' + code.slice(4);
    return code;
}

// ============================================================
// === UI 控制 ===
// ============================================================
let _totpTimer = null;
let _totpLastCode = '';
let _totpInited = false;

function _readConfig() {
    const secret = document.getElementById('totpSecret').value.trim();
    const algo = document.getElementById('totpAlgo').value;
    const digits = parseInt(document.getElementById('totpDigits').value, 10);
    const period = parseInt(document.getElementById('totpPeriod').value, 10);
    return { secret, algo, digits, period };
}

function _setCodeDisplay(text) {
    const el = document.getElementById('totpCode');
    if (el) el.textContent = text;
}

function _setProgress(remaining, period) {
    const bar = document.getElementById('totpProgress');
    const cd = document.getElementById('totpCountdown');
    if (bar) {
        bar.style.width = `${(remaining / period) * 100}%`;
        bar.style.background = remaining <= 5 ? 'var(--danger)' : 'var(--accent)';
    }
    if (cd) cd.textContent = `${remaining}s`;
}

async function totpRefresh() {
    const { secret, algo, digits, period } = _readConfig();
    if (!secret) {
        _setCodeDisplay('- - - - - -');
        _totpLastCode = '';
        return;
    }
    try {
        const code = await totp(secret, Date.now(), period, digits, algo);
        _totpLastCode = code;
        _setCodeDisplay(formatOtp(code, digits));
        setStatus('TOTP 已生成');
    } catch (e) {
        _setCodeDisplay('- - - - - -');
        _totpLastCode = '';
        setStatus('TOTP 生成失败: ' + e.message);
    }
}

function _totpTick() {
    const { secret, period } = _readConfig();
    if (!secret) return;
    const nowSec = Math.floor(Date.now() / 1000);
    const elapsed = nowSec % period;
    const remaining = period - elapsed;
    _setProgress(remaining, period);
    // 周期切换瞬间或首次刷新时重新生成 OTP
    if (elapsed === 0 || _totpLastCode === '') {
        totpRefresh();
    }
}

function totpStart() {
    if (_totpTimer) clearInterval(_totpTimer);
    _totpTick();
    _totpTimer = setInterval(_totpTick, 1000);
}

function totpStop() {
    if (_totpTimer) {
        clearInterval(_totpTimer);
        _totpTimer = null;
    }
}

function totpCopy() {
    if (!_totpLastCode) {
        toast('请先输入密钥');
        return;
    }
    safeCopy(_totpLastCode, '已复制动态码');
}

function totpParseUri() {
    const ta = document.getElementById('totpUri');
    const out = document.getElementById('totpUriResult');
    const uri = ta.value.trim();
    if (!uri) {
        out.textContent = '请输入 otpauth:// URI';
        out.style.color = 'var(--danger)';
        return;
    }
    try {
        const parsed = parseOtpauthUri(uri);
        document.getElementById('totpSecret').value = parsed.secret;
        document.getElementById('totpAlgo').value = parsed.algorithm;
        document.getElementById('totpDigits').value = String(parsed.digits);
        const periodEl = document.getElementById('totpPeriod');
        if (parsed.period === 30 || parsed.period === 60) {
            periodEl.value = String(parsed.period);
        } else {
            const opt = document.createElement('option');
            opt.value = String(parsed.period);
            opt.textContent = parsed.period + 's';
            periodEl.appendChild(opt);
            periodEl.value = String(parsed.period);
        }
        const lines = [];
        lines.push('类型: ' + parsed.type.toUpperCase());
        lines.push('账号: ' + (parsed.account || '-'));
        lines.push('颁发者: ' + (parsed.issuer || '-'));
        lines.push('算法: ' + parsed.algorithm + '   位数: ' + parsed.digits + '   周期: ' + parsed.period + 's');
        if (parsed.counter != null) lines.push('计数器: ' + parsed.counter);
        out.textContent = '✓ 解析成功:\n' + lines.join('\n');
        out.style.color = 'var(--accent)';
        totpRefresh();
        totpStart();
        setStatus('已解析并填充 URI');
    } catch (e) {
        out.textContent = '✗ 解析失败: ' + e.message;
        out.style.color = 'var(--danger)';
    }
}

async function totpVerify() {
    const input = document.getElementById('totpInput').value;
    const out = document.getElementById('totpVerifyResult');
    const { secret, algo, digits, period } = _readConfig();
    if (!secret) {
        out.textContent = '请先在上方输入密钥';
        out.style.color = 'var(--danger)';
        return;
    }
    if (!input.trim()) {
        out.textContent = '请输入 OTP 码';
        out.style.color = 'var(--danger)';
        return;
    }
    try {
        const result = await verifyOtp(input, secret, period, digits, algo);
        if (result.valid) {
            const label = result.offset === 0 ? '当前窗口'
                : (result.offset > 0 ? '窗口 +' + result.offset : '窗口 ' + result.offset);
            out.textContent = '✓ 匹配（' + label + '）';
            out.style.color = 'var(--accent)';
            setStatus('OTP 校验通过');
        } else {
            out.textContent = '✗ 不匹配';
            out.style.color = 'var(--danger)';
            setStatus('OTP 校验失败');
        }
    } catch (e) {
        out.textContent = '✗ 校验失败: ' + e.message;
        out.style.color = 'var(--danger)';
    }
}

function totpClear() {
    totpStop();
    document.getElementById('totpSecret').value = '';
    document.getElementById('totpInput').value = '';
    document.getElementById('totpUri').value = '';
    document.getElementById('totpUriResult').textContent = '';
    document.getElementById('totpUriResult').style.color = '';
    document.getElementById('totpVerifyResult').textContent = '';
    document.getElementById('totpVerifyResult').style.color = '';
    _setCodeDisplay('- - - - - -');
    const bar = document.getElementById('totpProgress');
    const cd = document.getElementById('totpCountdown');
    if (bar) bar.style.width = '0%';
    if (cd) cd.textContent = '未启动';
    _totpLastCode = '';
    setStatus('已清空');
}

function totpInit() {
    if (_totpInited) return;
    const secretEl = document.getElementById('totpSecret');
    const algoEl = document.getElementById('totpAlgo');
    const digitsEl = document.getElementById('totpDigits');
    const periodEl = document.getElementById('totpPeriod');
    if (!secretEl || !algoEl || !digitsEl || !periodEl) return;
    _totpInited = true;

    const onSecretChange = () => {
        const s = secretEl.value.trim();
        if (s) {
            totpRefresh();
            if (!_totpTimer) totpStart();
        } else {
            totpStop();
            _totpLastCode = '';
            _setCodeDisplay('- - - - - -');
            const bar = document.getElementById('totpProgress');
            const cd = document.getElementById('totpCountdown');
            if (bar) bar.style.width = '0%';
            if (cd) cd.textContent = '未启动';
        }
    };

    secretEl.addEventListener('input', onSecretChange);
    algoEl.addEventListener('change', () => {
        if (secretEl.value.trim()) {
            totpRefresh();
            if (!_totpTimer) totpStart();
        }
    });
    digitsEl.addEventListener('change', () => {
        if (secretEl.value.trim()) {
            totpRefresh();
            if (!_totpTimer) totpStart();
        }
    });
    periodEl.addEventListener('change', () => {
        if (secretEl.value.trim()) {
            totpRefresh();
            totpStart();
        }
    });
}

// === Node 导出（仅用于 Node 测试；浏览器忽略）===
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        base32Decode,
        hmacHash,
        generateOtp,
        totp,
        hotp,
        parseOtpauthUri,
        verifyOtp,
        formatOtp,
    };
}

registerInit('totp', totpInit);
