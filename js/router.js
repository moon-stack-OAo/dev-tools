// router.js — hash 路由 #/tool/{id}（ADR PR-2.1）
// 依赖：toolsById、openTool、showHome、clearHomeSearch、setStatus、domCache

/** 旧工具 id → 新工具 id（书签 / 分享链接兼容） */
const toolIdAliases = {
    json2csv: "jsonexcel",
};

/** 解析 location.hash → 工具 id（#/tool/json 或 #json） */
function parseRouteHash() {
    const raw = (location.hash || "").replace(/^#/, "").trim();
    if (!raw) return null;
    const m = raw.match(/^(?:\/?tool\/)?([a-zA-Z0-9_-]+)\/?$/);
    if (!m) return null;
    let id = m[1];
    if (id === "home" || id === "index") return null;
    if (toolIdAliases[id]) id = toolIdAliases[id];
    return toolsById.has(id) ? id : null;
}

function setRouteTool(id, opts) {
    if (!id || !toolsById.has(id)) return;
    const next = "#/tool/" + id;
    const already =
        location.hash === next ||
        location.hash === "#" + id ||
        location.hash === "#/" + id;
    _currentRouteToolId = id;
    if (already && !(opts && opts.replace)) return;
    _routeSyncing = true;
    try {
        if (opts && opts.replace) {
            history.replaceState({tool: id}, "", next);
        } else {
            history.pushState({tool: id}, "", next);
        }
    } catch (e) {
        try {
            location.hash = next;
        } catch (e2) {
            /* ignore */
        }
    }
    _routeSyncing = false;
}

function setRouteHome(opts) {
    if (!_currentRouteToolId && !location.hash) return;
    _currentRouteToolId = null;
    _routeSyncing = true;
    try {
        const url = location.pathname + location.search;
        if (opts && opts.replace) {
            history.replaceState({tool: null}, "", url);
        } else {
            history.pushState({tool: null}, "", url);
        }
    } catch (e) {
        try {
            history.replaceState({tool: null}, "", location.pathname + location.search);
        } catch (e2) {
            /* ignore */
        }
    }
    _routeSyncing = false;
}

function applyRouteFromLocation() {
    if (_routeSyncing) return;
    const id = parseRouteHash();
    if (id) {
        const panel = document.getElementById("panel-" + id);
        if (
            _currentRouteToolId === id &&
            panel &&
            panel.classList.contains("active")
        ) {
            return;
        }
        // 由路由驱动打开：避免 openTool 末尾再次 pushState 叠栈
        _currentRouteToolId = id;
        openToolFromRoute(id);
    } else {
        // 无有效工具 hash → 首页（不写 history，避免与 popstate 打架）
        _currentRouteToolId = null;
        showHome();
        clearHomeSearch();
        if (domCache.backToTop) domCache.backToTop.classList.remove("visible");
        setStatus("就绪");
    }
}

/** 路由/刷新进入工具：与 openTool 相同，但不 push 新历史 */
async function openToolFromRoute(id) {
    const prev = _routeSyncing;
    _routeSyncing = true;
    try {
        await openTool(id);
    } finally {
        _routeSyncing = prev;
        _currentRouteToolId = id;
        // 规范化 hash，不新增历史
        const next = "#/tool/" + id;
        if (location.hash !== next) {
            try {
                history.replaceState({tool: id}, "", next);
            } catch (e) {
                /* ignore */
            }
        }
    }
}


// 路由：hash 变化 / 浏览器前进后退
window.addEventListener("hashchange", function () {
    if (_routeSyncing) return;
    applyRouteFromLocation();
});
window.addEventListener("popstate", function () {
    if (_routeSyncing) return;
    applyRouteFromLocation();
});

// 首屏路由：由 app.js 在 initDomCache / buildHomeGrid 之后调用 bootRoute()
function bootRoute() {
    const id = parseRouteHash();
    if (id) {
        openToolFromRoute(id);
    } else {
        showHome();
        _currentRouteToolId = null;
        if (location.hash) {
            try {
                history.replaceState({tool: null}, "", location.pathname + location.search);
            } catch (e) {
                /* ignore */
            }
        }
    }
}
