const cubicbezierPresets = {
    ease: { x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 },
    'ease-in': { x1: 0.42, y1: 0, x2: 1, y2: 1 },
    'ease-out': { x1: 0, y1: 0, x2: 0.58, y2: 1 },
    'ease-in-out': { x1: 0.42, y1: 0, x2: 0.58, y2: 1 },
    linear: { x1: 0, y1: 0, x2: 1, y2: 1 },
};

function cubicbezierClamp(p) {
    const o = p || {};
    const num = (v, fb) => {
        const n = Number(v);
        return isFinite(n) ? n : fb;
    };
    let x1 = num(o.x1, 0.25);
    let y1 = num(o.y1, 0.1);
    let x2 = num(o.x2, 0.25);
    let y2 = num(o.y2, 1);
    x1 = Math.max(0, Math.min(1, x1));
    x2 = Math.max(0, Math.min(1, x2));
    return { x1: x1, y1: y1, x2: x2, y2: y2 };
}

function cubicbezierFormatNum(n) {
    if (!isFinite(n)) return '0';
    if (Number.isInteger(n) || Math.abs(n - Math.round(n)) < 1e-9) {
        return String(Math.round(n));
    }
    return String(Number(n.toFixed(3))).replace(/\.?0+$/, '');
}

function cubicbezierSerialize(p) {
    const c = cubicbezierClamp(p);
    return (
        'cubic-bezier(' +
        cubicbezierFormatNum(c.x1) +
        ', ' +
        cubicbezierFormatNum(c.y1) +
        ', ' +
        cubicbezierFormatNum(c.x2) +
        ', ' +
        cubicbezierFormatNum(c.y2) +
        ')'
    );
}

function cubicbezierCss(p, duration) {
    const d = duration != null && String(duration).trim() !== '' ? String(duration).trim() : '0.3s';
    return 'transition: all ' + d + ' ' + cubicbezierSerialize(p) + ';';
}

let _cbz = cubicbezierClamp(cubicbezierPresets.ease);
let _cbzDrag = null;

function cubicbezierReadFromDom() {
    const g = (id) => document.getElementById(id);
    _cbz = cubicbezierClamp({
        x1: g('cbzX1') ? g('cbzX1').value : _cbz.x1,
        y1: g('cbzY1') ? g('cbzY1').value : _cbz.y1,
        x2: g('cbzX2') ? g('cbzX2').value : _cbz.x2,
        y2: g('cbzY2') ? g('cbzY2').value : _cbz.y2,
    });
    return _cbz;
}

function cubicbezierWriteToDom(p) {
    const c = cubicbezierClamp(p);
    const set = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.value = String(Number(v.toFixed(3)));
    };
    set('cbzX1', c.x1);
    set('cbzY1', c.y1);
    set('cbzX2', c.x2);
    set('cbzY2', c.y2);
    _cbz = c;
}

function cubicbezierApplyPreset(name) {
    const p = cubicbezierPresets[name];
    if (!p) return;
    cubicbezierWriteToDom(p);
    const sel = document.getElementById('cbzPreset');
    if (sel) sel.value = name;
    cubicbezierRender();
}

function cubicbezierOnPresetChange() {
    const sel = document.getElementById('cbzPreset');
    if (!sel || !sel.value) return;
    if (sel.value === 'custom') return;
    cubicbezierApplyPreset(sel.value);
}

function cubicbezierOnChange() {
    const sel = document.getElementById('cbzPreset');
    if (sel) sel.value = 'custom';
    cubicbezierReadFromDom();
    cubicbezierRender();
}

function cubicbezierGetCanvasMetrics(canvas) {
    const w = canvas.width;
    const h = canvas.height;
    const pad = 28;
    const size = Math.min(w, h) - pad * 2;
    const ox = (w - size) / 2;
    const oy = (h - size) / 2;
    return { pad: pad, size: size, ox: ox, oy: oy, w: w, h: h };
}

