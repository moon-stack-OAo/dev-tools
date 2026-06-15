function csvFormat() {
    const input = document.getElementById('csvInput').value;
    const delimRaw = document.getElementById('csvDelim').value;
    const delim = delimRaw === '\\t' ? '\t' : delimRaw;
    const hasHeader = document.getElementById('csvHeader').checked;
    const out = document.getElementById('csvOutput');
    if (!input) { out.innerHTML = '请输入 CSV 数据'; return; }
    const lines = input.split('\n').map(l => l.trim()).filter(l => l);
    if (!lines.length) { out.innerHTML = '无数据'; return; }
    const rows = lines.map(l => parseCSVLine(l, delim));
    if (!rows.length) { out.innerHTML = '无法解析'; return; }
    const maxCols = Math.max(...rows.map(r => r.length));
    const padded = rows.map(r => {
        while (r.length < maxCols) r.push('');
        return r;
    });
    const widths = [];
    for (let c = 0; c < maxCols; c++) {
        widths[c] = Math.max(8, ...padded.map(r => r[c].length));
    }
    const startRow = hasHeader ? 1 : 0;
    let html = '<div style="font-family:var(--font);font-size:12px;overflow:auto">';
    padded.forEach((row, i) => {
        let rowHtml = '<div style="display:flex;' + (i === 0 && hasHeader ? 'font-weight:600;background:var(--accent-glow);border-radius:4px' : '') + '">';
        row.forEach((cell, j) => {
            rowHtml += '<span style="display:inline-block;min-width:' + (widths[j] * 8 + 16) + 'px;padding:3px 8px;border-right:1px solid var(--border);border-bottom:1px solid var(--border)">' + escapeHtml(cell) + '</span>';
        });
        rowHtml += '</div>';
        html += rowHtml;
    });
    html += '</div>';
    out.innerHTML = html;
}

function parseCSVLine(line, delim) {
    const result = [];
    let cur = '', inQuote = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuote) {
            if (ch === '"') {
                if (i + 1 < line.length && line[i + 1] === '"') { cur += '"'; i++; }
                else { inQuote = false; }
            } else { cur += ch; }
        } else {
            if (ch === '"') { inQuote = true; }
            else if (ch === delim) { result.push(cur.trim()); cur = ''; }
            else { cur += ch; }
        }
    }
    result.push(cur.trim());
    return result;
}

function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
