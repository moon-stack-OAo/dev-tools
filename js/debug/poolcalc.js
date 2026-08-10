// 线程池参数估算：QPS / 耗时 / 利用率 → core / max / queue

/**
 * 安全解析正数
 * @param {*} v
 * @param {string} name
 * @param {boolean} [allowZero]
 * @returns {{ ok: boolean, value?: number, msg?: string }}
 */
function pcParseNumber(v, name, allowZero) {
    if (v == null || String(v).trim() === '') {
        return { ok: false, msg: '请输入' + name };
    }
    var n = Number(v);
    if (!isFinite(n)) {
        return { ok: false, msg: name + ' 必须是有效数字' };
    }
    if (allowZero) {
        if (n < 0) return { ok: false, msg: name + ' 不能为负' };
    } else {
        if (n <= 0) return { ok: false, msg: name + ' 必须大于 0' };
    }
    return { ok: true, value: n };
}

/**
 * 估算线程池参数
 * @param {{
 *   qps: number|string,
 *   avgMs: number|string,
 *   cpuCores?: number|string,
 *   blockingRatio?: number|string,
 *   targetUtil?: number|string,
 *   queueSeconds?: number|string
 * }} input
 * @returns {{
 *   ok: boolean,
 *   coreSize?: number,
 *   maxSize?: number,
 *   queueCapacity?: number,
 *   concurrency?: number,
 *   formula?: string,
 *   notes?: string[],
 *   msg?: string
 * }}
 */
function poolCalcEstimate(input) {
    input = input || {};

    var qpsR = pcParseNumber(input.qps, 'QPS');
    if (!qpsR.ok) return qpsR;
    var avgR = pcParseNumber(input.avgMs, '平均耗时(ms)');
    if (!avgR.ok) return avgR;

    var coresR = pcParseNumber(input.cpuCores != null ? input.cpuCores : 8, 'CPU 核数');
    if (!coresR.ok) return coresR;

    var blockR = pcParseNumber(
        input.blockingRatio != null ? input.blockingRatio : 1,
        '阻塞比(wait/compute)',
        true
    );
    if (!blockR.ok) return blockR;
    if (blockR.value > 100) {
        return { ok: false, msg: '阻塞比过大，请输入合理值（如 0~20）' };
    }

    var utilR = pcParseNumber(
        input.targetUtil != null ? input.targetUtil : 0.7,
        '目标利用率',
        true
    );
    if (!utilR.ok) return utilR;
    if (utilR.value <= 0 || utilR.value > 1) {
        return { ok: false, msg: '目标利用率应在 (0, 1] 之间，如 0.7' };
    }

    var queueSecR = pcParseNumber(
        input.queueSeconds != null ? input.queueSeconds : 1.5,
        '可接受排队秒数',
        true
    );
    if (!queueSecR.ok) return queueSecR;
    if (queueSecR.value <= 0) {
        return { ok: false, msg: '可接受排队秒数必须大于 0' };
    }

    var qps = qpsR.value;
    var avgMs = avgR.value;
    var cores = coresR.value;
    var blockingRatio = blockR.value;
    var targetUtil = utilR.value;
    var queueSeconds = queueSecR.value;

    // 理论并发（Little's Law）：L = λ * W
    var concurrency = qps * (avgMs / 1000);

    // CPU 密集：core ≈ cores * targetUtil
    // IO 密集：core ≈ cores * (1 + blockingRatio) * targetUtil（Little 法与硬件法取较大合理值）
    var coreByCpu = cores * targetUtil;
    var coreByIo = cores * (1 + blockingRatio) * targetUtil;
    var coreByConcurrency = concurrency / Math.max(targetUtil, 0.1);

    var isIoHeavy = blockingRatio >= 1;
    var coreRaw = isIoHeavy
        ? Math.max(coreByIo, concurrency)
        : Math.max(coreByCpu, Math.min(concurrency, cores * 2));

    // 不低于理论并发的 80%，也不低于 1
    coreRaw = Math.max(coreRaw, concurrency * 0.8, 1);
    var coreSize = Math.max(1, Math.ceil(coreRaw));

    // max：core * 1.5~2，IO 可到 2
    var maxFactor = isIoHeavy ? 2 : 1.5;
    var maxSize = Math.max(coreSize + 1, Math.ceil(coreSize * maxFactor));

    // queue：qps * 可排队秒数 * 安全系数 1.2
    var queueCapacity = Math.max(0, Math.ceil(qps * queueSeconds * 1.2));

    var notes = [];
    notes.push('理论并发 concurrency ≈ QPS × (avgMs/1000) = ' + qps + ' × (' + avgMs + '/1000) = ' +
        concurrency.toFixed(2));
    if (isIoHeavy) {
        notes.push('判定为 IO/阻塞偏多（blockingRatio=' + blockingRatio + ' ≥ 1）');
        notes.push('core 参考：cores × (1 + blockingRatio) × targetUtil = ' +
            cores + ' × (1+' + blockingRatio + ') × ' + targetUtil + ' = ' + coreByIo.toFixed(2));
    } else {
        notes.push('判定为偏 CPU 密集（blockingRatio=' + blockingRatio + ' < 1）');
        notes.push('core 参考：cores × targetUtil = ' + cores + ' × ' + targetUtil + ' = ' + coreByCpu.toFixed(2));
    }
    notes.push('maxSize 建议 ≈ core × ' + maxFactor + '（突发缓冲）');
    notes.push('queueCapacity ≈ QPS × 排队秒数 × 1.2 = ' +
        qps + ' × ' + queueSeconds + ' × 1.2 = ' + (qps * queueSeconds * 1.2).toFixed(1));
    notes.push('实际还需结合拒绝策略、超时与压测结果微调；队列过大易掩盖慢请求。');

    var formula =
        'Little: concurrency = qps * avgMs/1000\n' +
        'core ≈ max(concurrency, cores*(1+blockingRatio)*targetUtil)  [IO]\n' +
        '     或 max(cores*targetUtil, min(concurrency, cores*2))     [CPU]\n' +
        'max  ≈ core * ' + maxFactor + '\n' +
        'queue≈ qps * queueSeconds * 1.2';

    return {
        ok: true,
        coreSize: coreSize,
        maxSize: maxSize,
        queueCapacity: queueCapacity,
        concurrency: Math.round(concurrency * 100) / 100,
        formula: formula,
        notes: notes,
        msg: '估算完成',
    };
}

