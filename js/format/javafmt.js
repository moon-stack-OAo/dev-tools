// ============================================================
// Java 代码格式化器(简化版美化器)
// 自实现 tokenizer + 大括号层级追踪 + import 排序 + 方法链换行 + 注解换行
// ============================================================

// ------------------------------------------------------------
// Tokenizer:扫描一段代码,识别字符串/字符/模板/注释/代码区
// 返回 [{type, text, start, end}]
// ------------------------------------------------------------
function jfTokenize(code, start, end) {
    start = start || 0;
    end = end == null ? code.length : end;
    const tokens = [];
    let i = start;
    while (i < end) {
        const c = code[i];

        if (c === '/' && code[i + 1] === '/') {
            const s = i;
            while (i < end && code[i] !== '\n') i++;
            tokens.push({ type: 'linecmt', text: code.slice(s, i), start: s, end: i });
            continue;
        }
        if (c === '/' && code[i + 1] === '*') {
            const s = i;
            i += 2;
            while (i < end) {
                if (code[i] === '*' && code[i + 1] === '/') {
                    i += 2;
                    break;
                }
                i++;
            }
            tokens.push({ type: 'blkcmt', text: code.slice(s, i), start: s, end: i });
            continue;
        }
        if (c === '"') {
            const s = i;
            i++;
            while (i < end) {
                if (code[i] === '\\') {
                    i += 2;
                    continue;
                }
                if (code[i] === '"') {
                    i++;
                    break;
                }
                if (code[i] === '\n') break;
                i++;
            }
            tokens.push({ type: 'str', text: code.slice(s, i), start: s, end: i });
            continue;
        }
        if (c === "'") {
            const s = i;
            i++;
            while (i < end) {
                if (code[i] === '\\') {
                    i += 2;
                    continue;
                }
                if (code[i] === "'") {
                    i++;
                    break;
                }
                if (code[i] === '\n') break;
                i++;
            }
            tokens.push({ type: 'char', text: code.slice(s, i), start: s, end: i });
            continue;
        }
        if (c === '`') {
            // 模板字符串,递归处理 ${} 内的代码
            const tplStart = i;
            i++;
            let fragStart = tplStart + 1;
            let broken = false;
            while (i < end) {
                if (code[i] === '`') {
                    if (i > fragStart) {
                        tokens.push({ type: 'tpl', text: code.slice(fragStart, i), start: fragStart, end: i });
                    }
                    i++;
                    broken = true;
                    break;
                }
                if (code[i] === '\\') {
                    i += 2;
                    continue;
                }
                if (code[i] === '$' && code[i + 1] === '{') {
                    if (i > fragStart) {
                        tokens.push({ type: 'tpl', text: code.slice(fragStart, i), start: fragStart, end: i });
                    }
                    tokens.push({ type: 'code', text: '${', start: i, end: i + 2 });
                    i += 2;
                    const exprStart = i;
                    let depth = 1;
                    while (i < end && depth > 0) {
                        const ch = code[i];
                        if (ch === '{') {
                            depth++;
                            i++;
                            continue;
                        }
                        if (ch === '}') {
                            depth--;
                            if (depth === 0) break;
                            i++;
                            continue;
                        }
                        if (ch === '"' || ch === "'") {
                            const q = ch;
                            i++;
                            while (i < end) {
                                if (code[i] === '\\') {
                                    i += 2;
                                    continue;
                                }
                                if (code[i] === q) {
                                    i++;
                                    break;
                                }
                                if (code[i] === '\n') break;
                                i++;
                            }
                            continue;
                        }
                        if (ch === '`') {
                            i++;
                            while (i < end && code[i] !== '`') {
                                if (code[i] === '\\') {
                                    i += 2;
                                    continue;
                                }
                                i++;
                            }
                            if (i < end) i++;
                            continue;
                        }
                        if (ch === '/' && code[i + 1] === '/') {
                            while (i < end && code[i] !== '\n') i++;
                            continue;
                        }
                        if (ch === '/' && code[i + 1] === '*') {
                            i += 2;
                            while (i < end) {
                                if (code[i] === '*' && code[i + 1] === '/') {
                                    i += 2;
                                    break;
                                }
                                i++;
                            }
                            continue;
                        }
                        i++;
                    }
                    const exprEnd = i;
                    const inner = jfTokenize(code, exprStart, exprEnd);
                    tokens.push.apply(tokens, inner);
                    tokens.push({ type: 'code', text: '}', start: exprEnd, end: exprEnd + 1 });
                    i = exprEnd + 1;
                    fragStart = i;
                    continue;
                }
                i++;
            }
            // 未闭合的模板:仍然把已扫描部分标记为 tpl,不影响后续
            if (!broken) {
                if (i > fragStart) {
                    tokens.push({ type: 'tpl', text: code.slice(fragStart, i), start: fragStart, end: i });
                }
            }
            continue;
        }

        // 普通代码段:批量收集非特殊字符
        const s = i;
        while (i < end) {
            const ch = code[i];
            if (ch === '/' && (code[i + 1] === '/' || code[i + 1] === '*')) break;
            if (ch === '"' || ch === "'" || ch === '`') break;
            i++;
        }
        tokens.push({ type: 'code', text: code.slice(s, i), start: s, end: i });
    }
    return tokens;
}

