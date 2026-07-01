// ============================================================
// Nginx 配置格式化 / 压缩 / Lint
//   - 自实现字符级 tokenizer（字符串 / 注释）
//   - AST 解析 + 递归块嵌套
//   - 格式化：每指令一行，K&R 大括号风格
//   - 压缩：去除多余空白 / 注释，保留结构
//   - Lint：重复指令（include/access_log 豁免） / 缺失分号 / 不平衡大括号
// ============================================================

// 允许重复出现的指令（不视为错误）
//   - include / access_log / error_log / set / add_header / proxy_set_header 等业务指令
//   - 顶层 / 多路由类块指令天然允许多个：server / upstream / map / geo / if / limit_except / types
//   - 注意：location 不在豁免列表，同一 server 内多个 location 路径重复会被识别
const _NFM_DUP_ALLOW = new Set([
    'include',
    'access_log',
    'error_log',
    'set',
    'add_header',
    'proxy_set_header',
    'fastcgi_param',
    'expires',
    'rewrite',
    'try_files',
    'server',
    'upstream',
    'map',
    'geo',
    'if',
    'limit_except',
    'types',
]);

// -----------------------------------------------------------
// 字符串扫描：从开引号位置开始，返回闭合后的位置（含闭合引号）
//   起点必须是 " 或 '；否则原样返回 start+1
//   支持 \" \' \\ 反斜杠转义
// -----------------------------------------------------------
function _nfmSkipString(text, start) {
    const q = text[start];
    if (q !== '"' && q !== "'") return start + 1;
    let i = start + 1;
    const n = text.length;
    while (i < n) {
        const ch = text[i];
        if (ch === '\\' && i + 1 < n) {
            i += 2;
            continue;
        }
        if (ch === q) return i + 1;
        i++;
    }
    return n;
}

// -----------------------------------------------------------
// 查找行内 # 注释起点（忽略字符串内的 #）
//   返回注释 col（1-based），无注释返回 -1
// -----------------------------------------------------------
function _nfmFindCommentCol(line) {
    let i = 0;
    const n = line.length;
    while (i < n) {
        const c = line[i];
        if (c === '"' || c === "'") {
            i = _nfmSkipString(line, i);
            continue;
        }
        if (c === '#') return i + 1;
        i++;
    }
    return -1;
}

// -----------------------------------------------------------
// 把行按"注释"切分：[codePart, commentPart]
//   commentPart 可能为 null
//   字符串内的 # 不算注释起点
// -----------------------------------------------------------
function _nfmSplitComment(line) {
    const col = _nfmFindCommentCol(line);
    if (col < 0) return { code: line, comment: null };
    const code = line.slice(0, col - 1);
    const comment = line.slice(col - 1);
    return { code: code, comment: comment };
}

// -----------------------------------------------------------
// 按"逻辑行"切分输入：支持 ' 行尾续行
//   返回 [{line: 已拼接的多行内容, startLine: 起始源行号}]
//   注释保留在原位置（拼接结果的最末行）
// -----------------------------------------------------------
function _nfmJoinBackslashLines(text) {
    const srcLines = String(text || '').split(/\r?\n/);
    const out = [];
    let buf = '';
    let bufStart = 1;
    for (let i = 0; i < srcLines.length; i++) {
        const ln = srcLines[i];
        if (buf === '') bufStart = i + 1;
        if (buf !== '') buf += ' ';
        buf += ln;
        // 检查 buf 末尾是否为反斜杠续行
        let end = buf.length;
        while (end > 0 && (buf[end - 1] === ' ' || buf[end - 1] === '\t')) end--;
        if (end > 0 && buf[end - 1] === '\\') {
            // 续行：去掉末尾反斜杠和空白，继续累积
            let cut = end - 1;
            while (cut > 0 && (buf[cut - 1] === ' ' || buf[cut - 1] === '\t')) cut--;
            buf = buf.slice(0, cut);
            continue;
        }
        out.push({ line: buf, startLine: bufStart });
        buf = '';
    }
    if (buf !== '') out.push({ line: buf, startLine: bufStart });
    return out;
}

