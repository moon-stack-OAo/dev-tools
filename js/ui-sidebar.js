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
/**
 * 快捷区焦点：all | recent | favorites | common | frontend | backend | java
 * 与首页 audience 联动；recent/favorites 为虚拟跳转焦点
 */
let sidebarQuickFocus = 'all';

/** 快捷区条目（顺序固定） */
const SIDEBAR_QUICK_ITEMS = [
    {
        id: 'all',
        kind: 'all',
        name: '全部工具',
        icon: 'bi-folder-fill',
        color: '#f0b429',
    },
    {
        id: 'recent',
        kind: 'virtual',
        cat: 'recent',
        name: '最近使用',
        icon: 'bi-clock-history',
        color: '#94a3b8',
    },
    {
        id: 'favorites',
        kind: 'virtual',
        cat: 'favorites',
        name: '我的收藏',
        icon: 'bi-star-fill',
        color: '#fbbf24',
    },
    {
        id: 'common',
        kind: 'audience',
        audience: 'common',
        name: '通用',
        icon: 'bi-person',
        color: '#60a5fa',
    },
    {
        id: 'frontend',
        kind: 'audience',
        audience: 'frontend',
        name: '前端',
        icon: 'bi-code-slash',
        color: '#22d3ee',
    },
    {
        id: 'backend',
        kind: 'audience',
        audience: 'backend',
        name: '后端',
        icon: 'bi-hdd-stack',
        color: '#a78bfa',
    },
    {
        id: 'java',
        kind: 'audience',
        audience: 'java',
        name: 'Java',
        icon: 'bi-cup-hot',
        color: '#fb923c',
    },
];

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

/**
 * 是否需要显示气泡：折叠侧边栏始终显示；展开时仅文字被截断时显示。
 * 供全局 ui-tooltip 的 canShowUiTip 调用。
 * @param {Element} el .sb-cat-header | .sb-quick-item
 */
function shouldShowSidebarTip(el) {
    const sidebar = domCache.sidebar;
    if (!sidebar || !el) return false;
    if (sidebar.classList.contains('collapsed')) return true;
    const nameEl = el.querySelector('.sb-cat-name, .sb-quick-name');
    if (!nameEl) return false;
    return nameEl.scrollWidth > nameEl.clientWidth + 1;
}

/** 业务分类工具数（侧栏扁平分类用） */
function countSidebarCatTools(catId) {
    if (!catId || typeof tools === 'undefined' || !tools) return 0;
    let n = 0;
    for (let i = 0; i < tools.length; i++) {
        if (tools[i].cat === catId) n++;
    }
    return n;
}

/** 快捷区条目计数 */
function countSidebarQuickItem(item) {
    if (!item) return 0;
    if (item.kind === 'all') {
        return typeof tools !== 'undefined' && tools ? tools.length : 0;
    }
    if (item.kind === 'virtual') {
        if (item.cat === 'recent') {
            return typeof getRecent === 'function' ? getRecent().length : 0;
        }
        if (item.cat === 'favorites') {
            return typeof getFavoriteTools === 'function' ? getFavoriteTools().length : 0;
        }
        return 0;
    }
    if (item.kind === 'audience') {
        if (typeof tools === 'undefined' || !tools) return 0;
        if (typeof toolMatchesAudience !== 'function') return tools.length;
        let n = 0;
        for (let i = 0; i < tools.length; i++) {
            if (toolMatchesAudience(tools[i], item.audience)) n++;
        }
        return n;
    }
    return 0;
}

/** 由首页 audience 推导快捷区焦点（虚拟焦点 recent/favorites 保留） */
function resolveSidebarQuickFocusFromAudience(audience) {
    const a = audience || 'all';
    if (a === 'all') return 'all';
    if (a === 'common' || a === 'frontend' || a === 'backend' || a === 'java') return a;
    return 'all';
}

/**
 * 同步快捷区激活态（与分类区 filter-active 互斥：有业务分类筛选时不高亮快捷项）
 * @param {{focus?: string, audience?: string}} [opts]
 */
