const mediaqueryPresets = [
    { id: 'sm', name: '手机 sm', width: 640 },
    { id: 'md', name: '平板 md', width: 768 },
    { id: 'lg', name: '笔记本 lg', width: 1024 },
    { id: 'xl', name: '桌面 xl', width: 1280 },
    { id: '2xl', name: '宽屏 2xl', width: 1536 },
];

function mediaqueryBuild(opts) {
    const o = opts || {};
    const direction = o.direction === 'max-width' ? 'max-width' : 'min-width';
    let width = Number(o.width);
    if (!isFinite(width) || width <= 0) {
        width = 768;
    }
    width = Math.round(width);
    const parts = ['(' + direction + ': ' + width + 'px)'];
    const ori = o.orientation != null ? String(o.orientation).trim().toLowerCase() : '';
    if (ori === 'portrait' || ori === 'landscape') {
        parts.push('(orientation: ' + ori + ')');
    }
    const body =
        o.body != null && String(o.body).trim() !== ''
            ? String(o.body)
            : '  /* styles */';
    const bodyLines = String(body)
        .split(/\r?\n/)
        .map(function (line) {
            return line;
        });
    let inner = bodyLines.join('\n');
    if (!/^\s/.test(inner) && inner.indexOf('\n') === -1) {
        inner = '  ' + inner;
    }
    return '@media ' + parts.join(' and ') + ' {\n' + inner + '\n}';
}

function mediaqueryReadOpts() {
    const dirEl = document.getElementById('mqDirection');
    const wEl = document.getElementById('mqWidth');
    const oriEl = document.getElementById('mqOrientation');
    const bodyEl = document.getElementById('mqBody');
    return {
        direction: dirEl ? dirEl.value : 'min-width',
        width: wEl ? Number(wEl.value) : 768,
        orientation: oriEl ? oriEl.value : '',
        body: bodyEl ? bodyEl.value : '  /* styles */',
    };
}

function mediaqueryApplyPreset(id) {
    const p = mediaqueryPresets.find(function (x) {
        return x.id === id;
    });
    if (!p) return;
    const wEl = document.getElementById('mqWidth');
    if (wEl) wEl.value = String(p.width);
    const chips = document.getElementById('mqPresets');
    if (chips) {
        chips.querySelectorAll('.mq-chip').forEach(function (el) {
            el.classList.toggle('active', el.getAttribute('data-id') === id);
        });
    }
    mediaqueryRender();
}

function mediaqueryRender() {
    const out = document.getElementById('mqOutput');
    if (!out) return;
    const css = mediaqueryBuild(mediaqueryReadOpts());
    out.value = css;
    if (typeof setStatus === 'function') setStatus('媒体查询已生成');
}

function mediaqueryCopy() {
    const el = document.getElementById('mqOutput');
    const t = el ? el.value : '';
    if (!t) {
        if (typeof toast === 'function') toast('无内容可复制');
        return;
    }
    if (typeof safeCopy === 'function') safeCopy(t, '已复制 @media');
}

function mediaqueryLoadExample() {
    const dirEl = document.getElementById('mqDirection');
    const wEl = document.getElementById('mqWidth');
    const oriEl = document.getElementById('mqOrientation');
    const bodyEl = document.getElementById('mqBody');
    if (dirEl) dirEl.value = 'min-width';
    if (wEl) wEl.value = '1024';
    if (oriEl) oriEl.value = '';
    if (bodyEl) bodyEl.value = '  /* styles */';
    mediaqueryApplyPreset('lg');
}

function mediaqueryReset() {
    mediaqueryLoadExample();
}

function mediaqueryInit() {
    const chips = document.getElementById('mqPresets');
    if (chips && !chips.dataset.bound) {
        chips.dataset.bound = '1';
        chips.innerHTML = mediaqueryPresets
            .map(function (p) {
                return (
                    '<button type="button" class="mq-chip outline" data-id="' +
                    escapeHtml(p.id) +
                    '" onclick="mediaqueryApplyPreset(\'' +
                    p.id +
                    '\')">' +
                    escapeHtml(p.name) +
                    ' · ' +
                    p.width +
                    '</button>'
                );
            })
            .join('');
    }
    mediaqueryApplyPreset('md');
}

if (typeof registerInit === 'function') {
    registerInit('mediaquery', mediaqueryInit);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        mediaqueryPresets,
        mediaqueryBuild,
    };
}
