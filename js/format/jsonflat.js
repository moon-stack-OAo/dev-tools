// JSON 扁平化 / 反扁平化（点号或括号路径）

/**
 * 解析输入为 JSON 值（支持字符串或已解析对象）
 * @param {*} input
 * @returns {{ ok: boolean, value?: *, msg?: string }}
 */
function jfParseInput(input) {
    if (input === undefined || input === null) {
        return { ok: false, msg: '输入不能为空' };
    }
    if (typeof input === 'string') {
        const s = input.trim();
        if (!s) {
            return { ok: false, msg: '输入不能为空' };
        }
        try {
            return { ok: true, value: JSON.parse(s) };
        } catch (e) {
            return { ok: false, msg: 'JSON 解析失败: ' + e.message };
        }
    }
    return { ok: true, value: input };
}

/**
 * 将值写入扁平 Map；空对象/空数组作为叶子保留
 * @param {*} value
 * @param {string} path
 * @param {Object} flat
 * @param {string} sep
 * @param {'bracket'|'dot'} arrayStyle
 */
function jfWalkFlatten(value, path, flat, sep, arrayStyle) {
    if (value === null || typeof value !== 'object') {
        flat[path === '' ? '' : path] = value;
        return;
    }
    if (Array.isArray(value)) {
        if (value.length === 0) {
            flat[path === '' ? '' : path] = [];
            return;
        }
        for (let i = 0; i < value.length; i++) {
            let next;
            if (arrayStyle === 'dot') {
                next = path === '' ? String(i) : path + sep + i;
            } else {
                next = path === '' ? '[' + i + ']' : path + '[' + i + ']';
            }
            jfWalkFlatten(value[i], next, flat, sep, arrayStyle);
        }
        return;
    }
    const keys = Object.keys(value);
    if (keys.length === 0) {
        flat[path === '' ? '' : path] = {};
        return;
    }
    for (let k = 0; k < keys.length; k++) {
        const key = keys[k];
        const next = path === '' ? key : path + sep + key;
        jfWalkFlatten(value[key], next, flat, sep, arrayStyle);
    }
}

/**
 * 嵌套 JSON → 扁平 Map
 * @param {string|*} objOrJson
 * @param {{ separator?: string, arrayStyle?: 'bracket'|'dot' }} [options]
 * @returns {{ ok: boolean, result: string|null, msg: string }}
 */
function jsonFlatten(objOrJson, options) {
    options = options || {};
    const sep = options.separator != null && options.separator !== '' ? String(options.separator) : '.';
    const arrayStyle = options.arrayStyle === 'dot' ? 'dot' : 'bracket';

    const parsed = jfParseInput(objOrJson);
    if (!parsed.ok) {
        return { ok: false, result: null, msg: parsed.msg };
    }

    try {
        const flat = Object.create(null);
        const value = parsed.value;
        if (value === null || typeof value !== 'object') {
            flat[''] = value;
        } else {
            jfWalkFlatten(value, '', flat, sep, arrayStyle);
        }
        // 转为普通对象以稳定 JSON 输出
        const out = {};
        Object.keys(flat).forEach(function (k) {
            out[k] = flat[k];
        });
        return { ok: true, result: JSON.stringify(out, null, 2), msg: '扁平化成功' };
    } catch (e) {
        return { ok: false, result: null, msg: '扁平化失败: ' + e.message };
    }
}

/**
 * 将路径拆为 token
 * bracket: a.b[0].c / [0].x
 * dot: a.b.0.c
 * @param {string} path
 * @param {string} sep
 * @param {'bracket'|'dot'} arrayStyle
 * @returns {Array<{type:'key'|'index', value: string|number}>}
 */
