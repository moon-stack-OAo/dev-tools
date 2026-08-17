function svgoptByteLen(s) {
    if (s == null) return 0;
    if (typeof TextEncoder !== 'undefined') {
        return new TextEncoder().encode(String(s)).length;
    }
    try {
        return unescape(encodeURIComponent(String(s))).length;
    } catch (e) {
        return String(s).length;
    }
}

function svgoptDefaultOpts(opts) {
    const o = opts || {};
    return {
        stripComments: o.stripComments !== false,
        collapseWhitespace: o.collapseWhitespace !== false,
        stripInkscape: o.stripInkscape !== false,
        stripXmlSpace: o.stripXmlSpace !== false,
        stripWidthHeight: !!o.stripWidthHeight,
        trimDecimals: o.trimDecimals != null && isFinite(Number(o.trimDecimals)) ? Number(o.trimDecimals) : null,
    };
}

function svgoptCollapseWs(svg) {
    let s = String(svg);
    s = s.replace(/>\s+</g, '><');
    s = s.replace(/[ \t\f\v]+/g, ' ');
    s = s.replace(/\n+/g, '\n');
    s = s.replace(/\s*\n\s*/g, '\n');
    return s.trim();
}

function svgoptStripComments(svg) {
    return String(svg).replace(/<!--[\s\S]*?-->/g, '');
}

