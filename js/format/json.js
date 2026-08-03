/**
 * 对已格式化/压缩的 JSON 文本做 token 着色，返回 HTML 字符串。
 * 先转义再包 span，异常时降级为转义纯文本。
 * @param {string} text
 * @param {Array<{index?: number, type?: string}>} [issues]
 * @returns {string}
 */
function highlightJson(text, issues) {
    return highlightJsonWithIssues(text, issues || []);
}

/**
 * 带 key 问题标记的 JSON 语法高亮。
 * @param {string} text
 * @param {Array<{index?: number, type?: string}>} [issues]
 * @returns {string}
 */
function highlightJsonWithIssues(text, issues) {
    const esc =
        typeof escapeHtml === 'function'
            ? escapeHtml
            : function (s) {
                  if (s === undefined || s === null) return '';
                  return String(s)
                      .replace(/&/g, '&amp;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;')
                      .replace(/"/g, '&quot;')
                      .replace(/'/g, '&#39;');
              };
    if (text == null || text === '') return '';

    const byIndex = new Map();
    const list = Array.isArray(issues) ? issues : [];
    for (let k = 0; k < list.length; k++) {
        const iss = list[k];
        if (iss == null || iss.index == null || iss.index < 0) continue;
        const t = iss.type || '';
        const cls =
            t === 'empty_key' || t === 'duplicate_key' ? 'json-key-warn' : 'json-key-error';
        byIndex.set(iss.index, cls);
    }

    try {
        const src = String(text);
        let i = 0;
        const n = src.length;
        let html = '';
        const stack = [];
        let expectKey = false;

        function emit(cls, str) {
            html += '<span class="' + cls + '">' + esc(str) + '</span>';
        }

        while (i < n) {
            const c = src[i];

            if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
                html += c;
                i++;
                continue;
            }

            if (c === '{') {
                emit('json-punct', '{');
                stack.push('object');
                expectKey = true;
                i++;
                continue;
            }
            if (c === '}') {
                emit('json-punct', '}');
                stack.pop();
                expectKey = false;
                i++;
                continue;
            }
            if (c === '[') {
                emit('json-punct', '[');
                stack.push('array');
                expectKey = false;
                i++;
                continue;
            }
            if (c === ']') {
                emit('json-punct', ']');
                stack.pop();
                expectKey = false;
                i++;
                continue;
            }
            if (c === ',') {
                emit('json-punct', ',');
                expectKey = stack[stack.length - 1] === 'object';
                i++;
                continue;
            }
            if (c === ':') {
                emit('json-punct', ':');
                expectKey = false;
                i++;
                continue;
            }

            if (c === '"') {
                const keyStart = i;
                let j = i + 1;
                let escaped = false;
                while (j < n) {
                    if (escaped) {
                        escaped = false;
                        j++;
                        continue;
                    }
                    if (src[j] === '\\') {
                        escaped = true;
                        j++;
                        continue;
                    }
                    if (src[j] === '"') {
                        j++;
                        break;
                    }
                    j++;
                }
                const str = src.slice(i, j);
                if (expectKey && stack[stack.length - 1] === 'object') {
                    const warnCls = byIndex.get(keyStart);
                    emit(warnCls || 'json-key', str);
                    expectKey = false;
                } else {
                    emit('json-string', str);
                }
                i = j;
                continue;
            }

            if (c === '-' || (c >= '0' && c <= '9')) {
                let j = i + 1;
                while (j < n && /[0-9eE+.\-]/.test(src[j])) j++;
                emit('json-number', src.slice(i, j));
                i = j;
                continue;
            }

            if (src.startsWith('true', i)) {
                emit('json-boolean', 'true');
                i += 4;
                continue;
            }
            if (src.startsWith('false', i)) {
                emit('json-boolean', 'false');
                i += 5;
                continue;
            }
            if (src.startsWith('null', i)) {
                emit('json-null', 'null');
                i += 4;
                continue;
            }

            html += esc(c);
            i++;
        }
        return html;
    } catch (e) {
        return esc(String(text));
    }
}

/** @param {string} src @param {number} index */
function jsonIndexToLineCol(src, index) {
    let line = 1;
    let column = 1;
    const n = Math.min(Math.max(0, index), src.length);
    for (let i = 0; i < n; i++) {
        if (src[i] === '\n') {
            line++;
            column = 1;
        } else {
            column++;
        }
    }
    return { line: line, column: column };
}

/** @param {string} base @param {string} key @param {boolean} isIndex */
function jsonPathJoin(base, key, isIndex) {
    if (isIndex) return base + '[' + key + ']';
    if (key === '') return base + '[""]';
    if (/^[A-Za-z_$][\w$]*$/.test(key)) {
        return base + '.' + key;
    }
    return base + '["' + String(key).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]';
}

