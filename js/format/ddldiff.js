// ============================================================
// DDL Schema 对比（简化版）
// 仅做列粒度 diff：列名 / 类型 / length / nullable / default / comment / autoInc
// 不处理：外键 / 索引 / 分区 / 存储引擎 / 序列 / 触发器 / CHARACTER SET / COLLATE 等
// ============================================================

// -----------------------------------------------------------
// 跳过字符串字面量（从开引号位置开始），返回闭合后的位置（含闭合引号）
//   起点必须是 ' " 或 `；否则原样返回 start+1
//   支持 '' "" `` 转义（SQL 标准）
//   支持 \x 反斜杠转义
// -----------------------------------------------------------
function _ddSkipString(text, start) {
    const q = text[start];
    if (q !== "'" && q !== '"' && q !== '`') return start + 1;
    let i = start + 1;
    const n = text.length;
    while (i < n) {
        const ch = text[i];
        if (ch === '\\' && i + 1 < n) {
            i += 2;
            continue;
        }
        if (ch === q) {
            // SQL 转义：双写引号
            if (i + 1 < n && text[i + 1] === q) {
                i += 2;
                continue;
            }
            return i + 1;
        }
        i++;
    }
    return n;
}

// -----------------------------------------------------------
// 移除注释（保留字符串字面量原样）
//   块注释 /* ... */ 、行注释 -- ... 与 # ...
//   用等长空格替换以保留字符偏移
// -----------------------------------------------------------
function _ddStripComments(text) {
    let s = String(text);
    s = s.replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length));
    s = s.replace(/--[^\n\r]*/g, (m) => ' '.repeat(m.length));
    s = s.replace(/#[^\n\r]*/g, (m) => ' '.repeat(m.length));
    return s;
}

// 按顶层分号拆分语句（跳过字符串 / 括号内的分号）
function _ddSplitStatements(text) {
    const buf = [];
    let cur = '';
    let i = 0;
    let depth = 0;
    const n = text.length;
    while (i < n) {
        const ch = text[i];
        if (ch === '(') {
            depth++;
            cur += ch;
            i++;
            continue;
        }
        if (ch === ')') {
            depth = Math.max(0, depth - 1);
            cur += ch;
            i++;
            continue;
        }
        if (ch === "'" || ch === '"' || ch === '`') {
            const end = _ddSkipString(text, i);
            cur += text.slice(i, end);
            i = end;
            continue;
        }
        if (ch === ';' && depth === 0) {
            const stmt = cur.trim();
            if (stmt) buf.push(stmt);
            cur = '';
            i++;
            continue;
        }
        cur += ch;
        i++;
    }
    const last = cur.trim();
    if (last) buf.push(last);
    return buf;
}

// 提取表名（支持反引号 / 双引号 / 方括号包裹的标识符）
function _ddExtractTableName(stmt) {
    const m = stmt.match(/^\s*CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"[]?([A-Za-z_][\w$]*)[`"\]]?\s*\(/i);
    return m ? m[1] : null;
}

// 提取首个顶层 (...) 内容作为 body
function _ddExtractBody(stmt) {
    const openIdx = (function () {
        let i = 0;
        const n = stmt.length;
        while (i < n) {
            const ch = stmt[i];
            if (ch === "'" || ch === '"' || ch === '`') {
                i = _ddSkipString(stmt, i);
                continue;
            }
            if (ch === '(') return i;
            i++;
        }
        return -1;
    })();
    if (openIdx < 0) return null;
    let depth = 0;
    for (let i = openIdx; i < stmt.length; i++) {
        const ch = stmt[i];
        if (ch === "'" || ch === '"' || ch === '`') {
            i = _ddSkipString(stmt, i) - 1;
            continue;
        }
        if (ch === '(') depth++;
        else if (ch === ')') {
            depth--;
            if (depth === 0) return stmt.slice(openIdx + 1, i);
        }
    }
    return null;
}

