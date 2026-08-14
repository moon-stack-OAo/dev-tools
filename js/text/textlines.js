// 文本行处理：排序 / 去重 / 分割 / 合并

/**
 * 分割为行
 * @param {string} text
 * @param {{ trim?: boolean, removeEmpty?: boolean, separator?: string }} [opts]
 * @returns {string[]}
 */
function splitLines(text, opts) {
    opts = opts || {};
    if (text == null) return [];
    let s = String(text);
    let lines;
    if (opts.separator != null && opts.separator !== '') {
        lines = s.split(opts.separator);
    } else {
        // 统一换行
        s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        lines = s.split('\n');
    }
    if (opts.trim) {
        lines = lines.map(function (l) {
            return String(l).trim();
        });
    }
    if (opts.removeEmpty) {
        lines = lines.filter(function (l) {
            return l !== '';
        });
    }
    return lines;
}

/**
 * @param {string[]} lines
 * @param {string} [sep]
 * @returns {string}
 */
function joinLines(lines, sep) {
    if (!lines || !lines.length) return '';
    return lines.join(sep == null ? '\n' : sep);
}

/**
 * @param {string[]} lines
 * @param {{ order?: 'asc'|'desc', numeric?: boolean, caseInsensitive?: boolean }} [opts]
 * @returns {string[]}
 */
function sortLines(lines, opts) {
    opts = opts || {};
    const order = opts.order === 'desc' ? 'desc' : 'asc';
    const arr = (lines || []).slice();
    const ci = !!opts.caseInsensitive;
    const num = !!opts.numeric;

    arr.sort(function (a, b) {
        let x = a == null ? '' : String(a);
        let y = b == null ? '' : String(b);
        if (ci) {
            x = x.toLowerCase();
            y = y.toLowerCase();
        }
        let cmp;
        if (num) {
            const nx = parseFloat(x);
            const ny = parseFloat(y);
            const xOk = !isNaN(nx) && isFinite(nx);
            const yOk = !isNaN(ny) && isFinite(ny);
            if (xOk && yOk) {
                cmp = nx - ny;
            } else if (xOk) {
                cmp = -1;
            } else if (yOk) {
                cmp = 1;
            } else {
                cmp = x < y ? -1 : x > y ? 1 : 0;
            }
        } else {
            cmp = x < y ? -1 : x > y ? 1 : 0;
        }
        return order === 'desc' ? -cmp : cmp;
    });
    return arr;
}

/**
 * 去重，保持首次出现顺序
 * @param {string[]} lines
 * @param {{ caseInsensitive?: boolean }} [opts]
 * @returns {string[]}
 */
function uniqueLines(lines, opts) {
    opts = opts || {};
    const ci = !!opts.caseInsensitive;
    const seen = Object.create(null);
    const out = [];
    const arr = lines || [];
    for (let i = 0; i < arr.length; i++) {
        const raw = arr[i] == null ? '' : String(arr[i]);
        const key = ci ? raw.toLowerCase() : raw;
        if (seen[key]) continue;
        seen[key] = true;
        out.push(raw);
    }
    return out;
}

/**
 * @param {string[]} lines
 * @returns {string[]}
 */
function reverseLines(lines) {
    return (lines || []).slice().reverse();
}

/**
 * Fisher-Yates 打乱（不修改原数组）
 * @param {string[]} lines
 * @returns {string[]}
 */
function shuffleLines(lines) {
    const arr = (lines || []).slice();
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = arr[i];
        arr[i] = arr[j];
        arr[j] = t;
    }
    return arr;
}

/**
 * 一站式处理
 * @param {string} text
 * @param {object} [options]
 * @returns {string}
 */
function processTextLines(text, options) {
    options = options || {};
    let lines = splitLines(text, {
        trim: !!options.trim,
        removeEmpty: !!options.removeEmpty,
        separator: options.separator,
    });
    if (options.unique) {
        lines = uniqueLines(lines, { caseInsensitive: !!options.caseInsensitive });
    }
    if (options.sort) {
        lines = sortLines(lines, {
            order: options.order || 'asc',
            numeric: !!options.numeric,
            caseInsensitive: !!options.caseInsensitive,
        });
    }
    if (options.reverse) {
        lines = reverseLines(lines);
    }
    if (options.shuffle) {
        lines = shuffleLines(lines);
    }
    return joinLines(lines, options.joinWith != null ? options.joinWith : '\n');
}

function tlGetOpts() {
    return {
        trim: !!(document.getElementById('tlTrim') && document.getElementById('tlTrim').checked),
        removeEmpty: !!(document.getElementById('tlRemoveEmpty') && document.getElementById('tlRemoveEmpty').checked),
        caseInsensitive: !!(document.getElementById('tlIgnoreCase') && document.getElementById('tlIgnoreCase').checked),
        numeric: !!(document.getElementById('tlNumeric') && document.getElementById('tlNumeric').checked),
        separator: (function () {
            const el = document.getElementById('tlSep');
            if (!el) return '';
            const v = el.value;
            if (v === '\\n' || v === '') return '';
            if (v === '\\t') return '\t';
            return v;
        })(),
    };
}

function tlGetInput() {
    const el = document.getElementById('tlInput');
    return el ? el.value : '';
}

function tlSetOutput(text) {
    const out = document.getElementById('tlOutput');
    if (out) out.textContent = text == null ? '' : String(text);
}

function tlApply(extra) {
    const base = tlGetOpts();
    const opts = Object.assign({}, base, extra || {});
    const text = tlGetInput();
    if (!String(text).trim() && !opts.allowEmpty) {
        tlSetOutput('请输入文本');
        if (typeof setStatus === 'function') setStatus('请输入文本');
        return;
    }
    const result = processTextLines(text, opts);
    tlSetOutput(result);
    if (typeof setStatus === 'function') setStatus('处理完成 · ' + splitLines(result).length + ' 行');
}

function tlSortAsc() {
    tlApply({ sort: true, order: 'asc' });
}

function tlSortDesc() {
    tlApply({ sort: true, order: 'desc' });
}

function tlUnique() {
    tlApply({ unique: true });
}

function tlReverse() {
    tlApply({ reverse: true });
}

function tlShuffle() {
    tlApply({ shuffle: true });
}

function tlProcess() {
    // 仅按选项拆分/trim/去空，不排序
    tlApply({});
}

function tlLoadSample() {
    const el = document.getElementById('tlInput');
    if (el) {
        el.value =
            'banana\n' +
            'Apple\n' +
            'cherry\n' +
            'apple\n' +
            '10\n' +
            '2\n' +
            'banana\n' +
            '\n' +
            '  orange  \n' +
            'Zebra';
    }
    tlSortAsc();
}

function tlClear() {
    const el = document.getElementById('tlInput');
    if (el) el.value = '';
    tlSetOutput('');
    if (typeof setStatus === 'function') setStatus('已清空');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        splitLines: splitLines,
        joinLines: joinLines,
        sortLines: sortLines,
        uniqueLines: uniqueLines,
        reverseLines: reverseLines,
        shuffleLines: shuffleLines,
        processTextLines: processTextLines,
    };
}
