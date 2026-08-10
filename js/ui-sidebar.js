// ui-sidebar.js — 侧边栏构建与高亮（ADR Phase 3）
// 依赖：tools-registry、favorites UI helpers、domCache、openTool、escapeHtml

// === Sidebar ===
const SIDEBAR_KEY = 'devtools_sidebar';
const SIDEBAR_WIDTH_DEFAULT = 190;
const SIDEBAR_WIDTH_MIN = 140;
const SIDEBAR_WIDTH_MAX = 360;
let sidebarCollapsed = false;
/** 展开态侧边栏宽度（px），折叠时仍记此值，展开后恢复 */
let sidebarWidth = SIDEBAR_WIDTH_DEFAULT;
/** 当前工具页对应的 tool id；回首页时清空，虚拟分类刷新后用于恢复高亮 */
let sidebarActiveToolId = null;

/** 将宽度钳制到 [min, max] */
function clampSidebarWidth(w) {
    if (w == null || w === '') return SIDEBAR_WIDTH_DEFAULT;
    const n = Number(w);
    if (!Number.isFinite(n)) return SIDEBAR_WIDTH_DEFAULT;
    return Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, Math.round(n)));
}

function readSidebarState() {
    try {
        const s = JSON.parse(localStorage.getItem(SIDEBAR_KEY) || '{}');
        sidebarCollapsed = !!s.collapsed;
        sidebarWidth = clampSidebarWidth(
            s.width != null ? s.width : SIDEBAR_WIDTH_DEFAULT,
        );
    } catch (e) {
        sidebarCollapsed = false;
        sidebarWidth = SIDEBAR_WIDTH_DEFAULT;
    }
}

function saveSidebarState() {
    try {
        localStorage.setItem(
            SIDEBAR_KEY,
            JSON.stringify({collapsed: sidebarCollapsed, width: sidebarWidth}),
        );
    } catch (e) {
    }
}

/** 将当前展开宽度应用到 DOM（折叠态由 CSS 固定 52px） */
function applySidebarWidth(w) {
    sidebarWidth = clampSidebarWidth(w);
    const sidebar = domCache.sidebar;
    if (sidebar) {
        sidebar.style.setProperty('--sidebar-width', sidebarWidth + 'px');
    }
}

/** 侧边栏右侧拖拽调宽（幂等绑定） */
function initSidebarResizer() {
    const resizer = document.getElementById('sidebarResizer');
    const sidebar = domCache.sidebar;
    if (!resizer || !sidebar || resizer.dataset.bound === '1') return;
    resizer.dataset.bound = '1';

    let dragging = false;

    resizer.addEventListener('mousedown', (e) => {
        if (sidebar.classList.contains('collapsed')) return;
        e.preventDefault();
        dragging = true;
        document.body.classList.add('sidebar-resizing');
        hideSidebarTip();
    });

    document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        const rect = sidebar.getBoundingClientRect();
        applySidebarWidth(e.clientX - rect.left);
    });

    document.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false;
        document.body.classList.remove('sidebar-resizing');
        saveSidebarState();
    });
}

// === 侧边栏气泡 title（挂 body，避免 sidebar overflow 裁切）===
let _sbTipEl = null;
let _sbTipTimer = null;
let _sbTipAnchor = null;

function ensureSidebarTipEl() {
    if (_sbTipEl) return _sbTipEl;
    _sbTipEl = document.createElement('div');
    _sbTipEl.className = 'sb-tip';
    _sbTipEl.setAttribute('role', 'tooltip');
    _sbTipEl.hidden = true;
    document.body.appendChild(_sbTipEl);
    return _sbTipEl;
}

function hideSidebarTip() {
    if (_sbTipTimer) {
        clearTimeout(_sbTipTimer);
        _sbTipTimer = null;
    }
    _sbTipAnchor = null;
    if (_sbTipEl) {
        _sbTipEl.hidden = true;
        _sbTipEl.classList.remove('visible');
        _sbTipEl.textContent = '';
    }
}

/**
 * 是否需要显示气泡：折叠侧边栏始终显示；展开时仅文字被截断时显示。
 * @param {Element} el .sb-cat-header | .sb-tool
 */
