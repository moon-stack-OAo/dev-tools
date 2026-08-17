function gradientDefaultConfig() {
    return {
        type: 'linear',
        angle: 90,
        shape: 'ellipse',
        position: 'center',
        stops: [
            { color: '#6366f1', position: 0 },
            { color: '#22d3ee', position: 100 },
        ],
    };
}

function gradientNormalizeStop(stop) {
    const s = stop || {};
    let pos = Number(s.position);
    if (!isFinite(pos)) pos = 0;
    pos = Math.max(0, Math.min(100, pos));
    const color = s.color != null && String(s.color).trim() !== '' ? String(s.color).trim() : '#000000';
    return { color: color, position: pos };
}

function gradientNormalizeConfig(config) {
    const d = gradientDefaultConfig();
    const c = config || {};
    const type = c.type === 'radial' ? 'radial' : 'linear';
    let angle = Number(c.angle);
    if (!isFinite(angle)) angle = d.angle;
    angle = ((angle % 360) + 360) % 360;
    const shape = c.shape === 'circle' ? 'circle' : 'ellipse';
    const position =
        c.position != null && String(c.position).trim() !== '' ? String(c.position).trim() : d.position;
    let stops = Array.isArray(c.stops) ? c.stops.map(gradientNormalizeStop) : d.stops.map(gradientNormalizeStop);
    if (stops.length < 2) {
        stops = d.stops.map(gradientNormalizeStop);
    }
    stops = stops.slice().sort((a, b) => a.position - b.position);
    return { type: type, angle: angle, shape: shape, position: position, stops: stops };
}

function gradientFormatPos(n) {
    if (!isFinite(n)) return '0%';
    if (Number.isInteger(n) || Math.abs(n - Math.round(n)) < 1e-9) {
        return Math.round(n) + '%';
    }
    return Number(n.toFixed(2)) + '%';
}

function gradientSerialize(config) {
    const c = gradientNormalizeConfig(config);
    const stopStr = c.stops.map((s) => s.color + ' ' + gradientFormatPos(s.position)).join(', ');
    if (c.type === 'radial') {
        return 'radial-gradient(' + c.shape + ' at ' + c.position + ', ' + stopStr + ')';
    }
    return 'linear-gradient(' + c.angle + 'deg, ' + stopStr + ')';
}

function gradientCss(config) {
    return 'background-image: ' + gradientSerialize(config) + ';';
}

let _gdConfig = gradientDefaultConfig();

function gradientReadConfigFromDom() {
    const typeEl = document.getElementById('gdType');
    const angleEl = document.getElementById('gdAngle');
    const shapeEl = document.getElementById('gdShape');
    const posEl = document.getElementById('gdPosition');
    const list = document.getElementById('gdStops');
    const type = typeEl && typeEl.value === 'radial' ? 'radial' : 'linear';
    const angle = angleEl ? Number(angleEl.value) : 90;
    const shape = shapeEl && shapeEl.value === 'circle' ? 'circle' : 'ellipse';
    const position = posEl ? posEl.value : 'center';
    let stops = [];
    if (list) {
        list.querySelectorAll('.gd-stop').forEach((row) => {
            const colorEl =
                row.querySelector('input.gd-color-text[data-field="color"]') ||
                row.querySelector('input[type="text"][data-field="color"]');
            const posStop = row.querySelector('[data-field="position"]');
            stops.push({
                color: colorEl ? colorEl.value : '#000',
                position: posStop ? Number(posStop.value) : 0,
            });
        });
    }
    if (stops.length < 2) {
        stops = gradientDefaultConfig().stops;
    }
    _gdConfig = gradientNormalizeConfig({
        type: type,
        angle: angle,
        shape: shape,
        position: position,
        stops: stops,
    });
    return _gdConfig;
}

function gradientSyncTypeUi() {
    const typeEl = document.getElementById('gdType');
    const linearOpts = document.getElementById('gdLinearOpts');
    const radialOpts = document.getElementById('gdRadialOpts');
    const isRadial = typeEl && typeEl.value === 'radial';
    if (linearOpts) linearOpts.style.display = isRadial ? 'none' : '';
    if (radialOpts) radialOpts.style.display = isRadial ? '' : 'none';
}

function gradientRenderStops() {
    const list = document.getElementById('gdStops');
    if (!list) return;
    const cfg = gradientNormalizeConfig(_gdConfig);
    _gdConfig = cfg;
    list.innerHTML = cfg.stops
        .map((s, i) => {
            return (
                '<div class="gd-stop" data-index="' +
                i +
                '">' +
                '<input type="color" data-field="color" value="' +
                escapeHtml(s.color.startsWith('#') && (s.color.length === 7 || s.color.length === 4) ? s.color : '#6366f1') +
                '" oninput="gradientOnColorPick(this)">' +
                '<input type="text" class="gd-color-text" data-field="color" value="' +
                escapeHtml(s.color) +
                '" oninput="gradientOnChange()">' +
                '<input type="number" min="0" max="100" step="1" data-field="position" value="' +
                escapeHtml(String(s.position)) +
                '" oninput="gradientOnChange()">' +
                '<span class="gd-stop-unit">%</span>' +
                '<button type="button" class="outline gd-del" onclick="gradientRemoveStop(' +
                i +
                ')"' +
                (cfg.stops.length <= 2 ? ' disabled' : '') +
                '>删除</button>' +
                '</div>'
            );
        })
        .join('');
}