function syncSidebarQuickActive(opts) {
    const o = opts || {};
    if (o.focus) {
        sidebarQuickFocus = o.focus;
    } else if (o.audience !== undefined) {
        // 受众变更时覆盖虚拟焦点
        sidebarQuickFocus = resolveSidebarQuickFocusFromAudience(o.audience);
    } else if (typeof homeAudience !== 'undefined') {
        // 若当前不是 recent/favorites 焦点，跟 audience
        if (sidebarQuickFocus !== 'recent' && sidebarQuickFocus !== 'favorites') {
            sidebarQuickFocus = resolveSidebarQuickFocusFromAudience(homeAudience);
        }
    }
    const box = domCache.sidebarQuick;
    if (!box) return;
    // 业务分类筛选激活时，快捷区不显示选中（互斥）
    const catFilterOn =
        typeof homeCatFilter !== 'undefined' && !!homeCatFilter;
    box.querySelectorAll('.sb-quick-item').forEach((el) => {
        el.classList.toggle(
            'active',
            !catFilterOn && el.dataset.quick === sidebarQuickFocus,
        );
    });
}

/** 仅更新快捷区计数文案 */
function refreshSidebarQuickCounts() {
    const box = domCache.sidebarQuick;
    if (!box) return;
    box.querySelectorAll('.sb-quick-item').forEach((el) => {
        const id = el.dataset.quick;
        const item = SIDEBAR_QUICK_ITEMS.find((x) => x.id === id);
        if (!item) return;
        const count = countSidebarQuickItem(item);
        const countEl = el.querySelector('.sb-quick-count');
        if (countEl) countEl.textContent = String(count);
        el.setAttribute('data-tip', item.name + (count ? '（' + count + '）' : ''));
    });
}

/**
 * 快捷区点击
 * @param {string} quickId
 */
function handleSidebarQuickClick(quickId) {
    const item = SIDEBAR_QUICK_ITEMS.find((x) => x.id === quickId);
    if (!item) return;
    hideSidebarTip();

    if (item.kind === 'all') {
        sidebarQuickFocus = 'all';
        // goHome 会清分类筛选；受众置 all
        if (typeof setHomeAudience === 'function') setHomeAudience('all');
        if (typeof goHome === 'function') goHome();
        else {
            if (typeof clearHomeCatFilter === 'function') clearHomeCatFilter();
            else if (typeof showHome === 'function') showHome();
        }
        syncSidebarQuickActive({focus: 'all'});
        closeMobileSidebar();
        return;
    }

    if (item.kind === 'audience') {
        sidebarQuickFocus = item.id;
        // 快捷与分类互斥：切受众时清掉业务分类筛选
        if (typeof clearHomeCatFilter === 'function') clearHomeCatFilter();
        if (typeof setHomeAudience === 'function') setHomeAudience(item.audience);
        // setHomeAudience 会 filterHomeTools，必要时切回首页
        if (typeof isHomePanelActive === 'function' && !isHomePanelActive()) {
            if (typeof goHome === 'function') {
                // goHome 无参会再清筛选（已空），并 showHome
                goHome();
            } else if (typeof showHome === 'function') {
                showHome();
            }
        } else if (typeof setRouteHome === 'function') {
            // 已在首页：确保路由为首页
            try {
                setRouteHome({replace: true});
            } catch (e) {
                /* ignore */
            }
        }
        syncSidebarQuickActive({focus: item.id});
        closeMobileSidebar();
        return;
    }

    if (item.kind === 'virtual') {
        sidebarQuickFocus = item.id;
        // 回首页并以虚拟筛选展示最近/收藏工具列表（会清业务分类筛选）
        if (typeof showHome === 'function') {
            showHome();
        } else if (typeof goHome === 'function') {
            goHome();
        }
        if (typeof clearHomeSearch === 'function') {
            clearHomeSearch();
        }
        if (typeof setRouteHome === 'function') {
            try {
                setRouteHome({replace: true});
            } catch (e) {
                /* ignore */
            }
        }
        if (typeof setHomeVirtualFilter === 'function') {
            setHomeVirtualFilter(item.cat);
        }
        syncSidebarQuickActive({focus: item.id});
        closeMobileSidebar();
    }
}

