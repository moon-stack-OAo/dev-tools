const TZ_COMMON = [
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

const TZ_LOCAL = (() => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch (e) {
        return 'UTC';
    }
})();

function tzPopulateSelects() {
    const src = document.getElementById('tzSourceZone');
    const tgt = document.getElementById('tzTargetZone');
    if (!src || !tgt) return;
    const list = [TZ_LOCAL, ...TZ_COMMON.filter((z) => z !== TZ_LOCAL)];
    const seen = new Set();
    const unique = list.filter((z) => {
        if (seen.has(z)) return false;
        seen.add(z);
        return true;
    });
    src.innerHTML = unique.map((z) => `<option value="${z}">${z}</option>`).join('');
    tgt.innerHTML = unique.map((z) => `<option value="${z}">${z}</option>`).join('');
    src.value = 'Asia/Shanghai';
    tgt.value = 'UTC';
}

function tzGetZone(selectId, customId) {
    const custom = document.getElementById(customId).value.trim();
    if (custom) return custom;
    return document.getElementById(selectId).value;
}

function tzValidateZone(zone) {
    if (!zone) return false;
    try {
        new Intl.DateTimeFormat('en-US', {timeZone: zone}).format(new Date());
        return true;
    } catch (e) {
        return false;
    }
}

function tzOffsetMinutes(date, timeZone) {
    const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
    const parts = fmt.formatToParts(date);
    const get = (type) => parts.find((p) => p.type === type)?.value;
    let hour = parseInt(get('hour'), 10);
    if (hour === 24) hour = 0;
    const tzAsUTC = Date.UTC(
        parseInt(get('year'), 10),
        parseInt(get('month'), 10) - 1,
        parseInt(get('day'), 10),
        hour,
        parseInt(get('minute'), 10),
        parseInt(get('second'), 10)
    );
    return Math.round((tzAsUTC - date.getTime()) / 60000);
}

function tzFormatInZone(date, zone) {
    const fmt = new Intl.DateTimeFormat('zh-CN', {
        timeZone: zone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
    return fmt.format(date);
}

function tzLocalInputToUTC(localStr, sourceZone) {
    const m = localStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!m) return null;
    const [, y, mo, d, h, mi, s] = m;
    const fakeUTC = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s || 0)));
    const offset = tzOffsetMinutes(fakeUTC, sourceZone);
    return new Date(fakeUTC.getTime() - offset * 60000);
}

function tzNowString() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function tzConvert() {
    const out = document.getElementById('tzOutput');
    const localStr = document.getElementById('tzSourceTime').value;
    if (!localStr) {
        out.textContent = '请输入源时区的日期时间';
        out.className = 'output-box error';
        return;
    }
    const sourceZone = tzGetZone('tzSourceZone', 'tzSourceCustom');
    const targetZone = tzGetZone('tzTargetZone', 'tzTargetCustom');
    if (!tzValidateZone(sourceZone)) {
        out.textContent = '无效的源时区: ' + sourceZone;
        out.className = 'output-box error';
        return;
    }
    if (!tzValidateZone(targetZone)) {
        out.textContent = '无效的目标时区: ' + targetZone;
        out.className = 'output-box error';
        return;
    }
    const utcDate = tzLocalInputToUTC(localStr, sourceZone);
    if (!utcDate || isNaN(utcDate.getTime())) {
        out.textContent = '无法解析源日期时间';
        out.className = 'output-box error';
        return;
    }

    const srcOffset = tzOffsetMinutes(utcDate, sourceZone);
    const tgtOffset = tzOffsetMinutes(utcDate, targetZone);
    const diffMin = tgtOffset - srcOffset;
    const sign = diffMin >= 0 ? '+' : '-';
    const absMin = Math.abs(diffMin);
    const diffH = Math.floor(absMin / 60);
    const diffM = absMin % 60;
    const offsetStr =
        diffH === 0 && diffM === 0
            ? '同源时区'
            : `比源时区 ${sign}${String(diffH).padStart(2, '0')}:${String(diffM).padStart(2, '0')}`;

    const lines = [];
    lines.push('=== 输入 ===');
    lines.push('源时区时间 : ' + localStr);
    lines.push('源时区     : ' + sourceZone);
    lines.push('目标时区   : ' + targetZone);
    lines.push('');
    lines.push('=== UTC 基准 ===');
    lines.push('ISO 8601   : ' + utcDate.toISOString());
    lines.push('Unix 毫秒  : ' + utcDate.getTime());
    lines.push('Unix 秒    : ' + Math.floor(utcDate.getTime() / 1000));
    lines.push('');
    lines.push('=== 目标时区结果 ===');
    lines.push('日期时间   : ' + tzFormatInZone(utcDate, targetZone));
    lines.push(
        'UTC 偏移   : ' +
        (tgtOffset >= 0 ? '+' : '-') +
        String(Math.floor(Math.abs(tgtOffset) / 60)).padStart(2, '0') +
        ':' +
        String(Math.abs(tgtOffset) % 60).padStart(2, '0')
    );
    lines.push('与源时区差 : ' + offsetStr);
    lines.push('');
    lines.push('=== 跨时区参考 ===');
    TZ_COMMON.forEach((z) => {
        if (z === targetZone) return;
        const t = tzFormatInZone(utcDate, z);
        const o = tzOffsetMinutes(utcDate, z);
        const off =
            (o >= 0 ? '+' : '-') +
            String(Math.floor(Math.abs(o) / 60)).padStart(2, '0') +
            ':' +
            String(Math.abs(o) % 60).padStart(2, '0');
        lines.push(`  ${z.padEnd(22)} ${t}  (UTC${off})`);
    });

    out.textContent = lines.join('\n');
    out.className = 'output-box';
    setStatus('时区转换完成');
}

function tzNow() {
    document.getElementById('tzSourceTime').value = tzNowString();
    tzConvert();
}

function tzSwap() {
    const srcSel = document.getElementById('tzSourceZone');
    const srcCus = document.getElementById('tzSourceCustom');
    const tgtSel = document.getElementById('tzTargetZone');
    const tgtCus = document.getElementById('tzTargetCustom');
    const oldSrcSelVal = srcSel.value;
    const oldSrcCusVal = srcCus.value;
    srcSel.value = tgtSel.value;
    srcCus.value = tgtCus.value;
    tgtSel.value = oldSrcSelVal;
    tgtCus.value = oldSrcCusVal;
    setStatus('已交换源/目标时区');
}

function tzUseBrowser() {
    document.getElementById('tzTargetCustom').value = '';
    document.getElementById('tzTargetZone').value = TZ_LOCAL;
    toast('已使用浏览器时区: ' + TZ_LOCAL);
}

function tzInit() {
    if (document.getElementById('tzSourceZone')) {
        tzPopulateSelects();
        document.getElementById('tzSourceTime').value = tzNowString();
    }
}

registerInit('timezone', tzInit);