/**
 * 解析 JSON 字符串字面量（含转义），src[start] 必须为 "
 * @returns {{end: number, value: string}|null}
 */
function jsonReadStringLiteral(src, start) {
    if (src[start] !== '"') return null;
    let i = start + 1;
    let value = '';
    const n = src.length;
    while (i < n) {
        const c = src[i];
        if (c === '"') {
            return { end: i + 1, value: value };
        }
        if (c === '\\') {
            if (i + 1 >= n) return null;
            const e = src[i + 1];
            if (e === '"' || e === '\\' || e === '/' || e === 'b' || e === 'f' || e === 'n' || e === 'r' || e === 't') {
                const map = { b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };
                value += map[e] != null ? map[e] : e;
                i += 2;
                continue;
            }
            if (e === 'u' && i + 5 < n) {
                const hex = src.slice(i + 2, i + 6);
                if (/^[0-9a-fA-F]{4}$/.test(hex)) {
                    value += String.fromCharCode(parseInt(hex, 16));
                    i += 6;
                    continue;
                }
            }
            return null;
        }
        if (c === '\n' || c === '\r') return null;
        value += c;
        i++;
    }
    return null;
}

/**
 * 扫描合法 JSON 源文本中的空 key / 重复 key。
 * @param {string} src
 * @param {Array} issues
 */
function jsonScanValidKeyIssues(src, issues) {
    let i = 0;
    const n = src.length;
    const stack = [];
    let expectKey = false;
    let expectValue = true;

    function skipWs() {
        while (i < n && (src[i] === ' ' || src[i] === '\t' || src[i] === '\n' || src[i] === '\r')) i++;
    }

    function currentPath() {
        let p = '$';
        for (let s = 0; s < stack.length; s++) {
            const frame = stack[s];
            if (frame.kind === 'object') {
                if (frame.lastKey != null) p = jsonPathJoin(p, frame.lastKey, false);
            } else if (frame.kind === 'array') {
                p = jsonPathJoin(p, String(frame.index), true);
            }
        }
        return p;
    }

    function parentPath() {
        let p = '$';
        for (let s = 0; s < stack.length - 1; s++) {
            const frame = stack[s];
            if (frame.kind === 'object') {
                if (frame.lastKey != null) p = jsonPathJoin(p, frame.lastKey, false);
            } else if (frame.kind === 'array') {
                p = jsonPathJoin(p, String(frame.index), true);
            }
        }
        return p;
    }

    skipWs();
    if (i >= n) return;

    while (i < n) {
        skipWs();
        if (i >= n) break;
        const c = src[i];

        if (c === '{') {
            stack.push({ kind: 'object', keys: new Map(), lastKey: null });
            expectKey = true;
            expectValue = false;
            i++;
            continue;
        }
        if (c === '}') {
            stack.pop();
            expectKey = false;
            expectValue = false;
            i++;
            // 值结束后可能有逗号
            continue;
        }
        if (c === '[') {
            stack.push({ kind: 'array', index: 0 });
            expectKey = false;
            expectValue = true;
            i++;
            continue;
        }
        if (c === ']') {
            stack.pop();
            expectKey = false;
            expectValue = false;
            i++;
            continue;
        }
        if (c === ',') {
            const top = stack[stack.length - 1];
            if (top && top.kind === 'object') {
                expectKey = true;
                expectValue = false;
                top.lastKey = null;
            } else if (top && top.kind === 'array') {
                top.index++;
                expectKey = false;
                expectValue = true;
            }
            i++;
            continue;
        }
        if (c === ':') {
            expectKey = false;
            expectValue = true;
            i++;
            continue;
        }

        const top = stack[stack.length - 1];
        if (expectKey && top && top.kind === 'object' && c === '"') {
            const keyStart = i;
            const lit = jsonReadStringLiteral(src, i);
            if (!lit) break;
            const key = lit.value;
            const path = parentPath();
            const loc = jsonIndexToLineCol(src, keyStart);
            if (key === '') {
                issues.push({
                    type: 'empty_key',
                    path: path,
                    key: '',
                    line: loc.line,
                    column: loc.column,
                    index: keyStart,
                    message:
                        '空 key：路径 ' +
                        path +
                        ' 存在空字符串键 ""（第 ' +
                        loc.line +
                        ' 行，第 ' +
                        loc.column +
                        ' 列）',
                });
            }
            if (top.keys.has(key)) {
                issues.push({
                    type: 'duplicate_key',
                    path: path,
                    key: key,
                    line: loc.line,
                    column: loc.column,
                    index: keyStart,
                    message:
                        '重复 key：路径 ' +
                        path +
                        ' 下 key "' +
                        key +
                        '" 重复出现（第 ' +
                        loc.line +
                        ' 行，第 ' +
                        loc.column +
                        ' 列）',
                });
            } else {
                top.keys.set(key, true);
            }
            top.lastKey = key;
            i = lit.end;
            expectKey = false;
            continue;
        }

        // 值：字符串
        if (c === '"') {
            const lit = jsonReadStringLiteral(src, i);
            if (!lit) break;
            i = lit.end;
            expectValue = false;
            continue;
        }

        // 值：数字
        if (c === '-' || (c >= '0' && c <= '9')) {
            i++;
            while (i < n && /[0-9eE+.\-]/.test(src[i])) i++;
            expectValue = false;
            continue;
        }

        if (src.startsWith('true', i)) {
            i += 4;
            expectValue = false;
            continue;
        }
        if (src.startsWith('false', i)) {
            i += 5;
            expectValue = false;
            continue;
        }
        if (src.startsWith('null', i)) {
            i += 4;
            expectValue = false;
            continue;
        }

        // 无法识别，中止结构扫描
        break;
    }

    // silence unused
    void expectValue;
    void currentPath;
}

