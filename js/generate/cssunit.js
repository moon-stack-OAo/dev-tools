function cssunitDefaultOpts(opts) {
    const o = opts || {};
    return {
        rootFontSize: o.rootFontSize != null && isFinite(Number(o.rootFontSize)) ? Number(o.rootFontSize) : 16,
        emFontSize: o.emFontSize != null && isFinite(Number(o.emFontSize)) ? Number(o.emFontSize) : 16,
        viewportWidth: o.viewportWidth != null && isFinite(Number(o.viewportWidth)) ? Number(o.viewportWidth) : 1920,
        viewportHeight: o.viewportHeight != null && isFinite(Number(o.viewportHeight)) ? Number(o.viewportHeight) : 1080,
        percentRef: o.percentRef != null && isFinite(Number(o.percentRef)) ? Number(o.percentRef) : null,
    };
}

function cssunitFormatNumber(n) {
    if (!isFinite(n)) return 'NaN';
    if (n === 0) return '0';
    if (Number.isInteger(n) || Math.abs(n - Math.round(n)) < 1e-12) {
        return String(Math.round(n));
    }
    let s = n.toFixed(10).replace(/\.?0+$/, '');
    if (s === '0' && n !== 0) {
        s = n.toPrecision(12).replace(/\.?0+$/, '');
    }
    return s;
}

function cssunitToPx(value, unit, opts) {
    const raw = value == null ? '' : String(value).trim();
    if (!raw) {
        return { ok: false, msg: '请输入数值' };
    }
    const num = Number(raw);
    if (!isFinite(num)) {
        return { ok: false, msg: '请输入有效数值' };
    }
    const u = String(unit || 'px').trim().toLowerCase();
    const o = cssunitDefaultOpts(opts);
    if (o.rootFontSize <= 0 || o.emFontSize <= 0 || o.viewportWidth <= 0 || o.viewportHeight <= 0) {
        return { ok: false, msg: '根字号 / em 参照 / 视口必须大于 0' };
    }
    const percentRef = o.percentRef != null && o.percentRef > 0 ? o.percentRef : o.viewportWidth;
    let px;
    switch (u) {
        case 'px':
            px = num;
            break;
        case 'rem':
            px = num * o.rootFontSize;
            break;
        case 'em':
            px = num * o.emFontSize;
            break;
        case 'vw':
            px = (num / 100) * o.viewportWidth;
            break;
        case 'vh':
            px = (num / 100) * o.viewportHeight;
            break;
        case '%':
        case 'percent':
            px = (num / 100) * percentRef;
            break;
        default:
            return { ok: false, msg: '未知单位' };
    }
    if (!isFinite(px)) {
        return { ok: false, msg: '数值过大，无法换算' };
    }
    return { ok: true, px: px, opts: o, percentRef: percentRef };
}

function cssunitConvert(value, unit, opts) {
    const r = cssunitToPx(value, unit, opts);
    if (!r.ok) return r;
    const o = r.opts;
    const px = r.px;
    const percentRef = r.percentRef;
    const values = {
        px: px,
        rem: px / o.rootFontSize,
        em: px / o.emFontSize,
        vw: (px / o.viewportWidth) * 100,
        vh: (px / o.viewportHeight) * 100,
        percent: (px / percentRef) * 100,
    };
    const units = ['px', 'rem', 'em', 'vw', 'vh', '%'];
    const rows = units.map((u) => {
        const key = u === '%' ? 'percent' : u;
        const v = values[key];
        return {
            unit: u,
            value: v,
            text: cssunitFormatNumber(v),
            formatted: cssunitFormatNumber(v) + u,
        };
    });
    return {
        ok: true,
        px: px,
        values: values,
        rows: rows,
        opts: o,
        percentRef: percentRef,
        sourceUnit: String(unit || 'px').trim().toLowerCase(),
    };
}

function cssunitResultText(result) {
    if (!result || !result.ok) {
        return (result && result.msg) || '换算失败';
    }
    const o = result.opts;
    const lines = [
        '根字号: ' + cssunitFormatNumber(o.rootFontSize) + 'px',
        'em 参照: ' + cssunitFormatNumber(o.emFontSize) + 'px',
        '视口: ' + cssunitFormatNumber(o.viewportWidth) + ' × ' + cssunitFormatNumber(o.viewportHeight),
        '% 参照: ' + cssunitFormatNumber(result.percentRef) + 'px',
        '',
    ];
    result.rows.forEach((row) => {
        lines.push(row.formatted);
    });
    return lines.join('\n');
}

