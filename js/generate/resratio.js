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