function shouldShowSidebarTip(el) {
    const sidebar = domCache.sidebar;
    if (!sidebar || !el) return false;
    if (sidebar.classList.contains('collapsed')) return true;
    const nameEl = el.querySelector('.sb-cat-name, .sb-tool-name');
    if (!nameEl) return false;
    return nameEl.scrollWidth > nameEl.clientWidth + 1;
}

function positionSidebarTip(anchor) {
    const tip = ensureSidebarTipEl();
    if (!anchor || tip.hidden) return;
    const rect = anchor.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    // 默认贴在目标右侧中间
    let left = rect.right + 8;
    let top = rect.top + (rect.height - tipRect.height) / 2;
    // 右侧不够则放到左侧
    if (left + tipRect.width > window.innerWidth - 8) {
        left = rect.left - tipRect.width - 8;
        tip.classList.add('sb-tip-left');
    } else {
        tip.classList.remove('sb-tip-left');
    }
    // 垂直钳制
    top = Math.max(8, Math.min(top, window.innerHeight - tipRect.height - 8));
    tip.style.left = Math.round(left) + 'px';
    tip.style.top = Math.round(top) + 'px';
}

function showSidebarTip(anchor, text) {
    if (!anchor || !text) return;
    const tip = ensureSidebarTipEl();
    _sbTipAnchor = anchor;
    tip.textContent = text;
    tip.hidden = false;
    // 先定位再显示，避免闪到 (0,0)
    tip.style.left = '-9999px';
    tip.style.top = '0';
    positionSidebarTip(anchor);
    // 下一帧加 visible 触发过渡
    requestAnimationFrame(() => {
        if (_sbTipAnchor === anchor) tip.classList.add('visible');
    });
}

/** 侧边栏分类/工具气泡 title（事件委托，幂等） */
function initSidebarTooltip() {
    const nav = domCache.sidebarNav;
    if (!nav || nav.dataset.tipBound === '1') return;
    nav.dataset.tipBound = '1';

    const relatedInside = (el, related) =>
        !!(el && related && related.nodeType === 1 && el.contains(related));

    nav.addEventListener('mouseover', (e) => {
        if (e.target.closest('.fav-star, .sb-cat-clear, .sidebar-resizer')) return;
        const catHeader = e.target.closest('.sb-cat-header');
        const toolEl = e.target.closest('.sb-tool');
        const anchor = catHeader || toolEl;
        if (!anchor || !nav.contains(anchor)) return;
        // 进入同一锚点子节点时不重复
        if (_sbTipAnchor === anchor) return;
        if (relatedInside(anchor, e.relatedTarget)) return;

        const text =
            (anchor.getAttribute('data-tip') ||
                anchor.getAttribute('title') ||
                '').trim();
        if (!text || !shouldShowSidebarTip(anchor)) {
            hideSidebarTip();
            return;
        }
        // 抑制原生 title，避免双提示
        if (anchor.getAttribute('title')) {
            anchor.setAttribute('data-native-title', anchor.getAttribute('title'));
            anchor.removeAttribute('title');
        }
        if (_sbTipTimer) clearTimeout(_sbTipTimer);
        _sbTipTimer = setTimeout(() => {
            _sbTipTimer = null;
            showSidebarTip(anchor, text);
        }, 280);
    });

    nav.addEventListener('mouseout', (e) => {
        const catHeader = e.target.closest('.sb-cat-header');
        const toolEl = e.target.closest('.sb-tool');
        const anchor = catHeader || toolEl;
        if (!anchor) return;
        // 仍在同一锚点内移动则忽略
        if (relatedInside(anchor, e.relatedTarget)) return;
        // 恢复原生 title（备用）
        if (anchor.getAttribute('data-native-title')) {
            anchor.setAttribute('title', anchor.getAttribute('data-native-title'));
            anchor.removeAttribute('data-native-title');
        }
        if (_sbTipAnchor === anchor || !_sbTipAnchor) hideSidebarTip();
    });

    // 滚动/窗口变化时隐藏，避免错位
    nav.addEventListener(
        'scroll',
        () => {
            hideSidebarTip();
        },
        {passive: true},
    );
    window.addEventListener('scroll', hideSidebarTip, true);
    window.addEventListener('resize', hideSidebarTip);
}

/** 是否为侧边栏虚拟分类（收藏 / 最近使用） */
function isSidebarVirtualCat(catId) {
    return catId === 'favorites' || catId === 'recent';
}

