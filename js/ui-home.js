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
    renderHomeHeatmap();
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
        '" title="' +
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
    const tags = t.tags && t.tags.length ? t.tags : ["common"];
    card.dataset.tags = tags.join(",");
    card.style.animationDelay = Math.min(ci, 11) * 0.03 + "s";
    card.innerHTML =
        favStarHtml(t.id) +
        '<div class="hc-icon"><i class="bi ' +
        t.icon +
        '"></i></div><div class="hc-name">' +
        escapeHtml(t.name) +
        '</div><div class="hc-desc">' +
        escapeHtml(t.desc) +
        "</div>";
    card.dataset.name = t.name.toLowerCase();
    card.dataset.desc = t.desc.toLowerCase();
    card.addEventListener("click", () => openTool(t.id));
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

function renderHomeHeatmap() {
    const panel = domCache.homeHeatmap;
    if (!panel) return;
    const stats = getUsageStats();
    const entries = Object.entries(stats)
        .map(([id, count]) => ({
            id: id,
            count: count,
            tool: toolsById.get(id),
        }))
        .filter((e) => e.tool)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    if (!entries.length) {
        panel.innerHTML =
            '<div class="home-heatmap-empty"><i class="bi bi-clock-history"></i>暂无使用记录，开始使用工具后会在这里展示 Top 10 常用工具</div>';
        return;
    }
    const max = entries[0].count;
    const total = entries.reduce((s, e) => s + e.count, 0);
    const flames = ["🔥🔥🔥", "🔥🔥", "🔥", "", "", "", "", "", "", ""];
    const medals = ["🥇", "🥈", "🥉"];
    const tierClass = ["top-1", "top-2", "top-3"];
    panel.innerHTML =
        '<div class="home-heatmap-header"><i class="bi bi-fire"></i> 常用工具 Top ' +
        entries.length +
        "</div>" +
        entries
            .map((e, i) => {
                const pct = Math.round((e.count / max) * 100);
                const share = total > 0 ? Math.round((e.count / total) * 100) : 0;
                const rank = i < 3 ? " " + tierClass[i] : "";
                const medal =
                    i < 3
                        ? '<span class="home-heatmap-medal">' + medals[i] + "</span>"
                        : '<span class="home-heatmap-rank">' + (i + 1) + "</span>";
                const flame =
                    i < 10
                        ? '<span class="home-heatmap-flame">' + flames[i] + "</span>"
                        : "";
                return (
                    '<div class="home-heatmap-item cat-' +
                    e.tool.cat +
                    rank +
                    '" onclick="openTool(\'' +
                    e.id +
                    "');hideHomeHeatmap()\">" +
                    medal +
                    '<span class="home-heatmap-icon"><i class="bi ' +
                    e.tool.icon +
                    '"></i></span>' +
                    '<span class="home-heatmap-name">' +
                    escapeHtml(e.tool.name) +
                    flame +
                    "</span>" +
                    '<span class="home-heatmap-bar"><i style="width:' +
                    pct +
                    '%"></i></span>' +
                    '<span class="home-heatmap-count"><b>' +
                    e.count +
                    '</b><span class="home-heatmap-share">' +
                    share +
                    "%</span></span>" +
                    "</div>"
                );
            })
            .join("");
}

function showHomeHeatmap() {
    const input = domCache.homeSearch;
    if (!input || input.value.trim()) return;
    renderHomeHeatmap();
    const panel = domCache.homeHeatmap;
    if (panel) panel.style.display = "";
}

function hideHomeHeatmap() {
    const panel = domCache.homeHeatmap;
    if (panel) panel.style.display = "none";
}

let homeCards = [];
let homeDividers = [];

const AUDIENCE_KEY = "devtools.audience";
const VALID_AUDIENCES = { all: 1, common: 1, frontend: 1, backend: 1, java: 1 };
let homeAudience = "all";

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
    const bar = document.getElementById("homeAudienceBar");
    if (bar) {
        bar.querySelectorAll(".home-audience-btn").forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.audience === audience);
        });
    }
    filterHomeTools();
}

function syncHomeAudienceBar() {
    const bar = document.getElementById("homeAudienceBar");
    if (!bar) return;
    bar.querySelectorAll(".home-audience-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.audience === homeAudience);
    });
}

