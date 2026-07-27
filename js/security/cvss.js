// CVSS v3.1 Base Score 计算
// 指标：AV / AC / PR / UI / S / C / I / A

const CVSS31_WEIGHTS = {
    AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 },
    AC: { L: 0.77, H: 0.44 },
    // PR 依赖 Scope
    PR: {
        U: { N: 0.85, L: 0.62, H: 0.27 },
        C: { N: 0.85, L: 0.68, H: 0.5 },
    },
    UI: { N: 0.85, R: 0.62 },
    S: { U: 'U', C: 'C' },
    C: { N: 0, L: 0.22, H: 0.56 },
    I: { N: 0, L: 0.22, H: 0.56 },
    A: { N: 0, L: 0.22, H: 0.56 },
};

const CVSS31_LABELS = {
    AV: { N: 'Network', A: 'Adjacent', L: 'Local', P: 'Physical' },
    AC: { L: 'Low', H: 'High' },
    PR: { N: 'None', L: 'Low', H: 'High' },
    UI: { N: 'None', R: 'Required' },
    S: { U: 'Unchanged', C: 'Changed' },
    C: { N: 'None', L: 'Low', H: 'High' },
    I: { N: 'None', L: 'Low', H: 'High' },
    A: { N: 'None', L: 'Low', H: 'High' },
};

/**
 * 按 CVSS 规范四舍五入到 1 位小数
 * @param {number} num
 * @returns {number}
 */
function cvssRoundUp1(num) {
    const n = Math.round(num * 100000);
    if (n % 10000 === 0) {
        return n / 100000;
    }
    return Math.ceil(num * 10) / 10;
}

/**
 * 解析向量字符串
 * @param {string} vector e.g. CVSS:3.1/AV:N/AC:L/...
 * @returns {object}
 */
function parseCvss31Vector(vector) {
    const s = String(vector || '').trim();
    const metrics = {};
    const parts = s.split('/');
    parts.forEach(function (p) {
        const m = p.match(/^([A-Z]+):([A-Z]+)$/i);
        if (m) {
            metrics[m[1].toUpperCase()] = m[2].toUpperCase();
        }
    });
    return metrics;
}

/**
 * 计算 CVSS 3.1 Base Score
 * @param {object|string} metrics 指标对象或向量字符串
 * @returns {{
 *   baseScore: number,
 *   impact: number,
 *   exploitability: number,
 *   iss: number,
 *   severity: string,
 *   vector: string,
 *   metrics: object
 * }}
 */
function calcCvss31(metrics) {
    let m;
    if (typeof metrics === 'string') {
        m = parseCvss31Vector(metrics);
    } else {
        m = Object.assign({}, metrics || {});
        Object.keys(m).forEach(function (k) {
            m[k] = String(m[k]).toUpperCase();
        });
    }

    const required = ['AV', 'AC', 'PR', 'UI', 'S', 'C', 'I', 'A'];
    for (let i = 0; i < required.length; i++) {
        const k = required[i];
        if (!m[k]) throw new Error('缺少指标: ' + k);
    }

    if (!CVSS31_WEIGHTS.AV[m.AV]) throw new Error('无效 AV: ' + m.AV);
    if (!CVSS31_WEIGHTS.AC[m.AC]) throw new Error('无效 AC: ' + m.AC);
    if (!CVSS31_WEIGHTS.PR.U[m.PR]) throw new Error('无效 PR: ' + m.PR);
    if (!CVSS31_WEIGHTS.UI[m.UI]) throw new Error('无效 UI: ' + m.UI);
    if (m.S !== 'U' && m.S !== 'C') throw new Error('无效 S: ' + m.S);
    if (CVSS31_WEIGHTS.C[m.C] === undefined) throw new Error('无效 C: ' + m.C);
    if (CVSS31_WEIGHTS.I[m.I] === undefined) throw new Error('无效 I: ' + m.I);
    if (CVSS31_WEIGHTS.A[m.A] === undefined) throw new Error('无效 A: ' + m.A);

    const av = CVSS31_WEIGHTS.AV[m.AV];
    const ac = CVSS31_WEIGHTS.AC[m.AC];
    const pr = CVSS31_WEIGHTS.PR[m.S][m.PR];
    const ui = CVSS31_WEIGHTS.UI[m.UI];
    const c = CVSS31_WEIGHTS.C[m.C];
    const iScore = CVSS31_WEIGHTS.I[m.I];
    const a = CVSS31_WEIGHTS.A[m.A];

    // ISS
    const iss = 1 - (1 - c) * (1 - iScore) * (1 - a);

    // Impact
    let impact;
    if (m.S === 'U') {
        impact = 6.42 * iss;
    } else {
        impact = 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15);
    }

    // Exploitability
    const exploitability = 8.22 * av * ac * pr * ui;

    let baseScore;
    if (impact <= 0) {
        baseScore = 0;
    } else if (m.S === 'U') {
        baseScore = cvssRoundUp1(Math.min(impact + exploitability, 10));
    } else {
        baseScore = cvssRoundUp1(Math.min(1.08 * (impact + exploitability), 10));
    }

    // 子分也按规范 roundup（展示用）
    const impactRounded = impact <= 0 ? 0 : cvssRoundUp1(impact);
    const exploitRounded = cvssRoundUp1(exploitability);

    const severity = cvss31Severity(baseScore);
    const vector =
        'CVSS:3.1/AV:' +
        m.AV +
        '/AC:' +
        m.AC +
        '/PR:' +
        m.PR +
        '/UI:' +
        m.UI +
        '/S:' +
        m.S +
        '/C:' +
        m.C +
        '/I:' +
        m.I +
        '/A:' +
        m.A;

    return {
        baseScore: baseScore,
        impact: impactRounded,
        exploitability: exploitRounded,
        iss: Math.round(iss * 1000) / 1000,
        severity: severity,
        vector: vector,
        metrics: m,
    };
}