function svgoptStripAttrs(svg, opts) {
    let s = String(svg);
    if (opts.stripInkscape) {
        s = s.replace(/\s+(?:inkscape|sodipodi|xmlns:(?:inkscape|sodipodi)|i:|sodipodi:)[a-zA-Z0-9_.:-]*=(?:"[^"]*"|'[^']*')/g, '');
        s = s.replace(/\s+xmlns:inkscape=(?:"[^"]*"|'[^']*')/g, '');
        s = s.replace(/\s+xmlns:sodipodi=(?:"[^"]*"|'[^']*')/g, '');
    }
    if (opts.stripXmlSpace) {
        s = s.replace(/\s+xml:space=(?:"[^"]*"|'[^']*')/g, '');
    }
    if (opts.stripWidthHeight) {
        s = s.replace(/<svg\b([^>]*)>/i, function (m, attrs) {
            let a = attrs;
            a = a.replace(/\s+width=(?:"[^"]*"|'[^']*')/i, '');
            a = a.replace(/\s+height=(?:"[^"]*"|'[^']*')/i, '');
            return '<svg' + a + '>';
        });
    }
    return s;
}

function svgoptTrimNumberDecimals(svg, digits) {
    if (digits == null || !isFinite(digits) || digits < 0) return String(svg);
    const d = Math.min(8, Math.floor(digits));
    return String(svg).replace(/(-?\d+\.\d+)/g, function (m) {
        const n = Number(m);
        if (!isFinite(n)) return m;
        let t = n.toFixed(d);
        t = t.replace(/\.?0+$/, '');
        return t === '-0' ? '0' : t;
    });
}

function svgoptOptimize(svg, opts) {
    const raw = svg == null ? '' : String(svg);
    if (!raw.trim()) {
        return { ok: false, msg: '请粘贴 SVG 源码', before: 0, after: 0, svg: '' };
    }
    if (!/<svg[\s>]/i.test(raw)) {
        return {
            ok: false,
            msg: '未检测到 <svg> 根元素',
            before: svgoptByteLen(raw),
            after: 0,
            svg: '',
        };
    }
    const o = svgoptDefaultOpts(opts);
    let out = raw;
    if (o.stripComments) out = svgoptStripComments(out);
    out = svgoptStripAttrs(out, o);
    if (o.trimDecimals != null) out = svgoptTrimNumberDecimals(out, o.trimDecimals);
    if (o.collapseWhitespace) out = svgoptCollapseWs(out);
    else out = out.trim();
    const before = svgoptByteLen(raw);
    const after = svgoptByteLen(out);
    return { ok: true, svg: out, before: before, after: after };
}

function svgoptToDataUri(svg) {
    const s = svg == null ? '' : String(svg).trim();
    if (!s) return '';
    const encoded = encodeURIComponent(s)
        .replace(/%20/g, ' ')
        .replace(/%3D/g, '=')
        .replace(/%3A/g, ':')
        .replace(/%2F/g, '/')
        .replace(/%22/g, "'");
    return 'data:image/svg+xml,' + encoded;
}

function svgoptGetOpts() {
    return {
        stripComments: !!(document.getElementById('svoStripComments') || { checked: true }).checked,
        collapseWhitespace: !!(document.getElementById('svoCollapseWs') || { checked: true }).checked,
        stripInkscape: !!(document.getElementById('svoStripInk') || { checked: true }).checked,
        stripXmlSpace: !!(document.getElementById('svoStripXmlSpace') || { checked: true }).checked,
        stripWidthHeight: !!(document.getElementById('svoStripWh') || {}).checked,
    };
}

function svgoptFmtSize(n) {
    if (typeof formatBytes === 'function') return formatBytes(n);
    if (n < 1024) return n + ' B';
    return (n / 1024).toFixed(2) + ' KB';
}

function svgoptRender() {
    const input = document.getElementById('svoInput');
    const outCode = document.getElementById('svoOutput');
    const outUri = document.getElementById('svoDataUri');
    const preview = document.getElementById('svoPreview');
    const stats = document.getElementById('svoStats');
    if (!input || !outCode) return;

    const r = svgoptOptimize(input.value, svgoptGetOpts());
    if (!r.ok) {
        outCode.value = '';
        if (outUri) outUri.value = '';
        if (preview) preview.innerHTML = '<span style="color:var(--text-dim)">' + escapeHtml(r.msg || '无效') + '</span>';
        if (stats) stats.textContent = r.msg || '';
        return;
    }

    outCode.value = r.svg;
    const uri = svgoptToDataUri(r.svg);
    if (outUri) outUri.value = uri;
    if (preview) {
        preview.innerHTML = r.svg;
    }
    if (stats) {
        const saved = r.before - r.after;
        const pct = r.before > 0 ? ((saved / r.before) * 100).toFixed(1) : '0';
        stats.textContent =
            '优化前 ' +
            svgoptFmtSize(r.before) +
            ' → 优化后 ' +
            svgoptFmtSize(r.after) +
            '（节省 ' +
            svgoptFmtSize(Math.max(0, saved)) +
            ' / ' +
            pct +
            '%）';
    }
    if (typeof setStatus === 'function') setStatus('SVG 优化完成');
}

function svgoptCopyCode() {
    const el = document.getElementById('svoOutput');
    const t = el ? el.value : '';
    if (!t) {
        if (typeof toast === 'function') toast('无内容可复制');
        return;
    }
    if (typeof safeCopy === 'function') safeCopy(t, '已复制优化后 SVG');
    else if (typeof copyText === 'function') copyText('svoOutput');
}

function svgoptCopyUri() {
    const el = document.getElementById('svoDataUri');
    const t = el ? el.value : '';
    if (!t) {
        if (typeof toast === 'function') toast('无内容可复制');
        return;
    }
    if (typeof safeCopy === 'function') safeCopy(t, '已复制 data URI');
}

function svgoptDownload() {
    const el = document.getElementById('svoOutput');
    const t = el ? el.value : '';
    if (!t) {
        if (typeof toast === 'function') toast('无内容可下载');
        return;
    }
    const blob = new Blob([t], { type: 'image/svg+xml;charset=utf-8' });
    if (typeof downloadBlob === 'function') {
        downloadBlob('optimized.svg', blob);
    } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'optimized.svg';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () {
            URL.revokeObjectURL(a.href);
        }, 1000);
    }
    if (typeof toast === 'function') toast('已下载 optimized.svg');
}

function svgoptClear() {
    const input = document.getElementById('svoInput');
    if (input) input.value = '';
    const outCode = document.getElementById('svoOutput');
    if (outCode) outCode.value = '';
    const outUri = document.getElementById('svoDataUri');
    if (outUri) outUri.value = '';
    const preview = document.getElementById('svoPreview');
    if (preview) preview.innerHTML = '<span style="color:var(--text-dim)">预览区</span>';
    const stats = document.getElementById('svoStats');
    if (stats) stats.textContent = '';
    if (typeof setStatus === 'function') setStatus('已清空');
}

function svgoptLoadExample() {
    const input = document.getElementById('svoInput');
    if (input) {
        input.value =
            '<?xml version="1.0"?>\n' +
            '<!-- sample -->\n' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"\n' +
            '  xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"\n' +
            '  inkscape:version="1.0" xml:space="preserve">\n' +
            '  <circle cx="50" cy="50" r="40" fill="#6366f1" />\n' +
            '</svg>\n';
    }
    svgoptRender();
}

if (typeof registerInit === 'function') {
    registerInit('svgopt', function () {});
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        svgoptOptimize,
        svgoptToDataUri,
        svgoptDefaultOpts,
        svgoptByteLen,
    };
}
