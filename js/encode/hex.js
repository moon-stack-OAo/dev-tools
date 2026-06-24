// 字符串 → Hex
function strToHex(str, options) {
    options = options || {};
    const upper = options.upperCase !== false ? false : true;  // 默认小写
    const space = !!options.space;
    const prefix = !!options.prefix;
    if (!str) return '';
    const bytes = new TextEncoder().encode(str);
    return Array.from(bytes)
        .map(function (b) {
            const hex = b.toString(16).padStart(2, '0');
            return prefix ? '0x' + hex : hex;
        })
        .join(space ? ' ' : '')
        .toUpperCase();
}

// Hex → 字符串
function hexToStr(hex) {
    if (!hex) return '';
    // 清洗：去掉 0x 前缀、空格、换行、逗号、分号
    const cleaned = hex.replace(/0x/gi, '').replace(/[\s,;:]/g, '');
    if (!cleaned) return '';
    // 校验：必须为偶数位的合法 hex
    if (!/^[0-9a-fA-F]+$/.test(cleaned) || cleaned.length % 2 !== 0) {
        throw new Error('非法 Hex 字符串（必须为偶数位的 0-9 a-f A-F）');
    }
    const bytes = new Uint8Array(
        cleaned.match(/.{1,2}/g).map(function (h) {
            return parseInt(h, 16);
        })
    );
    return new TextDecoder('utf-8').decode(bytes);
}

// 界面按钮：字符串 → Hex
function hexEncode() {
    const raw = document.getElementById('hexInput').value;
    const out = document.getElementById('hexOutput');
    if (!raw) {
        out.textContent = '请输入字符串';
        out.className = 'output-box error';
        return;
    }
    try {
        const upper = document.getElementById('hexUpperCase').checked;
        const space = document.getElementById('hexSpaceSep').checked;
        const prefix = document.getElementById('hex0xPrefix').checked;
        out.textContent = strToHex(raw, {
            upperCase: upper,
            space: space,
            prefix: prefix
        });
        out.className = 'output-box';
        setStatus('编码成功');
    } catch (e) {
        out.textContent = '编码失败: ' + e.message;
        out.className = 'output-box error';
    }
}

// 界面按钮：Hex → 字符串
function hexDecode() {
    const raw = document.getElementById('hexInput').value;
    const out = document.getElementById('hexOutput');
    if (!raw) {
        out.textContent = '请输入 Hex 字符串';
        out.className = 'output-box error';
        return;
    }
    try {
        const result = hexToStr(raw);
        out.textContent = result;
        out.className = 'output-box';
        setStatus('解码成功');
    } catch (e) {
        out.textContent = '解码失败: ' + e.message;
        out.className = 'output-box error';
    }
}