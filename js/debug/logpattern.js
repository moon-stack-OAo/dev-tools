// Logback / Log4j Pattern 解析与速查

const LOG_PATTERN_WORDS = {
    d: { name: '日期时间', desc: '日期，可用 %d{yyyy-MM-dd HH:mm:ss.SSS} 指定格式', aliases: ['date'] },
    date: { name: '日期时间', desc: '同 %d', aliases: ['d'] },
    t: { name: '线程名', desc: '输出线程名', aliases: ['thread'] },
    thread: { name: '线程名', desc: '同 %t', aliases: ['t'] },
    p: { name: '日志级别', desc: '级别：TRACE/DEBUG/INFO/WARN/ERROR', aliases: ['level', 'le'] },
    le: { name: '日志级别', desc: '同 %p / %level', aliases: ['p', 'level'] },
    level: { name: '日志级别', desc: '同 %p', aliases: ['p', 'le'] },
    c: { name: 'Logger 名', desc: 'Logger 名称，%c{1} 可截断包名', aliases: ['logger', 'lo'] },
    lo: { name: 'Logger 名', desc: '同 %c / %logger', aliases: ['c', 'logger'] },
    logger: { name: 'Logger 名', desc: '同 %c', aliases: ['c', 'lo'] },
    C: { name: '调用者类名', desc: '调用 logger 的类（有性能开销）', aliases: ['class'] },
    class: { name: '调用者类名', desc: '同 %C', aliases: ['C'] },
    M: { name: '方法名', desc: '调用方法名（有性能开销）', aliases: ['method'] },
    method: { name: '方法名', desc: '同 %M', aliases: ['M'] },
    L: { name: '行号', desc: '源码行号（有性能开销）', aliases: ['line'] },
    line: { name: '行号', desc: '同 %L', aliases: ['L'] },
    F: { name: '文件名', desc: '源文件名（有性能开销）', aliases: ['file'] },
    file: { name: '文件名', desc: '同 %F', aliases: ['F'] },
    m: { name: '消息', desc: '日志消息正文', aliases: ['msg', 'message'] },
    msg: { name: '消息', desc: '同 %m', aliases: ['m', 'message'] },
    message: { name: '消息', desc: '同 %m', aliases: ['m', 'msg'] },
    n: { name: '换行', desc: '平台相关换行符', aliases: [] },
    ex: { name: '异常堆栈', desc: '异常完整堆栈，%ex{full} / %ex{short}', aliases: ['exception', 'throwable', 'rEx'] },
    exception: { name: '异常堆栈', desc: '同 %ex', aliases: ['ex', 'throwable'] },
    throwable: { name: '异常堆栈', desc: '同 %ex', aliases: ['ex', 'exception'] },
    rEx: { name: '异常堆栈', desc: 'root 异常（Logback）', aliases: ['ex'] },
    x: { name: 'MDC', desc: 'MDC 键值，%X{userId} 或 %X 输出全部', aliases: ['X', 'mdc'] },
    X: { name: 'MDC', desc: '同 %x / %mdc', aliases: ['x', 'mdc'] },
    mdc: { name: 'MDC', desc: '同 %X', aliases: ['X', 'x'] },
    marker: { name: 'Marker', desc: 'SLF4J Marker', aliases: [] },
    replace: { name: '替换', desc: '%replace(p){\'regex\',\'replacement\'}', aliases: [] },
    highlight: { name: '高亮', desc: '按级别着色（Logback 控制台）', aliases: [] },
    color: { name: '颜色', desc: '%green / %red 等颜色修饰（Logback）', aliases: [] },
    cyan: { name: '颜色-青', desc: '控制台青色', aliases: [] },
    green: { name: '颜色-绿', desc: '控制台绿色', aliases: [] },
    red: { name: '颜色-红', desc: '控制台红色', aliases: [] },
    yellow: { name: '颜色-黄', desc: '控制台黄色', aliases: [] },
    blue: { name: '颜色-蓝', desc: '控制台蓝色', aliases: [] },
    magenta: { name: '颜色-品红', desc: '控制台品红', aliases: [] },
    bold: { name: '加粗', desc: '粗体修饰', aliases: [] },
    r: { name: '相对时间', desc: '自 JVM 启动的毫秒数', aliases: ['relative'] },
    relative: { name: '相对时间', desc: '同 %r', aliases: ['r'] },
    sn: { name: '序列号', desc: '日志事件序号', aliases: ['sequenceNumber'] },
    sequenceNumber: { name: '序列号', desc: '同 %sn', aliases: ['sn'] },
    nopex: { name: '无异常', desc: '不输出异常（配合 %msg）', aliases: ['nopexception'] },
    nopexception: { name: '无异常', desc: '同 %nopex', aliases: ['nopex'] },
    property: { name: '属性', desc: '%property{key} 读 context/system 属性', aliases: [] },
    contextName: { name: '上下文名', desc: 'LoggerContext 名称', aliases: ['cn'] },
    cn: { name: '上下文名', desc: '同 %contextName', aliases: ['contextName'] },
    caller: { name: '调用栈', desc: '调用者位置信息', aliases: [] },
    wEx: { name: '包装异常', desc: '含 packing 数据的异常', aliases: [] },
    kvp: { name: '键值对', desc: '结构化 key-value（Logback 1.3+）', aliases: [] },
    prefix: { name: '前缀', desc: '嵌套复合转换的前缀', aliases: [] },
};