/**
 * 从含当前工具的分类 id 中选出应确保展开的真实分类（不含收藏/最近）。
 * 打开工具时不强制展开虚拟分类，也不收起用户已展开的其它分类。
 * @param {string[]} catIds
 * @returns {string|null}
 */
function resolveSidebarExpandCatId(catIds) {
    if (!catIds || !catIds.length) return null;
    for (let i = 0; i < catIds.length; i++) {
        if (!isSidebarVirtualCat(catIds[i])) return catIds[i];
    }
    return null;
}

function clearSidebarToolCurrent(nav) {
    if (!nav) return;
    nav.querySelectorAll('.sb-tool.current').forEach((el) => el.classList.remove('current'));
}

function buildSidebar() {
    readSidebarState();
    const nav = domCache.sidebarNav;
    if (!nav) return;
    nav.innerHTML = '';
    categories.forEach((cat) => {
        let toolsInCat;
        if (cat.id === 'favorites') {
            toolsInCat = getFavoriteTools();
        } else if (cat.id === 'recent') {
            toolsInCat = getRecent().map((e) => e.tool);
        } else {
            toolsInCat = tools.filter((t) => t.cat === cat.id);
        }
        if (!toolsInCat.length) return;
        const wrap = document.createElement('div');
        wrap.className = 'sb-cat cat-' + cat.id;
        wrap.dataset.cat = cat.id;
        let clearBtn = '';
        if (cat.id === 'recent') {
            clearBtn =
                '<i class="bi bi-x-circle sb-cat-clear" title="清空最近使用" onclick="event.stopPropagation();clearRecent()"></i>';
        } else if (cat.id === 'favorites') {
            clearBtn =
                '<i class="bi bi-x-circle sb-cat-clear" title="清空收藏" onclick="event.stopPropagation();clearFavoritesUI()"></i>';
        }
        wrap.innerHTML = `
            <div class="sb-cat-header" data-cat="${escapeHtml(cat.id)}" data-tip="${escapeHtml(cat.name)}" title="${escapeHtml(cat.name)}">
                <i class="bi ${cat.icon} sb-cat-icon"></i>
                <span class="sb-cat-name">${escapeHtml(cat.name)}</span>
                ${clearBtn}
                <i class="bi bi-chevron-right sb-cat-arrow"></i>
            </div>
            <div class="sb-tools">
                ${toolsInCat.map((t) => sbToolHtml(t)).join('')}
            </div>
        `;
        nav.appendChild(wrap);
    });

    // 事件只绑定一次，允许重复渲染 HTML
    if (nav.dataset.bound !== '1') {
        nav.dataset.bound = '1';
        nav.addEventListener('click', (e) => {
            const favEl = e.target.closest('.fav-star');
            if (favEl) {
                e.stopPropagation();
                e.preventDefault();
                handleToggleFavorite(favEl.dataset.tool);
                return;
            }
            const catHeader = e.target.closest('.sb-cat-header');
            if (catHeader) {
                const catEl = catHeader.parentElement;
                const sidebar = domCache.sidebar;
                if (sidebar.classList.contains('collapsed')) {
                    sidebar.classList.remove('collapsed');
                    sidebarCollapsed = false;
                    saveSidebarState();
                    nav.querySelectorAll('.sb-cat.expanded').forEach((el) => el.classList.remove('expanded'));
                    catEl.classList.add('expanded');
                } else {
                    catEl.classList.toggle('expanded');
                }
                return;
            }
            const toolEl = e.target.closest('.sb-tool');
            if (toolEl) {
                openTool(toolEl.dataset.tool);
            }
        });
    }

    const toggle = domCache.sidebarToggle;
    if (toggle && toggle.dataset.bound !== '1') {
        toggle.dataset.bound = '1';
        toggle.addEventListener('click', () => {
            sidebarCollapsed = !sidebarCollapsed;
            domCache.sidebar.classList.toggle('collapsed', sidebarCollapsed);
            saveSidebarState();
        });
    }

    if (domCache.sidebar) {
        domCache.sidebar.classList.toggle('collapsed', sidebarCollapsed);
        applySidebarWidth(sidebarWidth);
    }

    initSidebarResizer();
    initSidebarTooltip();

    if (sidebarActiveToolId) {
        highlightSidebarTool(sidebarActiveToolId);
    }
}