// 扫描一行内的代码大括号,返回数组 [{type:'open'|'close', pos}]
function jfScanBraces(line) {
    const tokens = jfTokenize(line);
    const out = [];
    for (let ti = 0; ti < tokens.length; ti++) {
        const t = tokens[ti];
        if (t.type !== 'code') continue;
        for (let i = 0; i < t.text.length; i++) {
            if (t.text[i] === '{') out.push({ type: 'open', pos: t.start + i });
            else if (t.text[i] === '}') out.push({ type: 'close', pos: t.start + i });
        }
    }
    return out;
}

// ------------------------------------------------------------
// 大括号预处理:K&R / Allman 决定 `{` 与 `}` 的换行规则
// - K&R : 每个 `{` 后面强制换行(让 `{` 留在上一行尾),
//         每个 `}` 前面强制换行(让 `}` 独占下一行首)
// - Allman: K&R 规则 + 每个 `{` 前面也强制换行
// ------------------------------------------------------------
function jfPreprocessBraces(text, braceStyle) {
    const tokens = jfTokenize(text);
    const buf = [];
    let cursor = 0;
    const len = text.length;

    function pushTo(upto) {
        if (upto > cursor) {
            buf.push(text.slice(cursor, upto));
            cursor = upto;
        }
    }

    function prevSig(pos) {
        let p = pos - 1;
        while (p >= 0 && text[p] !== '\n' && /\s/.test(text[p])) p--;
        if (p < 0) return '';
        return text[p];
    }

    function nextSig(pos) {
        let n = pos + 1;
        while (n < len && text[n] !== '\n' && /\s/.test(text[n])) n++;
        if (n >= len) return '';
        return text[n];
    }

    for (let ti = 0; ti < tokens.length; ti++) {
        const t = tokens[ti];
        if (t.type !== 'code') {
            pushTo(t.start);
            buf.push(t.text);
            cursor = t.end;
            continue;
        }
        for (let i = 0; i < t.text.length; i++) {
            const c = t.text[i];
            if (c !== '{' && c !== '}') continue;
            const absPos = t.start + i;

            if (c === '{') {
                if (braceStyle === 'allman') {
                    const prev = prevSig(absPos);
                    if (prev && prev !== '\n') {
                        pushTo(absPos);
                        buf.push('\n');
                    }
                }
                pushTo(absPos + 1);
                const next = nextSig(absPos);
                if (next && next !== '\n') {
                    buf.push('\n');
                }
            } else {
                const prev = prevSig(absPos);
                const next = nextSig(absPos);
                // 跳过条件:前一位是 `{`(空块) 或 后一位是字母(可能跟 else/while/catch 等关键字)
                const isEmpty = prev === '{';
                const isLeadingKeyword = next && /[A-Za-z_]/.test(next);
                if (prev && prev !== '\n' && !isEmpty && !isLeadingKeyword) {
                    pushTo(absPos);
                    buf.push('\n');
                }
                pushTo(absPos + 1);
            }
        }
        pushTo(t.end);
    }
    return buf.join('');
}