/**
 * 格式化估算结果为可读文本
 * @param {object} r
 * @returns {string}
 */
function poolCalcResultText(r) {
    if (!r || !r.ok) {
        return (r && r.msg) || '估算失败';
    }
    var lines = [];
    lines.push('=== 推荐参数 ===');
    lines.push('corePoolSize   : ' + r.coreSize);
    lines.push('maxPoolSize    : ' + r.maxSize);
    lines.push('queueCapacity  : ' + r.queueCapacity);
    lines.push('理论并发       : ' + r.concurrency);
    lines.push('');
    lines.push('=== 公式 ===');
    lines.push(r.formula);
    lines.push('');
    lines.push('=== 说明 ===');
    (r.notes || []).forEach(function (n, i) {
        lines.push((i + 1) + '. ' + n);
    });
    return lines.join('\n');
}

// === UI ===
function poolcalcEmptyHtml() {
    return (
        '<div class="pc-empty">' +
        '<i class="bi bi-cpu"></i>' +
        '<p>填写参数后点击「估算」</p>' +
        '<span>基于 Little\'s Law 与 CPU/IO 模型给出 core / max / queue 建议</span>' +
        '</div>'
    );
}

function poolcalcErrorHtml(msg) {
    var safe =
        typeof escapeHtml === 'function'
            ? escapeHtml(msg || '估算失败')
            : String(msg || '估算失败');
    return (
        '<div class="pc-error"><i class="bi bi-exclamation-triangle"></i><span>' +
        safe +
        '</span></div>'
    );
}

/**
 * 将估算结果渲染为指标卡片 + 说明
 * @param {object} r poolCalcEstimate 成功结果
 * @returns {string}
 */
