// 纯函数：进制转换（2-36），返回 { ok, result, dec?, msg? }
function convertBase(value, fromBase, toBase) {
    const raw = value == null ? '' : String(value).trim();
    if (!raw) {
        return { ok: false, msg: '请输入数值' };
    }
    const from = parseInt(fromBase, 10) || 10;
    const to = parseInt(toBase, 10) || 16;
    if (from < 2 || from > 36 || to < 2 || to > 36) {
        return { ok: false, msg: '无效的进制' };
    }
    const num = parseInt(raw, from);
    if (isNaN(num)) {
        return { ok: false, msg: '无效的数值' };
    }
    // 校验整串合法：parseInt 会截断非法后缀，用 toString 往返确认
    const absRaw = raw[0] === '-' || raw[0] === '+' ? raw.slice(1) : raw;
    if (!absRaw) {
        return { ok: false, msg: '无效的数值' };
    }
    const roundTrip = Math.abs(num).toString(from).toUpperCase();
    const stripped = absRaw.replace(/^0+/, '') || '0';
    if (stripped.toUpperCase() !== roundTrip) {
        return { ok: false, msg: '无效的数值' };
    }
    const finalResult =
        num < 0
            ? '-' + Math.abs(num).toString(to).toUpperCase()
            : num.toString(to).toUpperCase();
    return { ok: true, result: finalResult, dec: num };
}

function baseConvert() {
    const raw = document.getElementById('bcInput').value.trim();
    const from = parseInt(document.getElementById('bcFromRadix').value) || 10;
    const to = parseInt(document.getElementById('bcToRadix').value) || 16;
    const out = document.getElementById('bcOutput');
    const r = convertBase(raw, from, to);
    if (!r.ok) {
        out.textContent = r.msg || '转换失败';
        out.className = 'output-box error';
        return;
    }
    out.textContent =
        r.result +
        '\n\n十进制: ' +
        r.dec +
        '\n' +
        from +
        '进制: ' +
        raw.toUpperCase() +
        '\n' +
        to +
        '进制: ' +
        r.result;
    out.className = 'output-box';
    setStatus('进制转换完成');
}

function bcQuick(from, to) {
    document.getElementById('bcFromRadix').value = from;
    document.getElementById('bcToRadix').value = to;
    baseConvert();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { convertBase };
}
