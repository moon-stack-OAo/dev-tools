// ui-tooltip.js — 全局统一气泡 title（替代浏览器原生 title）
// 挂 body，支持 data-tip / title；侧栏折叠/截断逻辑见 shouldShowSidebarTip

let _uiTipEl = null;
let _uiTipTimer = null;
let _uiTipAnchor = null;
let _uiTipPending = null;
let _uiTipPlacement = 'bottom';
let _uiTipBound = false;

function ensureUiTipEl() {
    if (_uiTipEl) return _uiTipEl;
    _uiTipEl = document.createElement('div');
    _uiTipEl.className = 'ui-tip';
    _uiTipEl.id = 'uiTip';
    _uiTipEl.setAttribute('role', 'tooltip');
    _uiTipEl.hidden = true;
    document.body.appendChild(_uiTipEl);
    return _uiTipEl;
}

/**
 * 剥离原生 title 到 data-ui-title（永久，避免点击后系统气泡回弹）
 * @param {Element} el
 */
function stripNativeTitle(el) {
    if (!el || !el.getAttribute) return;
    if (!el.hasAttribute('title')) return;
    el.setAttribute('data-ui-title', el.getAttribute('title'));
    el.removeAttribute('title');
}

/**
 * 设置 tip 文案（业务侧动态更新请用此 API，勿写 el.title）
 * @param {Element} el
 * @param {string} text
 */
function setUiTipText(el, text) {
    if (!el || !el.setAttribute) return;
    const t = text == null ? '' : String(text).trim();
    if (t) {
        el.setAttribute('data-ui-title', t);
    } else {
        el.removeAttribute('data-ui-title');
    }
    el.removeAttribute('title');
    // 若当前正在显示该锚点 tip，同步刷新内容
    if (_uiTipAnchor === el && _uiTipEl && !_uiTipEl.hidden) {
        _uiTipEl.textContent = t;
        positionUiTip(el, _uiTipPlacement);
    }
}

function hideUiTip() {
    if (_uiTipTimer) {
        clearTimeout(_uiTipTimer);
        _uiTipTimer = null;
    }
    const activeEl = _uiTipAnchor || _uiTipPending;
    if (activeEl && _uiTipEl && _uiTipEl.id) {
        activeEl.removeAttribute('aria-describedby');
    }
    // 不恢复原生 title：保持 data-ui-title，杜绝鼠标仍悬停时系统气泡弹出
    if (activeEl) stripNativeTitle(activeEl);
    _uiTipAnchor = null;
    _uiTipPending = null;
    if (_uiTipEl) {
        _uiTipEl.hidden = true;
        _uiTipEl.classList.remove('visible', 'ui-tip-top', 'ui-tip-bottom', 'ui-tip-left', 'ui-tip-right');
        _uiTipEl.textContent = '';
    }
}

/**
 * @param {Element} el
 * @returns {string}
 */
function getUiTipText(el) {
    if (!el || !el.getAttribute) return '';
    const dataTip = el.getAttribute('data-tip');
    if (dataTip != null && String(dataTip).trim()) return String(dataTip).trim();
    // 业务若仍写了 title，立刻迁入 data-ui-title，避免原生气泡
    if (el.hasAttribute('title')) stripNativeTitle(el);
    const cached = el.getAttribute('data-ui-title');
    if (cached != null && String(cached).trim()) return String(cached).trim();
    return '';
}

/** 键盘聚焦时是否展示 tip（避免表单控件 focus 刷屏） */
function isFocusTipTarget(el) {
    if (!el || !el.tagName) return false;
    const tag = el.tagName;
    if (tag === 'BUTTON' || tag === 'A' || tag === 'SUMMARY') return true;
    if (el.getAttribute('role') === 'button' || el.getAttribute('role') === 'tab') return true;
    if (el.classList) {
        if (
            el.classList.contains('theme-toggle') ||
            el.classList.contains('home-btn') ||
            el.classList.contains('home-density-btn') ||
            el.classList.contains('fav-star') ||
            el.classList.contains('back-to-top') ||
            el.classList.contains('sidebar-toggle') ||
            el.classList.contains('sidebar-menu-btn') ||
            el.classList.contains('sidebar-resizer') ||
            el.classList.contains('home-bottom-nav-btn') ||
            el.classList.contains('sb-quick-item') ||
            el.classList.contains('sb-cat-header')
        ) {
            return true;
        }
    }
    return false;
}