// -----------------------------------------------------------
// 把每条逻辑行切分为 token 序列
//   支持：
//     - 空格分隔的多个参数
//     - "..." 与 '...'（保留原样字符串）
//     - ';' 作为指令结束符
//     - '{' 作为块开始
//     - '}' 作为块结束
//   返回 [{type, text, startCol}]
// -----------------------------------------------------------
function _nfmTokenizeLine(line) {
    const tokens = [];
    let i = 0;
    const n = line.length;

    // 跳过前导空白
    while (i < n && (line[i] === ' ' || line[i] === '\t')) i++;
    // 注释行整行作为 comment token
    if (i < n && line[i] === '#') {
        tokens.push({ type: 'comment', text: line.slice(i), startCol: i + 1 });
        return tokens;
    }

    while (i < n) {
        const c = line[i];
        if (c === ' ' || c === '\t') {
            i++;
            continue;
        }
        if (c === '#') {
            tokens.push({ type: 'comment', text: line.slice(i), startCol: i + 1 });
            return tokens;
        }
        if (c === '"' || c === "'") {
            const end = _nfmSkipString(line, i);
            tokens.push({ type: 'arg', text: line.slice(i, end), startCol: i + 1 });
            i = end;
            continue;
        }
        if (c === ';') {
            tokens.push({ type: 'semi', text: ';', startCol: i + 1 });
            i++;
            continue;
        }
        if (c === '{') {
            tokens.push({ type: 'open', text: '{', startCol: i + 1 });
            i++;
            continue;
        }
        if (c === '}') {
            tokens.push({ type: 'close', text: '}', startCol: i + 1 });
            i++;
            continue;
        }
        // 普通参数 / directive 起始
        const start = i;
        while (
            i < n &&
            line[i] !== ' ' &&
            line[i] !== '\t' &&
            line[i] !== ';' &&
            line[i] !== '{' &&
            line[i] !== '}' &&
            line[i] !== '#'
        ) {
            if (line[i] === '"' || line[i] === "'") {
                const end = _nfmSkipString(line, i);
                i = end;
                continue;
            }
            i++;
        }
        const txt = line.slice(start, i);
        if (!txt) {
            i++;
            continue;
        }
        tokens.push({ type: 'arg', text: txt, startCol: start + 1 });
    }
    return tokens;
}

// -----------------------------------------------------------
// 解析入口：返回 AST
//   ast = [{
//     _isComment: true, _text, _line, _col
//     或
//     directive, args[], value, isBlock, blockKind,
//     line, col, trailingComment, children[]
//   }]
// -----------------------------------------------------------
function parseNginx(text) {
    const logicalLines = _nfmJoinBackslashLines(text);
    const items = [];
    const stack = [{ _nodes: items }];
    let lastLine = 1;

    for (let li = 0; li < logicalLines.length; li++) {
        const { line, startLine } = logicalLines[li];
        const tokens = _nfmTokenizeLine(line);
        lastLine = startLine;
        if (tokens.length === 0) continue;

        // 整行注释
        if (tokens.length === 1 && tokens[0].type === 'comment') {
            const top = stack[stack.length - 1];
            top._nodes.push({
                _isComment: true,
                _text: tokens[0].text,
                _line: startLine,
                _col: tokens[0].startCol,
            });
            continue;
        }

        // 一行内可能多条 directive（用 ; 分隔）；} 用于弹栈
        let idx = 0;
        let pendingComment = null; // 形如 "; # xxx" 时挂到上一条 directive
        while (idx < tokens.length) {
            const tk = tokens[idx];
            // 行首孤立 } 直接弹栈
            if (tk.type === 'close') {
                if (stack.length > 1) stack.pop();
                idx++;
                continue;
            }
            // 行首孤立注释也跳过
            if (tk.type === 'comment') {
                pendingComment = tk;
                idx++;
                // 如果后面是 } 等结构，注释已挂上后续 directive；否则跳出本轮
                if (idx < tokens.length && tokens[idx].type !== 'close') break;
                continue;
            }
            if (tk.type === 'semi') {
                // 不应该出现孤立 ;，跳过
                idx++;
                continue;
            }

            // 解析一条 directive
            let directive = null;
            const args = [];
            let directiveCol = -1;
            let braceCol = -1;
            let trailingComment = pendingComment;
            let hadSemi = false;
            pendingComment = null;

            while (idx < tokens.length) {
                const t = tokens[idx];
                if (t.type === 'close') {
                    // inline }：结束本 directive 后弹栈
                    break;
                }
                if (t.type === 'comment') {
                    trailingComment = t;
                    idx++;
                    break;
                }
                if (!directive) {
                    directive = t.text;
                    directiveCol = t.startCol;
                    idx++;
                    continue;
                }
                if (t.type === 'semi') {
                    hadSemi = true;
                    idx++;
                    // 之后可能还有 trailing comment
                    if (idx < tokens.length && tokens[idx].type === 'comment') {
                        trailingComment = tokens[idx];
                        idx++;
                    }
                    break;
                }
                if (t.type === 'open') {
                    braceCol = t.startCol;
                    idx++;
                    break;
                }
                args.push({ text: t.text, col: t.startCol });
                idx++;
            }

            if (!directive) break;

            const top = stack[stack.length - 1];
            const node = {
                _isBlock: braceCol >= 0,
                _isComment: false,
                directive: directive,
                _args: args,
                value: args
                    .map(function (a) {
                        return a.text;
                    })
                    .join(' '),
                _line: startLine,
                _col: directiveCol,
                _trailingComment: trailingComment ? trailingComment.text : null,
                _children: [],
            };
            top._nodes.push(node);

            if (braceCol >= 0) {
                stack.push({
                    _nodes: node._children,
                    _parent: node,
                });
            }

            // 处理紧跟的 } (可能多个)
            while (idx < tokens.length && tokens[idx].type === 'close') {
                if (stack.length > 1) stack.pop();
                idx++;
            }

            // 若已结束（; 或 {）且 idx 还有 token，继续下一条 directive
            if (!hadSemi && braceCol < 0) break;
            if (idx >= tokens.length) break;
            // 跳过下一条 directive 前的孤立注释
            while (idx < tokens.length && tokens[idx].type === 'comment') {
                pendingComment = tokens[idx];
                idx++;
            }
            if (idx >= tokens.length) break;
            // 紧跟的 token 必须是新 directive（arg 类型）或 }
            if (tokens[idx].type === 'close') continue;
        }
    }

    return _nfmBuildAst(items);
}

