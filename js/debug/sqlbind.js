// SQL 参数绑定：? / :name / #{name} → 完整 SQL

/**
 * 判断值是否应作为裸字面量（不加引号）
 * @param {string} val
 * @param {boolean} forceString
 * @returns {boolean}
 */
function sbIsBareLiteral(val, forceString) {
    if (forceString) return false;
    var s = String(val).trim();
    if (/^null$/i.test(s)) return true;
    if (/^(true|false)$/i.test(s)) return true;
    if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(s)) return true;
    return false;
}

/**
 * 将原始值转为 SQL 字面量
 * @param {string} raw
 * @param {boolean} forceString
 * @returns {string}
 */
function sbToLiteral(raw, forceString) {
    var s = raw == null ? '' : String(raw);
    // 已带引号则原样（去掉外层再统一处理也可，这里尊重用户已加引号）
    if (!forceString && ((s.charAt(0) === "'" && s.charAt(s.length - 1) === "'") ||
        (s.charAt(0) === '"' && s.charAt(s.length - 1) === '"'))) {
        // 双引号转单引号并转义
        if (s.charAt(0) === '"') {
            var inner = s.slice(1, -1).replace(/'/g, "''");
            return "'" + inner + "'";
        }
        return s;
    }
    if (sbIsBareLiteral(s, forceString)) {
        if (/^null$/i.test(s.trim())) return 'NULL';
        return s.trim();
    }
    return "'" + s.replace(/'/g, "''") + "'";
}

/**
 * 解析位置参数：每行一个，或逗号分隔
 * @param {string} paramsText
 * @returns {string[]}
 */
function sbParsePositional(paramsText) {
    var text = String(paramsText || '').trim();
    if (!text) return [];
    // 优先按行
    var lines = text.split(/\r?\n/).map(function (l) {
        return l.trim();
    }).filter(function (l) {
        return l.length > 0;
    });
    if (lines.length > 1) return lines;
    // 单行：若含逗号且不像 JSON，按逗号拆（尊重引号）
    var single = lines[0] || text;
    if (single.charAt(0) === '[' || single.charAt(0) === '{') {
        try {
            var parsed = JSON.parse(single);
            if (Array.isArray(parsed)) {
                return parsed.map(function (v) {
                    return v == null ? 'null' : String(v);
                });
            }
        } catch (e) {
            // fallthrough
        }
    }
    if (single.indexOf(',') !== -1) {
        return sbSplitCsv(single);
    }
    return [single];
}

/**
 * 按逗号拆分，尊重单/双引号
 * @param {string} text
 * @returns {string[]}
 */
function sbSplitCsv(text) {
    var parts = [];
    var buf = '';
    var inSingle = false;
    var inDouble = false;
    for (var i = 0; i < text.length; i++) {
        var ch = text[i];
        if (ch === "'" && !inDouble) {
            inSingle = !inSingle;
            buf += ch;
            continue;
        }
        if (ch === '"' && !inSingle) {
            inDouble = !inDouble;
            buf += ch;
            continue;
        }
        if (ch === ',' && !inSingle && !inDouble) {
            parts.push(buf.trim());
            buf = '';
            continue;
        }
        buf += ch;
    }
    if (buf.trim()) parts.push(buf.trim());
    return parts;
}

/**
 * 解析命名参数：key=value 每行，或 JSON 对象
 * @param {string} paramsText
 * @returns {{ ok: boolean, map?: Object, msg?: string }}
 */
function sbParseNamed(paramsText) {
    var text = String(paramsText || '').trim();
    if (!text) return { ok: true, map: {} };

    if (text.charAt(0) === '{') {
        try {
            var obj = JSON.parse(text);
            if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
                var map = {};
                Object.keys(obj).forEach(function (k) {
                    map[k] = obj[k] == null ? 'null' : String(obj[k]);
                });
                return { ok: true, map: map };
            }
            return { ok: false, msg: 'JSON 必须是对象（key-value）' };
        } catch (e) {
            return { ok: false, msg: 'JSON 解析失败：' + e.message };
        }
    }

    var map2 = {};
    var lines = text.split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line || line.charAt(0) === '#') continue;
        var eq = line.indexOf('=');
        if (eq === -1) {
            return { ok: false, msg: '第 ' + (i + 1) + ' 行缺少 = ：' + line };
        }
        var key = line.slice(0, eq).trim();
        var val = line.slice(eq + 1).trim();
        if (!key) {
            return { ok: false, msg: '第 ' + (i + 1) + ' 行键名为空' };
        }
        map2[key] = val;
    }
    return { ok: true, map: map2 };
}

/**
 * 绑定位置参数 ?
 * @param {string} sql
 * @param {string[]} params
 * @param {boolean} forceString
 * @returns {{ ok: boolean, sql?: string, msg?: string }}
 */
function sbBindPositional(sql, params, forceString) {
    var src = String(sql || '');
    var list = params || [];
    var idx = 0;
    var out = '';
    var inSingle = false;
    var inDouble = false;
    for (var i = 0; i < src.length; i++) {
        var ch = src[i];
        if (ch === "'" && !inDouble) {
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
                return { ok: false, msg: '参数不足：还有未绑定的 ?' };
            }
            out += sbToLiteral(list[idx], forceString);
            idx++;
            continue;
        }
        out += ch;
    }
    if (idx < list.length) {
        return {
            ok: true,
            sql: out,
            msg: '警告：参数多于占位符（已使用前 ' + idx + ' 个）',
        };
    }
    return { ok: true, sql: out };
}