function jfParsePath(path, sep, arrayStyle) {
    const tokens = [];
    if (path === '' || path == null) {
        return tokens;
    }
    const s = String(path);
    if (arrayStyle === 'dot') {
        if (sep === '') {
            tokens.push({ type: 'key', value: s });
            return tokens;
        }
        const parts = s.split(sep);
        for (let i = 0; i < parts.length; i++) {
            const p = parts[i];
            if (p === '') continue;
            if (/^\d+$/.test(p)) {
                tokens.push({ type: 'index', value: parseInt(p, 10) });
            } else {
                tokens.push({ type: 'key', value: p });
            }
        }
        return tokens;
    }
    // bracket 风格：键用 sep 分隔，数组下标为 [n]
    let i = 0;
    const n = s.length;
    while (i < n) {
        if (s[i] === '[') {
            const close = s.indexOf(']', i);
            if (close < 0) {
                throw new Error('路径括号未闭合: ' + path);
            }
            const idxStr = s.slice(i + 1, close);
            if (!/^\d+$/.test(idxStr)) {
                throw new Error('非法数组下标: ' + idxStr);
            }
            tokens.push({ type: 'index', value: parseInt(idxStr, 10) });
            i = close + 1;
            if (i < n && sep && s.startsWith(sep, i)) {
                i += sep.length;
            }
            continue;
        }
        // 读取到下一个 [ 或 sep
        let end = n;
        const bracket = s.indexOf('[', i);
        if (bracket >= 0 && bracket < end) end = bracket;
        if (sep) {
            const si = s.indexOf(sep, i);
            if (si >= 0 && si < end) end = si;
        }
        const key = s.slice(i, end);
        if (key !== '') {
            tokens.push({ type: 'key', value: key });
        }
        i = end;
        if (sep && i < n && s.startsWith(sep, i)) {
            i += sep.length;
        }
    }
    return tokens;
}

/**
 * 在容器上按 token 写入叶子值
 * @param {*} root
 * @param {Array<{type:string,value:*}>} tokens
 * @param {*} leaf
 * @returns {*}
 */
function jfSetByTokens(root, tokens, leaf) {
    if (tokens.length === 0) {
        return leaf;
    }
    let cur = root;
    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        const last = i === tokens.length - 1;
        const key = t.type === 'index' ? t.value : t.value;
        if (last) {
            if (Array.isArray(cur)) {
                cur[key] = leaf;
            } else {
                cur[key] = leaf;
            }
            break;
        }
        const nextTok = tokens[i + 1];
        let next = Array.isArray(cur) ? cur[key] : cur[key];
        if (next === undefined || next === null || typeof next !== 'object') {
            next = nextTok.type === 'index' ? [] : {};
            if (Array.isArray(cur)) {
                cur[key] = next;
            } else {
                cur[key] = next;
            }
        }
        cur = next;
    }
    return root;
}

/**
 * 若对象键为连续 0..n 数字，转为数组（递归）
 * @param {*} node
 * @returns {*}
 */
function jfMaybeToArray(node) {
    if (node === null || typeof node !== 'object') {
        return node;
    }
    if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) {
            node[i] = jfMaybeToArray(node[i]);
        }
        return node;
    }
    const keys = Object.keys(node);
    for (let i = 0; i < keys.length; i++) {
        node[keys[i]] = jfMaybeToArray(node[keys[i]]);
    }
    if (keys.length === 0) {
        return node;
    }
    const nums = [];
    for (let i = 0; i < keys.length; i++) {
        if (!/^\d+$/.test(keys[i])) {
            return node;
        }
        nums.push(parseInt(keys[i], 10));
    }
    nums.sort(function (a, b) {
        return a - b;
    });
    for (let i = 0; i < nums.length; i++) {
        if (nums[i] !== i) {
            return node;
        }
    }
    const arr = [];
    for (let i = 0; i < nums.length; i++) {
        arr[i] = node[String(i)];
    }
    return arr;
}

/**
 * 扁平 Map → 嵌套 JSON
 * @param {string|Object} flatObjOrJson
 * @param {{ separator?: string, arrayStyle?: 'bracket'|'dot' }} [options]
 * @returns {{ ok: boolean, result: string|null, msg: string }}
 */