// 顶层逗号拆分 body（跳过字符串内的逗号）
function _ddSplitTopLevel(body) {
    const out = [];
    let cur = '';
    let depth = 0;
    let i = 0;
    const n = body.length;
    while (i < n) {
        const ch = body[i];
        if (ch === "'" || ch === '"' || ch === '`') {
            const end = _ddSkipString(body, i);
            cur += body.slice(i, end);
            i = end;
            continue;
        }
        if (ch === '(' || ch === '[') {
            depth++;
            cur += ch;
            i++;
            continue;
        }
        if (ch === ')' || ch === ']') {
            depth = Math.max(0, depth - 1);
            cur += ch;
            i++;
            continue;
        }
        if (ch === ',' && depth === 0) {
            const t = cur.trim();
            if (t) out.push(t);
            cur = '';
            i++;
            continue;
        }
        cur += ch;
        i++;
    }
    const last = cur.trim();
    if (last) out.push(last);
    return out;
}

// 表级约束 / 索引关键字（行首匹配则跳过）
const _DDL_TABLE_LEVEL_KEYWORDS = [
    'PRIMARY KEY',
    'FOREIGN KEY',
    'UNIQUE',
    'CONSTRAINT',
    'INDEX',
    'KEY',
    'FULLTEXT',
    'SPATIAL',
    'EXCLUDE',
    'CHECK',
];

function _ddIsTableLevel(line) {
    const up = line.trim().toUpperCase();
    for (let i = 0; i < _DDL_TABLE_LEVEL_KEYWORDS.length; i++) {
        const kw = _DDL_TABLE_LEVEL_KEYWORDS[i];
        if (up === kw) return true;
        if (up.startsWith(kw + ' ')) return true;
        if (up.startsWith(kw + '(')) return true;
    }
    return false;
}

// 多词类型列表（顺序很重要：长的在前）
const _DDL_MULTI_WORD_TYPES = [
    'CHARACTER VARYING',
    'DOUBLE PRECISION',
    'TIMESTAMP WITH TIME ZONE',
    'TIME WITH TIME ZONE',
    'TIMESTAMP WITHOUT TIME ZONE',
    'TIME WITHOUT TIME ZONE',
    'NATIONAL CHARACTER VARYING',
    'NATIONAL CHARACTER',
    'BINARY VARYING',
];

// 解析类型 token，返回 {type, length, consumed} 或 null
function _ddParseType(rest) {
    for (let i = 0; i < _DDL_MULTI_WORD_TYPES.length; i++) {
        const mw = _DDL_MULTI_WORD_TYPES[i];
        const re = new RegExp('^(' + mw.replace(/ /g, '\\s+') + ')\\s*(\\([^)]*\\))?', 'i');
        const m = rest.match(re);
        if (m) {
            const t = m[1].toUpperCase().replace(/\s+/g, ' ');
            let length = null;
            if (m[2]) {
                const inner = m[2].slice(1, -1).trim();
                const numM = inner.match(/^-?\d+/);
                if (numM) length = parseInt(numM[0], 10);
            }
            return { type: t, length: length, consumed: m[0].length };
        }
    }
    const m = rest.match(/^([A-Z][A-Z0-9_]*)\s*(\([^)]*\))?/i);
    if (!m) return null;
    const t = m[1].toUpperCase();
    let length = null;
    if (m[2]) {
        const inner = m[2].slice(1, -1).trim();
        const numM = inner.match(/^-?\d+/);
        if (numM) length = parseInt(numM[0], 10);
    }
    return { type: t, length: length, consumed: m[0].length };
}

// 在字符串边界感知的情况下，从 line 中找关键字位置
function _ddFindKeyword(line, keywordRe) {
    let i = 0;
    const n = line.length;
    while (i < n) {
        const ch = line[i];
        if (ch === "'" || ch === '"' || ch === '`') {
            i = _ddSkipString(line, i);
            continue;
        }
        // 在 i 处尝试匹配关键字（确保关键字前是边界）
        const slice = line.slice(i);
        const m = slice.match(keywordRe);
        if (m && m.index === 0) return i;
        i++;
    }
    return -1;
}