function cubicbezierToCanvas(x, y, m) {
    return {
        cx: m.ox + x * m.size,
        cy: m.oy + (1 - y) * m.size,
    };
}

function cubicbezierFromCanvas(cx, cy, m) {
    return {
        x: (cx - m.ox) / m.size,
        y: 1 - (cy - m.oy) / m.size,
    };
}

function cubicbezierDraw() {
    const canvas = document.getElementById('cbzCanvas');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || 280;
    const cssH = canvas.clientHeight || 280;
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = cssW;
    const h = cssH;
    const m = { pad: 28, size: Math.min(w, h) - 56, ox: 0, oy: 0, w: w, h: h };
    m.ox = (w - m.size) / 2;
    m.oy = (h - m.size) / 2;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim() || '#1e293b';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(m.ox, m.oy, m.size, m.size);

    ctx.beginPath();
    for (let i = 1; i < 4; i++) {
        const t = i / 4;
        ctx.moveTo(m.ox + t * m.size, m.oy);
        ctx.lineTo(m.ox + t * m.size, m.oy + m.size);
        ctx.moveTo(m.ox, m.oy + t * m.size);
        ctx.lineTo(m.ox + m.size, m.oy + t * m.size);
    }
    ctx.stroke();

    const p0 = cubicbezierToCanvas(0, 0, m);
    const p3 = cubicbezierToCanvas(1, 1, m);
    const p1 = cubicbezierToCanvas(_cbz.x1, _cbz.y1, m);
    const p2 = cubicbezierToCanvas(_cbz.x2, _cbz.y2, m);

    ctx.strokeStyle = 'rgba(99, 179, 237, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p0.cx, p0.cy);
    ctx.lineTo(p1.cx, p1.cy);
    ctx.moveTo(p3.cx, p3.cy);
    ctx.lineTo(p2.cx, p2.cy);
    ctx.stroke();

    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(p0.cx, p0.cy);
    ctx.bezierCurveTo(p1.cx, p1.cy, p2.cx, p2.cy, p3.cx, p3.cy);
    ctx.stroke();

    const drawHandle = (pt, color) => {
        ctx.beginPath();
        ctx.arc(pt.cx, pt.cy, 7, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    };
    drawHandle(p0, '#94a3b8');
    drawHandle(p3, '#94a3b8');
    drawHandle(p1, '#22d3ee');
    drawHandle(p2, '#f97316');
}

function cubicbezierHitTest(cx, cy) {
    const canvas = document.getElementById('cbzCanvas');
    if (!canvas) return null;
    const w = canvas.clientWidth || 280;
    const h = canvas.clientHeight || 280;
    const m = { pad: 28, size: Math.min(w, h) - 56, ox: 0, oy: 0, w: w, h: h };
    m.ox = (w - m.size) / 2;
    m.oy = (h - m.size) / 2;
    const p1 = cubicbezierToCanvas(_cbz.x1, _cbz.y1, m);
    const p2 = cubicbezierToCanvas(_cbz.x2, _cbz.y2, m);
    const dist = (a, b) => Math.hypot(a.cx - b.cx, a.cy - b.cy);
    if (dist({ cx: cx, cy: cy }, p1) <= 12) return 1;
    if (dist({ cx: cx, cy: cy }, p2) <= 12) return 2;
    return null;
}

function cubicbezierOnPointerDown(e) {
    const canvas = document.getElementById('cbzCanvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    _cbzDrag = cubicbezierHitTest(cx, cy);
    if (_cbzDrag) {
        e.preventDefault();
        canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    }
}

function cubicbezierOnPointerMove(e) {
    if (!_cbzDrag) return;
    const canvas = document.getElementById('cbzCanvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const w = canvas.clientWidth || 280;
    const h = canvas.clientHeight || 280;
    const m = { pad: 28, size: Math.min(w, h) - 56, ox: 0, oy: 0, w: w, h: h };
    m.ox = (w - m.size) / 2;
    m.oy = (h - m.size) / 2;
    const pt = cubicbezierFromCanvas(cx, cy, m);
    if (_cbzDrag === 1) {
        _cbz = cubicbezierClamp({ x1: pt.x, y1: pt.y, x2: _cbz.x2, y2: _cbz.y2 });
    } else {
        _cbz = cubicbezierClamp({ x1: _cbz.x1, y1: _cbz.y1, x2: pt.x, y2: pt.y });
    }
    cubicbezierWriteToDom(_cbz);
    const sel = document.getElementById('cbzPreset');
    if (sel) sel.value = 'custom';
    cubicbezierRender(false);
}

function cubicbezierOnPointerUp() {
    _cbzDrag = null;
}

function cubicbezierPlayAnim() {
    const box = document.getElementById('cbzAnimBox');
    if (!box) return;
    const durEl = document.getElementById('cbzDuration');
    const dur = durEl && String(durEl.value).trim() !== '' ? String(durEl.value).trim() : '0.8s';
    box.style.transition = 'none';
    box.style.transform = 'translateX(0)';
    void box.offsetWidth;
    box.style.transition = 'transform ' + dur + ' ' + cubicbezierSerialize(_cbz);
    box.style.transform = 'translateX(calc(100% - 40px))';
}

function cubicbezierRender(updateStatus) {
    cubicbezierReadFromDom();
    const value = cubicbezierSerialize(_cbz);
    const durEl = document.getElementById('cbzDuration');
    const dur = durEl && String(durEl.value).trim() !== '' ? String(durEl.value).trim() : '0.3s';
    const css = cubicbezierCss(_cbz, dur);
    const out = document.getElementById('cbzCss');
    const textOut = document.getElementById('cbzCssText');
    if (out) {
        out.className = 'output-box';
        out.textContent = value + '\n' + css;
    }
    if (textOut) textOut.textContent = value + '\n' + css;
    cubicbezierDraw();
    if (updateStatus !== false && typeof setStatus === 'function') setStatus('曲线已更新');
}

function cubicbezierCopy() {
    const textOut = document.getElementById('cbzCssText');
    if (typeof copyText === 'function' && textOut) {
        copyText('cbzCssText');
        return;
    }
    if (typeof safeCopy === 'function') {
        safeCopy(textOut ? textOut.textContent : cubicbezierSerialize(_cbz));
    }
}

function cubicbezierReset() {
    cubicbezierWriteToDom(cubicbezierPresets.ease);
    const sel = document.getElementById('cbzPreset');
    if (sel) sel.value = 'ease';
    const dur = document.getElementById('cbzDuration');
    if (dur) dur.value = '0.3s';
    cubicbezierRender();
    if (typeof setStatus === 'function') setStatus('已重置');
}

function cubicbezierBindCanvas() {
    const canvas = document.getElementById('cbzCanvas');
    if (!canvas || canvas._cbzBound) return;
    canvas._cbzBound = true;
    canvas.addEventListener('pointerdown', cubicbezierOnPointerDown);
    canvas.addEventListener('pointermove', cubicbezierOnPointerMove);
    canvas.addEventListener('pointerup', cubicbezierOnPointerUp);
    canvas.addEventListener('pointercancel', cubicbezierOnPointerUp);
    window.addEventListener('resize', function () {
        cubicbezierDraw();
    });
}

if (typeof registerInit === 'function') {
    registerInit('cubicbezier', function () {
        _cbz = cubicbezierClamp(cubicbezierPresets.ease);
        cubicbezierWriteToDom(_cbz);
        const sel = document.getElementById('cbzPreset');
        if (sel) sel.value = 'ease';
        cubicbezierBindCanvas();
        cubicbezierRender();
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        cubicbezierSerialize,
        cubicbezierPresets,
        cubicbezierClamp,
        cubicbezierCss,
        cubicbezierFormatNum,
    };
}
