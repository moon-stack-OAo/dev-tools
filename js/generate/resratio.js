// === 分辨率计算器 ===
function gcd(a, b) {
    a = Math.abs(Math.round(a));
    b = Math.abs(Math.round(b));
    while (b) {
        [a, b] = [b, a % b];
    }
    return a || 1;
}

const RESRATIO_STANDARD = [
    {w: 1, h: 1, name: '1:1 方形'},
    {w: 5, h: 4, name: '5:4 传统照片'},
    {w: 4, h: 3, name: '4:3 传统电视'},
    {w: 3, h: 2, name: '3:2 单反/全画幅'},
    {w: 16, h: 10, name: '16:10 笔记本'},
    {w: 16, h: 9, name: '16:9 HDTV / 宽屏'},
    {w: 18, h: 9, name: '18:9 手机全面屏'},
    {w: 19, h: 9, name: '19:9 iPhone'},
    {w: 21, h: 9, name: '21:9 超宽屏/电影'},
    {w: 32, h: 9, name: '32:9 超宽带鱼屏'},
];

// === 消费级标准分辨率白名单（精确匹配，含旋转 90°）===
const RES_STANDARDS = [
    {w: 320, h: 240, name: 'QVGA', short: 'QVGA', desc: '早期手机 / 摄像头'},
    {w: 640, h: 480, name: 'VGA', short: 'VGA', desc: '标清'},
    {w: 720, h: 480, name: '480p / SD', short: '480p', desc: 'NTSC 标清'},
    {w: 720, h: 576, name: '576p / SD', short: '576p', desc: 'PAL 标清'},
    {w: 800, h: 600, name: 'SVGA', short: 'SVGA', desc: 'Super VGA'},
    {w: 1024, h: 768, name: 'XGA', short: 'XGA', desc: '4:3 笔记本'},
    {w: 1280, h: 720, name: 'HD 720p', short: '720p', desc: '高清'},
    {w: 1280, h: 800, name: 'WXGA', short: 'WXGA', desc: '笔记本常见'},
    {w: 1280, h: 1024, name: 'SXGA', short: 'SXGA', desc: '5:4 显示器'},
    {w: 1366, h: 768, name: 'HD+ WXGA', short: 'HD+', desc: '笔记本常见'},
    {w: 1440, h: 900, name: 'WXGA+', short: 'WXGA+', desc: '笔记本'},
    {w: 1600, h: 900, name: 'HD+', short: 'HD+', desc: 'HD+'},
    {w: 1680, h: 1050, name: 'WSXGA+', short: 'WSXGA+', desc: '笔记本'},
    {w: 1920, h: 1080, name: 'Full HD 1080p', short: '1080p', desc: '全高清'},
    {w: 1920, h: 1200, name: 'WUXGA', short: 'WUXGA', desc: 'FHD+'},
    {w: 2048, h: 1080, name: '2K DCI', short: '2K DCI', desc: '电影 2K'},
    {w: 2048, h: 1536, name: 'QXGA', short: 'QXGA', desc: 'iPad'},
    {w: 2560, h: 1080, name: 'UW-FHD', short: 'UW FHD', desc: '超宽 FHD'},
    {w: 2560, h: 1440, name: '2K / QHD', short: '2K', desc: '2K 1440p'},
    {w: 2560, h: 1600, name: 'WQXGA', short: 'WQXGA', desc: '2K+'},
    {w: 2732, h: 2048, name: 'iPad Pro', short: 'iPad Pro', desc: 'iPad Pro 12.9'},
    {w: 2880, h: 1800, name: 'Retina MacBook', short: 'MBP', desc: 'MacBook Pro'},
    {w: 3200, h: 1800, name: 'QHD+', short: 'QHD+', desc: '3K 区间'},
    {w: 3440, h: 1440, name: 'UWQHD', short: 'UWQHD', desc: '超宽 2K'},
    {w: 3840, h: 1600, name: 'UW4K', short: 'UW4K', desc: '超宽 4K'},
    {w: 3840, h: 2160, name: '4K UHD', short: '4K', desc: '4K 超高清'},
    {w: 4096, h: 2160, name: '4K DCI', short: '4K DCI', desc: '电影 4K'},
    {w: 5120, h: 2880, name: '5K', short: '5K', desc: '5K'},
    {w: 6016, h: 3384, name: '6K', short: '6K', desc: '6K'},
    {w: 7680, h: 4320, name: '8K UHD', short: '8K', desc: '8K 超高清'},
    {w: 8192, h: 4320, name: '8K DCI', short: '8K DCI', desc: '电影 8K'},
    {w: 10240, h: 4320, name: '10K', short: '10K', desc: '10K'},
];