/**
 * @param {Element} el
 * @returns {'top'|'bottom'|'left'|'right'}
 */
function resolveUiTipPlacement(el) {
    const p = el && el.getAttribute && el.getAttribute('data-tip-placement');
    if (p === 'top' || p === 'bottom' || p === 'left' || p === 'right') return p;
    if (el.closest && el.closest('.sidebar')) return 'right';
    if (el.closest && el.closest('.home-bottom-nav')) return 'top';
    if (el.closest && el.closest('.main-header')) return 'bottom';
    return 'bottom';
}

/**
 * 侧栏项是否应显示 tip（折叠始终显示；展开仅文字截断）
 * 由 ui-sidebar 定义 shouldShowSidebarTip 时优先使用
 * @param {Element} el
 * @returns {boolean}
 */
function canShowUiTip(el) {
    if (!el) return false;
    if (typeof shouldShowSidebarTip === 'function' && el.matches && el.matches('.sb-cat-header, .sb-quick-item')) {
        return shouldShowSidebarTip(el);
    }
    return true;
}

/**
 * 从事件目标向上查找 tip 锚点
 * @param {EventTarget|null} start
 * @returns {Element|null}
 */
function findUiTipAnchor(start) {
    let el = start && start.nodeType === 1 ? start : start && start.parentElement;
    while (el && el !== document.body && el !== document.documentElement) {
        if (el.hasAttribute && (el.hasAttribute('data-tip') || el.hasAttribute('title') || el.hasAttribute('data-ui-title'))) {
            if (canShowUiTip(el) && getUiTipText(el)) return el;
            // 有属性但当前不显示：继续向上找父级 tip
        }
        el = el.parentElement;
    }
    return null;
}

function positionUiTip(anchor, placement) {
    const tip = ensureUiTipEl();
    if (!anchor || tip.hidden) return;
    const place = placement || _uiTipPlacement || 'bottom';
    const rect = anchor.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    const gap = 8;
    let left;
    let top;
    let finalPlace = place;

    tip.classList.remove('ui-tip-top', 'ui-tip-bottom', 'ui-tip-left', 'ui-tip-right', 'sb-tip-left');

    if (place === 'right' || place === 'left') {
        left = place === 'right' ? rect.right + gap : rect.left - tipRect.width - gap;
        top = rect.top + (rect.height - tipRect.height) / 2;
        if (place === 'right' && left + tipRect.width > window.innerWidth - gap) {
            left = rect.left - tipRect.width - gap;
            finalPlace = 'left';
        } else if (place === 'left' && left < gap) {
            left = rect.right + gap;
            finalPlace = 'right';
        }
        top = Math.max(gap, Math.min(top, window.innerHeight - tipRect.height - gap));
    } else {
        // top / bottom
        left = rect.left + (rect.width - tipRect.width) / 2;
        top = place === 'top' ? rect.top - tipRect.height - gap : rect.bottom + gap;
        if (place === 'bottom' && top + tipRect.height > window.innerHeight - gap) {
            top = rect.top - tipRect.height - gap;
            finalPlace = 'top';
        } else if (place === 'top' && top < gap) {
            top = rect.bottom + gap;
            finalPlace = 'bottom';
        }
        left = Math.max(gap, Math.min(left, window.innerWidth - tipRect.width - gap));
    }

    tip.classList.add('ui-tip-' + finalPlace);
    if (finalPlace === 'left') tip.classList.add('sb-tip-left');
    tip.style.left = Math.round(left) + 'px';
    tip.style.top = Math.round(top) + 'px';
    _uiTipPlacement = finalPlace;
}

/**
 * @param {Element} anchor
 * @param {string} text
 * @param {{placement?: string, delay?: number}} [opts]
 */
