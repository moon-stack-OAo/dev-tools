// W3C traceparent / B3 链路追踪头 生成与解析

/**
 * 生成随机 hex 字符串
 * @param {number} bytes 字节数
 * @returns {string}
 */
function randomHex(bytes) {
    const n = bytes * 2;
    let s = '';
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const arr = new Uint8Array(bytes);
        crypto.getRandomValues(arr);
        for (let i = 0; i < arr.length; i++) {
            s += arr[i].toString(16).padStart(2, '0');
        }
        return s;
    }
    for (let i = 0; i < n; i++) {
        s += Math.floor(Math.random() * 16).toString(16);
    }
    return s;
}

/**
 * 生成 32 hex 的 trace-id
 * @returns {string}
 */
function generateTraceId() {
    let id = randomHex(16);
    // 全 0 非法
    if (/^0+$/.test(id)) id = '0'.repeat(31) + '1';
    return id;
}

/**
 * 生成 16 hex 的 span-id
 * @returns {string}
 */
function generateSpanId() {
    let id = randomHex(8);
    if (/^0+$/.test(id)) id = '0'.repeat(15) + '1';
    return id;
}

/**
 * 解析 W3C traceparent
 * 格式: version-traceid-spanid-flags （如 00-...-...-01）
 * @param {string} header
 * @returns {{ valid: boolean, version?: string, traceId?: string, spanId?: string, flags?: string, sampled?: boolean, message?: string }}
 */
function parseTraceparent(header) {
    if (header == null || String(header).trim() === '') {
        return { valid: false, message: '请输入 traceparent' };
    }
    const s = String(header).trim();
    const parts = s.split('-');
    if (parts.length !== 4) {
        return { valid: false, message: '格式错误，须为 version-traceid-spanid-flags' };
    }
    const [version, traceId, spanId, flags] = parts;
    if (!/^[0-9a-fA-F]{2}$/.test(version)) {
        return { valid: false, message: 'version 须为 2 位 hex' };
    }
    if (!/^[0-9a-fA-F]{32}$/.test(traceId)) {
        return { valid: false, message: 'trace-id 须为 32 位 hex' };
    }
    if (/^0+$/.test(traceId)) {
        return { valid: false, message: 'trace-id 不能全 0' };
    }
    if (!/^[0-9a-fA-F]{16}$/.test(spanId)) {
        return { valid: false, message: 'span-id 须为 16 位 hex' };
    }
    if (/^0+$/.test(spanId)) {
        return { valid: false, message: 'span-id 不能全 0' };
    }
    if (!/^[0-9a-fA-F]{2}$/.test(flags)) {
        return { valid: false, message: 'flags 须为 2 位 hex' };
    }
    const flagNum = parseInt(flags, 16);
    return {
        valid: true,
        version: version.toLowerCase(),
        traceId: traceId.toLowerCase(),
        spanId: spanId.toLowerCase(),
        flags: flags.toLowerCase(),
        sampled: (flagNum & 0x01) === 1,
        message: '解析成功',
    };
}

/**
 * 构建 W3C traceparent
 * @param {object} [opts]
 * @param {string} [opts.version='00']
 * @param {string} [opts.traceId]
 * @param {string} [opts.spanId]
 * @param {boolean|string|number} [opts.sampled=true]
 * @param {string} [opts.flags]
 * @returns {string}
 */
function buildTraceparent(opts) {
    const o = opts || {};
    const version = (o.version || '00').toLowerCase();
    if (!/^[0-9a-f]{2}$/.test(version)) {
        throw new Error('version 须为 2 位 hex');
    }
    let traceId = (o.traceId || generateTraceId()).toLowerCase();
    let spanId = (o.spanId || generateSpanId()).toLowerCase();
    if (!/^[0-9a-f]{32}$/.test(traceId) || /^0+$/.test(traceId)) {
        throw new Error('traceId 无效');
    }
    if (!/^[0-9a-f]{16}$/.test(spanId) || /^0+$/.test(spanId)) {
        throw new Error('spanId 无效');
    }
    let flags;
    if (o.flags != null && o.flags !== '') {
        flags = String(o.flags).toLowerCase();
        if (!/^[0-9a-f]{2}$/.test(flags)) throw new Error('flags 须为 2 位 hex');
    } else {
        const sampled = o.sampled === undefined ? true : !!o.sampled;
        flags = sampled ? '01' : '00';
    }
    return version + '-' + traceId + '-' + spanId + '-' + flags;
}