function jsonUnflatten(flatObjOrJson, options) {
    options = options || {};
    const sep = options.separator != null && options.separator !== '' ? String(options.separator) : '.';
    const arrayStyle = options.arrayStyle === 'dot' ? 'dot' : 'bracket';

    const parsed = jfParseInput(flatObjOrJson);
    if (!parsed.ok) {
        return { ok: false, result: null, msg: parsed.msg };
    }
    const flat = parsed.value;
    if (flat === null || typeof flat !== 'object' || Array.isArray(flat)) {
        return { ok: false, result: null, msg: '反扁平化输入须为扁平对象（Map）' };
    }

    try {
        const keys = Object.keys(flat);
        // 仅根叶子（空路径）
        if (keys.length === 1 && keys[0] === '') {
            return {
                ok: true,
                result: JSON.stringify(flat[''], null, 2),
                msg: '反扁平化成功',
            };
        }

        // 判断根是数组还是对象
        let rootIsArray = false;
        if (keys.length > 0) {
            const firstTokens = jfParsePath(keys[0], sep, arrayStyle);
            if (firstTokens.length > 0 && firstTokens[0].type === 'index') {
                rootIsArray = true;
            }
        }

        let root = rootIsArray ? [] : {};
        for (let i = 0; i < keys.length; i++) {
            const path = keys[i];
            const leaf = flat[path];
            if (path === '') {
                // 混合空路径与其它键时，空路径作为整体值无意义，跳过
                continue;
            }
            const tokens = jfParsePath(path, sep, arrayStyle);
            if (tokens.length === 0) {
                continue;
            }
            // 确保根类型与首 token 一致
            if (i === 0 || (Array.isArray(root) && tokens[0].type !== 'index')) {
                if (tokens[0].type === 'index' && !Array.isArray(root)) {
                    root = [];
                }
            }
            root = jfSetByTokens(root, tokens, leaf);
        }

        root = jfMaybeToArray(root);
        return { ok: true, result: JSON.stringify(root, null, 2), msg: '反扁平化成功' };
    } catch (e) {
        return { ok: false, result: null, msg: '反扁平化失败: ' + e.message };
    }
}

// ---------- UI ----------

function jfGetOptions() {
    const sepEl = document.getElementById('jfSeparator');
    const styleEl = document.getElementById('jfArrayStyle');
    return {
        separator: sepEl ? sepEl.value : '.',
        arrayStyle: styleEl ? styleEl.value : 'bracket',
    };
}

function jfSetOutput(text, isError) {
    const out = document.getElementById('jfOutput');
    if (!out) return;
    out.textContent = text;
    out.className = isError ? 'output-box error' : 'output-box';
}

function jfSetStatus(msg) {
    if (typeof setStatus === 'function') {
        setStatus(msg);
    }
}

function jsonflatFlatten() {
    const input = document.getElementById('jfInput').value;
    const r = jsonFlatten(input, jfGetOptions());
    if (!r.ok) {
        jfSetOutput(r.msg, true);
        jfSetStatus(r.msg);
        return;
    }
    jfSetOutput(r.result, false);
    jfSetStatus(r.msg);
}

function jsonflatUnflatten() {
    const input = document.getElementById('jfInput').value;
    const r = jsonUnflatten(input, jfGetOptions());
    if (!r.ok) {
        jfSetOutput(r.msg, true);
        jfSetStatus(r.msg);
        return;
    }
    jfSetOutput(r.result, false);
    jfSetStatus(r.msg);
}

function jsonflatClear() {
    document.getElementById('jfInput').value = '';
    jfSetOutput('', false);
    jfSetStatus('已清空');
}

function jsonflatLoadSample() {
    const sample = {
        user: {
            name: 'alice',
            age: 30,
            tags: ['admin', 'dev'],
            address: {
                city: 'Shanghai',
                zip: '200000',
            },
        },
        active: true,
        scores: [95, 88],
    };
    document.getElementById('jfInput').value = JSON.stringify(sample, null, 2);
    jfSetStatus('已加载示例');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        jsonFlatten: jsonFlatten,
        jsonUnflatten: jsonUnflatten,
        jfParsePath: jfParsePath,
        jfMaybeToArray: jfMaybeToArray,
    };
}
