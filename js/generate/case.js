function caseConvert(type) {
    const raw = document.getElementById('caseInput').value;
    const out = document.getElementById('caseOutput');
    if (!raw) {
        out.textContent = '请输入文本';
        out.className = 'output-box error';
        return;
    }
    const words = raw.match(/[a-zA-Z0-9]+/g) || [raw];
    let result;
    switch (type) {
        case 'camel':
            result = words.map((w, i) => i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()).join('');
            break;
        case 'pascal':
            result = words.map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join('');
            break;
        case 'snake':
            result = words.map(w => w.toLowerCase()).join('_');
            break;
        case 'kebab':
            result = words.map(w => w.toLowerCase()).join('-');
            break;
        case 'upper':
            result = words.map(w => w.toUpperCase()).join('_');
            break;
        case 'lower':
            result = words.map(w => w.toLowerCase()).join(' ');
            break;
    }
    out.textContent = result;
    out.className = 'output-box';
    setStatus('Case 转换完成');
}
