// loader.js — 懒加载：lib / tool panel / tool script（ADR PR-2.1）
// 依赖：toolsById（tools-registry）、assetV、domCache（app 初始化后）、toast/setStatus/escapeHtml 等运行时全局

// 懒加载状态:工具的 JS 与 HTML 面板仅在首次打开时加载
const loadedScripts = new Set();
const loadedPanels = new Set(["home"]);
const _scriptPromise = {};
const _panelPromise = {};

// 第三方库按需懒加载:各工具仅在首次打开时加载依赖库,避免首屏 19 个库(~1.6MB)全量阻塞。
const loadedLibs = new Set();
const _libPromise = {};

function loadLib(name) {
    if (loadedLibs.has(name)) return Promise.resolve();
    if (_libPromise[name]) return _libPromise[name];
    _libPromise[name] = new Promise((resolve, reject) => {
        const el = document.createElement("script");
        el.src = `lib/${name}${assetV("lib/" + name)}`;
        el.onload = () => {
            loadedLibs.add(name);
            resolve();
        };
        el.onerror = () => {
            delete _libPromise[name];
            reject(new Error("加载库失败: " + name));
        };
        document.head.appendChild(el);
    });
    return _libPromise[name];
}

// 工具→依赖库映射,openTool 在加载工具脚本前按此表先加载所需库
const toolLibs = {
    yaml: ["js-yaml.min.js"],
    jsonconvert: ["js-yaml.min.js", "fxp.min.js"],
    propertiesfmt: ["js-yaml.min.js"],
    openapiview: ["js-yaml.min.js"],
    openapi2ts: ["js-yaml.min.js"],
    sql: ["sql-formatter.min.js"],
    sqldialect: ["sql-formatter.min.js"],
    jsonpath: ["jsonpath.min.js"],
    jsonschema: ["ajv.min.js"],
    diff: ["diff.min.js"],
    markdown: ["marked.min.js"],
    htmlmd: ["marked.min.js"],
    webfmt: ["js-beautify.min.js"],
    cssfmt: ["js-beautify.min.js"],

    qrcode: ["qrcode.min.js"],
    qrdecode: ["jsqr.min.js"],
    hash: ["md5.min.js"],
    bcrypt: ["bcrypt.min.js"],
    gmsm: ["sm2.min.js", "sm3.min.js", "sm4.min.js"],
    hashext: ["sm3.min.js"],
    certparser: ["asn1js.min.js", "pkijs.min.js"],
    uaparser: ["ua-parser.min.js"],
    sql2mybatis: ["jszip.min.js"],
    "image-compress": ["jszip.min.js"],
    imgtopdf: ["jspdf.min.js"],
    pdfmerge: ["pdf-lib.min.js"],
    jsonexcel: ["xlsx.min.js"],
    jsrun: ["sucrase.min.js", "js-beautify.min.js", "cm-editor.min.js"],
    pyrun: ["pyodide/pyodide.js", "cm-editor.min.js"],
    videodebug: ["hls.min.js"],
    mqtt: ["mqtt.min.js"],
    mappicker: ["leaflet.min.js"],
    mermaid: ["mermaid.min.js"],
};

// 工具→脚本依赖映射：打开工具前先加载其它工具脚本（复用其全局纯函数）
const toolScriptDeps = {
    json2ts: ["json2code"],
    grpc: ["protobuf"],
};

// 生产构建内联的 window.__ASSET_MAP__ 提供逐文件内容哈希,用于动态资源强缓存;
// dev 模式无该映射,返回空串(浏览器每次取最新)。
function assetV(p) {
    const m = window.__ASSET_MAP__;
    return m && m[p] ? "?v=" + m[p] : "";
}

// 工具初始化注册表:各工具 JS 末尾调用 registerInit(id, fn) 自行登记,
// openTool 打开工具后调用 toolInits[id]() 完成初始化(替代旧 renderMap + 启动 init 列表)。
const toolInits = {};
const initedTools = new Set();
// openTool 并发代数：快速连点时只应用最新一次打开的 UI，旧请求完成后忽略
let _openToolGen = 0;
// hash 路由同步：浏览器后退应回到首页，而非离开站点
let _routeSyncing = false;
let _currentRouteToolId = null;