function _nfmBuildAst(items) {
    return items.map(_nfmFinalizeNode);
}

function _nfmFinalizeNode(node) {
    if (node._isComment) {
        return {
            _isComment: true,
            _text: node._text,
            line: node._line,
            col: node._col,
        };
    }
    const out = {
        directive: node.directive,
        args: (node._args || []).map(function (a) {
            return a.text;
        }),
        value: node.value || '',
        line: node._line,
        col: node._col,
        trailingComment: node._trailingComment || null,
        isBlock: node._isBlock === true,
        blockKind: node._isBlock === true ? node.directive : null,
        children: [],
    };
    if (out.isBlock) {
        for (let i = 0; i < (node._children || []).length; i++) {
            out.children.push(_nfmFinalizeNode(node._children[i]));
        }
    }
    return out;
}

// -----------------------------------------------------------
// 把 AST 渲染为格式化文本
//   indent: 缩进字符串（'  ' / '    ' / '\t'）
//   每条 directive 占一行：indent + directive + ' ' + args + ';'
//   K&R 风格：{ 跟在 directive 后，} 独占一行
// -----------------------------------------------------------
function _nfmRenderAst(items, indent, depth) {
    const lines = [];
    const prefix = indent.repeat(depth);
    for (let i = 0; i < items.length; i++) {
        const node = items[i];
        if (node._isComment) {
            const t = node._text.replace(/^\s+/, '');
            lines.push(prefix + t);
            continue;
        }
        const head = node.directive + (node.value ? ' ' + node.value : '');
        if (node.isBlock) {
            lines.push(prefix + head + ' {');
            const childLines = _nfmRenderAst(node.children, indent, depth + 1);
            for (let j = 0; j < childLines.length; j++) lines.push(childLines[j]);
            lines.push(prefix + '}');
        } else {
            const tail = node.trailingComment ? ' ' + node.trailingComment : '';
            lines.push(prefix + head + ';' + tail);
        }
    }
    return lines;
}

// 对外 API：格式化
//   opts: {indent}
//   行为：拼接逻辑行（反斜杠续行合并），按块缩进，K&R 大括号风格
function formatNginx(text, opts) {
    opts = opts || {};
    const indent = opts.indent != null ? opts.indent : '    ';
    const items = parseNginx(text);
    const lines = _nfmRenderAst(items, indent, 0);
    return lines.join('\n');
}

