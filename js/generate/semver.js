// SemVer 解析 / 比较 / 排序 / 范围满足

/**
 * 解析 SemVer（允许可选 v 前缀）
 * @param {string} version
 * @returns {{ major: number, minor: number, patch: number, prerelease: string[], build: string[], raw: string, version: string } | null}
 */
function parseSemver(version) {
    if (version == null) return null;
    let s = String(version).trim();
    if (!s) return null;
    if (s.charAt(0) === 'v' || s.charAt(0) === 'V') s = s.slice(1);

    // major.minor.patch[-prerelease][+build]
    const re =
        /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
    const m = s.match(re);
    if (!m) return null;
    return {
        major: parseInt(m[1], 10),
        minor: parseInt(m[2], 10),
        patch: parseInt(m[3], 10),
        prerelease: m[4] ? m[4].split('.') : [],
        build: m[5] ? m[5].split('.') : [],
        raw: String(version).trim(),
        version: s,
    };
}

/**
 * 比较两个版本：-1 / 0 / 1
 * @param {string|object} a
 * @param {string|object} b
 * @returns {number}
 */
function compareSemver(a, b) {
    const pa = typeof a === 'object' && a != null && 'major' in a ? a : parseSemver(a);
    const pb = typeof b === 'object' && b != null && 'major' in b ? b : parseSemver(b);
    if (!pa && !pb) return 0;
    if (!pa) return -1;
    if (!pb) return 1;

    if (pa.major !== pb.major) return pa.major < pb.major ? -1 : 1;
    if (pa.minor !== pb.minor) return pa.minor < pb.minor ? -1 : 1;
    if (pa.patch !== pb.patch) return pa.patch < pb.patch ? -1 : 1;

    // 无 prerelease > 有 prerelease
    const aPre = pa.prerelease || [];
    const bPre = pb.prerelease || [];
    if (aPre.length === 0 && bPre.length === 0) return 0;
    if (aPre.length === 0) return 1;
    if (bPre.length === 0) return -1;

    const n = Math.max(aPre.length, bPre.length);
    for (let i = 0; i < n; i++) {
        if (i >= aPre.length) return -1;
        if (i >= bPre.length) return 1;
        const x = aPre[i];
        const y = bPre[i];
        const xNum = /^\d+$/.test(x);
        const yNum = /^\d+$/.test(y);
        if (xNum && yNum) {
            const xi = parseInt(x, 10);
            const yi = parseInt(y, 10);
            if (xi !== yi) return xi < yi ? -1 : 1;
        } else if (xNum && !yNum) {
            return -1;
        } else if (!xNum && yNum) {
            return 1;
        } else if (x !== y) {
            return x < y ? -1 : 1;
        }
    }
    return 0;
}

/**
 * 排序版本列表（升序）
 * @param {string[]} list
 * @param {{ desc?: boolean }} [options]
 * @returns {string[]}
 */
function sortSemvers(list, options) {
    options = options || {};
    if (!Array.isArray(list)) {
        // 多行文本
        list = String(list || '')
            .split(/\r?\n/)
            .map(function (l) {
                return l.trim();
            })
            .filter(Boolean);
    }
    const items = list.slice();
    items.sort(function (a, b) {
        const c = compareSemver(a, b);
        return options.desc ? -c : c;
    });
    return items;
}

/**
 * 将版本对象规范为数字三元组（忽略 prerelease 用于部分范围）
 */
function semverCore(p) {
    return [p.major, p.minor, p.patch];
}

/**
 * 展开 x / * / X 通配为可比较边界
 * 1.2.x → >=1.2.0 <1.3.0
 * 1.x → >=1.0.0 <2.0.0
 * * / x → >=0.0.0
 */
function expandXRange(range) {
    let s = String(range).trim();
    if (s.charAt(0) === 'v' || s.charAt(0) === 'V') s = s.slice(1);
    // 1.2.x / 1.2.* / 1.2.X
    let m = s.match(/^(0|[1-9]\d*|[xX*])(?:\.(0|[1-9]\d*|[xX*]))?(?:\.(0|[1-9]\d*|[xX*]))?$/);
    if (!m) return null;
    function isX(v) {
        return v == null || v === '' || /^[xX*]$/.test(v);
    }
    const major = m[1];
    const minor = m[2];
    const patch = m[3];
    if (isX(major)) {
        return { op: '>=', version: '0.0.0', and: null }; // 任意
    }
    const maj = parseInt(major, 10);
    if (isX(minor)) {
        return {
            clauses: [
                { op: '>=', version: maj + '.0.0' },
                { op: '<', version: maj + 1 + '.0.0' },
            ],
        };
    }
    const min = parseInt(minor, 10);
    if (isX(patch) || patch == null) {
        // 1.2 视为 1.2.x
        return {
            clauses: [
                { op: '>=', version: maj + '.' + min + '.0' },
                { op: '<', version: maj + '.' + (min + 1) + '.0' },
            ],
        };
    }
    return null; // 精确版本，交给其它逻辑
}

