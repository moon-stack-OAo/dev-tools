// 解析 Java 堆栈
function parseStackTrace(text) {
    if (!text || !text.trim()) {
        return null;
    }

    const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l);
    const result = {
        exceptions: [],
        currentException: null,
    };

    let currentEx = null;
    let inCausedBy = false;

    for (const line of lines) {
        // 匹配异常行: java.lang.Exception: message
        const exMatch = line.match(/^([\w.$]+(?:Exception|Error|Throwable))(?::\s*(.*))?$/);
        if (exMatch) {
            currentEx = {
                type: exMatch[1],
                message: exMatch[2] || '',
                frames: [],
                causedBy: null,
            };
            result.exceptions.push(currentEx);
            if (!result.currentException) {
                result.currentException = currentEx;
            }
            continue;
        }

        // 匹配 Caused by
        const causedByMatch = line.match(/^Caused by:\s*([\w.$]+(?:Exception|Error|Throwable))(?::\s*(.*))?$/);
        if (causedByMatch && currentEx) {
            const causedEx = {
                type: causedByMatch[1],
                message: causedByMatch[2] || '',
                frames: [],
                causedBy: null,
            };
            currentEx.causedBy = causedEx;
            currentEx = causedEx;
            result.exceptions.push(causedEx);
            continue;
        }

        // 匹配堆栈帧: at com.example.Class.method(File.java:123)
        const frameMatch = line.match(/^at\s+([\w.$]+)\.([\w$]+)\(([\w.]+):(\d+)\)$/);
        if (frameMatch && currentEx) {
            currentEx.frames.push({
                class: frameMatch[1],
                method: frameMatch[2],
                file: frameMatch[3],
                line: parseInt(frameMatch[4]),
            });
            continue;
        }

        // 匹配 Native 方法: at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
        const nativeMatch = line.match(/^at\s+([\w.$]+)\.([\w$]+)\(Native Method\)$/);
        if (nativeMatch && currentEx) {
            currentEx.frames.push({
                class: nativeMatch[1],
                method: nativeMatch[2],
                file: 'Native Method',
                line: -1,
            });
            continue;
        }

        // 匹配 ... N more
        const moreMatch = line.match(/^\.\.\.\s*(\d+)\s*more$/);
        if (moreMatch && currentEx) {
            currentEx.frames.push({
                omitted: parseInt(moreMatch[1]),
            });
            continue;
        }
    }

    return result;
}

// 格式化堆栈为 HTML
function formatStackTraceHtml(parsed) {
    if (!parsed || parsed.exceptions.length === 0) {
        return '<span style="color:var(--text-dim)">无法解析堆栈信息</span>';
    }

    let html = '';

    parsed.exceptions.forEach((ex, exIndex) => {
        if (exIndex > 0) {
            html += '<div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--border)">';
        }

        // 异常类型和消息
        html += '<div style="margin-bottom:8px">';
        html += '<span style="color:#ff6b6b;font-weight:600">' + escapeHtml(ex.type) + '</span>';
        if (ex.message) {
            html += '<span style="color:var(--text-dim)">: </span>';
            html += '<span style="color:#ffd93d">' + escapeHtml(ex.message) + '</span>';
        }
        html += '</div>';

        // 堆栈帧
        html += '<div style="padding-left:16px">';
        ex.frames.forEach((frame) => {
            if (frame.omitted) {
                html += '<div style="color:var(--text-dim)">... ' + frame.omitted + ' more</div>';
            } else {
                html += '<div style="margin-bottom:2px">';
                html += '<span style="color:var(--text-dim)">at </span>';
                html += '<span style="color:#4ecdc4">' + escapeHtml(frame.class) + '</span>';
                html += '<span style="color:var(--text-dim)">.</span>';
                html += '<span style="color:#45b7d1;font-weight:600">' + escapeHtml(frame.method) + '</span>';
                html += '<span style="color:var(--text-dim)">(</span>';
                html += '<span style="color:#96ceb4">' + escapeHtml(frame.file) + '</span>';
                if (frame.line > 0) {
                    html += '<span style="color:var(--text-dim)">:</span>';
                    html += '<span style="color:#dda0dd">' + frame.line + '</span>';
                }
                html += '<span style="color:var(--text-dim)">)</span>';
                html += '</div>';
            }
        });
        html += '</div>';

        if (exIndex > 0) {
            html += '</div>';
        }
    });

    return html;
}

// HTML 转义

// 界面按钮：解析堆栈
function stacktraceParse() {
    const input = document.getElementById('stacktraceInput').value;
    const output = document.getElementById('stacktraceOutput');

    if (!input.trim()) {
        output.innerHTML = '<span style="color:var(--text-dim)">请粘贴异常堆栈</span>';
        return;
    }

    try {
        const parsed = parseStackTrace(input);
        if (parsed && parsed.exceptions.length > 0) {
            output.innerHTML = formatStackTraceHtml(parsed);
            setStatus('解析完成: ' + parsed.exceptions.length + ' 个异常');
        } else {
            output.innerHTML = '<span style="color:var(--text-dim)">未识别到有效的堆栈信息</span>';
        }
    } catch (e) {
        output.innerHTML = '<span style="color:#ff6b6b">解析失败: ' + escapeHtml(e.message) + '</span>';
    }
}

// 界面按钮：格式化
function stacktraceFormat() {
    const input = document.getElementById('stacktraceInput').value;
    const output = document.getElementById('stacktraceOutput');

    if (!input.trim()) {
        output.innerHTML = '<span style="color:var(--text-dim)">请粘贴异常堆栈</span>';
        return;
    }

    try {
        const lines = input
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l);
        let formatted = '';
        let indent = 0;

        lines.forEach((line) => {
            if (line.startsWith('Caused by:')) {
                indent = 0;
                formatted += '\n' + line + '\n';
            } else if (line.match(/^\.\.\.\s*\d+\s*more$/)) {
                formatted += '  '.repeat(indent) + line + '\n';
            } else if (line.startsWith('at ')) {
                indent = 1;
                formatted += '  ' + line + '\n';
            } else {
                formatted += line + '\n';
            }
        });

        output.textContent = formatted.trim();
        setStatus('格式化完成');
    } catch (e) {
        output.innerHTML = '<span style="color:#ff6b6b">格式化失败: ' + escapeHtml(e.message) + '</span>';
    }
}

// 界面按钮：清空
function stacktraceClear() {
    document.getElementById('stacktraceInput').value = '';
    document.getElementById('stacktraceOutput').innerHTML = '';
    setStatus('已清空');
}

registerInit('stacktrace', function () {
    // 初始化
});
