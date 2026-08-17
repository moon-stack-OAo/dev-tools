// === HTML 运行预览 ===
// 将 HTML / CSS / JS 组装为完整文档，在 sandbox iframe 中预览。
// 纯函数通过 module.exports 导出供单元测试 require。

function htmlrunIsFullDocument(html) {
    var s = String(html == null ? '' : html).trim();
    if (!s) return false;
    return /<!DOCTYPE\s/i.test(s) || /<html[\s>]/i.test(s);
}

function htmlrunEscapeTitle(title) {
    return String(title == null ? '' : title)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function htmlrunInjectCss(doc, css) {
    var style = css ? '<style>\n' + css + '\n</style>\n' : '';
    if (!style) return doc;
    if (/<\/head>/i.test(doc)) {
        return doc.replace(/<\/head>/i, style + '</head>');
    }
    if (/<body[\s>]/i.test(doc)) {
        return doc.replace(/<body([\s>])/i, style + '<body$1');
    }
    return style + doc;
}

function htmlrunInjectJs(doc, js) {
    var script = js ? '<script>\n' + js + '\n</script>\n' : '';
    if (!script) return doc;
    if (/<\/body>/i.test(doc)) {
        return doc.replace(/<\/body>/i, script + '</body>');
    }
    return doc + script;
}

/**
 * 组装完整 HTML 文档
 * @param {{ html?: string, css?: string, js?: string, title?: string }} opts
 * @returns {string}
 */
function htmlrunBuildDocument(opts) {
    opts = opts || {};
    var html = String(opts.html == null ? '' : opts.html);
    var css = String(opts.css == null ? '' : opts.css);
    var js = String(opts.js == null ? '' : opts.js);
    var title = opts.title != null && String(opts.title) !== '' ? String(opts.title) : '预览';

    if (htmlrunIsFullDocument(html)) {
        var doc = html;
        doc = htmlrunInjectCss(doc, css);
        doc = htmlrunInjectJs(doc, js);
        return doc;
    }

    return (
        '<!DOCTYPE html>\n' +
        '<html>\n' +
        '<head>\n' +
        '<meta charset="utf-8">\n' +
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
        '<title>' +
        htmlrunEscapeTitle(title) +
        '</title>\n' +
        (css ? '<style>\n' + css + '\n</style>\n' : '') +
        '</head>\n' +
        '<body>\n' +
        html +
        '\n' +
        (js ? '<script>\n' + js + '\n</script>\n' : '') +
        '</body>\n' +
        '</html>\n'
    );
}

function htmlrunDefaultSample() {
    return {
        html:
            '<div class="card">\n' +
            '  <h1>Hello HTML</h1>\n' +
            '  <p>点击按钮切换主题色</p>\n' +
            '  <button id="btn" type="button">切换颜色</button>\n' +
            '</div>\n',
        css:
            '* { box-sizing: border-box; }\n' +
            'body {\n' +
            '  margin: 0;\n' +
            '  min-height: 100vh;\n' +
            '  display: flex;\n' +
            '  align-items: center;\n' +
            '  justify-content: center;\n' +
            '  font-family: system-ui, sans-serif;\n' +
            '  background: #0f172a;\n' +
            '  color: #e2e8f0;\n' +
            '}\n' +
            '.card {\n' +
            '  padding: 28px 32px;\n' +
            '  border-radius: 12px;\n' +
            '  background: #1e293b;\n' +
            '  box-shadow: 0 8px 32px rgba(0,0,0,.35);\n' +
            '  text-align: center;\n' +
            '  max-width: 360px;\n' +
            '}\n' +
            'h1 { margin: 0 0 8px; font-size: 22px; color: var(--accent, #38bdf8); }\n' +
            'p { margin: 0 0 16px; color: #94a3b8; font-size: 14px; }\n' +
            'button {\n' +
            '  border: none;\n' +
            '  border-radius: 8px;\n' +
            '  padding: 10px 18px;\n' +
            '  font-size: 14px;\n' +
            '  cursor: pointer;\n' +
            '  background: var(--accent, #38bdf8);\n' +
            '  color: #0f172a;\n' +
            '  font-weight: 600;\n' +
            '}\n' +
            'button:hover { filter: brightness(1.08); }\n',
        js:
            "var colors = ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#f472b6'];\n" +
            'var i = 0;\n' +
            "document.getElementById('btn').addEventListener('click', function () {\n" +
            '  i = (i + 1) % colors.length;\n' +
            "  document.documentElement.style.setProperty('--accent', colors[i]);\n" +
            '});\n',
    };
}

// === UI ===

var hrInited = false;
var hrDebouncedRun = null;

function hrGetVals() {
    var htmlEl = document.getElementById('hrHtml');
    var cssEl = document.getElementById('hrCss');
    var jsEl = document.getElementById('hrJs');
    return {
        html: htmlEl ? htmlEl.value : '',
        css: cssEl ? cssEl.value : '',
        js: jsEl ? jsEl.value : '',
    };
}

function hrSetVals(html, css, js) {
    var htmlEl = document.getElementById('hrHtml');
    var cssEl = document.getElementById('hrCss');
    var jsEl = document.getElementById('hrJs');
    if (htmlEl) htmlEl.value = html == null ? '' : String(html);
    if (cssEl) cssEl.value = css == null ? '' : String(css);
    if (jsEl) jsEl.value = js == null ? '' : String(js);
}

function hrSwitchTab(tab) {
    var panel = document.getElementById('panel-htmlrun');
    if (!panel) return;
    var tabs = panel.querySelectorAll('.hr-tabs .tab');
    var panes = panel.querySelectorAll('.hr-pane');
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.toggle('active', tabs[i].getAttribute('data-tab') === tab);
    }
    for (var j = 0; j < panes.length; j++) {
        panes[j].classList.toggle('active', panes[j].id === 'hrPane-' + tab);
    }
}