/**
 * 解析 B3（单头 b3 或多头对象/字符串）
 * 单头: {TraceId}-{SpanId}-{SamplingState}-{ParentSpanId}
 * @param {string|object} input 单头字符串，或多头对象 { 'X-B3-TraceId':..., ... }，或换行 key: value
 * @returns {{ valid: boolean, format?: string, traceId?: string, spanId?: string, parentSpanId?: string, sampled?: boolean|string, message?: string, headers?: object }}
 */
function parseB3(input) {
    if (input == null || (typeof input === 'string' && !input.trim())) {
        return { valid: false, message: '请输入 B3 头' };
    }

    // 对象形式（多头）
    if (typeof input === 'object' && !Array.isArray(input)) {
        return parseB3Multi(input);
    }

    const s = String(input).trim();

    // 多行 key: value / key=value
    if (s.includes('\n') || /x-b3-/i.test(s)) {
        const headers = {};
        s.split(/\r?\n/).forEach(function (line) {
            const m = line.match(/^\s*([^:=\s]+)\s*[:=]\s*(.+?)\s*$/);
            if (m) headers[m[1].trim()] = m[2].trim();
        });
        if (Object.keys(headers).length) {
            // 若有 b3 单头字段
            const b3Key = Object.keys(headers).find(function (k) {
                return k.toLowerCase() === 'b3';
            });
            if (b3Key && !headers['X-B3-TraceId'] && !headers['x-b3-traceid']) {
                return parseB3Single(headers[b3Key]);
            }
            return parseB3Multi(headers);
        }
    }

    return parseB3Single(s);
}

function parseB3Single(s) {
    const parts = s.split('-');
    if (parts.length < 2 || parts.length > 4) {
        return { valid: false, message: 'B3 单头格式: TraceId-SpanId[-Sampled[-ParentSpanId]]' };
    }
    const traceId = parts[0].toLowerCase();
    const spanId = parts[1].toLowerCase();
    if (!/^[0-9a-f]{16}$|^[0-9a-f]{32}$/.test(traceId)) {
        return { valid: false, message: 'TraceId 须为 16 或 32 位 hex' };
    }
    if (!/^[0-9a-f]{16}$/.test(spanId)) {
        return { valid: false, message: 'SpanId 须为 16 位 hex' };
    }
    let sampled;
    let parentSpanId;
    if (parts.length >= 3) {
        const st = parts[2];
        if (st === '0' || st === '1' || st === 'd') {
            sampled = st === 'd' ? 'd' : st === '1';
        } else {
            return { valid: false, message: 'SamplingState 须为 0/1/d' };
        }
    }
    if (parts.length === 4) {
        parentSpanId = parts[3].toLowerCase();
        if (!/^[0-9a-f]{16}$/.test(parentSpanId)) {
            return { valid: false, message: 'ParentSpanId 须为 16 位 hex' };
        }
    }
    return {
        valid: true,
        format: 'single',
        traceId: traceId,
        spanId: spanId,
        parentSpanId: parentSpanId,
        sampled: sampled,
        message: 'B3 单头解析成功',
        headers: buildB3Headers(traceId, spanId, sampled, parentSpanId),
    };
}

function parseB3Multi(obj) {
    const map = Object.create(null);
    Object.keys(obj).forEach(function (k) {
        map[k.toLowerCase()] = String(obj[k]).trim();
    });
    const traceId = (map['x-b3-traceid'] || '').toLowerCase();
    const spanId = (map['x-b3-spanid'] || '').toLowerCase();
    const parentSpanId = (map['x-b3-parentspanid'] || '').toLowerCase() || undefined;
    const sampledRaw = map['x-b3-sampled'];
    const flags = map['x-b3-flags'];

    if (!traceId) {
        return { valid: false, message: '缺少 X-B3-TraceId' };
    }
    if (!/^[0-9a-f]{16}$|^[0-9a-f]{32}$/.test(traceId)) {
        return { valid: false, message: 'X-B3-TraceId 须为 16 或 32 位 hex' };
    }
    if (!spanId || !/^[0-9a-f]{16}$/.test(spanId)) {
        return { valid: false, message: 'X-B3-SpanId 须为 16 位 hex' };
    }
    if (parentSpanId && !/^[0-9a-f]{16}$/.test(parentSpanId)) {
        return { valid: false, message: 'X-B3-ParentSpanId 须为 16 位 hex' };
    }
    let sampled;
    if (flags === '1') {
        sampled = 'd';
    } else if (sampledRaw === '1' || sampledRaw === 'true') {
        sampled = true;
    } else if (sampledRaw === '0' || sampledRaw === 'false') {
        sampled = false;
    }

    return {
        valid: true,
        format: 'multi',
        traceId: traceId,
        spanId: spanId,
        parentSpanId: parentSpanId,
        sampled: sampled,
        message: 'B3 多头解析成功',
        headers: buildB3Headers(traceId, spanId, sampled, parentSpanId),
    };
}

