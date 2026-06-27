// SQL 方言互转（基础关键字/函数替换，非 SQL 解析）

// 转换规则表：每个规则对应一组 [pattern, replacement]，按方言归类
// 规则顺序：先做关键字替换（保留大小写不敏感），再做函数名替换
// 替换策略：尽量保留原始大小写形式，使用不区分大小写的正则匹配

function buildCaseInsensitiveRegex(src) {
    return new RegExp(src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
}

function replaceWord(sql, word, replacement) {
    // 用单词边界匹配，保留大小写形态
    const re = new RegExp('\\b' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
    return sql.replace(re, (match) => {
        // 保留原大小写形式（全大写 -> 全大写；混合 -> replacement 原样）
        if (match === match.toUpperCase()) return replacement.toUpperCase();
        if (match[0] === match[0].toUpperCase()) {
            return replacement[0].toUpperCase() + replacement.slice(1);
        }
        return replacement;
    });
}

// 各方言函数/类型映射
const DIALECT_FUNCTIONS = {
    // ROWNUM -> LIMIT
    rownumToLimit: (sql) => {
        // 把 `WHERE ROWNUM <= N` / `WHERE ROWNUM < N` / `WHERE ROWNUM = N` 转换为 LIMIT N
        let out = sql;
        out = out.replace(/\bWHERE\s+ROWNUM\s*<=\s*(\d+)/gi, (m, n) => `LIMIT ${n}`);
        out = out.replace(/\bWHERE\s+ROWNUM\s*<\s*(\d+)/gi, (m, n) => `LIMIT ${parseInt(n, 10) - 1}`);
        out = out.replace(/\bAND\s+ROWNUM\s*<=\s*(\d+)/gi, (m, n) => `LIMIT ${n}`);
        // 单独出现的 ROWNUM 标记注释提示
        if (/\bROWNUM\b/i.test(out)) {
            out = out.replace(/\bROWNUM\b/g, '/*ROWNUM*/ROW_NUMBER() OVER()');
        }
        return out;
    },
    limitToRownum: (sql) => {
        // 把 LIMIT N 转换为 WHERE ROWNUM <= N（仅在 SELECT 顶层，且没有已有 WHERE）
        return sql.replace(/\bLIMIT\s+(\d+)\b/gi, (m, n) => `WHERE ROWNUM <= ${n}`);
    },

    // NVL -> COALESCE / ISNULL
    nvlToCoalesce: (sql) => replaceWord(sql, 'NVL', 'COALESCE'),
    nvlToIsnull: (sql) => replaceWord(sql, 'NVL', 'ISNULL'),
    coalesceToNvl: (sql) => replaceWord(sql, 'COALESCE', 'NVL'),
    isnullToNvl: (sql) => {
        // SQL Server 用 ISNULL(a,b) 表示两参数 NVL；需要和 IS NULL 区分
        return sql.replace(/\bISNULL\s*\(/gi, 'NVL(');
    },
    isnullToCoalesce: (sql) => {
        return sql.replace(/\bISNULL\s*\(/gi, 'COALESCE(');
    },

    // sysdate -> now() / getdate()
    sysdateToNow: (sql) => sql.replace(/\bSYSDATE\b/gi, () => 'NOW()'),
    sysdateToGetdate: (sql) => sql.replace(/\bSYSDATE\b/gi, () => 'GETDATE()'),
    nowToSysdate: (sql) => sql.replace(/\bNOW\s*\(\s*\)/gi, 'SYSDATE'),
    getdateToSysdate: (sql) => sql.replace(/\bGETDATE\s*\(\s*\)/gi, 'SYSDATE'),

    // to_date / str_to_date / to_char / date_format
    toDateToStrToDate: (sql) => replaceWord(sql, 'TO_DATE', 'STR_TO_DATE'),
    toCharToDateFormat: (sql) => replaceWord(sql, 'TO_CHAR', 'DATE_FORMAT'),
    strToDateToToDate: (sql) => replaceWord(sql, 'STR_TO_DATE', 'TO_DATE'),
    dateFormatToToChar: (sql) => replaceWord(sql, 'DATE_FORMAT', 'TO_CHAR'),

    // 类型名
    varchar2ToVarchar: (sql) => replaceWord(sql, 'VARCHAR2', 'VARCHAR'),
    varcharToVarchar2: (sql) => replaceWord(sql, 'VARCHAR', 'VARCHAR2'),
    clobToText: (sql) => replaceWord(sql, 'CLOB', 'TEXT'),
    textToClob: (sql) => replaceWord(sql, 'TEXT', 'CLOB'),
    clobToNvarcharMax: (sql) => replaceWord(sql, 'CLOB', 'NVARCHAR(MAX)'),
    nvarcharMaxToClob: (sql) => replaceWord(sql, 'NVARCHAR(MAX)', 'CLOB'),
    numberToDecimal: (sql) => {
        // NUMBER / NUMBER(p) / NUMBER(p,s) -> DECIMAL(p,s) 或 DECIMAL(p)
        return sql
            .replace(/\bNUMBER\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/gi, 'DECIMAL($1,$2)')
            .replace(/\bNUMBER\s*\(\s*(\d+)\s*\)/gi, 'DECIMAL($1)');
    },
    decimalToNumber: (sql) => {
        return sql
            .replace(/\bDECIMAL\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/gi, 'NUMBER($1,$2)')
            .replace(/\bDECIMAL\s*\(\s*(\d+)\s*\)/gi, 'NUMBER($1)');
    },

    // || 字符串拼接 -> CONCAT() (MySQL)
    concatToPipe: (sql) => {
        // CONCAT(a, b, c) -> a || b || c (仅在 Oracle/PG)
        return sql.replace(/\bCONCAT\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)/gi, (m, args) => {
            // 简单按顶层逗号拆分（不支持嵌套函数参数中的逗号）
            return splitTopLevelCommas(args)
                .map((a) => a.trim())
                .join(' || ');
        });
    },
    pipeToConcat: (sql) => {
        // 简单地把 `a || b` -> `CONCAT(a, b)`（保守：仅处理简单标识符/字符串字面量）
        // 用 regex 匹配 X || Y，其中 X、Y 不包含 ||、括号、逗号
        const re = /(\w+(?:\.\w+)*|\([^()]*\)|'[^']*')\s*\|\|\s*(\w+(?:\.\w+)*|\([^()]*\)|'[^']*')/g;
        return sql.replace(re, (m, a, b) => `CONCAT(${a}, ${b})`);
    },

    // DECODE -> CASE WHEN
    decodeToCase: (sql) => {
        // DECODE(expr, k1, v1, k2, v2, default) -> CASE expr WHEN k1 THEN v1 ... ELSE default END
        const re = /\bDECODE\s*\(\s*([^,()]+(?:\([^()]*\)[^,()]*)*)\s*,([^()]*(?:\([^()]*\)[^()]*)*)\)/gi;
        return sql.replace(re, (m, expr, rest) => {
            const parts = splitTopLevelCommas(rest).map((s) => s.trim());
            if (parts.length < 2) return m;
            const exprTrim = expr.trim();
            const out = ['CASE', exprTrim];
            for (let i = 0; i + 1 < parts.length; i += 2) {
                out.push('WHEN', parts[i], 'THEN', parts[i + 1]);
            }
            if (parts.length % 2 === 1) {
                out.push('ELSE', parts[parts.length - 1]);
            }
            out.push('END');
            return out.join(' ');
        });
    },
    caseToDecode: (sql) => {
        // 简单 CASE WHEN expr THEN ... ELSE ... END -> DECODE(expr, ..., default)
        // 这里只做极简转换（不处理复杂搜索型 CASE）
        const re = /\bCASE\s+([A-Za-z_]\w*)\s+WHEN\s+([^]+?)\s+END\b/gi;
        return sql.replace(re, (m, expr, body) => {
            const parts = body.split(/\s+WHEN\s+/i);
            const flat = [];
            parts.forEach((p) => {
                const t = p.split(/\s+THEN\s+/i);
                if (t.length === 2) {
                    flat.push(t[0].trim(), t[1].trim());
                } else if (t.length === 1 && /else/i.test(t[0])) {
                    flat.push(t[0].replace(/\bELSE\s+/i, '').trim());
                }
            });
            return `DECODE(${expr}, ${flat.join(', ')})`;
        });
    },

    // BITAND -> &, BITOR -> |
    bitandToAmp: (sql) => {
        return sql.replace(
            /\bBITAND\s*\(\s*([^,()]+(?:\([^()]*\)[^,()]*)*)\s*,\s*([^()]+(?:\([^()]*\)[^()]*)*)\s*\)/gi,
            (m, a, b) => `(${a.trim()} & ${b.trim()})`
        );
    },
    bitorToPipe: (sql) => {
        return sql.replace(
            /\bBITOR\s*\(\s*([^,()]+(?:\([^()]*\)[^,()]*)*)\s*,\s*([^()]+(?:\([^()]*\)[^()]*)*)\s*\)/gi,
            (m, a, b) => `(${a.trim()} | ${b.trim()})`
        );
    },
    ampToBitand: (sql) => {
        // 简单把 `a & b` 替换为 BITAND(a, b)，但要注意 & 可能出现在其他位置
        const re = /(\w+(?:\.\w+)*|\([^()]*\))\s*&\s*(\w+(?:\.\w+)*|\([^()]*\))/g;
        return sql.replace(re, (m, a, b) => `BITAND(${a.trim()}, ${b.trim()})`);
    },

    // CONNECT BY -> WITH RECURSIVE
    connectByToRecursive: (sql) => {
        // 仅替换关键字
        return sql
            .replace(/\bCONNECT\s+BY\b/gi, '/* TODO */ -- 递归查询，请改写为 WITH RECURSIVE')
            .replace(/\bSTART\s+WITH\b/gi, '-- START WITH');
    },

    // 字符串引号转义：SQL Server 把 '' 改成 \' 之类（保守不动，只提示）
    stringEscapeSrv: (sql) => sql, // 占位：不做修改
};

// 拆分顶层逗号（不进入括号）
function splitTopLevelCommas(str) {
    const result = [];
    let depth = 0;
    let buf = '';
    let inStr = false;
    let strCh = '';
    for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (inStr) {
            buf += c;
            if (c === strCh && str[i - 1] !== '\\') inStr = false;
            continue;
        }
        if (c === "'" || c === '"') {
            inStr = true;
            strCh = c;
            buf += c;
            continue;
        }
        if (c === '(') depth++;
        if (c === ')') depth--;
        if (c === ',' && depth === 0) {
            result.push(buf);
            buf = '';
            continue;
        }
        buf += c;
    }
    if (buf.length) result.push(buf);
    return result;
}

// 方言转换矩阵：from -> to 时执行哪些函数
const CONVERSION_MATRIX = {
    mysql: {
        mysql: (sql) => sql,
        oracle: applyChain([
            'limitToRownum',
            'nowToSysdate',
            'coalesceToNvl',
            'strToDateToToDate',
            'dateFormatToToChar',
            'varcharToVarchar2',
            'clobToNvarcharMax',
            'pipeToConcat',
            'decimalToNumber',
            'caseToDecode',
        ]),
        postgresql: applyChain(['limitToRownum', 'nowToSysdate', 'clobToText', 'pipeToConcat', 'decimalToNumber']),
        sqlserver: applyChain(['limitToRownum', 'nowToGetdate', 'clobToNvarcharMax', 'pipeToConcat']),
    },
    oracle: {
        oracle: (sql) => sql,
        mysql: applyChain([
            'rownumToLimit',
            'sysdateToNow',
            'nvlToCoalesce',
            'toDateToStrToDate',
            'toCharToDateFormat',
            'varchar2ToVarchar',
            'clobToText',
            'pipeToConcat',
            'numberToDecimal',
            'decodeToCase',
        ]),
        postgresql: applyChain([
            'rownumToLimit',
            'sysdateToNow',
            'nvlToCoalesce',
            'clobToText',
            'pipeToConcat',
            'numberToDecimal',
        ]),
        sqlserver: applyChain([
            'rownumToLimit',
            'sysdateToGetdate',
            'nvlToIsnull',
            'clobToNvarcharMax',
            'numberToDecimal',
        ]),
    },
    postgresql: {
        postgresql: (sql) => sql,
        mysql: applyChain(['sysdateToNow', 'pipeToConcat']),
        oracle: applyChain(['nowToSysdate', 'coalesceToNvl']),
        sqlserver: applyChain(['nowToGetdate', 'coalesceToIsnull' /* 占位 */]),
    },
    sqlserver: {
        sqlserver: (sql) => sql,
        mysql: applyChain(['getdateToSysdate', 'sysdateToNow', 'isnullToCoalesce', 'pipeToConcat']),
        oracle: applyChain(['isnullToNvl', 'getdateToSysdate']),
        postgresql: applyChain(['getdateToSysdate']),
    },
};

function applyChain(names) {
    return (sql) => {
        let out = sql;
        names.forEach((n) => {
            if (DIALECT_FUNCTIONS[n]) out = DIALECT_FUNCTIONS[n](out);
        });
        return out;
    };
}

function sqldialectConvert() {
    const from = document.getElementById('sqldialectFrom').value;
    const to = document.getElementById('sqldialectTo').value;
    const raw = document.getElementById('sqldialectInput').value;
    const out = document.getElementById('sqldialectOutput');

    if (!raw.trim()) {
        out.textContent = '请输入 SQL';
        out.className = 'output-box error';
        return;
    }

    if (!CONVERSION_MATRIX[from] || !CONVERSION_MATRIX[from][to]) {
        out.textContent = '不支持的方言组合: ' + from + ' → ' + to;
        out.className = 'output-box error';
        return;
    }

    try {
        const fn = CONVERSION_MATRIX[from][to];
        let result = fn(raw);
        // 清理多余空行
        result = result.replace(/\n{3,}/g, '\n\n').trim();
        out.textContent = result;
        out.className = 'output-box';
        setStatus(`SQL ${from} → ${to} 转换完成`);
    } catch (e) {
        out.textContent = '转换失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function sqldialectBeautify() {
    const out = document.getElementById('sqldialectOutput');
    const raw = out.textContent || document.getElementById('sqldialectInput').value;
    if (!raw.trim()) {
        toast('没有可美化的内容');
        return;
    }
    if (typeof sqlFormatter === 'undefined') {
        toast('sql-formatter 库未加载');
        return;
    }
    try {
        const to = document.getElementById('sqldialectTo').value;
        const langMap = {mysql: 'mysql', oracle: 'plsql', postgresql: 'postgresql', sqlserver: 'tsql'};
        const formatted = sqlFormatter.format(raw, {
            language: langMap[to] || 'sql',
            indent: '  ',
            uppercase: true,
        });
        out.textContent = formatted;
        out.className = 'output-box';
        setStatus('美化完成');
    } catch (e) {
        toast('美化失败: ' + e.message);
    }
}

function sqldialectClear() {
    document.getElementById('sqldialectInput').value = '';
    document.getElementById('sqldialectOutput').textContent = '';
    setStatus('已清空');
}

function sqldialectSwap() {
    const fromEl = document.getElementById('sqldialectFrom');
    const toEl = document.getElementById('sqldialectTo');
    const tmp = fromEl.value;
    fromEl.value = toEl.value;
    toEl.value = tmp;
    setStatus('已交换方向');
}
