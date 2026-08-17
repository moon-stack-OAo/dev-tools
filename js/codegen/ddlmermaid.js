// DDL → Mermaid erDiagram

/**
 * 去掉标识符包裹符 ` " [ ]
 * @param {string} name
 * @returns {string}
 */
function dmUnquote(name) {
    return String(name || '')
        .replace(/^[`"[]/, '')
        .replace(/[`"\]]$/, '')
        .trim();
}

/**
 * 跳过字符串字面量
 * @param {string} text
 * @param {number} start
 * @returns {number}
 */
function dmSkipString(text, start) {
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

/**
 * 移除 SQL 注释
 * @param {string} text
 * @returns {string}
 */
function dmStripComments(text) {
    let s = String(text);
    s = s.replace(/\/\*[\s\S]*?\*\//g, ' ');
    s = s.replace(/--[^\n\r]*/g, ' ');
    s = s.replace(/#[^\n\r]*/g, ' ');
    return s;
}

/**
 * 按顶层分号拆分语句
 * @param {string} text
 * @returns {string[]}
 */
function dmSplitStatements(text) {
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
            const end = dmSkipString(text, i);
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

/**
 * 提取 CREATE TABLE 首个顶层括号 body
 * @param {string} stmt
 * @returns {{table:string, body:string}|null}
 */
function dmExtractTable(stmt) {
    const m = stmt.match(
        /^\s*CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?((?:[`"[]?[\w$]+[`"\]]?\.)?[`"[]?[\w$]+[`"\]]?)\s*\(/i,
    );
    if (!m) return null;
    const tableRaw = m[1];
    const tableParts = tableRaw.split('.');
    const table = dmUnquote(tableParts[tableParts.length - 1]);

    const openIdx = stmt.indexOf('(', m.index + m[0].length - 1);
    if (openIdx < 0) return null;
    let depth = 0;
    for (let i = openIdx; i < stmt.length; i++) {
        const ch = stmt[i];
        if (ch === "'" || ch === '"' || ch === '`') {
            i = dmSkipString(stmt, i) - 1;
            continue;
        }
        if (ch === '(') depth++;
        else if (ch === ')') {
            depth--;
            if (depth === 0) {
                return { table: table, body: stmt.slice(openIdx + 1, i) };
            }
        }
    }
    return null;
}

/**
 * 顶层逗号拆分
 * @param {string} body
 * @returns {string[]}
 */
function dmSplitTopLevel(body) {
    const out = [];
    let cur = '';
    let depth = 0;
    let i = 0;
    const n = body.length;
    while (i < n) {
        const ch = body[i];
        if (ch === "'" || ch === '"' || ch === '`') {
            const end = dmSkipString(body, i);
            cur += body.slice(i, end);
            i = end;
            continue;
        }
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
        if (ch === ',' && depth === 0) {
            const part = cur.trim();
            if (part) out.push(part);
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

/**
 * 规范化 Mermaid 类型（去掉长度等）
 * @param {string} typeRaw
 * @returns {string}
 */
function dmNormalizeType(typeRaw) {
    let t = String(typeRaw || '').trim();
    // 取类型名 + 可选长度：varchar(64) → varchar
    const m = t.match(/^([A-Za-z][\w]*)(?:\s*\([^)]*\))?/);
    if (m) return m[1].toLowerCase();
    return t.replace(/\s+/g, '_').toLowerCase() || 'unknown';
}

/**
 * 解析单张表定义
 * @param {string} body
 * @param {string} tableName
 * @returns {{name:string, columns:Array, pks:string[], fks:Array}}
 */
function dmParseTableBody(body, tableName) {
    const columns = [];
    const pks = [];
    const fks = [];
    const parts = dmSplitTopLevel(body);

    parts.forEach(function (part) {
        const upper = part.replace(/\s+/g, ' ').trim();
        const u = upper.toUpperCase();

        // PRIMARY KEY (a, b)
        let m = upper.match(/^(?:CONSTRAINT\s+\S+\s+)?PRIMARY\s+KEY\s*\(([^)]+)\)/i);
        if (m) {
            m[1].split(',').forEach(function (c) {
                const n = dmUnquote(c.trim());
                if (n && pks.indexOf(n) < 0) pks.push(n);
            });
            return;
        }

        // FOREIGN KEY (col) REFERENCES other(col)
        m = upper.match(
            /^(?:CONSTRAINT\s+\S+\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+((?:[`"[]?[\w$]+[`"\]]?\.)?[`"[]?[\w$]+[`"\]]?)\s*\(([^)]+)\)/i,
        );
        if (m) {
            const cols = m[1].split(',').map(function (c) {
                return dmUnquote(c.trim());
            });
            const refParts = m[2].split('.');
            const refTable = dmUnquote(refParts[refParts.length - 1]);
            const refCols = m[3].split(',').map(function (c) {
                return dmUnquote(c.trim());
            });
            for (let i = 0; i < cols.length; i++) {
                fks.push({
                    column: cols[i],
                    refTable: refTable,
                    refColumn: refCols[i] || refCols[0],
                });
            }
            return;
        }

        // UNIQUE / KEY / INDEX / CHECK / CONSTRAINT 跳过
        if (
            /^(?:CONSTRAINT\s+\S+\s+)?(?:UNIQUE|KEY|INDEX|FULLTEXT|SPATIAL|CHECK)\b/i.test(upper) ||
            /^CONSTRAINT\b/i.test(upper)
        ) {
            return;
        }

        // 列定义: name type ...
        m = upper.match(/^([`"[]?[\w$]+[`"\]]?)\s+([A-Za-z][\w]*(?:\s*\([^)]*\))?)/);
        if (!m) return;
        const colName = dmUnquote(m[1]);
        if (!colName) return;
        // 排除误匹配关键字
        if (/^(PRIMARY|FOREIGN|UNIQUE|KEY|INDEX|CONSTRAINT|CHECK|FULLTEXT|SPATIAL)$/i.test(colName)) {
            return;
        }
        const typeRaw = m[2];
        const rest = upper.slice(m[0].length);
        const isPk = /\bPRIMARY\s+KEY\b/i.test(rest);
        const notNull = /\bNOT\s+NULL\b/i.test(rest);
        // 行内 REFERENCES
        const refM = rest.match(
            /\bREFERENCES\s+((?:[`"[]?[\w$]+[`"\]]?\.)?[`"[]?[\w$]+[`"\]]?)\s*(?:\(([^)]+)\))?/i,
        );
        if (refM) {
            const rp = refM[1].split('.');
            fks.push({
                column: colName,
                refTable: dmUnquote(rp[rp.length - 1]),
                refColumn: refM[2] ? dmUnquote(refM[2].split(',')[0].trim()) : 'id',
            });
        }
        if (isPk && pks.indexOf(colName) < 0) pks.push(colName);
        columns.push({
            name: colName,
            type: dmNormalizeType(typeRaw),
            typeRaw: typeRaw,
            pk: isPk,
            notNull: notNull || isPk,
        });
    });

    // 标记 pk
    columns.forEach(function (c) {
        if (pks.indexOf(c.name) >= 0) {
            c.pk = true;
            c.notNull = true;
        }
    });

    return { name: tableName, columns: columns, pks: pks, fks: fks };
}

/**
 * 解析完整 DDL
 * @param {string} ddlText
 * @returns {{tables:Array, relationships:Array}}
 */
function parseDdl(ddlText) {
    const text = dmStripComments(String(ddlText || ''));
    const stmts = dmSplitStatements(text);
    const tables = [];
    const relationships = [];

    stmts.forEach(function (stmt) {
        if (!/^\s*CREATE\s+TABLE\b/i.test(stmt)) return;
        const extracted = dmExtractTable(stmt);
        if (!extracted) return;
        const table = dmParseTableBody(extracted.body, extracted.table);
        tables.push(table);
        table.fks.forEach(function (fk) {
            relationships.push({
                fromTable: table.name,
                fromColumn: fk.column,
                toTable: fk.refTable,
                toColumn: fk.refColumn,
            });
        });
    });

    return { tables: tables, relationships: relationships };
}

/**
 * DDL → Mermaid erDiagram 文本
 * @param {string} ddlText
 * @returns {string}
 */
function ddlToMermaid(ddlText) {
    const parsed = parseDdl(ddlText);
    if (!parsed.tables.length) {
        throw new Error('未识别到 CREATE TABLE 定义');
    }

    const lines = ['erDiagram'];

    // 关系
    // Mermaid: TABLE1 ||--o{ TABLE2 : "label"
    // 这里 from 持有 FK → 多端，to 是被引用表 → 一端
    parsed.relationships.forEach(function (r) {
        const label = r.fromColumn + ' → ' + r.toColumn;
        lines.push(
            '    ' +
                r.toTable +
                ' ||--o{ ' +
                r.fromTable +
                ' : "' +
                label.replace(/"/g, "'") +
                '"',
        );
    });

    if (parsed.relationships.length) {
        lines.push('');
    }

    // 实体与字段
    parsed.tables.forEach(function (t) {
        lines.push('    ' + t.name + ' {');
        t.columns.forEach(function (c) {
            // type name PK/FK
            let marks = '';
            if (c.pk) marks += ' PK';
            const isFk = t.fks.some(function (f) {
                return f.column === c.name;
            });
            if (isFk) marks += ' FK';
            lines.push('        ' + c.type + ' ' + c.name + marks);
        });
        lines.push('    }');
        lines.push('');
    });

    // 去掉末尾空行
    while (lines.length && lines[lines.length - 1] === '') {
        lines.pop();
    }
    return lines.join('\n');
}

function ddlmermaidGenerate() {
    const input = document.getElementById('dmInput').value;
    const out = document.getElementById('dmOutput');
    if (!input || !input.trim()) {
        out.textContent = '请输入 CREATE TABLE DDL';
        out.className = 'output-box error';
        return;
    }
    try {
        const mermaid = ddlToMermaid(input);
        out.textContent = mermaid;
        out.className = 'output-box';
        setStatus('Mermaid ER 图已生成');
    } catch (e) {
        out.textContent = e.message;
        out.className = 'output-box error';
    }
}

function ddlmermaidLoadSample() {
    document.getElementById('dmInput').value =
        'CREATE TABLE users (\n' +
        '  id BIGINT PRIMARY KEY,\n' +
        '  name VARCHAR(64) NOT NULL,\n' +
        '  email VARCHAR(128)\n' +
        ');\n\n' +
        'CREATE TABLE orders (\n' +
        '  id BIGINT PRIMARY KEY,\n' +
        '  user_id BIGINT NOT NULL,\n' +
        '  amount DECIMAL(10,2),\n' +
        '  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id)\n' +
        ');\n\n' +
        'CREATE TABLE order_items (\n' +
        '  id BIGINT PRIMARY KEY,\n' +
        '  order_id BIGINT NOT NULL REFERENCES orders(id),\n' +
        '  product_name VARCHAR(128),\n' +
        '  qty INT\n' +
        ');';
    setStatus('已加载示例');
}

function ddlmermaidClear() {
    document.getElementById('dmInput').value = '';
    document.getElementById('dmOutput').textContent = '';
    setStatus('已清空');
}

/** 将当前输出写入 sessionStorage 并打开 Mermaid 编辑器 */
function ddlmermaidOpenInEditor() {
    const out = document.getElementById('dmOutput');
    const text = out ? (out.textContent || '').trim() : '';
    if (!text || text === '请输入 CREATE TABLE DDL' || out.classList.contains('error')) {
        if (typeof toast === 'function') {
            toast('请先成功生成 Mermaid ER', 'error');
        } else {
            setStatus('请先成功生成 Mermaid ER');
        }
        return;
    }
    try {
        sessionStorage.setItem('devtools.mermaid.openSource', text);
    } catch (e) {
        if (typeof toast === 'function') {
            toast('无法写入临时存储', 'error');
        }
        return;
    }
    if (typeof openTool !== 'function') {
        if (typeof toast === 'function') toast('openTool 不可用', 'error');
        return;
    }
    Promise.resolve(openTool('mermaid'))
        .then(function () {
            // 工具若已 init 过，registerInit 不会再跑，需主动应用 storage
            if (typeof mmdApplyOpenSource === 'function') {
                mmdApplyOpenSource();
            }
            setStatus('已跳转 Mermaid 编辑器');
        })
        .catch(function () {
            setStatus('打开 Mermaid 编辑器失败');
        });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ddlToMermaid: ddlToMermaid,
        parseDdl: parseDdl,
        dmUnquote: dmUnquote,
        dmNormalizeType: dmNormalizeType,
    };
}