// -----------------------------------------------------------
// 压缩：删除多余空白，删除注释；保留必要空格 / ; / { }
//   - 块大括号独占一行（{ 前必有空格，{ 后换行；} 前换行）
//   - ; 前不留空格
//   - 字符串字面量原样保留
// -----------------------------------------------------------
function minifyNginx(text) {
    const logicalLines = _nfmJoinBackslashLines(text);
    const out = [];
    for (let i = 0; i < logicalLines.length; i++) {
        const { line } = logicalLines[i];
        const lines = _nfmCompressLine(line);
        if (lines) {
            for (let j = 0; j < lines.length; j++) out.push(lines[j]);
        }
    }
    return out.join('\n');
}

// 返回压缩后的行数组（可能拆成多行）。空 / 纯注释返回 null
// 实现思路：复用 _nfmTokenizeLine 得到语义 token，
//   - arg / directive 之间用单空格分隔
//   - { / } 触发换行（{ 同行尾，} 独立行）
//   - ; 紧贴前一个 arg
//   - 注释（无论行尾或整行）一律丢弃
function _nfmCompressLine(line) {
    if (!line) return null;
    const tokens = _nfmTokenizeLine(line);
    if (tokens.length === 0) return null;
    // 整行注释：返回 null 丢弃
    if (tokens.length === 1 && tokens[0].type === 'comment') return null;

    const outLines = [];
    let buf = '';
    let hasContent = false;
    for (let i = 0; i < tokens.length; i++) {
        const tk = tokens[i];
        // 注释一律丢弃（minify 不保留注释）
        if (tk.type === 'comment') continue;
        if (tk.type === 'open') {
            if (hasContent) buf += ' ';
            buf += '{';
            outLines.push(buf);
            buf = '';
            hasContent = false;
            continue;
        }
        if (tk.type === 'close') {
            if (hasContent) {
                outLines.push(buf);
                buf = '';
                hasContent = false;
            }
            outLines.push('}');
            continue;
        }
        if (tk.type === 'semi') {
            buf += ';';
            hasContent = true;
            continue;
        }
        // arg（含 directive 名）
        if (hasContent) buf += ' ';
        buf += tk.text;
        hasContent = true;
    }
    if (hasContent) outLines.push(buf);
    return outLines.length > 0 ? outLines : null;
}

// -----------------------------------------------------------
// Lint：返回 [{line, col, severity, rule, msg, ctx}]
//   规则：
//     - duplicate-directive 同一 block 内出现 ≥2 次同名 directive
//       豁免：_NFM_DUP_ALLOW 中的指令
//     - missing-semicolon 指令后未跟 ; 或 {
//     - unbalanced-brace { 与 } 数量不平衡
// -----------------------------------------------------------
function lintNginx(text) {
    const result = [];
    if (text == null) return result;
    const srcLines = String(text).split(/\r?\n/);

    // 1) duplicate-directive
    try {
        const ast = parseNginx(text);
        _nfmLintDup(ast, srcLines, result);
    } catch (e) {
        // 解析失败时不阻塞其他规则
    }

    // 2) missing-semicolon & 3) unbalanced-brace
    let openCount = 0;
    let closeCount = 0;
    for (let i = 0; i < srcLines.length; i++) {
        const raw = srcLines[i];
        const lineNo = i + 1;
        // 去除字符串 / 注释后再扫
        const masked = _nfmMaskStringsAndComments(raw);
        // 大括号计数
        for (let j = 0; j < masked.length; j++) {
            if (masked[j] === '{') openCount++;
            else if (masked[j] === '}') closeCount++;
        }
        // missing-semicolon 检查
        if (masked.trim() === '') continue;
        if (masked.trim().startsWith('#')) continue;
        const trimmed = masked.trim();
        // 跳过纯 } 行
        if (trimmed === '}') continue;
        // 跳过以 { 结尾的 block 起始
        if (trimmed.endsWith('{')) continue;
        // 必须含 ; 或 { 才合法
        if (!/[;{]/.test(trimmed)) {
            result.push({
                line: lineNo,
                col: trimmed.length,
                severity: 'warn',
                rule: 'missing-semicolon',
                msg: '指令缺少结尾分号 ;',
                ctx: raw.trim(),
            });
        }
    }

    if (openCount !== closeCount) {
        result.push({
            line: 0,
            col: 0,
            severity: 'error',
            rule: 'unbalanced-brace',
            msg: '大括号不平衡: ' + openCount + ' 个 { / ' + closeCount + ' 个 }',
            ctx: '',
        });
    }

    // 按行号排序
    result.sort(function (a, b) {
        if (a.line !== b.line) return a.line - b.line;
        return a.col - b.col;
    });
    return result;
}

// 递归检查重复指令
function _nfmLintDup(nodes, srcLines, result) {
    const seen = {};
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node._isComment) continue;
        const key = node.directive;
        if (!seen[key]) {
            seen[key] = [node];
        } else {
            seen[key].push(node);
        }
    }
    for (const key in seen) {
        const list = seen[key];
        if (list.length > 1 && !_NFM_DUP_ALLOW.has(key)) {
            // 报第二条起
            for (let i = 1; i < list.length; i++) {
                const n = list[i];
                result.push({
                    line: n.line,
                    col: n.col,
                    severity: 'warn',
                    rule: 'duplicate-directive',
                    msg: '同一块内重复指令: ' + key,
                    ctx: (srcLines[n.line - 1] || '').trim(),
                });
            }
        }
    }
    // 递归
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (!node._isComment && node.isBlock && node.children) {
            _nfmLintDup(node.children, srcLines, result);
        }
    }
}