function buildSidebarQuick() {
    const box = domCache.sidebarQuick;
    if (!box) return;
    // 初始焦点跟 audience
    if (typeof homeAudience !== 'undefined') {
        if (sidebarQuickFocus !== 'recent' && sidebarQuickFocus !== 'favorites') {
            sidebarQuickFocus = resolveSidebarQuickFocusFromAudience(homeAudience);
        }
    }
    // 业务分类筛选激活时，快捷区不显示选中（与 syncSidebarQuickActive 一致）
    const catFilterOn =
        typeof homeCatFilter !== 'undefined' && !!homeCatFilter;
    let html = '<div class="sb-section-label">快捷</div>';
    SIDEBAR_QUICK_ITEMS.forEach((item, idx) => {
        // 受众段前加分隔线
        if (item.kind === 'audience' && (idx === 0 || SIDEBAR_QUICK_ITEMS[idx - 1].kind !== 'audience')) {
            html += '<div class="sb-quick-divider" role="separator"></div>';
        }
        const count = countSidebarQuickItem(item);
        const tip = item.name + (count ? '（' + count + '）' : '');
        const isActive = !catFilterOn && item.id === sidebarQuickFocus;
        html +=
            '<button type="button" class="sb-quick-item' +
            (isActive ? ' active' : '') +
            '" data-quick="' +
            escapeHtml(item.id) +
            '" data-tip="' +
            escapeHtml(tip) +
            '" style="--sb-quick-color:' +
            escapeHtml(item.color) +
            '">' +
            '<i class="bi ' +
            escapeHtml(item.icon) +
            ' sb-quick-icon" aria-hidden="true"></i>' +
            '<span class="sb-quick-name">' +
            escapeHtml(item.name) +
            '</span>' +
            '<span class="sb-quick-count">' +
            count +
            '</span>' +
            '</button>';
    });
    box.innerHTML = html;

    if (box.dataset.bound !== '1') {
        box.dataset.bound = '1';
        box.addEventListener('click', (e) => {
            const btn = e.target.closest('.sb-quick-item');
            if (!btn || !box.contains(btn)) return;
            e.preventDefault();
            handleSidebarQuickClick(btn.dataset.quick);
        });
    }
}

function clearSidebarCatCurrent(nav) {
    if (!nav) return;
    nav.querySelectorAll('.sb-cat.current').forEach((el) => el.classList.remove('current'));
}

/** 扁平业务分类：点击 → 首页分类筛选 */
function handleSidebarCatClick(catId) {
    if (!catId) return;
    hideSidebarTip();
    const sidebar = domCache.sidebar;
    if (sidebar && sidebar.classList.contains('collapsed')) {
        sidebar.classList.remove('collapsed');
        sidebarCollapsed = false;
        saveSidebarState();
    }
    if (typeof goHome === 'function') {
        // 与首页锚点一致：再点同一分类则清除筛选
        if (typeof homeCatFilter !== 'undefined' && homeCatFilter === catId) {
            goHome();
        } else {
            goHome(catId);
        }
    } else if (typeof setHomeCatFilter === 'function') {
        if (typeof homeCatFilter !== 'undefined' && homeCatFilter === catId) {
            if (typeof clearHomeCatFilter === 'function') clearHomeCatFilter();
        } else {
            setHomeCatFilter(catId);
        }
    }
    closeMobileSidebar();
}

