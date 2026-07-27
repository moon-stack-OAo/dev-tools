// chmod 权限：八进制 ↔ rwx 符号 ↔ 说明

const CHMOD_WHO = ['u', 'g', 'o'];
const CHMOD_BITS = [
    { bit: 4, char: 'r', name: '读' },
    { bit: 2, char: 'w', name: '写' },
    { bit: 1, char: 'x', name: '执行' },
];
const CHMOD_WHO_LABEL = { u: '所有者(user)', g: '所属组(group)', o: '其他人(other)' };

/**
 * 解析八进制权限（支持 3/4 位，含 setuid/setgid/sticky）
 * @param {string|number} input
 * @returns {{
 *   ok: boolean,
 *   octal?: string,
 *   mode?: number,
 *   special?: {setuid:boolean,setgid:boolean,sticky:boolean},
 *   rwx?: string,
 *   parts?: {u:number,g:number,o:number},
 *   desc?: string,
 *   msg?: string
 * }}
 */
function parseChmod(input) {
    let s = input == null ? '' : String(input).trim();
    if (!s) return { ok: false, msg: '请输入权限' };

    // 符号形式：rwxr-xr-x 或 -rwxr-xr-x
    if (/^[-d]?[r-][w-][xsS-][r-][w-][xsS-][r-][w-][xtT-]$/.test(s) || /^[r-][w-][xsS-][r-][w-][xsS-][r-][w-][xtT-]$/.test(s)) {
        return parseChmodRwx(s);
    }

    // u+x g-w 形式
    if (/^[ugoa]*[+-=][rwxst]+/i.test(s) || /\s/.test(s) && /[+-=]/.test(s)) {
        // 符号修改需要基准，单独走 format 说明
        return parseChmodSymbolicOps(s);
    }

    // 纯八进制
    s = s.replace(/^0o/i, '');
    if (!/^[0-7]{3,4}$/.test(s)) {
        return { ok: false, msg: '无效权限，请输入 644 / 0755 / rwxr-xr-x' };
    }
    if (s.length === 3) s = '0' + s;
    const mode = parseInt(s, 8);
    return chmodFromMode(mode);
}

/**
 * @param {number} mode
 * @returns {object}
 */
function chmodFromMode(mode) {
    const specialBits = (mode >> 9) & 7;
    const perm = mode & 0o777;
    const u = (perm >> 6) & 7;
    const g = (perm >> 3) & 7;
    const o = perm & 7;
    const special = {
        setuid: !!(specialBits & 4),
        setgid: !!(specialBits & 2),
        sticky: !!(specialBits & 1),
    };
    const rwx = chmodToRwx(mode);
    const octal = (specialBits.toString(8) + u.toString(8) + g.toString(8) + o.toString(8)).replace(/^0(?=\d{3})/, '') || '0';
    // 统一 3 或 4 位展示
    const octalFull = specialBits
        ? specialBits.toString(8) + u.toString(8) + g.toString(8) + o.toString(8)
        : u.toString(8) + g.toString(8) + o.toString(8);

    return {
        ok: true,
        octal: octalFull,
        mode: mode,
        special: special,
        rwx: rwx,
        parts: { u: u, g: g, o: o },
        desc: formatChmodDesc(u, g, o, special),
    };
}

/**
 * 从 rwx 字符串解析
 * @param {string} rwx
 * @returns {object}
 */
