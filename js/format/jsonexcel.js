// ============================================================
// JSON ↔ Excel/CSV 批量互转
// 支持嵌套对象展平(点路径 / 数组索引)、多分隔符、多 Sheet
// ============================================================

// 分隔符与数组下标风格预设
//   arrayStyle: 'index' -> a[0].b  (默认,最直观)
//               'dot'   -> a.0.b   (统一点路径,纯字符)
//               'inline'-> a       (数组字段直接 JSON 字符串化)
const DEFAULT_SEP = '.';
const DEFAULT_ARRAY_STYLE = 'index';

// ------------------------------------------------------------
// 工具:是否为正整数字符串
// ------------------------------------------------------------
function _isIntegerKey(s) {
    return /^(0|[1-9]\d*)$/.test(s);
}

// ------------------------------------------------------------
// 解析点路径,支持 'a.b[0].c' / 'a.0.c' 两种风格
// 返回 [{key:'a', isIndex:false}, {key:'0', isIndex:true}, ...]
// ------------------------------------------------------------
function _parsePath(path, arrayStyle) {
    const out = [];
    if (!path) return out;
    let i = 0;
    const n = path.length;
    while (i < n) {
        const ch = path[i];
        if (ch === '.') {
            i++;
            continue;
        }
        if (ch === '[') {
            // 形如 [0] / ["name"]
            const close = path.indexOf(']', i);
            if (close < 0) {
                // 兜底:把整段当普通 key
                out.push({ key: path.slice(i + 1), isIndex: false });
                break;
            }
            const inner = path.slice(i + 1, close);
            if (_isIntegerKey(inner)) {
                out.push({ key: inner, isIndex: true });
            } else if (inner.startsWith('"') && inner.endsWith('"')) {
                out.push({ key: inner.slice(1, -1), isIndex: false });
            } else {
                out.push({ key: inner, isIndex: false });
            }
            i = close + 1;
            continue;
        }
        // 普通 key 段
        let j = i;
        while (j < n && path[j] !== '.' && path[j] !== '[') j++;
        const seg = path.slice(i, j);
        if (seg) {
            if (arrayStyle === 'dot' && _isIntegerKey(seg)) {
                out.push({ key: seg, isIndex: true });
            } else {
                out.push({ key: seg, isIndex: false });
            }
        }
        i = j;
    }
    return out;
}

