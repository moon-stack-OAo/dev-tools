// JSON 结构化对比（增 / 删 / 改 / 类型变化）

/**
 * 解析 JSON 输入
 * @param {*} input
 * @returns {{ ok: boolean, value?: *, msg?: string }}
 */
function jdParse(input) {
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
 * 类型标签
 * @param {*} v
 * @returns {string}
 */
function jdTypeOf(v) {
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'array';
    return typeof v;
}

/**
 * 格式化叶子值（用于报告）
 * @param {*} v
 * @returns {string}
 */
function jdFmt(v) {
    if (v === undefined) return '(无)';
    try {
        return JSON.stringify(v);
    } catch (e) {
        return String(v);
    }
}

/**
 * 路径追加 key
 * @param {string} path
 * @param {string} key
 * @returns {string}
 */
function jdPathKey(path, key) {
    if (path === '$' || path === '') {
        return '$.' + key;
    }
    return path + '.' + key;
}

/**
 * 路径追加数组下标
 * @param {string} path
 * @param {number} i
 * @returns {string}
 */
function jdPathIndex(path, i) {
    const base = path === '' ? '$' : path;
    return base + '[' + i + ']';
}

/**
 * 深度相等
 * @param {*} a
 * @param {*} b
 * @returns {boolean}
 */
function jdDeepEqual(a, b) {
    if (a === b) return true;
    if (a === null || b === null) return a === b;
    if (typeof a !== typeof b) return false;
    if (typeof a !== 'object') return a === b;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (!jdDeepEqual(a[i], b[i])) return false;
        }
        return true;
    }
    const ak = Object.keys(a);
    const bk = Object.keys(b);
    if (ak.length !== bk.length) return false;
    for (let i = 0; i < ak.length; i++) {
        const k = ak[i];
        if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
        if (!jdDeepEqual(a[k], b[k])) return false;
    }
    return true;
}

/**
 * 递归对比
 * @param {*} left
 * @param {*} right
 * @param {string} path
 * @param {Array} diffs
 * @param {{ ignoreArrayOrder?: boolean }} options
 */
function jdWalk(left, right, path, diffs, options) {
    const lt = jdTypeOf(left);
    const rt = jdTypeOf(right);

    if (lt !== rt) {
        diffs.push({
            path: path || '$',
            type: 'type_changed',
            left: left,
            right: right,
        });
        return;
    }

    // 原始类型 / null
    if (lt !== 'object' && lt !== 'array') {
        if (left !== right) {
            diffs.push({
                path: path || '$',
                type: 'changed',
                left: left,
                right: right,
            });
        }
        return;
    }

    if (lt === 'array') {
        if (options.ignoreArrayOrder) {
            jdDiffArrayIgnoreOrder(left, right, path, diffs, options);
        } else {
            const max = Math.max(left.length, right.length);
            for (let i = 0; i < max; i++) {
                const p = jdPathIndex(path || '$', i);
                if (i >= left.length) {
                    diffs.push({ path: p, type: 'added', left: undefined, right: right[i] });
                } else if (i >= right.length) {
                    diffs.push({ path: p, type: 'removed', left: left[i], right: undefined });
                } else {
                    jdWalk(left[i], right[i], p, diffs, options);
                }
            }
        }
        return;
    }

    // 对象
    const lKeys = Object.keys(left);
    const rKeys = Object.keys(right);
    const seen = Object.create(null);

    for (let i = 0; i < lKeys.length; i++) {
        const k = lKeys[i];
        seen[k] = true;
        const p = jdPathKey(path || '$', k);
        if (!Object.prototype.hasOwnProperty.call(right, k)) {
            diffs.push({ path: p, type: 'removed', left: left[k], right: undefined });
        } else {
            jdWalk(left[k], right[k], p, diffs, options);
        }
    }
    for (let i = 0; i < rKeys.length; i++) {
        const k = rKeys[i];
        if (seen[k]) continue;
        const p = jdPathKey(path || '$', k);
        diffs.push({ path: p, type: 'added', left: undefined, right: right[k] });
    }
}

/**
 * 数组忽略顺序：按深度相等做多重集匹配
 * @param {Array} left
 * @param {Array} right
 * @param {string} path
 * @param {Array} diffs
 * @param {Object} options
 */
function jdDiffArrayIgnoreOrder(left, right, path, diffs, options) {
    const used = [];
    for (let i = 0; i < right.length; i++) used[i] = false;

    for (let i = 0; i < left.length; i++) {
        let found = -1;
        for (let j = 0; j < right.length; j++) {
            if (used[j]) continue;
            if (jdDeepEqual(left[i], right[j])) {
                found = j;
                break;
            }
        }
        if (found >= 0) {
            used[found] = true;
        } else {
            diffs.push({
                path: jdPathIndex(path || '$', i),
                type: 'removed',
                left: left[i],
                right: undefined,
            });
        }
    }
    for (let j = 0; j < right.length; j++) {
        if (!used[j]) {
            diffs.push({
                path: jdPathIndex(path || '$', j),
                type: 'added',
                left: undefined,
                right: right[j],
            });
        }
    }
}

/**
 * 生成中文多行报告
 * @param {Array} diffs
 * @returns {string}
 */
