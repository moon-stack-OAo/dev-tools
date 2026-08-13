// ui-home.js — 首页网格 / 搜索 / 热力 / 虚拟分类 / 收藏与最近（ADR Phase 3）
// 依赖：tools-registry、favorites、domCache、openTool、setRouteHome、setStatus、escapeHtml、debounce

// === Usage Stats ===
const STATS_KEY = "devtools.usage";

function bumpUsage(id) {
    try {
        const raw = localStorage.getItem(STATS_KEY);
        const stats = raw ? JSON.parse(raw) : {};
        stats[id] = (stats[id] || 0) + 1;
        localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch (e) {
    }
}

function getUsageStats() {
    try {
        const raw = localStorage.getItem(STATS_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

function clearUsageStats() {
    try {
        localStorage.removeItem(STATS_KEY);
    } catch (e) {
    }
    if (isHomeCmdPanelOpen()) {
        renderHomeCmdPanel();
    }
}

// === Recent Tools ===
const RECENT_KEY = "devtools.recent";
const RECENT_MAX = 8;

function pushRecent(id) {
    try {
        const raw = localStorage.getItem(RECENT_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        const filtered = arr.filter((e) => e.id !== id);
        filtered.unshift({id: id, ts: Date.now()});
        const truncated = filtered.slice(0, RECENT_MAX);
        localStorage.setItem(RECENT_KEY, JSON.stringify(truncated));
    } catch (e) {
    }
}

function getRecent() {
    try {
        const raw = localStorage.getItem(RECENT_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return arr
            .map((e) =>
                Object.assign({}, e, {tool: toolsById.get(e.id)}),
            )
            .filter((e) => e.tool)
            .slice(0, RECENT_MAX);
    } catch (e) {
        return [];
    }
}

function clearRecent() {
    try {
        localStorage.removeItem(RECENT_KEY);
    } catch (e) {
    }
    refreshRecentBlock();
    refreshSidebarRecent();
    if (isHomeCmdPanelOpen()) {
        renderHomeCmdPanel();
    }
}

// === Favorites（逻辑在 favorites.js，此处负责 UI 接入）===
function getFavoriteTools() {
    if (typeof getFavorites !== "function") return [];
    return getFavorites()
        .map((id) => toolsById.get(id))
        .filter(Boolean);
}

function favStarHtml(id) {
    const fav = typeof isFavorite === "function" && isFavorite(id);
    return (
        '<button type="button" class="fav-star' +
        (fav ? " active" : "") +
        '" data-tool="' +
        escapeHtml(id) +
        '" title="' +
        (fav ? "取消收藏" : "收藏") +
        '" aria-label="' +
        (fav ? "取消收藏" : "收藏") +
        '"><i class="bi ' +
        (fav ? "bi-star-fill" : "bi-star") +
        '"></i></button>'
    );
}

function sbToolHtml(t) {
    const fav = typeof isFavorite === "function" && isFavorite(t.id);
    return (
        '<div class="sb-tool" data-tool="' +
        escapeHtml(t.id) +
        '" data-tip="' +
        escapeHtml(t.name) +
        '"><i class="bi ' +
        t.icon +
        '"></i><span class="sb-tool-name">' +
        escapeHtml(t.name) +
        '</span><i class="bi ' +
        (fav ? "bi-star-fill" : "bi-star") +
        " fav-star" +
        (fav ? " active" : "") +
        '" data-tool="' +
        escapeHtml(t.id) +
        '" title="' +
        (fav ? "取消收藏" : "收藏") +
        '"></i></div>'
    );
}

function syncFavoriteStars(id, isFav) {
    document.querySelectorAll('.fav-star[data-tool="' + id + '"]').forEach((el) => {
        el.classList.toggle("active", isFav);
        el.title = isFav ? "取消收藏" : "收藏";
        if (el.getAttribute("aria-label") != null) {
            el.setAttribute("aria-label", isFav ? "取消收藏" : "收藏");
        }
        const icon = el.tagName === "I" ? el : el.querySelector("i");
        if (!icon) return;
        icon.classList.toggle("bi-star-fill", isFav);
        icon.classList.toggle("bi-star", !isFav);
    });
}

function handleToggleFavorite(id) {
    if (typeof toggleFavorite !== "function" || !id) return;
    const now = toggleFavorite(id);
    syncFavoriteStars(id, now);
    refreshFavoritesBlock();
    refreshSidebarFavorites();
    toast(now ? "已收藏" : "已取消收藏");
}

function clearFavoritesUI() {
    if (typeof clearFavorites === "function") clearFavorites();
    document.querySelectorAll(".fav-star").forEach((el) => {
        el.classList.remove("active");
        el.title = "收藏";
        if (el.getAttribute("aria-label") != null) {
            el.setAttribute("aria-label", "收藏");
        }
        const icon = el.tagName === "I" ? el : el.querySelector("i");
        if (!icon) return;
        icon.classList.remove("bi-star-fill");
        icon.classList.add("bi-star");
    });
    refreshFavoritesBlock();
    refreshSidebarFavorites();
    toast("已清空收藏");
}

function createHomeCard(t, cardCat, ci) {
    const card = document.createElement("div");
    card.className = "home-card cat-" + cardCat;
    card.dataset.cat = cardCat;
    card.dataset.tool = t.id;
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", "打开 " + t.name);
    const tags = t.tags && t.tags.length ? t.tags : ["common"];
    card.dataset.tags = tags.join(",");
    card.style.animationDelay = Math.min(ci, 11) * 0.03 + "s";
    card.innerHTML =
        favStarHtml(t.id) +
        '<div class="hc-icon"><i class="bi ' +
        t.icon +
        '" aria-hidden="true"></i></div><div class="hc-name">' +
        escapeHtml(t.name) +
        '</div><div class="hc-desc">' +
        escapeHtml(t.desc) +
        "</div>";
    card.dataset.name = t.name.toLowerCase();
    card.dataset.desc = t.desc.toLowerCase();
    card.addEventListener("click", () => openTool(t.id));
    card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openTool(t.id);
        }
    });
    const star = card.querySelector(".fav-star");
    if (star) {
        star.addEventListener("click", (e) => {
            e.stopPropagation();
            e.preventDefault();
            handleToggleFavorite(t.id);
        });
    }
    return card;
}

// === 命令面板（Command Palette）===
const HOME_SCENE_SHORTCUTS = [
    {id: "json", label: "JSON 格式化", toolId: "json"},
    {id: "jwt", label: "JWT 解码", toolId: "jwt"},
    {id: "ts", label: "时间戳", toolId: "ts"},
    {id: "base64", label: "Base64", toolId: "base64"},
    {id: "cron", label: "Cron 表达式", toolId: "cron"},
    {id: "uuid", label: "UUID", toolId: "uuid"},
];

/**
 * 构建命令面板分组结果（纯函数，可单测）
 * @param {{ q?: string, tools?: Array, categories?: Array, recent?: Array, usageStats?: Object,
 *   audience?: string, shortcuts?: Array, limits?: Object }} opts
 * @returns {{ groups: Array<{type:string,title:string,items:Array}>, flat: Array }}
 */
function buildCommandPaletteResults(opts) {
    opts = opts || {};
    const q = String(opts.q || "")
        .toLowerCase()
        .trim();
    const toolsList = opts.tools || [];
    const cats = opts.categories || [];
    const recent = opts.recent || [];
    const usageStats = opts.usageStats || {};
    const audience = opts.audience || "all";
    const shortcuts = opts.shortcuts || HOME_SCENE_SHORTCUTS;
    const limits = opts.limits || {};
    const limitRecent = limits.recent != null ? limits.recent : 8;
    const limitUsage = limits.usage != null ? limits.usage : 8;
    const limitTools = limits.tools != null ? limits.tools : 10;
    const limitCats = limits.categories != null ? limits.categories : 8;
    const limitScenes = limits.scenes != null ? limits.scenes : 6;

    const toolsMap = new Map();
    for (let i = 0; i < toolsList.length; i++) {
        const t = toolsList[i];
        if (t && t.id) toolsMap.set(t.id, t);
    }

    const matchAudience =
        typeof toolMatchesAudience === "function"
            ? function (t) {
                  return toolMatchesAudience(t, audience);
              }
            : function () {
                  return true;
              };

    function toolItem(t, kind) {
        return {
            kind: kind || "tool",
            id: t.id,
            name: t.name,
            desc: t.desc,
            icon: t.icon,
            cat: t.cat,
        };
    }

    function toolMatchesQuery(t, query) {
        if (!query) return true;
        const name = String(t.name || "").toLowerCase();
        const desc = String(t.desc || "").toLowerCase();
        const id = String(t.id || "").toLowerCase();
        return name.includes(query) || desc.includes(query) || id.includes(query);
    }

    const groups = [];
    const flat = [];

    function pushGroup(type, title, items) {
        if (!items || !items.length) return;
        groups.push({type: type, title: title, items: items});
        for (let i = 0; i < items.length; i++) {
            flat.push(items[i]);
        }
    }

    if (!q) {
        const recentItems = [];
        const recentIds = new Set();
        for (let i = 0; i < recent.length && recentItems.length < limitRecent; i++) {
            const e = recent[i];
            const tool = e.tool || toolsMap.get(e.id);
            if (!tool || !matchAudience(tool)) continue;
            recentIds.add(tool.id);
            recentItems.push(toolItem(tool, "tool"));
        }
        pushGroup("recent", "最近使用", recentItems);

        const usageItems = Object.keys(usageStats)
            .map(function (id) {
                return {id: id, count: usageStats[id], tool: toolsMap.get(id)};
            })
            .filter(function (e) {
                return e.tool && matchAudience(e.tool) && !recentIds.has(e.id);
            })
            .sort(function (a, b) {
                return b.count - a.count;
            })
            .slice(0, limitUsage)
            .map(function (e) {
                return toolItem(e.tool, "tool");
            });
        pushGroup("usage", "常用工具", usageItems);

        const sceneItems = [];
        for (let i = 0; i < shortcuts.length && sceneItems.length < limitScenes; i++) {
            const sc = shortcuts[i];
            const toolId = sc.toolId || sc.id;
            const tool = toolsMap.get(toolId);
            if (!tool) continue;
            sceneItems.push({
                kind: "shortcut",
                id: tool.id,
                name: sc.label || tool.name,
                desc: tool.desc,
                icon: tool.icon,
                cat: tool.cat,
            });
        }
        pushGroup("scene", "高频场景", sceneItems);
    } else {
        const toolItems = [];
        for (let i = 0; i < toolsList.length && toolItems.length < limitTools; i++) {
            const t = toolsList[i];
            if (!matchAudience(t) || !toolMatchesQuery(t, q)) continue;
            toolItems.push(toolItem(t, "tool"));
        }
        pushGroup("tools", "工具", toolItems);

        const catItems = [];
        for (let i = 0; i < cats.length && catItems.length < limitCats; i++) {
            const c = cats[i];
            if (!c || c.virtual) continue;
            const name = String(c.name || "").toLowerCase();
            const id = String(c.id || "").toLowerCase();
            if (!name.includes(q) && !id.includes(q)) continue;
            catItems.push({
                kind: "category",
                id: c.id,
                name: c.name,
                icon: c.icon,
            });
        }
        pushGroup("categories", "分类", catItems);

        const recentMatch = [];
        const toolIdSet = new Set(
            toolItems.map(function (it) {
                return it.id;
            }),
        );
        for (let i = 0; i < recent.length && recentMatch.length < limitRecent; i++) {
            const e = recent[i];
            const tool = e.tool || toolsMap.get(e.id);
            if (!tool || !matchAudience(tool) || !toolMatchesQuery(tool, q)) continue;
            if (toolIdSet.has(tool.id)) continue;
            recentMatch.push(toolItem(tool, "tool"));
        }
        pushGroup("recent", "最近使用", recentMatch);
    }

    return {groups: groups, flat: flat};
}

let cmdActiveIndex = -1;
let cmdFlatItems = [];

function isHomeCmdPanelOpen() {
    const panel = typeof domCache !== "undefined" ? domCache.homeHeatmap : null;
    return !!(panel && panel.style.display !== "none");
}

function ensureCmdPanelBindings() {
    const panel = typeof domCache !== "undefined" ? domCache.homeHeatmap : null;
    if (!panel || panel.dataset.cmdBound) return;
    panel.dataset.cmdBound = "1";
    panel.classList.add("home-cmd-panel");
    panel.addEventListener("mousedown", function (e) {
        e.preventDefault();
    });
}

function activateCmdItem(idx) {
    const item = cmdFlatItems[idx];
    if (!item) return;
    hideHomeCmdPanel();
    if (item.kind === "tool" || item.kind === "shortcut") {
        if (typeof openTool === "function") openTool(item.id);
    } else if (item.kind === "category") {
        setHomeCatFilter(item.id);
    }
}

function updateCmdActiveUI() {
    const panel = domCache.homeHeatmap;
    if (!panel) return;
    panel.querySelectorAll(".home-cmd-item").forEach(function (el) {
        const idx = parseInt(el.dataset.cmdIdx, 10);
        el.classList.toggle("active", idx === cmdActiveIndex);
    });
    const active = panel.querySelector(".home-cmd-item.active");
    if (active && typeof active.scrollIntoView === "function") {
        active.scrollIntoView({block: "nearest"});
    }
}

function renderHomeCmdPanel() {
    const panel = typeof domCache !== "undefined" ? domCache.homeHeatmap : null;
    if (!panel) return;
    ensureCmdPanelBindings();
    const input = domCache.homeSearch;
    const q = input ? input.value : "";
    const result = buildCommandPaletteResults({
        q: q,
        tools: typeof tools !== "undefined" ? tools : [],
        categories: typeof categories !== "undefined" ? categories : [],
        recent: typeof getRecent === "function" ? getRecent() : [],
        usageStats: typeof getUsageStats === "function" ? getUsageStats() : {},
        audience: typeof homeAudience !== "undefined" ? homeAudience : "all",
        shortcuts: HOME_SCENE_SHORTCUTS,
    });
    cmdFlatItems = result.flat;
    if (cmdActiveIndex >= cmdFlatItems.length) {
        cmdActiveIndex = cmdFlatItems.length - 1;
    }
    if (cmdActiveIndex < -1) cmdActiveIndex = -1;

    if (!result.groups.length) {
        const emptyTip = q
            ? "没有匹配结果"
            : "开始使用工具后，这里会显示最近与常用入口";
        panel.innerHTML =
            '<div class="home-cmd-empty"><i class="bi bi-search"></i>' +
            escapeHtml(emptyTip) +
            "</div>";
        return;
    }

    let html = "";
    let flatIdx = 0;
    result.groups.forEach(function (g) {
        html +=
            '<div class="home-cmd-group"><div class="home-cmd-group-title">' +
            escapeHtml(g.title) +
            "</div>";
        g.items.forEach(function (item) {
            const active = flatIdx === cmdActiveIndex ? " active" : "";
            const catClass = item.cat ? " cat-" + escapeHtml(item.cat) : "";
            const icon = item.icon
                ? '<span class="home-cmd-icon"><i class="bi ' +
                  escapeHtml(item.icon) +
                  '"></i></span>'
                : '<span class="home-cmd-icon"><i class="bi bi-grid"></i></span>';
            const desc = item.desc
                ? '<span class="home-cmd-desc">' + escapeHtml(item.desc) + "</span>"
                : "";
            let badge = "";
            if (item.kind === "category") {
                badge = '<span class="home-cmd-badge">分类</span>';
            } else if (item.kind === "shortcut") {
                badge = '<span class="home-cmd-badge">场景</span>';
            }
            html +=
                '<div class="home-cmd-item' +
                active +
                catClass +
                '" data-cmd-idx="' +
                flatIdx +
                '" data-kind="' +
                escapeHtml(item.kind) +
                '" data-id="' +
                escapeHtml(item.id) +
                '" role="option" aria-selected="' +
                (flatIdx === cmdActiveIndex ? "true" : "false") +
                '">' +
                icon +
                '<span class="home-cmd-text"><span class="home-cmd-name">' +
                escapeHtml(item.name) +
                "</span>" +
                desc +
                "</span>" +
                badge +
                "</div>";
            flatIdx++;
        });
        html += "</div>";
    });
    panel.innerHTML = html;
    panel.querySelectorAll(".home-cmd-item").forEach(function (el) {
        el.addEventListener("click", function () {
            const idx = parseInt(el.dataset.cmdIdx, 10);
            activateCmdItem(idx);
        });
    });
}

function showHomeCmdPanel() {
    renderHomeCmdPanel();
    const panel = typeof domCache !== "undefined" ? domCache.homeHeatmap : null;
    if (panel) panel.style.display = "";
}

function hideHomeCmdPanel() {
    const panel = typeof domCache !== "undefined" ? domCache.homeHeatmap : null;
    if (panel) panel.style.display = "none";
    cmdActiveIndex = -1;
}

/** @deprecated 别名：兼容旧调用 */
function renderHomeHeatmap() {
    renderHomeCmdPanel();
}

function showHomeHeatmap() {
    showHomeCmdPanel();
}

function hideHomeHeatmap() {
    hideHomeCmdPanel();
}

function onHomeSearchKeydown(e) {
    if (e.isComposing) return;
    const panel = domCache.homeHeatmap;
    const open = panel && panel.style.display !== "none";

    if (e.key === "Escape") {
        if (open) {
            e.preventDefault();
            hideHomeCmdPanel();
        }
        return;
    }

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!open) showHomeCmdPanel();
        if (!cmdFlatItems.length) return;
        if (e.key === "ArrowDown") {
            cmdActiveIndex =
                cmdActiveIndex < cmdFlatItems.length - 1 ? cmdActiveIndex + 1 : 0;
        } else {
            cmdActiveIndex =
                cmdActiveIndex > 0 ? cmdActiveIndex - 1 : cmdFlatItems.length - 1;
        }
        updateCmdActiveUI();
        return;
    }

    if (e.key === "Enter") {
        if (open && cmdActiveIndex >= 0 && cmdFlatItems[cmdActiveIndex]) {
            e.preventDefault();
            activateCmdItem(cmdActiveIndex);
        }
    }
}

function initHomeSearchCmdKeys() {
    const input =
        (typeof domCache !== "undefined" && domCache.homeSearch) ||
        (typeof document !== "undefined" ? document.getElementById("homeSearch") : null);
    if (!input || input.dataset.cmdKeysBound) return;
    input.dataset.cmdKeysBound = "1";
    input.addEventListener("keydown", onHomeSearchKeydown);
}

function renderHomeSceneChips() {
    const wrap =
        typeof document !== "undefined" ? document.getElementById("homeSceneChips") : null;
    if (!wrap || typeof toolsById === "undefined") return;
    const parts = [];
    HOME_SCENE_SHORTCUTS.forEach(function (sc) {
        const tool = toolsById.get(sc.toolId || sc.id);
        if (!tool) return;
        parts.push(
            '<button type="button" class="home-scene-chip" data-tool="' +
                escapeHtml(tool.id) +
                '" title="' +
                escapeHtml(tool.desc || sc.label) +
                '"><i class="bi ' +
                escapeHtml(tool.icon) +
                '" aria-hidden="true"></i> ' +
                escapeHtml(sc.label) +
                "</button>",
        );
    });
    wrap.innerHTML = parts.join("");
    wrap.querySelectorAll(".home-scene-chip").forEach(function (btn) {
        btn.addEventListener("click", function () {
            if (typeof openTool === "function") openTool(btn.dataset.tool);
        });
    });
}

let homeCards = [];
let homeDividers = [];

/** 业务分类真筛选（不含 favorites/recent） */
let homeCatFilter = null;

const AUDIENCE_KEY = "devtools.audience";
const VALID_AUDIENCES = { all: 1, common: 1, frontend: 1, backend: 1, java: 1 };
let homeAudience = "all";

const DENSITY_KEY = "devtools.home.density";
const VALID_DENSITIES = { comfortable: 1, compact: 1 };
let homeDensity = "comfortable";

/** 首页分类懒展开：localStorage 存用户展开过的业务分类 id */
const EXPANDED_CATS_KEY = "devtools.home.expandedCats";
/** @type {Set<string>} */
let homeExpandedCats = new Set();
/** 是否已从 localStorage 读到用户偏好（null 键 = 默认仅首个业务类） */
let homeExpandHasStored = false;

function loadHomeExpandedCats() {
    try {
        const raw = localStorage.getItem(EXPANDED_CATS_KEY);
        if (raw === null) {
            homeExpandedCats = new Set();
            homeExpandHasStored = false;
            return;
        }
        homeExpandHasStored = true;
        const arr = JSON.parse(raw);
        homeExpandedCats = new Set(
            Array.isArray(arr) ? arr.filter((id) => typeof id === "string" && id) : [],
        );
    } catch (e) {
        homeExpandedCats = new Set();
        homeExpandHasStored = false;
    }
}

function saveHomeExpandedCats() {
    try {
        homeExpandHasStored = true;
        localStorage.setItem(EXPANDED_CATS_KEY, JSON.stringify(Array.from(homeExpandedCats)));
    } catch (e) {
        /* ignore */
    }
}

/**
 * 是否强制全展开业务分类（搜索 / 受众 / 分类筛选任一生效）
 * @param {{q?: string, audience?: string, catFilter?: string|null}} [opts]
 * @returns {boolean}
 */
function shouldForceExpandAllHomeCats(opts) {
    const o = opts || {};
    const q =
        o.q !== undefined
            ? String(o.q || "").trim()
            : typeof domCache !== "undefined" && domCache.homeSearch
              ? domCache.homeSearch.value.trim()
              : "";
    const audience = o.audience !== undefined ? o.audience : homeAudience;
    const catFilter = o.catFilter !== undefined ? o.catFilter : homeCatFilter;
    return !!(q || (audience && audience !== "all") || catFilter);
}

/** 首个有工具的业务分类 id（非 virtual） */
function getFirstBusinessCatId() {
    if (typeof categories === "undefined" || !categories) return null;
    for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];
        if (!cat || cat.virtual || cat.id === "favorites" || cat.id === "recent") continue;
        if (typeof tools !== "undefined" && tools.some((t) => t.cat === cat.id)) {
            return cat.id;
        }
    }
    return null;
}

