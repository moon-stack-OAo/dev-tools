// === GitHub Link (动态注入，生产模式才有) ===
// 仅当 Vite 注入的 window.__DEVTOOLS__.withGithub === true 时，才创建 GitHub 链接。
// dev 模式下该值为 undefined，自然跳过——同时配合 removeGithubPlugin 在构建时清理硬编码链接。
(function injectGithubLink() {
    if (typeof window === "undefined") return;
    const flag = window.__DEVTOOLS__;
    if (!flag || flag.withGithub !== true) return;
    const header = document.querySelector(".main-header");
    if (!header) return;
    const gh = document.createElement("a");
    gh.id = "headerGithub";
    gh.className = "header-github";
    gh.href = "https://github.com/moon-stack-OAo/dev-tools";
    gh.rel = "noopener noreferrer";
    gh.target = "_blank";
    gh.title = "查看 GitHub 仓库";
    gh.innerHTML = '<i class="bi bi-github"></i><span>GitHub</span>';
    header.appendChild(gh);
})();

// === DOM Cache ===
const domCache = {
    mainHeader: null,
    homeBtn: null,
    breadcrumb: null,
    statusText: null,
    loadingBar: null,
    toolLoadingOverlay: null,
    toolLoadingText: null,
    toolLoadingSub: null,
    toast: null,
    backToTop: null,
    homeSearch: null,
    homeGrid: null,
    homeHeatmap: null,
    homeCatAnchors: null,
    panelHome: null,
    sidebar: null,
    sidebarNav: null,
    sidebarQuick: null,
    sidebarToggle: null,
    sidebarMenuBtn: null,
    sidebarBackdrop: null,
    headerHomeTitle: null,
    headerGithub: null,
    panelsContainer: null,
};

function initDomCache() {
    domCache.mainHeader = document.querySelector('.main-header');
    domCache.homeBtn = document.getElementById('homeBtn');
    domCache.breadcrumb = document.getElementById('breadcrumb');
    domCache.statusText = document.getElementById('statusText');
    domCache.loadingBar = document.getElementById('loadingBar');
    domCache.toolLoadingOverlay = document.getElementById('toolLoadingOverlay');
    domCache.toolLoadingText = document.getElementById('toolLoadingText');
    domCache.toolLoadingSub = document.getElementById('toolLoadingSub');
    domCache.toast = document.getElementById('toast');
    domCache.backToTop = document.getElementById('backToTop');
    domCache.homeSearch = document.getElementById('homeSearch');
    domCache.homeGrid = document.getElementById('homeGrid');
    domCache.homeHeatmap = document.getElementById('homeHeatmap');
    domCache.homeCatAnchors = document.getElementById('homeCatAnchors');
    domCache.panelHome = document.getElementById('panel-home');
    domCache.sidebar = document.getElementById('sidebar');
    domCache.sidebarNav = document.getElementById('sidebarNav');
    domCache.sidebarQuick = document.getElementById('sidebarQuick');
    domCache.sidebarToggle = document.getElementById('sidebarToggle');
    domCache.sidebarMenuBtn = document.getElementById('sidebarMenuBtn');
    domCache.sidebarBackdrop = document.getElementById('sidebarBackdrop');
    domCache.headerHomeTitle = document.getElementById('headerHomeTitle');
    domCache.headerGithub = document.getElementById('headerGithub');
    domCache.panelsContainer = document.getElementById('panels-container');
}

// === Tools Data ===
// categories / tools / toolsById 定义见 js/tools-registry.js（须先于本文件加载）

// === Loader / Router ===
// loadLib / loadTool* / openTool / assetV / toolLibs → js/loader.js
// hash 路由 → js/router.js（须在 app.js 之后或依赖 domCache 已定义）
// 注意：router 的 hash 监听在 router.js 末尾；domCache 须已 init


// === Navigation ===

// === Theme ===
const THEME_KEY = "devtools.theme";

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const icon = document.getElementById("themeIcon");
    if (icon)
        icon.className =
            theme === "light" ? "bi bi-sun-fill" : "bi bi-moon-stars-fill";
    try {
        localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
    }
}

function toggleTheme() {
    const cur = document.documentElement.getAttribute("data-theme") || "dark";
    applyTheme(cur === "light" ? "dark" : "light");
}

(function initTheme() {
    let saved = "dark";
    try {
        saved = localStorage.getItem(THEME_KEY) || "dark";
    } catch (e) {
    }
    applyTheme(saved);
})();


// === Usage / Recent / Favorites / Home UI → js/ui-home.js ===
// === Sidebar → js/ui-sidebar.js ===