/**
 * 解析单个比较子句：>=1.0.0 / >1 / =1.2.3 / 1.2.3
 * @returns {{ op: string, version: string } | null}
 */
function parseComparator(token) {
    let s = String(token).trim();
    if (!s) return null;
    const m = s.match(/^(>=|<=|>|<|=)?\s*(v?\d.*)$/i);
    if (!m) return null;
    const op = m[1] || '=';
    let ver = m[2].trim();
    // 补全 1 / 1.2 → 1.0.0 / 1.2.0（仅比较用）
    ver = normalizePartialVersion(ver);
    if (!parseSemver(ver) && !/x|\*/i.test(ver)) {
        // 可能是 1.2.x
        const xr = expandXRange(ver);
        if (xr) return { op: op, xRange: xr, raw: s };
        return null;
    }
    if (/[xX*]/.test(ver)) {
        const xr = expandXRange(ver);
        if (xr) return { op: op, xRange: xr, raw: s };
    }
    return { op: op, version: ver, raw: s };
}

function normalizePartialVersion(ver) {
    let s = String(ver).trim();
    if (s.charAt(0) === 'v' || s.charAt(0) === 'V') s = s.slice(1);
    if (/[xX*]/.test(s)) return s;
    const parts = s.split('-');
    const core = parts[0];
    const rest = parts.length > 1 ? '-' + parts.slice(1).join('-') : '';
    const segs = core.split('.');
    while (segs.length < 3) segs.push('0');
    return segs.slice(0, 3).join('.') + rest;
}

/**
 * 展开 ^ 与 ~
 * ^1.2.3 → >=1.2.3 <2.0.0
 * ^0.2.3 → >=0.2.3 <0.3.0
 * ^0.0.3 → >=0.0.3 <0.0.4
 * ~1.2.3 → >=1.2.3 <1.3.0
 * ~1.2 → >=1.2.0 <1.3.0
 * ~1 → >=1.0.0 <2.0.0
 */
function expandCaretTilde(token) {
    let s = String(token).trim();
    if (!s) return null;
    const caret = s.charAt(0) === '^';
    const tilde = s.charAt(0) === '~';
    if (!caret && !tilde) return null;
    let ver = s.slice(1).trim();
    if (ver.charAt(0) === 'v' || ver.charAt(0) === 'V') ver = ver.slice(1);

    // 解析可能不完整的版本
    const segs = ver.split('-')[0].split('.');
    const major = parseInt(segs[0], 10);
    const minor = segs.length > 1 ? parseInt(segs[1], 10) : 0;
    const patch = segs.length > 2 ? parseInt(segs[2], 10) : 0;
    if (isNaN(major)) return null;
    const full = normalizePartialVersion(ver);
    const lower = full;

    if (tilde) {
        let upper;
        if (segs.length === 1) {
            upper = major + 1 + '.0.0';
        } else {
            upper = major + '.' + (minor + 1) + '.0';
        }
        return [
            { op: '>=', version: lower },
            { op: '<', version: upper },
        ];
    }

    // caret
    let upper;
    if (major > 0) {
        upper = major + 1 + '.0.0';
    } else if (minor > 0) {
        upper = '0.' + (minor + 1) + '.0';
    } else {
        upper = '0.0.' + (patch + 1);
    }
    return [
        { op: '>=', version: lower },
        { op: '<', version: upper },
    ];
}

/**
 * 解析范围字符串为比较子句数组
 * 支持：空格/AND 组合，如 ">=1.0.0 <2.0.0"、"^1.2.3"、"~1.2.3"、"1.2.x"、"1.2.3"
 * @param {string} range
 * @returns {Array<{op: string, version: string}> | null}
 */
