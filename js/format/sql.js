function sqlFormat() {
    const raw = document.getElementById('sqlInput').value;
    const dialect = document.getElementById('sqlDialect').value;
    const out = document.getElementById('sqlOutput');
    if (!raw.trim()) {
        out.textContent = '请输入 SQL';
        out.className = 'output-box error';
        return;
    }
    try {
        out.textContent = sqlFormatter.format(raw, {language: dialect, indent: '  ', uppercase: true});
        out.className = 'output-box';
        setStatus('SQL 格式化成功');
    } catch (e) {
        out.textContent = 'SQL 格式化失败: ' + e.message;
        out.className = 'output-box error';
    }
}