// 把字符串/注释替换为空格（保留换行），便于扫 { } 等结构字符
function _nfmMaskStringsAndComments(line) {
    const n = line.length;
    let i = 0;
    let out = '';
    while (i < n) {
        const c = line[i];
        if (c === '"' || c === "'") {
            const end = _nfmSkipString(line, i);
            for (let k = i; k < end; k++) out += line[k] === '\n' ? '\n' : ' ';
            i = end;
            continue;
        }
        if (c === '#') {
            for (let k = i; k < n; k++) out += ' ';
            return out;
        }
        out += c;
        i++;
    }
    return out;
}

// -----------------------------------------------------------
// 统计 block 数量
//   返回 { server, http, location, upstream, if, map, geo, limit_except, events, mail, stream, types, total }
// -----------------------------------------------------------
function countBlocks(text) {
    const ast = parseNginx(text);
    const counts = {
        http: 0,
        server: 0,
        location: 0,
        upstream: 0,
        if: 0,
        map: 0,
        geo: 0,
        limit_except: 0,
        events: 0,
        mail: 0,
        stream: 0,
        types: 0,
        total: 0,
    };

    function walk(nodes) {
        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            if (n._isComment) continue;
            if (n.isBlock) {
                counts.total++;
                if (counts[n.directive] != null) counts[n.directive]++;
                walk(n.children);
            }
        }
    }

    walk(ast);
    return counts;
}

// ============================================================
// UI 部分
// ============================================================

const _NFM_SAMPLE = [
    '# Nginx 示例配置',
    'worker_processes  auto;',
    'events {',
    '    worker_connections  1024;',
    '}',
    'http {',
    '    include       mime.types;',
    '    default_type  application/octet-stream;',
    '    sendfile        on;',
    '    keepalive_timeout  65;',
    '    upstream backend {',
    '        server 127.0.0.1:8080;',
    '        server 127.0.0.1:8081;',
    '    }',
    '    server {',
    '        listen       80;',
    '        server_name  example.com;',
    '        location /api/ {',
    '            proxy_pass http://backend;',
    '        }',
    '        location ~ \\.php$ {',
    '            fastcgi_pass unix:/var/run/php-fpm.sock;',
    '        }',
    '    }',
    '}',
].join('\n');

function _nfmIndentValueToOpt(v) {
    if (v === '\\t') return '\t';
    if (v === '2') return '  ';
    return '    ';
}

function _nfmFormat() {
    const input = document.getElementById('nfmInput').value;
    const out = document.getElementById('nfmOutput');
    const sel = document.getElementById('nfmIndent');
    const indent = _nfmIndentValueToOpt(sel ? sel.value : '4');
    try {
        const formatted = formatNginx(input, { indent: indent });
        out.value = formatted;
        _nfmSetStatus('格式化完成，共 ' + formatted.split('\n').length + ' 行');
    } catch (e) {
        out.value = '';
        _nfmSetStatus('格式化失败: ' + e.message, true);
    }
    _nfmLint();
    _nfmShowStats();
}

