// 行尾 / BOM / 不可见字符检测与转换

const LE_BOM = '\uFEFF';
const LE_BOM_BYTES = [0xef, 0xbb, 0xbf];

// 零宽 / 不可见字符映射：code → 显示标签
const LE_INVISIBLE_MAP = {
    '\u200B': 'ZWSP', // Zero Width Space
    '\u200C': 'ZWNJ', // Zero Width Non-Joiner
    '\u200D': 'ZWJ', // Zero Width Joiner
    '\uFEFF': 'BOM', // BOM / ZWNBSP
    '\u00A0': 'NBSP', // Non-breaking space
    '\u200E': 'LRM', // Left-to-Right Mark
    '\u200F': 'RLM', // Right-to-Left Mark
    '\u202A': 'LRE',
    '\u202B': 'RLE',
    '\u202C': 'PDF',
    '\u202D': 'LRO',
    '\u202E': 'RLO',
    '\u2060': 'WJ', // Word Joiner
    '\u2061': 'FUNC',
    '\u2062': 'IT',
    '\u2063': 'IC',
    '\u2064': 'IS',
    '\u00AD': 'SHY', // Soft hyphen
    '\u180E': 'MVS',
    '\u2000': 'ENQUAD',
    '\u2001': 'EMQUAD',
    '\u2002': 'ENSP',
    '\u2003': 'EMSP',
    '\u2004': '3/EM',
    '\u2005': '4/EM',
    '\u2006': '6/EM',
    '\u2007': 'FSP',
    '\u2008': 'PSP',
    '\u2009': 'THSP',
    '\u200A': 'HSP',
    '\u202F': 'NNBSP',
    '\u205F': 'MMSP',
    '\u3000': 'IDSP', // Ideographic space
    '\t': 'TAB',
    '\v': 'VT',
    '\f': 'FF',
};

const LE_INVISIBLE_RE = new RegExp(
    '[' +
        Object.keys(LE_INVISIBLE_MAP)
            .map(function (ch) {
                return ch.replace(/[\\^\-\]]/g, '\\$&');
            })
            .join('') +
        ']',
    'g',
);

/**
 * 检测行尾类型统计
 * @param {string} text
 * @returns {{ crlf: number, lf: number, cr: number, mixed: boolean, dominant: string, totalLines: number }}
 */
function detectLineEndings(text) {
    if (text == null) text = '';
    const s = String(text);
    let crlf = 0;
    let lf = 0;
    let cr = 0;
    let i = 0;
    while (i < s.length) {
        const c = s.charAt(i);
        if (c === '\r') {
            if (i + 1 < s.length && s.charAt(i + 1) === '\n') {
                crlf++;
                i += 2;
            } else {
                cr++;
                i++;
            }
        } else if (c === '\n') {
            lf++;
            i++;
        } else {
            i++;
        }
    }
    const kinds = (crlf > 0 ? 1 : 0) + (lf > 0 ? 1 : 0) + (cr > 0 ? 1 : 0);
    let dominant = 'none';
    if (crlf >= lf && crlf >= cr && crlf > 0) dominant = 'CRLF';
    else if (lf >= crlf && lf >= cr && lf > 0) dominant = 'LF';
    else if (cr > 0) dominant = 'CR';
    const totalEnds = crlf + lf + cr;
    return {
        crlf: crlf,
        lf: lf,
        cr: cr,
        mixed: kinds > 1,
        dominant: dominant,
        totalLines: totalEnds + (s.length === 0 ? 0 : 1),
        totalEnds: totalEnds,
    };
}

/**
 * 转换行尾
 * @param {string} text
 * @param {'CRLF'|'LF'|'CR'|string} target
 * @returns {string}
 */
function convertLineEndings(text, target) {
    if (text == null) return '';
    let s = String(text);
    // 统一为 LF
    s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const t = String(target || 'LF').toUpperCase();
    if (t === 'CRLF' || t === 'CRLF\n' || t === '\r\n') {
        return s.replace(/\n/g, '\r\n');
    }
    if (t === 'CR' || t === '\r') {
        return s.replace(/\n/g, '\r');
    }
    return s; // LF
}