function cssunitGetOpts() {
    const root = document.getElementById('cuRoot');
    const em = document.getElementById('cuEm');
    const vw = document.getElementById('cuVw');
    const vh = document.getElementById('cuVh');
    const pref = document.getElementById('cuPercentRef');
    return {
        rootFontSize: root ? Number(root.value) : 16,
        emFontSize: em ? Number(em.value) : 16,
        viewportWidth: vw ? Number(vw.value) : 1920,
        viewportHeight: vh ? Number(vh.value) : 1080,
        percentRef: pref && String(pref.value).trim() !== '' ? Number(pref.value) : null,
    };
}

function cssunitRender() {
    const input = document.getElementById('cuInput');
    const unitEl = document.getElementById('cuUnit');
    const out = document.getElementById('cuResult');
    const textOut = document.getElementById('cuResultText');
    if (!input || !unitEl || !out) return;

    const value = input.value;
    const unit = unitEl.value;

    if (!String(value).trim()) {
        out.className = 'output-box';
        out.innerHTML = '<span style="color:var(--text-dim)">请输入数值</span>';
        if (textOut) textOut.textContent = '';
        return;
    }

    const r = cssunitConvert(value, unit, cssunitGetOpts());
    if (!r.ok) {
        out.className = 'output-box error';
        out.innerHTML = escapeHtml(r.msg || '换算失败');
        if (textOut) textOut.textContent = r.msg || '换算失败';
        return;
    }

    const o = r.opts;
    const parts = [];
    parts.push(
        '<div class="cu-meta">' +
            '根字号 <b>' +
            escapeHtml(cssunitFormatNumber(o.rootFontSize)) +
            'px</b> · em <b>' +
            escapeHtml(cssunitFormatNumber(o.emFontSize)) +
            'px</b> · 视口 <b>' +
            escapeHtml(cssunitFormatNumber(o.viewportWidth)) +
            '×' +
            escapeHtml(cssunitFormatNumber(o.viewportHeight)) +
            '</b> · % 参照 <b>' +
            escapeHtml(cssunitFormatNumber(r.percentRef)) +
            'px</b></div>',
    );
    parts.push('<div class="cu-grid">');
    r.rows.forEach((row) => {
        const src = String(r.sourceUnit || '').toLowerCase();
        const isSource = row.unit.toLowerCase() === src || (src === 'percent' && row.unit === '%');
        parts.push(
            '<div class="cu-card' +
                (isSource ? ' cu-card-source' : '') +
                '"><div class="cu-card-unit">' +
                escapeHtml(row.unit) +
                '</div><div class="cu-card-value">' +
                escapeHtml(row.text) +
                '</div></div>',
        );
    });
    parts.push('</div>');

    out.className = 'output-box';
    out.innerHTML = parts.join('');
    if (textOut) textOut.textContent = cssunitResultText(r);
    if (typeof setStatus === 'function') setStatus('CSS 单位换算完成');
}

function cssunitClear() {
    const input = document.getElementById('cuInput');
    if (input) input.value = '';
    const out = document.getElementById('cuResult');
    if (out) {
        out.className = 'output-box';
        out.innerHTML = '<span style="color:var(--text-dim)">请输入数值</span>';
    }
    const textOut = document.getElementById('cuResultText');
    if (textOut) textOut.textContent = '';
    if (typeof setStatus === 'function') setStatus('已清空');
}

function cssunitLoadExample() {
    const input = document.getElementById('cuInput');
    const unitEl = document.getElementById('cuUnit');
    const root = document.getElementById('cuRoot');
    const em = document.getElementById('cuEm');
    const vw = document.getElementById('cuVw');
    const vh = document.getElementById('cuVh');
    if (root) root.value = '16';
    if (em) em.value = '16';
    if (vw) vw.value = '1920';
    if (vh) vh.value = '1080';
    if (input) input.value = '16';
    if (unitEl) unitEl.value = 'px';
    cssunitRender();
}

if (typeof registerInit === 'function') {
    registerInit('cssunit', function () {
        cssunitRender();
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        cssunitToPx,
        cssunitConvert,
        cssunitFormatNumber,
        cssunitDefaultOpts,
        cssunitResultText,
    };
}
