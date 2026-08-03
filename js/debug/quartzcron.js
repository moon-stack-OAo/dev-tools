// Quartz Cron 解析 / 描述 / Spring @Scheduled 生成

const QC_MONTH_NAMES = {
    JAN: 1,
    FEB: 2,
    MAR: 3,
    APR: 4,
    MAY: 5,
    JUN: 6,
    JUL: 7,
    AUG: 8,
    SEP: 9,
    OCT: 10,
    NOV: 11,
    DEC: 12,
};

const QC_DOW_NAMES = {
    SUN: 1,
    MON: 2,
    TUE: 3,
    WED: 4,
    THU: 5,
    FRI: 6,
    SAT: 7,
};

const QC_DOW_LABELS = {
    1: '周日',
    2: '周一',
    3: '周二',
    4: '周三',
    5: '周四',
    6: '周五',
    7: '周六',
    0: '周日',
};

const QC_MONTH_LABELS = {
    1: '1月',
    2: '2月',
    3: '3月',
    4: '4月',
    5: '5月',
    6: '6月',
    7: '7月',
    8: '8月',
    9: '9月',
    10: '10月',
    11: '11月',
    12: '12月',
};

/**
 * 规范化单个字段中的名称 → 数字
 * @param {string} field
 * @param {object} nameMap
 * @returns {string}
 */
function qcReplaceNames(field, nameMap) {
    return String(field).replace(/[A-Za-z]+/g, function (w) {
        const up = w.toUpperCase();
        if (nameMap[up] != null) return String(nameMap[up]);
        return w;
    });
}

/**
 * 解析 Quartz cron（6 或 7 段：秒 分 时 日 月 周 [年]）
 * @param {string} expr
 * @returns {{
 *   raw:string, fields:string[], second:string, minute:string, hour:string,
 *   dayOfMonth:string, month:string, dayOfWeek:string, year:string|null,
 *   length:number, valid:boolean, errors:string[]
 * }}
 */
