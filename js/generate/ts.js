function tsUpdateNow() {
    const el = document.getElementById('tsNow');
    if (!el) return;
    const now = Date.now();
    el.innerHTML =
        `Unix 秒: ${Math.floor(now / 1000)} | 毫秒: ${now} | 本地: ${new Date(now).toISOString().replace('T', ' ').slice(0, 19)}`;
}

function tsInit() {
    if (window.__tsInterval) return;
    window.__tsInterval = setInterval(tsUpdateNow, 1000);
    tsUpdateNow();
}

function tsFromTimestamp() {
    const raw = document.getElementById('tsInput').value.trim();
    const out = document.getElementById('tsOutput');
    if (!raw) {
        out.textContent = '请输入时间戳';
        out.className = 'output-box error';
        return;
    }
    const num = Number(raw);
    if (isNaN(num)) {
        out.textContent = '无效的数字';
        out.className = 'output-box error';
        return;
    }
    const ms = num < 1e12 ? num * 1000 : num;
    const d = new Date(ms);
    out.textContent = `Unix 秒: ${Math.floor(ms / 1000)}\n毫秒: ${ms}\nUTC: ${d.toISOString().replace('T', ' ').slice(0, 19)}\n本地: ${d.toLocaleString()}`;
    out.className = 'output-box';
    setStatus('时间戳转换完成');
}

function tsFromDate() {
    const raw = document.getElementById('tsDateInput').value.trim();
    const out = document.getElementById('tsOutput');
    if (!raw) {
        out.textContent = '请输入日期';
        out.className = 'output-box error';
        return;
    }
    const d = new Date(raw);
    if (isNaN(d.getTime())) {
        out.textContent = '无效的日期格式';
        out.className = 'output-box error';
        return;
    }
    const ms = d.getTime();
    out.textContent = `Unix 秒: ${Math.floor(ms / 1000)}\n毫秒: ${ms}\nISO: ${d.toISOString()}\n本地: ${d.toLocaleString()}`;
    out.className = 'output-box';
    setStatus('日期转换完成');
}
