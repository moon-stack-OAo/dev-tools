/**
 * 对已格式化/压缩的 JSON 文本做 token 着色，返回 HTML 字符串。
 * 先转义再包 span，异常时降级为转义纯文本。
 * @param {string} text
 * @returns {string}
 */
function highlightJson(text) {
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
                    emit('json-key', str);
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
        out.innerHTML = highlightJson(result);
        out.className = 'output-box json-hl';
        setStatus('JSON 处理成功');
    } catch (e) {
        reportParseError(out, 'jsonInput', raw, e, 'JSON 解析错误');
        setStatus('JSON 解析失败');
    }
}

function jsonFormat() {
    jsonProcess((v) => JSON.stringify(v, null, 2));
}

function jsonCompress() {
    jsonProcess((v) => JSON.stringify(v));
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
        out.textContent = '✓ 有效的 JSON';
        out.className = 'output-box';
        setStatus('JSON 有效');
    } catch (e) {
        reportParseError(out, 'jsonInput', raw, e, '无效的 JSON');
        setStatus('JSON 无效');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { highlightJson };
}