// === 档位区间（兜底，按 max(w, h) 划分）===
const RES_TIERS = [
    {min: 0, max: 480, name: 'SD 480p (NTSC)', short: '480p', desc: '标清'},
    {min: 481, max: 576, name: 'SD 576p (PAL)', short: '576p', desc: 'PAL 标清'},
    {min: 577, max: 720, name: 'HD 720p', short: '720p', desc: '高清区间'},
    {min: 721, max: 1280, name: 'HD+', short: 'HD+', desc: 'HD+ 区间'},
    {min: 1281, max: 1440, name: 'FHD 1080p 区间', short: '1080p', desc: '全高清区间'},
    {min: 1441, max: 1920, name: 'FHD+', short: 'FHD+', desc: 'FHD+ 区间'},
    {min: 1921, max: 2560, name: '2K / QHD 区间', short: '2K', desc: '2K 区间'},
    {min: 2561, max: 3200, name: 'QHD+', short: 'QHD+', desc: 'QHD+ 区间'},
    {min: 3201, max: 3840, name: '4K UHD 区间', short: '4K', desc: '4K 区间'},
    {min: 3841, max: 4096, name: '4K DCI 区间', short: '4K DCI', desc: '电影 4K 区间'},
    {min: 4097, max: 5120, name: '5K 区间', short: '5K', desc: '5K 区间'},
    {min: 5121, max: 7680, name: '6K-8K 之间', short: '8K', desc: '8K 区间'},
    {min: 7681, max: 8192, name: '8K UHD 区间', short: '8K UHD', desc: '8K 区间'},
    {min: 8193, max: 99999, name: '8K+', short: '8K+', desc: '高于 8K'},
];

function resratioMatchStandard(w, h) {
    const f = w / h;
    for (const r of RESRATIO_STANDARD) {
        const std = r.w / r.h;
        if (Math.abs(f - std) < 0.01) return {w: r.w, h: r.h, name: r.name};
        const inv = r.h / r.w;
        if (Math.abs(f - inv) < 0.01) return {w: r.h, h: r.w, name: r.name + '（纵向）'};
    }
    return null;
}

// === 档位判定：先白名单精确匹配（含旋转 90°），再按 max(w,h) 区间匹配 ===
function resratioMatchTier(w, h) {
    const total = w * h;
    const mp = parseFloat((total / 1_000_000).toFixed(2));
    const base = {mp: mp, category: '消费级'};

    // 1) 白名单精确匹配（支持旋转 90°）
    for (const s of RES_STANDARDS) {
        if ((w === s.w && h === s.h) || (w === s.h && h === s.w)) {
            return Object.assign({}, base, {
                name: s.name,
                short: s.short,
                desc: s.desc,
                exact: true,
                badge: '✓'
            });
        }
    }

    // 2) 区间匹配（按 max(w,h) 划分）
    const maxSide = Math.max(w, h);
    for (const t of RES_TIERS) {
        if (maxSide >= t.min && maxSide <= t.max) {
            return Object.assign({}, base, {
                name: t.name,
                short: t.short,
                desc: t.desc,
                exact: false,
                badge: '≈'
            });
        }
    }

    // 3) 兜底（理论上区间已覆盖，保留以防极端值）
    return Object.assign({}, base, {
        name: '其他 / Other',
        short: '—',
        desc: '超出常规档位',
        exact: false,
        badge: '?'
    });
}

