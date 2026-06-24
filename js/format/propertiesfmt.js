// ============================================================
// Properties 解析（支持 Java Properties 规范）
// ============================================================

function decodeUnicodeEscape(s) {
    return s.replace(/\\u([0-9a-fA-F]{4})/g, function (_, hex) {
        return String.fromCharCode(parseInt(hex, 16));
    });
}

function encodeUnicodeEscape(s) {
    return s.replace(/[^\x20-\x7E]/g, function (c) {
        return '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0');
    });
}

function parseProperties(text) {
    const lines = (text || '').split(/\r?\n/);
    const map = new Map();
    const order = [];
    const duplicates = [];
    const comments = [];
    let buffer = null;
    let bufferStartLine = 0;
    let lineNo = 0;

    function flushBuffer(finalLine, finalLineNo) {
        if (buffer === null) return;
        const line = buffer + (finalLine || '');
        const trimmed = line.trim();

        if (!trimmed) {
            comments.push({ lineNo: finalLineNo, type: 'blank', raw: line });
            buffer = null;
            return;
        }

        if (trimmed.startsWith('#') || trimmed.startsWith('!')) {
            comments.push({ lineNo: finalLineNo, type: 'comment', raw: line });
            buffer = null;
            return;
        }

        const sepMatch = line.match(/^([^:=\s][^:=]*?)\s*[:=\s]\s*(.*)$/);
        if (!sepMatch) {
            buffer = null;
            return;
        }
        let key = sepMatch[1].trim();
        let value = sepMatch[2] || '';
        value = value.replace(/\\([\s\\:=])/g, '$1');

        key = decodeUnicodeEscape(key);
        value = decodeUnicodeEscape(value);

        if (map.has(key)) {
            const existing = duplicates.find(function (d) { return d.key === key; });
            const origLine = map.get('_line_' + key);
            if (existing) {
                existing.lines.push(finalLineNo);
            } else {
                duplicates.push({ key: key, lines: [origLine, finalLineNo] });
            }
        }
        map.set(key, value);
        map.set('_line_' + key, finalLineNo);
        if (order.indexOf(key) === -1) order.push(key);
        buffer = null;
    }

    for (const raw of lines) {
        lineNo++;
        if (buffer !== null) {
            if (raw.endsWith('\\')) {
                buffer += raw.slice(0, -1);
                continue;
            } else {
                buffer += raw;
                flushBuffer('', lineNo);
                continue;
            }
        }
        if (raw.endsWith('\\')) {
            buffer = raw.slice(0, -1);
            bufferStartLine = lineNo;
            continue;
        }
        buffer = raw;
        flushBuffer('', lineNo);
    }
    if (buffer !== null) {
        flushBuffer('', lineNo);
    }

    return { map: map, order: order, duplicates: duplicates, comments: comments };
}

// 扁平 Map → 嵌套对象
function nestProperties(flatMap, order) {
    const nested = {};
    order.forEach(function (key) {
        const value = flatMap.get(key);
        if (!key.includes('.')) {
            nested[key] = value;
            return;
        }
        const parts = key.split('.');
        let cur = nested;
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (typeof cur[part] !== 'object' || cur[part] === null || Array.isArray(cur[part])) {
                cur[part] = {};
            }
            cur = cur[part];
        }
        cur[parts[parts.length - 1]] = value;
    });
    return nested;
}

// 嵌套对象 → 扁平 key 数组
function flattenYAML(obj, prefix, result) {
    result = result || [];
    if (obj === null || obj === undefined) {
        result.push([prefix, '']);
        return result;
    }
    if (Array.isArray(obj)) {
        obj.forEach(function (v, i) {
            const newKey = prefix + '[' + i + ']';
            if (v && typeof v === 'object') {
                flattenYAML(v, newKey, result);
            } else {
                result.push([newKey, String(v)]);
            }
        });
        return result;
    }
    if (typeof obj === 'object') {
        Object.keys(obj).forEach(function (k) {
            const newKey = prefix ? prefix + '.' + k : k;
            const v = obj[k];
            if (v && typeof v === 'object' && !Array.isArray(v)) {
                flattenYAML(v, newKey, result);
            } else if (Array.isArray(v)) {
                v.forEach(function (item, i) {
                    const arrKey = newKey + '[' + i + ']';
                    if (item && typeof item === 'object') {
                        flattenYAML(item, arrKey, result);
                    } else {
                        result.push([arrKey, String(item)]);
                    }
                });
            } else {
                result.push([newKey, v === null || v === undefined ? '' : String(v)]);
            }
        });
        return result;
    }
    result.push([prefix, String(obj)]);
    return result;
}