function parseRange(range) {
    if (range == null) return null;
    let s = String(range).trim();
    if (!s) return null;
    // 去掉 || 多范围：本实现取第一段（或全部 AND 段）；支持 || 为 OR
    // 先处理单段；多 || 在 satisfies 中处理
    const clauses = [];
    // 按空白拆分，但保留操作符粘连
    // 预处理 ^ ~ 单独 token
    const tokens = s.split(/\s+/).filter(Boolean);
    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        if (t === '||') {
            // 留给上层
            return { orSplit: true, raw: s };
        }
        const ct = expandCaretTilde(t);
        if (ct) {
            ct.forEach(function (c) {
                clauses.push(c);
            });
            continue;
        }
        // 1.2.x 单独
        if (/^[vV]?\d/.test(t) && /[xX*]/.test(t)) {
            const xr = expandXRange(t);
            if (xr && xr.clauses) {
                xr.clauses.forEach(function (c) {
                    clauses.push(c);
                });
                continue;
            }
        }
        // 纯版本或带操作符
        // 可能是 ">=1.0.0" 或拆成 ">=" "1.0.0"
        if (/^(>=|<=|>|<|=)$/.test(t) && i + 1 < tokens.length) {
            const ver = normalizePartialVersion(tokens[++i]);
            clauses.push({ op: t, version: ver });
            continue;
        }
        const m = t.match(/^(>=|<=|>|<|=)(.+)$/);
        if (m) {
            let ver = m[2].trim();
            if (/[xX*]/.test(ver)) {
                const xr = expandXRange(ver);
                if (xr && xr.clauses) {
                    // 操作符 + x 范围：简化为按 x 范围
                    xr.clauses.forEach(function (c) {
                        clauses.push(c);
                    });
                    continue;
                }
            }
            clauses.push({ op: m[1], version: normalizePartialVersion(ver) });
            continue;
        }
        // 纯精确版本
        if (parseSemver(normalizePartialVersion(t)) || parseSemver(t)) {
            clauses.push({ op: '=', version: normalizePartialVersion(t) });
            continue;
        }
        // 1.2 → 1.2.x
        const xr2 = expandXRange(t);
        if (xr2 && xr2.clauses) {
            xr2.clauses.forEach(function (c) {
                clauses.push(c);
            });
            continue;
        }
        return null;
    }
    return clauses.length ? clauses : null;
}

function cmpWithOp(version, op, bound) {
    const c = compareSemver(version, bound);
    if (op === '=') return c === 0;
    if (op === '>') return c > 0;
    if (op === '>=') return c >= 0;
    if (op === '<') return c < 0;
    if (op === '<=') return c <= 0;
    return false;
}

/**
 * 检查版本是否满足范围
 * @param {string} version
 * @param {string} range
 * @returns {boolean}
 */
function satisfiesSemver(version, range) {
    const v = parseSemver(version) || parseSemver(normalizePartialVersion(version));
    if (!v) return false;
    if (range == null || String(range).trim() === '') return true;

    const raw = String(range).trim();
    // OR 分段
    const orParts = raw.split(/\s*\|\|\s*/);
    for (let o = 0; o < orParts.length; o++) {
        const part = orParts[o].trim();
        if (!part) continue;
        const clauses = parseRange(part);
        if (!clauses || clauses.orSplit) continue;
        let ok = true;
        for (let i = 0; i < clauses.length; i++) {
            const cl = clauses[i];
            if (!cl.version || !parseSemver(cl.version)) {
                ok = false;
                break;
            }
            // prerelease：仅当 bound 有相同 major.minor.patch 的 prerelease 时才匹配（简化 npm 规则）
            if (!cmpWithOp(v, cl.op, cl.version)) {
                ok = false;
                break;
            }
        }
        if (ok) return true;
    }
    return false;
}

// === UI ===

function semverParseUi() {
    const input = document.getElementById('semverInput');
    const out = document.getElementById('semverOutput');
    if (!input || !out) return;
    const p = parseSemver(input.value);
    if (!p) {
        out.textContent = '无法解析为有效 SemVer: ' + input.value.trim();
        out.className = 'output-box error';
        return;
    }
    const lines = [];
    lines.push('version   : ' + p.version);
    lines.push('major     : ' + p.major);
    lines.push('minor     : ' + p.minor);
    lines.push('patch     : ' + p.patch);
    lines.push('prerelease: ' + (p.prerelease.length ? p.prerelease.join('.') : '(无)'));
    lines.push('build     : ' + (p.build.length ? p.build.join('.') : '(无)'));
    out.textContent = lines.join('\n');
    out.className = 'output-box';
    if (typeof setStatus === 'function') setStatus('SemVer 解析完成');
}

