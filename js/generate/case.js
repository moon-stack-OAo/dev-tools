function caseConvert(type) {
    const raw = document.getElementById('caseInput').value;
    const out = document.getElementById('caseOutput');
    if (!raw) {
        out.textContent = '请输入文本';
        out.className = 'output-box error';
        return;
    }
    const words = raw.match(/[a-zA-Z0-9]+/g) || [raw];

    const CONVERTERS = {
        camel: (words) =>
            words.map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase())).join(''),
        pascal: (words) => words.map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(''),
        snake: (words) => words.map((w) => w.toLowerCase()).join('_'),
        kebab: (words) => words.map((w) => w.toLowerCase()).join('-'),
        upper: (words) => words.map((w) => w.toUpperCase()).join('_'),
        lower: (words) => words.map((w) => w.toLowerCase()).join(' '),
    };

    const converter = CONVERTERS[type];
    if (!converter) {
        out.textContent = '未知的转换类型';
        out.className = 'output-box error';
        return;
    }

    out.textContent = converter(words, raw);
    out.className = 'output-box';
    setStatus('Case 转换完成');
}

function caseLoadExample() {
    document.getElementById('caseInput').value = 'hello world';
    document.getElementById('caseOutput').textContent = '';
    document.getElementById('caseOutput').className = 'output-box';
    setStatus('已加载示例文本');
}

function caseClearText() {
    document.getElementById('caseInput').value = '';
    document.getElementById('caseOutput').textContent = '';
    document.getElementById('caseOutput').className = 'output-box';
    setStatus('已清空文本');
}
