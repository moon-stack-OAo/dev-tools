// === TS: 时间戳转换(单条 + 批量) ===
// 单条: Unix 秒/毫秒 ↔ 日期(显示多种格式)
// 批量: 多行输入,自动识别每行格式,支持时区 + 4 种输出格式 + TSV/JSON 导出
// 纯函数 detect / parseBatch / toTSV / toJSON / tsFormat / tsFormatInZone 供 Node 测试调用
// UI 函数: tsUpdateNow / tsInit / tsSwitchMode / tsRunSingle / tsRunBatch / tsCopyTSV / tsCopyJSON / tsLoadSample / tsClearBatch

// 智能识别单行输入并转成 Unix 毫秒
// 返回 {kind: 'sec'|'ms'|'date', ms: number} 或 {kind: null}
function detect(input, direction) {
    const s = String(input == null ? '' : input).trim();
    if (!s) return { kind: null };

    if (direction === 'ts2date') {
        if (/^-?\d{10}$/.test(s)) return { kind: 'sec', ms: Number(s) * 1000 };
        if (/^-?\d{13}$/.test(s)) return { kind: 'ms', ms: Number(s) };
        if (/^-?\d+(\.\d+)?$/.test(s)) {
            const n = Number(s);
            if (!isFinite(n)) return { kind: null };
            if (Math.abs(n) < 1e12) return { kind: 'sec', ms: n * 1000 };
            return { kind: 'ms', ms: n };
        }
        return { kind: null };
    }

    if (direction === 'date2ts') {
        const d = new Date(s);
        if (!isNaN(d.getTime())) return { kind: 'date', ms: d.getTime() };
        return { kind: null };
    }

    return { kind: null };
}

// 解析整段文本,逐行处理
// text: 多行字符串;options: {timezone, outputFormat, direction}
// 返回 {ok: [{line, input, output, kind}], err: [{line, input, msg}]}
function parseBatch(text, options) {
    const opts = Object.assign(
        { timezone: 'UTC', outputFormat: 'yyyy-MM-dd HH:mm:ss', direction: 'ts2date' },
        options || {},
    );
    const lines = String(text == null ? '' : text).split(/\r?\n/);
    const ok = [];
    const err = [];
    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        if (!raw || !raw.trim()) continue;
        const det = detect(raw, opts.direction);
        if (det.kind === null) {
            err.push({ line: i + 1, input: raw, msg: '无法识别的格式' });
            continue;
        }
        const out = tsFormat(det.ms, opts.outputFormat, opts.timezone);
        if (out == null) {
            err.push({ line: i + 1, input: raw, msg: '格式化失败' });
            continue;
        }
        ok.push({ line: i + 1, input: raw, output: out, kind: det.kind });
    }
    return { ok: ok, err: err };
}

// 在指定时区把 Unix 毫秒格式化为字符串
// format: 'yyyy-MM-dd HH:mm:ss' | 'ISO' | 's' | 'ms'
function tsFormat(ms, format, timezone) {
    const d = new Date(ms);
    if (isNaN(d.getTime())) return null;
    switch (format) {
        case 'yyyy-MM-dd HH:mm:ss':
            return tsFormatInZone(d, timezone);
        case 'ISO':
            return d.toISOString();
        case 'ms':
            return String(d.getTime());
        case 's':
            return String(Math.floor(d.getTime() / 1000));
        default:
            return null;
    }
}

// 使用 Intl.DateTimeFormat 在指定时区拼出 yyyy-MM-dd HH:mm:ss
function tsFormatInZone(date, zone) {
    try {
        const fmt = new Intl.DateTimeFormat('en-US', {
            timeZone: zone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        });
        const parts = fmt.formatToParts(date);
        const get = (t) => {
            const p = parts.find((x) => x.type === t);
            return p ? p.value : '';
        };
        let hour = get('hour');
        if (hour === '24') hour = '00';
        return (
            get('year') + '-' + get('month') + '-' + get('day') + ' ' + hour + ':' + get('minute') + ':' + get('second')
        );
    } catch (e) {
        return null;
    }
}

// TSV 导出(制表符分隔,首行为表头)
function toTSV(ok) {
    if (!ok || !ok.length) return '';
    const head = ['行号', '输入', '输出'];
    const rows = ok.map((o) => [o.line, o.input, o.output]);
    return head.join('\t') + '\n' + rows.map((r) => r.join('\t')).join('\n');
}

// JSON 导出(标准数组,2 空格缩进)
function toJSON(ok) {
    return JSON.stringify(ok || [], null, 2);
}

// === UI 逻辑 ===
const TS_LOCAL_ZONE = (() => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch (e) {
        return 'UTC';
    }
})();