function hrSetStatus(msg) {
    var el = document.getElementById('hrStatus');
    if (el) el.textContent = msg || '';
    if (typeof setStatus === 'function') setStatus(msg || '');
}

function hrRun() {
    var iframe = document.getElementById('hrPreview');
    if (!iframe) return;
    var v = hrGetVals();
    var doc = htmlrunBuildDocument(v);
    iframe.srcdoc = '';
    iframe.srcdoc = doc;
    hrSetStatus('已运行 (' + doc.length + ' 字符)');
}

function hrClear() {
    hrSetVals('', '', '');
    var iframe = document.getElementById('hrPreview');
    if (iframe) iframe.srcdoc = '';
    hrSetStatus('已清空');
}

function hrLoadSample() {
    var s = htmlrunDefaultSample();
    hrSetVals(s.html, s.css, s.js);
    hrRun();
    hrSetStatus('已加载示例');
}

function hrCopyDoc() {
    var v = hrGetVals();
    var doc = htmlrunBuildDocument(v);
    if (!doc.trim()) {
        hrSetStatus('无内容可复制');
        return;
    }
    if (typeof safeCopy === 'function') {
        safeCopy(doc, '完整文档已复制');
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(doc);
    }
    hrSetStatus('完整文档已复制');
}

function hrOnAutoChange() {
    // 勾选后立即按当前内容刷新一次
    var cb = document.getElementById('hrAuto');
    if (cb && cb.checked) hrRun();
}

function hrOnInput() {
    var cb = document.getElementById('hrAuto');
    if (!cb || !cb.checked) return;
    if (hrDebouncedRun) hrDebouncedRun();
}

function hrInit() {
    if (hrInited) return;
    hrInited = true;
    var runFn = function () {
        hrRun();
    };
    if (typeof debounce === 'function') {
        hrDebouncedRun = debounce(runFn, 350);
    } else {
        var t;
        hrDebouncedRun = function () {
            clearTimeout(t);
            t = setTimeout(runFn, 350);
        };
    }
    ['hrHtml', 'hrCss', 'hrJs'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('input', hrOnInput);
    });
    var autoEl = document.getElementById('hrAuto');
    if (autoEl) autoEl.addEventListener('change', hrOnAutoChange);
}

if (typeof registerInit === 'function') {
    registerInit('htmlrun', hrInit);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        htmlrunIsFullDocument: htmlrunIsFullDocument,
        htmlrunBuildDocument: htmlrunBuildDocument,
        htmlrunDefaultSample: htmlrunDefaultSample,
        htmlrunInjectCss: htmlrunInjectCss,
        htmlrunInjectJs: htmlrunInjectJs,
    };
}