// 提取 DEFAULT 后的值（字符串 / 数字 / 关键字 / 函数）
function _ddExtractDefault(rest) {
    const idx = _ddFindKeyword(rest, /^DEFAULT\b/i);
    if (idx < 0) return null;
    let i = idx + 'DEFAULT'.length;
    const n = rest.length;
    // 跳过空白
    while (i < n && /\s/.test(rest[i])) i++;
    if (i >= n) return null;
    // 字符串字面量
    const ch = rest[i];
    if (ch === "'" || ch === '"' || ch === '`') {
        const end = _ddSkipString(rest, i);
        const raw = rest.slice(i, end);
        const q = raw[0];
        let inner = raw.slice(1, -1);
        if (q === "'") inner = inner.replace(/''/g, "'");
        else if (q === '"') inner = inner.replace(/""/g, '"');
        else inner = inner.replace(/``/g, '`');
        return inner;
    }
    // 截取到下一个关键字边界
    let j = i;
    let depth = 0;
    const stopRe =
        /\s+(NOT\s+NULL|PRIMARY\s+KEY|UNIQUE|AUTO_INCREMENT|AUTOINCREMENT|COMMENT|DEFAULT|CHECK|COLLATE|REFERENCES|ON\s+UPDATE|;|$)/i;
    while (j < n) {
        const c = rest[j];
        if (c === '(') depth++;
        else if (c === ')') {
            if (depth === 0) break;
            depth--;
        } else if (depth === 0) {
            // 边界检测
            const tail = rest.slice(j);
            if (stopRe.test(tail) && /\s/.test(c)) break;
        }
        j++;
    }
    const val = rest.slice(i, j).trim();
    if (!val) return null;
    if (/^NULL$/i.test(val)) return null;
    return val;
}

// 提取 COMMENT 后单引号字符串
function _ddExtractComment(rest) {
    const idx = _ddFindKeyword(rest, /^COMMENT\b/i);
    if (idx < 0) return '';
    let i = idx + 'COMMENT'.length;
    const n = rest.length;
    while (i < n && /\s/.test(rest[i])) i++;
    if (i >= n) return '';
    if (rest[i] === "'") {
        const end = _ddSkipString(rest, i);
        const raw = rest.slice(i, end);
        return raw.slice(1, -1).replace(/''/g, "'");
    }
    if (rest[i] === '"') {
        const end = _ddSkipString(rest, i);
        const raw = rest.slice(i, end);
        return raw.slice(1, -1).replace(/""/g, '"');
    }
    return '';
}