// ------------------------------------------------------------
// 将路径段数组拼接为字符串(根据 arrayStyle)
// ------------------------------------------------------------
function _joinPath(parts, sep, arrayStyle) {
    const buf = [];
    for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (p.isIndex && arrayStyle !== 'inline') {
            if (arrayStyle === 'index') {
                buf.push('[' + p.key + ']');
            } else {
                // dot
                if (buf.length > 0) buf.push(sep);
                buf.push(p.key);
            }
        } else {
            // 非索引段(index 风格下也需要在前一段是 [N] 后用 . 衔接)
            if (buf.length > 0) buf.push(sep);
            const k = String(p.key);
            if (arrayStyle === 'index' && /[\.\[\]"]/.test(k)) {
                // index 风格:对含特殊字符的 key 用 ["..."] 方括号包裹
                buf.push('["' + k.replace(/"/g, '\\"') + '"]');
            } else if (arrayStyle !== 'index' && /[."\[\]]/.test(k)) {
                buf.push('"' + k.replace(/"/g, '\\"') + '"');
            } else {
                buf.push(k);
            }
        }
    }
    return buf.join('');
}

// ------------------------------------------------------------
// 展平对象 -> { 'a.b.c': value }
//   obj: 任意 JSON 值
//   sep: 分隔符(默认 '.')
//   arrayStyle: 'index' | 'dot' | 'inline'
//   prefix: 内部递归使用
//   seen: 循环引用检测(WeakSet)
// ------------------------------------------------------------
function flattenObject(obj, sep, arrayStyle, prefix, seen) {
    sep = sep || DEFAULT_SEP;
    arrayStyle = arrayStyle || DEFAULT_ARRAY_STYLE;
    prefix = prefix || '';
    seen = seen || new WeakSet();
    const out = {};

    if (obj === null || obj === undefined) {
        if (prefix) out[prefix] = obj;
        return out;
    }

    if (typeof obj !== 'object') {
        if (prefix) out[prefix] = obj;
        return out;
    }

    if (seen.has(obj)) {
        if (prefix) out[prefix] = '[Circular]';
        return out;
    }
    seen.add(obj);

    if (Array.isArray(obj)) {
        if (arrayStyle === 'inline') {
            if (prefix) out[prefix] = JSON.stringify(obj);
            return out;
        }
        if (obj.length === 0) {
            if (prefix) out[prefix] = [];
            return out;
        }
        obj.forEach((item, idx) => {
            const parts = _parsePath(prefix, arrayStyle);
            parts.push({ key: String(idx), isIndex: true });
            const newKey = _joinPath(parts, sep, arrayStyle);
            const sub = flattenObject(item, sep, arrayStyle, newKey, seen);
            Object.assign(out, sub);
        });
        return out;
    }

    const keys = Object.keys(obj);
    if (keys.length === 0) {
        if (prefix) out[prefix] = {};
        return out;
    }
    keys.forEach((k) => {
        const parts = prefix ? _parsePath(prefix, arrayStyle) : [];
        parts.push({ key: k, isIndex: false });
        const newKey = _joinPath(parts, sep, arrayStyle);
        const sub = flattenObject(obj[k], sep, arrayStyle, newKey, seen);
        Object.assign(out, sub);
    });

    return out;
}

// ------------------------------------------------------------
// 反展平: { 'a.b.c': value, 'a.b[0].d': value } -> 嵌套对象
// 算法:
//   1) 解析所有 key 为 parts(segments)
//   2) 扫描所有 parts,标记哪些路径节点需要是数组
//      (规则:某 segment 是 isIndex,则其直接父路径是数组)
//   3) 按深度排序后构建树,逐层创建中间节点
// ------------------------------------------------------------
function unflattenObject(flat, sep, arrayStyle) {
    sep = sep || DEFAULT_SEP;
    arrayStyle = arrayStyle || DEFAULT_ARRAY_STYLE;
    const root = {};
    if (!flat || typeof flat !== 'object') return root;

    const entries = Object.keys(flat)
        .filter((k) => flat[k] !== undefined)
        .map((k) => ({ key: k, parts: _parsePath(k, arrayStyle), value: flat[k] }))
        .sort((a, b) => a.parts.length - b.parts.length);

    // 编码路径 -> 字符串(用于集合 key)
    function encodePath(parts, upto) {
        let s = '';
        for (let i = 0; i < upto; i++) {
            s += parts[i].isIndex ? '#' + parts[i].key : '.' + parts[i].key;
        }
        return s;
    }

    // 标记所有需要是数组的路径节点
    const isArrayPath = new Set();
    for (const e of entries) {
        for (let i = 0; i < e.parts.length; i++) {
            if (e.parts[i].isIndex) {
                isArrayPath.add(encodePath(e.parts, i));
            }
        }
    }

    function pathIsArr(parts, upto) {
        return isArrayPath.has(encodePath(parts, upto));
    }

    // 获取/创建中间节点
    function getOrCreateChild(parent, seg, childIsArr) {
        if (seg.isIndex) {
            const idx = parseInt(seg.key, 10);
            // parent 必须是数组
            while (parent.length <= idx) parent.push(undefined);
            if (parent[idx] === undefined) {
                parent[idx] = childIsArr ? [] : {};
            }
            return parent[idx];
        }
        if (parent[seg.key] === undefined) {
            parent[seg.key] = childIsArr ? [] : {};
        }
        return parent[seg.key];
    }

    // 写入 leaf
    function setLeaf(parent, seg, value) {
        if (seg.isIndex) {
            const idx = parseInt(seg.key, 10);
            while (parent.length <= idx) parent.push(undefined);
            parent[idx] = value;
        } else {
            parent[seg.key] = value;
        }
    }

    for (const e of entries) {
        let cur = root;
        for (let i = 0; i < e.parts.length - 1; i++) {
            const seg = e.parts[i];
            const nextIsArr = pathIsArr(e.parts, i + 1);
            cur = getOrCreateChild(cur, seg, nextIsArr);
        }
        const leaf = e.parts[e.parts.length - 1];
        setLeaf(cur, leaf, e.value);
    }

    return root;
}

// ------------------------------------------------------------
// CSV 转义(支持自定义分隔符)
// ------------------------------------------------------------
function _csvEscape(str, sep) {
    sep = sep || ',';
    if (str === null || str === undefined) return '';
    const s = String(str);
    const needQuote = s.indexOf(sep) >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0 || s.indexOf('\r') >= 0;
    if (!needQuote) return s;
    return '"' + s.replace(/"/g, '""') + '"';
}

// ------------------------------------------------------------
// 解析 CSV 文本(支持自定义分隔符、引号转义、CRLF)
// ------------------------------------------------------------
function _parseCsv(csvStr, sep) {
    sep = sep || ',';
    const lines = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    let i = 0;
    const n = csvStr.length;

    while (i < n) {
        const ch = csvStr[i];
        if (inQuotes) {
            if (ch === '"') {
                if (csvStr[i + 1] === '"') {
                    field += '"';
                    i += 2;
                } else {
                    inQuotes = false;
                    i++;
                }
            } else {
                field += ch;
                i++;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
                i++;
            } else if (ch === sep) {
                row.push(field);
                field = '';
                i++;
            } else if (ch === '\r') {
                row.push(field);
                if (row.some((f) => f !== '')) lines.push(row);
                row = [];
                field = '';
                if (csvStr[i + 1] === '\n') i += 2;
                else i++;
            } else if (ch === '\n') {
                row.push(field);
                if (row.some((f) => f !== '')) lines.push(row);
                row = [];
                field = '';
                i++;
            } else {
                field += ch;
                i++;
            }
        }
    }
    if (field.length > 0 || row.length > 0) {
        row.push(field);
        if (row.some((f) => f !== '')) lines.push(row);
    }
    return lines;
}

// ------------------------------------------------------------
// 类型推断(尽量还原数字/布尔/null)
// ------------------------------------------------------------
function _coerce(v) {
    if (v === undefined || v === null || v === '') return v;
    const s = String(v);
    if (s === 'true') return true;
    if (s === 'false') return false;
    if (s === 'null') return null;
    if (/^-?\d+$/.test(s)) {
        const n = parseInt(s, 10);
        if (String(n) === s) return n;
    }
    if (/^-?\d+\.\d+$/.test(s)) {
        const n = parseFloat(s);
        if (!Number.isNaN(n)) return n;
    }
    return v;
}

// ------------------------------------------------------------
// JSON 数组 -> CSV 字符串
// opts: { separator, header, flatten, arrayStyle, unflattenOnRead }
// ------------------------------------------------------------
function jsonToCsv(jsonInput, opts) {
    opts = opts || {};
    const sep = opts.separator || ',';
    // 展平键的分隔符:与 CSV 分隔符解耦,默认 '.'(跨格式保持稳定)
    const keySep = opts.keySeparator || '.';
    const includeHeader = opts.header !== false;
    const doFlatten = opts.flatten !== false;
    const arrayStyle = opts.arrayStyle || DEFAULT_ARRAY_STYLE;

    const data = typeof jsonInput === 'string' ? JSON.parse(jsonInput) : jsonInput;
    if (!Array.isArray(data)) {
        throw new Error('输入必须是 JSON 数组');
    }
    if (data.length === 0) return '';

    const flatRows = doFlatten ? data.map((row) => flattenObject(row, keySep, arrayStyle)) : data;

    const keySet = new Set();
    flatRows.forEach((row) => Object.keys(row).forEach((k) => keySet.add(k)));
    const keys = Array.from(keySet);

    const out = [];
    if (includeHeader) {
        out.push(keys.map((k) => _csvEscape(k, sep)).join(sep));
    }
    flatRows.forEach((row) => {
        const cells = keys.map((k) => {
            const v = row[k];
            if (v === null || v === undefined) return '';
            if (Array.isArray(v)) return _csvEscape(v.join(';'), sep);
            if (typeof v === 'object') return _csvEscape(JSON.stringify(v), sep);
            return _csvEscape(v, sep);
        });
        out.push(cells.join(sep));
    });
    return out.join('\n');
}

// ------------------------------------------------------------
// CSV 字符串 -> JSON 字符串
// opts: { separator, header, unflatten, arrayStyle }
// ------------------------------------------------------------
function csvToJson(csvStr, opts) {
    opts = opts || {};
    const sep = opts.separator || ',';
    // 展平键的分隔符:与 CSV 分隔符解耦,默认 '.'(跨格式保持稳定)
    const keySep = opts.keySeparator || '.';
    const hasHeader = opts.header !== false;
    const doUnflatten = !!opts.unflatten;
    const arrayStyle = opts.arrayStyle || DEFAULT_ARRAY_STYLE;

    const lines = _parseCsv(csvStr, sep);
    if (lines.length === 0) return '[]';

    let headers;
    let dataLines;
    if (hasHeader) {
        headers = lines[0];
        dataLines = lines.slice(1);
    } else {
        const maxCols = Math.max.apply(
            null,
            lines.map((l) => l.length)
        );
        headers = Array.from({ length: maxCols }, (_, i) => 'column_' + (i + 1));
        dataLines = lines;
    }

    const result = dataLines.map((line) => {
        const flat = {};
        headers.forEach((h, idx) => {
            let v = line[idx] !== undefined ? line[idx] : '';
            v = _coerce(v);
            flat[h] = v;
        });
        if (doUnflatten) {
            return unflattenObject(flat, keySep, arrayStyle);
        }
        return flat;
    });
    return JSON.stringify(result, null, 2);
}

// ------------------------------------------------------------
// 解析用户输入的 JSON(可能是数组,也可能是单个对象)
//   -> [obj, ...]
// ------------------------------------------------------------
function _normalizeJsonInput(input) {
    const data = typeof input === 'string' ? JSON.parse(input) : input;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') return [data];
    throw new Error('JSON 输入必须是数组或对象');
}

// ------------------------------------------------------------
// JSON 数组 -> Excel 二进制(Uint8Array)
// 依赖:window.XLSX
// opts: { sheetName, flatten, arrayStyle }
// ------------------------------------------------------------
function jsonToXlsx(jsonInput, opts) {
    opts = opts || {};
    if (typeof XLSX === 'undefined') {
        throw new Error('SheetJS 库未加载');
    }
    const data = _normalizeJsonInput(jsonInput);
    if (data.length === 0) {
        // 空数据也生成一个空 sheet,避免 Excel 报错
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([[]]);
        XLSX.utils.book_append_sheet(wb, ws, opts.sheetName || 'Sheet1');
        return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    }

    const doFlatten = opts.flatten !== false;
    const arrayStyle = opts.arrayStyle || DEFAULT_ARRAY_STYLE;
    const rows = doFlatten ? data.map((r) => flattenObject(r, '.', arrayStyle)) : data;

    const ws = XLSX.utils.json_to_sheet(rows, { defval: '' });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, opts.sheetName || 'Sheet1');
    const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    return out;
}

// ------------------------------------------------------------
// Excel 二进制 -> JSON 数组 + sheet 列表
// opts: { sheetIndex, sheetName, flatten, arrayStyle }
// ------------------------------------------------------------
function xlsxToJson(arrayBuffer, opts) {
    opts = opts || {};
    if (typeof XLSX === 'undefined') {
        throw new Error('SheetJS 库未加载');
    }
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetNames = wb.SheetNames.slice();
    let idx = 0;
    if (opts.sheetName) {
        const i = sheetNames.indexOf(opts.sheetName);
        idx = i >= 0 ? i : 0;
    } else if (typeof opts.sheetIndex === 'number') {
        idx = Math.max(0, Math.min(sheetNames.length - 1, opts.sheetIndex));
    }
    const ws = wb.Sheets[sheetNames[idx]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (opts.unflatten) {
        const arrayStyle = opts.arrayStyle || DEFAULT_ARRAY_STYLE;
        const unflat = rows.map((r) => unflattenObject(r, '.', arrayStyle));
        return { sheetNames, sheetName: sheetNames[idx], data: unflat };
    }
    return { sheetNames, sheetName: sheetNames[idx], data: rows };
}

// ============================================================
// UI 部分
// ============================================================

let _jsePreviewLimit = 20;
let _jseXlsxWorkbook = null; // 最近一次上传的 XLSX workbook(用于多 sheet 选择)

const _JSE_SAMPLE_JSON = [
    {
        id: 1,
        name: '张三',
        age: 28,
        active: true,
        skills: ['Java', 'SQL', 'Docker'],
        address: { city: '上海', zip: '200000' },
    },
    {
        id: 2,
        name: 'Li Si',
        age: 35,
        active: false,
        skills: ['Python', 'Kafka'],
        address: { city: 'Beijing', zip: '100000' },
    },
    {
        id: 3,
        name: '王五',
        age: 42,
        active: true,
        skills: ['Go', 'K8s', 'gRPC', 'Rust'],
        address: { city: '深圳', zip: '518000' },
    },
];

const _JSE_SAMPLE_CSV =
    'id,name,age,active,skills,address.city\n' +
    '1,张三,28,true,"Java;SQL;Docker",上海\n' +
    '2,Li Si,35,false,"Python;Kafka",Beijing\n' +
    '3,王五,42,true,"Go;K8s;gRPC;Rust",深圳';

function _jseGetOpts() {
    return {
        source: document.getElementById('jseSource').value,
        target: document.getElementById('jseTarget').value,
        arrayStyle: document.getElementById('jseArrayStyle').value,
        separator: document.getElementById('jseSeparator').value,
        header: document.getElementById('jseHeader').checked,
        flatten: document.getElementById('jseFlatten').checked,
        unflatten: document.getElementById('jseUnflatten').checked,
    };
}

function _jseReadText() {
    return document.getElementById('jseInput').value;
}

function _jseWriteText(s) {
    document.getElementById('jseInput').value = s;
}

function _jseSetStatus(msg, isErr) {
    const el = document.getElementById('jseStatus');
    el.textContent = msg;
    el.style.color = isErr ? 'var(--danger)' : 'var(--text-dim)';
}

function _jseRenderPreview(rows, max) {
    const wrap = document.getElementById('jsePreview');
    if (!rows || !rows.length) {
        wrap.innerHTML =
            '<div style="padding:18px;color:var(--text-dim);font-size:12.5px;text-align:center">无数据预览</div>';
        return;
    }
    const limit = Math.min(max || _jsePreviewLimit, rows.length);
    const keySet = new Set();
    for (let i = 0; i < limit; i++) {
        Object.keys(rows[i] || {}).forEach((k) => keySet.add(k));
    }
    const keys = Array.from(keySet);
    let html = '<div style="overflow:auto;max-height:380px;border:1px solid var(--border);border-radius:6px">';
    html += '<table class="jse-table"><thead><tr>';
    html += '<th class="jse-rownum">#</th>';
    keys.forEach((k) => {
        html += '<th>' + escapeHtml(k) + '</th>';
    });
    html += '</tr></thead><tbody>';
    for (let i = 0; i < limit; i++) {
        html += '<tr><td class="jse-rownum">' + (i + 1) + '</td>';
        keys.forEach((k) => {
            const v = rows[i] ? rows[i][k] : '';
            let display = '';
            if (v === null || v === undefined) display = '';
            else if (typeof v === 'object') display = JSON.stringify(v);
            else display = String(v);
            if (display.length > 80) display = display.slice(0, 80) + '…';
            html += '<td title="' + escapeHtml(String(display)) + '">' + escapeHtml(display) + '</td>';
        });
        html += '</tr>';
    }
    html += '</tbody></table></div>';
    if (rows.length > limit) {
        html +=
            '<div style="padding:6px 10px;font-size:11.5px;color:var(--text-dim);background:var(--bg-card);border:1px solid var(--border);border-top:none;border-radius:0 0 6px 6px">显示前 ' +
            limit +
            ' 行,共 ' +
            rows.length +
            ' 行</div>';
    }
    wrap.innerHTML = html;
}

// 主入口:根据源/目标格式互转
async function jseConvert() {
    const opts = _jseGetOpts();
    const src = opts.source;
    const tgt = opts.target;
    const inputText = _jseReadText();

    try {
        if (src === tgt) {
            _jseSetStatus('源与目标格式相同,无需转换', false);
            // 即便同格式也尝试预览
            _jsePreviewFromInput(src, inputText);
            return;
        }

        // JSON -> CSV
        if (src === 'json' && tgt === 'csv') {
            const csv = jsonToCsv(inputText, {
                separator: opts.separator,
                header: opts.header,
                flatten: opts.flatten,
                arrayStyle: opts.arrayStyle,
            });
            _jseWriteText(csv);
            const data = JSON.parse(inputText);
            const arr = Array.isArray(data) ? data : [data];
            _jseRenderPreview(arr, _jsePreviewLimit);
            _jseSetStatus('JSON → CSV 完成,共 ' + arr.length + ' 行', false);
            return;
        }

        // CSV -> JSON
        if (src === 'csv' && tgt === 'json') {
            const out = csvToJson(inputText, {
                separator: opts.separator,
                header: opts.header,
                unflatten: opts.unflatten,
                arrayStyle: opts.arrayStyle,
            });
            _jseWriteText(out);
            const arr = JSON.parse(out);
            _jseRenderPreview(arr, _jsePreviewLimit);
            _jseSetStatus('CSV → JSON 完成,共 ' + arr.length + ' 行', false);
            return;
        }

        // JSON -> Excel
        if (src === 'json' && tgt === 'xlsx') {
            await jseEnsureLib();
            const buf = jsonToXlsx(inputText, {
                flatten: opts.flatten,
                arrayStyle: opts.arrayStyle,
            });
            _jseSetDownloadBuffer(buf, 'application/output.xlsx');
            const data = JSON.parse(inputText);
            const arr = Array.isArray(data) ? data : [data];
            _jseRenderPreview(arr, _jsePreviewLimit);
            _jseSetStatus('JSON → Excel 完成,共 ' + arr.length + ' 行,点击下载获取 .xlsx', false);
            return;
        }

        // Excel -> JSON
        if (src === 'xlsx' && tgt === 'json') {
            await jseEnsureLib();
            if (!_jseXlsxWorkbook) {
                throw new Error('请先上传 Excel 文件');
            }
            const sheetName = _jseCurrentSheetName();
            const result = xlsxToJson(_jseXlsxWorkbook, {
                sheetName: sheetName,
                unflatten: opts.unflatten,
                arrayStyle: opts.arrayStyle,
            });
            const jsonStr = JSON.stringify(result.data, null, 2);
            _jseWriteText(jsonStr);
            _jseRenderPreview(result.data, _jsePreviewLimit);
            _jseSetStatus('Excel → JSON 完成,Sheet「' + result.sheetName + '」共 ' + result.data.length + ' 行', false);
            return;
        }

        // CSV -> Excel
        if (src === 'csv' && tgt === 'xlsx') {
            await jseEnsureLib();
            // 先 csv -> json(展平保留),再 json -> xlsx
            const jsonStr = csvToJson(inputText, {
                separator: opts.separator,
                header: opts.header,
                unflatten: opts.unflatten,
                arrayStyle: opts.arrayStyle,
            });
            const buf = jsonToXlsx(jsonStr, { flatten: false });
            _jseSetDownloadBuffer(buf, 'application/output.xlsx');
            const arr = JSON.parse(jsonStr);
            _jseRenderPreview(arr, _jsePreviewLimit);
            _jseSetStatus('CSV → Excel 完成,共 ' + arr.length + ' 行,点击下载获取 .xlsx', false);
            return;
        }

        // Excel -> CSV
        if (src === 'xlsx' && tgt === 'csv') {
            await jseEnsureLib();
            if (!_jseXlsxWorkbook) {
                throw new Error('请先上传 Excel 文件');
            }
            const sheetName = _jseCurrentSheetName();
            const result = xlsxToJson(_jseXlsxWorkbook, {
                sheetName: sheetName,
                unflatten: opts.unflatten,
                arrayStyle: opts.arrayStyle,
            });
            const csv = jsonToCsv(result.data, {
                separator: opts.separator,
                header: opts.header,
                flatten: false,
            });
            _jseWriteText(csv);
            _jseRenderPreview(result.data, _jsePreviewLimit);
            _jseSetStatus('Excel → CSV 完成,Sheet「' + result.sheetName + '」共 ' + result.data.length + ' 行', false);
            return;
        }

        _jseSetStatus('暂不支持的格式组合: ' + src + ' → ' + tgt, true);
    } catch (e) {
        _jseSetStatus('转换失败: ' + e.message, true);
    }
}

// 把当前输入按 src 格式解析并预览(不修改文本)
function _jsePreviewFromInput(src, inputText) {
    try {
        if (src === 'json') {
            const data = JSON.parse(inputText || '[]');
            const arr = Array.isArray(data) ? data : [data];
            _jseRenderPreview(arr, _jsePreviewLimit);
        } else if (src === 'csv') {
            const lines = _parseCsv(inputText || '', ',');
            if (!lines.length) {
                _jseRenderPreview([], _jsePreviewLimit);
                return;
            }
            const headers = lines[0];
            const arr = lines.slice(1).map((line) => {
                const o = {};
                headers.forEach((h, i) => {
                    o[h] = line[i] !== undefined ? line[i] : '';
                });
                return o;
            });
            _jseRenderPreview(arr, _jsePreviewLimit);
        } else if (src === 'xlsx') {
            _jseSetStatus('Excel 源需先上传文件', false);
        }
    } catch (e) {
        _jseSetStatus('预览失败: ' + e.message, true);
    }
}

// 懒加载 XLSX
async function jseEnsureLib() {
    if (typeof XLSX !== 'undefined') return;
    if (typeof loadLib !== 'function') {
        throw new Error('loadLib 不可用');
    }
    await loadLib('xlsx.min.js');
}

// 当前 Sheet 名(若只有 1 个则直接取)
function _jseCurrentSheetName() {
    if (!_jseXlsxWorkbook) return null;
    const sel = document.getElementById('jseSheet');
    if (sel && sel.options.length > 0) {
        return sel.value;
    }
    return _jseXlsxWorkbook.SheetNames[0];
}

// 写入当前可下载的 buffer
function _jseSetDownloadBuffer(uint8, filename) {
    _jsePendingDownload = { data: uint8, name: filename };
    const btn = document.getElementById('jseDownloadBtn');
    if (btn) {
        btn.style.display = '';
        btn.textContent = '下载 ' + filename;
    }
}

let _jsePendingDownload = null;

function jseDownload() {
    if (!_jsePendingDownload) {
        toast('暂无可下载内容,请先执行转换');
        return;
    }
    const { data, name } = _jsePendingDownload;
    const blob = new Blob([data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name || 'output.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('已下载 ' + (name || 'output.xlsx'));
}

function jseCopy() {
    const ta = document.getElementById('jseInput');
    if (!ta.value) {
        toast('没有内容可复制');
        return;
    }
    copyText('jseInput');
}

function jseClear() {
    document.getElementById('jseInput').value = '';
    _jsePendingDownload = null;
    _jseXlsxWorkbook = null;
    const btn = document.getElementById('jseDownloadBtn');
    if (btn) btn.style.display = 'none';
    const sel = document.getElementById('jseSheet');
    if (sel) {
        sel.innerHTML = '';
        sel.style.display = 'none';
    }
    _jseRenderPreview([], _jsePreviewLimit);
    _jseSetStatus('已清空', false);
}

function jseLoadSample() {
    const opts = _jseGetOpts();
    if (opts.source === 'csv') {
        _jseWriteText(_JSE_SAMPLE_CSV);
        _jsePreviewFromInput('csv', _JSE_SAMPLE_CSV);
        _jseSetStatus('已加载 CSV 示例', false);
    } else {
        const s = JSON.stringify(_JSE_SAMPLE_JSON, null, 2);
        _jseWriteText(s);
        _jseRenderPreview(_JSE_SAMPLE_JSON, _jsePreviewLimit);
        _jseSetStatus('已加载 JSON 示例', false);
    }
}

// 文件上传
function jseOnFile(file) {
    if (!file) return;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const reader = new FileReader();
    reader.onerror = () => {
        _jseSetStatus('文件读取失败', true);
    };
    if (ext === 'xlsx' || ext === 'xls' || ext === 'xlsm' || ext === 'xlsb') {
        reader.onload = async () => {
            try {
                await jseEnsureLib();
                const buf = reader.result;
                _jseXlsxWorkbook = XLSX.read(buf, { type: 'array' });
                _jseFillSheetSelect(_jseXlsxWorkbook.SheetNames);
                // 自动预览第一个 sheet
                const firstData = XLSX.utils.sheet_to_json(_jseXlsxWorkbook.Sheets[_jseXlsxWorkbook.SheetNames[0]], {
                    defval: '',
                });
                _jseRenderPreview(firstData, _jsePreviewLimit);
                _jseSetStatus('已加载 ' + file.name + ' · ' + _jseXlsxWorkbook.SheetNames.length + ' 个 Sheet', false);
            } catch (e) {
                _jseSetStatus('Excel 解析失败: ' + e.message, true);
            }
        };
        reader.readAsArrayBuffer(file);
    } else if (ext === 'csv' || ext === 'txt' || ext === 'tsv') {
        reader.onload = () => {
            const text = String(reader.result || '');
            // 根据扩展推断分隔符
            const sep = ext === 'tsv' ? '\t' : document.getElementById('jseSeparator').value || ',';
            // 临时设置分隔符(只影响本次预览)
            const origSep = document.getElementById('jseSeparator').value;
            document.getElementById('jseSeparator').value = sep;
            _jseWriteText(text);
            _jsePreviewFromInput('csv', text);
            document.getElementById('jseSeparator').value = origSep;
            _jseSetStatus('已加载 ' + file.name, false);
        };
        reader.readAsText(file, 'utf-8');
    } else if (ext === 'json') {
        reader.onload = () => {
            const text = String(reader.result || '');
            _jseWriteText(text);
            try {
                const data = JSON.parse(text);
                const arr = Array.isArray(data) ? data : [data];
                _jseRenderPreview(arr, _jsePreviewLimit);
                _jseSetStatus('已加载 ' + file.name, false);
            } catch (e) {
                _jseSetStatus('JSON 解析失败: ' + e.message, true);
            }
        };
        reader.readAsText(file, 'utf-8');
    } else {
        _jseSetStatus('不支持的文件类型: ' + ext, true);
    }
}

function _jseFillSheetSelect(names) {
    const sel = document.getElementById('jseSheet');
    if (!sel) return;
    if (!names || names.length <= 1) {
        sel.innerHTML = '';
        sel.style.display = 'none';
        return;
    }
    sel.innerHTML = names.map((n) => '<option value="' + escapeHtml(n) + '">' + escapeHtml(n) + '</option>').join('');
    sel.style.display = '';
}

function jseOnSheetChange() {
    if (!_jseXlsxWorkbook) return;
    const name = document.getElementById('jseSheet').value;
    if (!name) return;
    try {
        const data = XLSX.utils.sheet_to_json(_jseXlsxWorkbook.Sheets[name], { defval: '' });
        _jseRenderPreview(data, _jsePreviewLimit);
        _jseSetStatus('已切换到 Sheet「' + name + '」共 ' + data.length + ' 行', false);
    } catch (e) {
        _jseSetStatus('Sheet 切换失败: ' + e.message, true);
    }
}

// 切换源格式时调整 UI(分隔符显隐、文件提示等)
function jseOnSourceChange() {
    const src = document.getElementById('jseSource').value;
    const sepWrap = document.getElementById('jseSepWrap');
    const sheetWrap = document.getElementById('jseSheetWrap');
    // CSV 目标/源时显示分隔符
    const needsSep = src === 'csv' || document.getElementById('jseTarget').value === 'csv';
    if (sepWrap) sepWrap.style.display = needsSep ? '' : 'none';
    // XLSX 源时显示 sheet 选择
    if (sheetWrap) sheetWrap.style.display = src === 'xlsx' ? '' : 'none';
}

function jseInit() {
    const ta = document.getElementById('jseInput');
    const fileInput = document.getElementById('jseFile');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const f = e.target.files && e.target.files[0];
            if (f) jseOnFile(f);
            fileInput.value = '';
        });
    }
    // 拖拽上传
    const dropZone = document.getElementById('jseDropZone');
    if (dropZone) {
        ['dragenter', 'dragover'].forEach((ev) =>
            dropZone.addEventListener(ev, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.add('drag-over');
            })
        );
        ['dragleave', 'drop'].forEach((ev) =>
            dropZone.addEventListener(ev, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.remove('drag-over');
            })
        );
        dropZone.addEventListener('drop', (e) => {
            const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
            if (f) jseOnFile(f);
        });
    }
    // 输入变化实时预览
    if (ta) {
        const handler = debounce(() => {
            const src = document.getElementById('jseSource').value;
            if (src !== 'xlsx') _jsePreviewFromInput(src, ta.value);
        }, 200);
        ta.addEventListener('input', handler);
    }
    // 选项变化
    ['jseSource', 'jseTarget', 'jseSeparator', 'jseHeader', 'jseFlatten', 'jseArrayStyle', 'jseUnflatten'].forEach(
        (id) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('change', jseOnSourceChange);
        }
    );
    // 默认加载示例,便于演示
    if (ta && !ta.value) {
        jseLoadSample();
    }
    jseOnSourceChange();
}

// ============================================================
// Node 测试导出(纯函数)
// Excel 相关在浏览器中通过 window.XLSX 访问,Node 测试跳过
// ============================================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        flattenObject,
        unflattenObject,
        jsonToCsv,
        csvToJson,
        jsonToXlsx,
        xlsxToJson,
        _parsePath,
        _joinPath,
        _parseCsv,
        _csvEscape,
        _coerce,
    };
}

if (typeof registerInit === 'function') {
    registerInit('jsonexcel', jseInit);
}
