// 摩斯电码（ITU 国际）编解码
// 字母 / 数字 / 常用标点；可选中文电码（汉字 → 四位电码 → 数字摩斯）

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

/** 中文电码：字→四位码 / 四位码→字（懒加载） */
var _ctcCharToCode = null;
var _ctcCodeToChar = null;
var _ctcLoadPromise = null;

function isCjkChar(ch) {
    if (!ch) return false;
    var cp = ch.codePointAt(0);
    // CJK 统一表意文字 + 扩展 A（常用汉字范围）
    return (
        (cp >= 0x4e00 && cp <= 0x9fff) ||
        (cp >= 0x3400 && cp <= 0x4dbf) ||
        (cp >= 0x20000 && cp <= 0x2a6df)
    );
}

function setCtcTable(charToCode) {
    _ctcCharToCode = charToCode || {};
    _ctcCodeToChar = {};
    Object.keys(_ctcCharToCode).forEach(function (ch) {
        var code = String(_ctcCharToCode[ch]).padStart(4, '0');
        _ctcCharToCode[ch] = code;
        if (!_ctcCodeToChar[code]) _ctcCodeToChar[code] = ch;
    });
}

function hasCtcTable() {
    return !!_ctcCharToCode;
}

function loadCtcTable() {
    if (_ctcCharToCode) return Promise.resolve(_ctcCharToCode);
    if (_ctcLoadPromise) return _ctcLoadPromise;

    // Node 测试：从本地 public/lib 读取
    if (typeof module !== 'undefined' && module.exports && typeof document === 'undefined') {
        try {
            var fs = require('fs');
            var path = require('path');
            var p = path.join(__dirname, '../../public/lib/ctc-cn.json');
            setCtcTable(JSON.parse(fs.readFileSync(p, 'utf8')));
            return Promise.resolve(_ctcCharToCode);
        } catch (e) {
            return Promise.reject(new Error('加载中文电码表失败: ' + e.message));
        }
    }

    _ctcLoadPromise = new Promise(function (resolve, reject) {
        var url = 'lib/ctc-cn.json';
        if (typeof assetV === 'function') url += assetV(url);
        fetch(url)
            .then(function (r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            })
            .then(function (data) {
                setCtcTable(data);
                resolve(_ctcCharToCode);
            })
            .catch(function (e) {
                _ctcLoadPromise = null;
                reject(new Error('加载中文电码表失败: ' + (e && e.message ? e.message : e)));
            });
    });
    return _ctcLoadPromise;
}

function applyDotDash(code, dot, dash) {
    if (dot === '.' && dash === '-') return code;
    return code.split('.').join(dot).split('-').join(dash);
}

// 中文/全角标点 → 半角（ITU 表仅有半角）
var PUNCT_NORMALIZE = {
    '，': ',',
    '。': '.',
    '！': '!',
    '？': '?',
    '：': ':',
    '；': ';',
    '（': '(',
    '）': ')',
    '【': '(',
    '】': ')',
    '「': '"',
    '」': '"',
    '『': '"',
    '』': '"',
    '“': '"',
    '”': '"',
    '‘': "'",
    '’': "'",
    '、': ',',
    '…': '.',
    '—': '-',
    '－': '-',
    '～': '-',
    '＠': '@',
    '＆': '&',
    '／': '/',
    '＝': '=',
    '＋': '+',
    '＄': '$',
    '＿': '_',
    // 全角数字/字母
    '０': '0',
    '１': '1',
    '２': '2',
    '３': '3',
    '４': '4',
    '５': '5',
    '６': '6',
    '７': '7',
    '８': '8',
    '９': '9',
};

function normalizeMorseChar(ch) {
    if (PUNCT_NORMALIZE[ch] != null) return PUNCT_NORMALIZE[ch];
    // 全角 A-Z / a-z（FF21-FF3A / FF41-FF5A）
    var cp = ch.codePointAt(0);
    if (cp >= 0xff21 && cp <= 0xff3a) return String.fromCharCode(cp - 0xff21 + 65);
    if (cp >= 0xff41 && cp <= 0xff5a) return String.fromCharCode(cp - 0xff41 + 97);
    return ch;
}

function charToMorseTokens(ch, options) {
    var chinese = !!options.chinese;
    ch = normalizeMorseChar(ch);
    if (isCjkChar(ch)) {
        if (!chinese) {
            throw new Error('不支持中文，请勾选「中文电码」');
        }
        if (!_ctcCharToCode) {
            throw new Error('中文电码表未加载');
        }
        var digs = _ctcCharToCode[ch];
        if (!digs) {
            throw new Error('电码表无此字: "' + ch + '"');
        }
        var tokens = [];
        for (var di = 0; di < digs.length; di++) {
            tokens.push(MORSE_TABLE[digs.charAt(di)]);
        }
        return tokens;
    }
    var upper = ch.toUpperCase();
    var code = MORSE_TABLE[upper];
    if (!code) {
        throw new Error('不支持的字符: "' + ch + '"（仅字母/数字/常用标点' + (chinese ? '/汉字' : '') + '）');
    }
    return [code];
}