function tsGetOptions() {
    const tzRaw = document.getElementById('tsTz').value;
    const timezone = tzRaw === 'local' ? TS_LOCAL_ZONE : tzRaw;
    return {
        timezone: timezone,
        outputFormat: document.getElementById('tsFormat').value,
        direction: document.getElementById('tsDirection').value,
    };
}

function tsSwitchMode(mode) {
    document.querySelectorAll('[data-ts-mode]').forEach((b) => {
        b.classList.toggle('active', b.getAttribute('data-ts-mode') === mode);
    });
    document.getElementById('tsModeSingle').classList.toggle('active', mode === 'single');
    document.getElementById('tsModeBatch').classList.toggle('active', mode === 'batch');
}

function tsUpdateNow() {
    const el = document.getElementById('tsNow');
    if (!el) return;
    const now = Date.now();
    el.innerHTML = `<span style="color:var(--text-dim)">秒</span> ${Math.floor(now / 1000)} <span style="color:var(--border);margin:0 6px">|</span> <span style="color:var(--text-dim)">毫秒</span> ${now} <span style="color:var(--border);margin:0 6px">|</span> <span style="color:var(--text-dim)">本地</span> ${new Date(now).toISOString().replace('T', ' ').slice(0, 19)}`;
}

// 单条模式:输入框失焦或回车时触发
function tsRunSingle() {
    const tsRaw = document.getElementById('tsInput').value.trim();
    const dateRaw = document.getElementById('tsDateInput').value.trim();
    const out = document.getElementById('tsOutput');
    if (!out) return;
    if (!tsRaw && !dateRaw) {
        out.innerHTML = '<div class="ts-result-empty">输入时间戳或日期后,这里显示 5 种格式结果</div>';
        return;
    }
    let ms = null;
    let errMsg = null;
    if (tsRaw) {
        const num = Number(tsRaw);
        if (isNaN(num)) {
            errMsg = '无效的时间戳';
        } else {
            ms = num < 1e12 ? num * 1000 : num;
        }
    } else {
        const d = new Date(dateRaw);
        if (isNaN(d.getTime())) {
            errMsg = '无效的日期格式';
        } else {
            ms = d.getTime();
        }
    }
    if (errMsg) {
        out.innerHTML =
            '<div class="ts-result-row"><span class="ts-result-key"><i class="bi bi-exclamation-triangle"></i>错误</span><span class="ts-result-val ts-err">' +
            escapeHtml(errMsg) +
            '</span></div>';
        return;
    }
    const d = new Date(ms);
    const rows = [
        { key: 'UTC', icon: 'bi-globe', val: tsFormatInZone(d, 'UTC') },
        { key: '上海', icon: 'bi-geo-alt', val: tsFormatInZone(d, 'Asia/Shanghai') },
        { key: '本地', icon: 'bi-laptop', val: d.toLocaleString() },
        { key: 'ISO', icon: 'bi-code', val: d.toISOString() },
        { key: 'Unix 秒', icon: 'bi-hash', val: String(Math.floor(ms / 1000)) },
        { key: '毫秒', icon: 'bi-hash', val: String(ms) },
    ];
    out.innerHTML = rows
        .map(
            (r) =>
                '<div class="ts-result-row"><span class="ts-result-key"><i class="bi ' +
                r.icon +
                '"></i>' +
                r.key +
                '</span><span class="ts-result-val">' +
                escapeHtml(r.va,l) +
                '</span></div>'
        )
        .join('');
    setStatus(tsRaw ? '时间戳转换完成' : '日期转换完成');
}

function tsRunBatch() {
    const text = document.getElementById('tsBatchInput').value;
    const result = parseBatch(text, tsGetOptions());
    const out = document.getElementById('tsBatchOutput');
    if (!out) return;
    if (!result.ok.length && !result.err.length) {
        out.innerHTML = '<div class="ts-batch-empty"><i class="bi bi-arrow-left-circle"></i><div>请输入待转换的时间戳或日期</div></div>';
    } else {
        const parts = [];
        result.ok.forEach((o) => {
            parts.push(
                '<div class="ts-row-item">' +
                '<span class="ts-row-line">#' +
                o.line +
                '</span>' +
                '<span class="ts-row-arrow">→</span>' +
                '<span class="ts-row-out">' +
                escapeHtml(o.output) +
                ,'</span>' +
                '</div>'
            );
        });
        result.err.forEach((e) => {
            parts.push(
                '<div class="ts-row-item ts-row-err">' +
                '<span class="ts-row-line">#' +
                e.line +
                '</span>' +
                '<span class="ts-row-arrow">!</span>' +
                '<span class="ts-row-err-msg">' +
                escapeHtml(e.msg) +
                '</span>' +
                '<span class="ts-row-out">' +
                escapeHtml(e.input) +
                ,'</span>' +
                '</div>'
            );
        });
        out.innerHTML = parts.join('');
    }
    const summary = document.getElementById('tsBatchSummary');
    if (summary) {
        const okNum = result.ok.length;
        const errNum = result.err.length;
        summary.innerHTML =
            '<span style="color:var(--success,#48bb78)">' + okNum + ' 成功</span>' +
            (errNum ? ' <span style="color:var(--text-dim)">/</span> <span style="color:var(--danger,#e53e3e)">' + errNum + ' 失败</span>' : '');
    }
    setStatus('解析完成: ' + result.ok.length + ' 成功 / ' + result.err.length + ' 失败');
}

