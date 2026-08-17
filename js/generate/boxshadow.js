function boxshadowDefaultLayer() {
    return {
        offsetX: 0,
        offsetY: 4,
        blur: 12,
        spread: 0,
        color: 'rgba(0, 0, 0, 0.15)',
        inset: false,
    };
}

function boxshadowNormalizeLayer(layer) {
    const d = boxshadowDefaultLayer();
    const L = layer || {};
    const num = (v, fallback) => {
        const n = Number(v);
        return isFinite(n) ? n : fallback;
    };
    return {
        offsetX: num(L.offsetX, d.offsetX),
        offsetY: num(L.offsetY, d.offsetY),
        blur: Math.max(0, num(L.blur, d.blur)),
        spread: num(L.spread, d.spread),
        color: L.color != null && String(L.color).trim() !== '' ? String(L.color).trim() : d.color,
        inset: !!L.inset,
    };
}

function boxshadowFormatNum(n) {
    if (!isFinite(n)) return '0';
    if (Number.isInteger(n) || Math.abs(n - Math.round(n)) < 1e-9) {
        return String(Math.round(n));
    }
    return String(Number(n.toFixed(4))).replace(/\.?0+$/, '');
}

function boxshadowSerializeLayer(layer) {
    const L = boxshadowNormalizeLayer(layer);
    const parts = [];
    if (L.inset) parts.push('inset');
    parts.push(boxshadowFormatNum(L.offsetX) + 'px');
    parts.push(boxshadowFormatNum(L.offsetY) + 'px');
    parts.push(boxshadowFormatNum(L.blur) + 'px');
    parts.push(boxshadowFormatNum(L.spread) + 'px');
    parts.push(L.color);
    return parts.join(' ');
}

function boxshadowSerialize(layers) {
    const list = Array.isArray(layers) ? layers : [];
    if (!list.length) return 'none';
    return list.map((L) => boxshadowSerializeLayer(L)).join(', ');
}

function boxshadowCss(layers) {
    return 'box-shadow: ' + boxshadowSerialize(layers) + ';';
}

function boxshadowParse(css) {
    if (css == null) return [];
    let s = String(css).trim();
    if (!s || s === 'none') return [];
    s = s.replace(/^box-shadow\s*:\s*/i, '').replace(/;\s*$/, '').trim();
    if (!s || s === 'none') return [];

    const parts = [];
    let buf = '';
    let depth = 0;
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === '(') depth++;
        if (ch === ')') depth = Math.max(0, depth - 1);
        if (ch === ',' && depth === 0) {
            if (buf.trim()) parts.push(buf.trim());
            buf = '';
            continue;
        }
        buf += ch;
    }
    if (buf.trim()) parts.push(buf.trim());

    return parts.map((part) => {
        const inset = /\binset\b/i.test(part);
        const cleaned = part.replace(/\binset\b/gi, ' ').trim();
        const colorMatch = cleaned.match(
            /(rgba?\([^)]+\)|hsla?\([^)]+\)|#[0-9a-fA-F]{3,8}|[a-zA-Z]+)\s*$/,
        );
        let color = 'rgba(0, 0, 0, 0.15)';
        let numsPart = cleaned;
        if (colorMatch) {
            color = colorMatch[1];
            numsPart = cleaned.slice(0, colorMatch.index).trim();
        }
        const nums = (numsPart.match(/-?[\d.]+/g) || []).map(Number);
        return boxshadowNormalizeLayer({
            inset: inset,
            offsetX: nums[0] != null ? nums[0] : 0,
            offsetY: nums[1] != null ? nums[1] : 0,
            blur: nums[2] != null ? nums[2] : 0,
            spread: nums[3] != null ? nums[3] : 0,
            color: color,
        });
    });
}

let _bshLayers = [boxshadowDefaultLayer()];

function boxshadowGetPreviewStyle() {
    const bg = document.getElementById('bshPreviewBg');
    const radius = document.getElementById('bshRadius');
    const boxBg = document.getElementById('bshBoxBg');
    return {
        previewBg: bg && bg.value ? bg.value : '#f1f5f9',
        radius: radius != null && isFinite(Number(radius.value)) ? Number(radius.value) : 12,
        boxBg: boxBg && boxBg.value ? boxBg.value : '#ffffff',
    };
}

function boxshadowReadLayersFromDom() {
    const list = document.getElementById('bshLayers');
    if (!list) return _bshLayers.slice();
    const cards = list.querySelectorAll('.bsh-layer');
    const layers = [];
    cards.forEach((card) => {
        const g = (sel) => card.querySelector(sel);
        const insetEl = g('[data-field="inset"]');
        layers.push(
            boxshadowNormalizeLayer({
                offsetX: g('[data-field="offsetX"]') ? g('[data-field="offsetX"]').value : 0,
                offsetY: g('[data-field="offsetY"]') ? g('[data-field="offsetY"]').value : 0,
                blur: g('[data-field="blur"]') ? g('[data-field="blur"]').value : 0,
                spread: g('[data-field="spread"]') ? g('[data-field="spread"]').value : 0,
                color: g('[data-field="color"]') ? g('[data-field="color"]').value : '',
                inset: insetEl ? insetEl.checked : false,
            }),
        );
    });
    _bshLayers = layers.length ? layers : [boxshadowDefaultLayer()];
    return _bshLayers;
}