// escapeHtml / debounce → js/utils.js（须先于本文件加载）

/**
 * 从解析异常中提取行列位置（JSON / YAML / XML 等）
 * @returns {{ line: number|null, column: number|null, position: number|null, message: string }}
 */
function locateParseError(source, err) {
    const text = source == null ? "" : String(source);
    const msg = (err && (err.message || err.reason)) || String(err || "解析失败");
    let line = null;
    let column = null;
    let position = null;

    // js-yaml: err.mark { line(0-based), column(0-based), position }
    if (err && err.mark && typeof err.mark === "object") {
        if (typeof err.mark.line === "number") line = err.mark.line + 1;
        if (typeof err.mark.column === "number") column = err.mark.column + 1;
        if (typeof err.mark.position === "number") position = err.mark.position;
    }

    // JSON / 通用: "at position 12 (line 3 column 5)" 或 "at position 12"
    if (line == null) {
        const m1 = msg.match(
            /position\s+(\d+)\s*\(\s*line\s+(\d+)\s*column\s+(\d+)\s*\)/i,
        );
        if (m1) {
            position = parseInt(m1[1], 10);
            line = parseInt(m1[2], 10);
            column = parseInt(m1[3], 10);
        } else {
            const m2 = msg.match(/position\s+(\d+)/i);
            if (m2) position = parseInt(m2[1], 10);
        }
    }

    // XML DOMParser / 其它: "line 2 at column 15" / "Line: 2 Column: 15"
    if (line == null) {
        const m3 = msg.match(/line\s*[:=]?\s*(\d+)/i);
        if (m3) line = parseInt(m3[1], 10);
        const m4 = msg.match(/col(?:umn)?\s*[:=]?\s*(\d+)/i);
        if (m4) column = parseInt(m4[1], 10);
    }

    // 仅有 position：换算行列
    if (line == null && position != null && position >= 0) {
        const head = text.slice(0, Math.min(position, text.length));
        const parts = head.split(/\r\n|\n|\r/);
        line = parts.length;
        column = (parts[parts.length - 1] || "").length + 1;
    }

    return {line: line, column: column, position: position, message: msg};
}

/**
 * 生成带行号上下文与 ^ 指针的错误报告（纯文本，写入 output-box）
 * @param {string} source 原始输入
 * @param {Error|string} err 异常
 * @param {string} [title] 标题前缀，如 "JSON 解析错误"
 */
function formatParseErrorReport(source, err, title) {
    const text = source == null ? "" : String(source);
    const loc = locateParseError(text, err);
    const head = title || "解析错误";
    let where = "";
    if (loc.line != null && loc.column != null) {
        where = "（第 " + loc.line + " 行，第 " + loc.column + " 列）";
    } else if (loc.line != null) {
        where = "（第 " + loc.line + " 行）";
    } else if (loc.position != null) {
        where = "（位置 " + loc.position + "）";
    }

    const lines = text.replace(/\r\n|\r/g, "\n").split("\n");
    const parts = [];
    parts.push("✗ " + head + where);
    parts.push(loc.message);
    parts.push("");

    if (loc.line != null && loc.line >= 1 && lines.length) {
        const idx = Math.min(Math.max(loc.line - 1, 0), lines.length - 1);
        const from = Math.max(0, idx - 2);
        const to = Math.min(lines.length - 1, idx + 2);
        const numW = String(to + 1).length;
        for (let i = from; i <= to; i++) {
            const n = String(i + 1).padStart(numW, " ");
            const mark = i === idx ? ">" : " ";
            const content = lines[i] == null ? "" : lines[i];
            parts.push(mark + " " + n + " | " + content);
            if (i === idx) {
                const col = loc.column != null ? Math.max(1, loc.column) : 1;
                // 指针对齐到内容列（考虑行号前缀宽度：" > NN | "）
                const prefixLen = 1 + 1 + numW + 3; // mark + space + num + " | "
                const caretPad = prefixLen + Math.min(col - 1, content.length);
                parts.push(" ".repeat(caretPad) + "^");
            }
        }
    } else if (text.trim()) {
        // 无行列时展示前几行便于对照
        const preview = lines.slice(0, 5);
        const numW = String(preview.length).length;
        preview.forEach(function (ln, i) {
            parts.push(
                "  " + String(i + 1).padStart(numW, " ") + " | " + (ln || ""),
            );
        });
        if (lines.length > 5) parts.push("  ...");
    }

    return parts.join("\n");
}

