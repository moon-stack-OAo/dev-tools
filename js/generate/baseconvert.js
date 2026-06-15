function baseConvert() {
    const raw = document.getElementById('bcInput').value.trim();
    const from = parseInt(document.getElementById('bcFromRadix').value) || 10;
    const to = parseInt(document.getElementById('bcToRadix').value) || 16;
    const out = document.getElementById('bcOutput');
    if (!raw) {
        out.textContent = '请输入数值';
        out.className = 'output-box error';
        return;
    }
    try {
        const num = parseInt(raw, from);
        if (isNaN(num)) {
            out.textContent = '无效的数值';
            out.className = 'output-box error';
            return;
        }
        const result = num.toString(to).toUpperCase();
        out.textContent = `${result}\n\n十进制: ${num}\n${from}进制: ${raw.toUpperCase()}\n${to}进制: ${result}`;
        out.className = 'output-box';
        setStatus('进制转换完成');
    } catch (e) {
        out.textContent = '转换失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function bcQuick(from, to) {
    document.getElementById('bcFromRadix').value = from;
    document.getElementById('bcToRadix').value = to;
    baseConvert();
}
