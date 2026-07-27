// .env / 环境变量：解析、格式化对齐、JSON 互转、重复 key 检测

/**
 * 解析单行 VALUE 部分的引号
 * @param {string} raw
 * @returns {string}
 */
function envUnquote(raw) {
    let v = raw == null ? '' : String(raw);
    // 行尾注释：仅当未用引号包住时剥离（空格+#）
    if (v.length >= 2) {
        const q = v[0];
        if ((q === '"' || q === "'") && v[v.length - 1] === q) {
            const inner = v.slice(1, -1);
            if (q === '"') {
                return inner
                    .replace(/\\n/g, '\n')
                    .replace(/\\r/g, '\r')
                    .replace(/\\t/g, '\t')
                    .replace(/\\\\/g, '\\')
                    .replace(/\\"/g, '"');
            }
            // 单引号：字面量，仅还原 \'
            return inner.replace(/\\'/g, "'");
        }
    }
    // 未引号：去掉行尾 # 注释
    const hash = v.search(/(^|[^\\])\s+#/);
    if (hash >= 0) {
        const at = v[hash] === '#' ? hash : v.indexOf('#', hash);
        v = v.slice(0, at).trimEnd();
    } else if (v.indexOf('#') === 0) {
        v = '';
    }
    return v.trim();
}

/**
 * 解析 .env 文本
 * @param {string} text
 * @returns {{
 *   entries: Array<{key:string,value:string,export:boolean,raw:string,line:number}>,
 *   map: Object.<string,string>,
 *   duplicates: Array<{key:string,lines:number[]}>,
 *   comments: Array<{line:number,raw:string}>
 * }}
 */
function parseEnv(text) {
    const entries = [];
    const map = Object.create(null);
    const keyLines = Object.create(null);
    const duplicates = [];
    const comments = [];
    const lines = String(text == null ? '' : text).split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
        const lineNo = i + 1;
        const raw = lines[i];
        const trimmed = raw.trim();
        if (!trimmed) continue;
        if (trimmed[0] === '#') {
            comments.push({ line: lineNo, raw: raw });
            continue;
        }

        let work = trimmed;
        let isExport = false;
        if (/^export\s+/i.test(work)) {
            isExport = true;
            work = work.replace(/^export\s+/i, '');
        }

        const eq = work.indexOf('=');
        if (eq < 0) {
            // 无 = 的行忽略（或仅 key）
            continue;
        }
        const key = work.slice(0, eq).trim();
        if (!key || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
            // 宽松：允许更多 key 字符
            if (!key) continue;
        }
        const valueRaw = work.slice(eq + 1);
        // 去掉 value 前导空白（除非整段被引号）
        const value = envUnquote(valueRaw.replace(/^\s+/, ''));

        entries.push({
            key: key,
            value: value,
            export: isExport,
            raw: raw,
            line: lineNo,
        });

        if (keyLines[key]) {
            keyLines[key].push(lineNo);
            let dup = duplicates.find(function (d) {
                return d.key === key;
            });
            if (!dup) {
                dup = { key: key, lines: keyLines[key].slice() };
                duplicates.push(dup);
            } else {
                dup.lines = keyLines[key].slice();
            }
        } else {
            keyLines[key] = [lineNo];
        }
        map[key] = value;
    }

    return {
        entries: entries,
        map: map,
        duplicates: duplicates,
        comments: comments,
    };
}

/**
 * 格式化 .env（按 key 对齐 =）
 * @param {string|object} input 文本或 parseEnv 结果 / 普通对象
 * @param {object} [options]
 * @param {boolean} [options.sort=false]
 * @param {boolean} [options.exportPrefix=false]
 * @param {boolean} [options.quote=false] 始终双引号包裹 value
 * @returns {string}
 */
function formatEnv(input, options) {
    options = options || {};
    let pairs = [];
    if (typeof input === 'string') {
        const parsed = parseEnv(input);
        pairs = parsed.entries.map(function (e) {
            return { key: e.key, value: e.value, export: e.export };
        });
        // 去重：保留最后一次
        const seen = Object.create(null);
        const deduped = [];
        for (let i = pairs.length - 1; i >= 0; i--) {
            const p = pairs[i];
            if (seen[p.key]) continue;
            seen[p.key] = true;
            deduped.unshift(p);
        }
        pairs = deduped;
    } else if (input && Array.isArray(input.entries)) {
        pairs = input.entries.map(function (e) {
            return { key: e.key, value: e.value, export: !!e.export };
        });
    } else if (input && typeof input === 'object') {
        const src = input.map && typeof input.map === 'object' ? input.map : input;
        Object.keys(src).forEach(function (k) {
            if (k.charAt(0) === '_') return;
            pairs.push({ key: k, value: src[k] == null ? '' : String(src[k]), export: false });
        });
    }

    if (options.sort) {
        pairs = pairs.slice().sort(function (a, b) {
            return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
        });
    }

    let maxKey = 0;
    pairs.forEach(function (p) {
        if (p.key.length > maxKey) maxKey = p.key.length;
    });

    return pairs
        .map(function (p) {
            const prefix = options.exportPrefix || p.export ? 'export ' : '';
            const keyPad = p.key + ' '.repeat(Math.max(0, maxKey - p.key.length));
            let val = p.value == null ? '' : String(p.value);
            const needQuote =
                options.quote ||
                /[\s#"']/.test(val) ||
                val.indexOf('=') >= 0 ||
                val.indexOf('\n') >= 0;
            if (needQuote) {
                val =
                    '"' +
                    val
                        .replace(/\\/g, '\\\\')
                        .replace(/"/g, '\\"')
                        .replace(/\n/g, '\\n')
                        .replace(/\r/g, '\\r')
                        .replace(/\t/g, '\\t') +
                    '"';
            }
            return prefix + keyPad + ' = ' + val;
        })
        .join('\n');
}

/**
 * .env → JSON 对象字符串或对象
 * @param {string} text
 * @param {object} [options]
 * @param {boolean} [options.pretty=true]
 * @param {boolean} [options.asObject=false]
 * @returns {string|object}
 */
function envToJson(text, options) {
    options = options || {};
    const parsed = parseEnv(text);
    const obj = Object.assign({}, parsed.map);
    if (options.asObject) return obj;
    const pretty = options.pretty !== false;
    return pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
}

/**
 * JSON → .env
 * @param {string|object} input
 * @param {object} [options] 同 formatEnv
 * @returns {string}
 */
function jsonToEnv(input, options) {
    let obj;
    if (typeof input === 'string') {
        try {
            obj = JSON.parse(input);
        } catch (e) {
            throw new Error('JSON 解析失败: ' + e.message);
        }
    } else {
        obj = input;
    }
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
        throw new Error('JSON 须为对象');
    }
    const flat = Object.create(null);
    Object.keys(obj).forEach(function (k) {
        const v = obj[k];
        if (v === null || v === undefined) {
            flat[k] = '';
        } else if (typeof v === 'object') {
            flat[k] = JSON.stringify(v);
        } else {
            flat[k] = String(v);
        }
    });
    return formatEnv(flat, options);
}

// ========== UI ==========

function envfmtDoFormat() {
    const input = document.getElementById('envfmtInput').value;
    const out = document.getElementById('envfmtOutput');
    const warn = document.getElementById('envfmtWarn');
    try {
        const parsed = parseEnv(input);
        const sorted = document.getElementById('envfmtSort').checked;
        const exp = document.getElementById('envfmtExport').checked;
        const text = formatEnv(input, { sort: sorted, exportPrefix: exp });
        out.textContent = text;
        out.className = 'output-box';
        if (parsed.duplicates.length) {
            warn.style.display = 'block';
            warn.textContent =
                '重复 key: ' +
                parsed.duplicates
                    .map(function (d) {
                        return d.key + ' (行 ' + d.lines.join(', ') + ')';
                    })
                    .join('; ');
        } else {
            warn.style.display = 'none';
            warn.textContent = '';
        }
        setStatus('已格式化 ' + Object.keys(parsed.map).length + ' 个变量');
    } catch (e) {
        out.textContent = '失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function envfmtToJson() {
    const input = document.getElementById('envfmtInput').value;
    const out = document.getElementById('envfmtOutput');
    try {
        out.textContent = envToJson(input);
        out.className = 'output-box';
        setStatus('已转为 JSON');
    } catch (e) {
        out.textContent = '失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function envfmtFromJson() {
    const input = document.getElementById('envfmtInput').value;
    const out = document.getElementById('envfmtOutput');
    try {
        const sorted = document.getElementById('envfmtSort').checked;
        const exp = document.getElementById('envfmtExport').checked;
        out.textContent = jsonToEnv(input, { sort: sorted, exportPrefix: exp });
        out.className = 'output-box';
        setStatus('已从 JSON 生成 .env');
    } catch (e) {
        out.textContent = '失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function envfmtClear() {
    document.getElementById('envfmtInput').value = '';
    document.getElementById('envfmtOutput').textContent = '';
    const warn = document.getElementById('envfmtWarn');
    warn.style.display = 'none';
    warn.textContent = '';
    setStatus('已清空');
}

function envfmtLoadSample() {
    document.getElementById('envfmtInput').value = [
        '# Database',
        'DB_HOST=localhost',
        'DB_PORT=5432',
        'DB_NAME="my app"',
        'export API_KEY=secret123',
        'APP_ENV=development',
        'APP_ENV=production',
        "GREETING='hello world'",
    ].join('\n');
    setStatus('已加载示例');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseEnv: parseEnv,
        formatEnv: formatEnv,
        envToJson: envToJson,
        jsonToEnv: jsonToEnv,
        envUnquote: envUnquote,
    };
}