function poolCalcResultHtml(r) {
    if (!r || !r.ok) {
        return poolcalcErrorHtml((r && r.msg) || '估算失败');
    }
    var esc =
        typeof escapeHtml === 'function'
            ? escapeHtml
            : function (s) {
                  return String(s == null ? '' : s);
              };
    var notes = (r.notes || [])
        .map(function (n) {
            return '<li>' + esc(n) + '</li>';
        })
        .join('');
    return (
        '<div class="pc-metrics">' +
        '<div class="pc-metric pc-metric-core">' +
        '<div class="pc-metric-val">' +
        esc(String(r.coreSize)) +
        '</div>' +
        '<div class="pc-metric-label">corePoolSize</div>' +
        '<div class="pc-metric-sub">核心线程数</div>' +
        '</div>' +
        '<div class="pc-metric pc-metric-max">' +
        '<div class="pc-metric-val">' +
        esc(String(r.maxSize)) +
        '</div>' +
        '<div class="pc-metric-label">maxPoolSize</div>' +
        '<div class="pc-metric-sub">最大线程数</div>' +
        '</div>' +
        '<div class="pc-metric pc-metric-queue">' +
        '<div class="pc-metric-val">' +
        esc(String(r.queueCapacity)) +
        '</div>' +
        '<div class="pc-metric-label">queueCapacity</div>' +
        '<div class="pc-metric-sub">队列容量</div>' +
        '</div>' +
        '<div class="pc-metric pc-metric-conc">' +
        '<div class="pc-metric-val">' +
        esc(String(r.concurrency)) +
        '</div>' +
        '<div class="pc-metric-label">concurrency</div>' +
        '<div class="pc-metric-sub">理论并发</div>' +
        '</div>' +
        '</div>' +
        '<div class="pc-detail">' +
        '<div class="pc-detail-title">公式</div>' +
        '<pre>' +
        esc(r.formula || '') +
        '</pre>' +
        '</div>' +
        '<div class="pc-detail">' +
        '<div class="pc-detail-title">计算说明</div>' +
        '<ol>' +
        notes +
        '</ol>' +
        '</div>'
    );
}

function poolcalcSetCopyVisible(show) {
    var btn = document.getElementById('pcCopyBtn');
    if (btn) btn.style.display = show ? '' : 'none';
}

function poolcalcEstimate() {
    var out = document.getElementById('pcOutput');
    var textEl = document.getElementById('pcResultText');
    if (!out) return;
    var input = {
        qps: document.getElementById('pcQps') && document.getElementById('pcQps').value,
        avgMs: document.getElementById('pcAvgMs') && document.getElementById('pcAvgMs').value,
        cpuCores: document.getElementById('pcCores') && document.getElementById('pcCores').value,
        blockingRatio: document.getElementById('pcBlock') && document.getElementById('pcBlock').value,
        targetUtil: document.getElementById('pcUtil') && document.getElementById('pcUtil').value,
        queueSeconds: document.getElementById('pcQueueSec') && document.getElementById('pcQueueSec').value,
    };
    var r = poolCalcEstimate(input);
    if (!r.ok) {
        out.innerHTML = poolcalcErrorHtml(r.msg || '估算失败');
        if (textEl) textEl.textContent = '';
        poolcalcSetCopyVisible(false);
        if (typeof setStatus === 'function') setStatus(r.msg || '估算失败');
        return;
    }
    out.innerHTML = poolCalcResultHtml(r);
    if (textEl) textEl.textContent = poolCalcResultText(r);
    poolcalcSetCopyVisible(true);
    if (typeof setStatus === 'function') {
        setStatus('推荐 core=' + r.coreSize + ' max=' + r.maxSize + ' queue=' + r.queueCapacity);
    }
}

function poolcalcCopy() {
    var textEl = document.getElementById('pcResultText');
    var text = textEl && textEl.textContent;
    if (!text) {
        if (typeof toast === 'function') toast('暂无可复制结果');
        return;
    }
    if (typeof safeCopy === 'function') {
        safeCopy(text);
        return;
    }
    if (typeof copyText === 'function') {
        copyText('pcResultText');
    }
}

function poolcalcClear() {
    var defaults = {
        pcQps: '',
        pcAvgMs: '',
        pcCores: '8',
        pcBlock: '1',
        pcUtil: '0.7',
        pcQueueSec: '1.5',
    };
    Object.keys(defaults).forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.value = defaults[id];
    });
    var out = document.getElementById('pcOutput');
    if (out) out.innerHTML = poolcalcEmptyHtml();
    var textEl = document.getElementById('pcResultText');
    if (textEl) textEl.textContent = '';
    poolcalcSetCopyVisible(false);
    if (typeof setStatus === 'function') setStatus('已清空');
}

function poolcalcSample() {
    var vals = {
        pcQps: '200',
        pcAvgMs: '50',
        pcCores: '8',
        pcBlock: '5',
        pcUtil: '0.7',
        pcQueueSec: '1.5',
    };
    Object.keys(vals).forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.value = vals[id];
    });
    poolcalcEstimate();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        poolCalcEstimate: poolCalcEstimate,
        poolCalcResultText: poolCalcResultText,
        poolCalcResultHtml: poolCalcResultHtml,
        pcParseNumber: pcParseNumber,
    };
}
