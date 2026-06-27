// T10: 日志格式化高亮
// 解析 logback / log4j2 默认 pattern: %d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger{36} - %msg%n
// 安全渲染：所有 token value 通过 textContent 注入；XSS 防护使用 _lfEscape

// ============================================================
// === 0. 正则
// ============================================================
// 单行日志：timestamp(毫秒可选) + level + [thread] + logger - message
const LOG_PATTERN =
    /^\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:[.,]\d+)?)\s+(TRACE|DEBUG|INFO|WARN|ERROR|FATAL)\s+\[([^\]]+)\]\s+([\w$.\-]+)\s*[-:]\s*(.*)$/;
// 异常堆栈行：JVM StackTrace 风格
const STACK_FRAME = /^\s*at\s+/;
// 异常 cause 行：Caused by: xxx.xxx: message
const CAUSED_BY = /^\s*Caused by:\s*/;
// 异常消息首行：java.lang.NullPointerException  或  Exception in thread "main" ...
const EXCEPTION_FIRST = /^\s*([A-Za-z_][\w$.]*(?:Exception|Error|Throwable))(?::\s*(.*))?$/;
// 省略帧：... 10 more
const ELLIPSIS_FRAME = /^\s*\.\.\.\s+\d+\s+more$/;

// ============================================================
// === 1. 单行解析
// ============================================================
function parseLogLine(line) {
    const m = line.match(LOG_PATTERN);
    if (!m) return null;
    return {
        timestamp: m[1],
        level: m[2],
        thread: m[3],
        logger: m[4],
        message: m[5],
        raw: line,
    };
}

// ============================================================
// === 2. 整段解析（按行 + Stack Trace 分组）
// ============================================================
function parseLog(text) {
    const lines = String(text || '').split(/\r?\n/);
    const groups = [];
    let current = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) {
            // 空行：作为分隔
            if (current) {
                groups.push(current);
                current = null;
            }
            continue;
        }
        const entry = parseLogLine(line);
        if (entry) {
            // 新日志条目
            if (current) groups.push(current);
            current = {entry: entry, frames: []};
            continue;
        }
        // 非标准格式：尝试识别为 Stack Frame / Caused by / Ellipsis / Exception header
        if (STACK_FRAME.test(line) || CAUSED_BY.test(line) || ELLIPSIS_FRAME.test(line)) {
            if (current) current.frames.push(line);
            else current = {entry: null, frames: [line]};
            continue;
        }
        // Exception first line（如 java.lang.NullPointerException）
        const exm = line.match(EXCEPTION_FIRST);
        if (exm) {
            if (current) current.frames.push(line);
            else current = {entry: null, frames: [line]};
            continue;
        }
        // 不识别的行：归为「附文本行」
        if (current) {
            current.frames.push(line);
        } else {
            current = {entry: null, frames: [line]};
        }
    }
    if (current) groups.push(current);
    return groups;
}

// ============================================================
// === 3. 级别着色映射（CSS 类名）
// ============================================================
const LEVEL_CLASS = {
    TRACE: 'logfmt-l-trace',
    DEBUG: 'logfmt-l-debug',
    INFO: 'logfmt-l-info',
    WARN: 'logfmt-l-warn',
    ERROR: 'logfmt-l-error',
    FATAL: 'logfmt-l-fatal',
};