function _nfmMinify() {
    const input = document.getElementById('nfmInput').value;
    const out = document.getElementById('nfmOutput');
    try {
        const mini = minifyNginx(input);
        out.value = mini;
        _nfmSetStatus('已压缩: ' + mini.length + ' 字符');
    } catch (e) {
        out.value = '';
        _nfmSetStatus('压缩失败: ' + e.message, true);
    }
    _nfmLint();
    _nfmShowStats();
}

function _nfmCopy() {
    const out = document.getElementById('nfmOutput');
    if (!out || !out.value) {
        toast('没有可复制内容');
        return;
    }
    safeCopy(out.value, '已复制格式化结果');
}

function _nfmSample() {
    document.getElementById('nfmInput').value = _NFM_SAMPLE;
    _nfmFormat();
}

function _nfmClear() {
    document.getElementById('nfmInput').value = '';
    document.getElementById('nfmOutput').value = '';
    document.getElementById('nfmLint').innerHTML = '';
    document.getElementById('nfmStats').textContent = '';
    _nfmSetStatus('已清空');
}

function _nfmSetStatus(msg, isErr) {
    const el = document.getElementById('nfmStatus');
    if (!el) return;
    el.textContent = msg;
    el.style.color = isErr ? 'var(--danger)' : 'var(--text-dim)';
}

function _nfmLint() {
    const input = document.getElementById('nfmInput').value;
    const wrap = document.getElementById('nfmLint');
    if (!wrap) return;
    if (!input.trim()) {
        wrap.innerHTML = '<span class="nfm-lint-empty">未发现问题</span>';
        return;
    }
    let issues;
    try {
        issues = lintNginx(input);
    } catch (e) {
        wrap.innerHTML = '<span class="nfm-lint-bad">Lint 失败: ' + escapeHtml(e.message) + '</span>';
        return;
    }
    if (!issues.length) {
        wrap.innerHTML = '<span class="nfm-lint-empty">未发现问题</span>';
        return;
    }
    const parts = [];
    for (let i = 0; i < issues.length; i++) {
        const it = issues[i];
        const sevCls = it.severity === 'error' ? 'nfm-lint-error' : 'nfm-lint-warn';
        const icon = it.severity === 'error' ? 'bi-x-circle-fill' : 'bi-exclamation-triangle-fill';
        const loc = it.line > 0 ? '第 ' + it.line + ' 行' : '全局';
        parts.push(
            '<div class="nfm-lint-item ' +
                sevCls +
                '">' +
                '<i class="bi ' +
                icon +
                '"></i>' +
                '<span class="nfm-lint-rule">[' +
                escapeHtml(it.rule) +
                ']</span>' +
                '<span class="nfm-lint-loc">' +
                loc +
                '</span>' +
                '<span class="nfm-lint-msg">' +
                escapeHtml(it.msg) +
                '</span>' +
                (it.ctx ? '<code class="nfm-lint-ctx">' + escapeHtml(it.ctx) + '</code>' : '') +
                '</div>'
        );
    }
    wrap.innerHTML = parts.join('');
}

function _nfmShowStats() {
    const input = document.getElementById('nfmInput').value;
    const el = document.getElementById('nfmStats');
    if (!el) return;
    if (!input.trim()) {
        el.textContent = '';
        return;
    }
    try {
        const c = countBlocks(input);
        const parts = [];
        if (c.http) parts.push('http ×' + c.http);
        if (c.server) parts.push('server ×' + c.server);
        if (c.location) parts.push('location ×' + c.location);
        if (c.upstream) parts.push('upstream ×' + c.upstream);
        if (c.if) parts.push('if ×' + c.if);
        parts.push('块总计 ×' + c.total);
        el.textContent = parts.join(' · ');
    } catch (e) {
        el.textContent = '';
    }
}

function nfmInit() {
    const inEl = document.getElementById('nfmInput');
    if (inEl && !inEl.value) {
        inEl.value = _NFM_SAMPLE;
    }
    _nfmFormat();
    _nfmShowStats();
}

// ============================================================
// Node 测试导出（纯函数）
// ============================================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatNginx: formatNginx,
        minifyNginx: minifyNginx,
        lintNginx: lintNginx,
        parseNginx: parseNginx,
        countBlocks: countBlocks,
    };
}

if (typeof registerInit === 'function') {
    registerInit('nginxfmt', nfmInit);
}