/**
 * 业务分类是否处于展开态（不含强制全展开；调用方可再 || force）
 * @param {string} catId
 * @returns {boolean}
 */
function isHomeCatExpanded(catId) {
    if (!catId || catId === "recent" || catId === "favorites") return true;
    if (!homeExpandHasStored) {
        return catId === getFirstBusinessCatId();
    }
    return homeExpandedCats.has(catId);
}

/** 确保业务分类展开并持久化（锚点 / setHomeCatFilter） */
function ensureHomeCatExpanded(catId) {
    if (!catId || catId === "recent" || catId === "favorites") return;
    if (!getBusinessCatById(catId)) return;
    if (!homeExpandHasStored) {
        const first = getFirstBusinessCatId();
        if (first) homeExpandedCats.add(first);
    }
    if (homeExpandedCats.has(catId)) {
        homeExpandHasStored = true;
        return;
    }
    homeExpandedCats.add(catId);
    saveHomeExpandedCats();
}

function toggleHomeCatExpand(catId) {
    if (!catId || catId === "recent" || catId === "favorites") return;
    if (!getBusinessCatById(catId)) return;
    if (shouldForceExpandAllHomeCats()) return;
    if (!homeExpandHasStored) {
        const first = getFirstBusinessCatId();
        if (first) homeExpandedCats.add(first);
        homeExpandHasStored = true;
    }
    var willExpand = !homeExpandedCats.has(catId);
    if (willExpand) {
        homeExpandedCats.add(catId);
    } else {
        homeExpandedCats.delete(catId);
    }
    saveHomeExpandedCats();
    filterHomeTools();
    // 展开后滚到该分类标题，避免列表变长后当前视口仍停在别处
    if (willExpand) {
        scrollHomeCatIntoView(catId);
    }
}

