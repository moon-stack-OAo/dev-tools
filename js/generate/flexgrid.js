function flexgridDefaultFlex() {
    return {
        flexDirection: 'row',
        flexWrap: 'nowrap',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        alignContent: 'stretch',
        gap: '8px',
        itemCount: 4,
    };
}

function flexgridDefaultGrid() {
    return {
        columns: 'repeat(3, 1fr)',
        rows: 'auto',
        gap: '8px',
        justifyItems: 'stretch',
        alignItems: 'stretch',
        itemCount: 6,
    };
}

function flexgridNormalizeFlex(opts) {
    const d = flexgridDefaultFlex();
    const o = opts || {};
    const dirs = ['row', 'row-reverse', 'column', 'column-reverse'];
    const wraps = ['nowrap', 'wrap', 'wrap-reverse'];
    const justifies = [
        'flex-start',
        'flex-end',
        'center',
        'space-between',
        'space-around',
        'space-evenly',
    ];
    const aligns = ['stretch', 'flex-start', 'flex-end', 'center', 'baseline'];
    const contents = [
        'stretch',
        'flex-start',
        'flex-end',
        'center',
        'space-between',
        'space-around',
        'space-evenly',
    ];
    let count = Number(o.itemCount);
    if (!isFinite(count)) count = d.itemCount;
    count = Math.max(1, Math.min(24, Math.round(count)));
    return {
        flexDirection: dirs.indexOf(o.flexDirection) >= 0 ? o.flexDirection : d.flexDirection,
        flexWrap: wraps.indexOf(o.flexWrap) >= 0 ? o.flexWrap : d.flexWrap,
        justifyContent: justifies.indexOf(o.justifyContent) >= 0 ? o.justifyContent : d.justifyContent,
        alignItems: aligns.indexOf(o.alignItems) >= 0 ? o.alignItems : d.alignItems,
        alignContent: contents.indexOf(o.alignContent) >= 0 ? o.alignContent : d.alignContent,
        gap: o.gap != null && String(o.gap).trim() !== '' ? String(o.gap).trim() : d.gap,
        itemCount: count,
    };
}

function flexgridNormalizeGrid(opts) {
    const d = flexgridDefaultGrid();
    const o = opts || {};
    const items = ['stretch', 'start', 'end', 'center'];
    let count = Number(o.itemCount);
    if (!isFinite(count)) count = d.itemCount;
    count = Math.max(1, Math.min(36, Math.round(count)));
    return {
        columns:
            o.columns != null && String(o.columns).trim() !== ''
                ? String(o.columns).trim()
                : d.columns,
        rows: o.rows != null && String(o.rows).trim() !== '' ? String(o.rows).trim() : d.rows,
        gap: o.gap != null && String(o.gap).trim() !== '' ? String(o.gap).trim() : d.gap,
        justifyItems: items.indexOf(o.justifyItems) >= 0 ? o.justifyItems : d.justifyItems,
        alignItems: items.indexOf(o.alignItems) >= 0 ? o.alignItems : d.alignItems,
        itemCount: count,
    };
}

function flexgridBuildFlexCss(opts) {
    const o = flexgridNormalizeFlex(opts);
    return [
        '.container {',
        '  display: flex;',
        '  flex-direction: ' + o.flexDirection + ';',
        '  flex-wrap: ' + o.flexWrap + ';',
        '  justify-content: ' + o.justifyContent + ';',
        '  align-items: ' + o.alignItems + ';',
        '  align-content: ' + o.alignContent + ';',
        '  gap: ' + o.gap + ';',
        '}',
    ].join('\n');
}

function flexgridBuildGridCss(opts) {
    const o = flexgridNormalizeGrid(opts);
    return [
        '.container {',
        '  display: grid;',
        '  grid-template-columns: ' + o.columns + ';',
        '  grid-template-rows: ' + o.rows + ';',
        '  gap: ' + o.gap + ';',
        '  justify-items: ' + o.justifyItems + ';',
        '  align-items: ' + o.alignItems + ';',
        '}',
    ].join('\n');
}

let _fgMode = 'flex';
let _fgFlex = flexgridDefaultFlex();
let _fgGrid = flexgridDefaultGrid();

function flexgridSetMode(mode) {
    _fgMode = mode === 'grid' ? 'grid' : 'flex';
    const flexPane = document.getElementById('fgFlexPane');
    const gridPane = document.getElementById('fgGridPane');
    const tabFlex = document.getElementById('fgTabFlex');
    const tabGrid = document.getElementById('fgTabGrid');
    if (flexPane) flexPane.style.display = _fgMode === 'flex' ? '' : 'none';
    if (gridPane) gridPane.style.display = _fgMode === 'grid' ? '' : 'none';
    if (tabFlex) tabFlex.classList.toggle('active', _fgMode === 'flex');
    if (tabGrid) tabGrid.classList.toggle('active', _fgMode === 'grid');
    flexgridRender();
}

function flexgridReadFlexFromDom() {
    const g = (id) => document.getElementById(id);
    _fgFlex = flexgridNormalizeFlex({
        flexDirection: g('fgFlexDir') ? g('fgFlexDir').value : 'row',
        flexWrap: g('fgFlexWrap') ? g('fgFlexWrap').value : 'nowrap',
        justifyContent: g('fgJustify') ? g('fgJustify').value : 'flex-start',
        alignItems: g('fgAlignItems') ? g('fgAlignItems').value : 'stretch',
        alignContent: g('fgAlignContent') ? g('fgAlignContent').value : 'stretch',
        gap: g('fgFlexGap') ? g('fgFlexGap').value : '8px',
        itemCount: g('fgFlexCount') ? g('fgFlexCount').value : 4,
    });
    return _fgFlex;
}

