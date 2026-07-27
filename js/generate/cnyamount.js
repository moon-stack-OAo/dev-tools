// 金额大写 / 统一社会信用代码 / 银行卡 Luhn

const CNY_DIGITS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
const CNY_INT_UNITS = ['', '拾', '佰', '仟'];
const CNY_SEC_UNITS = ['', '万', '亿', '兆'];

/**
 * 人民币小写金额 → 大写
 * @param {string|number} input
 * @returns {string}
 */
function numberToChineseYuan(input) {
    if (input === null || input === undefined || String(input).trim() === '') {
        throw new Error('请输入金额');
    }
    let s = String(input).trim().replace(/,/g, '').replace(/￥|¥|元/g, '');
    if (s.startsWith('+')) s = s.slice(1);
    let negative = false;
    if (s.startsWith('-')) {
        negative = true;
        s = s.slice(1);
    }
    if (!/^\d+(\.\d+)?$/.test(s)) {
        throw new Error('金额格式无效');
    }
    const parts = s.split('.');
    let intPart = parts[0].replace(/^0+/, '') || '0';
    let decPart = (parts[1] || '').slice(0, 2);
    while (decPart.length < 2) decPart += '0';

    // 超过兆级不支持（16 位整数）
    if (intPart.length > 16) {
        throw new Error('金额过大，超过支持范围');
    }

    const jiao = parseInt(decPart[0], 10);
    const fen = parseInt(decPart[1], 10);

    let result = '';
    if (intPart === '0') {
        result = '零圆';
    } else {
        result = cnyIntToChinese(intPart) + '圆';
    }

    if (jiao === 0 && fen === 0) {
        result += '整';
    } else {
        if (jiao > 0) {
            result += CNY_DIGITS[jiao] + '角';
        } else if (fen > 0 && intPart !== '0') {
            result += '零';
        }
        if (fen > 0) {
            result += CNY_DIGITS[fen] + '分';
        }
    }

    return (negative ? '负' : '') + result;
}

function cnySectionToChinese(sec) {
    // sec: 1~4 位数字字符串（可含前导零）
    const padded = sec.padStart(4, '0');
    if (padded === '0000') return '';
    let text = '';
    let zeroFlag = false;
    for (let i = 0; i < 4; i++) {
        const d = parseInt(padded[i], 10);
        const unit = CNY_INT_UNITS[3 - i];
        if (d === 0) {
            zeroFlag = true;
        } else {
            // 仅节内中间零补「零」，前导零不输出
            if (zeroFlag && text) {
                text += '零';
            }
            zeroFlag = false;
            text += CNY_DIGITS[d] + unit;
        }
    }
    return text;
}

function cnyIntToChinese(intStr) {
    // 按 4 位一节：个/万/亿/兆
    const sections = [];
    let s = intStr;
    while (s.length > 0) {
        sections.unshift(s.slice(-4));
        s = s.slice(0, -4);
    }
    let out = '';
    let zeroPending = false;
    sections.forEach(function (sec, idx) {
        const secIdx = sections.length - 1 - idx;
        const secText = cnySectionToChinese(sec);
        if (!secText) {
            if (out) zeroPending = true;
            return;
        }
        if (zeroPending && out) {
            out += '零';
            zeroPending = false;
        }
        out += secText + CNY_SEC_UNITS[secIdx];
    });
    return out || '零';
}

// GB 32100-2015 统一社会信用代码校验
// 本体代码 17 位 + 校验码 1 位；字符集 0-9A-Z 去掉 I/O/Z/S/V
const USC_CHARS = '0123456789ABCDEFGHJKLMNPQRTUWXY';
const USC_WEIGHTS = [1, 3, 9, 27, 19, 26, 16, 17, 20, 29, 25, 13, 8, 24, 10, 30, 28];

/**
 * 校验统一社会信用代码（18 位）
 * @param {string} code
 * @returns {{ valid: boolean, message: string, checkChar?: string }}
 */
