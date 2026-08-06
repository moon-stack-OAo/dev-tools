// ui-sidebar.js — 侧边栏构建与高亮（ADR Phase 3）
// 依赖：tools-registry、favorites UI helpers、domCache、openTool、escapeHtml

// === Sidebar ===
const SIDEBAR_KEY = "devtools_sidebar";
let sidebarCollapsed = false;

function readSidebarState() {
    try {
        const s = JSON.parse(localStorage.getItem(SIDEBAR_KEY) || "{}");
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

function buildSidebar() {
    readSidebarState();
    const nav = domCache.sidebarNav;
    if (!nav) return;
    nav.innerHTML = "";
    categories.forEach((cat) => {
        let toolsInCat;
        if (cat.id === "favorites") {
            toolsInCat = getFavoriteTools();
        } else if (cat.id === "recent") {
            toolsInCat = getRecent().map((e) => e.tool);
        } else {
            toolsInCat = tools.filter((t) => t.cat === cat.id);
        }
        if (!toolsInCat.length) return;
        const wrap = document.createElement("div");
        wrap.className = "sb-cat cat-" + cat.id;
        wrap.dataset.cat = cat.id;
        let clearBtn = "";
        if (cat.id === "recent") {
            clearBtn =
                '<i class="bi bi-x-circle sb-cat-clear" title="清空最近使用" onclick="event.stopPropagation();clearRecent()"></i>';
        } else if (cat.id === "favorites") {
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
                ${toolsInCat.map((t) => sbToolHtml(t)).join("")}
            </div>
        `;
        nav.appendChild(wrap);
    });

    nav.addEventListener("click", (e) => {
        const favEl = e.target.closest(".fav-star");
        if (favEl) {
            e.stopPropagation();
            e.preventDefault();
            handleToggleFavorite(favEl.dataset.tool);
            return;
        }
        const catHeader = e.target.closest(".sb-cat-header");
        if (catHeader) {
            const catEl = catHeader.parentElement;
            const sidebar = domCache.sidebar;
            if (sidebar.classList.contains("collapsed")) {
                sidebar.classList.remove("collapsed");
                sidebarCollapsed = false;
                saveSidebarState();
                document
                    .querySelectorAll(".sb-cat.expanded")
                    .forEach((el) => el.classList.remove("expanded"));
                catEl.classList.add("expanded");
            } else {
                catEl.classList.toggle("expanded");
            }
            return;
        }
        const toolEl = e.target.closest(".sb-tool");
        if (toolEl) {
            openTool(toolEl.dataset.tool);
        }
    });

    domCache.sidebarToggle.addEventListener("click", () => {
        sidebarCollapsed = !sidebarCollapsed;
        domCache.sidebar
            .classList.toggle("collapsed", sidebarCollapsed);
        saveSidebarState();
    });

    if (sidebarCollapsed) {
        domCache.sidebar.classList.add("collapsed");
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
    if (!toolsInCat.length) return;
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;
    const wrap = document.createElement("div");
    wrap.className = "sb-cat cat-" + catId + (wasExpanded ? " expanded" : "");
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
        "</span>" +
        '<i class="bi bi-x-circle sb-cat-clear" title="' +
        escapeHtml(clearTitle) +
        '" onclick="event.stopPropagation();' +
        clearFnName +
        '()"></i>' +
        '<i class="bi bi-chevron-right sb-cat-arrow"></i></div>' +
        '<div class="sb-tools">' +
        toolsInCat.map((t) => sbToolHtml(t)).join("") +
        "</div>";
    if (catId === "favorites") {
        nav.insertBefore(wrap, nav.firstChild);
    } else {
        const favCat = nav.querySelector('.sb-cat[data-cat="favorites"]');
        if (favCat) {
            favCat.after(wrap);
        } else {
            nav.insertBefore(wrap, nav.firstChild);
        }
    }
}

function refreshSidebarFavorites() {
    refreshSidebarVirtualCat(
        "favorites",
        getFavoriteTools(),
        "清空收藏",
        "clearFavoritesUI",
    );
}

// 重绘侧边栏"最近使用"分类:每次打开工具后调用,使其与首页最近块保持同步。
// 未产生过最近使用时整段不渲染,与普通分类"无工具则隐藏"的约定一致。
function refreshSidebarRecent() {
    refreshSidebarVirtualCat(
        "recent",
        getRecent().map((e) => e.tool),
        "清空最近使用",
        "clearRecent",
    );
}

function highlightSidebarTool(id) {
    document
        .querySelectorAll(".sb-tool.current")
        .forEach((el) => el.classList.remove("current"));
    document
        .querySelectorAll(".sb-cat.expanded")
        .forEach((el) => el.classList.remove("expanded"));
    const toolEl = document.querySelector('.sb-tool[data-tool="' + id + '"]');
    if (!toolEl) return;
    toolEl.classList.add("current");
    const catEl = toolEl.closest(".sb-cat");
    if (catEl) catEl.classList.add("expanded");
}

function clearSidebarHighlight() {
    document
        .querySelectorAll(".sb-tool.current")
        .forEach((el) => el.classList.remove("current"));
    document
        .querySelectorAll(".sb-cat.expanded")
        .forEach((el) => el.classList.remove("expanded"));
}