function jdBuildText(diffs) {
    if (!diffs || diffs.length === 0) {
        return '两侧 JSON 完全一致，无差异。';
    }
    const typeLabel = {
        added: '新增',
        removed: '删除',
        changed: '修改',
        type_changed: '类型变化',
    };
    const lines = [];
    lines.push('共发现 ' + diffs.length + ' 处差异：');
    lines.push('');
    for (let i = 0; i < diffs.length; i++) {
        const d = diffs[i];
        const label = typeLabel[d.type] || d.type;
        lines.push((i + 1) + '. [' + label + '] ' + d.path);
        if (d.type === 'added') {
            lines.push('   右侧: ' + jdFmt(d.right));
        } else if (d.type === 'removed') {
            lines.push('   左侧: ' + jdFmt(d.left));
        } else if (d.type === 'type_changed') {
            lines.push('   左侧(' + jdTypeOf(d.left) + '): ' + jdFmt(d.left));
            lines.push('   右侧(' + jdTypeOf(d.right) + '): ' + jdFmt(d.right));
        } else {
            lines.push('   左侧: ' + jdFmt(d.left));
            lines.push('   右侧: ' + jdFmt(d.right));
        }
        lines.push('');
    }
    return lines.join('\n').replace(/\n$/, '');
}

/**
 * 汇总
 * @param {Array} diffs
 * @returns {{ total: number, added: number, removed: number, changed: number, type_changed: number }}
 */
function jdSummary(diffs) {
    const s = { total: 0, added: 0, removed: 0, changed: 0, type_changed: 0 };
    if (!diffs) return s;
    s.total = diffs.length;
    for (let i = 0; i < diffs.length; i++) {
        const t = diffs[i].type;
        if (s[t] !== undefined) s[t]++;
    }
    return s;
}

/**
 * JSON 结构化对比
 * @param {string|*} left
 * @param {string|*} right
 * @param {{ ignoreArrayOrder?: boolean }} [options]
 * @returns {{
 *   ok: boolean,
 *   diffs: Array<{path:string,type:string,left:*,right:*}>,
 *   summary: Object,
 *   text: string,
 *   msg: string
 * }}
 */
function jsonDiffCompare(left, right, options) {
    options = options || {};
    const ignoreArrayOrder = !!options.ignoreArrayOrder;

    const lp = jdParse(left);
    if (!lp.ok) {
        return {
            ok: false,
            diffs: [],
            summary: jdSummary([]),
            text: '',
            msg: '左侧 ' + lp.msg,
        };
    }
    const rp = jdParse(right);
    if (!rp.ok) {
        return {
            ok: false,
            diffs: [],
            summary: jdSummary([]),
            text: '',
            msg: '右侧 ' + rp.msg,
        };
    }

    try {
        const diffs = [];
        jdWalk(lp.value, rp.value, '$', diffs, { ignoreArrayOrder: ignoreArrayOrder });
        const summary = jdSummary(diffs);
        const text = jdBuildText(diffs);
        const msg =
            summary.total === 0
                ? '对比完成：无差异'
                : '对比完成：' +
                  summary.total +
                  ' 处差异（+ ' +
                  summary.added +
                  ' / - ' +
                  summary.removed +
                  ' / ~ ' +
                  summary.changed +
                  ' / 类型 ' +
                  summary.type_changed +
                  '）';
        return { ok: true, diffs: diffs, summary: summary, text: text, msg: msg };
    } catch (e) {
        return {
            ok: false,
            diffs: [],
            summary: jdSummary([]),
            text: '',
            msg: '对比失败: ' + e.message,
        };
    }
}

// ---------- UI ----------

function jdSetStatus(msg) {
    if (typeof setStatus === 'function') {
        setStatus(msg);
    }
}

function jdSetOutput(text, isError) {
    const out = document.getElementById('jdOutput');
    if (!out) return;
    out.textContent = text;
    out.className = isError ? 'output-box error' : 'output-box';
}

function jsondiffCompare() {
    const leftEl = document.getElementById('jdLeft');
    const rightEl = document.getElementById('jdRight');
    const ignoreEl = document.getElementById('jdIgnoreOrder');
    const left = leftEl ? leftEl.value : '';
    const right = rightEl ? rightEl.value : '';
    const options = { ignoreArrayOrder: ignoreEl ? !!ignoreEl.checked : false };
    const r = jsonDiffCompare(left, right, options);
    if (!r.ok) {
        jdSetOutput(r.msg, true);
        jdSetStatus(r.msg);
        return;
    }
    jdSetOutput(r.text, false);
    jdSetStatus(r.msg);
}

function jsondiffClear() {
    const left = document.getElementById('jdLeft');
    const right = document.getElementById('jdRight');
    if (left) left.value = '';
    if (right) right.value = '';
    jdSetOutput('', false);
    jdSetStatus('已清空');
}

function jsondiffLoadSample() {
    const left = {
        name: 'alice',
        age: 30,
        tags: ['admin', 'dev'],
        address: { city: 'Shanghai', zip: '200000' },
        active: true,
    };
    const right = {
        name: 'alice',
        age: 31,
        tags: ['admin', 'ops'],
        address: { city: 'Beijing' },
        role: 'user',
        active: 'yes',
    };
    const leftEl = document.getElementById('jdLeft');
    const rightEl = document.getElementById('jdRight');
    if (leftEl) leftEl.value = JSON.stringify(left, null, 2);
    if (rightEl) rightEl.value = JSON.stringify(right, null, 2);
    jdSetStatus('已加载示例');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        jsonDiffCompare: jsonDiffCompare,
        jdParse: jdParse,
        jdDeepEqual: jdDeepEqual,
        jdTypeOf: jdTypeOf,
        jdBuildText: jdBuildText,
    };
}
