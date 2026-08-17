/**
 * 校验选择器语法（浏览器环境用 document.querySelector 试探）
 * @param {string} selector
 * @param {Document} [doc]
 * @returns {{ ok: boolean, msg?: string }}
 */
function csselectorValidateSelector(selector, doc) {
    var sel = selector == null ? '' : String(selector).trim();
    if (!sel) {
        return { ok: false, msg: '请输入选择器' };
    }
    var d = doc || (typeof document !== 'undefined' ? document : null);
    if (!d) {
        return { ok: false, msg: '当前环境不支持 DOM' };
    }
    try {
        d.querySelector(sel);
        return { ok: true };
    } catch (e) {
        return { ok: false, msg: '无效的选择器：' + (e && e.message ? e.message : String(e)) };
    }
}

/**
 * 将节点列表序列化为 outerHTML 字符串数组
 * @param {Array|NodeList} nodes
 * @param {number} [max]
 * @returns {string[]}
 */
function csselectorSerializeMatches(nodes, max) {
    var limit = max != null && isFinite(Number(max)) ? Math.max(0, Number(max)) : 200;
    var list = [];
    if (!nodes || !nodes.length) return list;
    var n = Math.min(nodes.length, limit);
    for (var i = 0; i < n; i++) {
        var node = nodes[i];
        if (!node) continue;
        if (typeof node.outerHTML === 'string') {
            list.push(node.outerHTML);
        } else if (node.nodeType === 9 && node.documentElement) {
            list.push(node.documentElement.outerHTML || '');
        } else if (typeof node.textContent === 'string') {
            list.push(node.textContent);
        } else {
            list.push(String(node));
        }
    }
    return list;
}

/**
 * 在 HTML 中用 selector 查询匹配节点
 * @param {string} html
 * @param {string} selector
 * @param {Document} [doc] 可注入 document（测试/浏览器）
 * @returns {{ ok: boolean, count?: number, matches?: string[], msg?: string }}
 */
function csselectorQuery(html, selector, doc) {
    var sel = selector == null ? '' : String(selector).trim();
    if (!sel) {
        return { ok: false, count: 0, matches: [], msg: '请输入选择器' };
    }

    var d = doc || (typeof document !== 'undefined' ? document : null);
    if (!d || !d.implementation || typeof d.implementation.createHTMLDocument !== 'function') {
        if (!d || typeof DOMParser === 'undefined') {
            return { ok: false, count: 0, matches: [], msg: '当前环境不支持 DOM' };
        }
    }

    var htmlStr = html == null ? '' : String(html);
    var root;
    try {
        if (typeof DOMParser !== 'undefined') {
            var parser = new DOMParser();
            var parsed = parser.parseFromString(
                '<!DOCTYPE html><html><body>' + htmlStr + '</body></html>',
                'text/html',
            );
            root = parsed.body || parsed.documentElement;
        } else if (d.implementation && typeof d.implementation.createHTMLDocument === 'function') {
            var tmp = d.implementation.createHTMLDocument('');
            tmp.body.innerHTML = htmlStr;
            root = tmp.body;
        } else {
            return { ok: false, count: 0, matches: [], msg: '当前环境不支持 DOM' };
        }
    } catch (e) {
        return {
            ok: false,
            count: 0,
            matches: [],
            msg: 'HTML 解析失败：' + (e && e.message ? e.message : String(e)),
        };
    }

    // 移除 script，避免预览侧意外执行（纯函数侧也剥离）
    try {
        var scripts = root.querySelectorAll('script');
        for (var si = scripts.length - 1; si >= 0; si--) {
            var sc = scripts[si];
            if (sc && sc.parentNode) sc.parentNode.removeChild(sc);
        }
    } catch (e) {
        // ignore
    }

    var nodes;
    try {
        nodes = root.querySelectorAll(sel);
    } catch (e) {
        return {
            ok: false,
            count: 0,
            matches: [],
            msg: '无效的选择器：' + (e && e.message ? e.message : String(e)),
        };
    }

    var matches = csselectorSerializeMatches(nodes, 200);
    return {
        ok: true,
        count: nodes.length,
        matches: matches,
    };
}

function csselectorGetSampleHtml() {
    return [
        '<div class="page">',
        '  <header id="top">',
        '    <h1 class="title">Hello</h1>',
        '    <nav class="nav">',
        '      <a href="#" class="link active">Home</a>',
        '      <a href="#" class="link">About</a>',
        '    </nav>',
        '  </header>',
        '  <main>',
        '    <p class="text">第一段</p>',
        '    <p class="text muted">第二段</p>',
        '    <ul class="list">',
        '      <li data-id="1">Item 1</li>',
        '      <li data-id="2" class="active">Item 2</li>',
        '    </ul>',
        '  </main>',
        '</div>',
    ].join('\n');
}

function csselectorSetCount(countEl, n) {
    if (!countEl) return;
    var num = n == null ? 0 : Number(n);
    if (!isFinite(num) || num < 0) num = 0;
    countEl.textContent = String(num);
    countEl.classList.toggle('has-match', num > 0);
    countEl.classList.toggle('is-zero', num === 0);
}

