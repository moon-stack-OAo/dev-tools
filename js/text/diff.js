function doDiff() {
    const a = document.getElementById('diffA').value;
    const b = document.getElementById('diffB').value;
    const out = document.getElementById('diffOutput');
    const ignoreCase = document.getElementById('diffIgnoreCase').checked;
    const textA = ignoreCase ? a.toLowerCase() : a;
    const textB = ignoreCase ? b.toLowerCase() : b;
    if (!a && !b) {
        out.textContent = '请输入两边内容';
        return;
    }
    const changes = Diff.diffLines(textA, textB);
    let html = '';
    changes.forEach(part => {
        const cls = part.added ? 'diff-added' : part.removed ? 'diff-removed' : '';
        const prefix = part.added ? '+ ' : part.removed ? '- ' : '  ';
        const lines = part.value.split('\n');
        lines.forEach((line, i) => {
            if (i === lines.length - 1 && line === '') return;
            html += `<div class="${cls}">${prefix}${escapeHtml(line)}</div>`;
        });
    });
    const added = changes.filter(c => c.added).reduce((s, c) => s + c.count, 0);
    const removed = changes.filter(c => c.removed).reduce((s, c) => s + c.count, 0);
    out.innerHTML = `<div style="color:var(--text-dim);margin-bottom:6px;font-size:11px">+${added} / -${removed} 行</div>${html}`;
    setStatus(`对比完成: +${added} / -${removed} 行`);
}

function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