function parseChmodRwx(rwx) {
    let s = String(rwx).trim();
    if (s.length === 10 && (s[0] === '-' || s[0] === 'd' || s[0] === 'l')) {
        s = s.slice(1);
    }
    if (s.length !== 9) return { ok: false, msg: 'rwx 长度无效' };

    function trip(str, isOther) {
        let n = 0;
        let special = 0;
        if (str[0] === 'r') n += 4;
        if (str[1] === 'w') n += 2;
        const x = str[2];
        if (x === 'x') n += 1;
        else if (x === 's' || x === 't') {
            n += 1;
            special = 1;
        } else if (x === 'S' || x === 'T') {
            special = 1;
        }
        return { n: n, special: special };
    }
    const uu = trip(s.slice(0, 3), false);
    const gg = trip(s.slice(3, 6), false);
    const oo = trip(s.slice(6, 9), true);
    // setuid/setgid/sticky
    let specialBits = 0;
    if (s[2] === 's' || s[2] === 'S') specialBits |= 4;
    if (s[5] === 's' || s[5] === 'S') specialBits |= 2;
    if (s[8] === 't' || s[8] === 'T') specialBits |= 1;
    const mode = (specialBits << 9) | (uu.n << 6) | (gg.n << 3) | oo.n;
    return chmodFromMode(mode);
}

/**
 * 解析 u+x g-w 等（相对 000 或说明）
 * @param {string} ops
 * @returns {object}
 */
function parseChmodSymbolicOps(ops) {
    // 从 000 开始应用，便于预览
    let mode = 0;
    const tokens = String(ops)
        .trim()
        .split(/[\s,]+/)
        .filter(Boolean);
    const applied = [];
    for (let t = 0; t < tokens.length; t++) {
        const tok = tokens[t];
        const m = tok.match(/^([ugoa]*)([+-=])([rwxst]+)$/i);
        if (!m) {
            return { ok: false, msg: '无法解析: ' + tok };
        }
        let who = m[1] || 'a';
        const op = m[2];
        const perms = m[3].toLowerCase();
        if (who === 'a' || who === '') who = 'ugo';

        let mask = 0;
        let specialMask = 0;
        for (let i = 0; i < perms.length; i++) {
            const c = perms[i];
            if (c === 'r') mask |= 4;
            else if (c === 'w') mask |= 2;
            else if (c === 'x') mask |= 1;
            else if (c === 's') {
                // setuid/setgid 视 who
                if (who.indexOf('u') >= 0) specialMask |= 4;
                if (who.indexOf('g') >= 0) specialMask |= 2;
            } else if (c === 't') {
                if (who.indexOf('o') >= 0 || who.indexOf('a') >= 0) specialMask |= 1;
            }
        }

        let fullMask = 0;
        if (who.indexOf('u') >= 0) fullMask |= mask << 6;
        if (who.indexOf('g') >= 0) fullMask |= mask << 3;
        if (who.indexOf('o') >= 0) fullMask |= mask;
        fullMask |= specialMask << 9;

        if (op === '+') {
            mode |= fullMask;
        } else if (op === '-') {
            mode &= ~fullMask;
        } else if (op === '=') {
            // 清除对应 who 再设置
            let clear = 0;
            if (who.indexOf('u') >= 0) clear |= 0o700 | (4 << 9);
            if (who.indexOf('g') >= 0) clear |= 0o070 | (2 << 9);
            if (who.indexOf('o') >= 0) clear |= 0o007 | (1 << 9);
            mode = (mode & ~clear) | fullMask;
        }
        applied.push(tok);
    }
    const r = chmodFromMode(mode);
    r.ops = applied;
    r.note = '符号操作从 000 起应用（仅预览）';
    return r;
}

/**
 * mode → rwx 字符串（9 字符）
 * @param {number|string} modeOrOctal
 * @returns {string}
 */
function chmodToRwx(modeOrOctal) {
    let mode;
    if (typeof modeOrOctal === 'string') {
        const p = parseChmod(modeOrOctal);
        if (!p.ok) return '---------';
        mode = p.mode;
    } else {
        mode = modeOrOctal;
    }
    const specialBits = (mode >> 9) & 7;
    const u = (mode >> 6) & 7;
    const g = (mode >> 3) & 7;
    const o = mode & 7;

    function one(n, specialType) {
        // specialType: 's' setuid/setgid, 't' sticky
        const r = n & 4 ? 'r' : '-';
        const w = n & 2 ? 'w' : '-';
        let x;
        if (specialType === 's') {
            if (n & 1) x = 's';
            else x = 'S';
        } else if (specialType === 't') {
            if (n & 1) x = 't';
            else x = 'T';
        } else {
            x = n & 1 ? 'x' : '-';
        }
        return r + w + x;
    }

    return (
        one(u, specialBits & 4 ? 's' : '') +
        one(g, specialBits & 2 ? 's' : '') +
        one(o, specialBits & 1 ? 't' : '')
    );
}