function semverCompareUi() {
    const a = document.getElementById('semverA');
    const b = document.getElementById('semverB');
    const out = document.getElementById('semverOutput');
    if (!a || !b || !out) return;
    const pa = parseSemver(a.value);
    const pb = parseSemver(b.value);
    if (!pa || !pb) {
        out.textContent = '请输入两个有效 SemVer';
        out.className = 'output-box error';
        return;
    }
    const c = compareSemver(pa, pb);
    let rel = '等于';
    if (c < 0) rel = '小于';
    if (c > 0) rel = '大于';
    out.textContent =
        a.value.trim() + '  ' + (c < 0 ? '<' : c > 0 ? '>' : '=') + '  ' + b.value.trim() + '\ncmp = ' + c + '（' + rel + '）';
    out.className = 'output-box';
    if (typeof setStatus === 'function') setStatus('比较完成: cmp=' + c);
}

function semverSortUi() {
    const list = document.getElementById('semverList');
    const out = document.getElementById('semverOutput');
    const desc = document.getElementById('semverSortDesc');
    if (!list || !out) return;
    const lines = list.value
        .split(/\r?\n/)
        .map(function (l) {
            return l.trim();
        })
        .filter(Boolean);
    if (!lines.length) {
        out.textContent = '请输入多行版本号';
        out.className = 'output-box error';
        return;
    }
    const invalid = lines.filter(function (l) {
        return !parseSemver(l);
    });
    const sorted = sortSemvers(lines, { desc: desc ? desc.checked : false });
    let text = sorted.join('\n');
    if (invalid.length) {
        text += '\n\n警告: 以下无法解析（仍按字符串参与排序可能不准）:\n' + invalid.join('\n');
    }
    out.textContent = text;
    out.className = 'output-box';
    if (typeof setStatus === 'function') setStatus('已排序 ' + sorted.length + ' 个版本');
}

function semverSatisfiesUi() {
    const ver = document.getElementById('semverCheckVer');
    const range = document.getElementById('semverCheckRange');
    const out = document.getElementById('semverOutput');
    if (!ver || !range || !out) return;
    const v = ver.value.trim();
    const r = range.value.trim();
    if (!parseSemver(v) && !parseSemver(normalizePartialVersion(v))) {
        out.textContent = '版本无效: ' + v;
        out.className = 'output-box error';
        return;
    }
    const ok = satisfiesSemver(v, r);
    out.textContent = v + (ok ? ' 满足 ' : ' 不满足 ') + r + '\nsatisfies = ' + ok;
    out.className = ok ? 'output-box' : 'output-box error';
    if (typeof setStatus === 'function') setStatus(ok ? '满足范围' : '不满足范围');
}

function semverLoadSample() {
    const input = document.getElementById('semverInput');
    const a = document.getElementById('semverA');
    const b = document.getElementById('semverB');
    const list = document.getElementById('semverList');
    const ver = document.getElementById('semverCheckVer');
    const range = document.getElementById('semverCheckRange');
    if (input) input.value = '1.2.3-beta.1+build.5';
    if (a) a.value = '1.2.3';
    if (b) b.value = '1.10.0';
    if (list) list.value = ['1.0.0', '1.10.0', '1.2.3', '2.0.0-alpha.1', '2.0.0', '0.9.9'].join('\n');
    if (ver) ver.value = '1.2.5';
    if (range) range.value = '^1.2.3';
    semverParseUi();
}

function semverClear() {
    ['semverInput', 'semverA', 'semverB', 'semverList', 'semverCheckVer', 'semverCheckRange'].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const out = document.getElementById('semverOutput');
    if (out) {
        out.textContent = '';
        out.className = 'output-box';
    }
    if (typeof setStatus === 'function') setStatus('已清空');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseSemver: parseSemver,
        compareSemver: compareSemver,
        sortSemvers: sortSemvers,
        satisfiesSemver: satisfiesSemver,
        parseRange: parseRange,
        normalizePartialVersion: normalizePartialVersion,
        expandCaretTilde: expandCaretTilde,
    };
}