function validateCreditCode(code) {
    if (code == null || String(code).trim() === '') {
        return { valid: false, message: '请输入统一社会信用代码' };
    }
    const c = String(code).trim().toUpperCase();
    if (c.length !== 18) {
        return { valid: false, message: '长度须为 18 位，当前 ' + c.length + ' 位' };
    }
    for (let i = 0; i < 18; i++) {
        if (USC_CHARS.indexOf(c[i]) < 0) {
            return { valid: false, message: '含非法字符: ' + c[i] + '（位置 ' + (i + 1) + '）' };
        }
    }
    let sum = 0;
    for (let i = 0; i < 17; i++) {
        sum += USC_CHARS.indexOf(c[i]) * USC_WEIGHTS[i];
    }
    const logicCheck = (31 - (sum % 31)) % 31;
    const expected = USC_CHARS[logicCheck];
    if (c[17] !== expected) {
        return {
            valid: false,
            message: '校验位错误，期望 ' + expected + '，实际 ' + c[17],
            checkChar: expected,
        };
    }
    return { valid: true, message: '校验通过', checkChar: expected };
}

/**
 * 银行卡号 Luhn 校验
 * @param {string} cardNumber
 * @returns {{ valid: boolean, message: string }}
 */
function luhnCheck(cardNumber) {
    if (cardNumber == null || String(cardNumber).trim() === '') {
        return { valid: false, message: '请输入卡号' };
    }
    const digits = String(cardNumber).replace(/[\s-]/g, '');
    if (!/^\d{12,19}$/.test(digits)) {
        return { valid: false, message: '卡号须为 12~19 位数字' };
    }
    let sum = 0;
    let alt = false;
    for (let i = digits.length - 1; i >= 0; i--) {
        let n = parseInt(digits[i], 10);
        if (alt) {
            n *= 2;
            if (n > 9) n -= 9;
        }
        sum += n;
        alt = !alt;
    }
    if (sum % 10 === 0) {
        return { valid: true, message: 'Luhn 校验通过' };
    }
    return { valid: false, message: 'Luhn 校验失败' };
}

// === UI ===

function cnyConvertAmount() {
    const input = document.getElementById('cnyAmountInput').value;
    const out = document.getElementById('cnyAmountOutput');
    try {
        const r = numberToChineseYuan(input);
        out.textContent = r;
        out.className = 'output-box';
        if (typeof setStatus === 'function') setStatus('金额大写转换完成');
    } catch (e) {
        out.textContent = e.message;
        out.className = 'output-box error';
    }
}

function cnyValidateUsc() {
    const input = document.getElementById('cnyUscInput').value;
    const out = document.getElementById('cnyUscOutput');
    const r = validateCreditCode(input);
    out.textContent = r.message + (r.checkChar ? '\n计算校验位: ' + r.checkChar : '');
    out.className = r.valid ? 'output-box' : 'output-box error';
    if (typeof setStatus === 'function') setStatus(r.valid ? '信用代码有效' : '信用代码无效');
}

function cnyValidateLuhn() {
    const input = document.getElementById('cnyLuhnInput').value;
    const out = document.getElementById('cnyLuhnOutput');
    const r = luhnCheck(input);
    out.textContent = r.message;
    out.className = r.valid ? 'output-box' : 'output-box error';
    if (typeof setStatus === 'function') setStatus(r.valid ? 'Luhn 通过' : 'Luhn 失败');
}

function cnyLoadSample() {
    document.getElementById('cnyAmountInput').value = '1234567.89';
    document.getElementById('cnyUscInput').value = '91110000MA01234567';
    document.getElementById('cnyLuhnInput').value = '6222021234567890123';
    cnyConvertAmount();
    cnyValidateUsc();
    cnyValidateLuhn();
}

function cnyClear() {
    ['cnyAmountInput', 'cnyUscInput', 'cnyLuhnInput'].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    ['cnyAmountOutput', 'cnyUscOutput', 'cnyLuhnOutput'].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = '';
            el.className = 'output-box';
        }
    });
    if (typeof setStatus === 'function') setStatus('已清空');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        numberToChineseYuan: numberToChineseYuan,
        validateCreditCode: validateCreditCode,
        luhnCheck: luhnCheck,
    };
}