function buildB3Headers(traceId, spanId, sampled, parentSpanId) {
    const h = {
        'X-B3-TraceId': traceId,
        'X-B3-SpanId': spanId,
    };
    if (parentSpanId) h['X-B3-ParentSpanId'] = parentSpanId;
    if (sampled === 'd') {
        h['X-B3-Flags'] = '1';
    } else if (sampled === true) {
        h['X-B3-Sampled'] = '1';
    } else if (sampled === false) {
        h['X-B3-Sampled'] = '0';
    }
    return h;
}

/**
 * 构建 B3
 * @param {object} [opts]
 * @param {string} [opts.traceId]
 * @param {string} [opts.spanId]
 * @param {string} [opts.parentSpanId]
 * @param {boolean|string} [opts.sampled=true] true/false/'d'
 * @param {'single'|'multi'} [opts.format='single']
 * @returns {{ single: string, multi: object, headersText: string }}
 */
function buildB3(opts) {
    const o = opts || {};
    let traceId = (o.traceId || generateTraceId()).toLowerCase();
    let spanId = (o.spanId || generateSpanId()).toLowerCase();
    if (!/^[0-9a-f]{16}$|^[0-9a-f]{32}$/.test(traceId)) {
        throw new Error('traceId 无效');
    }
    if (!/^[0-9a-f]{16}$/.test(spanId)) {
        throw new Error('spanId 无效');
    }
    let parentSpanId = o.parentSpanId ? String(o.parentSpanId).toLowerCase() : undefined;
    if (parentSpanId && !/^[0-9a-f]{16}$/.test(parentSpanId)) {
        throw new Error('parentSpanId 无效');
    }
    const sampled = o.sampled === undefined ? true : o.sampled;

    let single = traceId + '-' + spanId;
    if (sampled === 'd') {
        single += '-d';
    } else if (sampled === true || sampled === 1 || sampled === '1') {
        single += '-1';
    } else if (sampled === false || sampled === 0 || sampled === '0') {
        single += '-0';
    }
    if (parentSpanId) {
        if (!single.match(/-[01d]$/)) single += '-1';
        single += '-' + parentSpanId;
    }

    const multi = buildB3Headers(
        traceId,
        spanId,
        sampled === true || sampled === 1 || sampled === '1'
            ? true
            : sampled === false || sampled === 0 || sampled === '0'
              ? false
              : sampled === 'd'
                ? 'd'
                : undefined,
        parentSpanId,
    );

    const headersText = Object.keys(multi)
        .map(function (k) {
            return k + ': ' + multi[k];
        })
        .join('\n');

    return { single: single, multi: multi, headersText: headersText };
}

// === UI ===

function thGenerateIds() {
    document.getElementById('thTraceId').value = generateTraceId();
    document.getElementById('thSpanId').value = generateSpanId();
    thBuildAll();
}