function registerInit(id, fn) {
    toolInits[id] = fn;
}

function loadToolScript(id) {
    if (loadedScripts.has(id)) return Promise.resolve();
    if (_scriptPromise[id]) return _scriptPromise[id];
    const tool = toolsById.get(id);
    if (!tool) return Promise.reject(new Error("未知工具: " + id));
    const src = `js/${tool.cat}/${tool.id}.js${assetV("js/" + tool.cat + "/" + tool.id + ".js")}`;
    _scriptPromise[id] = new Promise((resolve, reject) => {
        const el = document.createElement("script");
        el.src = src;
        el.onload = () => {
            loadedScripts.add(id);
            resolve();
        };
        el.onerror = () => {
            delete _scriptPromise[id];
            reject(new Error("加载脚本失败: " + src));
        };
        document.head.appendChild(el);
    });
    return _scriptPromise[id];
}

function loadToolPanel(id) {
    if (loadedPanels.has(id)) return Promise.resolve();
    if (_panelPromise[id]) return _panelPromise[id];
    const tool = toolsById.get(id);
    if (!tool) return Promise.reject(new Error("未知工具: " + id));
    const url = `html/panels/${tool.cat}/${tool.id}.html${assetV("html/panels/" + tool.cat + "/" + tool.id + ".html")}`;
    _panelPromise[id] = fetch(url)
        .then((r) => {
            if (!r.ok) throw new Error("面板加载失败: " + r.status);
            return r.text();
        })
        .then((html) => {
            if (!html || !html.trim()) throw new Error("面板 HTML 为空: " + id);
            const container = domCache.panelsContainer;
            if (!container) throw new Error("panels-container 不存在");
            container.insertAdjacentHTML("beforeend", html);
            loadedPanels.add(id);
        })
        .catch((e) => {
            delete _panelPromise[id];
            throw e;
        });
    return _panelPromise[id];
}