function resratioCompute() {
    const wRaw = document.getElementById('resWidth').value.trim();
    const hRaw = document.getElementById('resHeight').value.trim();
    const out = document.getElementById('resratioResult');

    if (!wRaw || !hRaw) {
        out.className = 'output-box';
        out.innerHTML = '<span style="color:var(--text-dim)">请输入宽和高</span>';
        return;
    }

    const w = parseFloat(wRaw);
    const h = parseFloat(hRaw);

    if (!isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) {
        out.className = 'output-box error';
        out.innerHTML = '请输入有效的宽高（正整数）';
        return;
    }

    const isInt = Number.isInteger(w) && Number.isInteger(h);
    const iw = Math.round(w);
    const ih = Math.round(h);
    const g = gcd(iw, ih);
    const rw = iw / g;
    const rh = ih / g;
    const total = iw * ih;
    const mp = (total / 1_000_000).toFixed(2);
    const totalFmt = total.toLocaleString('en-US');
    const floatRatio = (iw / ih).toFixed(4);
    const matched = resratioMatchStandard(iw, ih);

    const parts = [];
    parts.push('<div style="font-size:24px;font-weight:600;color:#22c55e;margin-bottom:4px">' + rw + ' : ' + rh + '</div>');
    parts.push('<div style="color:var(--text-dim);font-size:12px;margin-bottom:10px">最简整数比例</div>');

    // === 档位（精确匹配强调，区间匹配提示）===
    const tier = resratioMatchTier(iw, ih);
    const tierBadgeColor = tier.exact ? '#22c55e' : '#eab308';
    const tierHint = tier.exact ? '标准' : '区间';
    const tierLabel = tier.exact
        ? tier.short + ' / ' + tier.name + ' / ' + tier.desc
        : tier.name + ' / ' + tier.desc;
    parts.push(
        '<div style="margin:4px 0 10px;padding:8px 10px;border-radius:6px;'
        + 'background:' + (tier.exact ? 'rgba(34,197,94,0.08)' : 'rgba(234,179,8,0.08)') + ';'
        + 'border:1px solid ' + (tier.exact ? 'rgba(34,197,94,0.3)' : 'rgba(234,179,8,0.3)') + '">'
        + '<span style="color:var(--accent);font-size:12px;font-weight:600">档位</span> '
        + '<span style="display:inline-block;min-width:18px;text-align:center;font-weight:700;color:' + tierBadgeColor + '">'
        + tier.badge + '</span> '
        + '<span style="font-weight:600">' + tierLabel + '</span> '
        + '<span style="color:var(--text-dim);font-size:12px">(' + tier.mp.toFixed(2) + ' MP)</span>'
        + '<span style="margin-left:8px;font-size:11px;color:var(--text-dim);'
        + 'border:1px solid var(--border);border-radius:4px;padding:1px 6px">' + tierHint + '</span>'
        + '</div>'
    );

    parts.push('<div>浮点比例：<b>' + floatRatio + ' : 1</b></div>');
    if (matched) {
        parts.push('<div style="margin-top:6px;color:#22c55e">✓ 匹配标准比例 ' + matched.w + ':' + matched.h + '（' + matched.name + '）</div>');
    } else {
        parts.push('<div style="margin-top:6px;color:var(--text-dim)">非标准比例</div>');
    }
    parts.push('<div style="margin-top:8px">总像素数：<b>' + totalFmt + '</b> ≈ ' + mp + ' MP</div>');
    parts.push('<div>宽 × 高：<b>' + iw + ' × ' + ih + '</b></div>');
    parts.push('<div>像素宽高比 (PAR)：<b>1:1（方形像素）</b></div>');

    if (!isInt) {
        parts.push('<div style="margin-top:8px;color:var(--danger);font-size:12px">⚠ 检测到小数像素，最简比例基于四舍五入，结果可能偏差</div>');
    }

    out.className = 'output-box';
    out.innerHTML = parts.join('');
    setStatus('计算完成');
}

function resratioSwap() {
    const wEl = document.getElementById('resWidth');
    const hEl = document.getElementById('resHeight');
    const tmp = wEl.value;
    wEl.value = hEl.value;
    hEl.value = tmp;
    resratioCompute();
}

function resratioClear() {
    document.getElementById('resWidth').value = '';
    document.getElementById('resHeight').value = '';
    resratioCompute();
}

function resratioLoadExample() {
    document.getElementById('resWidth').value = 1920;
    document.getElementById('resHeight').value = 1080;
    resratioCompute();
}

function resratioPreset(w, h) {
    document.getElementById('resWidth').value = w;
    document.getElementById('resHeight').value = h;
    resratioCompute();
}

function resByRatioChange() {
    const v = document.getElementById('resByRatio').value;
    document.getElementById('resByCustomBox').style.display = v === 'custom' ? '' : 'none';
}

function resByCompute() {
    const dim = document.getElementById('resByDim').value;
    const base = parseFloat(document.getElementById('resByValue').value);
    const out = document.getElementById('resByResult');

    if (!isFinite(base) || base <= 0) {
        out.className = 'output-box error';
        out.textContent = '请输入有效的基准值（正数）';
        return;
    }

    let rw, rh;
    const sel = document.getElementById('resByRatio').value;
    if (sel === 'custom') {
        rw = parseFloat(document.getElementById('resByCustomW').value);
        rh = parseFloat(document.getElementById('resByCustomH').value);
        if (!isFinite(rw) || !isFinite(rh) || rw <= 0 || rh <= 0) {
            out.className = 'output-box error';
            out.textContent = '请输入有效的自定义比例（正数）';
            return;
        }
    } else {
        const parts = sel.split(':').map(Number);
        rw = parts[0];
        rh = parts[1];
    }

    let w, h;
    if (dim === 'w') {
        w = Math.round(base);
        h = Math.round(base * rh / rw);
    } else {
        h = Math.round(base);
        w = Math.round(base * rw / rh);
    }

    const total = w * h;
    const mp = (total / 1_000_000).toFixed(2);
    const g = gcd(w, h);
    const ratioStr = (w / g) + ':' + (h / g);

    out.className = 'output-box';
    out.innerHTML = '<b>' + w + ' × ' + h + '</b>（像素总数 ' + total.toLocaleString('en-US') + ' ≈ ' + mp + ' MP，最简比例 ' + ratioStr + '）';
    setStatus('反算完成');
}
