// 摩斯电码（ITU 国际）编解码
// 字母 / 数字 / 常用标点；字间空格，词间 / 或 |

var MORSE_TABLE = {
    A: '.-',
    B: '-...',
    C: '-.-.',
    D: '-..',
    E: '.',
    F: '..-.',
    G: '--.',
    H: '....',
    I: '..',
    J: '.---',
    K: '-.-',
    L: '.-..',
    M: '--',
    N: '-.',
    O: '---',
    P: '.--.',
    Q: '--.-',
    R: '.-.',
    S: '...',
    T: '-',
    U: '..-',
    V: '...-',
    W: '.--',
    X: '-..-',
    Y: '-.--',
    Z: '--..',
    '0': '-----',
    '1': '.----',
    '2': '..---',
    '3': '...--',
    '4': '....-',
    '5': '.....',
    '6': '-....',
    '7': '--...',
    '8': '---..',
    '9': '----.',
    '.': '.-.-.-',
    ',': '--..--',
    '?': '..--..',
    "'": '.----.',
    '!': '-.-.--',
    '/': '-..-.',
    '(': '-.--.',
    ')': '-.--.-',
    '&': '.-...',
    ':': '---...',
    ';': '-.-.-.',
    '=': '-...-',
    '+': '.-.-.',
    '-': '-....-',
    _: '..--.-',
    '"': '.-..-.',
    $: '...-..-',
    '@': '.--.-.',
};

var MORSE_REVERSE = (function () {
    var map = {};
    Object.keys(MORSE_TABLE).forEach(function (ch) {
        map[MORSE_TABLE[ch]] = ch;
    });
    return map;
})();

/**
 * 文本 → 摩斯电码
 * @param {string} text
 * @param {{dot?: string, dash?: string, letterSep?: string, wordSep?: string}} [options]
 * @returns {string}
 */
function morseEncode(text, options) {
    options = options || {};
    var dot = options.dot != null ? options.dot : '.';
    var dash = options.dash != null ? options.dash : '-';
    var letterSep = options.letterSep != null ? options.letterSep : ' ';
    var wordSep = options.wordSep != null ? options.wordSep : ' / ';
    if (!text) return '';

    var words = String(text).trim().split(/\s+/);
    var outWords = [];
    for (var wi = 0; wi < words.length; wi++) {
        var word = words[wi];
        if (!word) continue;
        var codes = [];
        for (var i = 0; i < word.length; i++) {
            var ch = word.charAt(i);
            var upper = ch.toUpperCase();
            var code = MORSE_TABLE[upper];
            if (!code) {
                throw new Error('不支持的字符: "' + ch + '"（仅字母/数字/常用标点）');
            }
            if (dot !== '.' || dash !== '-') {
                code = code.split('.').join(dot).split('-').join(dash);
            }
            codes.push(code);
        }
        outWords.push(codes.join(letterSep));
    }
    return outWords.join(wordSep);
}

/**
 * 摩斯电码 → 文本
 * 支持 .-/、·—、0/1；词分隔 / | 多空格
 * @param {string} code
 * @param {{lowerCase?: boolean}} [options]
 * @returns {string}
 */
function morseDecode(code, options) {
    options = options || {};
    var lowerCase = !!options.lowerCase;
    if (!code) return '';

    var normalized = String(code)
        .replace(/[·•]/g, '.')
        .replace(/[—–−_]/g, '-')
        .replace(/\b0\b/g, '.')
        .replace(/\b1\b/g, '-')
        .replace(/[|／]/g, '/')
        .trim();

    // 按词分隔：/ 或连续 2+ 空格
    var wordParts = normalized.split(/\s*\/\s*|\s{2,}/);
    var outWords = [];
    for (var wi = 0; wi < wordParts.length; wi++) {
        var part = wordParts[wi].trim();
        if (!part) continue;
        var tokens = part.split(/\s+/);
        var chars = [];
        for (var ti = 0; ti < tokens.length; ti++) {
            var token = tokens[ti];
            if (!token) continue;
            // 清理 token 内非点划字符
            var cleaned = token.replace(/[^.\-]/g, '');
            if (!cleaned) {
                throw new Error('非法摩斯码片段: "' + token + '"');
            }
            var ch = MORSE_REVERSE[cleaned];
            if (!ch) {
                throw new Error('未知摩斯码: "' + cleaned + '"');
            }
            chars.push(lowerCase ? ch.toLowerCase() : ch);
        }
        if (chars.length) outWords.push(chars.join(''));
    }
    return outWords.join(' ');
}

function morseDoEncode() {
    var raw = document.getElementById('morseInput').value;
    var out = document.getElementById('morseOutput');
    if (!raw || !String(raw).trim()) {
        out.textContent = '请输入文本';
        out.className = 'output-box error';
        return;
    }
    try {
        var useUnicode = document.getElementById('morseUnicode').checked;
        var result = morseEncode(raw, {
            dot: useUnicode ? '·' : '.',
            dash: useUnicode ? '−' : '-',
        });
        out.textContent = result;
        out.className = 'output-box';
        setStatus('编码成功');
    } catch (e) {
        out.textContent = '编码失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function morseDoDecode() {
    var raw = document.getElementById('morseInput').value;
    var out = document.getElementById('morseOutput');
    if (!raw || !String(raw).trim()) {
        out.textContent = '请输入摩斯电码';
        out.className = 'output-box error';
        return;
    }
    try {
        var lower = document.getElementById('morseLower').checked;
        var result = morseDecode(raw, { lowerCase: lower });
        out.textContent = result;
        out.className = 'output-box';
        setStatus('解码成功');
    } catch (e) {
        out.textContent = '解码失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function morseClear() {
    document.getElementById('morseInput').value = '';
    var out = document.getElementById('morseOutput');
    out.textContent = '';
    out.className = 'output-box';
    setStatus('已清空');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        morseEncode: morseEncode,
        morseDecode: morseDecode,
        MORSE_TABLE: MORSE_TABLE,
    };
}