/**
 * parse 失败时启发式检测未引号 / 单引号 key。
 * @param {string} src
 * @param {Array} issues
 */
function jsonScanIllegalKeyHeuristics(src, issues) {
    // 未加双引号的标识符 key：{a: 或 ,a:
    const unquotedRe = /([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g;
    let m;
    while ((m = unquotedRe.exec(src)) !== null) {
        const key = m[2];
        const index = m.index + m[1].length;
        const loc = jsonIndexToLineCol(src, index);
        issues.push({
            type: 'unquoted_key',
            path: '$',
            key: key,
            line: loc.line,
            column: loc.column,
            index: index,
            message:
                '疑似非法 key：未加双引号的 key "' +
                key +
                '"（第 ' +
                loc.line +
                ' 行，第 ' +
                loc.column +
                ' 列）',
        });
    }

    // 单引号 key：{'a': 或 ,'a':
    const singleRe = /([{,]\s*)'([^'\\]*(?:\\.[^'\\]*)*)'\s*:/g;
    while ((m = singleRe.exec(src)) !== null) {
        const key = m[2];
        const index = m.index + m[1].length;
        const loc = jsonIndexToLineCol(src, index);
        issues.push({
            type: 'single_quoted_key',
            path: '$',
            key: key,
            line: loc.line,
            column: loc.column,
            index: index,
            message:
                "疑似非法 key：使用单引号的 key '" +
                key +
                "'（第 " +
                loc.line +
                ' 行，第 ' +
                loc.column +
                ' 列）',
        });
    }
}

/**
 * 扫描 JSON 源字符串中的 key 问题（空 key、重复 key、非法 key 启发式）。
 * @param {string} sourceText
 * @returns {{ok: boolean, parseError?: string, issues: Array, summary: string}}
 */
function jsonScanKeyIssues(sourceText) {
    const src = sourceText == null ? '' : String(sourceText);
    const issues = [];
    let ok = false;
    let parseError;

    if (!src.trim()) {
        return {
            ok: false,
            parseError: '空输入',
            issues: [],
            summary: '空输入',
        };
    }

    try {
        JSON.parse(src);
        ok = true;
    } catch (e) {
        parseError = e && e.message ? e.message : String(e);
    }

    if (ok) {
        jsonScanValidKeyIssues(src, issues);
    } else {
        jsonScanIllegalKeyHeuristics(src, issues);
    }

    return {
        ok: ok,
        parseError: ok ? undefined : parseError,
        issues: issues,
        summary: jsonBuildKeyIssuesSummary(ok, issues),
    };
}

/**
 * @param {boolean} ok
 * @param {Array} issues
 * @returns {string}
 */
function jsonBuildKeyIssuesSummary(ok, issues) {
    if (!issues || !issues.length) {
        return ok ? '未发现 key 问题' : '未识别到明确的非法 key 线索';
    }
    const lines = [];
    if (ok) {
        lines.push('⚠ 语法有效，但存在 key 问题（共 ' + issues.length + ' 项）：');
    } else {
        lines.push('疑似非法 key（共 ' + issues.length + ' 项）：');
    }
    for (let i = 0; i < issues.length; i++) {
        lines.push((i + 1) + '. ' + issues[i].message);
    }
    return lines.join('\n');
}

/**
 * 生成警告摘要 HTML 块。
 * @param {{ok: boolean, issues: Array, summary: string}} scan
 * @returns {string}
 */
function jsonKeyIssuesHtml(scan) {
    const esc =
        typeof escapeHtml === 'function'
            ? escapeHtml
            : function (s) {
                  if (s === undefined || s === null) return '';
                  return String(s)
                      .replace(/&/g, '&amp;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;')
                      .replace(/"/g, '&quot;')
                      .replace(/'/g, '&#39;');
              };
    if (!scan || !scan.issues || !scan.issues.length) return '';
    let html = '<div class="json-key-issues">';
    if (scan.ok) {
        html +=
            '<div class="json-key-issues-title">⚠ 语法有效，但存在 key 问题（共 ' +
            scan.issues.length +
            ' 项）</div>';
    } else {
        html +=
            '<div class="json-key-issues-title">疑似非法 key（共 ' + scan.issues.length + ' 项）</div>';
    }
    html += '<ul class="json-key-issues-list">';
    for (let i = 0; i < scan.issues.length; i++) {
        html += '<li>' + esc(scan.issues[i].message) + '</li>';
    }
    html += '</ul></div>';
    return html;
}

function jsonSafeStatus(msg) {
    if (typeof setStatus === 'function') setStatus(msg);
}

function jsonProcess(fn) {
    const raw = document.getElementById('jsonInput').value;
    const out = document.getElementById('jsonOutput');
    if (!raw.trim()) {
        out.textContent = '请输入 JSON';
        out.className = 'output-box error';
        return;
    }
    try {
        const p = JSON.parse(raw);
        const result = fn(p);
        const scan = jsonScanKeyIssues(raw);
        // pretty/compress 后重复 key 会丢失，摘要用原始扫描；高亮对结果再扫空 key
        const resultScan = jsonScanKeyIssues(result);
        const highlightIssues = resultScan.issues.filter(function (iss) {
            return iss.type === 'empty_key';
        });
        if (scan.issues.length) {
            out.innerHTML =
                jsonKeyIssuesHtml(scan) +
                '<div class="json-hl-body">' +
                highlightJsonWithIssues(result, highlightIssues) +
                '</div>';
            out.className = 'output-box json-hl';
            jsonSafeStatus('JSON 处理成功（含 key 警告）');
        } else {
            out.innerHTML = highlightJson(result);
            out.className = 'output-box json-hl';
            jsonSafeStatus('JSON 处理成功');
        }
    } catch (e) {
        reportParseError(out, 'jsonInput', raw, e, 'JSON 解析错误');
        const scan = jsonScanKeyIssues(raw);
        if (scan.issues.length) {
            out.textContent = out.textContent + '\n\n' + scan.summary;
        }
        jsonSafeStatus('JSON 解析失败');
    }
}

function jsonFormat() {
    jsonProcess(function (v) {
        return JSON.stringify(v, null, 2);
    });
}

function jsonCompress() {
    jsonProcess(function (v) {
        return JSON.stringify(v);
    });
}

function jsonValidate() {
    const raw = document.getElementById('jsonInput').value;
    const out = document.getElementById('jsonOutput');
    if (!raw.trim()) {
        out.textContent = '请输入 JSON';
        out.className = 'output-box error';
        return;
    }
    try {
        JSON.parse(raw);
        const scan = jsonScanKeyIssues(raw);
        if (!scan.issues.length) {
            out.textContent = '✓ 有效的 JSON';
            out.className = 'output-box';
            jsonSafeStatus('JSON 有效');
        } else {
            out.innerHTML =
                jsonKeyIssuesHtml(scan) +
                '<div class="json-hl-body">' +
                highlightJsonWithIssues(raw, scan.issues) +
                '</div>';
            out.className = 'output-box json-hl';
            jsonSafeStatus('JSON 语法有效，但存在 key 问题');
        }
    } catch (e) {
        reportParseError(out, 'jsonInput', raw, e, '无效的 JSON');
        const scan = jsonScanKeyIssues(raw);
        if (scan.issues.length) {
            out.textContent = out.textContent + '\n\n' + scan.summary;
        }
        jsonSafeStatus('JSON 无效');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        highlightJson: highlightJson,
        highlightJsonWithIssues: highlightJsonWithIssues,
        jsonScanKeyIssues: jsonScanKeyIssues,
        jsonKeyIssuesHtml: jsonKeyIssuesHtml,
    };
}