function flexgridReadGridFromDom() {
    const g = (id) => document.getElementById(id);
    _fgGrid = flexgridNormalizeGrid({
        columns: g('fgColumns') ? g('fgColumns').value : 'repeat(3, 1fr)',
        rows: g('fgRows') ? g('fgRows').value : 'auto',
        gap: g('fgGridGap') ? g('fgGridGap').value : '8px',
        justifyItems: g('fgJustifyItems') ? g('fgJustifyItems').value : 'stretch',
        alignItems: g('fgGridAlign') ? g('fgGridAlign').value : 'stretch',
        itemCount: g('fgGridCount') ? g('fgGridCount').value : 6,
    });
    return _fgGrid;
}

function flexgridOnChange() {
    flexgridRender();
}

function flexgridRenderPreview(container, mode, opts) {
    if (!container) return;
    const count = opts.itemCount;
    const items = [];
    for (let i = 0; i < count; i++) {
        items.push('<div class="fg-item">' + (i + 1) + '</div>');
    }
    container.innerHTML = items.join('');
    container.style.cssText = '';
    container.className = 'fg-preview-box';
    if (mode === 'flex') {
        container.style.display = 'flex';
        container.style.flexDirection = opts.flexDirection;
        container.style.flexWrap = opts.flexWrap;
        container.style.justifyContent = opts.justifyContent;
        container.style.alignItems = opts.alignItems;
        container.style.alignContent = opts.alignContent;
        container.style.gap = opts.gap;
    } else {
        container.style.display = 'grid';
        container.style.gridTemplateColumns = opts.columns;
        container.style.gridTemplateRows = opts.rows;
        container.style.gap = opts.gap;
        container.style.justifyItems = opts.justifyItems;
        container.style.alignItems = opts.alignItems;
    }
}

function flexgridRender() {
    const css =
        _fgMode === 'grid'
            ? flexgridBuildGridCss(flexgridReadGridFromDom())
            : flexgridBuildFlexCss(flexgridReadFlexFromDom());
    const out = document.getElementById('fgCss');
    const textOut = document.getElementById('fgCssText');
    if (out) {
        out.className = 'output-box';
        out.textContent = css;
    }
    if (textOut) textOut.textContent = css;
    const preview = document.getElementById('fgPreview');
    if (_fgMode === 'grid') {
        flexgridRenderPreview(preview, 'grid', _fgGrid);
    } else {
        flexgridRenderPreview(preview, 'flex', _fgFlex);
    }
    if (typeof setStatus === 'function') setStatus('布局已更新');
}

function flexgridCopy() {
    const textOut = document.getElementById('fgCssText');
    if (typeof copyText === 'function' && textOut) {
        copyText('fgCssText');
        return;
    }
    if (typeof safeCopy === 'function') {
        safeCopy(textOut ? textOut.textContent : '');
    }
}

function flexgridApplyFlexDefaults(o) {
    const set = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.value = v;
    };
    set('fgFlexDir', o.flexDirection);
    set('fgFlexWrap', o.flexWrap);
    set('fgJustify', o.justifyContent);
    set('fgAlignItems', o.alignItems);
    set('fgAlignContent', o.alignContent);
    set('fgFlexGap', o.gap);
    set('fgFlexCount', String(o.itemCount));
}

function flexgridApplyGridDefaults(o) {
    const set = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.value = v;
    };
    set('fgColumns', o.columns);
    set('fgRows', o.rows);
    set('fgGridGap', o.gap);
    set('fgJustifyItems', o.justifyItems);
    set('fgGridAlign', o.alignItems);
    set('fgGridCount', String(o.itemCount));
}

function flexgridReset() {
    _fgFlex = flexgridDefaultFlex();
    _fgGrid = flexgridDefaultGrid();
    flexgridApplyFlexDefaults(_fgFlex);
    flexgridApplyGridDefaults(_fgGrid);
    flexgridRender();
    if (typeof setStatus === 'function') setStatus('已重置');
}

function flexgridLoadExample() {
    if (_fgMode === 'grid') {
        _fgGrid = flexgridNormalizeGrid({
            columns: 'repeat(4, 1fr)',
            rows: 'repeat(2, 80px)',
            gap: '12px',
            justifyItems: 'center',
            alignItems: 'center',
            itemCount: 8,
        });
        flexgridApplyGridDefaults(_fgGrid);
    } else {
        _fgFlex = flexgridNormalizeFlex({
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            alignContent: 'flex-start',
            gap: '12px',
            itemCount: 6,
        });
        flexgridApplyFlexDefaults(_fgFlex);
    }
    flexgridRender();
}

if (typeof registerInit === 'function') {
    registerInit('flexgrid', function () {
        _fgMode = 'flex';
        _fgFlex = flexgridDefaultFlex();
        _fgGrid = flexgridDefaultGrid();
        flexgridApplyFlexDefaults(_fgFlex);
        flexgridApplyGridDefaults(_fgGrid);
        flexgridSetMode('flex');
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        flexgridDefaultFlex,
        flexgridDefaultGrid,
        flexgridNormalizeFlex,
        flexgridNormalizeGrid,
        flexgridBuildFlexCss,
        flexgridBuildGridCss,
    };
}
