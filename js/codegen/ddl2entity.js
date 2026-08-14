// DDL → JPA Entity / Prisma Schema

/**
 * 去掉标识符包裹符
 * @param {string} name
 * @returns {string}
 */
function d2eUnquote(name) {
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
function d2eSkipString(text, start) {
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
function d2eStripComments(text) {
    let s = String(text || '');
    s = s.replace(/\/\*[\s\S]*?\*\//g, ' ');
    s = s.replace(/--[^\n\r]*/g, ' ');
    s = s.replace(/#[^\n\r]*/g, ' ');
    return s;
}

/**
 * 按顶层分号拆分
 * @param {string} text
 * @returns {string[]}
 */
function d2eSplitStatements(text) {
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
            const end = d2eSkipString(text, i);
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
 * 提取 CREATE TABLE 表名与 body
 * @param {string} stmt
 * @returns {{tableName:string, body:string}|null}
 */
function d2eExtractTable(stmt) {
    const m = stmt.match(
        /^\s*CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?((?:[`"[]?[\w$]+[`"\]]?\.)?[`"[]?[\w$]+[`"\]]?)\s*\(/i,
    );
    if (!m) return null;
    const tableRaw = m[1];
    const tableParts = tableRaw.split('.');
    const tableName = d2eUnquote(tableParts[tableParts.length - 1]);

    const openIdx = stmt.indexOf('(', m.index + m[0].length - 1);
    if (openIdx < 0) return null;
    let depth = 0;
    for (let i = openIdx; i < stmt.length; i++) {
        const ch = stmt[i];
        if (ch === "'" || ch === '"' || ch === '`') {
            i = d2eSkipString(stmt, i) - 1;
            continue;
        }
        if (ch === '(') depth++;
        else if (ch === ')') {
            depth--;
            if (depth === 0) {
                return { tableName: tableName, body: stmt.slice(openIdx + 1, i) };
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
function d2eSplitTopLevel(body) {
    const out = [];
    let cur = '';
    let depth = 0;
    let i = 0;
    const n = body.length;
    while (i < n) {
        const ch = body[i];
        if (ch === "'" || ch === '"' || ch === '`') {
            const end = d2eSkipString(body, i);
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
 * 提取 COMMENT
 * @param {string} line
 * @returns {string}
 */
function d2eExtractComment(line) {
    const m = String(line || '').match(/COMMENT\s+'((?:[^'\\]|\\.|'')*)'/i);
    if (!m) {
        const m2 = String(line || '').match(/COMMENT\s+"((?:[^"\\]|\\.|"")*)"/i);
        return m2 ? m2[1].replace(/''/g, "'").replace(/""/g, '"') : '';
    }
    return m[1].replace(/''/g, "'");
}

/**
 * 规范化 SQL 类型名（去长度）
 * @param {string} typeRaw
 * @returns {string}
 */
function d2eNormalizeSqlType(typeRaw) {
    let t = String(typeRaw || '').trim();
    const m = t.match(/^([A-Za-z][\w]*)(?:\s*\([^)]*\))?/);
    if (m) return m[1].toUpperCase();
    return t.replace(/\s+/g, '_').toUpperCase() || 'VARCHAR';
}

/**
 * snake_case → PascalCase
 * @param {string} s
 * @returns {string}
 */
function d2eToPascalCase(s) {
    return String(s || '')
        .replace(/[_-](\w)/g, function (_, c) {
            return c.toUpperCase();
        })
        .replace(/^\w/, function (c) {
            return c.toUpperCase();
        });
}

/**
 * snake_case → camelCase
 * @param {string} s
 * @returns {string}
 */
function d2eToCamelCase(s) {
    const p = d2eToPascalCase(s);
    return p ? p.charAt(0).toLowerCase() + p.slice(1) : '';
}

/**
 * 解析 DDL（取第一张 CREATE TABLE）
 * @param {string} sql
 * @returns {{tableName:string, columns:Array, primaryKeys:string[]}}
 */
function parseDdl(sql) {
    const text = d2eStripComments(String(sql || ''));
    const stmts = d2eSplitStatements(text);
    let extracted = null;
    for (let i = 0; i < stmts.length; i++) {
        if (!/^\s*CREATE\s+TABLE\b/i.test(stmts[i])) continue;
        extracted = d2eExtractTable(stmts[i]);
        if (extracted) break;
    }
    if (!extracted) {
        throw new Error('未识别到 CREATE TABLE 定义');
    }

    const columns = [];
    const primaryKeys = [];
    const parts = d2eSplitTopLevel(extracted.body);

    parts.forEach(function (part) {
        const upper = part.replace(/\s+/g, ' ').trim();

        let m = upper.match(/^(?:CONSTRAINT\s+\S+\s+)?PRIMARY\s+KEY\s*\(([^)]+)\)/i);
        if (m) {
            m[1].split(',').forEach(function (c) {
                const n = d2eUnquote(c.trim());
                if (n && primaryKeys.indexOf(n) < 0) primaryKeys.push(n);
            });
            return;
        }

        if (
            /^(?:CONSTRAINT\s+\S+\s+)?(?:FOREIGN\s+KEY|UNIQUE|KEY|INDEX|FULLTEXT|SPATIAL|CHECK)\b/i.test(
                upper,
            ) ||
            /^CONSTRAINT\b/i.test(upper)
        ) {
            return;
        }

        m = upper.match(/^([`"[]?[\w$]+[`"\]]?)\s+([A-Za-z][\w]*(?:\s*\([^)]*\))?)/);
        if (!m) return;
        const colName = d2eUnquote(m[1]);
        if (!colName) return;
        if (/^(PRIMARY|FOREIGN|UNIQUE|KEY|INDEX|CONSTRAINT|CHECK|FULLTEXT|SPATIAL)$/i.test(colName)) {
            return;
        }

        const rawType = m[2];
        const rest = upper.slice(m[0].length);
        const isPk = /\bPRIMARY\s+KEY\b/i.test(rest);
        const notNull = /\bNOT\s+NULL\b/i.test(rest);
        const nullable = !(notNull || isPk);
        const comment = d2eExtractComment(upper);
        const sqlType = d2eNormalizeSqlType(rawType);

        if (isPk && primaryKeys.indexOf(colName) < 0) {
            primaryKeys.push(colName);
        }

        columns.push({
            name: colName,
            sqlType: sqlType,
            rawType: rawType,
            nullable: nullable,
            primaryKey: isPk,
            comment: comment,
        });
    });

    columns.forEach(function (c) {
        if (primaryKeys.indexOf(c.name) >= 0) {
            c.primaryKey = true;
            c.nullable = false;
        }
    });

    if (!columns.length) {
        throw new Error('未识别到字段定义');
    }

    return {
        tableName: extracted.tableName,
        columns: columns,
        primaryKeys: primaryKeys,
    };
}

/**
 * SQL 类型 → Java 类型
 * @param {string} t
 * @returns {string}
 */
function sqlTypeToJava(t) {
    const key = d2eNormalizeSqlType(t);
    const map = {
        INT: 'Integer',
        INTEGER: 'Integer',
        BIGINT: 'Long',
        TINYINT: 'Integer',
        SMALLINT: 'Integer',
        MEDIUMINT: 'Integer',
        VARCHAR: 'String',
        CHAR: 'String',
        TEXT: 'String',
        TINYTEXT: 'String',
        LONGTEXT: 'String',
        MEDIUMTEXT: 'String',
        BLOB: 'byte[]',
        TINYBLOB: 'byte[]',
        MEDIUMBLOB: 'byte[]',
        LONGBLOB: 'byte[]',
        BINARY: 'byte[]',
        VARBINARY: 'byte[]',
        DATE: 'java.time.LocalDate',
        DATETIME: 'java.time.LocalDateTime',
        TIMESTAMP: 'java.time.LocalDateTime',
        TIME: 'java.time.LocalTime',
        YEAR: 'Integer',
        DECIMAL: 'java.math.BigDecimal',
        NUMERIC: 'java.math.BigDecimal',
        FLOAT: 'Float',
        DOUBLE: 'Double',
        REAL: 'Float',
        BOOLEAN: 'Boolean',
        BOOL: 'Boolean',
        BIT: 'Boolean',
        JSON: 'String',
        UUID: 'java.util.UUID',
    };
    return map[key] || 'String';
}

/**
 * SQL 类型 → Prisma 类型
 * @param {string} t
 * @returns {string}
 */
function sqlTypeToPrisma(t) {
    const key = d2eNormalizeSqlType(t);
    const map = {
        INT: 'Int',
        INTEGER: 'Int',
        BIGINT: 'BigInt',
        TINYINT: 'Int',
        SMALLINT: 'Int',
        MEDIUMINT: 'Int',
        VARCHAR: 'String',
        CHAR: 'String',
        TEXT: 'String',
        TINYTEXT: 'String',
        LONGTEXT: 'String',
        MEDIUMTEXT: 'String',
        BLOB: 'Bytes',
        TINYBLOB: 'Bytes',
        MEDIUMBLOB: 'Bytes',
        LONGBLOB: 'Bytes',
        BINARY: 'Bytes',
        VARBINARY: 'Bytes',
        DATE: 'DateTime',
        DATETIME: 'DateTime',
        TIMESTAMP: 'DateTime',
        TIME: 'DateTime',
        YEAR: 'Int',
        DECIMAL: 'Decimal',
        NUMERIC: 'Decimal',
        FLOAT: 'Float',
        DOUBLE: 'Float',
        REAL: 'Float',
        BOOLEAN: 'Boolean',
        BOOL: 'Boolean',
        BIT: 'Boolean',
        JSON: 'Json',
        UUID: 'String',
    };
    return map[key] || 'String';
}

/**
 * Java 短类型名（import 用全名时字段用短名）
 * @param {string} full
 * @returns {{type:string, imports:string[]}}
 */
function d2eJavaTypeInfo(full) {
    const imports = [];
    let type = full;
    if (full.indexOf('.') >= 0) {
        imports.push(full);
        type = full.split('.').pop();
    }
    return { type: type, imports: imports };
}

/**
 * 生成 JPA Entity
 * @param {object} parsed parseDdl 结果
 * @param {{packageName?:string, useLombok?:boolean}} [options]
 * @returns {string}
 */
function generateJpaEntity(parsed, options) {
    const opts = options || {};
    const tableName = parsed.tableName || 'entity';
    const className = d2eToPascalCase(tableName);
    const useLombok = opts.useLombok !== false;
    const packageName = opts.packageName ? String(opts.packageName).trim() : '';

    const importSet = {};
    function addImport(path) {
        if (path) importSet[path] = true;
    }

    addImport('javax.persistence.Entity');
    addImport('javax.persistence.Table');
    addImport('javax.persistence.Column');
    if (useLombok) {
        addImport('lombok.Data');
    }

    const fieldBlocks = [];
    parsed.columns.forEach(function (col) {
        const javaInfo = d2eJavaTypeInfo(sqlTypeToJava(col.sqlType || col.rawType));
        javaInfo.imports.forEach(addImport);
        const fieldName = d2eToCamelCase(col.name);
        const lines = [];
        if (col.comment) {
            lines.push('    /** ' + col.comment.replace(/\*\//g, '* /') + ' */');
        }
        if (col.primaryKey) {
            addImport('javax.persistence.Id');
            lines.push('    @Id');
            // 常见 id 自增
            if (
                /^(id|.*_id)$/i.test(col.name) ||
                /BIGINT|INT|INTEGER|SMALLINT|TINYINT/i.test(col.sqlType)
            ) {
                addImport('javax.persistence.GeneratedValue');
                addImport('javax.persistence.GenerationType');
                lines.push('    @GeneratedValue(strategy = GenerationType.IDENTITY)');
            }
        }
        const colParts = ['name = "' + col.name + '"'];
        if (!col.nullable) colParts.push('nullable = false');
        lines.push('    @Column(' + colParts.join(', ') + ')');
        lines.push('    private ' + javaInfo.type + ' ' + fieldName + ';');
        fieldBlocks.push(lines.join('\n'));
    });

    const lines = [];
    if (packageName) {
        lines.push('package ' + packageName + ';');
        lines.push('');
    }

    const importList = Object.keys(importSet).sort();
    importList.forEach(function (imp) {
        lines.push('import ' + imp + ';');
    });
    if (importList.length) lines.push('');

    if (useLombok) {
        lines.push('@Data');
    }
    lines.push('@Entity');
    lines.push('@Table(name = "' + tableName + '")');
    lines.push('public class ' + className + ' {');
    lines.push('');
    fieldBlocks.forEach(function (block, idx) {
        lines.push(block);
        if (idx < fieldBlocks.length - 1) lines.push('');
    });

    if (!useLombok) {
        parsed.columns.forEach(function (col) {
            const javaInfo = d2eJavaTypeInfo(sqlTypeToJava(col.sqlType || col.rawType));
            const fieldName = d2eToCamelCase(col.name);
            const pascal = d2eToPascalCase(col.name);
            lines.push('');
            lines.push('    public ' + javaInfo.type + ' get' + pascal + '() {');
            lines.push('        return ' + fieldName + ';');
            lines.push('    }');
            lines.push('');
            lines.push('    public void set' + pascal + '(' + javaInfo.type + ' ' + fieldName + ') {');
            lines.push('        this.' + fieldName + ' = ' + fieldName + ';');
            lines.push('    }');
        });
    }

    lines.push('}');
    lines.push('');
    return lines.join('\n');
}

/**
 * 生成 Prisma model
 * @param {object} parsed
 * @returns {string}
 */
function generatePrismaModel(parsed) {
    const tableName = parsed.tableName || 'Entity';
    const modelName = d2eToPascalCase(tableName);
    const lines = [];
    lines.push('model ' + modelName + ' {');

    parsed.columns.forEach(function (col) {
        const prismaType = sqlTypeToPrisma(col.sqlType || col.rawType);
        const fieldName = d2eToCamelCase(col.name);
        let line = '  ' + fieldName + ' ' + prismaType;
        if (col.nullable && !col.primaryKey) {
            line += '?';
        }
        const attrs = [];
        if (col.primaryKey) {
            attrs.push('@id');
            if (/BIGINT|INT|INTEGER|SMALLINT|TINYINT/i.test(col.sqlType)) {
                attrs.push('@default(autoincrement())');
            }
        }
        if (fieldName !== col.name) {
            attrs.push('@map("' + col.name + '")');
        }
        if (attrs.length) {
            line += ' ' + attrs.join(' ');
        }
        if (col.comment) {
            line += ' // ' + col.comment.replace(/\n/g, ' ');
        }
        lines.push(line);
    });

    if (modelName !== tableName) {
        lines.push('');
        lines.push('  @@map("' + tableName + '")');
    }
    lines.push('}');
    lines.push('');
    return lines.join('\n');
}

/**
 * 统一入口
 * @param {string} sql
 * @param {'jpa'|'prisma'} target
 * @param {{packageName?:string, useLombok?:boolean}} [options]
 * @returns {{ok:boolean, code?:string, error?:string, parsed?:object}}
 */
function ddlToEntity(sql, target, options) {
    try {
        if (!sql || !String(sql).trim()) {
            return { ok: false, error: '请输入 SQL DDL' };
        }
        const t = String(target || 'jpa').toLowerCase();
        if (t !== 'jpa' && t !== 'prisma') {
            return { ok: false, error: "target 须为 'jpa' 或 'prisma'" };
        }
        const parsed = parseDdl(sql);
        const code =
            t === 'prisma' ? generatePrismaModel(parsed) : generateJpaEntity(parsed, options || {});
        return { ok: true, code: code, parsed: parsed };
    } catch (e) {
        return { ok: false, error: e.message || String(e) };
    }
}

// ---------- UI ----------

const D2E_SAMPLE =
    "CREATE TABLE `sys_user` (\n" +
    "  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',\n" +
    "  `user_name` VARCHAR(64) NOT NULL COMMENT '用户名',\n" +
    "  `email` VARCHAR(128) DEFAULT NULL COMMENT '邮箱',\n" +
    "  `age` INT DEFAULT NULL COMMENT '年龄',\n" +
    "  `balance` DECIMAL(10,2) DEFAULT 0 COMMENT '余额',\n" +
    "  `active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',\n" +
    "  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',\n" +
    "  PRIMARY KEY (`id`)\n" +
    ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';";

function d2eSetOutput(text, isError) {
    const out = document.getElementById('d2eOutput');
    if (!out) return;
    out.textContent = text || '';
    if (isError) out.classList.add('error');
    else out.classList.remove('error');
}

function d2eGetTarget() {
    const el = document.getElementById('d2eTarget');
    return el ? el.value : 'jpa';
}

function d2eGetOptions() {
    const pkgEl = document.getElementById('d2ePackage');
    const lombokEl = document.getElementById('d2eLombok');
    return {
        packageName: pkgEl ? pkgEl.value.trim() : '',
        useLombok: lombokEl ? !!lombokEl.checked : true,
    };
}

function d2eSyncOptionsUi() {
    const target = d2eGetTarget();
    const jpaOpts = document.getElementById('d2eJpaOpts');
    if (jpaOpts) {
        jpaOpts.style.display = target === 'jpa' ? '' : 'none';
    }
    const label = document.getElementById('d2eOutLabel');
    if (label) {
        label.textContent = target === 'prisma' ? '生成的 Prisma Schema' : '生成的 JPA Entity';
    }
}

function d2eGenerate() {
    const input = document.getElementById('d2eInput');
    const sql = input ? input.value : '';
    const target = d2eGetTarget();
    const r = ddlToEntity(sql, target, d2eGetOptions());
    if (!r.ok) {
        d2eSetOutput(r.error, true);
        if (typeof setStatus === 'function') setStatus(r.error);
        return;
    }
    d2eSetOutput(r.code, false);
    if (typeof setStatus === 'function') setStatus('已生成 ' + (target === 'prisma' ? 'Prisma' : 'JPA') + ' 代码');
}

function d2eLoadSample() {
    const input = document.getElementById('d2eInput');
    if (input) input.value = D2E_SAMPLE;
    d2eGenerate();
}

function d2eClear() {
    const input = document.getElementById('d2eInput');
    if (input) input.value = '';
    d2eSetOutput('', false);
    if (typeof setStatus === 'function') setStatus('已清空');
}

function d2eInit() {
    const target = document.getElementById('d2eTarget');
    if (target) {
        target.addEventListener('change', function () {
            d2eSyncOptionsUi();
            const input = document.getElementById('d2eInput');
            if (input && input.value.trim()) d2eGenerate();
        });
    }
    d2eSyncOptionsUi();
}

if (typeof window !== 'undefined') {
    window.d2eGenerate = d2eGenerate;
    window.d2eLoadSample = d2eLoadSample;
    window.d2eClear = d2eClear;
    window.d2eSyncOptionsUi = d2eSyncOptionsUi;
}

if (typeof registerInit !== 'undefined') {
    registerInit('ddl2entity', d2eInit);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseDdl: parseDdl,
        sqlTypeToJava: sqlTypeToJava,
        sqlTypeToPrisma: sqlTypeToPrisma,
        generateJpaEntity: generateJpaEntity,
        generatePrismaModel: generatePrismaModel,
        ddlToEntity: ddlToEntity,
        d2eUnquote: d2eUnquote,
        d2eToPascalCase: d2eToPascalCase,
        d2eToCamelCase: d2eToCamelCase,
        D2E_SAMPLE: D2E_SAMPLE,
    };
}