function thBuildAll() {
    const traceId = document.getElementById('thTraceId').value.trim();
    const spanId = document.getElementById('thSpanId').value.trim();
    const parent = document.getElementById('thParentSpanId').value.trim();
    const sampledEl = document.getElementById('thSampled');
    const sampled = sampledEl ? sampledEl.value : '1';
    const out = document.getElementById('thBuildOutput');
    try {
        const tp = buildTraceparent({
            traceId: traceId || undefined,
            spanId: spanId || undefined,
            sampled: sampled === '1' || sampled === 'd',
            flags: sampled === 'd' ? '01' : sampled === '1' ? '01' : '00',
        });
        // 回填生成的 id
        const parsed = parseTraceparent(tp);
        if (!traceId) document.getElementById('thTraceId').value = parsed.traceId;
        if (!spanId) document.getElementById('thSpanId').value = parsed.spanId;

        const b3 = buildB3({
            traceId: document.getElementById('thTraceId').value.trim(),
            spanId: document.getElementById('thSpanId').value.trim(),
            parentSpanId: parent || undefined,
            sampled: sampled === 'd' ? 'd' : sampled === '1',
        });

        const lines = [];
        lines.push('=== W3C traceparent ===');
        lines.push('traceparent: ' + tp);
        lines.push('');
        lines.push('=== B3 单头 ===');
        lines.push('b3: ' + b3.single);
        lines.push('');
        lines.push('=== B3 多头 ===');
        lines.push(b3.headersText);
        out.textContent = lines.join('\n');
        out.className = 'output-box';
        if (typeof setStatus === 'function') setStatus('已生成追踪头');
    } catch (e) {
        out.textContent = e.message;
        out.className = 'output-box error';
    }
}

function thParseInput() {
    const input = document.getElementById('thParseInput').value.trim();
    const out = document.getElementById('thParseOutput');
    if (!input) {
        out.textContent = '请输入 traceparent 或 B3 头';
        out.className = 'output-box error';
        return;
    }
    // 优先 traceparent
    if (/^[0-9a-fA-F]{2}-[0-9a-fA-F]{32}-[0-9a-fA-F]{16}-[0-9a-fA-F]{2}$/.test(input.split('\n')[0].trim().replace(/^traceparent:\s*/i, ''))) {
        const raw = input.split('\n')[0].trim().replace(/^traceparent:\s*/i, '');
        const r = parseTraceparent(raw);
        if (r.valid) {
            out.textContent = [
                '类型: W3C traceparent',
                'version : ' + r.version,
                'traceId : ' + r.traceId,
                'spanId  : ' + r.spanId,
                'flags   : ' + r.flags,
                'sampled : ' + r.sampled,
            ].join('\n');
            out.className = 'output-box';
            document.getElementById('thTraceId').value = r.traceId;
            document.getElementById('thSpanId').value = r.spanId;
            if (typeof setStatus === 'function') setStatus('traceparent 解析成功');
            return;
        }
        out.textContent = r.message;
        out.className = 'output-box error';
        return;
    }

    // 去掉 b3: 前缀
    let b3Input = input;
    if (/^b3\s*:/i.test(b3Input.split('\n')[0])) {
        b3Input = b3Input.replace(/^b3\s*:\s*/i, '');
    }
    const r = parseB3(b3Input);
    if (r.valid) {
        const lines = [
            '类型: B3 (' + r.format + ')',
            'traceId : ' + r.traceId,
            'spanId  : ' + r.spanId,
            'parent  : ' + (r.parentSpanId || '(无)'),
            'sampled : ' + String(r.sampled),
            '',
            '多头:',
            r.headers
                ? Object.keys(r.headers)
                      .map(function (k) {
                          return k + ': ' + r.headers[k];
                      })
                      .join('\n')
                : '',
        ];
        out.textContent = lines.join('\n');
        out.className = 'output-box';
        document.getElementById('thTraceId').value = r.traceId;
        document.getElementById('thSpanId').value = r.spanId;
        if (r.parentSpanId) document.getElementById('thParentSpanId').value = r.parentSpanId;
        if (typeof setStatus === 'function') setStatus('B3 解析成功');
    } else {
        out.textContent = r.message;
        out.className = 'output-box error';
    }
}

function thLoadSample() {
    const tp = buildTraceparent({ sampled: true });
    document.getElementById('thParseInput').value = tp;
    const p = parseTraceparent(tp);
    document.getElementById('thTraceId').value = p.traceId;
    document.getElementById('thSpanId').value = p.spanId;
    document.getElementById('thParentSpanId').value = '';
    document.getElementById('thSampled').value = '1';
    thParseInput();
    thBuildAll();
}

function thClear() {
    ['thTraceId', 'thSpanId', 'thParentSpanId', 'thParseInput'].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    ['thBuildOutput', 'thParseOutput'].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = '';
            el.className = 'output-box';
        }
    });
    if (typeof setStatus === 'function') setStatus('已清空');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseTraceparent: parseTraceparent,
        buildTraceparent: buildTraceparent,
        parseB3: parseB3,
        buildB3: buildB3,
        generateTraceId: generateTraceId,
        generateSpanId: generateSpanId,
        randomHex: randomHex,
    };
}
