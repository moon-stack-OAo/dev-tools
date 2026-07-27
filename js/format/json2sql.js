// JSON → SQL INSERT（纯函数可测）

function j2sParseJson(input) {
    let data;
    try {
        data = typeof input === 'string' ? JSON.parse(input) : input;
    } catch (e) {
        throw new Error('JSON 解析失败: ' + e.message);
    }
    if (data === null || data === undefined) {
        throw new Error('JSON 不能为空');
    }
    if (!Array.isArray(data)) {
        if (typeof data === 'object') {
            data = [data];
        } else {
            throw new Error('输入须为 JSON 对象或对象数组');
        }
    }
    if (data.length === 0) {
        throw new Error('数组为空，无法生成 INSERT');
    }
    const rows = data.map(function (row, i) {
        if (row === null || typeof row !== 'object' || Array.isArray(row)) {
            throw new Error('第 ' + (i + 1) + ' 行须为对象');
        }
        return row;
    });
    return rows;
}

function j2sCollectColumns(rows) {
    const keys = [];
    const seen = Object.create(null);
    rows.forEach(function (row) {
        Object.keys(row).forEach(function (k) {
            if (!seen[k]) {
                seen[k] = true;
                keys.push(k);
            }
        });
    });
    return keys;
}

function j2sQuoteIdent(name, dialect) {
    const s = String(name);
    if (dialect === 'mysql') {
        return '`' + s.replace(/`/g, '``') + '`';
    }
    if (dialect === 'sqlserver') {
        return '[' + s.replace(/]/g, ']]') + ']';
    }
    // postgres / oracle / 标准：双引号
    return '"' + s.replace(/"/g, '""') + '"';
}

function j2sSqlValue(val, dialect) {
    if (val === null || val === undefined) {
        return 'NULL';
    }
    if (typeof val === 'boolean') {
        if (dialect === 'oracle') {
            return val ? '1' : '0';
        }
        return val ? 'TRUE' : 'FALSE';
    }
    if (typeof val === 'number') {
        if (!isFinite(val)) {
            return 'NULL';
        }
        return String(val);
    }
    if (typeof val === 'bigint') {
        return String(val);
    }
    if (typeof val === 'object') {
        // 嵌套对象/数组 → JSON 字符串
        return j2sSqlValue(JSON.stringify(val), dialect);
    }
    let str = String(val);
    // 转义单引号
    str = str.replace(/'/g, "''");
    // MySQL 额外转义反斜杠
    if (dialect === 'mysql') {
        str = str.replace(/\\/g, '\\\\');
    }
    return "'" + str + "'";
}

/**
 * @param {string|object|array} input JSON 字符串或对象/数组
 * @param {object} options
 * @param {string} [options.table='t'] 表名
 * @param {string} [options.dialect='mysql'] mysql|postgres|oracle|sqlserver
 * @param {boolean} [options.batch=true] 是否多行 VALUES
 * @param {number} [options.batchSize=100] 每批行数
 * @param {boolean} [options.quoteIdent=true] 是否引用标识符
 * @param {string[]} [options.columns] 指定列顺序；默认按首现字段并集
 * @returns {string} SQL
 */
function jsonToSqlInsert(input, options) {
    options = options || {};
    const table = (options.table || 't').trim() || 't';
    const dialect = (options.dialect || 'mysql').toLowerCase();
    const batch = options.batch !== false;
    const batchSize = Math.max(1, parseInt(options.batchSize, 10) || 100);
    const quoteIdent = options.quoteIdent !== false;

    const rows = j2sParseJson(input);
    let columns = options.columns;
    if (!columns || !columns.length) {
        columns = j2sCollectColumns(rows);
    }
    if (!columns.length) {
        throw new Error('未找到任何字段');
    }

    const tableSql = quoteIdent ? j2sQuoteIdent(table, dialect) : table;
    const colSql = columns
        .map(function (c) {
            return quoteIdent ? j2sQuoteIdent(c, dialect) : c;
        })
        .join(', ');

    function valueTuple(row) {
        return (
            '(' +
            columns
                .map(function (c) {
                    const has = Object.prototype.hasOwnProperty.call(row, c);
                    return j2sSqlValue(has ? row[c] : null, dialect);
                })
                .join(', ') +
            ')'
        );
    }

    if (!batch) {
        return rows
            .map(function (row) {
                return 'INSERT INTO ' + tableSql + ' (' + colSql + ') VALUES ' + valueTuple(row) + ';';
            })
            .join('\n');
    }

    const parts = [];
    for (let i = 0; i < rows.length; i += batchSize) {
        const chunk = rows.slice(i, i + batchSize);
        const values = chunk.map(valueTuple).join(',\n  ');
        parts.push('INSERT INTO ' + tableSql + ' (' + colSql + ') VALUES\n  ' + values + ';');
    }
    return parts.join('\n\n');
}

function json2sqlConvert() {
    const input = document.getElementById('json2sqlInput').value;
    const out = document.getElementById('json2sqlOutput');
    const table = document.getElementById('json2sqlTable').value;
    const dialect = document.getElementById('json2sqlDialect').value;
    const batch = document.getElementById('json2sqlBatch').checked;
    const batchSize = document.getElementById('json2sqlBatchSize').value;
    const quoteIdent = document.getElementById('json2sqlQuote').checked;

    if (!input.trim()) {
        out.textContent = '请输入 JSON 数据';
        out.className = 'output-box error';
        return;
    }
    try {
        const sql = jsonToSqlInsert(input, {
            table: table,
            dialect: dialect,
            batch: batch,
            batchSize: batchSize,
            quoteIdent: quoteIdent,
        });
        out.textContent = sql;
        out.className = 'output-box';
        setStatus('已生成 INSERT（' + j2sParseJson(input).length + ' 行）');
    } catch (e) {
        out.textContent = '生成失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function json2sqlLoadSample() {
    document.getElementById('json2sqlInput').value = JSON.stringify(
        [
            { id: 1, name: '张三', age: 28, active: true, city: null },
            { id: 2, name: "O'Brien", age: 31, active: false, city: '上海' },
            { id: 3, name: '王五', age: 25, active: true, city: '广州', meta: { level: 1 } },
        ],
        null,
        2,
    );
    document.getElementById('json2sqlTable').value = 'user';
    setStatus('已加载示例');
}

function json2sqlClear() {
    document.getElementById('json2sqlInput').value = '';
    document.getElementById('json2sqlOutput').textContent = '';
    setStatus('已清空');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        jsonToSqlInsert: jsonToSqlInsert,
        j2sParseJson: j2sParseJson,
        j2sSqlValue: j2sSqlValue,
        j2sQuoteIdent: j2sQuoteIdent,
    };
}