const LOG_PATTERN_TEMPLATES = [
    {
        id: 'default',
        name: '默认控制台',
        pattern: '%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n',
        desc: '时间 + 线程 + 级别 + Logger + 消息',
    },
    {
        id: 'color',
        name: '彩色控制台',
        pattern: '%d{HH:mm:ss.SSS} %highlight(%-5level) [%thread] %cyan(%logger{36}) - %msg%n',
        desc: '级别高亮、Logger 青色',
    },
    {
        id: 'simple',
        name: '精简',
        pattern: '%-5level %logger{20} - %msg%n',
        desc: '仅级别、Logger 与消息',
    },
    {
        id: 'mdc',
        name: '含 MDC/Trace',
        pattern: '%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{36} traceId=%X{traceId} - %msg%n',
        desc: '附带 MDC 中的 traceId',
    },
    {
        id: 'json-style',
        name: 'JSON 风格说明',
        pattern: '{"ts":"%d{yyyy-MM-dd\'T\'HH:mm:ss.SSSX}","level":"%level","logger":"%logger","thread":"%thread","msg":"%msg"}%n',
        desc: '伪 JSON 行（生产建议用 logstash-logback-encoder）',
    },
    {
        id: 'file',
        name: '文件滚动',
        pattern: '%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{50} - %msg%n',
        desc: '适合 RollingFileAppender',
    },
];

/**
 * 解析 Logback/Log4j pattern 字符串
 * @param {string} pattern
 * @returns {Array<{raw:string, type:string, word?:string, name?:string, desc?:string, options?:string, format?:string, literal?:string}>}
 */
function parseLogPattern(pattern) {
    if (pattern == null) return [];
    const s = String(pattern);
    if (!s) return [];

    const tokens = [];
    let i = 0;
    let literal = '';

    function flushLiteral() {
        if (literal) {
            tokens.push({ raw: literal, type: 'literal', literal: literal });
            literal = '';
        }
    }

    while (i < s.length) {
        if (s[i] === '%' && i + 1 < s.length) {
            // %% → 字面 %
            if (s[i + 1] === '%') {
                flushLiteral();
                tokens.push({ raw: '%%', type: 'literal', literal: '%' });
                i += 2;
                continue;
            }
            flushLiteral();
            const start = i;
            i++; // skip %

            // 可选修饰：- 左对齐、. 截断、数字宽度
            let options = '';
            while (i < s.length && /[-.0-9]/.test(s[i])) {
                options += s[i];
                i++;
            }

            // conversion word：字母开头，可含字母
            if (i >= s.length || !/[a-zA-Z]/.test(s[i])) {
                literal += s.slice(start, i);
                continue;
            }
            let word = '';
            while (i < s.length && /[a-zA-Z]/.test(s[i])) {
                word += s[i];
                i++;
            }

            // 可选 {format} 或 (nested)
            let format = '';
            if (i < s.length && s[i] === '{') {
                let depth = 1;
                i++;
                const fStart = i;
                while (i < s.length && depth > 0) {
                    if (s[i] === '{') depth++;
                    else if (s[i] === '}') depth--;
                    if (depth > 0) i++;
                    else break;
                }
                format = s.slice(fStart, i);
                if (i < s.length && s[i] === '}') i++;
            } else if (i < s.length && s[i] === '(') {
                // 复合转换如 %highlight(...)
                let depth = 1;
                i++;
                const nStart = i;
                while (i < s.length && depth > 0) {
                    if (s[i] === '(') depth++;
                    else if (s[i] === ')') depth--;
                    if (depth > 0) i++;
                    else break;
                }
                format = s.slice(nStart, i);
                if (i < s.length && s[i] === ')') i++;
                // 嵌套内容再解析
                const nested = parseLogPattern(format);
                const info = LOG_PATTERN_WORDS[word] || { name: '未知/自定义', desc: '未收录的 conversion word' };
                tokens.push({
                    raw: s.slice(start, i),
                    type: 'conversion',
                    word: word,
                    name: info.name,
                    desc: info.desc,
                    options: options || undefined,
                    format: format || undefined,
                    nested: nested,
                });
                continue;
            }

            const info = LOG_PATTERN_WORDS[word] || { name: '未知/自定义', desc: '未收录的 conversion word' };
            tokens.push({
                raw: s.slice(start, i),
                type: 'conversion',
                word: word,
                name: info.name,
                desc: info.desc,
                options: options || undefined,
                format: format || undefined,
            });
        } else {
            literal += s[i];
            i++;
        }
    }
    flushLiteral();
    return tokens;
}

