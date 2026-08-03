// Java DateTimeFormatter 模式试算（浏览器模拟）

var JTF_WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var JTF_WEEKDAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * 解析日期输入：空→当前；ISO；yyyy-MM-dd[ HH:mm:ss[.SSS]]
 * @param {string} dateInput
 * @returns {{ ok: boolean, date?: Date, msg?: string }}
 */
function jtfParseDateInput(dateInput) {
    if (dateInput == null || String(dateInput).trim() === '') {
        return { ok: true, date: new Date() };
    }
    var s = String(dateInput).trim();
    // ISO 或带 T
    var iso = Date.parse(s);
    if (!isNaN(iso) && (/T/.test(s) || /Z$/i.test(s) || /[+-]\d{2}:?\d{2}$/.test(s) || /^\d{4}-\d{2}-\d{2}$/.test(s))) {
        return { ok: true, date: new Date(iso) };
    }
    // yyyy-MM-dd HH:mm:ss[.SSS]
    var m = s.match(
        /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2})(?:\.(\d{1,3}))?)?)?$/,
    );
    if (m) {
        var y = parseInt(m[1], 10);
        var mo = parseInt(m[2], 10) - 1;
        var d = parseInt(m[3], 10);
        var h = m[4] != null ? parseInt(m[4], 10) : 0;
        var mi = m[5] != null ? parseInt(m[5], 10) : 0;
        var se = m[6] != null ? parseInt(m[6], 10) : 0;
        var ms = m[7] != null ? parseInt((m[7] + '000').slice(0, 3), 10) : 0;
        var dt = new Date(y, mo, d, h, mi, se, ms);
        if (isNaN(dt.getTime())) return { ok: false, msg: '日期无效' };
        return { ok: true, date: dt };
    }
    // 时间戳毫秒/秒
    if (/^\d{10}$/.test(s)) {
        return { ok: true, date: new Date(parseInt(s, 10) * 1000) };
    }
    if (/^\d{13}$/.test(s)) {
        return { ok: true, date: new Date(parseInt(s, 10)) };
    }
    if (!isNaN(iso)) {
        return { ok: true, date: new Date(iso) };
    }
    return { ok: false, msg: '无法解析日期，请用 ISO 或 yyyy-MM-dd HH:mm:ss' };
}

function jtfPad(n, len) {
    var s = String(Math.abs(n));
    while (s.length < len) s = '0' + s;
    return (n < 0 ? '-' : '') + s;
}

/**
 * 用模拟 DateTimeFormatter 格式化
 * @param {string} pattern
 * @param {string} [dateInput]
 * @param {{ timezoneOffsetMin?: number }} [options]
 * @returns {{ ok: boolean, result?: string, msg?: string }}
 */
function javaTimeFmtFormat(pattern, dateInput, options) {
    if (pattern == null || String(pattern).trim() === '') {
        return { ok: false, msg: '请输入 pattern' };
    }
    var pat = String(pattern);
    var parsed = jtfParseDateInput(dateInput);
    if (!parsed.ok) return { ok: false, msg: parsed.msg };
    var date = parsed.date;
    options = options || {};

    // 可选固定时区偏移（分钟，东为正），用于测试可重复
    var useOffset = typeof options.timezoneOffsetMin === 'number';
    var y;
    var M;
    var d;
    var H;
    var m;
    var s;
    var S;
    var day;
    var offsetMin;
    if (useOffset) {
        offsetMin = options.timezoneOffsetMin;
        var utc = date.getTime() + date.getTimezoneOffset() * 60000;
        var local = new Date(utc + offsetMin * 60000);
        y = local.getFullYear();
        M = local.getMonth() + 1;
        d = local.getDate();
        H = local.getHours();
        m = local.getMinutes();
        s = local.getSeconds();
        S = local.getMilliseconds();
        day = local.getDay();
    } else {
        y = date.getFullYear();
        M = date.getMonth() + 1;
        d = date.getDate();
        H = date.getHours();
        m = date.getMinutes();
        s = date.getSeconds();
        S = date.getMilliseconds();
        day = date.getDay();
        offsetMin = -date.getTimezoneOffset();
    }

    var h12 = H % 12;
    if (h12 === 0) h12 = 12;
    var ampm = H < 12 ? 'AM' : 'PM';

    try {
        var result = jtfApplyPattern(pat, {
            y: y,
            M: M,
            d: d,
            H: H,
            h: h12,
            m: m,
            s: s,
            S: S,
            a: ampm,
            day: day,
            offsetMin: offsetMin,
        });
        return { ok: true, result: result };
    } catch (e) {
        return { ok: false, msg: e.message || String(e) };
    }
}