/**
 * 去除 UTF-8 BOM（字符串开头的 U+FEFF）
 * @param {string} text
 * @returns {string}
 */
function stripBom(text) {
    if (text == null) return '';
    const s = String(text);
    if (s.charCodeAt(0) === 0xfeff) {
        return s.slice(1);
    }
    return s;
}

/**
 * 添加 UTF-8 BOM（若尚无）
 * @param {string} text
 * @returns {string}
 */
function addBom(text) {
    if (text == null) text = '';
    const s = String(text);
    if (s.charCodeAt(0) === 0xfeff) return s;
    return LE_BOM + s;
}

/**
 * 是否有 BOM
 * @param {string} text
 * @returns {boolean}
 */
function hasBom(text) {
    if (text == null || text === '') return false;
    return String(text).charCodeAt(0) === 0xfeff;
}

/**
 * 查找不可见字符
 * @param {string} text
 * @returns {{ count: number, items: Array<{char: string, label: string, index: number, code: string}> }}
 */
function findInvisibleChars(text) {
    if (text == null) text = '';
    const s = String(text);
    const items = [];
    for (let i = 0; i < s.length; i++) {
        const ch = s.charAt(i);
        if (LE_INVISIBLE_MAP[ch]) {
            items.push({
                char: ch,
                label: LE_INVISIBLE_MAP[ch],
                index: i,
                code: 'U+' + ('0000' + ch.charCodeAt(0).toString(16).toUpperCase()).slice(-4),
            });
        }
    }
    return { count: items.length, items: items };
}

/**
 * 移除不可见字符（可配置是否保留 TAB）
 * @param {string} text
 * @param {{ keepTab?: boolean, keepNbsp?: boolean }} [options]
 * @returns {string}
 */
function stripInvisibleChars(text, options) {
    if (text == null) return '';
    options = options || {};
    const keepTab = !!options.keepTab;
    const keepNbsp = !!options.keepNbsp;
    return String(text).replace(LE_INVISIBLE_RE, function (ch) {
        if (keepTab && ch === '\t') return ch;
        if (keepNbsp && ch === '\u00A0') return ch;
        return '';
    });
}

/**
 * 可视化不可见字符（用可见标记替换）
 * @param {string} text
 * @param {{ showNewline?: boolean }} [options]
 * @returns {string}
 */
function visualizeInvisibleChars(text, options) {
    if (text == null) return '';
    options = options || {};
    let s = String(text);
    s = s.replace(LE_INVISIBLE_RE, function (ch) {
        const label = LE_INVISIBLE_MAP[ch] || 'INV';
        return '⟦' + label + '⟧';
    });
    if (options.showNewline) {
        s = s.replace(/\r\n/g, '⟦CRLF⟧\n').replace(/\r/g, '⟦CR⟧\n').replace(/\n/g, '⟦LF⟧\n');
    }
    return s;
}

/**
 * 综合检测报告
 * @param {string} text
 * @returns {string}
 */
function lineendingReport(text) {
    if (text == null) text = '';
    const s = String(text);
    const le = detectLineEndings(s);
    const inv = findInvisibleChars(s);
    const bom = hasBom(s);
    const lines = [];
    lines.push('=== 行尾 / BOM / 不可见字符 ===');
    lines.push('文本长度: ' + s.length + ' 字符');
    lines.push('UTF-8 BOM: ' + (bom ? '有 (U+FEFF)' : '无'));
    lines.push('');
    lines.push('--- 行尾 ---');
    lines.push('CRLF (\\r\\n): ' + le.crlf);
    lines.push('LF   (\\n)  : ' + le.lf);
    lines.push('CR   (\\r)  : ' + le.cr);
    lines.push('混用: ' + (le.mixed ? '是' : '否'));
    lines.push('主导: ' + le.dominant);
    lines.push('');
    lines.push('--- 不可见字符 ---');
    lines.push('合计: ' + inv.count);
    if (inv.count > 0) {
        const byLabel = Object.create(null);
        inv.items.forEach(function (it) {
            byLabel[it.label] = (byLabel[it.label] || 0) + 1;
        });
        Object.keys(byLabel)
            .sort()
            .forEach(function (k) {
                lines.push('  ' + k + ': ' + byLabel[k]);
            });
        const show = inv.items.slice(0, 20);
        lines.push('位置(前20):');
        show.forEach(function (it) {
            lines.push('  index=' + it.index + ' ' + it.label + ' ' + it.code);
        });
        if (inv.items.length > 20) {
            lines.push('  ... 共 ' + inv.items.length + ' 处');
        }
    }
    return lines.join('\n');
}