function boxshadowRenderLayers() {
    const list = document.getElementById('bshLayers');
    if (!list) return;
    const layers = _bshLayers.length ? _bshLayers : [boxshadowDefaultLayer()];
    _bshLayers = layers;
    list.innerHTML = layers
        .map((L, i) => {
            const layer = boxshadowNormalizeLayer(L);
            return (
                '<div class="bsh-layer" data-index="' +
                i +
                '">' +
                '<div class="bsh-layer-head">' +
                '<span class="bsh-layer-title">阴影 ' +
                (i + 1) +
                '</span>' +
                '<label class="bsh-check"><input type="checkbox" data-field="inset"' +
                (layer.inset ? ' checked' : '') +
                ' onchange="boxshadowOnChange()"> inset</label>' +
                '<button type="button" class="outline bsh-del" onclick="boxshadowRemoveLayer(' +
                i +
                ')"' +
                (layers.length <= 1 ? ' disabled' : '') +
                '>删除</button>' +
                '</div>' +
                '<div class="bsh-fields">' +
                '<div><div class="label">X</div><input type="number" data-field="offsetX" value="' +
                escapeHtml(String(layer.offsetX)) +
                '" oninput="boxshadowOnChange()"></div>' +
                '<div><div class="label">Y</div><input type="number" data-field="offsetY" value="' +
                escapeHtml(String(layer.offsetY)) +
                '" oninput="boxshadowOnChange()"></div>' +
                '<div><div class="label">Blur</div><input type="number" min="0" data-field="blur" value="' +
                escapeHtml(String(layer.blur)) +
                '" oninput="boxshadowOnChange()"></div>' +
                '<div><div class="label">Spread</div><input type="number" data-field="spread" value="' +
                escapeHtml(String(layer.spread)) +
                '" oninput="boxshadowOnChange()"></div>' +
                '<div class="bsh-color-field"><div class="label">颜色</div><input type="text" data-field="color" value="' +
                escapeHtml(layer.color) +
                '" oninput="boxshadowOnChange()"></div>' +
                '</div></div>'
            );
        })
        .join('');
}

function boxshadowOnChange() {
    boxshadowReadLayersFromDom();
    boxshadowRender();
}

function boxshadowAddLayer() {
    boxshadowReadLayersFromDom();
    _bshLayers.push(boxshadowDefaultLayer());
    boxshadowRenderLayers();
    boxshadowRender();
}

function boxshadowRemoveLayer(index) {
    boxshadowReadLayersFromDom();
    if (_bshLayers.length <= 1) return;
    _bshLayers.splice(index, 1);
    boxshadowRenderLayers();
    boxshadowRender();
}

function boxshadowRender() {
    const layers = boxshadowReadLayersFromDom();
    const css = boxshadowCss(layers);
    const value = boxshadowSerialize(layers);
    const out = document.getElementById('bshCss');
    const textOut = document.getElementById('bshCssText');
    const preview = document.getElementById('bshPreview');
    const box = document.getElementById('bshBox');
    if (out) {
        out.className = 'output-box';
        out.textContent = css;
    }
    if (textOut) textOut.textContent = css;
    const style = boxshadowGetPreviewStyle();
    if (preview) {
        preview.style.background = style.previewBg;
    }
    if (box) {
        box.style.background = style.boxBg;
        box.style.borderRadius = style.radius + 'px';
        box.style.boxShadow = value;
    }
    if (typeof setStatus === 'function') setStatus('阴影已更新');
}

function boxshadowCopy() {
    const textOut = document.getElementById('bshCssText');
    const css = textOut ? textOut.textContent : boxshadowCss(_bshLayers);
    if (typeof copyText === 'function' && textOut) {
        copyText('bshCssText');
        return;
    }
    if (typeof safeCopy === 'function') {
        safeCopy(css);
        return;
    }
}

function boxshadowReset() {
    _bshLayers = [boxshadowDefaultLayer()];
    const bg = document.getElementById('bshPreviewBg');
    const radius = document.getElementById('bshRadius');
    const boxBg = document.getElementById('bshBoxBg');
    if (bg) bg.value = '#e2e8f0';
    if (radius) radius.value = '12';
    if (boxBg) boxBg.value = '#ffffff';
    boxshadowRenderLayers();
    boxshadowRender();
    if (typeof setStatus === 'function') setStatus('已重置');
}

function boxshadowLoadExample() {
    _bshLayers = [
        boxshadowNormalizeLayer({
            offsetX: 0,
            offsetY: 8,
            blur: 24,
            spread: -4,
            color: 'rgba(15, 23, 42, 0.18)',
            inset: false,
        }),
        boxshadowNormalizeLayer({
            offsetX: 0,
            offsetY: 2,
            blur: 6,
            spread: 0,
            color: 'rgba(15, 23, 42, 0.08)',
            inset: false,
        }),
    ];
    boxshadowRenderLayers();
    boxshadowRender();
}

if (typeof registerInit === 'function') {
    registerInit('boxshadow', function () {
        _bshLayers = [boxshadowDefaultLayer()];
        boxshadowRenderLayers();
        boxshadowRender();
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        boxshadowDefaultLayer,
        boxshadowNormalizeLayer,
        boxshadowSerialize,
        boxshadowSerializeLayer,
        boxshadowCss,
        boxshadowParse,
        boxshadowFormatNum,
    };
}
