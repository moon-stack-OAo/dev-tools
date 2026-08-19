// INI / Config 格式化与校验
// 纯函数: parseIni / formatIni / iniToJson / jsonToIni

/**
 * 解析 INI 文本
 * @param {string} text
 * @returns {{
 *   sections: Array<{name:string, entries:Array<{key:string,value:string,line:number}>}>,
 *   map: Object.<string, Object.<string,string>|string>,
 *   duplicates: Array<{section:string,key:string,lines:number[]}>,
 *   comments: Array<{line:number,raw:string}>
 * }}
 */
function parseIni(text) {
    const sections = [];
    const map = Object.create(null);
    const duplicates = [];
    const comments = [];
    const keyLines = Object.create(null);

    let current = { name: '', entries: [] };
    sections.push(current);
    map[''] = Object.create(null);

    const lines = String(text == null ? '' : text).split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
        const lineNo = i + 1;
        const raw = lines[i];
        const trimmed = raw.trim();
        if (!trimmed) continue;

        if (trimmed[0] === '#' || trimmed[0] === ';') {
            comments.push({ line: lineNo, raw: raw });
            continue;
        }

        // [section]
        const sec = trimmed.match(/^\[([^\]]*)\]\s*$/);
        if (sec) {
            const name = sec[1].trim();
            current = { name: name, entries: [] };
            sections.push(current);
            if (!map[name]) map[name] = Object.create(null);
            continue;
        }

        // key=value 或 key: value
        let eq = trimmed.indexOf('=');
        const colon = trimmed.indexOf(':');
        if (eq < 0 || (colon >= 0 && colon < eq)) eq = colon;
        if (eq < 0) continue;

        let key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        // 行尾注释（未引号时）
        if (!(value[0] === '"' || value[0] === "'")) {
            value = value.replace(/\s+[;#].*$/, '');
        } else {
            value = iniUnquote(value);
        }

        if (!key) continue;
        current.entries.push({ key: key, value: value, line: lineNo });

        const secName = current.name;
        const dupKey = secName + '\0' + key;
        if (keyLines[dupKey]) {
            keyLines[dupKey].push(lineNo);
            let dup = duplicates.find(function (d) {
                return d.section === secName && d.key === key;
            });
            if (!dup) {
                duplicates.push({ section: secName, key: key, lines: keyLines[dupKey].slice() });
            } else {
                dup.lines = keyLines[dupKey].slice();
            }
        } else {
            keyLines[dupKey] = [lineNo];
        }

        if (!map[secName]) map[secName] = Object.create(null);
        map[secName][key] = value;
    }

    // 去掉空的默认 section（若无 entries 且还有其他 section）
    if (sections.length > 1 && sections[0].name === '' && sections[0].entries.length === 0) {
        sections.shift();
    }

    return {
        sections: sections,
        map: map,
        duplicates: duplicates,
        comments: comments,
    };
}

function iniUnquote(raw) {
    let v = String(raw || '').trim();
    if (v.length >= 2) {
        const q = v[0];
        if ((q === '"' || q === "'") && v[v.length - 1] === q) {
            return v.slice(1, -1);
        }
    }
    return v;
}

/**
 * 格式化 INI
 * @param {string|object} input 文本 / parseIni 结果 / 嵌套对象
 * @param {object} [options]
 * @param {boolean} [options.sort=false] section 与 key 排序
 * @param {boolean} [options.dedupe=true] 去重 key（保留最后一次）
 * @param {string} [options.separator=' = ']
 * @param {boolean} [options.spaceAroundEq] 同 separator
 * @returns {string}
 */