// 解析单个字段
function _ddParseColumn(line) {
    const trimmed = line.trim();
    if (!trimmed) return null;
    if (_ddIsTableLevel(trimmed)) return null;

    // 列名（支持反引号 / 双引号 / 方括号）
    const nameMatch = trimmed.match(/^[`"[]?([A-Za-z_][\w$]*)[`"\]]?/);
    if (!nameMatch) return null;
    const colName = nameMatch[1];
    let rest = trimmed.slice(nameMatch[0].length).trim();

    // 类型
    const typeInfo = _ddParseType(rest);
    if (!typeInfo) return null;
    const colType = typeInfo.type;
    let length = typeInfo.length;
    rest = rest.slice(typeInfo.consumed).trim();

    // 默认值与约束
    let nullable = true;
    let defaultVal = null;
    let comment = '';
    let autoInc = false;
    let primaryKey = false;
    let unique = false;

    if (_ddFindKeyword(rest, /^NOT\s+NULL\b/i) >= 0) nullable = false;
    if (_ddFindKeyword(rest, /^PRIMARY\s+KEY\b/i) >= 0) primaryKey = true;
    if (_ddFindKeyword(rest, /^UNIQUE(\s+KEY)?\b/i) >= 0) unique = true;

    if (_ddFindKeyword(rest, /^AUTO_INCREMENT\b/i) >= 0 || _ddFindKeyword(rest, /^AUTOINCREMENT\b/i) >= 0) {
        autoInc = true;
    }
    // PostgreSQL / Oracle: GENERATED ... AS IDENTITY（简化匹配）
    if (/\bGENERATED\b.*\bIDENTITY\b/i.test(rest)) autoInc = true;
    // SQL Server / Sybase: 列定义中含 IDENTITY(...)
    if (/\bIDENTITY\s*\(/i.test(rest)) autoInc = true;
    // PostgreSQL SERIAL / BIGSERIAL / SMALLSERIAL
    if (colType === 'SERIAL' || colType === 'BIGSERIAL' || colType === 'SMALLSERIAL') {
        autoInc = true;
    }

    defaultVal = _ddExtractDefault(rest);
    comment = _ddExtractComment(rest);

    return {
        name: colName,
        type: colType,
        length: length,
        nullable: nullable,
        default: defaultVal,
        comment: comment,
        autoInc: autoInc,
        primaryKey: primaryKey,
        unique: unique,
    };
}

// 解析整段 DDL → tables 数组
function parseDDL(text) {
    if (!text || typeof text !== 'string') return [];
    const cleaned = _ddStripComments(text);
    const stmts = _ddSplitStatements(cleaned);
    const tables = [];
    for (let i = 0; i < stmts.length; i++) {
        const stmt = stmts[i];
        if (!/^\s*CREATE\s+TABLE\b/i.test(stmt)) continue;
        const name = _ddExtractTableName(stmt);
        if (!name) continue;
        const body = _ddExtractBody(stmt);
        if (!body) continue;
        const lines = _ddSplitTopLevel(body);
        const columns = [];
        for (let j = 0; j < lines.length; j++) {
            const col = _ddParseColumn(lines[j]);
            if (col) columns.push(col);
        }
        tables.push({ name: name, columns: columns, raw: stmt });
    }
    return tables;
}

// -----------------------------------------------------------
// 类型等价组（同组视为相同）
// 每组第一个元素作为 canonical（用于归一化与 length 比较）
// -----------------------------------------------------------
const _DDL_TYPE_EQUIV = [
    ['INT', 'INTEGER', 'INT4'],
    ['BIGINT', 'INT8'],
    ['SMALLINT', 'INT2'],
    ['TINYINT'],
    ['VARCHAR', 'CHARACTER VARYING'],
    ['CHAR', 'CHARACTER'],
    ['TEXT'],
    ['DATETIME', 'TIMESTAMP'],
    ['DATE'],
    ['BLOB', 'BYTEA', 'BINARY'],
    ['REAL', 'FLOAT4'],
    ['DOUBLE', 'DOUBLE PRECISION', 'FLOAT8'],
    ['BOOLEAN', 'BOOL'],
    ['DECIMAL', 'NUMERIC'],
];

function _ddNormalizeType(t) {
    const up = String(t || '')
        .toUpperCase()
        .trim();
    for (let i = 0; i < _DDL_TYPE_EQUIV.length; i++) {
        const group = _DDL_TYPE_EQUIV[i];
        for (let j = 0; j < group.length; j++) {
            if (group[j] === up) return group[0];
        }
    }
    return up;
}

// length 比较是否有意义（定长 / 变长 / 精度类型）
const _DDL_LENGTH_AWARE_TYPES = new Set(['VARCHAR', 'CHAR', 'CHARACTER VARYING', 'CHARACTER', 'DECIMAL', 'NUMERIC']);

function _ddHasLength(type) {
    return _DDL_LENGTH_AWARE_TYPES.has(String(type || '').toUpperCase());
}

// 比较 src / dst 同一字段
function _ddCompareColumn(sc, dc) {
    const diffs = [];
    const sn = _ddNormalizeType(sc.type);
    const dn = _ddNormalizeType(dc.type);
    if (sn !== dn) diffs.push('type');
    if (_ddHasLength(sn) && _ddHasLength(dn)) {
        if ((sc.length == null ? null : sc.length) !== (dc.length == null ? null : dc.length)) {
            diffs.push('length');
        }
    }
    if (!!sc.nullable !== !!dc.nullable) diffs.push('nullable');
    const sDef = sc.default === null || sc.default === undefined ? null : String(sc.default);
    const dDef = dc.default === null || dc.default === undefined ? null : String(dc.default);
    if (sDef !== dDef) diffs.push('default');
    if ((sc.comment || '') !== (dc.comment || '')) diffs.push('comment');
    if (!!sc.autoInc !== !!dc.autoInc) diffs.push('autoInc');
    return diffs;
}

// diff 两个 schema
function diffSchemas(srcTables, dstTables) {
    const srcMap = new Map();
    const dstMap = new Map();
    (srcTables || []).forEach((t) => srcMap.set(t.name, t));
    (dstTables || []).forEach((t) => dstMap.set(t.name, t));

    const allNames = new Set();
    srcMap.forEach((_, k) => allNames.add(k));
    dstMap.forEach((_, k) => allNames.add(k));

    const results = [];
    allNames.forEach((name) => {
        const s = srcMap.get(name);
        const d = dstMap.get(name);
        if (!s) {
            results.push({
                table: name,
                status: 'added',
                changes: (d.columns || []).map((c) => ({ action: 'added', column: c.name, info: c })),
            });
            return;
        }
        if (!d) {
            results.push({
                table: name,
                status: 'removed',
                changes: (s.columns || []).map((c) => ({ action: 'removed', column: c.name, info: c })),
            });
            return;
        }
        const srcCols = new Map();
        const dstCols = new Map();
        (s.columns || []).forEach((c) => srcCols.set(c.name, c));
        (d.columns || []).forEach((c) => dstCols.set(c.name, c));
        const colNames = new Set();
        srcCols.forEach((_, k) => colNames.add(k));
        dstCols.forEach((_, k) => colNames.add(k));
        const changes = [];
        colNames.forEach((cn) => {
            const sc = srcCols.get(cn);
            const dc = dstCols.get(cn);
            if (!sc) {
                changes.push({ action: 'added', column: cn, info: dc });
                return;
            }
            if (!dc) {
                changes.push({ action: 'removed', column: cn, info: sc });
                return;
            }
            const diffs = _ddCompareColumn(sc, dc);
            if (diffs.length > 0) {
                changes.push({
                    action: 'changed',
                    column: cn,
                    srcInfo: sc,
                    dstInfo: dc,
                    diffs: diffs,
                });
            }
        });
        // 排序：removed → added → changed，按列名字母序
        const order = { removed: 0, added: 1, changed: 2 };
        changes.sort((a, b) => order[a.action] - order[b.action] || a.column.localeCompare(b.column));
        results.push({ table: name, status: 'modified', changes: changes });
    });

    // 表级排序：added → removed → modified，按表名字母序
    const tableOrder = { added: 0, removed: 1, modified: 2 };
    results.sort((a, b) => tableOrder[a.status] - tableOrder[b.status] || a.table.localeCompare(b.table));
    return results;
}

// ============================================================
// UI 部分
// ============================================================

const _DDIFF_SAMPLE_SRC = [
    'CREATE TABLE users (',
    '  id INT NOT NULL AUTO_INCREMENT,',
    '  username VARCHAR(50) NOT NULL,',
    '  email VARCHAR(100),',
    '  age INT DEFAULT 0,',
    '  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,',
    '  PRIMARY KEY (id)',
    ');',
].join('\n');

const _DDIFF_SAMPLE_DST = [
    'CREATE TABLE users (',
    "  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',",
    "  username VARCHAR(80) NOT NULL COMMENT '用户名',",
    '  email VARCHAR(100) NOT NULL,',
    '  age INT DEFAULT 0,',
    '  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,',
    '  PRIMARY KEY (id)',
    ');',
    '',
    'CREATE TABLE logs (',
    '  id BIGINT NOT NULL AUTO_INCREMENT,',
    '  message TEXT,',
    '  PRIMARY KEY (id)',
    ');',
].join('\n');

function _ddiffGetInputs() {
    return {
        src: document.getElementById('ddiffSrc').value,
        dst: document.getElementById('ddiffDst').value,
    };
}

function _ddiffSetStatus(msg, isErr) {
    const el = document.getElementById('ddiffStatus');
    if (!el) return;
    el.textContent = msg;
    el.style.color = isErr ? 'var(--danger)' : 'var(--text-dim)';
}

function _ddiffSummaryHtml(results) {
    let added = 0,
        removed = 0,
        changed = 0;
    for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (r.status === 'added') added += r.changes.length;
        else if (r.status === 'removed') removed += r.changes.length;
        else if (r.status === 'modified') {
            for (let j = 0; j < r.changes.length; j++) {
                const c = r.changes[j];
                if (c.action === 'added') added++;
                else if (c.action === 'removed') removed++;
                else if (c.action === 'changed') changed++;
            }
        }
    }
    const totalTables = results.length;
    return (
        '<i class="bi bi-bar-chart"></i> 变更摘要: ' +
        '<b style="color:var(--success)">新增 ' +
        added +
        '</b> / ' +
        '<b style="color:var(--danger)">删除 ' +
        removed +
        '</b> / ' +
        '<b style="color:var(--warning)">修改 ' +
        changed +
        '</b>' +
        ' · 共 ' +
        totalTables +
        ' 张表'
    );
}

function _ddiffColInfoHtml(info) {
    if (!info) return '';
    const bits = [];
    bits.push('<span class="ddiff-info-type">' + escapeHtml(info.type) + '</span>');
    if (info.length != null) bits.push('(' + info.length + ')');
    bits.push(
        '<span class="ddiff-info-' +
            (info.nullable ? 'nullable' : 'notnull') +
            '">' +
            (info.nullable ? 'NULL' : 'NOT NULL') +
            '</span>'
    );
    if (info.autoInc) bits.push('<span class="ddiff-badge ddiff-badge-auto">AUTO_INC</span>');
    if (info.primaryKey) bits.push('<span class="ddiff-badge ddiff-badge-pk">PK</span>');
    if (info.unique) bits.push('<span class="ddiff-badge ddiff-badge-uk">UNIQUE</span>');
    if (info.default !== null && info.default !== undefined) {
        bits.push('DEFAULT <code>' + escapeHtml(String(info.default)) + '</code>');
    }
    if (info.comment) {
        bits.push('<span class="ddiff-comment">// ' + escapeHtml(info.comment) + '</span>');
    }
    return bits.join(' ');
}

function _ddiffRenderResults(results) {
    const wrap = document.getElementById('ddiffTables');
    if (!wrap) return;
    if (!results.length) {
        wrap.innerHTML =
            '<div style="padding:14px;color:var(--text-dim);text-align:center;font-size:12.5px">无数据</div>';
        return;
    }
    const html = [];
    for (let i = 0; i < results.length; i++) {
        const r = results[i];
        let headerCls = 'ddiff-card-modified';
        if (r.status === 'added') headerCls = 'ddiff-card-added';
        else if (r.status === 'removed') headerCls = 'ddiff-card-removed';

        const statusLabel = r.status === 'added' ? '新增表' : r.status === 'removed' ? '删除表' : '修改表';
        const statusBadgeCls =
            r.status === 'added'
                ? 'ddiff-status-added'
                : r.status === 'removed'
                  ? 'ddiff-status-removed'
                  : 'ddiff-status-modified';

        let body = '';
        if (r.status === 'modified') {
            body += '<table class="ddiff-table"><thead><tr>';
            body += '<th class="ddiff-col-num">#</th>';
            body += '<th>字段</th>';
            body += '<th>源</th>';
            body += '<th>目标</th>';
            body += '</tr></thead><tbody>';
            for (let j = 0; j < r.changes.length; j++) {
                const c = r.changes[j];
                let rowCls = '';
                let cellSrc = '',
                    cellDst = '';
                if (c.action === 'added') {
                    rowCls = 'ddiff-row-added';
                    cellSrc = '<span class="ddiff-empty">—</span>';
                    cellDst = _ddiffColInfoHtml(c.info);
                } else if (c.action === 'removed') {
                    rowCls = 'ddiff-row-removed';
                    cellSrc = _ddiffColInfoHtml(c.info);
                    cellDst = '<span class="ddiff-empty">—</span>';
                } else {
                    rowCls = 'ddiff-row-changed';
                    cellSrc = _ddiffColInfoHtml(c.srcInfo);
                    cellDst = _ddiffColInfoHtml(c.dstInfo);
                }
                body +=
                    '<tr class="' +
                    rowCls +
                    '">' +
                    '<td class="ddiff-col-num">' +
                    (j + 1) +
                    '</td>' +
                    '<td class="ddiff-col-name">' +
                    escapeHtml(c.column) +
                    '</td>' +
                    '<td>' +
                    cellSrc +
                    '</td>' +
                    '<td>' +
                    cellDst +
                    '</td>' +
                    '</tr>';
            }
            body += '</tbody></table>';
        } else {
            body +=
                '<table class="ddiff-table"><thead><tr><th class="ddiff-col-num">#</th><th>字段</th><th>定义</th></tr></thead><tbody>';
            for (let j = 0; j < r.changes.length; j++) {
                const c = r.changes[j];
                const rowCls = c.action === 'added' ? 'ddiff-row-added' : 'ddiff-row-removed';
                body +=
                    '<tr class="' +
                    rowCls +
                    '">' +
                    '<td class="ddiff-col-num">' +
                    (j + 1) +
                    '</td>' +
                    '<td class="ddiff-col-name">' +
                    escapeHtml(c.column) +
                    '</td>' +
                    '<td>' +
                    _ddiffColInfoHtml(c.info) +
                    '</td></tr>';
            }
            body += '</tbody></table>';
        }

        html.push(
            '<div class="ddiff-card ' +
                headerCls +
                '">' +
                '<div class="ddiff-card-head">' +
                '<i class="bi bi-table"></i> ' +
                escapeHtml(r.table) +
                '<span class="ddiff-status ' +
                statusBadgeCls +
                '">' +
                statusLabel +
                '</span>' +
                '<span class="ddiff-count">' +
                r.changes.length +
                ' 处变更</span>' +
                '</div>' +
                '<div class="ddiff-card-body">' +
                body +
                '</div>' +
                '</div>'
        );
    }
    wrap.innerHTML = html.join('');
}

function ddiffRun() {
    const ins = _ddiffGetInputs();
    const summaryEl = document.getElementById('ddiffSummary');
    if (!ins.src.trim() || !ins.dst.trim()) {
        _ddiffSetStatus('请输入源 DDL 与目标 DDL', true);
        return;
    }
    try {
        const srcTables = parseDDL(ins.src);
        const dstTables = parseDDL(ins.dst);
        if (!srcTables.length && !dstTables.length) {
            _ddiffSetStatus('未识别到任何 CREATE TABLE 语句', true);
            if (summaryEl) summaryEl.innerHTML = '';
            document.getElementById('ddiffTables').innerHTML = '';
            return;
        }
        const results = diffSchemas(srcTables, dstTables);
        if (summaryEl) summaryEl.innerHTML = _ddiffSummaryHtml(results);
        _ddiffRenderResults(results);
        _ddiffSetStatus('对比完成: ' + srcTables.length + ' 张源表 / ' + dstTables.length + ' 张目标表', false);
    } catch (e) {
        _ddiffSetStatus('对比失败: ' + e.message, true);
    }
}

function ddiffCopy() {
    const wrap = document.getElementById('ddiffTables');
    if (!wrap || !wrap.innerText.trim()) {
        toast('没有对比结果');
        return;
    }
    safeCopy(wrap.innerText, '已复制对比结果');
}

function ddiffClear() {
    document.getElementById('ddiffSrc').value = '';
    document.getElementById('ddiffDst').value = '';
    document.getElementById('ddiffTables').innerHTML = '';
    document.getElementById('ddiffSummary').innerHTML = '';
    _ddiffSetStatus('已清空', false);
}

function ddiffSample() {
    document.getElementById('ddiffSrc').value = _DDIFF_SAMPLE_SRC;
    document.getElementById('ddiffDst').value = _DDIFF_SAMPLE_DST;
    _ddiffSetStatus('已加载示例,点击"对比"开始', false);
}

function ddiffInit() {
    // 默认加载示例便于演示
    const srcEl = document.getElementById('ddiffSrc');
    if (srcEl && !srcEl.value) ddiffSample();
}

// ============================================================
// Node 测试导出（纯函数）
// ============================================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parseDDL, diffSchemas };
}

if (typeof registerInit === 'function') {
    registerInit('ddldiff', ddiffInit);
}