/** 将首页分类 divider 滚入可视区域（panel-home 为滚动容器） */
function scrollHomeCatIntoView(catId) {
    if (!catId) return;
    var el = document.getElementById("cat-" + catId);
    if (!el) return;
    try {
        el.scrollIntoView({behavior: "smooth", block: "start"});
    } catch (e) {
        el.scrollIntoView(true);
    }
}

function applyHomeCatExpandState() {
    const force = shouldForceExpandAllHomeCats();
    homeDividers.forEach((d) => {
        const catId = d.dataset.cat || d.id.replace("cat-", "");
        if (catId === "recent" || catId === "favorites") {
            d.classList.remove("collapsed");
            d.setAttribute("aria-expanded", "true");
            return;
        }
        const expanded = force || isHomeCatExpanded(catId);
        d.classList.toggle("collapsed", !expanded);
        d.setAttribute("aria-expanded", expanded ? "true" : "false");
        if (!d.dataset.expandBound) {
            d.dataset.expandBound = "1";
            d.setAttribute("role", "button");
            d.setAttribute("tabindex", "0");
            d.addEventListener("click", (e) => {
                if (shouldForceExpandAllHomeCats()) return;
                e.preventDefault();
                const id = d.dataset.cat || d.id.replace("cat-", "");
                toggleHomeCatExpand(id);
            });
            d.addEventListener("keydown", (e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                if (shouldForceExpandAllHomeCats()) return;
                e.preventDefault();
                const id = d.dataset.cat || d.id.replace("cat-", "");
                toggleHomeCatExpand(id);
            });
        }
        const chev = d.querySelector(".hcd-chevron");
        if (chev) {
            chev.classList.toggle("bi-chevron-down", expanded);
            chev.classList.toggle("bi-chevron-right", !expanded);
        }
    });
}