// 重绘侧边栏虚拟分类（收藏 / 最近使用），顺序：收藏 → 最近使用 → 其余
function refreshSidebarVirtualCat(catId, toolsInCat, clearTitle, clearFnName) {
    const nav = domCache.sidebarNav;
    if (!nav) return;
    const wasExpanded = !!nav.querySelector(
        '.sb-cat[data-cat="' + catId + '"].expanded',
    );
    nav.querySelector('.sb-cat[data-cat="' + catId + '"]')?.remove();
    if (!toolsInCat.length) {
        // 整段移除后仍恢复当前工具高亮（真实分类上的 current）
        if (sidebarActiveToolId) highlightSidebarTool(sidebarActiveToolId);
        return;
    }
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;
    const wrap = document.createElement('div');
    wrap.className = 'sb-cat cat-' + catId + (wasExpanded ? ' expanded' : '');
    wrap.dataset.cat = catId;
    wrap.innerHTML =
        '<div class="sb-cat-header" data-cat="' +
        escapeHtml(catId) +
        '" data-tip="' +
        escapeHtml(cat.name) +
        '" title="' +
        escapeHtml(cat.name) +
        '"><i class="bi ' +
        cat.icon +
        ' sb-cat-icon"></i><span class="sb-cat-name">' +
        escapeHtml(cat.name) +
        '</span>' +
        '<i class="bi bi-x-circle sb-cat-clear" title="' +
        escapeHtml(clearTitle) +
        '" onclick="event.stopPropagation();' +
        clearFnName +
        '()"></i>' +
        '<i class="bi bi-chevron-right sb-cat-arrow"></i></div>' +
        '<div class="sb-tools">' +
        toolsInCat.map((t) => sbToolHtml(t)).join('') +
        '</div>';
    if (catId === 'favorites') {
        nav.insertBefore(wrap, nav.firstChild);
    } else {
        const favCat = nav.querySelector('.sb-cat[data-cat="favorites"]');
        if (favCat) {
            favCat.after(wrap);
        } else {
            nav.insertBefore(wrap, nav.firstChild);
        }
    }
    // DOM 替换会丢掉 current；有激活工具时重新高亮（真实分类优先展开）
    if (sidebarActiveToolId) {
        highlightSidebarTool(sidebarActiveToolId);
    }
}

function refreshSidebarFavorites() {
    refreshSidebarVirtualCat(
        'favorites',
        getFavoriteTools(),
        '清空收藏',
        'clearFavoritesUI',
    );
}

// 重绘侧边栏"最近使用"分类:每次打开工具后调用,使其与首页最近块保持同步。
// 未产生过最近使用时整段不渲染,与普通分类"无工具则隐藏"的约定一致。
function refreshSidebarRecent() {
    refreshSidebarVirtualCat(
        'recent',
        getRecent().map((e) => e.tool),
        '清空最近使用',
        'clearRecent',
    );
}

function highlightSidebarTool(id) {
    const nav = domCache.sidebarNav;
    if (!nav || !id) return;
    sidebarActiveToolId = id;
    // 只同步 current，不收起任何已展开分类（避免：点真实分类工具 → 该分类被收、最近被展开）
    clearSidebarToolCurrent(nav);
    const toolEls = nav.querySelectorAll('.sb-tool[data-tool="' + id + '"]');
    if (!toolEls.length) return;

    const catIds = [];
    const catElsById = {};
    toolEls.forEach((toolEl) => {
        toolEl.classList.add('current');
        const catEl = toolEl.closest('.sb-cat');
        if (!catEl) return;
        const catId = catEl.dataset.cat;
        if (!catElsById[catId]) {
            catElsById[catId] = catEl;
            catIds.push(catId);
        }
    });
    // 仅确保真实分类展开；收藏/最近保持用户原有展开态
    const expandId = resolveSidebarExpandCatId(catIds);
    if (expandId && catElsById[expandId]) {
        catElsById[expandId].classList.add('expanded');
    }
}

function clearSidebarHighlight() {
    sidebarActiveToolId = null;
    // 回首页只清高亮，保留分类展开状态
    clearSidebarToolCurrent(domCache.sidebarNav);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isSidebarVirtualCat,
        resolveSidebarExpandCatId,
        clampSidebarWidth,
        SIDEBAR_KEY,
        SIDEBAR_WIDTH_DEFAULT,
        SIDEBAR_WIDTH_MIN,
        SIDEBAR_WIDTH_MAX,
    };
}