// === UI ===

function lineendingDetect() {
    const input = document.getElementById('lineendingInput');
    const out = document.getElementById('lineendingOutput');
    const vis = document.getElementById('lineendingVisual');
    if (!input || !out) return;
    const text = input.value;
    out.textContent = lineendingReport(text);
    out.className = 'output-box';
    if (vis) {
        vis.textContent = visualizeInvisibleChars(text, { showNewline: true });
    }
    if (typeof setStatus === 'function') setStatus('检测完成');
}

function lineendingConvert(target) {
    const input = document.getElementById('lineendingInput');
    const out = document.getElementById('lineendingOutput');
    if (!input) return;
    input.value = convertLineEndings(input.value, target);
    if (out) {
        out.textContent = '已转换为 ' + String(target).toUpperCase() + '\n\n' + lineendingReport(input.value);
        out.className = 'output-box';
    }
    const vis = document.getElementById('lineendingVisual');
    if (vis) vis.textContent = visualizeInvisibleChars(input.value, { showNewline: true });
    if (typeof setStatus === 'function') setStatus('已转换为 ' + String(target).toUpperCase());
}

function lineendingStripBom() {
    const input = document.getElementById('lineendingInput');
    if (!input) return;
    input.value = stripBom(input.value);
    lineendingDetect();
    if (typeof setStatus === 'function') setStatus('已去除 BOM');
}

function lineendingAddBom() {
    const input = document.getElementById('lineendingInput');
    if (!input) return;
    input.value = addBom(input.value);
    lineendingDetect();
    if (typeof setStatus === 'function') setStatus('已添加 BOM');
}

function lineendingStripInvisible() {
    const input = document.getElementById('lineendingInput');
    if (!input) return;
    const keepTab = document.getElementById('lineendingKeepTab');
    input.value = stripInvisibleChars(input.value, {
        keepTab: keepTab ? keepTab.checked : true,
    });
    lineendingDetect();
    if (typeof setStatus === 'function') setStatus('已移除不可见字符');
}

function lineendingLoadSample() {
    const input = document.getElementById('lineendingInput');
    if (!input) return;
    // 混用行尾 + BOM + 零宽
    input.value =
        LE_BOM +
        'line1\r\n' +
        'line2\n' +
        'hello\u200Bworld\r' +
        'foo\u00A0bar\r\n' +
        'end\tTAB';
    lineendingDetect();
}

function lineendingClear() {
    const input = document.getElementById('lineendingInput');
    const out = document.getElementById('lineendingOutput');
    const vis = document.getElementById('lineendingVisual');
    if (input) input.value = '';
    if (out) {
        out.textContent = '';
        out.className = 'output-box';
    }
    if (vis) vis.textContent = '';
    if (typeof setStatus === 'function') setStatus('已清空');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        detectLineEndings: detectLineEndings,
        convertLineEndings: convertLineEndings,
        stripBom: stripBom,
        addBom: addBom,
        hasBom: hasBom,
        findInvisibleChars: findInvisibleChars,
        stripInvisibleChars: stripInvisibleChars,
        visualizeInvisibleChars: visualizeInvisibleChars,
        lineendingReport: lineendingReport,
        LE_BOM: LE_BOM,
        LE_INVISIBLE_MAP: LE_INVISIBLE_MAP,
    };
}