loadHomeExpandedCats();

/**
 * 规范化首页密度模式
 * @param {*} v
 * @returns {'comfortable'|'compact'}
 */
function normalizeHomeDensity(v) {
    if (v === "compact" || v === "comfortable") return v;
    return "comfortable";
}

function getHomeDensity() {
    return homeDensity;
}

function setHomeDensity(v) {
    homeDensity = normalizeHomeDensity(v);
    try {
        localStorage.setItem(DENSITY_KEY, homeDensity);
    } catch (e) {
        /* ignore */
    }
    applyHomeDensity();
    syncHomeDensityUI();
}

function applyHomeDensity() {
    const density = normalizeHomeDensity(homeDensity);
    homeDensity = density;
    const panel =
        (typeof domCache !== "undefined" && domCache.panelHome) ||
        document.getElementById("panel-home");
    if (panel) {
        panel.setAttribute("data-home-density", density);
    }
    const app = document.getElementById("app");
    if (app) {
        app.setAttribute("data-home-density", density);
    }
}

function syncHomeDensityUI() {
    const density = normalizeHomeDensity(homeDensity);
    document.querySelectorAll(".home-density-btn").forEach((btn) => {
        const val = btn.dataset.density;
        const pressed = val === density;
        btn.classList.toggle("active", pressed);
        btn.setAttribute("aria-pressed", pressed ? "true" : "false");
    });
}