function formatIni(input, options) {
    options = options || {};
    const dedupe = options.dedupe !== false;
    const sort = !!options.sort;
    const sep = options.separator != null ? options.separator : options.spaceAroundEq === false ? '=' : ' = ';

    let sections = [];

    if (typeof input === 'string') {
        const parsed = parseIni(input);
        sections = parsed.sections.map(function (s) {
            return {
                name: s.name,
                entries: s.entries.map(function (e) {
                    return { key: e.key, value: e.value };
                }),
            };
        });
    } else if (input && Array.isArray(input.sections)) {
        sections = input.sections.map(function (s) {
            return {
                name: s.name,
                entries: (s.entries || []).map(function (e) {
                    return { key: e.key, value: e.value };
                }),
            };
        });
    } else if (input && typeof input === 'object') {
        const src = input.map && typeof input.map === 'object' ? input.map : input;
        Object.keys(src).forEach(function (sec) {
            const val = src[sec];
            if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
                const entries = Object.keys(val).map(function (k) {
                    return { key: k, value: val[k] == null ? '' : String(val[k]) };
                });
                sections.push({ name: sec === '_root' || sec === '' ? '' : sec, entries: entries });
            } else {
                // 扁平
                if (!sections.length) sections.push({ name: '', entries: [] });
                sections[0].entries.push({ key: sec, value: val == null ? '' : String(val) });
            }
        });
    }

    if (dedupe) {
        sections = sections.map(function (s) {
            const seen = Object.create(null);
            const entries = [];
            for (let i = s.entries.length - 1; i >= 0; i--) {
                const e = s.entries[i];
                if (seen[e.key]) continue;
                seen[e.key] = true;
                entries.unshift(e);
            }
            return { name: s.name, entries: entries };
        });
    }

    if (sort) {
        sections = sections.slice().sort(function (a, b) {
            if (a.name === '') return -1;
            if (b.name === '') return 1;
            return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
        });
        sections.forEach(function (s) {
            s.entries = s.entries.slice().sort(function (a, b) {
                return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
            });
        });
    }

    // key 对齐
    const lines = [];
    sections.forEach(function (s, idx) {
        if (s.name) {
            if (lines.length) lines.push('');
            lines.push('[' + s.name + ']');
        } else if (idx > 0 && lines.length) {
            lines.push('');
        }
        let maxKey = 0;
        s.entries.forEach(function (e) {
            if (e.key.length > maxKey) maxKey = e.key.length;
        });
        s.entries.forEach(function (e) {
            const pad = e.key + ' '.repeat(Math.max(0, maxKey - e.key.length));
            let val = e.value == null ? '' : String(e.value);
            if (/[;#=\n]/.test(val) || /^\s|\s$/.test(val)) {
                val = '"' + val.replace(/"/g, '\\"') + '"';
            }
            lines.push(pad + sep + val);
        });
    });
    return lines.join('\n');
}

/**
 * INI → JSON
 * @param {string} text
 * @param {object} [options]
 * @param {boolean} [options.pretty=true]
 * @param {boolean} [options.asObject=false]
 * @returns {string|object}
 */
function iniToJson(text, options) {
    options = options || {};
    const parsed = parseIni(text);
    const obj = {};
    Object.keys(parsed.map).forEach(function (sec) {
        const key = sec === '' ? '_root' : sec;
        obj[key] = Object.assign({}, parsed.map[sec]);
    });
    // 若只有 _root 且无其他，可扁平
    if (Object.keys(obj).length === 1 && obj._root) {
        const flat = obj._root;
        if (options.asObject) return flat;
        return options.pretty !== false ? JSON.stringify(flat, null, 2) : JSON.stringify(flat);
    }
    if (options.asObject) return obj;
    return options.pretty !== false ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
}

/**
 * JSON → INI
 * @param {string|object} input
 * @param {object} [options]
 * @returns {string}
 */
function jsonToIni(input, options) {
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
    // 扁平对象 → 默认 section
    const first = Object.keys(obj)[0];
    const isNested =
        first !== undefined &&
        obj[first] !== null &&
        typeof obj[first] === 'object' &&
        !Array.isArray(obj[first]);
    if (!isNested) {
        return formatIni({ '': obj }, options);
    }
    const map = Object.create(null);
    Object.keys(obj).forEach(function (k) {
        const sec = k === '_root' ? '' : k;
        map[sec] = obj[k];
    });
    return formatIni({ map: map }, options);
}

// ========== UI ==========

function inifmtDoFormat() {
    const input = document.getElementById('iniInput').value;
    const out = document.getElementById('iniOutput');
    const warn = document.getElementById('iniWarn');
    try {
        const parsed = parseIni(input);
        const text = formatIni(input, {
            sort: document.getElementById('iniSort').checked,
            dedupe: document.getElementById('iniDedupe').checked,
        });
        out.textContent = text;
        out.className = 'output-box';
        if (parsed.duplicates.length) {
            warn.style.display = 'block';
            warn.textContent =
                '重复 key: ' +
                parsed.duplicates
                    .map(function (d) {
                        const sec = d.section ? '[' + d.section + '] ' : '';
                        return sec + d.key + ' (行 ' + d.lines.join(', ') + ')';
                    })
                    .join('; ');
        } else {
            warn.style.display = 'none';
            warn.textContent = '';
        }
        let count = 0;
        parsed.sections.forEach(function (s) {
            count += s.entries.length;
        });
        setStatus('已格式化 ' + parsed.sections.length + ' 个 section，' + count + ' 个键');
    } catch (e) {
        out.textContent = '失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function inifmtToJson() {
    const input = document.getElementById('iniInput').value;
    const out = document.getElementById('iniOutput');
    try {
        out.textContent = iniToJson(input);
        out.className = 'output-box';
        setStatus('已转为 JSON');
    } catch (e) {
        out.textContent = '失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function inifmtFromJson() {
    const input = document.getElementById('iniInput').value;
    const out = document.getElementById('iniOutput');
    try {
        out.textContent = jsonToIni(input, {
            sort: document.getElementById('iniSort').checked,
        });
        out.className = 'output-box';
        setStatus('已从 JSON 生成 INI');
    } catch (e) {
        out.textContent = '失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function inifmtClear() {
    document.getElementById('iniInput').value = '';
    document.getElementById('iniOutput').textContent = '';
    const warn = document.getElementById('iniWarn');
    warn.style.display = 'none';
    warn.textContent = '';
    setStatus('已清空');
}

function inifmtLoadSample() {
    document.getElementById('iniInput').value = [
        '; application config',
        'app_name = DevCoffer',
        'debug = true',
        '',
        '[database]',
        'host = localhost',
        'port = 3306',
        'user = root',
        'password = secret',
        'port = 5432',
        '',
        '[server]',
        'listen = 0.0.0.0',
        'port = 8080',
    ].join('\n');
    setStatus('已加载示例');
}

if (typeof registerInit !== 'undefined') {
    registerInit('inifmt', function () {});
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseIni: parseIni,
        formatIni: formatIni,
        iniToJson: iniToJson,
        jsonToIni: jsonToIni,
        iniUnquote: iniUnquote,
    };
}
