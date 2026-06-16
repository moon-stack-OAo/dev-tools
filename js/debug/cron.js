const CRON_FIELDS = [
    {id: 'second', name: '秒', min: 0, max: 59, values: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]},
    {id: 'minute', name: '分', min: 0, max: 59, values: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]},
    {
        id: 'hour',
        name: '时',
        min: 0,
        max: 23,
        values: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]
    },
    {
        id: 'dom',
        name: '日',
        min: 1,
        max: 31,
        values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31]
    },
    {id: 'month', name: '月', min: 1, max: 12, values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]},
    {id: 'dow', name: '周', min: 0, max: 7, values: [0, 1, 2, 3, 4, 5, 6, 7]},
    {id: 'year', name: '年', min: new Date().getFullYear(), max: new Date().getFullYear() + 10, values: []},
];
const DOW_LABELS = {0: '日', 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '日'};
const MONTH_LABELS = {
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
    12: '12月'
};
let cronState = {second: '0', minute: '*', hour: '*', dom: '*', month: '*', dow: '*', year: '*'};

function cronBuildFields() {
    const container = document.getElementById('cronFields');
    container.innerHTML = '';
    CRON_FIELDS.forEach(field => {
        const row = document.createElement('div');
        row.className = 'cron-field-row';
        const header = document.createElement('div');
        header.className = 'cron-field-header';
        const label = document.createElement('span');
        label.className = 'cron-field-label';
        label.textContent = field.name;
        header.appendChild(label);
        // 模式按钮
        const modeRow = document.createElement('div');
        modeRow.className = 'cron-mode-row';
        ['任意', '间隔', '指定'].forEach((text, mi) => {
            const btn = document.createElement('button');
            btn.className = 'cron-mode-btn';
            btn.textContent = text;
            btn.dataset.mode = mi; // 0=any 1=interval 2=specific
            btn.onclick = () => cronSetMode(field.id, mi);
            modeRow.appendChild(btn);
        });
        header.appendChild(modeRow);
        row.appendChild(header);
        // 区间行 (始终创建)
        const rangeRow = document.createElement('div');
        rangeRow.className = 'cron-range-row';
        rangeRow.innerHTML = '从 <input type="number" class="cron-range-start" min="' + field.min + '" max="' + field.max + '"> 开始, 每 <input type="number" class="cron-range-step" min="1" max="' + field.max + '"> ' + field.name;
        const rs = rangeRow.querySelector('.cron-range-start');
        const rp = rangeRow.querySelector('.cron-range-step');
        rs.onchange = rp.onchange = () => {
            cronState[field.id] = rs.value + '/' + rp.value;
            cronUpdateFields();
            cronSyncInput();
        };
        row.appendChild(rangeRow);
        // 格子
        const grid = document.createElement('div');
        grid.className = 'cron-grid';
        field.values.forEach(v => {
            const cell = document.createElement('div');
            cell.className = 'cron-cell';
            cell.dataset.value = v;
            cell.textContent = field.id === 'dow' ? (DOW_LABELS[v] || v) : field.id === 'month' ? (MONTH_LABELS[v] || v) : v;
            cell.onclick = () => cronToggleCell(field.id, v);
            grid.appendChild(cell);
        });
        row.appendChild(grid);
        container.appendChild(row);
    });
    cronUpdateFields();
    cronParse();
}

function cronSetMode(fid, mode) {
    if (mode === 0) cronState[fid] = '*';
    else if (mode === 1) cronState[fid] = '*/' + cronGuessStep(CRON_FIELDS.find(f => f.id === fid));
    else cronState[fid] = '' + CRON_FIELDS.find(f => f.id === fid).min;
    cronUpdateFields();
    cronSyncInput();
}

function cronToggleCell(fid, v) {
    const cur = cronState[fid];
    if (cur === '*' || cur.includes('/')) return;
    const nums = cur.split(',').map(Number);
    const idx = nums.indexOf(v);
    if (idx >= 0) nums.splice(idx, 1); else nums.push(v);
    nums.sort((a, b) => a - b);
    cronState[fid] = nums.length ? nums.join(',') : '*';
    cronUpdateFields();
    cronSyncInput();
}

function cronGuessStep(field) {
    if (field.max <= 12) return 1;
    if (field.max === 23) return 2;
    return 5;
}

function cronUpdateFields() {
    CRON_FIELDS.forEach((field, fi) => {
        const row = document.getElementById('cronFields').children[fi];
        const state = cronState[field.id];
        const mode = state === '*' ? 0 : state.includes('/') ? 1 : 2;
        // 模式按钮高亮
        const btns = row.querySelectorAll('.cron-mode-btn');
        btns.forEach((b, i) => b.classList.toggle('active', i === mode));
        // 区间行
        const rangeRow = row.querySelector('.cron-range-row');
        rangeRow.style.display = mode === 1 ? '' : 'none';
        if (mode === 1) {
            const parts = state.split('/');
            rangeRow.querySelector('.cron-range-start').value = parts[0] === '*' ? field.min : parseInt(parts[0]);
            rangeRow.querySelector('.cron-range-step').value = parseInt(parts[1]) || cronGuessStep(field);
        }
        // 格子
        const grid = row.querySelector('.cron-grid');
        grid.style.display = mode === 2 ? '' : 'none';
        const cells = grid.querySelectorAll('.cron-cell');
        cells.forEach(cell => {
            const v = parseInt(cell.dataset.value);
            cell.classList.remove('selected', 'all');
            if (mode === 0) cell.classList.add('all');
            else if (mode === 2) {
                const nums = state.split(',').map(Number);
                if (nums.includes(v)) cell.classList.add('selected');
            }
        });
    });
}