function gradientOnColorPick(el) {
    if (!el) return;
    const row = el.closest('.gd-stop');
    if (!row) return;
    const text = row.querySelector('input.gd-color-text[data-field="color"]');
    if (text) text.value = el.value;
    gradientOnChange();
}

function gradientOnChange() {
    gradientReadConfigFromDom();
    gradientSyncTypeUi();
    gradientRender();
}

function gradientOnTypeChange() {
    gradientSyncTypeUi();
    gradientOnChange();
}

function gradientAddStop() {
    gradientReadConfigFromDom();
    const stops = _gdConfig.stops.slice();
    const last = stops[stops.length - 1];
    const prev = stops[stops.length - 2] || { position: 0, color: '#000000' };
    const mid = Math.round((prev.position + last.position) / 2);
    stops.splice(stops.length - 1, 0, { color: '#a78bfa', position: mid });
    _gdConfig = gradientNormalizeConfig(Object.assign({}, _gdConfig, { stops: stops }));
    gradientRenderStops();
    gradientRender();
}

function gradientRemoveStop(index) {
    gradientReadConfigFromDom();
    if (_gdConfig.stops.length <= 2) return;
    const stops = _gdConfig.stops.slice();
    stops.splice(index, 1);
    _gdConfig = gradientNormalizeConfig(Object.assign({}, _gdConfig, { stops: stops }));
    gradientRenderStops();
    gradientRender();
}

function gradientRender() {
    const cfg = gradientReadConfigFromDom();
    const value = gradientSerialize(cfg);
    const css = gradientCss(cfg);
    const out = document.getElementById('gdCss');
    const textOut = document.getElementById('gdCssText');
    const preview = document.getElementById('gdPreview');
    if (out) {
        out.className = 'output-box';
        out.textContent = css;
    }
    if (textOut) textOut.textContent = css;
    if (preview) {
        preview.style.backgroundImage = value;
        preview.style.backgroundColor = 'transparent';
    }
    const angleLabel = document.getElementById('gdAngleVal');
    if (angleLabel) angleLabel.textContent = cfg.angle + '°';
    const angleNum = document.getElementById('gdAngleNum');
    if (angleNum && document.activeElement !== angleNum) {
        angleNum.value = String(cfg.angle);
    }
    if (typeof setStatus === 'function') setStatus('渐变已更新');
}

function gradientCopy() {
    const textOut = document.getElementById('gdCssText');
    if (typeof copyText === 'function' && textOut) {
        copyText('gdCssText');
        return;
    }
    if (typeof safeCopy === 'function') {
        safeCopy(textOut ? textOut.textContent : gradientCss(_gdConfig));
    }
}

function gradientReset() {
    _gdConfig = gradientDefaultConfig();
    const typeEl = document.getElementById('gdType');
    const angleEl = document.getElementById('gdAngle');
    const shapeEl = document.getElementById('gdShape');
    const posEl = document.getElementById('gdPosition');
    if (typeEl) typeEl.value = 'linear';
    if (angleEl) angleEl.value = '90';
    if (shapeEl) shapeEl.value = 'ellipse';
    if (posEl) posEl.value = 'center';
    gradientSyncTypeUi();
    gradientRenderStops();
    gradientRender();
    if (typeof setStatus === 'function') setStatus('已重置');
}

function gradientLoadExample() {
    _gdConfig = gradientNormalizeConfig({
        type: 'linear',
        angle: 135,
        stops: [
            { color: '#f97316', position: 0 },
            { color: '#ec4899', position: 50 },
            { color: '#8b5cf6', position: 100 },
        ],
    });
    const typeEl = document.getElementById('gdType');
    const angleEl = document.getElementById('gdAngle');
    if (typeEl) typeEl.value = 'linear';
    if (angleEl) angleEl.value = String(_gdConfig.angle);
    gradientSyncTypeUi();
    gradientRenderStops();
    gradientRender();
}

if (typeof registerInit === 'function') {
    registerInit('gradient', function () {
        _gdConfig = gradientDefaultConfig();
        const typeEl = document.getElementById('gdType');
        const angleEl = document.getElementById('gdAngle');
        if (typeEl) typeEl.value = 'linear';
        if (angleEl) angleEl.value = '90';
        gradientSyncTypeUi();
        gradientRenderStops();
        gradientRender();
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        gradientDefaultConfig,
        gradientNormalizeConfig,
        gradientNormalizeStop,
        gradientSerialize,
        gradientCss,
        gradientFormatPos,
    };
}
