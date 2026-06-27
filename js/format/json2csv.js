// JSON 转 CSV
function jsonToCsv(jsonStr, options) {
    options = options || {};
    const includeHeader = options.header !== false;
    const pretty = options.pretty !== false;

    let data;
    try {
        data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    } catch (e) {
        throw new Error('JSON 解析失败: ' + e.message);
    }

    if (!Array.isArray(data)) {
        throw new Error('输入必须是 JSON 数组');
    }

    if (data.length === 0) {
        return '';
    }

    // 展平嵌套对象
    const flatData = data.map((item) => flattenObject(item));

    // 收集所有键
    const keys = new Set();
    flatData.forEach((item) => {
        Object.keys(item).forEach((key) => keys.add(key));
    });
    const headers = Array.from(keys);

    // 生成 CSV
    const lines = [];

    // 表头
    if (includeHeader) {
        lines.push(headers.map((h) => csvEscape(h)).join(','));
    }

    // 数据行
    flatData.forEach((item) => {
        const row = headers.map((header) => {
            const value = item[header];
            if (value === null || value === undefined) {
                return '';
            }
            if (Array.isArray(value)) {
                return csvEscape(value.join(';'));
            }
            return csvEscape(String(value));
        });
        lines.push(row.join(','));
    });

    return lines.join('\n');
}

// CSV 转 JSON
function csvToJson(csvStr, options) {
    options = options || {};
    const hasHeader = options.header !== false;
    const pretty = options.pretty !== false;

    const lines = parseCsvLines(csvStr);
    if (lines.length === 0) {
        return '[]';
    }

    let headers;
    let dataLines;

    if (hasHeader) {
        headers = lines[0];
        dataLines = lines.slice(1);
    } else {
        // 生成默认表头
        const maxCols = Math.max(...lines.map((l) => l.length));
        headers = Array.from({ length: maxCols }, (_, i) => 'column_' + (i + 1));
        dataLines = lines;
    }

    const result = dataLines.map((line) => {
        const obj = {};
        headers.forEach((header, index) => {
            let value = line[index] || '';
            // 尝试转换类型
            if (value === 'true') value = true;
            else if (value === 'false') value = false;
            else if (value === 'null') value = null;
            else if (/^-?\d+$/.test(value)) value = parseInt(value);
            else if (/^-?\d+\.\d+$/.test(value)) value = parseFloat(value);

            // 还原嵌套结构
            setNestedValue(obj, header, value);
        });
        return obj;
    });

    return pretty ? JSON.stringify(result, null, 2) : JSON.stringify(result);
}

// 展平对象
function flattenObject(obj, prefix) {
    prefix = prefix || '';
    const result = {};

    for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? prefix + '.' + key : key;

        if (value === null || value === undefined) {
            result[newKey] = value;
        } else if (Array.isArray(value)) {
            result[newKey] = value.map((item) => (typeof item === 'object' ? JSON.stringify(item) : item));
        } else if (typeof value === 'object') {
            Object.assign(result, flattenObject(value, newKey));
        } else {
            result[newKey] = value;
        }
    }

    return result;
}

// 设置嵌套值
function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!(key in current) || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }

    current[keys[keys.length - 1]] = value;
}

// CSV 转义
function csvEscape(str) {
    if (str === null || str === undefined) return '';
    str = String(str);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

// 解析 CSV 行
function parseCsvLines(csvStr) {
    const lines = [];
    let current = [];
    let field = '';
    let inQuotes = false;
    let i = 0;

    while (i < csvStr.length) {
        const char = csvStr[i];
        const nextChar = csvStr[i + 1];

        if (inQuotes) {
            if (char === '"') {
                if (nextChar === '"') {
                    field += '"';
                    i += 2;
                } else {
                    inQuotes = false;
                    i++;
                }
            } else {
                field += char;
                i++;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
                i++;
            } else if (char === ',') {
                current.push(field.trim());
                field = '';
                i++;
            } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
                current.push(field.trim());
                if (current.some((f) => f !== '')) {
                    lines.push(current);
                }
                current = [];
                field = '';
                i += char === '\r' ? 2 : 1;
            } else if (char === '\r') {
                current.push(field.trim());
                if (current.some((f) => f !== '')) {
                    lines.push(current);
                }
                current = [];
                field = '';
                i++;
            } else {
                field += char;
                i++;
            }
        }
    }

    // 处理最后一个字段
    if (field || current.length > 0) {
        current.push(field.trim());
        if (current.some((f) => f !== '')) {
            lines.push(current);
        }
    }

    return lines;
}

// 界面按钮：JSON → CSV
function json2csvConvert() {
    const input = document.getElementById('json2csvInput').value;
    const output = document.getElementById('json2csvOutput');
    const header = document.getElementById('json2csvHeader').checked;
    const pretty = document.getElementById('json2csvPretty').checked;

    if (!input.trim()) {
        output.value = '请输入 JSON 数据';
        return;
    }

    try {
        const result = jsonToCsv(input, { header: header, pretty: pretty });
        output.value = result;
        setStatus('转换成功');
    } catch (e) {
        output.value = '转换失败: ' + e.message;
    }
}

// 界面按钮：CSV → JSON
function csv2jsonConvert() {
    const input = document.getElementById('json2csvInput').value;
    const output = document.getElementById('json2csvOutput');
    const header = document.getElementById('json2csvHeader').checked;
    const pretty = document.getElementById('json2csvPretty').checked;

    if (!input.trim()) {
        output.value = '请输入 CSV 数据';
        return;
    }

    try {
        const result = csvToJson(input, { header: header, pretty: pretty });
        output.value = result;
        setStatus('转换成功');
    } catch (e) {
        output.value = '转换失败: ' + e.message;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { jsonToCsv, csvToJson };
}