/**
 * @param {string} pattern
 * @param {object} parts
 * @returns {string}
 */
function jtfApplyPattern(pattern, parts) {
    var out = '';
    var i = 0;
    while (i < pattern.length) {
        var c = pattern.charAt(i);
        // 单引号字面量
        if (c === "'") {
            if (pattern.charAt(i + 1) === "'") {
                out += "'";
                i += 2;
                continue;
            }
            var j = i + 1;
            var lit = '';
            while (j < pattern.length) {
                if (pattern.charAt(j) === "'") {
                    if (pattern.charAt(j + 1) === "'") {
                        lit += "'";
                        j += 2;
                        continue;
                    }
                    break;
                }
                lit += pattern.charAt(j);
                j++;
            }
            if (j >= pattern.length && pattern.charAt(pattern.length - 1) !== "'") {
                throw new Error('未闭合的引号字面量');
            }
            out += lit;
            i = j + 1;
            continue;
        }
        // 字母 run
        if (/[A-Za-z]/.test(c)) {
            var k = i;
            while (k < pattern.length && pattern.charAt(k) === c) k++;
            var len = k - i;
            out += jtfToken(c, len, parts);
            i = k;
            continue;
        }
        out += c;
        i++;
    }
    return out;
}

/**
 * @param {string} letter
 * @param {number} len
 * @param {object} p
 * @returns {string}
 */
function jtfToken(letter, len, p) {
    switch (letter) {
        case 'y':
        case 'Y':
            if (len === 2) return jtfPad(p.y % 100, 2);
            return jtfPad(p.y, Math.max(len, 4));
        case 'M':
            if (len === 1) return String(p.M);
            if (len === 2) return jtfPad(p.M, 2);
            // 简化：MMM/MMMM 用数字
            return jtfPad(p.M, 2);
        case 'd':
            return len === 1 ? String(p.d) : jtfPad(p.d, Math.min(len, 2) === 1 ? 1 : 2);
        case 'H':
            return len === 1 ? String(p.H) : jtfPad(p.H, 2);
        case 'h':
            return len === 1 ? String(p.h) : jtfPad(p.h, 2);
        case 'm':
            return len === 1 ? String(p.m) : jtfPad(p.m, 2);
        case 's':
            return len === 1 ? String(p.s) : jtfPad(p.s, 2);
        case 'S':
            // 毫秒，按长度截断/补零
            var ms = jtfPad(p.S, 3);
            if (len <= 3) return ms.slice(0, len);
            return ms + jtfPad(0, len - 3);
        case 'a':
            return p.a;
        case 'E':
            if (len >= 4) return JTF_WEEKDAYS_FULL[p.day];
            return JTF_WEEKDAYS_SHORT[p.day];
        case 'Z': {
            // +0800
            var sign = p.offsetMin >= 0 ? '+' : '-';
            var abs = Math.abs(p.offsetMin);
            var oh = Math.floor(abs / 60);
            var om = abs % 60;
            if (len >= 5) return sign + jtfPad(oh, 2) + ':' + jtfPad(om, 2);
            return sign + jtfPad(oh, 2) + jtfPad(om, 2);
        }
        case 'X': {
            // XXX → +08:00; XX → +0800; X → +08 或 Z
            var sign2 = p.offsetMin >= 0 ? '+' : '-';
            var abs2 = Math.abs(p.offsetMin);
            var oh2 = Math.floor(abs2 / 60);
            var om2 = abs2 % 60;
            if (p.offsetMin === 0 && len === 1) return 'Z';
            if (len === 1) return sign2 + jtfPad(oh2, 2) + (om2 ? jtfPad(om2, 2) : '');
            if (len === 2) return sign2 + jtfPad(oh2, 2) + jtfPad(om2, 2);
            return sign2 + jtfPad(oh2, 2) + ':' + jtfPad(om2, 2);
        }
        case 'n':
            // 纳秒简化为毫秒*1e6
            return jtfPad(p.S * 1000000, Math.min(len, 9));
        default:
            // 未支持字母原样输出重复
            var t = '';
            for (var i = 0; i < len; i++) t += letter;
            return t;
    }
}