// ------------------------------------------------------------
// import 排序分组:java.* / javax.* / 其它(按字母序)
// ------------------------------------------------------------
function jfSortImportBlock(text) {
    const lines = text.split('\n');
    const result = [];
    let i = 0;
    while (i < lines.length) {
        if (/^\s*import\s+/.test(lines[i])) {
            const blockLines = [];
            while (i < lines.length && /^\s*import\s+/.test(lines[i])) {
                blockLines.push(lines[i].trim());
                i++;
            }
            const groups = { java: [], javax: [], other: [] };
            for (const imp of blockLines) {
                const m = imp.match(/^import\s+(.+?);$/);
                if (!m) {
                    groups.other.push(imp);
                    continue;
                }
                const fqcn = m[1].trim().replace(/^static\s+/, '');
                if (fqcn.startsWith('javax.')) groups.javax.push(imp);
                else if (fqcn.startsWith('java.')) groups.java.push(imp);
                else groups.other.push(imp);
            }
            groups.java.sort();
            groups.javax.sort();
            groups.other.sort();
            const emitted = [];
            if (groups.java.length) emitted.push.apply(emitted, groups.java);
            if (groups.javax.length) {
                if (emitted.length) emitted.push('');
                emitted.push.apply(emitted, groups.javax);
            }
            if (groups.other.length) {
                if (emitted.length) emitted.push('');
                emitted.push.apply(emitted, groups.other);
            }
            result.push.apply(result, emitted);
        } else {
            result.push(lines[i]);
            i++;
        }
    }
    return result.join('\n');
}