function initHomeDensity() {
    try {
        homeDensity = normalizeHomeDensity(localStorage.getItem(DENSITY_KEY));
    } catch (e) {
        homeDensity = "comfortable";
    }
    applyHomeDensity();
    syncHomeDensityUI();
    const group = document.getElementById("homeDensityToggle");
    if (group && !group.dataset.bound) {
        group.dataset.bound = "1";
        group.querySelectorAll(".home-density-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                setHomeDensity(btn.dataset.density);
            });
        });
    }
}

(function loadHomeAudience() {
    try {
        const saved = localStorage.getItem(AUDIENCE_KEY);
        if (saved && VALID_AUDIENCES[saved]) {
            homeAudience = saved;
        }
    } catch (e) {
    }
})();

function cardMatchesAudience(card) {
    if (!homeAudience || homeAudience === "all") return true;
    const tool = toolsById.get(card.dataset.tool);
    if (typeof toolMatchesAudience === "function" && tool) {
        return toolMatchesAudience(tool, homeAudience);
    }
    const tags = (card.dataset.tags || "common").split(",").filter(Boolean);
    if (homeAudience === "frontend") return tags.indexOf("frontend") >= 0;
    if (homeAudience === "backend") return tags.indexOf("backend") >= 0;
    if (homeAudience === "java") return tags.indexOf("java") >= 0;
    if (homeAudience === "common") return tags.indexOf("common") >= 0;
    return true;
}

function setHomeAudience(audience) {
    if (!VALID_AUDIENCES[audience]) {
        audience = "all";
    }
    homeAudience = audience;
    try {
        localStorage.setItem(AUDIENCE_KEY, audience);
    } catch (e) {
    }
    syncHomeAudienceBar();
    if (typeof syncSidebarQuickActive === "function") {
        syncSidebarQuickActive({audience: homeAudience});
    }
    filterHomeTools();
    if (isHomeCmdPanelOpen()) {
        renderHomeCmdPanel();
    }
}

function getBusinessCatById(catId) {
    if (!catId || typeof categories === "undefined") return null;
    const cat = categories.find(function (c) {
        return c.id === catId;
    });
    if (!cat || cat.virtual) return null;
    return cat;
}

function updateHomeCatFilterChip() {
    const chip = document.getElementById("homeCatFilterChip");
    if (!chip) return;
    const cat = getBusinessCatById(homeCatFilter);
    if (!cat) {
        chip.hidden = true;
        chip.innerHTML = "";
        return;
    }
    chip.hidden = false;
    chip.innerHTML =
        '<span class="home-cat-filter-label"><i class="bi ' +
        escapeHtml(cat.icon) +
        '" aria-hidden="true"></i> ' +
        escapeHtml(cat.name) +
        '</span><button type="button" class="home-cat-filter-clear" title="清除分类筛选" aria-label="清除分类筛选" onclick="clearHomeCatFilter()"><i class="bi bi-x" aria-hidden="true"></i></button>';
}

function syncCatAnchorFilterActive() {
    const anchors = document.querySelectorAll(".cat-anchor");
    anchors.forEach(function (a) {
        const href = a.getAttribute("href") || "";
        const id = href.replace("#cat-", "");
        const isBiz = !!getBusinessCatById(id);
        if (homeCatFilter) {
            a.classList.toggle("active", isBiz && id === homeCatFilter);
            a.classList.toggle("filter-active", isBiz && id === homeCatFilter);
        } else {
            a.classList.remove("filter-active");
        }
    });
    if (typeof document !== "undefined") {
        document.querySelectorAll(".sb-cat").forEach(function (el) {
            const id = el.dataset.cat;
            el.classList.toggle(
                "filter-active",
                !!(homeCatFilter && id === homeCatFilter),
            );
        });
    }
}

function setHomeCatFilter(catId) {
    const cat = getBusinessCatById(catId);
    homeCatFilter = cat ? cat.id : null;
    if (homeCatFilter) {
        ensureHomeCatExpanded(homeCatFilter);
    }
    updateHomeCatFilterChip();
    syncCatAnchorFilterActive();
    filterHomeTools();
    const homePanel = typeof domCache !== "undefined" ? domCache.panelHome : null;
    if (homePanel) {
        homePanel.scrollTop = 0;
    }
}

function clearHomeCatFilter() {
    if (!homeCatFilter) return;
    homeCatFilter = null;
    updateHomeCatFilterChip();
    syncCatAnchorFilterActive();
    filterHomeTools();
}

function onCatAnchorClick(e, catId) {
    e.preventDefault();
    if (!getBusinessCatById(catId)) {
        // 虚拟分类：保留滚动定位
        if (catId === "recent") {
            ensureHomeCatExpanded("recent");
        }
        const el = document.getElementById("cat-" + catId);
        if (el) el.scrollIntoView({behavior: "smooth", block: "start"});
        return;
    }
    ensureHomeCatExpanded(catId);
    if (homeCatFilter === catId) {
        clearHomeCatFilter();
    } else {
        setHomeCatFilter(catId);
    }
}

function syncHomeAudienceBar() {
    const bar = document.getElementById("homeAudienceBar");
    if (!bar) return;
    bar.querySelectorAll(".home-audience-btn").forEach((btn) => {
        const selected = btn.dataset.audience === homeAudience;
        btn.classList.toggle("active", selected);
        btn.setAttribute("role", "tab");
        btn.setAttribute("aria-selected", selected ? "true" : "false");
        btn.setAttribute("tabindex", selected ? "0" : "-1");
    });
}

function initHomeAudienceTabs() {
    const bar = document.getElementById("homeAudienceBar");
    if (!bar || bar.dataset.bound) return;
    bar.dataset.bound = "1";
    bar.querySelectorAll(".home-audience-btn").forEach((btn) => {
        btn.setAttribute("role", "tab");
    });
    bar.addEventListener("keydown", (e) => {
        const tabs = Array.from(bar.querySelectorAll(".home-audience-btn"));
        if (!tabs.length) return;
        const current = document.activeElement;
        let idx = tabs.indexOf(current);
        if (idx < 0) {
            idx = tabs.findIndex((t) => t.dataset.audience === homeAudience);
        }
        if (idx < 0) idx = 0;
        let next = -1;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
            next = (idx + 1) % tabs.length;
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
            next = (idx - 1 + tabs.length) % tabs.length;
        } else if (e.key === "Home") {
            next = 0;
        } else if (e.key === "End") {
            next = tabs.length - 1;
        } else {
            return;
        }
        e.preventDefault();
        const target = tabs[next];
        if (!target) return;
        setHomeAudience(target.dataset.audience);
        target.focus();
    });
    syncHomeAudienceBar();
}

/** 顶栏副标题：工具数 / 分类数取自注册表，避免 HTML 写死 */
function updateHeaderHomeSub() {
    var el = document.getElementById('headerHomeSub');
    if (!el) return;
    if (typeof formatHomeSubtitle === 'function') {
        el.textContent = formatHomeSubtitle();
    } else if (typeof getRegistryStats === 'function') {
        var s = getRegistryStats();
        el.textContent =
            s.toolCount + ' 个工具 · ' + s.categoryCount + ' 大分类 · 全栈可用 · 纯前端本地处理';
    }
}