// ============================================================
// === 4. 安全转义（防恶意 XSS）
// ============================================================
function _lfEscape(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ============================================================
// === 5. 渲染单行日志（HTML 字符串）
// ============================================================
function renderLogEntryHTML(entry) {
    if (!entry) return '';
    const levelCls = LEVEL_CLASS[entry.level] || 'logfmt-l-info';
    // 结构：timestamp | level | [thread] | logger | - | message
    const parts = [
        '<span class="logfmt-timestamp">',
        _lfEscape(entry.timestamp),
        '</span>',
        ' ',
        '<span class="logfmt-level ' + levelCls + '">',
        _lfEscape(entry.level.padEnd(5)),
        '</span>',
        ' ',
        '<span class="logfmt-thread">[',
        _lfEscape(entry.thread),
        ']</span>',
        ' ',
        '<span class="logfmt-logger">',
        _lfEscape(entry.logger),
        '</span>',
        ' - ',
        '<span class="logfmt-msg">',
        _lfEscape(entry.message),
        '</span>',
    ];
    return parts.join('');
}

// 渲染 StackTrace 折叠块
function renderStackFramesHTML(frames, parentLevel) {
    if (!frames || !frames.length) return '';
    const cls = parentLevel === 'ERROR' || parentLevel === 'FATAL' ? 'logfmt-stack-error' : 'logfmt-stack-warn';
    const summary = frames.length + ' 帧';
    const head =
        '<div class="logfmt-stack ' +
        cls +
        '">' +
        '<div class="logfmt-stack-head" onclick="this.parentElement.classList.toggle(\'logfmt-stack-open\')">' +
        '<i class="bi bi-chevron-right logfmt-stack-caret"></i> Stack Trace (' +
        summary +
        ')' +
        '</div>' +
        '<div class="logfmt-stack-body">';
    const body = frames
        .map(function (f) {
            // Caused by 单独高亮
            if (CAUSED_BY.test(f)) {
                return '<div class="logfmt-stack-line logfmt-caused">' + _lfEscape(f) + '</div>';
            }
            // "at xxx" 关键字加色
            const m = f.match(/^(\s*)(at\s+)(.+)$/);
            if (m) {
                return (
                    '<div class="logfmt-stack-line">' +
                    _lfEscape(m[1]) +
                    '<span class="logfmt-stack-at">' +
                    _lfEscape(m[2]) +
                    '</span>' +
                    _lfEscape(m[3]) +
                    '</div>'
                );
            }
            // Exception 头（如 java.lang.NullPointerException: ...）
            const ex = f.match(EXCEPTION_FIRST);
            if (ex) {
                const cls2 = 'logfmt-exception-class';
                return (
                    '<div class="logfmt-stack-line">' +
                    '<span class="' +
                    cls2 +
                    '">' +
                    _lfEscape(ex[1]) +
                    '</span>' +
                    (ex[2] ? '<span class="logfmt-exception-msg">' + _lfEscape(': ' + ex[2]) + '</span>' : '') +
                    '</div>'
                );
            }
            return '<div class="logfmt-stack-line">' + _lfEscape(f) + '</div>';
        })
        .join('');
    const tail = '</div></div>';
    return head + body + tail;
}

// 渲染一整段（entry + frames）
function renderGroupHTML(group) {
    if (!group) return '';
    if (!group.entry) {
        // 无 entry：纯堆栈块
        return renderStackFramesHTML(group.frames, null);
    }
    const entryHtml =
        '<div class="logfmt-line logfmt-level-' + group.entry.level + '">' + renderLogEntryHTML(group.entry) + '</div>';
    return entryHtml + renderStackFramesHTML(group.frames, group.entry.level);
}

// ============================================================
// === 6. 过滤 + 搜索
// ============================================================
let _lfEnabledLevels = {TRACE: true, DEBUG: true, INFO: true, WARN: true, ERROR: true, FATAL: true};

function _lfApplyFilter(groups) {
    const q = (_lfSearchKeyword || '').toLowerCase().trim();
    return groups.filter(function (g) {
        if (g.entry) {
            if (!_lfEnabledLevels[g.entry.level]) return false;
            if (q) {
                const hay = (g.entry.raw + ' ' + g.frames.join(' ')).toLowerCase();
                if (hay.indexOf(q) === -1) return false;
            }
            return true;
        }
        // 无 entry 的纯堆栈块：跟随前一个 entry 的级别归属
        if (q) {
            const hay = g.frames.join(' ').toLowerCase();
            if (hay.indexOf(q) === -1) return false;
        }
        return true;
    });
}

// 过滤搜索结果时需要把后续 frames 跟随前一个保留的 entry 一起展示
function _lfFilterWithStack(groups) {
    const filtered = [];
    const hasKeyword = !!(_lfSearchKeyword && _lfSearchKeyword.trim());
    for (let i = 0; i < groups.length; i++) {
        const g = groups[i];
        if (g.entry) {
            const levelOn = !!_lfEnabledLevels[g.entry.level];
            const kwMatch = _lfMatchKeyword(g);
            // 级别开启：显示；级别关闭 + 搜索命中：也显示（用户搜索时希望跨级别）
            if (levelOn || (hasKeyword && kwMatch)) {
                filtered.push(g);
            }
        } else {
            // 堆栈块：附加到上一条保留的 entry
            if (filtered.length && (hasKeyword ? _lfMatchKeyword(g) : true)) {
                const last = filtered[filtered.length - 1];
                if (last) last.frames = last.frames.concat(g.frames);
            }
        }
    }
    return filtered;
}

function _lfMatchKeyword(g) {
    const q = (_lfSearchKeyword || '').toLowerCase().trim();
    if (!q) return true;
    const hay = (g.entry ? g.entry.raw : '') + ' ' + g.frames.join(' ');
    return hay.toLowerCase().indexOf(q) !== -1;
}

// ============================================================
// === 7. UI 渲染（直接 DOM 操作，零 innerHTML 注入用户数据）
// ============================================================
let _lfGroups = [];
let _lfSearchKeyword = '';
let _lfSearchTimer = null;

function _lfClearChildren(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
}

function _lfAppendText(parent, text, className) {
    const span = document.createElement('span');
    if (className) span.className = className;
    span.textContent = text;
    parent.appendChild(span);
}

function _lfBuildEntryNode(entry) {
    const line = document.createElement('div');
    line.className = 'logfmt-line logfmt-level-' + entry.level;
    const levelCls = LEVEL_CLASS[entry.level] || 'logfmt-l-info';
    _lfAppendText(line, entry.timestamp, 'logfmt-timestamp');
    line.appendChild(document.createTextNode(' '));
    _lfAppendText(line, entry.level.padEnd(5), 'logfmt-level ' + levelCls);
    line.appendChild(document.createTextNode(' '));
    _lfAppendText(line, '[', 'logfmt-thread');
    _lfAppendText(line, entry.thread, 'logfmt-thread');
    _lfAppendText(line, ']', 'logfmt-thread');
    line.appendChild(document.createTextNode(' '));
    _lfAppendText(line, entry.logger, 'logfmt-logger');
    line.appendChild(document.createTextNode(' - '));
    _lfAppendText(line, entry.message, 'logfmt-msg');
    return line;
}

function _lfBuildStackNode(frames, parentLevel) {
    if (!frames.length) return null;
    const wrap = document.createElement('div');
    wrap.className =
        'logfmt-stack ' +
        (parentLevel === 'ERROR' || parentLevel === 'FATAL' ? 'logfmt-stack-error' : 'logfmt-stack-warn');
    const head = document.createElement('div');
    head.className = 'logfmt-stack-head';
    head.innerHTML = '<i class="bi bi-chevron-right logfmt-stack-caret"></i> Stack Trace (' + frames.length + ' 帧)';
    head.addEventListener('click', function () {
        wrap.classList.toggle('logfmt-stack-open');
    });
    wrap.appendChild(head);
    const body = document.createElement('div');
    body.className = 'logfmt-stack-body';
    frames.forEach(function (f) {
        const ln = document.createElement('div');
        ln.className = 'logfmt-stack-line';
        const m = f.match(/^(\s*)(at\s+)(.+)$/);
        if (m) {
            ln.appendChild(document.createTextNode(m[1]));
            _lfAppendText(ln, m[2], 'logfmt-stack-at');
            ln.appendChild(document.createTextNode(m[3]));
        } else if (CAUSED_BY.test(f)) {
            ln.classList.add('logfmt-caused');
            ln.textContent = f;
        } else {
            const ex = f.match(EXCEPTION_FIRST);
            if (ex) {
                _lfAppendText(ln, ex[1], 'logfmt-exception-class');
                if (ex[2]) _lfAppendText(ln, ': ' + ex[2], 'logfmt-exception-msg');
            } else {
                ln.textContent = f;
            }
        }
        body.appendChild(ln);
    });
    wrap.appendChild(body);
    return wrap;
}

function logfmtRender() {
    const root = document.getElementById('logfmtResults');
    if (!root) return;
    _lfClearChildren(root);
    const input = document.getElementById('logfmtInput').value;
    if (!input.trim()) {
        root.innerHTML = '<div class="logfmt-empty">点击「格式化」查看高亮结果</div>';
        return;
    }
    const groups = parseLog(input);
    const filtered = _lfFilterWithStack(groups);
    if (!filtered.length) {
        root.innerHTML = '<div class="logfmt-empty">没有匹配的行（检查级别过滤 / 搜索）</div>';
        return;
    }
    filtered.forEach(function (g) {
        if (g.entry) {
            root.appendChild(_lfBuildEntryNode(g.entry));
            const stackNode = _lfBuildStackNode(g.frames, g.entry.level);
            if (stackNode) root.appendChild(stackNode);
        } else {
            const stackNode = _lfBuildStackNode(g.frames, null);
            if (stackNode) root.appendChild(stackNode);
        }
    });
    // 统计
    const totalLines = input.split(/\r?\n/).filter(function (l) {
        return l.trim();
    }).length;
    const matched = filtered.length;
    const stats = document.getElementById('logfmtStats');
    if (stats) {
        stats.textContent = '共 ' + totalLines + ' 行 · 解析 ' + groups.length + ' 条 · 显示 ' + matched + ' 条';
    }
}

// ============================================================
// === 8. 交互
// ============================================================
function logfmtFormat() {
    logfmtRender();
    setStatus('✅ 日志已格式化');
}

function logfmtClear() {
    document.getElementById('logfmtInput').value = '';
    document.getElementById('logfmtResults').innerHTML = '<div class="logfmt-empty">点击「格式化」查看高亮结果</div>';
    const stats = document.getElementById('logfmtStats');
    if (stats) stats.textContent = '';
    setStatus('已清空');
}

function logfmtCopyText() {
    const input = document.getElementById('logfmtInput').value;
    if (!input.trim()) {
        toast('没有日志可复制');
        return;
    }
    safeCopy(input, '已复制纯文本日志');
}

function logfmtDownload() {
    const input = document.getElementById('logfmtInput').value;
    if (!input.trim()) {
        toast('没有日志可下载');
        return;
    }
    const ts = _lfTimestamp();
    const filename = 'log-' + ts + '.log';
    const blob = new Blob([input], {type: 'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () {
        URL.revokeObjectURL(url);
    }, 1000);
    toast('已下载 ' + filename);
    setStatus('✅ 已下载 ' + filename);
}

function _lfTimestamp() {
    const d = new Date();
    const pad = function (n) {
        return String(n).padStart(2, '0');
    };
    return (
        d.getFullYear() +
        pad(d.getMonth() + 1) +
        pad(d.getDate()) +
        '-' +
        pad(d.getHours()) +
        pad(d.getMinutes()) +
        pad(d.getSeconds())
    );
}

function logfmtInsertSample(kind) {
    const input = document.getElementById('logfmtInput');
    input.value = SAMPLES[kind] || '';
    logfmtFormat();
}

function logfmtToggleLevel(level) {
    _lfEnabledLevels[level] = !_lfEnabledLevels[level];
    const btn = document.querySelector('.logfmt-level-btn[data-level="' + level + '"]');
    if (btn) btn.classList.toggle('active', _lfEnabledLevels[level]);
    logfmtRender();
}

function logfmtOnlyError() {
    const lvls = {TRACE: false, DEBUG: false, INFO: false, WARN: false, ERROR: true, FATAL: true};
    Object.assign(_lfEnabledLevels, lvls);
    document.querySelectorAll('.logfmt-level-btn').forEach(function (b) {
        b.classList.toggle('active', !!_lfEnabledLevels[b.dataset.level]);
    });
    logfmtRender();
    setStatus('仅显示 ERROR / FATAL');
}

function logfmtAllLevels() {
    Object.keys(_lfEnabledLevels).forEach(function (k) {
        _lfEnabledLevels[k] = true;
    });
    document.querySelectorAll('.logfmt-level-btn').forEach(function (b) {
        b.classList.add('active');
    });
    logfmtRender();
}

function logfmtSearch(keyword) {
    clearTimeout(_lfSearchTimer);
    _lfSearchTimer = setTimeout(function () {
        _lfSearchKeyword = keyword;
        logfmtRender();
    }, 200);
}

// ============================================================
// === 9. 示例日志
// ============================================================
const SAMPLES = {
    springboot:
        '2024-05-20 10:23:45.123  INFO [http-nio-8080-exec-1] com.example.OrderController - Order created id=1001 amount=99.50\n' +
        '2024-05-20 10:23:46.456 DEBUG [http-nio-8080-exec-1] com.example.OrderService - Querying user: userId=42\n' +
        '2024-05-20 10:23:47.789  WARN [http-nio-8080-exec-2] com.example.PaymentClient - Payment gateway slow response: 2.3s\n' +
        '2024-05-20 10:23:48.012 ERROR [http-nio-8080-exec-2] com.example.OrderService - Failed to create order\n' +
        'java.lang.NullPointerException: customer name is null\n' +
        '\tat com.example.OrderService.create(OrderService.java:45)\n' +
        '\tat com.example.OrderController.checkout(OrderController.java:78)\n' +
        '\tat sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)\n' +
        '\tat sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)\n' +
        '\tat sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)\n' +
        '\tat java.lang.reflect.Method.invoke(Method.java:498)\n' +
        '\tat org.springframework.web.method.support.InvocableHandlerMethod.doInvoke(InvocableHandlerMethod.java:205)\n' +
        '\t... 30 more\n' +
        'Caused by: java.lang.IllegalArgumentException: invalid input\n' +
        '\tat com.example.OrderService.validate(OrderService.java:23)\n' +
        '\t... 31 more\n' +
        '2024-05-20 10:23:50.500  INFO [scheduling-1] com.example.CleanupJob - Cleanup task completed in 1.2s\n' +
        '2024-05-20 10:23:51.001  INFO [main] com.example.Application - Started Application in 5.123 seconds',
    error:
        '2024-06-01 09:00:00.000 ERROR [DubboServerHandler-10.0.0.1:20880-thread-50] com.alibaba.dubbo.rpc.protocol.dubbo.DubboProtocol - Failed to invoke remote method\n' +
        'java.lang.RuntimeException: Service call failed\n' +
        '\tat com.alibaba.dubbo.rpc.protocol.dubbo.DubboInvoker.doInvoke(DubboInvoker.java:107)\n' +
        '\tat org.apache.dubbo.rpc.protocol.AbstractInvoker.invoke(AbstractInvoker.java:148)\n' +
        '\tat org.apache.dubbo.rpc.proxy.InvokerInvocationHandler.invoke(InvokerInvocationHandler.java:75)\n' +
        '\tat com.sun.proxy.$Proxy97.queryOrder(Unknown Source)\n' +
        '\tat com.example.OrderFacadeImpl.query(OrderFacadeImpl.java:42)\n' +
        '\t... 25 more\n' +
        'Caused by: java.net.ConnectException: Connection refused: connect\n' +
        '\tat sun.nio.ch.Net.connect(Native Method)\n' +
        '\tat sun.nio.ch.SocketChannelImpl.connect(SocketChannelImpl.java:645)\n' +
        '\tat io.netty.channel.socket.nio.NioSocketChannel.doConnect(NioSocketChannel.java:317)\n' +
        '\t... 20 more',
    simple:
        '2024-01-15 08:00:00.000  INFO [main] com.example.App - Application started\n' +
        '2024-01-15 08:00:01.234  WARN [main] com.example.App - Config file not found, using defaults\n' +
        '2024-01-15 08:00:02.567  INFO [main] com.example.App - Listening on port 8080',
    tomcat: '20-May-2024 10:23:45.123 INFO [http-nio-8080-exec-1] org.apache.catalina.core.ContainerBase.[Tomcat].[localhost].[/api] - Initializing Spring embedded WebApplicationContext',
};

// ============================================================
// === 10. Init 钩子
// ============================================================
function logfmtInit() {
    // 注册级别按钮事件（按需，挂一次即可）
    document.querySelectorAll('.logfmt-level-btn').forEach(function (b) {
        b.classList.add('active');
        b.addEventListener('click', function () {
            logfmtToggleLevel(b.dataset.level);
        });
    });
}

// === Node 导出（仅用于 Node 测试）===
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseLogLine: parseLogLine,
        parseLog: parseLog,
        renderLogEntryHTML: renderLogEntryHTML,
        renderStackFramesHTML: renderStackFramesHTML,
        renderGroupHTML: renderGroupHTML,
        _lfEscape: _lfEscape,
        _lfFilterWithStack: _lfFilterWithStack,
        LOG_PATTERN: LOG_PATTERN,
        LEVEL_CLASS: LEVEL_CLASS,
        SAMPLES: SAMPLES,
    };
}

registerInit('logfmt', logfmtInit);