function cronSyncInput() {
    const expr = [cronState.second, cronState.minute, cronState.hour, cronState.dom, cronState.month, cronState.dow, cronState.year].join(' ');
    document.getElementById('cronInput').value = expr;
    cronParse();
}

function cronParse() {
    const expr = document.getElementById('cronInput').value.trim();
    const count = parseInt(document.getElementById('cronCount').value) || 5;
    const out = document.getElementById('cronOutput');
    const desc = document.getElementById('cronDesc');
    if (!expr) {
        out.textContent = '请输入 Cron 表达式';
        out.className = 'output-box error';
        return;
    }
    const fields = expr.split(/\s+/);
    if (fields.length === 5) {
        fields.unshift('0');
        fields.push('*');
    } else if (fields.length === 6) {
        fields.push('*');
    } else if (fields.length !== 7) {
        out.textContent = 'Cron 需要 5~7 段 (秒 分 时 日 月 周 [年])';
        out.className = 'output-box error';
        return;
    }
    try {
        const ranges = [[0, 59], [0, 59], [0, 23], [1, 31], [1, 12], [0, 7], [1970, 2099]];
        const parsed = fields.map((f, i) => cronParseField(f, ranges[i][0], ranges[i][1]));
        const [seconds, minutes, hours, doms, months, dows, years] = parsed;
        if (dows.includes(7) && !dows.includes(0)) dows.push(0);
        if (dows.includes(0) && !dows.includes(7)) dows.push(7);
        const domWild = fields[3] === '*';
        const dowWild = fields[5] === '*';
        const yearWild = fields[6] === '*';
        if (seconds.length === 0 || minutes.length === 0 || hours.length === 0 || years.length === 0) {
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
                min = current.getMinutes(), sec = current.getSeconds(), y = current.getFullYear();
            if (!yearWild && !years.includes(y)) {
                current.setFullYear(y + 1);
                current.setMonth(0, 1);
                current.setHours(0, 0, 0, 0);
                continue;
            }
            if (!months.includes(m)) {
                current.setMonth(current.getMonth() + 1);
                current.setDate(1);
                current.setHours(0, 0, 0, 0);
                continue;
            }
            let dayMatch;
            if (domWild && dowWild) dayMatch = true;
            else if (!domWild && !dowWild) dayMatch = doms.includes(d) || dows.includes(dw);
            else if (!domWild) dayMatch = doms.includes(d);
            else dayMatch = dows.includes(dw);
            if (!dayMatch) {
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
            if (!seconds.includes(sec)) {
                current.setSeconds(sec + 1, 0);
                continue;
            }
            results.push(new Date(current));
            current.setSeconds(sec + 1, 0);
        }
        if (results.length === 0) {
            out.textContent = '无法计算下次执行时间';
            out.className = 'output-box error';
            return;
        }
        let r = '';
        results.forEach((d, i) => {
            const ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + '  ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0');
            r += (i + 1) + '. ' + ds + '\n';
        });
        out.textContent = r.trim();
        out.className = 'output-box';
        desc.textContent = '📋 ' + fields.map((f, i) => ['秒', '分', '时', '日', '月', '周', '年'][i] + '=' + (f === '*' ? '任意' : f)).join(' | ');
        setStatus('Cron 解析完成');
    } catch (e) {
        out.textContent = '解析失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function cronParseField(field, min, max) {
    const values = new Set();
    field = field.replace(/JAN/gi, '1').replace(/FEB/gi, '2').replace(/MAR/gi, '3').replace(/APR/gi, '4').replace(/MAY/gi, '5').replace(/JUN/gi, '6')
        .replace(/JUL/gi, '7').replace(/AUG/gi, '8').replace(/SEP/gi, '9').replace(/OCT/gi, '10').replace(/NOV/gi, '11').replace(/DEC/gi, '12')
        .replace(/SUN/gi, '0').replace(/MON/gi, '1').replace(/TUE/gi, '2').replace(/WED/gi, '3').replace(/THU/gi, '4').replace(/FRI/gi, '5').replace(/SAT/gi, '6');
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
    const parts = expr.split(/\s+/);
    const state = {};
    if (parts.length === 5) {
        state.second = '0';
        state.minute = parts[0];
        state.hour = parts[1];
        state.dom = parts[2];
        state.month = parts[3];
        state.dow = parts[4];
        state.year = '*';
    } else if (parts.length === 6) {
        state.second = parts[0];
        state.minute = parts[1];
        state.hour = parts[2];
        state.dom = parts[3];
        state.month = parts[4];
        state.dow = parts[5];
        state.year = '*';
    } else {
        state.second = parts[0];
        state.minute = parts[1];
        state.hour = parts[2];
        state.dom = parts[3];
        state.month = parts[4];
        state.dow = parts[5];
        state.year = parts[6];
    }
    cronState = state;
    cronUpdateFields();
    cronParse();
}

function cronCopyExpr() {
    const val = document.getElementById('cronInput').value;
    if (!val) {
        toast('没有可复制的内容');
        return;
    }
    safeCopy(val);
}

function cronInit() {
    if (document.getElementById('cronFields')) cronBuildFields();
}