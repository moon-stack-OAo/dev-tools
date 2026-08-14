// CSS 格式化 / 压缩 / 美化（Beautify.css + 纯函数 minify）

/**
 * 纯函数 CSS 压缩：去注释、压缩空白（不依赖 Beautify）
 * @param {string} css
 * @returns {string}
 */
function cssMinifyPure(css) {
    return String(css == null ? '' : css)
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s*([{};,:])\s*/g, '$1')
        .replace(/;}/g, '}')
        .replace(/\s{2,}/g, ' ')
        .replace(/\n\s*/g, '')
        .trim();
}

function cssfGetBeautify() {
    if (typeof Beautify === 'undefined') {
        if (typeof toast === 'function') toast('js-beautify 库未加载');
        return null;
    }
    return Beautify;
}

function cssfFormat() {
    const input = document.getElementById('cssfInput').value;
    const out = document.getElementById('cssfOutput');
    if (!input.trim()) {
        out.textContent = '请输入 CSS';
        out.className = 'output-box error';
        return;
    }
    const b = cssfGetBeautify();
    if (!b) return;
    try {
        const indent = parseInt(document.getElementById('cssfIndent').value, 10) || 2;
        out.textContent = b.css(input, { indent_size: indent });
        out.className = 'output-box';
        if (typeof setStatus === 'function') setStatus('CSS 格式化成功');
    } catch (e) {
        out.textContent = '格式化失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function cssfMinify() {
    const input = document.getElementById('cssfInput').value;
    const out = document.getElementById('cssfOutput');
    if (!input.trim()) {
        out.textContent = '请输入 CSS';
        out.className = 'output-box error';
        return;
    }
    try {
        out.textContent = cssMinifyPure(input);
        out.className = 'output-box';
        if (typeof setStatus === 'function') setStatus('CSS 压缩完成');
    } catch (e) {
        out.textContent = '压缩失败: ' + e.message;
        out.className = 'output-box error';
    }
}

function cssfClear() {
    document.getElementById('cssfInput').value = '';
    const out = document.getElementById('cssfOutput');
    out.textContent = '';
    out.className = 'output-box';
    if (typeof setStatus === 'function') setStatus('已清空');
}

function cssfLoadSample() {
    document.getElementById('cssfInput').value = [
        '/* sample */',
        '.card{color:#333;background:#fff;padding:10px 20px;border-radius:8px}',
        '.card:hover{box-shadow:0 2px 8px rgba(0,0,0,.12)}',
        '@media (max-width:640px){.card{padding:8px}}',
    ].join('\n');
    if (typeof setStatus === 'function') setStatus('已加载示例');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        cssMinifyPure: cssMinifyPure,
    };
}
