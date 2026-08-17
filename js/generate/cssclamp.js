function cssclampFormatNum(n, digits) {
    if (!isFinite(n)) return '0';
    const d = digits != null ? digits : 4;
    if (n === 0) return '0';
    if (Number.isInteger(n) || Math.abs(n - Math.round(n)) < 1e-10) {
        return String(Math.round(n));
    }
    let s = Number(n.toFixed(d)).toString();
    if (s.indexOf('e') !== -1 || s.indexOf('E') !== -1) {
        s = n.toFixed(d).replace(/\.?0+$/, '');
    } else {
        s = s.replace(/\.?0+$/, '');
    }
    return s === '-0' ? '0' : s;
}

function cssclampCompute(minF, maxF, minV, maxV) {
    const minFont = Number(minF);
    const maxFont = Number(maxF);
    const minVw = Number(minV);
    const maxVw = Number(maxV);
    if (![minFont, maxFont, minVw, maxVw].every(function (x) {
        return isFinite(x);
    })) {
        return { ok: false, msg: '请输入有效数值' };
    }
    if (minFont <= 0 || maxFont <= 0) {
        return { ok: false, msg: '字号必须大于 0' };
    }
    if (minVw <= 0 || maxVw <= 0) {
        return { ok: false, msg: '视口宽度必须大于 0' };
    }
    if (maxVw === minVw) {
        return { ok: false, msg: '最大视口与最小视口不能相同' };
    }
    if (maxFont === minFont) {
        const preferred = cssclampFormatNum(minFont) + 'px';
        const clamp =
            'font-size: clamp(' +
            cssclampFormatNum(minFont) +
            'px, ' +
            preferred +
            ', ' +
            cssclampFormatNum(maxFont) +
            'px);';
        return {
            ok: true,
            clamp: clamp,
            preferred: preferred,
            slope: 0,
            yIntercept: minFont,
            minFont: minFont,
            maxFont: maxFont,
            minVw: minVw,
            maxVw: maxVw,
        };
    }
    const slope = (maxFont - minFont) / (maxVw - minVw);
    const yIntercept = minFont - slope * minVw;
    const vwPart = slope * 100;
    let preferred;
    const yi = cssclampFormatNum(yIntercept);
    const vw = cssclampFormatNum(vwPart);
    if (yIntercept === 0) {
        preferred = vw + 'vw';
    } else if (vwPart >= 0) {
        preferred = yi + 'px + ' + vw + 'vw';
    } else {
        preferred = yi + 'px - ' + cssclampFormatNum(Math.abs(vwPart)) + 'vw';
    }
    const preferredCss = 'calc(' + preferred + ')';
    const clamp =
        'font-size: clamp(' +
        cssclampFormatNum(minFont) +
        'px, ' +
        preferredCss +
        ', ' +
        cssclampFormatNum(maxFont) +
        'px);';
    return {
        ok: true,
        clamp: clamp,
        preferred: preferredCss,
        slope: slope,
        yIntercept: yIntercept,
        minFont: minFont,
        maxFont: maxFont,
        minVw: minVw,
        maxVw: maxVw,
    };
}

function cssclampFontAt(vw, result) {
    if (!result || !result.ok) return null;
    const slope = result.slope;
    const y = result.yIntercept;
    let size = y + slope * vw;
    size = Math.max(result.minFont, Math.min(result.maxFont, size));
    return size;
}

function cssclampReadInputs() {
    return {
        minF: document.getElementById('cclMinF') ? document.getElementById('cclMinF').value : 16,
        maxF: document.getElementById('cclMaxF') ? document.getElementById('cclMaxF').value : 32,
        minV: document.getElementById('cclMinV') ? document.getElementById('cclMinV').value : 320,
        maxV: document.getElementById('cclMaxV') ? document.getElementById('cclMaxV').value : 1280,
    };
}

function cssclampRender() {
    const inp = cssclampReadInputs();
    const r = cssclampCompute(inp.minF, inp.maxF, inp.minV, inp.maxV);
    const out = document.getElementById('cclOutput');
    const meta = document.getElementById('cclMeta');
    const preview = document.getElementById('cclPreviewText');
    const slider = document.getElementById('cclVwSlider');
    const vwLabel = document.getElementById('cclVwLabel');
    const sizeLabel = document.getElementById('cclSizeLabel');

    if (!r.ok) {
        if (out) out.value = '';
        if (meta) meta.textContent = r.msg || '';
        if (preview) preview.style.fontSize = '16px';
        return;
    }

    if (out) out.value = r.clamp;
    if (meta) {
        meta.textContent =
            'slope = ' +
            cssclampFormatNum(r.slope, 6) +
            ' · yIntercept = ' +
            cssclampFormatNum(r.yIntercept, 4) +
            'px · preferred = ' +
            r.preferred;
    }
    if (slider) {
        const minV = Math.min(r.minVw, r.maxVw);
        const maxV = Math.max(r.minVw, r.maxVw);
        slider.min = String(Math.floor(minV));
        slider.max = String(Math.ceil(maxV));
        let cur = Number(slider.value);
        if (!isFinite(cur) || cur < minV || cur > maxV) {
            cur = Math.round((minV + maxV) / 2);
            slider.value = String(cur);
        }
        cssclampUpdatePreview(r);
    } else if (preview) {
        preview.style.fontSize = r.minFont + 'px';
    }
    if (typeof setStatus === 'function') setStatus('clamp 已计算');
}

function cssclampUpdatePreview(result) {
    const r =
        result ||
        cssclampCompute(
            cssclampReadInputs().minF,
            cssclampReadInputs().maxF,
            cssclampReadInputs().minV,
            cssclampReadInputs().maxV,
        );
    const slider = document.getElementById('cclVwSlider');
    const preview = document.getElementById('cclPreviewText');
    const vwLabel = document.getElementById('cclVwLabel');
    const sizeLabel = document.getElementById('cclSizeLabel');
    if (!r || !r.ok) return;
    const vw = slider ? Number(slider.value) : (r.minVw + r.maxVw) / 2;
    const size = cssclampFontAt(vw, r);
    if (preview && size != null) preview.style.fontSize = size + 'px';
    if (vwLabel) vwLabel.textContent = cssclampFormatNum(vw, 0) + 'px';
    if (sizeLabel) sizeLabel.textContent = size != null ? cssclampFormatNum(size, 2) + 'px' : '—';
}

function cssclampOnSlider() {
    cssclampUpdatePreview();
}

function cssclampCopy() {
    const el = document.getElementById('cclOutput');
    const t = el ? el.value : '';
    if (!t) {
        if (typeof toast === 'function') toast('无内容可复制');
        return;
    }
    if (typeof safeCopy === 'function') safeCopy(t, '已复制 clamp');
}

function cssclampLoadExample() {
    const a = document.getElementById('cclMinF');
    const b = document.getElementById('cclMaxF');
    const c = document.getElementById('cclMinV');
    const d = document.getElementById('cclMaxV');
    if (a) a.value = '16';
    if (b) b.value = '32';
    if (c) c.value = '320';
    if (d) d.value = '1280';
    cssclampRender();
}

function cssclampReset() {
    cssclampLoadExample();
}

if (typeof registerInit === 'function') {
    registerInit('cssclamp', function () {
        cssclampRender();
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        cssclampCompute,
        cssclampFormatNum,
        cssclampFontAt,
    };
}