/**
 * @param {number} score
 * @returns {string}
 */
function cvss31Severity(score) {
    if (score === 0) return 'None';
    if (score <= 3.9) return 'Low';
    if (score <= 6.9) return 'Medium';
    if (score <= 8.9) return 'High';
    return 'Critical';
}

// ========== UI ==========

function cvssCalc() {
    const metrics = {
        AV: document.getElementById('cvssAV').value,
        AC: document.getElementById('cvssAC').value,
        PR: document.getElementById('cvssPR').value,
        UI: document.getElementById('cvssUI').value,
        S: document.getElementById('cvssS').value,
        C: document.getElementById('cvssC').value,
        I: document.getElementById('cvssI').value,
        A: document.getElementById('cvssA').value,
    };
    const out = document.getElementById('cvssOutput');
    try {
        const r = calcCvss31(metrics);
        document.getElementById('cvssVector').value = r.vector;
        const color =
            r.severity === 'Critical'
                ? 'var(--danger)'
                : r.severity === 'High'
                  ? '#e67e22'
                  : r.severity === 'Medium'
                    ? '#f1c40f'
                    : r.severity === 'Low'
                      ? '#2ecc71'
                      : 'var(--text-dim)';
        out.innerHTML =
            '<div style="font-size:28px;font-weight:700;color:' +
            color +
            '">' +
            r.baseScore.toFixed(1) +
            ' <span style="font-size:16px">' +
            escapeHtml(r.severity) +
            '</span></div>' +
            '<div style="margin-top:8px;font-size:13px;color:var(--text-dim)">' +
            'Impact: ' +
            r.impact.toFixed(1) +
            ' &nbsp;|&nbsp; Exploitability: ' +
            r.exploitability.toFixed(1) +
            ' &nbsp;|&nbsp; ISS: ' +
            r.iss +
            '</div>' +
            '<div style="margin-top:8px;word-break:break-all;font-family:var(--font)">' +
            escapeHtml(r.vector) +
            '</div>';
        out.className = 'output-box';
        setStatus('Base Score: ' + r.baseScore.toFixed(1) + ' (' + r.severity + ')');
    } catch (e) {
        out.textContent = '计算失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function cvssFromVector() {
    const v = document.getElementById('cvssVector').value;
    const out = document.getElementById('cvssOutput');
    try {
        const m = parseCvss31Vector(v);
        ['AV', 'AC', 'PR', 'UI', 'S', 'C', 'I', 'A'].forEach(function (k) {
            const el = document.getElementById('cvss' + k);
            if (el && m[k]) el.value = m[k];
        });
        cvssCalc();
    } catch (e) {
        out.textContent = '解析失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function cvssLoadCritical() {
    document.getElementById('cvssAV').value = 'N';
    document.getElementById('cvssAC').value = 'L';
    document.getElementById('cvssPR').value = 'N';
    document.getElementById('cvssUI').value = 'N';
    document.getElementById('cvssS').value = 'U';
    document.getElementById('cvssC').value = 'H';
    document.getElementById('cvssI').value = 'H';
    document.getElementById('cvssA').value = 'H';
    cvssCalc();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calcCvss31: calcCvss31,
        parseCvss31Vector: parseCvss31Vector,
        cvssRoundUp1: cvssRoundUp1,
        cvss31Severity: cvss31Severity,
        CVSS31_WEIGHTS: CVSS31_WEIGHTS,
        CVSS31_LABELS: CVSS31_LABELS,
    };
}