function csselectorTruncateHtml(s, maxLen) {
    var str = s == null ? '' : String(s);
    var max = maxLen != null && isFinite(Number(maxLen)) ? Math.max(40, Number(maxLen)) : 1200;
    if (str.length <= max) return str;
    return str.slice(0, max) + '\n… (已截断，共 ' + str.length + ' 字符)';
}

function csselectorRender() {
    var htmlEl = document.getElementById('csselHtml');
    var selEl = document.getElementById('csselSelector');
    var countEl = document.getElementById('csselCount');
    var listEl = document.getElementById('csselMatches');
    var previewEl = document.getElementById('csselPreview');
    if (!htmlEl || !selEl) return;

    var html = htmlEl.value;
    var selector = selEl.value;

    if (!String(selector).trim()) {
        csselectorSetCount(countEl, 0);
        if (listEl) {
            listEl.innerHTML =
                '<div class="cssel-empty"><i class="bi bi-search"></i><span>输入选择器后显示匹配结果</span></div>';
        }
        if (previewEl) {
            csselectorRenderPreview(previewEl, html, null);
        }
        return;
    }

    var r = csselectorQuery(html, selector);
    if (!r.ok) {
        csselectorSetCount(countEl, 0);
        if (listEl) {
            listEl.innerHTML =
                '<div class="cssel-error"><i class="bi bi-exclamation-triangle"></i><span>' +
                escapeHtml(r.msg || '查询失败') +
                '</span></div>';
        }
        if (previewEl) {
            csselectorRenderPreview(previewEl, html, null);
        }
        if (typeof setStatus === 'function') setStatus(r.msg || '查询失败');
        return;
    }

    csselectorSetCount(countEl, r.count);
    if (listEl) {
        if (!r.matches.length) {
            listEl.innerHTML =
                '<div class="cssel-empty"><i class="bi bi-inbox"></i><span>无匹配节点</span></div>';
        } else {
            var parts = [];
            for (var i = 0; i < r.matches.length; i++) {
                parts.push(
                    '<div class="cssel-match-item">' +
                        '<div class="cssel-match-idx">#' +
                        (i + 1) +
                        '</div>' +
                        '<pre class="cssel-match-code">' +
                        escapeHtml(csselectorTruncateHtml(r.matches[i], 1200)) +
                        '</pre></div>',
                );
            }
            if (r.count > r.matches.length) {
                parts.push(
                    '<div class="cssel-match-more">仅显示前 ' +
                        r.matches.length +
                        ' 条，共 ' +
                        r.count +
                        ' 个匹配</div>',
                );
            }
            listEl.innerHTML = parts.join('');
        }
    }

    if (previewEl) {
        csselectorRenderPreview(previewEl, html, selector);
    }
    if (typeof setStatus === 'function') setStatus('匹配 ' + r.count + ' 个节点');
}

var csselectorOnInput =
    typeof debounce === 'function' ? debounce(csselectorRender, 180) : csselectorRender;

/**
 * 安全预览：DOMParser 解析后克隆到容器，去掉 script，再 outline 高亮
 */
function csselectorRenderPreview(container, html, selector) {
    if (!container) return;
    container.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'cssel-preview-inner';

    try {
        var parser = new DOMParser();
        var doc = parser.parseFromString(
            '<!DOCTYPE html><html><body>' + String(html || '') + '</body></html>',
            'text/html',
        );
        var body = doc.body;
        if (body) {
            var scripts = body.querySelectorAll('script');
            for (var i = scripts.length - 1; i >= 0; i--) {
                if (scripts[i].parentNode) scripts[i].parentNode.removeChild(scripts[i]);
            }
            // adoptNode 会移出节点；importNode 仅克隆不移除，while 会死循环
            while (body.firstChild) {
                wrap.appendChild(document.adoptNode(body.firstChild));
            }
        }
    } catch (e) {
        wrap.textContent = '预览解析失败';
        container.appendChild(wrap);
        return;
    }

    container.appendChild(wrap);

    if (selector && String(selector).trim()) {
        try {
            var nodes = wrap.querySelectorAll(selector);
            for (var j = 0; j < nodes.length; j++) {
                nodes[j].classList.add('cssel-hl');
            }
        } catch (e) {
            // ignore invalid selector in preview
        }
    }
}

function csselectorClear() {
    var htmlEl = document.getElementById('csselHtml');
    var selEl = document.getElementById('csselSelector');
    if (htmlEl) htmlEl.value = '';
    if (selEl) selEl.value = '';
    csselectorRender();
    if (typeof setStatus === 'function') setStatus('已清空');
}

function csselectorLoadExample() {
    var htmlEl = document.getElementById('csselHtml');
    var selEl = document.getElementById('csselSelector');
    if (htmlEl) htmlEl.value = csselectorGetSampleHtml();
    if (selEl) selEl.value = '.link.active, li.active';
    csselectorRender();
}

if (typeof registerInit === 'function') {
    registerInit('csselector', function () {
        var htmlEl = document.getElementById('csselHtml');
        if (htmlEl && !String(htmlEl.value).trim()) {
            htmlEl.value = csselectorGetSampleHtml();
        }
        csselectorRender();
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        csselectorQuery: csselectorQuery,
        csselectorValidateSelector: csselectorValidateSelector,
        csselectorSerializeMatches: csselectorSerializeMatches,
        csselectorGetSampleHtml: csselectorGetSampleHtml,
    };
}
