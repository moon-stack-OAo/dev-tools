function cronParse() {
    const expr = document.getElementById('cronInput').value.trim();
    const count = parseInt(document.getElementById('cronCount').value) || 5;
    const out = document.getElementById('cronOutput');
    if (!expr) {
        out.textContent = '请输入 Cron 表达式';
        out.className = 'output-box error';
        return;
    }
    const fields = expr.split(/\s+/);
    if (fields.length !== 5) {
        out.textContent = 'Cron 表达式需要 5 段 (分 时 日 月 周)';
        out.className = 'output-box error';
        return;
    }
    try {
        const parsed = fields.map((f, i) => cronParseField(f, [0, 59], [0, 23], [1, 31], [1, 12], [0, 6][i]));
        const [minutes, hours, doms, months, dows] = parsed;
        if (minutes.length === 0 || hours.length === 0) {
            out.textContent = 'Cron 表达式不匹配任何时间';
            out.className = 'output-box error';
            return;
        }
        const results = [];
        let current = new Date();
        current.setSeconds(0, 0);
        let maxIter = 525600;
        while (results.length < count && maxIter-- > 0) {
            const m = current.getMonth() + 1, d = current.getDate(), dw = current.getDay(), h = current.getHours(),
                min = current.getMinutes();
            if (!months.includes(m)) {
                current.setMonth(current.getMonth() + 1);
                current.setDate(1);
                current.setHours(0, 0, 0, 0);
                continue;
            }
            if (!doms.includes(d) && !dows.includes(dw)) {
                current.setDate(d + 1);
                current.setHours(0, 0, 0, 0);
                continue;
            }
            if (!hours.includes(h)) {
                current.setHours(h + 1, 0, 0, 0);
                continue;
            }
            if (!minutes.includes(min)) {
                current.setMinutes(min + 1, 0, 0);
                continue;
            }
            results.push(new Date(current));
            current.setMinutes(min + 1, 0, 0);
        }
        if (results.length === 0) {
            out.textContent = '无法计算下次执行时间';
            out.className = 'output-box error';
            return;
        }
        let r = `表达式: ${expr}\n${maxIter <= 0 ? '(注意: 结果可能不准确)\n' : ''}`;
        results.forEach((d, i) => {
            r += `\n${i + 1}. ${d.toISOString().replace('T', ' ').slice(0, 19)} (${d.toLocaleString()})`;
        });
        out.textContent = r;
        out.className = 'output-box';
        setStatus('Cron 解析完成');
    } catch (e) {
        out.textContent = '解析失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function cronParseField(field, min, max) {
    const values = new Set();
    for (const part of field.split(',')) {
        if (part === '*') {
            for (let i = min; i <= max; i++) values.add(i);
        } else if (part.includes('/')) {
            const [range, stepStr] = part.split('/');
            const step = parseInt(stepStr);
            if (!step) continue;
            if (range === '*') {
                for (let i = min; i <= max; i += step) values.add(i);
            } else if (range.includes('-')) {
                const [a, b] = range.split('-').map(Number);
                for (let i = a; i <= b; i += step) values.add(i);
            } else {
                for (let i = parseInt(range); i <= max; i += step) values.add(i);
            }
        } else if (part.includes('-')) {
            const [a, b] = part.split('-').map(Number);
            for (let i = a; i <= b; i++) values.add(i);
        } else {
            const v = parseInt(part);
            if (!isNaN(v) && v >= min && v <= max) values.add(v);
        }
    }
    return [...values].sort((a, b) => a - b);
}

function cronPreset(expr) {
    document.getElementById('cronInput').value = expr;
    cronParse();
}