/**
 * 尽力按 pattern 解析文本（简化）
 * @param {string} pattern
 * @param {string} text
 * @returns {{ ok: boolean, result?: string, fields?: object, msg?: string }}
 */
function javaTimeFmtParse(pattern, text) {
    if (pattern == null || String(pattern).trim() === '') {
        return { ok: false, msg: '请输入 pattern' };
    }
    if (text == null || String(text).trim() === '') {
        return { ok: false, msg: '请输入待解析文本' };
    }
    var pat = String(pattern);
    var src = String(text).trim();

    // 仅支持常见数字模式的反向提取
    var reParts = '';
    var fields = [];
    var i = 0;
    while (i < pat.length) {
        var c = pat.charAt(i);
        if (c === "'") {
            if (pat.charAt(i + 1) === "'") {
                reParts += "'";
                i += 2;
                continue;
            }
            var j = i + 1;
            var lit = '';
            while (j < pat.length && pat.charAt(j) !== "'") {
                lit += pat.charAt(j);
                j++;
            }
            reParts += lit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            i = j + 1;
            continue;
        }
        if (/[A-Za-z]/.test(c)) {
            var k = i;
            while (k < pat.length && pat.charAt(k) === c) k++;
            var len = k - i;
            var name = c + len;
            if ('yYMdHhmSs'.indexOf(c) >= 0) {
                reParts += '(\\d{1,' + Math.max(len, 4) + '})';
                fields.push({ letter: c, len: len, name: name });
            } else if (c === 'a') {
                reParts += '(AM|PM|am|pm)';
                fields.push({ letter: c, len: len, name: name });
            } else if (c === 'E') {
                reParts += '([A-Za-z]+)';
                fields.push({ letter: c, len: len, name: name });
            } else if (c === 'Z' || c === 'X') {
                reParts += '([Zz]|[+-]\\d{2}:?\\d{2})';
                fields.push({ letter: c, len: len, name: name });
            } else {
                return {
                    ok: false,
                    msg: '解析不支持字母 "' + c + '"（仅支持 y/M/d/H/h/m/s/S/a/E/Z/X 的简化解析）',
                };
            }
            i = k;
            continue;
        }
        reParts += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        i++;
    }

    var re = new RegExp('^' + reParts + '$');
    var m = src.match(re);
    if (!m) {
        return {
            ok: false,
            msg: '文本与 pattern 不匹配。浏览器模拟解析能力有限，复杂本地化/时区请用 JDK DateTimeFormatter。',
        };
    }

    var extracted = {};
    for (var fi = 0; fi < fields.length; fi++) {
        extracted[fields[fi].letter] = m[fi + 1];
    }

    var year = extracted.y != null ? parseInt(extracted.y, 10) : extracted.Y != null ? parseInt(extracted.Y, 10) : 1970;
    if (extracted.y != null && extracted.y.length === 2) {
        year = year >= 70 ? 1900 + year : 2000 + year;
    }
    var month = extracted.M != null ? parseInt(extracted.M, 10) : 1;
    var day = extracted.d != null ? parseInt(extracted.d, 10) : 1;
    var hour = extracted.H != null ? parseInt(extracted.H, 10) : 0;
    if (extracted.h != null) {
        hour = parseInt(extracted.h, 10) % 12;
        if (extracted.a && String(extracted.a).toUpperCase() === 'PM') hour += 12;
    }
    var minute = extracted.m != null ? parseInt(extracted.m, 10) : 0;
    var second = extracted.s != null ? parseInt(extracted.s, 10) : 0;
    var ms = extracted.S != null ? parseInt((extracted.S + '000').slice(0, 3), 10) : 0;

    if (month < 1 || month > 12 || day < 1 || day > 31) {
        return { ok: false, msg: '解析出的日期字段无效' };
    }

    var iso =
        jtfPad(year, 4) +
        '-' +
        jtfPad(month, 2) +
        '-' +
        jtfPad(day, 2) +
        'T' +
        jtfPad(hour, 2) +
        ':' +
        jtfPad(minute, 2) +
        ':' +
        jtfPad(second, 2) +
        '.' +
        jtfPad(ms, 3);

    return {
        ok: true,
        result: iso,
        fields: {
            year: year,
            month: month,
            day: day,
            hour: hour,
            minute: minute,
            second: second,
            millisecond: ms,
            raw: extracted,
        },
        msg: '简化解析成功（本地字段，未完整处理时区/本地化）',
    };
}