function buildSidebar() {
    readSidebarState();
    buildSidebarQuick();
    const nav = domCache.sidebarNav;
    if (!nav) return;
    nav.innerHTML = '';
    const label = document.createElement('div');
    label.className = 'sb-section-label';
    label.textContent = '分类';
    nav.appendChild(label);
    const bizCats =
        typeof getBusinessCategories === 'function'
            ? getBusinessCategories()
            : (categories || []).filter((c) => c && !c.virtual);
    bizCats.forEach((cat) => {
        const count = countSidebarCatTools(cat.id);
        if (!count) return;
        const wrap = document.createElement('div');
        wrap.className = 'sb-cat cat-' + cat.id;
        wrap.dataset.cat = cat.id;
        const tip = cat.name + '（' + count + '）';
        wrap.innerHTML =
            '<button type="button" class="sb-cat-header" data-cat="' +
            escapeHtml(cat.id) +
            '" data-tip="' +
            escapeHtml(tip) +
            '">' +
            '<i class="bi ' +
            escapeHtml(cat.icon) +
            ' sb-cat-icon" aria-hidden="true"></i>' +
            '<span class="sb-cat-name">' +
            escapeHtml(cat.name) +
            '</span>' +
            '<span class="sb-cat-count">' +
            count +
            '</span>' +
            '</button>';
        nav.appendChild(wrap);
    });

    // 事件只绑定一次，允许重复渲染 HTML
    if (nav.dataset.bound !== '1') {
        nav.dataset.bound = '1';
        nav.addEventListener('click', (e) => {
            const catHeader = e.target.closest('.sb-cat-header');
            if (catHeader && nav.contains(catHeader)) {
                e.preventDefault();
                handleSidebarCatClick(catHeader.dataset.cat);
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
    initMobileSidebar();

    if (typeof syncCatAnchorFilterActive === 'function') {
        syncCatAnchorFilterActive();
    }
    if (sidebarActiveToolId) {
        highlightSidebarTool(sidebarActiveToolId);
    }
}

/** 收藏变更：侧栏不再渲染虚拟分类，仅刷新快捷区计数 */
function refreshSidebarFavorites() {
    refreshSidebarQuickCounts();
}

/** 最近使用变更：仅刷新快捷区计数 */
function refreshSidebarRecent() {
    refreshSidebarQuickCounts();
}

/**
 * 打开工具时高亮所属业务分类（扁平侧栏无工具子项）
 * @param {string} id tool id
 */
function highlightSidebarTool(id) {
    const nav = domCache.sidebarNav;
    if (!nav || !id) return;
    sidebarActiveToolId = id;
    clearSidebarCatCurrent(nav);
    const tool =
        typeof toolsById !== 'undefined' && toolsById.get
            ? toolsById.get(id)
            : null;
    const catId = tool && tool.cat;
    if (!catId) return;
    const catEl = nav.querySelector('.sb-cat[data-cat="' + catId + '"]');
    if (catEl) catEl.classList.add('current');
}

function clearSidebarHighlight() {
    sidebarActiveToolId = null;
    clearSidebarCatCurrent(domCache.sidebarNav);
}

// === 窄屏 Drawer（≤1024px）===
function isMobileSidebarViewport() {
    return typeof window !== 'undefined' && window.matchMedia('(max-width: 1024px)').matches;
}

function openMobileSidebar() {
    if (!isMobileSidebarViewport()) return;
    document.body.classList.add('sidebar-drawer-open');
    const btn = domCache.sidebarMenuBtn;
    const backdrop = domCache.sidebarBackdrop;
    if (btn) btn.setAttribute('aria-expanded', 'true');
    if (backdrop) {
        backdrop.hidden = false;
        backdrop.setAttribute('aria-hidden', 'false');
    }
}

function closeMobileSidebar() {
    document.body.classList.remove('sidebar-drawer-open');
    const btn = domCache.sidebarMenuBtn;
    const backdrop = domCache.sidebarBackdrop;
    if (btn) btn.setAttribute('aria-expanded', 'false');
    if (backdrop) {
        backdrop.hidden = true;
        backdrop.setAttribute('aria-hidden', 'true');
    }
}

function toggleMobileSidebar() {
    if (document.body.classList.contains('sidebar-drawer-open')) {
        closeMobileSidebar();
    } else {
        openMobileSidebar();
    }
}

/** 汉堡菜单 / 遮罩 / Esc / 断点切换（幂等） */
function initMobileSidebar() {
    const btn = domCache.sidebarMenuBtn;
    const backdrop = domCache.sidebarBackdrop;
    if (btn && btn.dataset.bound !== '1') {
        btn.dataset.bound = '1';
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleMobileSidebar();
        });
    }
    if (backdrop && backdrop.dataset.bound !== '1') {
        backdrop.dataset.bound = '1';
        backdrop.addEventListener('click', () => {
            closeMobileSidebar();
        });
    }
    if (!document.body.dataset.sidebarDrawerEscBound) {
        document.body.dataset.sidebarDrawerEscBound = '1';
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.body.classList.contains('sidebar-drawer-open')) {
                closeMobileSidebar();
            }
        });
    }
    if (!window.__sidebarDrawerResizeBound) {
        window.__sidebarDrawerResizeBound = true;
        window.addEventListener('resize', () => {
            if (!isMobileSidebarViewport()) {
                closeMobileSidebar();
            }
        });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        countSidebarCatTools,
        clampSidebarWidth,
        isMobileSidebarViewport,
        openMobileSidebar,
        closeMobileSidebar,
        toggleMobileSidebar,
        countSidebarQuickItem,
        resolveSidebarQuickFocusFromAudience,
        SIDEBAR_QUICK_ITEMS,
        SIDEBAR_KEY,
        SIDEBAR_WIDTH_DEFAULT,
        SIDEBAR_WIDTH_MIN,
        SIDEBAR_WIDTH_MAX,
    };
}
