// 字符串模板替换

const TPL_PATTERNS = {
    js: {
        regex: /\$\{\s*([a-zA-Z_$][\w$]*)\s*\}/g,
        label: '${var}'
    },
    mybatis: {
        regex: /#\{\s*([a-zA-Z_$][\w$]*)\s*\}/g,
        label: '#{var}'
    },
    mustache: {
        regex: /\{\{\s*([a-zA-Z_$][\w$]*)\s*\}\}/g,
        label: '{{var}}'
    },
    spring: {
        regex: /\$([a-zA-Z_$][\w$]*)\$/g,
        label: '$var$'
    },
    ibatis: {
        regex: /:\s*([a-zA-Z_$][\w$]*)/g,
        label: ':var'
    }
};

function tplAddVar(key, val) {
    const container = document.getElementById('tplVarsList');
    const row = document.createElement('div');
    row.className = 'api-kv-row';
    const k = (key || '').replace(/"/g, '&quot;');
    const v = (val != null ? val : '').replace(/"/g, '&quot;');
    row.innerHTML = `<input type="text" placeholder="变量名" value="${k}"><input type="text" placeholder="变量值" value="${v}"><button class="outline sm" onclick="this.parentElement.remove()" title="删除">&#10005;</button>`;
    container.appendChild(row);
}

function tplCollectVars() {
    const result = {};
    document.querySelectorAll('#tplVarsList .api-kv-row').forEach(row => {
        const inputs = row.querySelectorAll('input');
        const key = inputs[0].value.trim();
        if (key) result[key] = inputs[1].value;
    });
    return result;
}

function tplPreview() {
    const tpl = document.getElementById('tplInput').value;
    const syntax = document.getElementById('tplSyntax').value;
    const out = document.getElementById('tplOutput');
    if (!tpl) {
        out.textContent = '请输入模板';
        out.className = 'output-box tpl-output-box error';
        return;
    }
    const pattern = TPL_PATTERNS[syntax];
    if (!pattern) {
        out.textContent = '不支持的语法: ' + syntax;
        out.className = 'output-box tpl-output-box error';
        return;
    }
    const vars = tplCollectVars();
    const usedKeys = new Set();
    const missing = new Set();
    const re = new RegExp(pattern.regex.source, pattern.regex.flags);
    const result = tpl.replace(re, (m, key) => {
        usedKeys.add(key);
        if (Object.prototype.hasOwnProperty.call(vars, key)) {
            return String(vars[key]);
        }
        missing.add(key);
        return m;
    });
    let msg = result;
    if (missing.size > 0) {
        msg += '\n\n⚠ 缺失变量: ' + Array.from(missing).join(', ');
        out.className = 'output-box tpl-output-box error';
    } else {
        out.className = 'output-box tpl-output-box';
    }
    out.textContent = msg;
    setStatus(`替换完成，使用 ${usedKeys.size} 个变量${missing.size ? '，缺失 ' + missing.size : ''}`);
}

function tplCopy() {
    const out = document.getElementById('tplOutput');
    const text = out.textContent.split('\n\n')[0].trim();
    if (!text) {
        toast('没有可复制的内容');
        return;
    }
    safeCopy(text, '已复制');
}

function tplClear() {
    document.getElementById('tplInput').value = '';
    document.getElementById('tplVarsList').innerHTML = '';
    document.getElementById('tplOutput').textContent = '';
    document.getElementById('tplOutput').className = 'output-box tpl-output-box';
    tplAddVar('name', 'Alice');
    tplAddVar('orderId', '20240115');
    tplAddVar('status', '已发货');
    setStatus('已清空');
}

function tplInit() {
    const list = document.getElementById('tplVarsList');
    if (list && !list.children.length) {
        tplAddVar('name', 'Alice');
        tplAddVar('orderId', '20240115');
        tplAddVar('status', '已发货');
    }
}

registerInit('tplreplace', tplInit);
