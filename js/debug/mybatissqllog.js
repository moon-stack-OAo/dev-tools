// MyBatis SQL 日志还原：Preparing + Parameters → 可执行 SQL

/**
 * 解析 Parameters 行中的单个参数
 * 格式：value(Type) 或 null
 * @param {string} token
 * @returns {{ value: string, type: string|null, isNull: boolean }}
 */
function mslParseParamToken(token) {
    var s = String(token || '').trim();
    if (!s || s.toLowerCase() === 'null') {
        return { value: 'null', type: null, isNull: true };
    }
    var m = s.match(/^(.*)\(([^()]+)\)\s*$/);
    if (m) {
        return { value: m[1], type: m[2].trim(), isNull: false };
    }
    return { value: s, type: null, isNull: false };
}

/**
 * 将参数转为 SQL 字面量
 * @param {{ value: string, type: string|null, isNull: boolean }} param
 * @returns {string}
 */
function mslParamToLiteral(param) {
    if (!param || param.isNull) return 'NULL';
    var type = (param.type || '').toLowerCase();
    var val = param.value;

    // 数字类型
    if (
        type === 'integer' ||
        type === 'int' ||
        type === 'long' ||
        type === 'short' ||
        type === 'byte' ||
        type === 'double' ||
        type === 'float' ||
        type === 'bigdecimal' ||
        type === 'biginteger' ||
        type === 'number'
    ) {
        return val;
    }

    // 布尔
    if (type === 'boolean' || type === 'bool') {
        return val;
    }

    // 无类型时：纯数字 / true/false / null
    if (!type) {
        if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(val)) return val;
        if (/^(true|false)$/i.test(val)) return val;
        if (/^null$/i.test(val)) return 'NULL';
    }

    // 字符串 / 日期 / 时间等：加单引号并转义
    var escaped = String(val).replace(/'/g, "''");
    return "'" + escaped + "'";
}

/**
 * 解析 Parameters 行文本为参数数组
 * 值内可含逗号，以 null 或末尾 (Type) 作为参数边界
 * @param {string} paramsText
 * @returns {Array}
 */
function mslParseParameters(paramsText) {
    var text = String(paramsText || '').trim();
    if (!text) return [];
    // 先按逗号切开，再合并到完整参数（null 或 xxx(Type)）
    var fragments = text.split(',');
    var tokens = [];
    var buf = '';
    for (var i = 0; i < fragments.length; i++) {
        buf = buf ? buf + ',' + fragments[i] : fragments[i];
        var trimmed = buf.trim();
        if (!trimmed) continue;
        // 完整参数：null，或末尾带 (JavaType)
        if (/^null$/i.test(trimmed) || /\([A-Za-z][\w.$]*\)\s*$/.test(trimmed)) {
            tokens.push(trimmed);
            buf = '';
        }
    }
    if (buf.trim()) tokens.push(buf.trim());
    return tokens.map(mslParseParamToken);
}

/**
 * 将 SQL 中的 ? 按序替换为字面量
 * @param {string} sql
 * @param {Array} params
 * @returns {{ ok: boolean, sql?: string, msg?: string }}
 */
function mslBindSql(sql, params) {
    var src = String(sql || '');
    var list = params || [];
    var idx = 0;
    var out = '';
    var inSingle = false;
    var inDouble = false;
    for (var i = 0; i < src.length; i++) {
        var ch = src[i];
        if (ch === "'" && !inDouble) {
            // SQL 转义 ''
            if (inSingle && src[i + 1] === "'") {
                out += "''";
                i++;
                continue;
            }
            inSingle = !inSingle;
            out += ch;
            continue;
        }
        if (ch === '"' && !inSingle) {
            inDouble = !inDouble;
            out += ch;
            continue;
        }
        if (ch === '?' && !inSingle && !inDouble) {
            if (idx >= list.length) {
                return { ok: false, msg: '参数不足：SQL 中还有未绑定的 ?' };
            }
            out += mslParamToLiteral(list[idx]);
            idx++;
            continue;
        }
        out += ch;
    }
    if (idx < list.length) {
        // 多余参数：仍返回结果，但提示
        return {
            ok: true,
            sql: out,
            msg: '警告：参数多于占位符（已使用前 ' + idx + ' 个）',
        };
    }
    return { ok: true, sql: out };
}

/**
 * 从日志文本中提取 Preparing / Parameters 组
 * @param {string} logText
 * @returns {Array<{ preparing: string, parameters: string }>}
 */