/**
 * 模式字母速查
 * @returns {{ letter: string, meaning: string, example: string }[]}
 */
function javaTimeFmtPatternHelp() {
    return [
        { letter: 'yyyy', meaning: '四位年份', example: '2026' },
        { letter: 'yy', meaning: '两位年份', example: '26' },
        { letter: 'MM', meaning: '两位月份', example: '08' },
        { letter: 'M', meaning: '月份（不补零）', example: '8' },
        { letter: 'dd', meaning: '两位日', example: '03' },
        { letter: 'd', meaning: '日（不补零）', example: '3' },
        { letter: 'HH', meaning: '24 小时制小时 00-23', example: '14' },
        { letter: 'H', meaning: '小时（不补零）', example: '14' },
        { letter: 'hh', meaning: '12 小时制 01-12', example: '02' },
        { letter: 'h', meaning: '12 小时制（不补零）', example: '2' },
        { letter: 'mm', meaning: '分钟', example: '05' },
        { letter: 'ss', meaning: '秒', example: '09' },
        { letter: 'SSS', meaning: '毫秒', example: '123' },
        { letter: 'a', meaning: 'AM/PM', example: 'PM' },
        { letter: 'EEE', meaning: '星期缩写（英文）', example: 'Mon' },
        { letter: 'EEEE', meaning: '星期全称（英文）', example: 'Monday' },
        { letter: 'Z', meaning: 'RFC 822 时区', example: '+0800' },
        { letter: 'XXX', meaning: 'ISO 时区偏移', example: '+08:00' },
        { letter: "''", meaning: '字面量（单引号包裹）', example: "'T'" },
    ];
}

/**
 * 常见模板
 * @returns {{ name: string, pattern: string, desc: string }[]}
 */
function javaTimeFmtPresets() {
    return [
        { name: '日期', pattern: 'yyyy-MM-dd', desc: '常用日期' },
        { name: '日期时间', pattern: 'yyyy-MM-dd HH:mm:ss', desc: '常用日期时间' },
        { name: '紧凑', pattern: 'yyyyMMddHHmmss', desc: '无分隔紧凑' },
        { name: '毫秒', pattern: 'yyyy-MM-dd HH:mm:ss.SSS', desc: '含毫秒' },
        { name: 'ISO_LOCAL', pattern: "yyyy-MM-dd'T'HH:mm:ss", desc: 'ISO_LOCAL_DATE_TIME 近似' },
        { name: 'ISO_OFFSET', pattern: "yyyy-MM-dd'T'HH:mm:ssXXX", desc: '带偏移' },
        { name: '中文风格', pattern: "yyyy年MM月dd日 HH:mm:ss", desc: '中文日期' },
        { name: '12小时', pattern: 'yyyy-MM-dd hh:mm:ss a', desc: '12 小时 + AM/PM' },
        { name: '斜杠', pattern: 'yyyy/MM/dd HH:mm:ss', desc: '斜杠分隔' },
        { name: '仅时间', pattern: 'HH:mm:ss', desc: '时间部分' },
    ];
}

// === UI ===

function jtfSetOut(text, isError) {
    var out = document.getElementById('jtfOutput');
    if (!out) return;
    out.textContent = text;
    out.className = isError ? 'output-box error' : 'output-box';
}

function jtfFormatUi() {
    var pattern = document.getElementById('jtfPattern').value;
    var dateInput = document.getElementById('jtfDateInput').value;
    var r = javaTimeFmtFormat(pattern, dateInput);
    if (!r.ok) {
        jtfSetOut(r.msg || '格式化失败', true);
        if (typeof setStatus === 'function') setStatus('格式化失败');
        return;
    }
    var note = '（浏览器模拟，与 JDK 在时区/本地化上可能有差异）';
    jtfSetOut(r.result + '\n' + note, false);
    if (typeof setStatus === 'function') setStatus('格式化完成');
}