// YAML 字符串 → Properties 字符串
function yamlToProperties(yamlText, options) {
    options = options || {};
    let obj;
    try {
        obj = jsyaml.load(yamlText);
    } catch (e) {
        throw new Error('YAML 解析失败: ' + e.message);
    }
    if (obj === null || obj === undefined) return '';
    if (typeof obj !== 'object') {
        return (options.useUnicode ? encodeUnicodeEscape(String(obj)) : String(obj));
    }
    const flat = flattenYAML(obj, '');
    return flat.map(function (pair) {
        let value = pair[1];
        if (options.useUnicode) {
            value = encodeUnicodeEscape(value);
        } else {
            value = value.replace(/\\/g, '\\\\').replace(/=/g, '\\=').replace(/#/g, '\\#').replace(/!/g, '\\!').replace(/\n/g, '\\n');
        }
        return pair[0] + '=' + value;
    }).join('\n');
}

// Properties 字符串 → YAML 字符串
function propertiesToYaml(propText, options) {
    options = options || {};
    const parsed = parseProperties(propText);
    const useUnicode = options.useUnicode;
    const data = parsed.map;
    const order = parsed.order;

    const transformed = {};
    order.forEach(function (key) {
        let v = data.get(key);
        if (useUnicode) {
            v = encodeUnicodeEscape(v);
        }
        if (v === 'true') transformed[key] = true;
        else if (v === 'false') transformed[key] = false;
        else if (v === 'null' || v === '') transformed[key] = null;
        else if (/^-?\d+$/.test(v)) transformed[key] = parseInt(v, 10);
        else if (/^-?\d+\.\d+$/.test(v)) transformed[key] = parseFloat(v);
        else transformed[key] = v;
    });

    const nested = nestProperties(transformed, order);
    return jsyaml.dump(nested, { indent: 2, lineWidth: -1, noRefs: true });
}

// ============================================================
// UI 处理
// ============================================================

let _propDirection = 'toYaml';

function propToYAML() {
    _propDirection = 'toYaml';
    updatePropLabels();
    const input = document.getElementById('propInput').value;
    const out = document.getElementById('propOutput');
    const useUnicode = document.getElementById('propUnicode').checked;
    try {
        const yaml = propertiesToYaml(input, { useUnicode: useUnicode });
        out.value = yaml;
        out.classList.remove('error');
        setStatus('Properties → YAML 转换成功');
        showPropWarning(input, 'toYaml');
        updatePropStats('toYaml', input, yaml);
    } catch (e) {
        out.value = '';
        out.classList.add('error');
        setStatus('转换失败: ' + e.message);
    }
}

function propToProperties() {
    _propDirection = 'toProps';
    updatePropLabels();
    const input = document.getElementById('propInput').value;
    const out = document.getElementById('propOutput');
    const useUnicode = document.getElementById('propUnicode').checked;
    try {
        const props = yamlToProperties(input, { useUnicode: useUnicode });
        out.value = props;
        out.classList.remove('error');
        setStatus('YAML → Properties 转换成功');
        hidePropWarning();
        updatePropStats('toProps', input, props);
    } catch (e) {
        out.value = '';
        out.classList.add('error');
        setStatus('转换失败: ' + e.message);
    }
}

function updatePropLabels() {
    const inputLabel = document.getElementById('propInputLabel');
    const outputLabel = document.getElementById('propOutputLabel');
    if (_propDirection === 'toYaml') {
        inputLabel.textContent = 'Properties 输入';
        outputLabel.textContent = 'YAML 输出';
    } else {
        inputLabel.textContent = 'YAML 输入';
        outputLabel.textContent = 'Properties 输出';
    }
}

function showPropWarning(text, direction) {
    const warn = document.getElementById('propWarning');
    if (direction !== 'toYaml') {
        warn.style.display = 'none';
        return;
    }
    const parsed = parseProperties(text);
    if (parsed.duplicates.length === 0) {
        warn.style.display = 'none';
        return;
    }
    const lines = parsed.duplicates.map(function (d) {
        return '<strong>' + d.key.replace(/</g, '&lt;') + '</strong> (第 ' + d.lines.join('、') + ' 行)';
    }).join('；');
    warn.innerHTML = '<i class="bi bi-exclamation-triangle"></i> 检测到 ' + parsed.duplicates.length + ' 个重复键：' + lines;
    warn.style.display = '';
}

function hidePropWarning() {
    document.getElementById('propWarning').style.display = 'none';
}

function updatePropStats(direction, input, output) {
    const stats = document.getElementById('propStats');
    if (direction === 'toYaml') {
        const parsed = parseProperties(input);
        const propsCount = parsed.order.length;
        const yamlLines = output.split('\n').length;
        stats.textContent = '解析 ' + propsCount + ' 个键 → 生成 ' + yamlLines + ' 行 YAML';
    } else {
        const propsLines = output.split('\n').filter(function (l) { return l.trim(); }).length;
        stats.textContent = '生成 ' + propsLines + ' 行 Properties';
    }
}

function propSwap() {
    const input = document.getElementById('propInput');
    const output = document.getElementById('propOutput');
    const tmp = input.value;
    input.value = output.value;
    output.value = tmp;
    _propDirection = _propDirection === 'toYaml' ? 'toProps' : 'toYaml';
    updatePropLabels();
    if (_propDirection === 'toYaml') {
        propToYAML();
    } else {
        propToProperties();
    }
    setStatus('已交换并重新转换');
}

function propClear() {
    document.getElementById('propInput').value = '';
    document.getElementById('propOutput').value = '';
    document.getElementById('propOutput').classList.remove('error');
    hidePropWarning();
    document.getElementById('propStats').textContent = '';
    setStatus('已清空');
}