function tsCopyTSV() {
    const text = document.getElementById('tsBatchInput').value;
    const result = parseBatch(text, tsGetOptions());
    if (!result.ok.length) {
        toast('没有可复制的数据');
        return;
    }
    safeCopy(toTSV(result.ok), '已复制 TSV (' + result.ok.length + ' 行)');
}

function tsCopyJSON() {
    const text = document.getElementById('tsBatchInput').value;
    const result = parseBatch(text, tsGetOptions());
    if (!result.ok.length) {
        toast('没有可复制的数据');
        return;
    }
    safeCopy(toJSON(result.ok), '已复制 JSON (' + result.ok.length + ' 条)');
}

function tsClearBatch() {
    document.getElementById('tsBatchInput').value = '';
    const out = document.getElementById('tsBatchOutput');
    if (out) out.innerHTML = '<div class="ts-batch-empty"><i class="bi bi-arrow-left-circle"></i><div>请输入待转换的时间戳或日期</div></div>';
    const summary = document.getElementById('tsBatchSummary');
    if (summary) summary.innerHTML = '';
    setStatus('已清空');
}

function tsLoadSample() {
    document.getElementById('tsBatchInput').value =
        '1700000000\n' +
        '1700000000000\n' +
        '2024-01-01 12:00:00\n' +
        '2024-06-15T08:30:00Z\n' +
        'not-a-date\n' +
        '\n' +
        '1735689600';
    tsRunBatch();
}

function tsClearSingle() {
    const tsInput = document.getElementById('tsInput');
    const tsDateInput = document.getElementById('tsDateInput');
    if (tsInput) tsInput.value = '';
    if (tsDateInput) tsDateInput.value = tsDateToLocalInput(new Date());
    const out = document.getElementById('tsOutput');
    if (out) out.innerHTML = '<div class="ts-result-empty">输入时间戳或日期后,这里显示 5 种格式结果</div>';
    setStatus('已清空');
}

// 点击整个日期卡片任意位置都弹出选择器
function tsOpenDatePicker(e) {
    const el = document.getElementById('tsDateInput');
    if (!el) return;
    // 点击的是 input 自身,浏览器会原生触发 picker,不重复处理
    if (e && e.target === el) return;
    e && e.stopPropagation();
    if (typeof el.showPicker === 'function') {
        try {
            el.showPicker();
            return;
        } catch (err) {
            /* 用户拒绝或浏览器拒绝,降级到 focus + click */
        }
    }
    el.focus();
    el.click();
}

// 把 Date 转成 datetime-local 输入框所需的本地时间字符串
function tsDateToLocalInput(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return (
        date.getFullYear() +
        '-' +
        pad(date.getMonth() + 1) +
        '-' +
        pad(date.getDate()) +
        'T' +
        pad(date.getHours()) +
        ':' +
        pad(date.getMinutes()) +
        ':' +
        pad(date.getSeconds())
    );
}

function tsInit() {
    if (window.__tsInterval) return;
    window.__tsInterval = setInterval(tsUpdateNow, 1000);
    tsUpdateNow();

    // 单条模式
    const tsInput = document.getElementById('tsInput');
    const tsDateInput = document.getElementById('tsDateInput');
    if (tsDateInput && !tsDateInput.value) {
        tsDateInput.value = tsDateToLocalInput(new Date());
    }
    if (tsInput) tsInput.addEventListener('input', debounce(tsRunSingle, 200));
    if (tsDateInput) tsDateInput.addEventListener('input', debounce(tsRunSingle, 200));

    // 批量模式
    const batchInput = document.getElementById('tsBatchInput');
    if (batchInput) batchInput.addEventListener('input', debounce(tsRunBatch, 200));
    ['tsDirection', 'tsTz', 'tsFormat'].forEach(function(id) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', tsRunBatch);
    });
}

// === Node 导出(仅用于 Node 测试)===
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        detect: detect,
        parseBatch: parseBatch,
        toTSV: toTSV,
        toJSON: toJSON,
        tsFormat: tsFormat,
        tsFormatInZone: tsFormatInZone,
    };
}

registerInit('ts', tsInit);