// === 首页 Hero ===
const HERO_DISMISS_KEY = 'devtools.hero.dismissed';

function getHomeHeroStats() {
    if (typeof getRegistryStats === 'function') {
        return getRegistryStats();
    }
    return {
        toolCount: typeof tools !== 'undefined' ? tools.length : 0,
        categoryCount: typeof getBusinessCategories === 'function' ? getBusinessCategories().length : 0,
    };
}

function updateHomeHeroStats() {
    const s = getHomeHeroStats();
    const toolsEl = document.getElementById('homeHeroStatTools');
    const catsEl = document.getElementById('homeHeroStatCats');
    if (toolsEl) toolsEl.textContent = s.toolCount + ' 工具';
    if (catsEl) catsEl.textContent = s.categoryCount + ' 分类';
}

function isHomeHeroDismissed() {
    try {
        return localStorage.getItem(HERO_DISMISS_KEY) === '1';
    } catch (e) {
        return false;
    }
}

function applyHomeHeroVisibility() {
    const hero = document.getElementById('homeHero');
    const restore = document.getElementById('homeHeroRestore');
    const dismissed = isHomeHeroDismissed();
    if (hero) {
        hero.hidden = dismissed;
        hero.setAttribute('aria-hidden', dismissed ? 'true' : 'false');
    }
    if (restore) {
        restore.hidden = !dismissed;
        restore.setAttribute('aria-hidden', dismissed ? 'false' : 'true');
    }
}

function dismissHomeHero() {
    try {
        localStorage.setItem(HERO_DISMISS_KEY, '1');
    } catch (e) {
        /* ignore */
    }
    applyHomeHeroVisibility();
}

function restoreHomeHero() {
    try {
        localStorage.removeItem(HERO_DISMISS_KEY);
    } catch (e) {
        /* ignore */
    }
    applyHomeHeroVisibility();
}

function focusHomeSearchFromHero() {
    const input = (typeof domCache !== 'undefined' && domCache.homeSearch) || document.getElementById('homeSearch');
    if (input) {
        input.focus();
        input.select();
    }
    if (typeof showHomeCmdPanel === 'function') showHomeCmdPanel();
}

function initHomeHero() {
    applyHomeHeroVisibility();
    updateHomeHeroStats();
    const cta = document.getElementById('homeHeroFocusSearch');
    if (cta && !cta.dataset.bound) {
        cta.dataset.bound = '1';
        cta.addEventListener('click', focusHomeSearchFromHero);
    }
    const dismissBtn = document.getElementById('homeHeroDismiss');
    if (dismissBtn && !dismissBtn.dataset.bound) {
        dismissBtn.dataset.bound = '1';
        dismissBtn.addEventListener('click', dismissHomeHero);
    }
    const restoreBtn = document.getElementById('homeHeroRestore');
    if (restoreBtn && !restoreBtn.dataset.bound) {
        restoreBtn.dataset.bound = '1';
        restoreBtn.addEventListener('click', restoreHomeHero);
    }
}

function buildHomeGrid() {
    updateHeaderHomeSub();
    initHomeHero();
    initHomeDensity();
    initHomeAudienceTabs();
    initHomeSearchCmdKeys();
    renderHomeSceneChips();
    const grid = domCache.homeGrid;
    grid.innerHTML = "";
    const anchors = domCache.homeCatAnchors;
    anchors.innerHTML = "";
    categories.forEach((cat) => {
        // 收藏走独立区块，不在网格与锚点中渲染（避免双份）
        if (cat.id === "favorites") return;
        let toolsInCat;
        if (cat.id === "recent") {
            toolsInCat = getRecent().map((e) => e.tool);
            if (!toolsInCat.length) return;
        } else {
            toolsInCat = tools.filter((t) => t.cat === cat.id);
            if (!toolsInCat.length) return;
        }
        const divider = document.createElement("h2");
        divider.className = "home-cat-divider cat-" + cat.id;
        divider.id = "cat-" + cat.id;
        divider.dataset.cat = cat.id;
        const isBiz = cat.id !== "recent" && cat.id !== "favorites" && !cat.virtual;
        const chevron = isBiz
            ? '<i class="bi bi-chevron-down hcd-chevron" aria-hidden="true"></i>'
            : "";
        divider.innerHTML =
            chevron +
            '<span class="hcd-icon"><i class="bi ' +
            cat.icon +
            '"></i></span><span class="hcd-name">' +
            escapeHtml(cat.name) +
            "</span>";
        if (isBiz) {
            divider.setAttribute("aria-expanded", "true");
            divider.title = "展开 / 折叠分类";
        }
        grid.appendChild(divider);
        toolsInCat.forEach((t, ci) => {
            const cardCat = cat.id === "recent" ? cat.id : t.cat;
            grid.appendChild(createHomeCard(t, cardCat, ci));
        });
        const anchor = document.createElement("a");
        anchor.className = "cat-anchor";
        anchor.href = "#cat-" + cat.id;
        anchor.dataset.cat = cat.id;
        anchor.innerHTML =
            '<span class="cat-icon"><i class="bi ' +
            cat.icon +
            '"></i></span>' +
            escapeHtml(cat.name);
        anchor.addEventListener("click", function (e) {
            onCatAnchorClick(e, cat.id);
        });
        anchors.appendChild(anchor);
    });

    homeCards = Array.from(grid.querySelectorAll(".home-card"));
    homeDividers = Array.from(grid.querySelectorAll(".home-cat-divider"));

    // 滚动高亮当前分类
    const homePanel = domCache.panelHome;
    homePanel.addEventListener("scroll", debounce(highlightAnchor, 50));

    refreshFavoritesBlock();
    syncHomeAudienceBar();
    updateHomeCatFilterChip();
    initHomeBottomNav();
    // 懒展开 + 筛选统一走 filterHomeTools（内部 applyHomeCatExpandState）
    filterHomeTools();
}