/** 行列 → 字符串偏移（line/column 均为 1-based） */
function offsetFromLineCol(text, line, column) {
    const src = text == null ? "" : String(text);
    if (line == null || line < 1) return 0;
    const lines = src.replace(/\r\n|\r/g, "\n").split("\n");
    const idx = Math.min(Math.max(line - 1, 0), lines.length - 1);
    let off = 0;
    // 注意：split 后用 \n 拼接长度；原文本可能是 \r\n，近似用 \n 计数
    for (let i = 0; i < idx; i++) {
        off += (lines[i] || "").length + 1;
    }
    const col = column == null ? 1 : Math.max(1, column);
    off += Math.min(col - 1, (lines[idx] || "").length);
    return Math.min(Math.max(0, off), src.length);
}

/**
 * 在输入框中选中并高亮解析错误位置（整行或错误 token）
 * @param {HTMLTextAreaElement|HTMLInputElement|string} inputElOrId
 * @param {string} source
 * @param {Error|string} err
 */
function highlightParseErrorInInput(inputElOrId, source, err) {
    const el =
        typeof inputElOrId === "string"
            ? document.getElementById(inputElOrId)
            : inputElOrId;
    if (!el || typeof el.setSelectionRange !== "function") return;

    const text = source == null ? el.value || "" : String(source);
    const loc = locateParseError(text, err);
    let start = 0;
    let end = 0;

    if (loc.position != null && loc.position >= 0) {
        start = Math.min(loc.position, text.length);
    } else if (loc.line != null) {
        start = offsetFromLineCol(text, loc.line, loc.column || 1);
    } else {
        return;
    }

    // 优先选中从错误点到本行末尾的「可疑 token」；否则整行
    const nl = text.indexOf("\n", start);
    const lineEnd = nl < 0 ? text.length : nl;
    // token：连续非空白，至少 1 字符
    let tokenEnd = start;
    while (tokenEnd < lineEnd && !/\s/.test(text[tokenEnd])) tokenEnd++;
    if (tokenEnd === start) {
        // 错误点落在空白/行尾：选中整行
        let lineStart = start;
        while (lineStart > 0 && text[lineStart - 1] !== "\n") lineStart--;
        start = lineStart;
        end = lineEnd;
    } else {
        end = tokenEnd;
    }
    if (end <= start) end = Math.min(start + 1, text.length);

    try {
        el.focus({preventScroll: false});
        el.setSelectionRange(start, end);
    } catch (e) {
        /* ignore */
    }

    // 滚动到选区附近
    try {
        const lineH = 18;
        const line = loc.line != null ? loc.line : 1;
        el.scrollTop = Math.max(0, (line - 3) * lineH);
    } catch (e) {
        /* ignore */
    }

    el.classList.add("input-parse-error");
    clearTimeout(el._parseErrTimer);
    el._parseErrTimer = setTimeout(function () {
        el.classList.remove("input-parse-error");
    }, 3500);

    // 用户编辑后去掉错误样式
    if (!el._parseErrBound) {
        el._parseErrBound = true;
        const clear = function () {
            el.classList.remove("input-parse-error");
        };
        el.addEventListener("input", clear);
        el.addEventListener("keydown", clear);
    }
}

/**
 * 输出错误报告 + 输入框定位高亮（格式化工具统一入口）
 */
function reportParseError(outEl, inputElOrId, source, err, title) {
    if (outEl) {
        outEl.textContent = formatParseErrorReport(source, err, title);
        outEl.className = "output-box error";
    }
    highlightParseErrorInInput(inputElOrId, source, err);
}


// 递归查找首个真正可滚动的元素:工具面板自身或其任意后代。
// 用于 backToTop 与 ResizeObserver 监听切换。
function findScrollable(root) {
    if (!root) return null;
    const rs = getComputedStyle(root);
    if (
        (rs.overflowY === "auto" || rs.overflowY === "scroll") &&
        root.scrollHeight > root.clientHeight + 1
    )
        return root;
    const queue = [...root.children];
    while (queue.length) {
        const el = queue.shift();
        const s = getComputedStyle(el);
        if (
            (s.overflowY === "auto" || s.overflowY === "scroll") &&
            el.scrollHeight > el.clientHeight + 1
        )
            return el;
        for (const c of el.children) queue.push(c);
    }
    return root;
}

// backToTop 统一 handler:实时定位当前激活面板的滚动元素,平滑回顶。
function scrollActiveToTop() {
    const active =
        document.querySelector(".tool-panel.active") ||
        domCache.panelHome;
    if (!active) return;
    const target = findScrollable(active);
    (target || active).scrollTo({top: 0, behavior: "smooth"});
}