/**
 * 格式化说明
 * @param {number} u
 * @param {number} g
 * @param {number} o
 * @param {object} special
 * @returns {string}
 */
function formatChmodDesc(u, g, o, special) {
    function bits(n) {
        const parts = [];
        if (n & 4) parts.push('读');
        if (n & 2) parts.push('写');
        if (n & 1) parts.push('执行');
        return parts.length ? parts.join('/') : '无';
    }
    const lines = [
        '所有者(u): ' + bits(u) + ' (' + nToRwx(u) + ')',
        '所属组(g): ' + bits(g) + ' (' + nToRwx(g) + ')',
        '其他人(o): ' + bits(o) + ' (' + nToRwx(o) + ')',
    ];
    if (special) {
        const sp = [];
        if (special.setuid) sp.push('setuid');
        if (special.setgid) sp.push('setgid');
        if (special.sticky) sp.push('sticky');
        if (sp.length) lines.push('特殊: ' + sp.join(', '));
    }
    return lines.join('\n');
}

function nToRwx(n) {
    return (n & 4 ? 'r' : '-') + (n & 2 ? 'w' : '-') + (n & 1 ? 'x' : '-');
}

/**
 * 格式化输出摘要
 * @param {string|number} input
 * @returns {object}
 */
function formatChmod(input) {
    const p = parseChmod(input);
    if (!p.ok) return p;
    return {
        ok: true,
        octal: p.octal,
        rwx: p.rwx,
        symbolic: p.rwx,
        ls: '-' + p.rwx,
        desc: p.desc,
        mode: p.mode,
        special: p.special,
        parts: p.parts,
        commands: [
            'chmod ' + p.octal + ' <file>',
            'chmod ' + chmodSymbolicFromParts(p.parts, p.special) + ' <file>',
        ],
        note: p.note,
        ops: p.ops,
    };
}

function chmodSymbolicFromParts(parts, special) {
    // 简化：用 u=rwx,g=rx,o=r 形式
    function eq(n) {
        return nToRwx(n).replace(/-/g, '');
    }
    let s = 'u=' + eq(parts.u) + ',g=' + eq(parts.g) + ',o=' + eq(parts.o);
    if (special && special.setuid) s += ',u+s';
    if (special && special.setgid) s += ',g+s';
    if (special && special.sticky) s += ',o+t';
    return s;
}

// ========== UI ==========

function chmodDo() {
    const input = document.getElementById('chmodInput').value;
    const out = document.getElementById('chmodOutput');
    const r = formatChmod(input);
    if (!r.ok) {
        out.textContent = r.msg || '解析失败';
        out.className = 'output-box error';
        return;
    }
    let text =
        '八进制: ' +
        r.octal +
        '\nrwx:    ' +
        r.rwx +
        '\nls -l:  ' +
        r.ls +
        '\n\n' +
        r.desc +
        '\n\n命令:\n  ' +
        r.commands.join('\n  ');
    if (r.note) text += '\n\n注: ' + r.note;
    out.textContent = text;
    out.className = 'output-box';
    setStatus('chmod ' + r.octal + ' → ' + r.rwx);
}

function chmodQuick(v) {
    document.getElementById('chmodInput').value = v;
    chmodDo();
}

function chmodClear() {
    document.getElementById('chmodInput').value = '';
    document.getElementById('chmodOutput').textContent = '';
    setStatus('已清空');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseChmod: parseChmod,
        formatChmod: formatChmod,
        chmodToRwx: chmodToRwx,
        chmodFromMode: chmodFromMode,
        parseChmodRwx: parseChmodRwx,
    };
}