/**
 * 文本 → 摩斯电码
 * @param {string} text
 * @param {{dot?: string, dash?: string, letterSep?: string, wordSep?: string, chinese?: boolean}} [options]
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
        // 正确处理代理对（罕用扩展汉字）
        var chars = Array.from(word);
        for (var i = 0; i < chars.length; i++) {
            var tokens = charToMorseTokens(chars[i], options);
            for (var ti = 0; ti < tokens.length; ti++) {
                codes.push(applyDotDash(tokens[ti], dot, dash));
            }
        }
        outWords.push(codes.join(letterSep));
    }
    return outWords.join(wordSep);
}

/**
 * 将已解码的字符序列（含数字）按中文电码还原汉字
 * @param {string[]} chars
 * @param {boolean} chinese
 * @returns {string}
 */
function assembleDecodedChars(chars, chinese) {
    if (!chinese || !_ctcCodeToChar) {
        return chars.join('');
    }
    var out = '';
    var digitBuf = '';
    function flushDigits() {
        if (!digitBuf) return;
        if (digitBuf.length % 4 !== 0) {
            throw new Error('中文电码位数错误（应为 4 的倍数）: ' + digitBuf);
        }
        for (var i = 0; i < digitBuf.length; i += 4) {
            var code = digitBuf.substr(i, 4);
            var ch = _ctcCodeToChar[code];
            if (!ch) {
                throw new Error('未知中文电码: ' + code);
            }
            out += ch;
        }
        digitBuf = '';
    }
    for (var i = 0; i < chars.length; i++) {
        var c = chars[i];
        if (c >= '0' && c <= '9') {
            digitBuf += c;
        } else {
            flushDigits();
            out += c;
        }
    }
    flushDigits();
    return out;
}

/**
 * 摩斯电码 → 文本
 * 支持 .-/、·—；词分隔 / | 多空格；可选中文电码
 * @param {string} code
 * @param {{lowerCase?: boolean, chinese?: boolean}} [options]
 * @returns {string}
 */
function morseDecode(code, options) {
    options = options || {};
    var lowerCase = !!options.lowerCase;
    var chinese = !!options.chinese;
    if (!code) return '';

    var normalized = String(code)
        .replace(/[·•]/g, '.')
        .replace(/[—–−_]/g, '-')
        .replace(/[|／]/g, '/')
        .trim();

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
            var cleaned = token.replace(/[^.\-]/g, '');
            if (!cleaned) {
                throw new Error('非法摩斯码片段: "' + token + '"');
            }
            var ch = MORSE_REVERSE[cleaned];
            if (!ch) {
                throw new Error('未知摩斯码: "' + cleaned + '"');
            }
            chars.push(lowerCase && /[A-Z]/.test(ch) ? ch.toLowerCase() : ch);
        }
        if (chars.length) outWords.push(assembleDecodedChars(chars, chinese));
    }
    return outWords.join(' ');
}

function morseReadOpts() {
    var useUnicode = document.getElementById('morseUnicode').checked;
    var lower = document.getElementById('morseLower').checked;
    var chinese = document.getElementById('morseChinese').checked;
    return {
        encode: {
            chinese: chinese,
            dot: useUnicode ? '·' : '.',
            dash: useUnicode ? '−' : '-',
        },
        decode: {
            chinese: chinese,
            lowerCase: lower,
        },
        chinese: chinese,
    };
}

function morseEnsureCtc(needChinese) {
    if (!needChinese) return Promise.resolve();
    return loadCtcTable();
}

function morseDoEncode() {
    var raw = document.getElementById('morseInput').value;
    var out = document.getElementById('morseOutput');
    if (!raw || !String(raw).trim()) {
        out.textContent = '请输入文本';
        out.className = 'output-box error';
        return;
    }
    var opts = morseReadOpts();
    morseEnsureCtc(opts.chinese)
        .then(function () {
            var result = morseEncode(raw, opts.encode);
            out.textContent = result;
            out.className = 'output-box';
            setStatus(opts.chinese ? '编码成功（含中文电码）' : '编码成功');
        })
        .catch(function (e) {
            out.textContent = '编码失败: ' + e.message;
            out.className = 'output-box error';
        });
}

function morseDoDecode() {
    var raw = document.getElementById('morseInput').value;
    var out = document.getElementById('morseOutput');
    if (!raw || !String(raw).trim()) {
        out.textContent = '请输入摩斯电码';
        out.className = 'output-box error';
        return;
    }
    var opts = morseReadOpts();
    morseEnsureCtc(opts.chinese)
        .then(function () {
            var result = morseDecode(raw, opts.decode);
            out.textContent = result;
            out.className = 'output-box';
            setStatus(opts.chinese ? '解码成功（含中文电码）' : '解码成功');
        })
        .catch(function (e) {
            out.textContent = '解码失败: ' + e.message;
            out.className = 'output-box error';
        });
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
        isCjkChar: isCjkChar,
        setCtcTable: setCtcTable,
        loadCtcTable: loadCtcTable,
        hasCtcTable: hasCtcTable,
        normalizeMorseChar: normalizeMorseChar,
    };
}
