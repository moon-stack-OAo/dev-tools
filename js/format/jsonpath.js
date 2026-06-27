// JSONPath 查询
const JSONPATH_SAMPLE_DATA = {
    store: {
        book: [
            {category: 'reference', title: 'Sayings of the Century', author: 'Nigel Rees', price: 8.95},
            {category: 'fiction', title: 'Sword of Honour', author: 'Evelyn Waugh', price: 12.99},
            {category: 'fiction', title: 'Moby Dick', author: 'Herman Melville', price: 8.99, isbn: '0-553-21311-3'},
            {category: 'fiction', title: 'The Lord of the Rings', author: 'J.R.R. Tolkien', price: 22.99},
        ],
        bicycle: {color: 'red', price: 19.95},
    },
};

function jsonpathRun() {
    const inputEl = document.getElementById('jsonpathInput');
    const exprEl = document.getElementById('jsonpathExpr');
    const out = document.getElementById('jsonpathOutput');
    const countEl = document.getElementById('jsonpathCount');
    const raw = inputEl.value;
    const expr = exprEl.value;

    countEl.textContent = '';
    if (!raw.trim()) {
        out.textContent = '请输入 JSON 数据';
        out.className = 'output-box error';
        return;
    }
    if (!expr.trim()) {
        out.textContent = '请输入 JSONPath 表达式';
        out.className = 'output-box error';
        return;
    }
    let data;
    try {
        data = JSON.parse(raw);
    } catch (e) {
        out.textContent = 'JSON 解析错误: ' + e.message;
        out.className = 'output-box error';
        return;
    }
    if (typeof JSONPath === 'undefined') {
        out.textContent = 'JSONPath 库未加载';
        out.className = 'output-box error';
        return;
    }
    try {
        const results = JSONPath.JSONPath({path: expr, json: data});
        const arr = Array.isArray(results) ? results : [results];
        countEl.textContent = `（共 ${arr.length} 个匹配）`;
        if (arr.length === 0) {
            out.textContent = '（无匹配结果）';
            out.className = 'output-box';
        } else {
            out.textContent = JSON.stringify(arr, null, 2);
            out.className = 'output-box';
        }
        setStatus(`JSONPath 完成，${arr.length} 个匹配`);
    } catch (e) {
        out.textContent = 'JSONPath 执行错误: ' + e.message;
        out.className = 'output-box error';
    }
}

function jsonpathClear() {
    document.getElementById('jsonpathInput').value = '';
    document.getElementById('jsonpathOutput').textContent = '';
    document.getElementById('jsonpathCount').textContent = '';
    setStatus('已清空');
}

function jsonpathLoadSample() {
    document.getElementById('jsonpathInput').value = JSON.stringify(JSONPATH_SAMPLE_DATA, null, 2);
    setStatus('已加载示例数据');
}

// 监听示例下拉框（事件委托，避免面板异步加载时机问题）
document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'jsonpathSample') {
        const v = e.target.value;
        if (v) {
            document.getElementById('jsonpathExpr').value = v;
            jsonpathRun();
        }
    }
});