async function openTool(id) {
    const tool = toolsById.get(id);
    if (!tool) return;
    const gen = ++_openToolGen;
    clearHomeSearch();
    showLoading();
    showToolLoading(tool.name, tool.desc);
    setStatus("加载中...");
    try {
        // 先按需加载依赖库(若有),再加载脚本依赖与本工具脚本/面板
        const libs = toolLibs[id];
        if (libs) await Promise.all(libs.map((l) => loadLib(l)));
        const deps = toolScriptDeps[id];
        if (deps) await Promise.all(deps.map((d) => loadToolScript(d)));
        await Promise.all([loadToolPanel(id), loadToolScript(id)]);
    } catch (e) {
        // 已被更新的 openTool 取代时不改 UI / loading，避免误关最新请求的 loading
        if (gen !== _openToolGen) return;
        toast("工具加载失败");
        console.error(e);
        setStatus("就绪");
        hideLoading();
        hideToolLoading();
        return;
    }
    // 异步加载期间用户又点了其他工具：丢弃本次 UI 切换（资源加载结果仍可复用）
    if (gen !== _openToolGen) return;
    bumpUsage(id);
    pushRecent(id);
    // 仅在首页处于「最近使用」虚拟筛选时刷新网格；否则只更新侧栏计数
    if (typeof homeVirtualFilter !== 'undefined' && homeVirtualFilter === 'recent' &&
        typeof refreshRecentBlock === 'function') {
        refreshRecentBlock();
        if (typeof filterHomeTools === 'function') filterHomeTools();
    }
    if (typeof refreshSidebarRecent === 'function') refreshSidebarRecent();
    document
        .querySelectorAll(".tool-panel.active")
        .forEach((p) => p.classList.remove("active"));
    const panel = document.getElementById("panel-" + id);
    if (!panel) {
        toast("面板加载失败");
        console.error("面板元素缺失: panel-" + id);
        setStatus("就绪");
        hideLoading();
        hideToolLoading();
        return;
    }
    panel.classList.add("active");
    // 注入工具标题(仅一次)
    if (!panel.dataset.titled) {
        panel.dataset.titled = "1";
        const hdr = document.createElement("div");
        hdr.className = "tool-header cat-" + tool.cat;
        hdr.innerHTML =
            '<i class="bi ' +
            tool.icon +
            '"></i><span class="tool-header-name">' +
            escapeHtml(tool.name) +
            '</span><span class="tool-header-desc">' +
            escapeHtml(tool.desc) +
            "</span>";
        panel.insertBefore(hdr, panel.firstChild);
    }
    const homeTitle = domCache.headerHomeTitle;
    if (homeTitle) homeTitle.style.display = "none";
    const gh = domCache.headerGithub;
    if (gh) gh.style.display = "none";
    domCache.homeBtn.style.display = "flex";
    const cat = categories.find((c) => c.id === tool.cat);
    domCache.mainHeader.classList.add("tool-mode");
    domCache.breadcrumb.innerHTML =
        '<span class="bc-item" onclick="goHome()">首页</span><span class="bc-sep">›</span><span class="bc-item" onclick="goHome(\'' +
        (cat ? cat.id : "") +
        "')\">" +
        (cat ? cat.name : "") +
        '</span><span class="bc-sep">›</span><span class="bc-current">' +
        tool.name +
        "</span>";
    // 工具页标题：利于标签页识别与 SEO 分享
    try {
        document.title =
            tool.name + " · ToolPkg 码包" + (tool.desc ? " — " + tool.desc : "");
    } catch (e) {
        /* ignore */
    }
    setStatus("就绪");
    // 工具初始化仅执行一次,避免重复绑定事件/重建 UI；异常隔离确保 loading 关闭
    try {
        if (toolInits[id] && !initedTools.has(id)) {
            toolInits[id]();
            initedTools.add(id);
        }
    } catch (e) {
        console.error(e);
        toast("工具初始化失败");
    } finally {
        // 仅当前代关闭 loading；被取代的请求不 hide，避免提前结束最新打开的加载态
        if (gen === _openToolGen) {
            hideLoading();
            hideToolLoading();
        }
    }
    if (gen !== _openToolGen) return;
    highlightSidebarTool(id);
    // 写入 hash，使浏览器后退可回到首页（路由回放时 _routeSyncing 为 true，跳过以免叠栈）
    if (!_routeSyncing) {
        setRouteTool(id, {replace: false});
    } else {
        _currentRouteToolId = id;
    }
    // 工具面板滚动 → 返回顶部按钮显隐(仅绑定一次,避免监听器累积)
    // click handler 在 init 末尾统一绑定为 scrollActiveToTop,无需此处分发。
    const tp = panel;
    const btt = domCache.backToTop;
    if (!tp.dataset.scrollBound) {
        tp.dataset.scrollBound = "1";
        let scrollEl = null;
        let ro = null;
        const updateBtn = () => {
            btt.classList.toggle("visible", scrollEl && scrollEl.scrollTop > 300);
        };
        const rebind = () => {
            const newEl = findScrollable(tp);
            if (newEl !== scrollEl) {
                if (scrollEl) scrollEl.removeEventListener("scroll", updateBtn);
                scrollEl = newEl;
                scrollEl.addEventListener("scroll", updateBtn, {passive: true});
            }
            updateBtn();
        };
        rebind();
        // 监听 panel 大小/内容变化,内容异步填充时自动重新检测滚动元素
        if (typeof ResizeObserver !== "undefined") {
            ro = new ResizeObserver(rebind);
            ro.observe(tp);
        } else {
            setTimeout(rebind, 100);
            setTimeout(rebind, 500);
            setTimeout(rebind, 1500);
        }
    }
}

// 切回首页 UI 状态(由 goHome / filterHomeTools 复用)
