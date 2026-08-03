// 正则表达式 → Java Pattern.compile 代码片段

/** @type {Record<string, string>} */
const RJ_FLAG_MAP = {
    i: 'Pattern.CASE_INSENSITIVE',
    m: 'Pattern.MULTILINE',
    s: 'Pattern.DOTALL',
    u: 'Pattern.UNICODE_CASE',
    d: 'Pattern.UNIX_LINES',
    x: 'Pattern.COMMENTS',
    COMMENTS: 'Pattern.COMMENTS',
    CASE_INSENSITIVE: 'Pattern.CASE_INSENSITIVE',
    MULTILINE: 'Pattern.MULTILINE',
    DOTALL: 'Pattern.DOTALL',
    UNICODE_CASE: 'Pattern.UNICODE_CASE',
    UNIX_LINES: 'Pattern.UNIX_LINES',
    CANON_EQ: 'Pattern.CANON_EQ',
    LITERAL: 'Pattern.LITERAL',
    UNICODE_CHARACTER_CLASS: 'Pattern.UNICODE_CHARACTER_CLASS',
};

/**
 * 将正则字符串转义为 Java 字符串字面量内容
 * @param {string} pattern
 * @returns {string}
 */
function regexJavaEscape(pattern) {
    if (pattern == null) return '';
    return String(pattern).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * 解析 flags 字符串/数组为 Java Pattern 常量列表
 * @param {string|string[]|undefined} flags
 * @returns {string[]}
 */
function rjParseFlags(flags) {
    if (flags == null || flags === '') return [];
    let list;
    if (Array.isArray(flags)) {
        list = flags;
    } else {
        const s = String(flags).trim();
        // 支持 "i,m,s" / "i m" / "COMMENTS" / 连续短标志 "ims"
        if (/^[imsudx]+$/i.test(s)) {
            list = s.split('');
        } else {
            list = s.split(/[\s,|]+/).filter(Boolean);
        }
    }
    const out = [];
    const seen = {};
    list.forEach(function (f) {
        const key = String(f).trim();
        if (!key) return;
        // 数组项也可能是 "ims" 连续短标志
        if (key.length > 1 && /^[imsudx]+$/i.test(key) && !RJ_FLAG_MAP[key]) {
            key.split('').forEach(function (ch) {
                const mapped = RJ_FLAG_MAP[ch] || RJ_FLAG_MAP[ch.toLowerCase()];
                if (mapped && !seen[mapped]) {
                    seen[mapped] = true;
                    out.push(mapped);
                }
            });
            return;
        }
        const mapped = RJ_FLAG_MAP[key] || RJ_FLAG_MAP[key.toLowerCase()] || null;
        if (mapped && !seen[mapped]) {
            seen[mapped] = true;
            out.push(mapped);
        }
    });
    return out;
}

/**
 * 正则 → Java Pattern.compile 代码
 * @param {string} pattern
 * @param {{ flags?: string|string[] }} [options]
 * @returns {{ ok: boolean, code: string, escaped: string, msg: string, flags: string[] }}
 */
function regexToJava(pattern, options) {
    options = options || {};
    if (pattern == null || String(pattern).length === 0) {
        return { ok: false, code: '', escaped: '', msg: '请输入正则表达式', flags: [] };
    }
    const escaped = regexJavaEscape(pattern);
    const flagConsts = rjParseFlags(options.flags);
    let compileArgs = '"' + escaped + '"';
    if (flagConsts.length === 1) {
        compileArgs += ', ' + flagConsts[0];
    } else if (flagConsts.length > 1) {
        compileArgs += ', ' + flagConsts.join(' | ');
    }
    const code = [
        'import java.util.regex.Pattern;',
        'import java.util.regex.Matcher;',
        '',
        'Pattern pattern = Pattern.compile(' + compileArgs + ');',
        'Matcher matcher = pattern.matcher(input);',
        'if (matcher.find()) {',
        '    // matcher.group() / group(1) ...',
        '}',
    ].join('\n');
    return {
        ok: true,
        code: code,
        escaped: escaped,
        msg: '已生成 Java 代码',
        flags: flagConsts,
    };
}

function rjGetSelectedFlags() {
    const flags = [];
    const boxes = document.querySelectorAll('[data-rj-flag]');
    boxes.forEach(function (el) {
        if (el.checked) flags.push(el.getAttribute('data-rj-flag'));
    });
    return flags;
}

function regexjavaGenerate() {
    const patternEl = document.getElementById('rjPattern');
    const out = document.getElementById('rjOutput');
    if (!patternEl || !out) return;
    const pattern = patternEl.value;
    const result = regexToJava(pattern, { flags: rjGetSelectedFlags() });
    if (!result.ok) {
        out.textContent = result.msg;
        out.className = 'output-box error';
        return;
    }
    out.textContent = result.code;
    out.className = 'output-box';
    if (typeof setStatus === 'function') setStatus(result.msg);
}

function regexjavaLoadSample() {
    const patternEl = document.getElementById('rjPattern');
    if (patternEl) patternEl.value = '^(?i)[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$';
    const boxes = document.querySelectorAll('[data-rj-flag]');
    boxes.forEach(function (el) {
        const f = el.getAttribute('data-rj-flag');
        el.checked = f === 'i' || f === 'm';
    });
    regexjavaGenerate();
}

function regexjavaClear() {
    const patternEl = document.getElementById('rjPattern');
    const out = document.getElementById('rjOutput');
    if (patternEl) patternEl.value = '';
    if (out) {
        out.textContent = '';
        out.className = 'output-box';
    }
    document.querySelectorAll('[data-rj-flag]').forEach(function (el) {
        el.checked = false;
    });
    if (typeof setStatus === 'function') setStatus('已清空');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        regexJavaEscape: regexJavaEscape,
        regexToJava: regexToJava,
        rjParseFlags: rjParseFlags,
        RJ_FLAG_MAP: RJ_FLAG_MAP,
    };
}