function jtfParseUi() {
    var pattern = document.getElementById('jtfPattern').value;
    var text = document.getElementById('jtfParseInput').value;
    if (!text) text = document.getElementById('jtfDateInput').value;
    var r = javaTimeFmtParse(pattern, text);
    if (!r.ok) {
        jtfSetOut(r.msg || '解析失败', true);
        if (typeof setStatus === 'function') setStatus('解析失败');
        return;
    }
    var lines = [
        '解析结果: ' + r.result,
        r.msg || '',
        'year=' + r.fields.year,
        'month=' + r.fields.month,
        'day=' + r.fields.day,
        'hour=' + r.fields.hour,
        'minute=' + r.fields.minute,
        'second=' + r.fields.second,
        'ms=' + r.fields.millisecond,
        '（浏览器模拟，与 JDK 在时区/本地化上可能有差异）',
    ];
    jtfSetOut(lines.join('\n'), false);
    if (typeof setStatus === 'function') setStatus('解析完成');
}

function jtfApplyPreset(pattern) {
    var el = document.getElementById('jtfPattern');
    if (el) el.value = pattern;
    jtfFormatUi();
}

function jtfLoadSample() {
    document.getElementById('jtfPattern').value = 'yyyy-MM-dd HH:mm:ss';
    document.getElementById('jtfDateInput').value = '2026-08-03 14:05:09';
    document.getElementById('jtfParseInput').value = '2026-08-03 14:05:09';
    jtfFormatUi();
}

function jtfClear() {
    ['jtfPattern', 'jtfDateInput', 'jtfParseInput'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
    });
    jtfSetOut('', false);
    if (typeof setStatus === 'function') setStatus('已清空');
}

function jtfRenderHelp() {
    var box = document.getElementById('jtfHelpBody');
    if (!box) return;
    var rows = javaTimeFmtPatternHelp();
    var html = '<table style="width:100%;border-collapse:collapse;font-size:12px">';
    html +=
        '<tr style="text-align:left;color:var(--text-dim)"><th style="padding:4px">字母</th><th style="padding:4px">含义</th><th style="padding:4px">示例</th></tr>';
    for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        html +=
            '<tr><td style="padding:4px;font-family:var(--font)"><code>' +
            r.letter +
            '</code></td><td style="padding:4px">' +
            r.meaning +
            '</td><td style="padding:4px;font-family:var(--font)">' +
            r.example +
            '</td></tr>';
    }
    html += '</table>';
    box.innerHTML = html;
}

function jtfRenderPresets() {
    var bar = document.getElementById('jtfPresetBar');
    if (!bar) return;
    var list = javaTimeFmtPresets();
    var html = '';
    for (var i = 0; i < list.length; i++) {
        var p = list[i];
        html +=
            '<button class="outline" type="button" title="' +
            p.desc +
            '" onclick="jtfApplyPreset(' +
            JSON.stringify(p.pattern) +
            ')">' +
            p.name +
            '</button>';
    }
    bar.innerHTML = html;
}

function jtfToggleHelp() {
    var body = document.getElementById('jtfHelpBody');
    var btn = document.getElementById('jtfHelpToggle');
    if (!body) return;
    // 初始可能为空
    if (body.getAttribute('data-open') === '1') {
        body.style.display = 'none';
        body.setAttribute('data-open', '0');
        if (btn) btn.textContent = '展开字母速查';
    } else {
        body.style.display = 'block';
        body.setAttribute('data-open', '1');
        if (btn) btn.textContent = '收起字母速查';
        jtfRenderHelp();
    }
}

function jtfInit() {
    jtfRenderPresets();
    var body = document.getElementById('jtfHelpBody');
    if (body) {
        body.style.display = 'none';
        body.setAttribute('data-open', '0');
    }
}

if (typeof registerInit === 'function') {
    registerInit('javatimefmt', jtfInit);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        javaTimeFmtFormat: javaTimeFmtFormat,
        javaTimeFmtParse: javaTimeFmtParse,
        javaTimeFmtPatternHelp: javaTimeFmtPatternHelp,
        javaTimeFmtPresets: javaTimeFmtPresets,
        jtfParseDateInput: jtfParseDateInput,
    };
}