// 重绘首页虚拟分类块（收藏 / 最近使用），保持收藏在最近使用之前
function refreshVirtualHomeBlock(catId, items, icon, name) {
    const grid = domCache.homeGrid;
    const anchorsBox = domCache.homeCatAnchors;
    if (!grid || !anchorsBox) return;
    const oldDivider = document.getElementById("cat-" + catId);
    const oldAnchor = anchorsBox.querySelector(
        '.cat-anchor[href="#cat-' + catId + '"]',
    );

    grid
        .querySelectorAll('.home-card[data-cat="' + catId + '"]')
        .forEach((c) => c.remove());

    if (!items.length) {
        if (oldDivider) oldDivider.remove();
        if (oldAnchor) oldAnchor.remove();
    } else {
        let divider = oldDivider;
        if (!divider) {
            divider = document.createElement("h2");
            divider.className = "home-cat-divider cat-" + catId;
            divider.id = "cat-" + catId;
            divider.dataset.cat = catId;
            divider.innerHTML =
                '<span class="hcd-icon"><i class="bi ' +
                icon +
                '"></i></span><span class="hcd-name">' +
                escapeHtml(name) +
                "</span>";
            // 插入顺序：收藏在最近使用之前；最近使用在其余分类之前
            const favDivider = document.getElementById("cat-favorites");
            if (catId === "favorites") {
                grid.insertBefore(divider, grid.firstChild);
            } else if (favDivider) {
                let last = favDivider;
                let n = favDivider.nextElementSibling;
                while (
                    n &&
                    n.classList.contains("home-card") &&
                    n.dataset.cat === "favorites"
                    ) {
                    last = n;
                    n = n.nextElementSibling;
                }
                last.after(divider);
            } else {
                grid.insertBefore(divider, grid.firstChild);
            }
        }
        let anchor = oldAnchor;
        if (!anchor) {
            anchor = document.createElement("a");
            anchor.className = "cat-anchor";
            anchor.href = "#cat-" + catId;
            anchor.dataset.cat = catId;
            anchor.innerHTML =
                '<span class="cat-icon"><i class="bi ' +
                icon +
                '"></i></span>' +
                escapeHtml(name);
            anchor.addEventListener("click", function (e) {
                onCatAnchorClick(e, catId);
            });
            const favAnchor = anchorsBox.querySelector(
                '.cat-anchor[href="#cat-favorites"]',
            );
            if (catId === "favorites") {
                anchorsBox.insertBefore(anchor, anchorsBox.firstChild);
            } else if (favAnchor) {
                favAnchor.after(anchor);
            } else {
                anchorsBox.insertBefore(anchor, anchorsBox.firstChild);
            }
        }
        let prev = divider;
        items.forEach((t, ci) => {
            const card = createHomeCard(t, catId, ci);
            prev.after(card);
            prev = card;
        });
    }

    homeCards = Array.from(grid.querySelectorAll(".home-card"));
    homeDividers = Array.from(grid.querySelectorAll(".home-cat-divider"));
    filterHomeTools();
}

function refreshFavoritesBlock() {
    const section = document.getElementById("homeFavoritesSection");
    const grid = document.getElementById("homeFavoritesGrid");
    const empty = document.getElementById("homeFavoritesEmpty");
    if (!section || !grid || !empty) return;

    // 若网格里仍残留旧版收藏块，一并清掉（兼容热更新 / 历史 DOM）
    const homeGrid = domCache.homeGrid;
    if (homeGrid) {
        const oldDivider = document.getElementById("cat-favorites");
        if (oldDivider) oldDivider.remove();
        homeGrid
            .querySelectorAll('.home-card[data-cat="favorites"]')
            .forEach((c) => c.remove());
        const anchorsBox = domCache.homeCatAnchors;
        if (anchorsBox) {
            const oldAnchor = anchorsBox.querySelector('.cat-anchor[href="#cat-favorites"]');
            if (oldAnchor) oldAnchor.remove();
        }
        homeCards = Array.from(homeGrid.querySelectorAll(".home-card"));
        homeDividers = Array.from(homeGrid.querySelectorAll(".home-cat-divider"));
    }

    const items = getFavoriteTools();
    grid.innerHTML = "";
    if (!items.length) {
        empty.hidden = false;
        return;
    }
    empty.hidden = true;
    items.forEach((t, ci) => {
        grid.appendChild(createHomeCard(t, "favorites", ci));
    });
}

function refreshRecentBlock() {
    const cat = categories.find((c) => c.id === "recent");
    refreshVirtualHomeBlock(
        "recent",
        getRecent().map((e) => e.tool),
        cat ? cat.icon : "bi-clock-history",
        cat ? cat.name : "最近使用",
    );
}

function highlightAnchor() {
    const homePanel = domCache.panelHome;
    const dividers = document.querySelectorAll(".home-cat-divider");
    const anchors = document.querySelectorAll(".cat-anchor");
    const scrollTop = homePanel.scrollTop;
    // 分类真筛选时 active 由 filter 状态驱动，不跟滚动抢
    if (!homeCatFilter) {
        const threshold = scrollTop + homePanel.clientHeight * 0.25;
        let activeIdx = 0;
        for (let i = dividers.length - 1; i >= 0; i--) {
            if (dividers[i].offsetTop <= threshold) {
                activeIdx = i;
                break;
            }
        }
        anchors.forEach((a, i) => a.classList.toggle("active", i === activeIdx));
    }
    // 返回顶部按钮显隐
    const btt = domCache.backToTop;
    if (btt) btt.classList.toggle("visible", scrollTop > 300);
}

function showHome() {
    document
        .querySelectorAll(".tool-panel.active")
        .forEach((p) => p.classList.remove("active"));
    domCache.panelHome.classList.add("active");
    const homeTitle = domCache.headerHomeTitle;
    if (homeTitle) homeTitle.style.display = "";
    const gh = domCache.headerGithub;
    if (gh) gh.style.display = "";
    domCache.homeBtn.style.display = "none";
    domCache.mainHeader.classList.remove("tool-mode");
    domCache.breadcrumb.innerHTML = "";
    clearSidebarHighlight();
    if (typeof closeMobileSidebar === 'function') closeMobileSidebar();
    try {
        document.title = "CodeDeck · 码台 — 纯前端开发者工具箱";
    } catch (e) {
        /* ignore */
    }
    setStatus("就绪");
    syncHomeBottomNav();
}

// === 移动端底栏导航（≤1024px）===
function isHomePanelActive() {
    const panel =
        (typeof domCache !== "undefined" && domCache.panelHome) ||
        document.getElementById("panel-home");
    return !!(panel && panel.classList.contains("active"));
}

function syncHomeBottomNav() {
    const nav = document.getElementById("homeBottomNav");
    if (!nav) return;
    const onHome = isHomePanelActive();
    nav.querySelectorAll(".home-bottom-nav-btn").forEach((btn) => {
        const key = btn.dataset.nav;
        const current = onHome && key === "home";
        btn.classList.toggle("active", current);
        if (current) {
            btn.setAttribute("aria-current", "page");
        } else {
            btn.removeAttribute("aria-current");
        }
    });
}

