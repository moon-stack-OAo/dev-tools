function statsCalc() {
    const text = document.getElementById('statsInput').value;
    document.getElementById('statsChars').textContent = text.length;
    document.getElementById('statsCharsNoSpace').textContent = text.replace(/\s/g, '').length;
    document.getElementById('statsWords').textContent = text.trim() ? text.trim().split(/\s+/).length : 0;
    document.getElementById('statsLines').textContent = text ? text.split('\n').length : 0;
    document.getElementById('statsBytes').textContent = new TextEncoder().encode(text).length;
    const cjk = text.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g);
    document.getElementById('statsCJK').textContent = cjk ? cjk.length : 0;
}