function mslExtractPairs(logText) {
    var text = String(logText || '');
    var lines = text.split(/\r?\n/);
    var pairs = [];
    var pendingPreparing = null;

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var prepMatch = line.match(/(?:==>\s*)?Preparing:\s*(.+)$/i);
        if (prepMatch) {
            pendingPreparing = prepMatch[1].trim();
            continue;
        }
        var paramMatch = line.match(/(?:==>\s*)?Parameters:\s*(.*)$/i);
        if (paramMatch) {
            if (pendingPreparing != null) {
                pairs.push({
                    preparing: pendingPreparing,
                    parameters: paramMatch[1].trim(),
                });
                pendingPreparing = null;
            }
        }
    }
    // 只有 Preparing 没有 Parameters 也保留
    if (pendingPreparing != null) {
        pairs.push({ preparing: pendingPreparing, parameters: '' });
    }
    return pairs;
}

/**
 * 还原 MyBatis SQL 日志
 * @param {string} logText
 * @returns {{ ok: boolean, sql?: string, preparing?: string, parameters?: string, pairs?: Array, msg?: string }}
 */
function mybatisSqlLogRestore(logText) {
    var text = logText == null ? '' : String(logText);
    if (!text.trim()) {
        return { ok: false, msg: '请粘贴 MyBatis 日志（含 Preparing / Parameters）' };
    }

    var pairs = mslExtractPairs(text);
    if (!pairs.length) {
        return { ok: false, msg: '未找到 Preparing: 行，请检查日志格式' };
    }

    var sqlParts = [];
    var firstPrep = pairs[0].preparing;
    var firstParams = pairs[0].parameters;
    var warnMsgs = [];

    for (var i = 0; i < pairs.length; i++) {
        var p = pairs[i];
        var params = mslParseParameters(p.parameters);
        var bound = mslBindSql(p.preparing, params);
        if (!bound.ok) {
            return {
                ok: false,
                msg: '第 ' + (i + 1) + ' 组绑定失败：' + bound.msg,
                preparing: p.preparing,
                parameters: p.parameters,
            };
        }
        if (bound.msg) warnMsgs.push('第 ' + (i + 1) + ' 组：' + bound.msg);
        sqlParts.push(bound.sql);
    }

    var result = {
        ok: true,
        sql: sqlParts.join('\n---\n'),
        preparing: firstPrep,
        parameters: firstParams,
        pairs: pairs.map(function (p, idx) {
            return {
                preparing: p.preparing,
                parameters: p.parameters,
                sql: sqlParts[idx],
            };
        }),
    };
    if (warnMsgs.length) {
        result.msg = warnMsgs.join('；');
    }
    return result;
}

// === UI ===
function mybatissqllogRestore() {
    var input = document.getElementById('mslInput');
    var out = document.getElementById('mslOutput');
    if (!input || !out) return;
    var r = mybatisSqlLogRestore(input.value);
    if (!r.ok) {
        out.textContent = r.msg || '还原失败';
        out.className = 'output-box error';
        if (typeof setStatus === 'function') setStatus(r.msg || '还原失败');
        return;
    }
    var text = r.sql;
    if (r.msg) text = text + '\n\n// ' + r.msg;
    out.textContent = text;
    out.className = 'output-box';
    if (typeof setStatus === 'function') setStatus('SQL 还原完成（' + (r.pairs ? r.pairs.length : 1) + ' 组）');
}

function mybatissqllogClear() {
    var input = document.getElementById('mslInput');
    var out = document.getElementById('mslOutput');
    if (input) input.value = '';
    if (out) {
        out.textContent = '点击「还原」查看可执行 SQL';
        out.className = 'output-box';
    }
    if (typeof setStatus === 'function') setStatus('已清空');
}

function mybatissqllogSample() {
    var input = document.getElementById('mslInput');
    if (!input) return;
    input.value =
        '2024-05-20 10:23:45.123 DEBUG [http-nio-8080-exec-1] c.e.m.UserMapper.selectById - ==>  Preparing: SELECT id, name, email, created_at FROM user WHERE id = ? AND status = ? AND deleted = ?\n' +
        '2024-05-20 10:23:45.125 DEBUG [http-nio-8080-exec-1] c.e.m.UserMapper.selectById - ==> Parameters: 1001(Long), active(String), false(Boolean)';
    mybatissqllogRestore();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        mybatisSqlLogRestore: mybatisSqlLogRestore,
        mslParseParamToken: mslParseParamToken,
        mslParseParameters: mslParseParameters,
        mslParamToLiteral: mslParamToLiteral,
        mslBindSql: mslBindSql,
        mslExtractPairs: mslExtractPairs,
    };
}
