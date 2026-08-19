// JSON5 / JSONC 格式化与转标准 JSON
// 纯函数: stripJsonc / parseJson5ish / formatJson5 / toStrictJson

/**
 * 剥离 // 与 /* *\/ 注释（尊重字符串）
 * @param {string} text
 * @returns {string}
 */
function stripJsonc(text) {
    const s = String(text == null ? '' : text);
    let out = '';
    let i = 0;
    const n = s.length;
    let inStr = false;
    let quote = '';
    let escape = false;

    while (i < n) {
        const ch = s[i];
        const next = i + 1 < n ? s[i + 1] : '';

        if (inStr) {
            out += ch;
            if (escape) {
                escape = false;
            } else if (ch === '\\') {
                escape = true;
            } else if (ch === quote) {
                inStr = false;
                quote = '';
            }
            i++;
            continue;
        }

        if (ch === '"' || ch === "'") {
            inStr = true;
            quote = ch;
            out += ch;
            i++;
            continue;
        }

        // 行注释
        if (ch === '/' && next === '/') {
            i += 2;
            while (i < n && s[i] !== '\n' && s[i] !== '\r') i++;
            continue;
        }
        // 块注释
        if (ch === '/' && next === '*') {
            i += 2;
            while (i < n - 1 && !(s[i] === '*' && s[i + 1] === '/')) i++;
            i = Math.min(n, i + 2);
            out += ' ';
            continue;
        }

        out += ch;
        i++;
    }
    return out;
}

/**
 * 去掉对象/数组中的尾逗号
 * @param {string} text
 * @returns {string}
 */
function j5StripTrailingCommas(text) {
    let s = String(text);
    // 重复处理嵌套
    let prev;
    do {
        prev = s;
        s = s.replace(/,(\s*[}\]])/g, '$1');
    } while (s !== prev);
    return s;
}

/**
 * 无引号 key → 双引号 key（简化 JSON5）
 * @param {string} text
 * @returns {string}
 */
function j5QuoteKeys(text) {
    let s = String(text);
    // { key: 或 , key:
    s = s.replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":');
    return s;
}

/**
 * 单引号字符串 → 双引号（简化）
 * @param {string} text
 * @returns {string}
 */
function j5SingleToDouble(text) {
    const s = String(text);
    let out = '';
    let i = 0;
    const n = s.length;
    let inDouble = false;
    let escape = false;

    while (i < n) {
        const ch = s[i];
        if (inDouble) {
            out += ch;
            if (escape) escape = false;
            else if (ch === '\\') escape = true;
            else if (ch === '"') inDouble = false;
            i++;
            continue;
        }
        if (ch === '"') {
            inDouble = true;
            out += ch;
            i++;
            continue;
        }
        if (ch === "'") {
            // 读到匹配单引号
            out += '"';
            i++;
            while (i < n) {
                const c = s[i];
                if (c === '\\' && i + 1 < n) {
                    const nx = s[i + 1];
                    if (nx === "'") {
                        out += "'";
                        i += 2;
                        continue;
                    }
                    out += c + nx;
                    i += 2;
                    continue;
                }
                if (c === "'") {
                    out += '"';
                    i++;
                    break;
                }
                if (c === '"') {
                    out += '\\"';
                    i++;
                    continue;
                }
                out += c;
                i++;
            }
            continue;
        }
        out += ch;
        i++;
    }
    return out;
}

/**
 * 解析 JSON5/JSONC 风格文本为 JS 值
 * @param {string} text
 * @returns {*}
 */
function parseJson5ish(text) {
    if (text == null || !String(text).trim()) {
        throw new Error('内容为空');
    }
    let s = stripJsonc(text);
    s = j5StripTrailingCommas(s);
    s = j5SingleToDouble(s);
    s = j5QuoteKeys(s);
    // 允许十六进制等：不支持时让 JSON.parse 抛错
    try {
        return JSON.parse(s);
    } catch (e) {
        throw new Error('解析失败: ' + e.message);
    }
}

/**
 * 格式化
 * @param {string} text
 * @param {number|string} [indent=2]
 * @returns {string}
 */
function formatJson5(text, indent) {
    const ind = indent === undefined || indent === null ? 2 : indent;
    const space = typeof ind === 'number' ? ind : String(ind);
    const value = parseJson5ish(text);
    return JSON.stringify(value, null, space);
}

/**
 * 转为标准 JSON（压缩或美化）
 * @param {string} text
 * @param {object} [options]
 * @param {boolean} [options.pretty=true]
 * @param {number} [options.indent=2]
 * @returns {string}
 */
function toStrictJson(text, options) {
    options = options || {};
    const value = parseJson5ish(text);
    if (options.pretty === false) return JSON.stringify(value);
    const ind = options.indent != null ? options.indent : 2;
    return JSON.stringify(value, null, ind);
}

// ========== UI ==========

function j5DoFormat() {
    const input = document.getElementById('j5Input').value;
    const out = document.getElementById('j5Output');
    try {
        const indent = parseInt(document.getElementById('j5Indent').value, 10) || 2;
        out.textContent = formatJson5(input, indent);
        out.className = 'output-box';
        setStatus('已格式化');
    } catch (e) {
        out.textContent = '失败: ' + e.message;
        out.className = 'output-box error';
        setStatus('格式化失败');
    }
}

function j5ToStrict() {
    const input = document.getElementById('j5Input').value;
    const out = document.getElementById('j5Output');
    try {
        const pretty = document.getElementById('j5Pretty').checked;
        out.textContent = toStrictJson(input, { pretty: pretty });
        out.className = 'output-box';
        setStatus('已转为标准 JSON');
    } catch (e) {
        out.textContent = '失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function j5Minify() {
    const input = document.getElementById('j5Input').value;
    const out = document.getElementById('j5Output');
    try {
        out.textContent = toStrictJson(input, { pretty: false });
        out.className = 'output-box';
        setStatus('已压缩');
    } catch (e) {
        out.textContent = '失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function j5Clear() {
    document.getElementById('j5Input').value = '';
    document.getElementById('j5Output').textContent = '';
    setStatus('已清空');
}

function j5LoadSample() {
    document.getElementById('j5Input').value = [
        '{',
        '  // 用户配置',
        "  name: 'DevCoffer',",
        '  version: "1.0.0",',
        '  features: [',
        '    "json5",',
        '    "jsonc", /* trailing comma ok */',
        '  ],',
        '  nested: {',
        '    enabled: true,',
        '    count: 3,',
        '  },',
        '}',
    ].join('\n');
    setStatus('已加载示例');
}

if (typeof registerInit !== 'undefined') {
    registerInit('json5fmt', function () {});
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        stripJsonc: stripJsonc,
        parseJson5ish: parseJson5ish,
        formatJson5: formatJson5,
        toStrictJson: toStrictJson,
        j5StripTrailingCommas: j5StripTrailingCommas,
        j5QuoteKeys: j5QuoteKeys,
    };
}