function buildHomeGrid() {
    const grid = domCache.homeGrid;
    grid.innerHTML = "";
    const anchors = domCache.homeCatAnchors;
    anchors.innerHTML = "";
    categories.forEach((cat) => {
        let toolsInCat;
        if (cat.id === "favorites") {
            toolsInCat = getFavoriteTools();
            if (!toolsInCat.length) return;
        } else if (cat.id === "recent") {
            toolsInCat = getRecent().map((e) => e.tool);
            if (!toolsInCat.length) return;
        } else {
            toolsInCat = tools.filter((t) => t.cat === cat.id);
            if (!toolsInCat.length) return;
        }
        const divider = document.createElement("div");
        divider.className = "home-cat-divider cat-" + cat.id;
        divider.id = "cat-" + cat.id;
        divider.innerHTML = `<span class="hcd-icon"><i class="bi ${cat.icon}"></i></span><span>${escapeHtml(cat.name)}</span>`;
        grid.appendChild(divider);
        toolsInCat.forEach((t, ci) => {
            const cardCat =
                cat.id === "recent" || cat.id === "favorites" ? cat.id : t.cat;
            grid.appendChild(createHomeCard(t, cardCat, ci));
        });
        const anchor = document.createElement("a");
        anchor.className = "cat-anchor";
        anchor.href = "#cat-" + cat.id;
        anchor.innerHTML =
            '<span class="cat-icon"><i class="bi ' +
            cat.icon +
            '"></i></span>' +
            cat.name;
        anchors.appendChild(anchor);
    });

    homeCards = Array.from(grid.querySelectorAll(".home-card"));
    homeDividers = Array.from(grid.querySelectorAll(".home-cat-divider"));

    // 滚动高亮当前分类
    const homePanel = domCache.panelHome;
    homePanel.addEventListener("scroll", debounce(highlightAnchor, 50));

    syncHomeAudienceBar();
    if (homeAudience !== "all" || (domCache.homeSearch && domCache.homeSearch.value.trim())) {
        filterHomeTools();
    }
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
            divider = document.createElement("div");
            divider.className = "home-cat-divider cat-" + catId;
            divider.id = "cat-" + catId;
            divider.innerHTML =
                '<span class="hcd-icon"><i class="bi ' +
                icon +
                '"></i></span><span>' +
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
            anchor.innerHTML =
                '<span class="cat-icon"><i class="bi ' +
                icon +
                '"></i></span>' +
                escapeHtml(name);
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
    if (homeAudience !== "all" || (domCache.homeSearch && domCache.homeSearch.value.trim())) {
        filterHomeTools();
    }
}

function refreshFavoritesBlock() {
    const cat = categories.find((c) => c.id === "favorites");
    refreshVirtualHomeBlock(
        "favorites",
        getFavoriteTools(),
        cat ? cat.icon : "bi-star-fill",
        cat ? cat.name : "收藏",
    );
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
    const threshold = scrollTop + homePanel.clientHeight * 0.25;
    let activeIdx = 0;
    for (let i = dividers.length - 1; i >= 0; i--) {
        if (dividers[i].offsetTop <= threshold) {
            activeIdx = i;
            break;
        }
    }
    anchors.forEach((a, i) => a.classList.toggle("active", i === activeIdx));
    // 返回顶部按钮显隐
    const btt = domCache.backToTop;
    btt.classList.toggle("visible", scrollTop > 300);
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
    try {
        document.title = "CodeCasket · 码匣 — 纯前端开发者工具箱";
    } catch (e) {
        /* ignore */
    }
    setStatus("就绪");
}

function goHome(catId) {
    showHome();
    clearHomeSearch();
    if (domCache.backToTop) domCache.backToTop.classList.remove("visible");
    // 首页按钮：替换当前历史项，避免再堆一层；浏览器「后退」从工具页仍回到首页
    setRouteHome({replace: true});
    setTimeout(() => {
        highlightAnchor();
        if (catId) {
            const el = document.getElementById("cat-" + catId);
            if (el) el.scrollIntoView({behavior: "smooth", block: "start"});
        }
    }, 50);
}

function filterHomeTools() {
    const q = domCache.homeSearch ? domCache.homeSearch.value.toLowerCase().trim() : "";

    // 如果当前不在首页，自动切回首页再搜索
    const homePanel = domCache.panelHome;
    if (!homePanel.classList.contains("active")) {
        showHome();
        setRouteHome({replace: true});
        setTimeout(highlightAnchor, 50);
    }

    const matchedCats = new Set();
    let hasVisible = false;
    homeCards.forEach((card) => {
        const name = card.dataset.name || "";
        const desc = card.dataset.desc || "";
        const textMatch = !q || name.includes(q) || desc.includes(q);
        const audienceMatch = cardMatchesAudience(card);
        const match = textMatch && audienceMatch;
        card.style.display = match ? "" : "none";
        if (match) {
            hasVisible = true;
            matchedCats.add(card.dataset.cat);
        }
    });
    homeDividers.forEach((d) => {
        const catId = d.id.replace("cat-", "");
        d.style.display = matchedCats.has(catId) ? "" : "none";
    });
    const empty = document.querySelector(".home-search-empty");
    if (empty) empty.remove();
    if (!hasVisible) {
        const msg = document.createElement("div");
        msg.className = "home-search-empty";
        msg.innerHTML = q
            ? '<i class="bi bi-search"></i> 没有匹配的工具'
            : '<i class="bi bi-funnel"></i> 当前受众下没有工具';
        domCache.homeGrid.appendChild(msg);
    }
    if (q) hideHomeHeatmap();
}

function clearHomeSearch() {
    const input = domCache.homeSearch;
    if (input) input.value = "";
    hideHomeHeatmap();
    // 仅清除搜索词并重算可见性，不重置 audience
    if (homeCards.length) filterHomeTools();
}

const onHomeSearchInput = debounce(filterHomeTools, 80);