function parseQuartzCron(expr) {
    const result = {
        raw: String(expr || '').trim(),
        fields: [],
        second: '',
        minute: '',
        hour: '',
        dayOfMonth: '',
        month: '',
        dayOfWeek: '',
        year: null,
        length: 0,
        valid: false,
        errors: [],
    };
    if (!result.raw) {
        result.errors.push('表达式不能为空');
        return result;
    }
    // 去掉多余空白
    const parts = result.raw.split(/\s+/).filter(Boolean);
    result.fields = parts.slice();
    result.length = parts.length;

    if (parts.length !== 6 && parts.length !== 7) {
        result.errors.push('Quartz cron 须为 6 段（秒 分 时 日 月 周）或 7 段（含年），当前 ' + parts.length + ' 段');
        // 兼容 Unix 5 段提示
        if (parts.length === 5) {
            result.errors.push('检测到 5 段，可能是 Unix cron（分 时 日 月 周），Quartz 需在最前加秒字段');
        }
        return result;
    }

    result.second = parts[0];
    result.minute = parts[1];
    result.hour = parts[2];
    result.dayOfMonth = parts[3];
    result.month = qcReplaceNames(parts[4], QC_MONTH_NAMES);
    result.dayOfWeek = qcReplaceNames(parts[5], QC_DOW_NAMES);
    result.year = parts.length === 7 ? parts[6] : null;

    // 基础校验
    function checkField(name, val, min, max, allowSpecial) {
        if (val == null || val === '') {
            result.errors.push(name + ' 为空');
            return;
        }
        // 允许 * ? / - , L W # 等
        if (!/^[\dA-Za-z*?,\/\-#LW]+$/.test(val)) {
            result.errors.push(name + ' 含非法字符: ' + val);
            return;
        }
        // 简单范围检查：纯数字
        if (/^\d+$/.test(val)) {
            const n = parseInt(val, 10);
            if (n < min || n > max) {
                result.errors.push(name + ' 超出范围 [' + min + ',' + max + ']: ' + val);
            }
        }
        if (allowSpecial === false && /[?#LW]/.test(val)) {
            result.errors.push(name + ' 不支持特殊字符: ' + val);
        }
    }

    checkField('秒', result.second, 0, 59);
    checkField('分', result.minute, 0, 59);
    checkField('时', result.hour, 0, 23);
    checkField('日', result.dayOfMonth, 1, 31);
    checkField('月', result.month, 1, 12);
    checkField('周', result.dayOfWeek, 1, 7);
    if (result.year != null) {
        checkField('年', result.year, 1970, 2099);
    }

    // Quartz 规则：日 与 周 不能同时指定具体值（其一须为 ?）
    const dom = result.dayOfMonth;
    const dow = result.dayOfWeek;
    const domSpecific = dom !== '?' && dom !== '*';
    const dowSpecific = dow !== '?' && dow !== '*';
    // 实际上 Quartz 要求：若一方有具体值，另一方必须是 ?
    // * 和 * 也不合法；必须有一个 ?
    if (dom === '*' && dow === '*') {
        result.errors.push('日(Day-of-Month) 与 周(Day-of-Week) 不能同时为 *，需将其中一个设为 ?');
    } else if (domSpecific && dowSpecific) {
        result.errors.push('日 与 周 不能同时指定具体值，需将其中一个设为 ?');
    } else if (dom !== '?' && dow !== '?' && !(dom === '*' || dow === '*')) {
        // 两边都不是 ?
        if (dom !== '*' && dow !== '*') {
            result.errors.push('日 与 周 须有一个为 ?');
        }
    }

    result.valid = result.errors.length === 0;
    return result;
}

/**
 * 描述单个字段（简化）
 * @param {string} label
 * @param {string} val
 * @param {object} [opts]
 * @returns {string}
 */
function qcDescribeField(label, val, opts) {
    opts = opts || {};
    if (val == null || val === '') return label + '：空';
    if (val === '*') return '每' + label;
    if (val === '?') return label + '不指定';

    // L
    if (val === 'L') {
        if (opts.dow) return '周的最后一天';
        return '最后一日';
    }
    // nL
    if (/^\d+L$/i.test(val) && opts.dow) {
        const n = parseInt(val, 10);
        return '最后一个' + (QC_DOW_LABELS[n] || n);
    }
    // #
    const hash = val.match(/^(\d+)#(\d+)$/);
    if (hash && opts.dow) {
        return '第' + hash[2] + '个' + (QC_DOW_LABELS[parseInt(hash[1], 10)] || hash[1]);
    }
    // W
    if (/^\d+W$/i.test(val)) {
        return '最接近' + parseInt(val, 10) + '日的工作日';
    }
    if (val.toUpperCase() === 'LW') return '本月最后一个工作日';

    // */n 或 n/m
    const step = val.match(/^(\*|\d+(?:-\d+)?)\/(\d+)$/);
    if (step) {
        const base = step[1];
        const s = step[2];
        if (base === '*') return '每' + s + label;
        if (base.indexOf('-') >= 0) {
            return base + ' 范围内每' + s + label;
        }
        return '从' + base + '开始每' + s + label;
    }

    // a-b
    const range = val.match(/^(\d+)-(\d+)$/);
    if (range) {
        if (opts.dow) {
            return (QC_DOW_LABELS[parseInt(range[1], 10)] || range[1]) + '至' + (QC_DOW_LABELS[parseInt(range[2], 10)] || range[2]);
        }
        if (opts.month) {
            return (QC_MONTH_LABELS[parseInt(range[1], 10)] || range[1]) + '至' + (QC_MONTH_LABELS[parseInt(range[2], 10)] || range[2]);
        }
        return range[1] + '至' + range[2] + label;
    }

    // 列表
    if (val.indexOf(',') >= 0) {
        const items = val.split(',').map(function (x) {
            if (opts.dow && /^\d+$/.test(x)) return QC_DOW_LABELS[parseInt(x, 10)] || x;
            if (opts.month && /^\d+$/.test(x)) return QC_MONTH_LABELS[parseInt(x, 10)] || x;
            return x;
        });
        return items.join('、');
    }

    // 单值
    if (/^\d+$/.test(val)) {
        if (opts.dow) return QC_DOW_LABELS[parseInt(val, 10)] || val;
        if (opts.month) return QC_MONTH_LABELS[parseInt(val, 10)] || val + '月';
        return val + label;
    }

    return val;
}

/**
 * 人类可读描述（简化版）
 * @param {string|object} exprOrParsed
 * @returns {string}
 */
function describeQuartzCron(exprOrParsed) {
    const p = typeof exprOrParsed === 'string' ? parseQuartzCron(exprOrParsed) : exprOrParsed;
    if (!p || !p.fields || !p.fields.length) {
        return '无效表达式';
    }
    if (!p.valid && p.errors && p.errors.length) {
        return '解析警告: ' + p.errors.join('；') + (p.length >= 6 ? '（仍尝试描述）' : '');
    }

    const parts = [];
    // 常见快捷
    if (
        p.second === '0' &&
        p.minute === '0' &&
        p.hour === '0' &&
        (p.dayOfMonth === '*' || p.dayOfMonth === '?') &&
        p.month === '*' &&
        (p.dayOfWeek === '?' || p.dayOfWeek === '*')
    ) {
        return '每天 00:00:00' + (p.year ? '（年: ' + p.year + '）' : '');
    }

    parts.push(qcDescribeField('秒', p.second));
    parts.push(qcDescribeField('分', p.minute));
    parts.push(qcDescribeField('时', p.hour));

    if (p.dayOfMonth && p.dayOfMonth !== '?') {
        parts.push(qcDescribeField('日', p.dayOfMonth));
    }
    parts.push(qcDescribeField('月', p.month, { month: true }));
    if (p.dayOfWeek && p.dayOfWeek !== '?') {
        parts.push(qcDescribeField('周', p.dayOfWeek, { dow: true }));
    }
    if (p.year && p.year !== '*') {
        parts.push('年: ' + p.year);
    }

    return parts.join('，');
}

/**
 * 生成 Spring @Scheduled 相关代码片段
 * @param {object} options
 * @param {string} [options.cron] Quartz/Spring cron
 * @param {string} [options.zone]
 * @param {number|string} [options.fixedRate]
 * @param {number|string} [options.fixedDelay]
 * @param {number|string} [options.initialDelay]
 * @param {string} [options.methodName='scheduledTask']
 * @param {string} [options.mode='cron'] cron|fixedRate|fixedDelay
 * @returns {{cron:string, fixedRate:string, fixedDelay:string, all:string}}
 */
function toSpringScheduled(options) {
    options = options || {};
    const methodName = options.methodName || 'scheduledTask';
    const zone = (options.zone || '').trim();
    const cron = (options.cron || '').trim();
    const fixedRate = options.fixedRate;
    const fixedDelay = options.fixedDelay;
    const initialDelay = options.initialDelay;

    function methodBody() {
        return (
            'public void ' +
            methodName +
            '() {\n' +
            '    // TODO: 定时任务逻辑\n' +
            '}'
        );
    }

    function zonePart() {
        return zone ? ', zone = "' + zone.replace(/"/g, '\\"') + '"' : '';
    }

    function delayPart(prefix) {
        if (initialDelay == null || initialDelay === '') return '';
        const n = Number(initialDelay);
        if (!isFinite(n)) return ', ' + prefix + ' = ' + JSON.stringify(String(initialDelay));
        return ', initialDelay = ' + n;
    }

    let cronSnippet = '';
    if (cron) {
        cronSnippet =
            '@Scheduled(cron = "' +
            cron.replace(/\\/g, '\\\\').replace(/"/g, '\\"') +
            '"' +
            zonePart() +
            ')\n' +
            methodBody();
    }

    let rateSnippet = '';
    if (fixedRate != null && fixedRate !== '') {
        const r = Number(fixedRate);
        const rateArg = isFinite(r) ? String(r) : '"' + String(fixedRate).replace(/"/g, '\\"') + '"';
        rateSnippet =
            '@Scheduled(fixedRate = ' +
            rateArg +
            delayPart('initialDelay') +
            ')\n' +
            methodBody();
    }

    let delaySnippet = '';
    if (fixedDelay != null && fixedDelay !== '') {
        const d = Number(fixedDelay);
        const delayArg = isFinite(d) ? String(d) : '"' + String(fixedDelay).replace(/"/g, '\\"') + '"';
        delaySnippet =
            '@Scheduled(fixedDelay = ' +
            delayArg +
            delayPart('initialDelay') +
            ')\n' +
            methodBody();
    }

    // 默认按 mode 生成一个
    const mode = options.mode || 'cron';
    let primary = cronSnippet;
    if (mode === 'fixedRate') primary = rateSnippet || cronSnippet;
    if (mode === 'fixedDelay') primary = delaySnippet || cronSnippet;

    const blocks = [];
    blocks.push('// 需启用: @EnableScheduling');
    blocks.push('import org.springframework.scheduling.annotation.Scheduled;');
    blocks.push('');
    if (primary) blocks.push(primary);
    if (cronSnippet && primary !== cronSnippet) {
        blocks.push('');
        blocks.push('// cron 方式');
        blocks.push(cronSnippet);
    }
    if (rateSnippet && primary !== rateSnippet) {
        blocks.push('');
        blocks.push('// fixedRate（上次启动后间隔 ms）');
        blocks.push(rateSnippet);
    }
    if (delaySnippet && primary !== delaySnippet) {
        blocks.push('');
        blocks.push('// fixedDelay（上次结束后间隔 ms）');
        blocks.push(delaySnippet);
    }

    return {
        cron: cronSnippet,
        fixedRate: rateSnippet,
        fixedDelay: delaySnippet,
        all: blocks.join('\n'),
    };
}

/**
 * Unix 5 段与 Quartz 差异说明文本
 * @returns {string}
 */
function quartzVsUnixNotes() {
    return [
        'Quartz vs Unix cron 差异：',
        '1. 字段数：Unix 5 段（分 时 日 月 周）；Quartz 6/7 段（秒 分 时 日 月 周 [年]）',
        '2. 周字段：Unix 0-7（0 与 7=周日）；Quartz 1-7（1=周日）或 SUN-SAT',
        '3. 特殊字符：Quartz 支持 ? L W #；Unix 通常不支持',
        '4. 日/周互斥：Quartz 中 Day-of-Month 与 Day-of-Week 必须有一个为 ?',
        '5. Spring @Scheduled cron：默认 6 段 Quartz 风格（可含秒）',
    ].join('\n');
}

// ---------- UI ----------

/** 常用 IANA 时区（与 timezone 工具对齐；不 import，避免懒加载依赖） */
const QC_COMMON_ZONES = [
    'UTC',
    'Asia/Shanghai',
    'Asia/Tokyo',
    'Asia/Singapore',
    'Asia/Seoul',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Hong_Kong',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Moscow',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Sao_Paulo',
    'Australia/Sydney',
    'Pacific/Auckland',
];

/**
 * 读取 zone：自定义优先，否则取下拉；空字符串表示不指定 zone
 * @returns {string}
 */
function quartzcronGetZone() {
    const customEl = document.getElementById('qcZoneCustom');
    const custom = customEl ? String(customEl.value || '').trim() : '';
    if (custom) return custom;
    const sel = document.getElementById('qcZone');
    return sel ? String(sel.value || '').trim() : '';
}

function quartzcronPopulateZoneSelect() {
    const sel = document.getElementById('qcZone');
    if (!sel) return;
    const opts = ['<option value="">（不指定 zone / 使用服务器默认）</option>'];
    QC_COMMON_ZONES.forEach(function (z) {
        opts.push('<option value="' + z + '">' + z + '</option>');
    });
    sel.innerHTML = opts.join('');
    sel.value = 'Asia/Shanghai';
}

function quartzcronInit() {
    quartzcronPopulateZoneSelect();
}

function quartzcronParse() {
    const expr = document.getElementById('qcInput').value;
    const out = document.getElementById('qcOutput');
    const descEl = document.getElementById('qcDesc');
    try {
        const parsed = parseQuartzCron(expr);
        const desc = describeQuartzCron(parsed);
        if (descEl) descEl.textContent = desc;

        const lines = [];
        lines.push('表达式: ' + parsed.raw);
        lines.push('段数: ' + parsed.length + (parsed.length === 7 ? '（含年）' : parsed.length === 6 ? '（标准）' : ''));
        lines.push('有效: ' + (parsed.valid ? '是' : '否'));
        if (parsed.errors.length) {
            lines.push('问题:');
            parsed.errors.forEach(function (e) {
                lines.push('  - ' + e);
            });
        }
        if (parsed.length >= 6) {
            lines.push('');
            lines.push('秒: ' + parsed.second);
            lines.push('分: ' + parsed.minute);
            lines.push('时: ' + parsed.hour);
            lines.push('日: ' + parsed.dayOfMonth);
            lines.push('月: ' + parsed.month);
            lines.push('周: ' + parsed.dayOfWeek);
            if (parsed.year != null) lines.push('年: ' + parsed.year);
        }
        lines.push('');
        lines.push('描述: ' + desc);
        lines.push('');
        lines.push(quartzVsUnixNotes());

        out.textContent = lines.join('\n');
        out.className = parsed.valid ? 'output-box' : 'output-box error';
        setStatus(parsed.valid ? '解析完成' : '解析完成（有警告）');
    } catch (e) {
        out.textContent = e.message;
        out.className = 'output-box error';
    }
}

function quartzcronToSpring() {
    const expr = document.getElementById('qcInput').value;
    const zone = quartzcronGetZone();
    const mode = (document.getElementById('qcMode') || {}).value || 'cron';
    const fixedRate = (document.getElementById('qcFixedRate') || {}).value;
    const fixedDelay = (document.getElementById('qcFixedDelay') || {}).value;
    const initialDelay = (document.getElementById('qcInitialDelay') || {}).value;
    const methodName = (document.getElementById('qcMethod') || {}).value || 'scheduledTask';
    const out = document.getElementById('qcSpringOut');

    try {
        // 若是 cron 模式先校验
        if (mode === 'cron') {
            const p = parseQuartzCron(expr);
            if (!p.valid && p.length !== 6 && p.length !== 7) {
                throw new Error(p.errors.join('；') || 'cron 无效');
            }
        }
        const snippets = toSpringScheduled({
            cron: expr,
            zone: zone,
            mode: mode,
            fixedRate: fixedRate,
            fixedDelay: fixedDelay,
            initialDelay: initialDelay,
            methodName: methodName,
        });
        out.textContent = snippets.all;
        out.className = 'output-box';
        setStatus('@Scheduled 代码已生成');
    } catch (e) {
        out.textContent = e.message;
        out.className = 'output-box error';
    }
}

function quartzcronLoadSample() {
    document.getElementById('qcInput').value = '0 0 12 * * ?';
    const zone = document.getElementById('qcZone');
    if (zone) zone.value = 'Asia/Shanghai';
    const custom = document.getElementById('qcZoneCustom');
    if (custom) custom.value = '';
    setStatus('已加载示例：每天中午 12:00:00');
}

function quartzcronPreset(expr) {
    document.getElementById('qcInput').value = expr;
    quartzcronParse();
}

function quartzcronClear() {
    document.getElementById('qcInput').value = '';
    const zone = document.getElementById('qcZone');
    if (zone) zone.value = 'Asia/Shanghai';
    const custom = document.getElementById('qcZoneCustom');
    if (custom) custom.value = '';
    const out = document.getElementById('qcOutput');
    if (out) out.textContent = '';
    const so = document.getElementById('qcSpringOut');
    if (so) so.textContent = '';
    const desc = document.getElementById('qcDesc');
    if (desc) desc.textContent = '';
    setStatus('已清空');
}

if (typeof registerInit === 'function') {
    registerInit('quartzcron', quartzcronInit);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseQuartzCron: parseQuartzCron,
        describeQuartzCron: describeQuartzCron,
        toSpringScheduled: toSpringScheduled,
        quartzVsUnixNotes: quartzVsUnixNotes,
        QC_COMMON_ZONES: QC_COMMON_ZONES,
    };
}
