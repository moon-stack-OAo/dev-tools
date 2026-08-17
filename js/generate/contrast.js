function contrastParseColor(str) {
    if (str == null) return null;
    let s = String(str).trim();
    if (!s) return null;

    if (s[0] === '#') {
        let hex = s.slice(1);
        if (hex.length === 3 || hex.length === 4) {
            hex = hex
                .slice(0, 3)
                .split('')
                .map((c) => c + c)
                .join('');
        } else if (hex.length === 8) {
            hex = hex.slice(0, 6);
        }
        if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
        return {
            r: parseInt(hex.slice(0, 2), 16),
            g: parseInt(hex.slice(2, 4), 16),
            b: parseInt(hex.slice(4, 6), 16),
        };
    }

    const rgbMatch = s.match(/^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)/i);
    if (rgbMatch) {
        const r = Math.round(Number(rgbMatch[1]));
        const g = Math.round(Number(rgbMatch[2]));
        const b = Math.round(Number(rgbMatch[3]));
        if (![r, g, b].every((n) => isFinite(n) && n >= 0 && n <= 255)) return null;
        return { r: r, g: g, b: b };
    }

    return null;
}

function contrastChannelLinear(c) {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function contrastRelativeLuminance(r, g, b) {
    const R = contrastChannelLinear(r);
    const G = contrastChannelLinear(g);
    const B = contrastChannelLinear(b);
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(fg, bg) {
    const a = typeof fg === 'object' && fg ? fg : contrastParseColor(fg);
    const b = typeof bg === 'object' && bg ? bg : contrastParseColor(bg);
    if (!a || !b) return null;
    const L1 = contrastRelativeLuminance(a.r, a.g, a.b);
    const L2 = contrastRelativeLuminance(b.r, b.g, b.b);
    const light = Math.max(L1, L2);
    const dark = Math.min(L1, L2);
    return (light + 0.05) / (dark + 0.05);
}

function contrastWcag(ratio) {
    const r = Number(ratio);
    if (!isFinite(r)) {
        return { aaNormal: false, aaLarge: false, aaaNormal: false, aaaLarge: false };
    }
    return {
        aaNormal: r >= 4.5,
        aaLarge: r >= 3,
        aaaNormal: r >= 7,
        aaaLarge: r >= 4.5,
    };
}

function contrastFormatRatio(ratio) {
    if (!isFinite(ratio)) return '—';
    return (Math.round(ratio * 100) / 100).toFixed(2) + ' : 1';
}

function contrastToHex(rgb) {
    if (!rgb) return '';
    const h = (n) => {
        const s = Math.max(0, Math.min(255, Math.round(n))).toString(16);
        return s.length === 1 ? '0' + s : s;
    };
    return '#' + h(rgb.r) + h(rgb.g) + h(rgb.b);
}

function contrastBadge(pass) {
    return pass
        ? '<span class="ctr-badge ctr-pass">通过</span>'
        : '<span class="ctr-badge ctr-fail">未通过</span>';
}

function contrastRender() {
    const fgEl = document.getElementById('ctrFg');
    const bgEl = document.getElementById('ctrBg');
    const fgPick = document.getElementById('ctrFgPick');
    const bgPick = document.getElementById('ctrBgPick');
    const out = document.getElementById('ctrResult');
    const preview = document.getElementById('ctrPreview');
    const ratioEl = document.getElementById('ctrRatio');
    if (!fgEl || !bgEl || !out) return;

    const fg = contrastParseColor(fgEl.value);
    const bg = contrastParseColor(bgEl.value);

    if (fg && fgPick && document.activeElement !== fgPick) {
        fgPick.value = contrastToHex(fg);
    }
    if (bg && bgPick && document.activeElement !== bgPick) {
        bgPick.value = contrastToHex(bg);
    }

    if (!fg || !bg) {
        out.className = 'output-box error';
        out.innerHTML = escapeHtml('请输入有效的 HEX 或 RGB 颜色');
        if (ratioEl) ratioEl.textContent = '—';
        if (preview) {
            preview.style.color = '';
            preview.style.background = '';
        }
        return;
    }

    const ratio = contrastRatio(fg, bg);
    const wcag = contrastWcag(ratio);
    if (ratioEl) ratioEl.textContent = contrastFormatRatio(ratio);

    if (preview) {
        preview.style.color = contrastToHex(fg);
        preview.style.background = contrastToHex(bg);
    }

    const rows = [
        { label: '正常文本 AA (4.5:1)', ok: wcag.aaNormal },
        { label: '正常文本 AAA (7:1)', ok: wcag.aaaNormal },
        { label: '大文本 AA (3:1)', ok: wcag.aaLarge },
        { label: '大文本 AAA (4.5:1)', ok: wcag.aaaLarge },
    ];

    const parts = [];
    parts.push(
        '<div class="ctr-ratio-line">对比度 <b>' +
            escapeHtml(contrastFormatRatio(ratio)) +
            '</b></div>',
    );
    parts.push('<div class="ctr-grid">');
    rows.forEach((row) => {
        parts.push(
            '<div class="ctr-row' +
                (row.ok ? ' ctr-row-pass' : ' ctr-row-fail') +
                '"><span>' +
                escapeHtml(row.label) +
                '</span>' +
                contrastBadge(row.ok) +
                '</div>',
        );
    });
    parts.push('</div>');
    parts.push(
        '<div class="ctr-meta">前景 ' +
            escapeHtml(contrastToHex(fg)) +
            ' · 背景 ' +
            escapeHtml(contrastToHex(bg)) +
            ' · L<sub>fg</sub> ' +
            escapeHtml(contrastRelativeLuminance(fg.r, fg.g, fg.b).toFixed(4)) +
            ' · L<sub>bg</sub> ' +
            escapeHtml(contrastRelativeLuminance(bg.r, bg.g, bg.b).toFixed(4)) +
            '</div>',
    );

    out.className = 'output-box';
    out.innerHTML = parts.join('');
    if (typeof setStatus === 'function') setStatus('对比度已计算');
}

function contrastOnPick(which) {
    const pick = document.getElementById(which === 'fg' ? 'ctrFgPick' : 'ctrBgPick');
    const text = document.getElementById(which === 'fg' ? 'ctrFg' : 'ctrBg');
    if (pick && text) text.value = pick.value;
    contrastRender();
}

function contrastSwap() {
    const fgEl = document.getElementById('ctrFg');
    const bgEl = document.getElementById('ctrBg');
    if (!fgEl || !bgEl) return;
    const t = fgEl.value;
    fgEl.value = bgEl.value;
    bgEl.value = t;
    contrastRender();
}

function contrastReset() {
    const fgEl = document.getElementById('ctrFg');
    const bgEl = document.getElementById('ctrBg');
    if (fgEl) fgEl.value = '#111827';
    if (bgEl) bgEl.value = '#ffffff';
    contrastRender();
    if (typeof setStatus === 'function') setStatus('已重置');
}

function contrastLoadExample() {
    const fgEl = document.getElementById('ctrFg');
    const bgEl = document.getElementById('ctrBg');
    if (fgEl) fgEl.value = '#777777';
    if (bgEl) bgEl.value = '#ffffff';
    contrastRender();
}

if (typeof registerInit === 'function') {
    registerInit('contrast', function () {
        contrastRender();
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        contrastParseColor,
        contrastRelativeLuminance,
        contrastRatio,
        contrastWcag,
        contrastFormatRatio,
        contrastToHex,
    };
}