function handleHomeBottomNav(action) {
    if (action === "home") {
        if (typeof goHome === "function") {
            goHome();
        } else {
            showHome();
        }
        const homePanel = typeof domCache !== "undefined" ? domCache.panelHome : null;
        if (homePanel) homePanel.scrollTop = 0;
        syncHomeBottomNav();
        return;
    }
    if (action === "cats") {
        if (typeof isMobileSidebarViewport === "function" && isMobileSidebarViewport() &&
            typeof openMobileSidebar === "function") {
            openMobileSidebar();
        } else {
            showHome();
            const anchors = document.getElementById("homeCatAnchors");
            if (anchors) {
                anchors.scrollIntoView({behavior: "smooth", block: "start"});
            }
        }
        syncHomeBottomNav();
        return;
    }
    if (action === "search") {
        if (!isHomePanelActive()) {
            showHome();
            if (typeof setRouteHome === "function") {
                setRouteHome({replace: true});
            }
        }
        const input =
            (typeof domCache !== "undefined" && domCache.homeSearch) ||
            document.getElementById("homeSearch");
        if (input) {
            input.focus();
            input.select();
        }
        if (typeof showHomeCmdPanel === "function") showHomeCmdPanel();
        syncHomeBottomNav();
        return;
    }
    if (action === "fav") {
        if (!isHomePanelActive()) {
            showHome();
            if (typeof setRouteHome === "function") {
                setRouteHome({replace: true});
            }
        }
        const sec = document.getElementById("homeFavoritesSection");
        if (sec) {
            sec.scrollIntoView({behavior: "smooth", block: "start"});
        }
        syncHomeBottomNav();
    }
}

/** 幂等绑定移动端底栏 */
function initHomeBottomNav() {
    const nav = document.getElementById("homeBottomNav");
    if (!nav) return;
    if (nav.dataset.bound !== "1") {
        nav.dataset.bound = "1";
        nav.addEventListener("click", (e) => {
            const btn = e.target.closest(".home-bottom-nav-btn");
            if (!btn || !nav.contains(btn)) return;
            const action = btn.dataset.nav;
            if (!action) return;
            e.preventDefault();
            handleHomeBottomNav(action);
        });
    }
    const panelHome =
        (typeof domCache !== "undefined" && domCache.panelHome) ||
        document.getElementById("panel-home");
    if (panelHome && panelHome.dataset.bottomNavMo !== "1") {
        panelHome.dataset.bottomNavMo = "1";
        if (typeof MutationObserver !== "undefined") {
            const mo = new MutationObserver(function () {
                syncHomeBottomNav();
            });
            mo.observe(panelHome, {attributes: true, attributeFilter: ["class"]});
        }
    }
    syncHomeBottomNav();
}

function goHome(catId) {
    showHome();
    clearHomeSearch();
    if (domCache.backToTop) domCache.backToTop.classList.remove("visible");
    // 首页按钮：替换当前历史项，避免再堆一层；浏览器「后退」从工具页仍回到首页
    setRouteHome({replace: true});
    if (catId) {
        setHomeCatFilter(catId);
    } else {
        clearHomeCatFilter();
    }
    setTimeout(() => {
        if (domCache.panelHome) domCache.panelHome.scrollTop = 0;
        highlightAnchor();
        syncCatAnchorFilterActive();
    }, 50);
}

function filterHomeTools() {
    const q = domCache.homeSearch ? domCache.homeSearch.value.toLowerCase().trim() : "";
    const forceExpand = shouldForceExpandAllHomeCats({q: q, audience: homeAudience, catFilter: homeCatFilter});

    // 如果当前不在首页，自动切回首页再搜索
    const homePanel = domCache.panelHome;
    if (homePanel && !homePanel.classList.contains("active")) {
        showHome();
        setRouteHome({replace: true});
        setTimeout(highlightAnchor, 50);
    }

    /** 筛选命中但可能因折叠隐藏的分类（用于 divider 仍显示以便展开） */
    const filterMatchedCats = new Set();
    homeCards.forEach((card) => {
        const name = card.dataset.name || "";
        const desc = card.dataset.desc || "";
        const textMatch = !q || name.includes(q) || desc.includes(q);
        const audienceMatch = cardMatchesAudience(card);
        const cardCat = card.dataset.cat || "";
        // 业务分类筛选时隐藏 recent 虚拟卡片
        let catMatch = true;
        if (homeCatFilter) {
            if (cardCat === "recent") {
                catMatch = false;
            } else {
                catMatch = cardCat === homeCatFilter;
            }
        }
        const filterMatch = textMatch && audienceMatch && catMatch;
        const expandMatch =
            forceExpand ||
            cardCat === "recent" ||
            cardCat === "favorites" ||
            isHomeCatExpanded(cardCat);
        const match = filterMatch && expandMatch;
        card.style.display = match ? "" : "none";
        if (filterMatch) {
            filterMatchedCats.add(cardCat);
        }
    });
    homeDividers.forEach((d) => {
        const catId = d.dataset.cat || d.id.replace("cat-", "");
        // 有筛选命中则显示 divider（折叠时仍可点开）；无命中则隐藏
        d.style.display = filterMatchedCats.has(catId) ? "" : "none";
    });
    applyHomeCatExpandState();
    const empty = document.querySelector(".home-search-empty");
    if (empty) empty.remove();
    // 空态：仅在「筛选后无任何命中」时提示；折叠导致看不见不算空
    if (!filterMatchedCats.size) {
        const msg = document.createElement("div");
        msg.className = "home-search-empty";
        let tip;
        if (q) {
            tip = '<i class="bi bi-search"></i> 没有匹配的工具';
        } else if (homeCatFilter) {
            tip = '<i class="bi bi-funnel"></i> 当前筛选下没有工具';
        } else {
            tip = '<i class="bi bi-funnel"></i> 当前受众下没有工具';
        }
        msg.innerHTML = tip;
        if (domCache.homeGrid) domCache.homeGrid.appendChild(msg);
    }
    syncCatAnchorFilterActive();
    syncHomeBottomNav();
}

function clearHomeSearch() {
    const input = domCache.homeSearch;
    if (input) input.value = "";
    hideHomeCmdPanel();
    // 仅清除搜索词并重算可见性，不重置 audience / catFilter
    if (homeCards.length) filterHomeTools();
}

function handleHomeSearchInput() {
    cmdActiveIndex = -1;
    filterHomeTools();
    const input = domCache.homeSearch;
    const focused = input && document.activeElement === input;
    if (focused || isHomeCmdPanelOpen()) {
        showHomeCmdPanel();
    }
}

const onHomeSearchInput =
    typeof debounce === "function"
        ? debounce(handleHomeSearchInput, 80)
        : handleHomeSearchInput;

// 全局搜索快捷键：Ctrl/Cmd+K 或单独按 / 聚焦搜索框（焦点在可编辑区域时不拦截）
if (typeof window !== "undefined") {
    window.addEventListener("keydown", (e) => {
        const target = e.target;
        const inEditable =
            target &&
            (target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.tagName === "SELECT" ||
                target.isContentEditable);
        const isSearchShortcut =
            (e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K");
        const isSlashShortcut = !(e.ctrlKey || e.metaKey || e.altKey) && e.key === "/";
        if ((!isSearchShortcut && !isSlashShortcut) || inEditable) return;
        e.preventDefault();
        const input = domCache.homeSearch || document.getElementById("homeSearch");
        if (input) {
            input.focus();
            input.select();
        }
        showHomeCmdPanel();
    });
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        buildCommandPaletteResults,
        HOME_SCENE_SHORTCUTS,
        normalizeHomeDensity,
        shouldForceExpandAllHomeCats,
    };
}