// ------------------------------------------------------------
// 注解换行:一行 ≥ 3 个 @xxx 触发,每个注解独占一行
// ------------------------------------------------------------
function jfAnnotationBreakLine(line) {
    const tokens = jfTokenize(line);
    const annots = [];
    for (const t of tokens) {
        if (t.type !== 'code') continue;
        for (let i = 0; i < t.text.length; i++) {
            if (t.text[i] !== '@') continue;
            const prev = i > 0 ? t.text[i - 1] : '';
            if (prev !== '' && !/[\s,;(]/.test(prev)) continue;
            let j = i + 1;
            while (j < t.text.length && /[\w.]/.test(t.text[j])) j++;
            if (j === i + 1) continue;
            annots.push({ atPos: t.start + i, idEnd: t.start + j });
        }
    }
    if (annots.length < 3) return [line];

    const expanded = annots.map((a) => {
        let e = a.idEnd;
        while (e < line.length && /\s/.test(line[e])) e++;
        if (line[e] === '(') {
            let depth = 1;
            let k = e + 1;
            while (k < line.length && depth > 0) {
                const c = line[k];
                if (c === '(' || c === '[' || c === '{') depth++;
                else if (c === ')' || c === ']' || c === '}') depth--;
                else if (c === '"' || c === "'") {
                    const q = c;
                    k++;
                    while (k < line.length && line[k] !== q) {
                        if (line[k] === '\\') k++;
                        k++;
                    }
                    continue;
                }
                k++;
            }
            e = k;
        }
        return { start: a.atPos, end: e };
    });

    const out = [];
    const prefix = line.slice(0, annots[0].atPos).replace(/\s+$/, '');
    if (prefix) out.push(prefix);
    for (const x of expanded) {
        const seg = line.slice(x.start, x.end).replace(/\s+$/, '');
        if (seg) out.push(seg);
    }
    const suffix = line.slice(expanded[expanded.length - 1].end);
    if (suffix.trim()) out.push(suffix.replace(/^\s+/, ''));
    return out;
}

function jfAnnotationBreakTransform(text) {
    const lines = text.split('\n');
    const out = [];
    for (const ln of lines) {
        const split = jfAnnotationBreakLine(ln);
        for (const s of split) out.push(s);
    }
    return out.join('\n');
}

// ------------------------------------------------------------
// 方法链换行:链式 .method(...) 调用每行一个
// ------------------------------------------------------------
function jfChainBreakLine(line) {
    const tokens = jfTokenize(line);
    const positions = [];
    for (const t of tokens) {
        if (t.type !== 'code') continue;
        for (let i = 0; i < t.text.length; i++) {
            if (t.text[i] !== '.') continue;
            const prev = i > 0 ? t.text[i - 1] : '';
            if (prev === '' || /[\s([{,;:]/.test(prev)) continue;
            let j = i + 1;
            while (j < t.text.length && /[\w]/.test(t.text[j])) j++;
            if (j === i + 1) continue;
            let k = j;
            while (k < t.text.length && /\s/.test(t.text[k])) k++;
            if (line[t.start + k] !== '(') continue;
            positions.push({ dotPos: t.start + i, idEnd: t.start + j });
        }
    }
    if (positions.length < 2) return [line];

    const segments = positions.map((p) => {
        let e = p.idEnd;
        while (e < line.length && /\s/.test(line[e])) e++;
        if (line[e] === '(') {
            let depth = 1;
            let k = e + 1;
            while (k < line.length && depth > 0) {
                const c = line[k];
                if (c === '(' || c === '[' || c === '{') depth++;
                else if (c === ')' || c === ']' || c === '}') depth--;
                else if (c === '"' || c === "'") {
                    const q = c;
                    k++;
                    while (k < line.length && line[k] !== q) {
                        if (line[k] === '\\') k++;
                        k++;
                    }
                    continue;
                }
                k++;
            }
            e = k;
        }
        return { start: p.dotPos, end: e };
    });

    const out = [];
    const prefix = line.slice(0, positions[0].dotPos).replace(/\s+$/, '');
    if (prefix) out.push(prefix);
    const lastSegIdx = segments.length - 1;
    for (let i = 0; i < segments.length; i++) {
        let seg = line.slice(segments[i].start, segments[i].end);
        // 将尾缀(如 `;`)直接附加到最后一段
        if (i === lastSegIdx) {
            const suffix = line.slice(segments[i].end);
            seg += suffix;
        }
        seg = seg.replace(/\s+$/, '');
        if (seg) out.push(seg);
    }
    return out;
}

function jfChainBreakTransform(text) {
    const lines = text.split('\n');
    const out = [];
    for (const ln of lines) {
        const split = jfChainBreakLine(ln);
        for (const s of split) out.push(s);
    }
    return out.join('\n');
}

// ------------------------------------------------------------
// 缩进格式化主体:按行扫描,根据大括号层级在行首插入缩进
// 输入应已由 jfPreprocessBraces 完成 `{` / `}` 换行准备
// ------------------------------------------------------------
function jfReindent(text, indentStr) {
    const lines = text.split('\n');
    const out = [];
    let depth = 0;
    for (let li = 0; li < lines.length; li++) {
        const trimmed = lines[li].replace(/\s+$/, '');
        if (!trimmed.trim()) {
            out.push('');
            continue;
        }
        const braces = jfScanBraces(trimmed);
        let oc = 0;
        let cc = 0;
        for (const b of braces) {
            if (b.type === 'open') oc++;
            else cc++;
        }
        const startsClose = braces.length > 0 && braces[0].type === 'close';

        let lineDepth = depth;
        if (startsClose) lineDepth = depth - 1;

        out.push(indentStr.repeat(Math.max(lineDepth, 0)) + trimmed.trim());

        depth = Math.max(0, depth + (oc - cc));
    }
    return out.join('\n');
}

// ------------------------------------------------------------
// 压缩模式
// ------------------------------------------------------------
function jfCompressLine(line) {
    const tokens = jfTokenize(line);
    let s = '';
    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        if (t.type === 'code') {
            // 去除代码段内连续空白
            s += t.text.replace(/\s+/g, '');
        } else {
            s += t.text;
        }
    }
    return s;
}

function jfCompressJava(code) {
    const text = (code || '').replace(/\r\n?/g, '\n');
    const lines = text.split('\n');
    const out = [];
    for (const raw of lines) {
        const trimmed = raw.trim();
        if (!trimmed) continue;
        out.push(jfCompressLine(trimmed));
    }
    return out.join('');
}

// ------------------------------------------------------------
// 主入口:formatJava(code, opts)
// ------------------------------------------------------------
function formatJava(code, opts) {
    opts = opts || {};
    const indentStr = opts.indent != null ? opts.indent : '    ';
    const braceStyle = opts.brace || 'kr';

    if (code == null) return '';
    const raw = String(code);
    if (!raw.trim()) return raw;

    if (opts.compress) {
        return jfCompressJava(raw);
    }

    let text = raw.replace(/\r\n?/g, '\n');

    if (opts.sortImports) text = jfSortImportBlock(text);
    if (opts.annotationBreak) text = jfAnnotationBreakTransform(text);
    if (opts.chainBreak) text = jfChainBreakTransform(text);

    text = jfPreprocessBraces(text, braceStyle);
    return jfReindent(text, indentStr);
}

// ============================================================
// UI 部分
// ============================================================

const _JF_SAMPLE =
    'package com.example;\n' +
    'import java.util.*;\n' +
    'import javax.annotation.Nullable;\n' +
    'import static java.util.stream.Collectors.toList;\n' +
    'import com.example.repo.UserRepo;\n' +
    '\n' +
    'class ActiveUserService {\n' +
    '    @Override @Deprecated @SuppressWarnings("all") public List<String> activeNames(long uid) {\n' +
    '        User u = repo.find(uid);\n' +
    '        if (u == null) return Collections.emptyList();\n' +
    '        return u.getRoles().stream().filter(r -> r.isActive()).map(r -> r.getName()).collect(toList());\n' +
    '    }\n' +
    '}\n' +
    '\n' +
    'class Inner {\n' +
    '    void m() {\n' +
    '        String s = "hello{world}";\n' +
    '        if (true) {\n' +
    '            System.out.println("brace inside string {" + s + "}");\n' +
    '        }\n' +
    '    }\n' +
    '}\n';

function jfGetOpts() {
    return {
        indent: document.getElementById('jfIndent').value,
        brace: document.getElementById('jfBrace').value,
        sortImports: document.getElementById('jfSortImports').checked,
        chainBreak: document.getElementById('jfChainBreak').checked,
        annotationBreak: document.getElementById('jfAnnotationBreak').checked,
    };
}

function jfFormat() {
    const input = document.getElementById('jfInput').value;
    const output = document.getElementById('jfOutput');
    if (!input.trim()) {
        output.value = '';
        setStatus('请输入 Java 代码');
        return;
    }
    try {
        const opts = jfGetOpts();
        opts.compress = false;
        output.value = formatJava(input, opts);
        setStatus('格式化完成');
    } catch (e) {
        output.value = '格式化失败: ' + e.message;
        setStatus('错误');
    }
}

function jfDoCompress() {
    const input = document.getElementById('jfInput').value;
    const output = document.getElementById('jfOutput');
    if (!input.trim()) {
        output.value = '';
        setStatus('请输入 Java 代码');
        return;
    }
    try {
        output.value = formatJava(input, { compress: true });
        setStatus('压缩完成');
    } catch (e) {
        output.value = '压缩失败: ' + e.message;
        setStatus('错误');
    }
}

function jfCopy() {
    const output = document.getElementById('jfOutput');
    if (!output.value) {
        toast('没有输出可复制');
        return;
    }
    copyText('jfOutput');
}

function jfClear() {
    document.getElementById('jfInput').value = '';
    document.getElementById('jfOutput').value = '';
    setStatus('已清空');
}

function jfLoadSample() {
    document.getElementById('jfInput').value = _JF_SAMPLE;
    setStatus('已加载示例');
}

function jfInit() {
    // 首次打开时绑定示例(仅一次)
    const input = document.getElementById('jfInput');
    const output = document.getElementById('jfOutput');
    if (!input.value) input.value = _JF_SAMPLE;
    if (input.value && !output.value) {
        try {
            output.value = formatJava(input.value, jfGetOpts());
        } catch (e) {
            /* 静默 */
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { formatJava };
}

if (typeof registerInit === 'function') {
    registerInit('javafmt', jfInit);
}