/**
 * 绑定命名参数 :name 与 #{name}
 * @param {string} sql
 * @param {Object} map
 * @param {boolean} forceString
 * @returns {{ ok: boolean, sql?: string, msg?: string }}
 */
function sbBindNamed(sql, map, forceString) {
    var src = String(sql || '');
    var used = {};
    var missing = [];

    // 先替换 #{name}，再替换 :name（避免与 :: 冲突时尽量保守）
    var out = src.replace(/#\{([A-Za-z_][\w.]*)\}/g, function (m, name) {
        if (!Object.prototype.hasOwnProperty.call(map, name)) {
            missing.push(name);
            return m;
        }
        used[name] = true;
        return sbToLiteral(map[name], forceString);
    });

    // :name 不匹配 ::cast 中的第二个冒号；不匹配 :123
    out = out.replace(/(^|[^:]):([A-Za-z_][\w]*)/g, function (m, pre, name) {
        if (!Object.prototype.hasOwnProperty.call(map, name)) {
            missing.push(name);
            return m;
        }
        used[name] = true;
        return pre + sbToLiteral(map[name], forceString);
    });

    if (missing.length) {
        var uniq = [];
        missing.forEach(function (n) {
            if (uniq.indexOf(n) === -1) uniq.push(n);
        });
        return { ok: false, msg: '缺少参数：' + uniq.join(', ') };
    }

    var unused = Object.keys(map).filter(function (k) {
        return !used[k];
    });
    var result = { ok: true, sql: out };
    if (unused.length) {
        result.msg = '警告：未使用的参数：' + unused.join(', ');
    }
    return result;
}

/**
 * SQL 参数绑定
 * @param {string} sql
 * @param {string} paramsText
 * @param {string} mode 'positional' | 'named'
 * @param {boolean} [forceString]
 * @returns {{ ok: boolean, sql?: string, msg?: string }}
 */
function sqlBindFill(sql, paramsText, mode, forceString) {
    var s = sql == null ? '' : String(sql);
    if (!s.trim()) {
        return { ok: false, msg: '请输入 SQL' };
    }
    var m = mode === 'named' ? 'named' : 'positional';
    var force = !!forceString;

    if (m === 'positional') {
        var list = sbParsePositional(paramsText);
        return sbBindPositional(s, list, force);
    }

    var named = sbParseNamed(paramsText);
    if (!named.ok) return named;
    return sbBindNamed(s, named.map, force);
}

// === UI ===
function sqlbindFill() {
    var sqlEl = document.getElementById('sbSql');
    var paramsEl = document.getElementById('sbParams');
    var modeEl = document.getElementById('sbMode');
    var forceEl = document.getElementById('sbForceString');
    var out = document.getElementById('sbOutput');
    if (!sqlEl || !paramsEl || !out) return;

    var mode = modeEl ? modeEl.value : 'positional';
    var force = forceEl ? forceEl.checked : false;
    var r = sqlBindFill(sqlEl.value, paramsEl.value, mode, force);
    if (!r.ok) {
        out.textContent = r.msg || '绑定失败';
        out.className = 'output-box error';
        if (typeof setStatus === 'function') setStatus(r.msg || '绑定失败');
        return;
    }
    var text = r.sql;
    if (r.msg) text = text + '\n\n// ' + r.msg;
    out.textContent = text;
    out.className = 'output-box';
    if (typeof setStatus === 'function') setStatus('参数绑定完成');
}

function sqlbindClear() {
    var sqlEl = document.getElementById('sbSql');
    var paramsEl = document.getElementById('sbParams');
    var out = document.getElementById('sbOutput');
    if (sqlEl) sqlEl.value = '';
    if (paramsEl) paramsEl.value = '';
    if (out) {
        out.textContent = '点击「绑定」查看完整 SQL';
        out.className = 'output-box';
    }
    if (typeof setStatus === 'function') setStatus('已清空');
}

function sqlbindSample() {
    var sqlEl = document.getElementById('sbSql');
    var paramsEl = document.getElementById('sbParams');
    var modeEl = document.getElementById('sbMode');
    if (!sqlEl || !paramsEl) return;
    var mode = modeEl ? modeEl.value : 'positional';
    if (mode === 'named') {
        sqlEl.value = 'SELECT * FROM user WHERE id = :id AND name = #{name} AND status = :status';
        paramsEl.value = 'id=1001\nname=张三\nstatus=active';
    } else {
        sqlEl.value = 'SELECT * FROM user WHERE id = ? AND name = ? AND deleted = ?';
        paramsEl.value = '1001\n张三\nfalse';
    }
    sqlbindFill();
}

function sqlbindOnModeChange() {
    var modeEl = document.getElementById('sbMode');
    var tip = document.getElementById('sbParamsTip');
    if (!modeEl || !tip) return;
    if (modeEl.value === 'named') {
        tip.textContent = '命名参数：每行 key=value，或 JSON 对象 {"id":1,"name":"a"}';
    } else {
        tip.textContent = '位置参数：每行一个，或逗号分隔；也支持 JSON 数组';
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        sqlBindFill: sqlBindFill,
        sbParsePositional: sbParsePositional,
        sbParseNamed: sbParseNamed,
        sbToLiteral: sbToLiteral,
        sbIsBareLiteral: sbIsBareLiteral,
        sbBindPositional: sbBindPositional,
        sbBindNamed: sbBindNamed,
    };
}