function showUiTip(anchor, text, opts) {
    if (!anchor || !text) return;
    const o = opts || {};
    const tip = ensureUiTipEl();
    if (_uiTipAnchor && _uiTipAnchor !== anchor) {
        _uiTipAnchor.removeAttribute('aria-describedby');
        stripNativeTitle(_uiTipAnchor);
    }
    if (_uiTipPending && _uiTipPending !== anchor) {
        stripNativeTitle(_uiTipPending);
    }
    _uiTipAnchor = anchor;
    _uiTipPending = null;
    _uiTipPlacement = o.placement || resolveUiTipPlacement(anchor);
    stripNativeTitle(anchor);
    tip.textContent = text;
    tip.hidden = false;
    tip.classList.remove('visible', 'ui-tip-top', 'ui-tip-bottom', 'ui-tip-left', 'ui-tip-right', 'sb-tip-left');
    tip.style.left = '-9999px';
    tip.style.top = '0';
    positionUiTip(anchor, _uiTipPlacement);
    anchor.setAttribute('aria-describedby', tip.id);
    requestAnimationFrame(function () {
        if (_uiTipAnchor === anchor) tip.classList.add('visible');
    });
}

function scheduleUiTip(anchor, text, delay) {
    if (_uiTipTimer) clearTimeout(_uiTipTimer);
    // 立即剥离原生 title，避免与系统气泡叠层
    if (_uiTipPending && _uiTipPending !== anchor) {
        stripNativeTitle(_uiTipPending);
    }
    _uiTipPending = anchor;
    stripNativeTitle(anchor);
    const ms = delay == null ? 280 : delay;
    if (ms <= 0) {
        showUiTip(anchor, text);
        return;
    }
    _uiTipTimer = setTimeout(function () {
        _uiTipTimer = null;
        showUiTip(anchor, text);
    }, ms);
}

function relatedInside(el, related) {
    return !!(el && related && related.nodeType === 1 && el.contains(related));
}

/** 全局 tip 初始化（幂等） */
function initUiTooltip() {
    if (_uiTipBound) return;
    _uiTipBound = true;
    ensureUiTipEl();

    document.addEventListener(
        'mouseover',
        function (e) {
            const anchor = findUiTipAnchor(e.target);
            if (!anchor) return;
            if (_uiTipAnchor === anchor || _uiTipPending === anchor) return;
            if (relatedInside(anchor, e.relatedTarget)) return;
            const text = getUiTipText(anchor);
            if (!text) {
                hideUiTip();
                return;
            }
            scheduleUiTip(anchor, text, 280);
        },
        true
    );

    document.addEventListener(
        'mouseout',
        function (e) {
            // 离开当前 tip 锚点（含仅 scheduled 尚未显示）时隐藏并恢复 title
            const leaving = _uiTipAnchor || _uiTipPending;
            if (!leaving) return;
            if (relatedInside(leaving, e.relatedTarget)) return;
            const next = findUiTipAnchor(e.relatedTarget);
            if (next === leaving) return;
            hideUiTip();
        },
        true
    );

    document.addEventListener(
        'focusin',
        function (e) {
            const anchor = findUiTipAnchor(e.target);
            if (!anchor || !isFocusTipTarget(anchor)) return;
            const text = getUiTipText(anchor);
            if (!text) return;
            scheduleUiTip(anchor, text, 0);
        },
        true
    );

    document.addEventListener(
        'focusout',
        function (e) {
            if (_uiTipAnchor && !relatedInside(_uiTipAnchor, e.relatedTarget)) {
                hideUiTip();
            }
        },
        true
    );

    // 点击时仅隐藏自定义 tip，不恢复原生 title（strip 已永久化）
    document.addEventListener(
        'mousedown',
        function () {
            hideUiTip();
        },
        true
    );

    // 启动后扫一遍壳层常用 title，预剥离，减少首悬停原生气泡
    function stripRootTitles() {
        document
            .querySelectorAll(
                '.main-header [title], .sidebar [title], .home-bottom-nav [title], .back-to-top[title], .fav-star[title], .status-bar [title]'
            )
            .forEach(stripNativeTitle);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', stripRootTitles);
    } else {
        stripRootTitles();
    }
    window.addEventListener('scroll', hideUiTip, true);
    window.addEventListener('resize', hideUiTip);
}

// 侧栏兼容别名
function ensureSidebarTipEl() {
    return ensureUiTipEl();
}
function hideSidebarTip() {
    hideUiTip();
}
function showSidebarTip(anchor, text) {
    showUiTip(anchor, text, {placement: 'right'});
}
function positionSidebarTip(anchor) {
    positionUiTip(anchor, 'right');
}