// 参考面板搜索框：清除按钮显隐与点击
function toggleRefClear(input) {
    const btn =
        input.parentElement &&
        input.parentElement.querySelector(".ref-search-clear");
    if (!btn) return;
    btn.classList.toggle("visible", !!input.value);
}

function clearRefSearch(btn) {
    const wrap = btn.parentElement;
    const input = wrap && wrap.querySelector("input");
    if (!input) return;
    input.value = "";
    input.dispatchEvent(new Event("input", {bubbles: true}));
    btn.classList.remove("visible");
    input.focus();
}



// 首页静态就绪:立即显示容器并构建首页网格(工具面板/脚本按需懒加载)
{
    const loading = document.getElementById("panels-loading");
    if (loading) loading.style.display = "none";
    const container = document.getElementById("panels-container");
    if (container) container.style.display = "";
}
initDomCache();
if (typeof initUiTooltip === 'function') initUiTooltip();
buildHomeGrid();
buildSidebar();
// 返回顶部按钮(全局一次性绑定,自动适配当前激活面板)
domCache.backToTop.onclick = scrollActiveToTop;
// 路由首屏（router.js 已加载）：有 #/tool/id 则打开工具，否则首页
if (typeof bootRoute === 'function') bootRoute();
initBuildInfo();

// === Build info（状态栏版本） ===
function initBuildInfo() {
    const el = document.getElementById('statusBuild');
    if (!el) return;
    const apply = (info) => {
        if (!info) return;
        window.__BUILD_INFO__ = Object.assign({}, window.__BUILD_INFO__ || {}, info);
        const c = info.commit || 'dev';
        const t = info.builtAt ? new Date(info.builtAt).toLocaleString() : '';
        el.innerHTML =
            '构建 <code>' +
            escapeHtml(c) +
            '</code>' +
            (t ? ' · ' + escapeHtml(t) : '');
    };
    if (window.__BUILD_INFO__ && window.__BUILD_INFO__.commit) {
        apply(window.__BUILD_INFO__);
        return;
    }
    fetch('version.json', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then(apply)
        .catch(() => {});
}

// === Utils ===
function setStatus(msg) {
    domCache.statusText.textContent = msg;
}

function showLoading() {
    const bar = domCache.loadingBar;
    if (!bar) return;
    clearTimeout(bar._hideTimer);
    bar.classList.remove("done", "active");
    void bar.offsetWidth;
    bar.classList.add("active");
}

function hideLoading() {
    const bar = domCache.loadingBar;
    if (!bar) return;
    if (!bar.classList.contains("active")) return;
    bar.classList.remove("active");
    bar.classList.add("done");
    bar._hideTimer = setTimeout(() => {
        bar.classList.remove("done");
        bar._hideTimer = null;
    }, 600);
}

/** 面板区加载遮罩（深链/切换工具时避免先闪首页） */
function showToolLoading(toolName, toolDesc) {
    const overlay = domCache.toolLoadingOverlay;
    if (!overlay) return;
    clearTimeout(overlay._hideTimer);
    if (domCache.toolLoadingText) {
        domCache.toolLoadingText.textContent = toolName
            ? '正在打开「' + toolName + '」…'
            : '正在打开工具…';
    }
    if (domCache.toolLoadingSub) {
        domCache.toolLoadingSub.textContent = toolDesc ? String(toolDesc) : '';
    }
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    // 强制 reflow，保证从 hidden 切到可见时 transition 生效
    void overlay.offsetWidth;
    overlay.classList.add('is-visible');
}

function hideToolLoading() {
    const overlay = domCache.toolLoadingOverlay;
    if (!overlay) return;
    overlay.classList.remove('is-visible');
    overlay.setAttribute('aria-hidden', 'true');
    clearTimeout(overlay._hideTimer);
    overlay._hideTimer = setTimeout(() => {
        if (!overlay.classList.contains('is-visible')) {
            overlay.hidden = true;
        }
        overlay._hideTimer = null;
    }, 200);
}

function toast(msg) {
    const t = domCache.toast;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._hide);
    t._hide = setTimeout(() => t.classList.remove("show"), 2500);
}

function safeCopy(text, msg) {
    msg = msg || "已复制";
    const doFallback = () => {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand("copy");
            toast(msg);
        } catch (e) {
            toast("复制失败，请手动选择复制");
        }
        ta.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
            .writeText(text)
            .then(() => toast(msg))
            .catch(doFallback);
    } else {
        doFallback();
    }
}

function copyText(id) {
    const el = typeof id === "string" ? document.getElementById(id) : id;
    const text = el.textContent || el.innerText;
    if (!text) {
        toast("没有内容可复制");
        return;
    }
    safeCopy(text);
}

