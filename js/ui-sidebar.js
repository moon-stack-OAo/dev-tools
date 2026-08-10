// ui-sidebar.js — 侧边栏构建与高亮（ADR Phase 3）
// 依赖：tools-registry、favorites UI helpers、domCache、openTool、escapeHtml

// === Sidebar ===
const SIDEBAR_KEY = 'devtools_sidebar';
let sidebarCollapsed = false;
/** 当前工具页对应的 tool id；回首页时清空，虚拟分类刷新后用于恢复高亮 */
let sidebarActiveToolId = null;

function readSidebarState() {
    try {
        const s = JSON.parse(localStorage.getItem(SIDEBAR_KEY) || '{}');
        sidebarCollapsed = !!s.collapsed;
    } catch (e) {
        sidebarCollapsed = false;
    }
}

function saveSidebarState() {
    try {
        localStorage.setItem(
            SIDEBAR_KEY,
            JSON.stringify({collapsed: sidebarCollapsed}),
        );
    } catch (e) {
    }
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
            <div class="sb-cat-header" data-cat="${escapeHtml(cat.id)}" title="${escapeHtml(cat.name)}">
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
    }

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
        SIDEBAR_KEY,
    };
}
