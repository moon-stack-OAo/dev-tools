// _ref-engine.js — 参考速查通用渲染 / 搜索（ADR PR-2.2 / PR-2.3）
// 浏览器全局：window.RefEngine
// 数据约定：[{ cat: string, items: [{ name|cmd|title, desc, code?, syntax?, examples?, returns? }] }]

var RefEngine = (function () {
    'use strict';

    /**
     * 取条目主标题
     * @param {object} item
     * @returns {string}
     */
    function itemTitle(item) {
        if (!item) return '';
        return item.name || item.cmd || item.title || item.codeLabel || '';
    }

    /**
     * 过滤分组
     * @param {Array} data
     * @param {string} keyword
     * @returns {Array}
     */
    function filterGroups(data, keyword) {
        var list = Array.isArray(data) ? data : [];
        var kw = (keyword == null ? '' : String(keyword)).trim().toLowerCase();
        if (!kw) {
            return list.map(function (g) {
                return { cat: g.cat, items: (g.items || []).slice() };
            });
        }
        var result = [];
        list.forEach(function (group) {
            var matched = (group.items || []).filter(function (i) {
                var title = itemTitle(i);
                var desc = i.desc || '';
                var code = i.code || '';
                var syntax = i.syntax || '';
                var returns = i.returns || '';
                var hit =
                    (title && String(title).toLowerCase().indexOf(kw) >= 0) ||
                    (desc && String(desc).toLowerCase().indexOf(kw) >= 0) ||
                    (code && String(code).toLowerCase().indexOf(kw) >= 0) ||
                    (syntax && String(syntax).toLowerCase().indexOf(kw) >= 0) ||
                    (returns && String(returns).toLowerCase().indexOf(kw) >= 0);
                if (!hit && i.examples && i.examples.length) {
                    hit = i.examples.some(function (ex) {
                        return String(ex).toLowerCase().indexOf(kw) >= 0;
                    });
                }
                return hit;
            });
            if (matched.length) {
                result.push({ cat: group.cat, items: matched });
            }
        });
        return result;
    }

    /**
     * 渲染到容器
     * @param {HTMLElement|string} containerOrId
     * @param {Array} groups
     * @param {object} [opts]
     * @param {function} [opts.escapeHtml]
     * @param {function} [opts.renderExtraHead] item -> html fragment after desc
     * @param {boolean} [opts.showSyntax=true]
     * @param {boolean} [opts.showExamples=true]
     * @param {boolean} [opts.showReturns=true]
     */
    function render(containerOrId, groups, opts) {
        opts = opts || {};
        var showSyntax = opts.showSyntax !== false;
        var showExamples = opts.showExamples !== false;
        var showReturns = opts.showReturns !== false;
        var esc =
            opts.escapeHtml ||
            (typeof escapeHtml === 'function'
                ? escapeHtml
                : function (s) {
                      return String(s == null ? '' : s)
                          .replace(/&/g, '&amp;')
                          .replace(/</g, '&lt;')
                          .replace(/>/g, '&gt;')
                          .replace(/"/g, '&quot;')
                          .replace(/'/g, '&#39;');
                  });
        var container =
            typeof containerOrId === 'string'
                ? document.getElementById(containerOrId)
                : containerOrId;
        if (!container) return;
        container.innerHTML = '';
        if (!groups || !groups.length) {
            container.innerHTML =
                '<div style="color:var(--text-muted);padding:20px;text-align:center">无匹配结果</div>';
            return;
        }
        groups.forEach(function (group) {
            var section = document.createElement('div');
            section.className = 'ref-group';
            section.innerHTML =
                '<div class="ref-group-title">' + esc(group.cat) + '</div>';
            (group.items || []).forEach(function (item) {
                var card = document.createElement('div');
                card.className = 'ref-card';
                var title = itemTitle(item);
                var titleEsc = esc(title);
                var descEsc = esc(item.desc || '');
                var copyName = String(title).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                var html =
                    '<div class="ref-cmd-head"><code class="ref-cmd-name">' +
                    titleEsc +
                    '</code><span class="ref-cmd-desc">' +
                    descEsc +
                    '</span>';
                if (opts.renderExtraHead) {
                    html += opts.renderExtraHead(item, esc) || '';
                }
                html +=
                    '<button class="sm outline" type="button" onclick="safeCopy(\'' +
                    copyName +
                    '\')">复制</button></div>';
                if (showSyntax && item.syntax && item.syntax !== title) {
                    html +=
                        '<div class="ref-syntax">' + esc(item.syntax) + '</div>';
                }
                if (item.code) {
                    html +=
                        '<div class="ref-copy-wrap"><pre class="ref-pre"><code>' +
                        esc(item.code) +
                        '</code></pre><button class="ref-copy-btn" type="button" onclick="safeCopy(this.parentElement.querySelector(\'pre\').innerText)">复制</button></div>';
                }
                if (showExamples && item.examples && item.examples.length) {
                    html += '<div class="ref-section-title">示例</div>';
                    item.examples.forEach(function (ex) {
                        html +=
                            '<div class="ref-copy-wrap"><pre class="ref-pre"><code>' +
                            esc(ex) +
                            '</code></pre><button class="ref-copy-btn" type="button" onclick="safeCopy(this.parentElement.querySelector(\'pre\').innerText)">复制</button></div>';
                    });
                }
                if (showReturns && item.returns) {
                    html +=
                        '<div style="font-size:11px;color:var(--text-muted);margin-top:6px"><strong>输出:</strong> ' +
                        esc(item.returns) +
                        '</div>';
                }
                card.innerHTML = html;
                section.appendChild(card);
            });
            container.appendChild(section);
        });
    }

    /**
     * 挂载：数据 + 容器 + 可选搜索框
     * @param {object} cfg
     * @param {string} cfg.containerId
     * @param {string} [cfg.searchId]
     * @param {Array} cfg.data
     * @param {number} [cfg.debounceMs=200]
     * @returns {{render:function, search:function, filterGroups:function}}
     */
    function mount(cfg) {
        cfg = cfg || {};
        var data = cfg.data || [];
        var containerId = cfg.containerId;
        var searchId = cfg.searchId;
        var debounceMs = cfg.debounceMs == null ? 200 : cfg.debounceMs;
        var timer = null;

        function doRender(filter) {
            render(containerId, filterGroups(data, filter), cfg);
        }

        function onSearchInput() {
            clearTimeout(timer);
            timer = setTimeout(function () {
                var el = searchId ? document.getElementById(searchId) : null;
                doRender(el ? el.value : '');
            }, debounceMs);
        }

        doRender('');
        return {
            render: doRender,
            search: onSearchInput,
            filterGroups: function (kw) {
                return filterGroups(data, kw);
            },
        };
    }

    return {
        itemTitle: itemTitle,
        filterGroups: filterGroups,
        render: render,
        mount: mount,
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = RefEngine;
}
