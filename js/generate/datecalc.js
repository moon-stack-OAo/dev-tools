function dateCalcNow() {
    const d = new Date();
    const fmt = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2)
        + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2);
    document.getElementById('dateNow').textContent = fmt;
    document.getElementById('dateTimestamp').textContent = d.getTime();
}

function dateCalcAdd() {
    const dateStr = document.getElementById('dateBase').value;
    const amount = parseInt(document.getElementById('dateAmount').value) || 0;
    const unit = document.getElementById('dateUnit').value;
    const op = document.getElementById('dateOp').value;
    const out = document.getElementById('dateResult');
    if (!dateStr) {
        out.textContent = '请选择基准日期';
        return;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
        out.textContent = '无效日期';
        return;
    }
    const sign = op === 'add' ? 1 : -1;
    const map = {
        'day': () => d.setDate(d.getDate() + sign * amount),
        'week': () => d.setDate(d.getDate() + sign * amount * 7),
        'month': () => d.setMonth(d.getMonth() + sign * amount),
        'year': () => d.setFullYear(d.getFullYear() + sign * amount)
    };
    (map[unit] || map.day)();
    const fmt = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    out.textContent = fmt;
}

function dateCalcDiff() {
    const d1 = document.getElementById('dateDiff1').value;
    const d2 = document.getElementById('dateDiff2').value;
    const unit = document.getElementById('dateDiffUnit').value;
    const out = document.getElementById('dateDiffResult');
    if (!d1 || !d2) {
        out.textContent = '请选择两个日期';
        return;
    }
    const a = new Date(d1), b = new Date(d2);
    if (isNaN(a.getTime()) || isNaN(b.getTime())) {
        out.textContent = '无效日期';
        return;
    }
    const ms = Math.abs(b - a);
    const map = {'day': 86400000, 'week': 604800000, 'month': 2592000000, 'year': 31536000000};
    const val = (map[unit] || 86400000);
    out.textContent = Math.round(ms / val) + ' ' + ({
        'day': '天',
        'week': '周',
        'month': '月',
        'year': '年'
    }[unit] || '天');
}

function dateCalcBizDays() {
    const d1 = document.getElementById('dateBiz1').value;
    const d2 = document.getElementById('dateBiz2').value;
    const out = document.getElementById('dateBizResult');
    if (!d1 || !d2) {
        out.textContent = '请选择两个日期';
        return;
    }
    const a = new Date(d1), b = new Date(d2);
    if (isNaN(a.getTime()) || isNaN(b.getTime())) {
        out.textContent = '无效日期';
        return;
    }
    let count = 0;
    const cur = new Date(Math.min(a, b));
    const end = new Date(Math.max(a, b));
    while (cur <= end) {
        const day = cur.getDay();
        if (day !== 0 && day !== 6) count++;
        cur.setDate(cur.getDate() + 1);
    }
    out.textContent = count + ' 个工作日';
}

function dateCalcInit() {
    dateCalcNow();
    setInterval(dateCalcNow, 1000);
    const row = document.getElementById('tsDatetimeRow');
    if (row) {
        row.addEventListener('click', function(e) {
            if (e.target.tagName !== 'BUTTON') {
                document.getElementById('tsDatetime').showPicker();
            }
        });
    }
}

function dateToTimestamp() {
    const dt = document.getElementById('tsDatetime').value;
    const out = document.getElementById('tsResult');
    if (!dt) {
        out.textContent = '请选择日期时间';
        return;
    }
    const d = new Date(dt);
    if (isNaN(d.getTime())) {
        out.textContent = '无效日期时间';
        return;
    }
    out.textContent = '毫秒(ms)：' + d.getTime() + '     秒(s)：' + Math.floor(d.getTime() / 1000);
}

function timestampToDate() {
    const val = document.getElementById('tsInput').value;
    const unit = document.getElementById('tsUnit').value;
    const out = document.getElementById('tsResult');
    if (!val) {
        out.textContent = '请输入时间戳';
        return;
    }
    const ms = unit === 's' ? parseInt(val) * 1000 : parseInt(val);
    const d = new Date(ms);
    if (isNaN(d.getTime())) {
        out.textContent = '无效时间戳';
        return;
    }
    const pad = n => ('0' + n).slice(-2);
    const fmt = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
        + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    out.textContent = '日期时间：' + fmt;
}
