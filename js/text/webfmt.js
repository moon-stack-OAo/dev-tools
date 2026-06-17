// HTML / CSS / JS 格式化压缩

function webfmtSwitchTab(tab) {
    const tabs = document.querySelectorAll('#panel-webfmt .tab-bar .tab');
    const contents = document.querySelectorAll('#panel-webfmt .tab-content');
    tabs.forEach((t, i) => {
        const map = ['html', 'css', 'js'];
        t.classList.toggle('active', map[i] === tab);
    });
    contents.forEach(c => c.classList.toggle('active', c.id === 'webfmtTab-' + tab));
}

function getBeautify() {
    if (typeof Beautify === 'undefined') {
        toast('js-beautify 库未加载');
        return null;
    }
    return Beautify;
}

function htmlMinify(html) {
    return html
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/>\s+</g, '><')
        .replace(/\s{2,}/g, ' ')
        .replace(/\n\s*/g, '')
        .trim();
}

function cssMinify(css) {
    return css
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s*([{};,:])\s*/g, '$1')
        .replace(/;}/g, '}')
        .replace(/\s{2,}/g, ' ')
        .replace(/\n\s*/g, '')
        .trim();
}

function jsMinify(js) {
    return js
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1')
        .replace(/\n\s*/g, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/\s*([{};,:()=<>+\-*\/])\s*/g, '$1')
        .trim();
}

function htmlfmtFormat() {
    const input = document.getElementById('htmlfmtInput').value;
    const out = document.getElementById('htmlfmtOutput');
    if (!input.trim()) {
        out.textContent = '请输入 HTML';
        out.className = 'output-box error';
        return;
    }
    const b = getBeautify();
    if (!b) return;
    try {
        const indent = parseInt(document.getElementById('htmlfmtIndent').value, 10);
        out.textContent = b.html(input, {indent_size: indent, wrap_line_length: 120});
        out.className = 'output-box';
        setStatus('HTML 格式化成功');
    } catch (e) {
        out.textContent = '格式化失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function htmlfmtMinify() {
    const input = document.getElementById('htmlfmtInput').value;
    const out = document.getElementById('htmlfmtOutput');
    if (!input.trim()) {
        out.textContent = '请输入 HTML';
        out.className = 'output-box error';
        return;
    }
    try {
        out.textContent = htmlMinify(input);
        out.className = 'output-box';
        setStatus('HTML 压缩完成');
    } catch (e) {
        out.textContent = '压缩失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function htmlfmtClear() {
    document.getElementById('htmlfmtInput').value = '';
    document.getElementById('htmlfmtOutput').textContent = '';
    document.getElementById('htmlfmtOutput').className = 'output-box';
}

function cssfmtFormat() {
    const input = document.getElementById('cssfmtInput').value;
    const out = document.getElementById('cssfmtOutput');
    if (!input.trim()) {
        out.textContent = '请输入 CSS';
        out.className = 'output-box error';
        return;
    }
    const b = getBeautify();
    if (!b) return;
    try {
        const indent = parseInt(document.getElementById('cssfmtIndent').value, 10);
        out.textContent = b.css(input, {indent_size: indent});
        out.className = 'output-box';
        setStatus('CSS 格式化成功');
    } catch (e) {
        out.textContent = '格式化失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function cssfmtMinify() {
    const input = document.getElementById('cssfmtInput').value;
    const out = document.getElementById('cssfmtOutput');
    if (!input.trim()) {
        out.textContent = '请输入 CSS';
        out.className = 'output-box error';
        return;
    }
    try {
        out.textContent = cssMinify(input);
        out.className = 'output-box';
        setStatus('CSS 压缩完成');
    } catch (e) {
        out.textContent = '压缩失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function cssfmtClear() {
    document.getElementById('cssfmtInput').value = '';
    document.getElementById('cssfmtOutput').textContent = '';
    document.getElementById('cssfmtOutput').className = 'output-box';
}

function jsfmtFormat() {
    const input = document.getElementById('jsfmtInput').value;
    const out = document.getElementById('jsfmtOutput');
    if (!input.trim()) {
        out.textContent = '请输入 JS';
        out.className = 'output-box error';
        return;
    }
    const b = getBeautify();
    if (!b) return;
    try {
        const indent = parseInt(document.getElementById('jsfmtIndent').value, 10);
        out.textContent = b.js(input, {indent_size: indent, space_in_empty_paren: true});
        out.className = 'output-box';
        setStatus('JS 格式化成功');
    } catch (e) {
        out.textContent = '格式化失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function jsfmtMinify() {
    const input = document.getElementById('jsfmtInput').value;
    const out = document.getElementById('jsfmtOutput');
    if (!input.trim()) {
        out.textContent = '请输入 JS';
        out.className = 'output-box error';
        return;
    }
    try {
        out.textContent = jsMinify(input);
        out.className = 'output-box';
        setStatus('JS 压缩完成');
    } catch (e) {
        out.textContent = '压缩失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function jsfmtClear() {
    document.getElementById('jsfmtInput').value = '';
    document.getElementById('jsfmtOutput').textContent = '';
    document.getElementById('jsfmtOutput').className = 'output-box';
}