function logpatternListWords() {
    const seen = Object.create(null);
    const list = [];
    Object.keys(LOG_PATTERN_WORDS).forEach(function (k) {
        const w = LOG_PATTERN_WORDS[k];
        if (seen[w.name]) return;
        seen[w.name] = true;
        list.push({ word: '%' + k, name: w.name, desc: w.desc });
    });
    return list;
}

// === UI ===

function logpatternParse() {
    const input = document.getElementById('logpatternInput').value;
    const out = document.getElementById('logpatternOutput');
    if (!input.trim()) {
        out.textContent = '请输入 pattern 字符串';
        out.className = 'output-box error';
        return;
    }
    const tokens = parseLogPattern(input);
    const lines = [];
    lines.push('共 ' + tokens.length + ' 个 token：');
    lines.push('');
    tokens.forEach(function (t, idx) {
        if (t.type === 'literal') {
            lines.push((idx + 1) + '. [字面量] ' + JSON.stringify(t.literal));
        } else {
            lines.push((idx + 1) + '. [转换] ' + t.raw);
            lines.push('   word : %' + t.word);
            lines.push('   名称 : ' + t.name);
            lines.push('   说明 : ' + t.desc);
            if (t.options) lines.push('   修饰 : ' + t.options);
            if (t.format) lines.push('   参数 : ' + t.format);
            if (t.nested && t.nested.length) {
                lines.push('   嵌套 : ' + t.nested.map(function (n) {
                    return n.type === 'conversion' ? n.raw : JSON.stringify(n.literal || '');
                }).join(' '));
            }
        }
    });
    out.textContent = lines.join('\n');
    out.className = 'output-box';
    if (typeof setStatus === 'function') setStatus('Pattern 解析完成');
}

function logpatternApplyTemplate(id) {
    const tpl = LOG_PATTERN_TEMPLATES.find(function (t) {
        return t.id === id;
    });
    if (!tpl) return;
    document.getElementById('logpatternInput').value = tpl.pattern;
    logpatternParse();
}

function logpatternLoadSample() {
    logpatternApplyTemplate('default');
}

function logpatternClear() {
    document.getElementById('logpatternInput').value = '';
    document.getElementById('logpatternOutput').textContent = '';
    document.getElementById('logpatternOutput').className = 'output-box';
    if (typeof setStatus === 'function') setStatus('已清空');
}

function logpatternRenderTemplates() {
    const el = document.getElementById('logpatternTemplates');
    if (!el) return;
    el.innerHTML = LOG_PATTERN_TEMPLATES.map(function (t) {
        return (
            '<button class="outline" style="margin:2px" onclick="logpatternApplyTemplate(\'' +
            t.id +
            '\')" title="' +
            (typeof escapeHtml === 'function' ? escapeHtml(t.desc) : t.desc) +
            '">' +
            t.name +
            '</button>'
        );
    }).join('');
}

function logpatternRenderWordTable() {
    const el = document.getElementById('logpatternWords');
    if (!el) return;
    const list = logpatternListWords();
    const rows = list
        .map(function (w) {
            return (
                '<tr><td style="padding:4px 8px;border-bottom:1px solid var(--border)"><code>' +
                w.word +
                '</code></td><td style="padding:4px 8px;border-bottom:1px solid var(--border)">' +
                w.name +
                '</td><td style="padding:4px 8px;border-bottom:1px solid var(--border);color:var(--text-dim)">' +
                w.desc +
                '</td></tr>'
            );
        })
        .join('');
    el.innerHTML =
        '<table style="width:100%;font-size:12px;border-collapse:collapse"><thead><tr>' +
        '<th style="text-align:left;padding:4px 8px">Word</th>' +
        '<th style="text-align:left;padding:4px 8px">名称</th>' +
        '<th style="text-align:left;padding:4px 8px">说明</th>' +
        '</tr></thead><tbody>' +
        rows +
        '</tbody></table>';
}

if (typeof registerInit === 'function') {
    registerInit('logpattern', function () {
        logpatternRenderTemplates();
        logpatternRenderWordTable();
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseLogPattern: parseLogPattern,
        logpatternListWords: logpatternListWords,
        LOG_PATTERN_WORDS: LOG_PATTERN_WORDS,
        LOG_PATTERN_TEMPLATES: LOG_PATTERN_TEMPLATES,
    };
}
