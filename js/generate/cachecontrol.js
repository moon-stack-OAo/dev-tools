// Cache-Control 生成

const CACHE_CONTROL_PRESETS = [
    {
        id: 'no-cache-store',
        name: '无缓存',
        opts: {
            scope: 'private',
            noStore: true,
            noCache: false,
            mustRevalidate: false,
            proxyRevalidate: false,
            immutable: false,
            maxAge: '',
            sMaxAge: '',
            swr: '',
            sie: '',
            includeExpires: false,
            vary: '',
        },
    },
    {
        id: 'revalidate',
        name: '协商缓存',
        opts: {
            scope: 'public',
            noStore: false,
            noCache: true,
            mustRevalidate: true,
            proxyRevalidate: false,
            immutable: false,
            maxAge: '0',
            sMaxAge: '',
            swr: '',
            sie: '',
            includeExpires: false,
            vary: 'Accept-Encoding',
        },
    },
    {
        id: 'short-5m',
        name: '短缓存 5min',
        opts: {
            scope: 'public',
            noStore: false,
            noCache: false,
            mustRevalidate: false,
            proxyRevalidate: false,
            immutable: false,
            maxAge: '300',
            sMaxAge: '300',
            swr: '60',
            sie: '',
            includeExpires: true,
            vary: 'Accept-Encoding',
        },
    },
    {
        id: 'long-1y',
        name: '长缓存 1y immutable',
        opts: {
            scope: 'public',
            noStore: false,
            noCache: false,
            mustRevalidate: false,
            proxyRevalidate: false,
            immutable: true,
            maxAge: '31536000',
            sMaxAge: '31536000',
            swr: '',
            sie: '',
            includeExpires: true,
            vary: 'Accept-Encoding',
        },
    },
    {
        id: 'private-session',
        name: '私有会话',
        opts: {
            scope: 'private',
            noStore: false,
            noCache: false,
            mustRevalidate: true,
            proxyRevalidate: false,
            immutable: false,
            maxAge: '1800',
            sMaxAge: '',
            swr: '',
            sie: '',
            includeExpires: false,
            vary: '',
        },
    },
];

/**
 * 秒数 → 人话
 * @param {number} sec
 * @returns {string}
 */
function cacheControlFormatDuration(sec) {
    const n = Number(sec);
    if (!isFinite(n) || n < 0) return String(sec);
    if (n === 0) return '0 秒';
    const units = [
        { s: 31536000, label: '年' },
        { s: 86400, label: '天' },
        { s: 3600, label: '小时' },
        { s: 60, label: '分钟' },
        { s: 1, label: '秒' },
    ];
    for (let i = 0; i < units.length; i++) {
        const u = units[i];
        if (n >= u.s && n % u.s === 0) {
            return n / u.s + ' ' + u.label;
        }
    }
    if (n >= 86400) {
        const d = Math.floor(n / 86400);
        const rest = n % 86400;
        return d + ' 天' + (rest ? ' ' + cacheControlFormatDuration(rest) : '');
    }
    if (n >= 3600) {
        const h = Math.floor(n / 3600);
        const rest = n % 3600;
        return h + ' 小时' + (rest ? ' ' + cacheControlFormatDuration(rest) : '');
    }
    if (n >= 60) {
        const m = Math.floor(n / 60);
        const rest = n % 60;
        return m + ' 分钟' + (rest ? ' ' + rest + ' 秒' : '');
    }
    return n + ' 秒';
}

function parseOptionalSec(v) {
    if (v == null || v === '') return null;
    const n = Number(v);
    if (!isFinite(n) || n < 0) return NaN;
    return Math.floor(n);
}

/**
 * @param {object} opts
 * @returns {{
 *   ok: boolean,
 *   cacheControl?: string,
 *   headersText?: string,
 *   summary?: string,
 *   msg?: string
 * }}
 */
function cacheControlBuild(opts) {
    const o = opts || {};
    const scope = o.scope === 'private' ? 'private' : 'public';
    const noStore = !!o.noStore;
    const noCache = !!o.noCache;
    const mustRevalidate = !!o.mustRevalidate;
    const proxyRevalidate = !!o.proxyRevalidate;
    const immutable = !!o.immutable;

    const maxAge = parseOptionalSec(o.maxAge);
    const sMaxAge = parseOptionalSec(o.sMaxAge);
    const swr = parseOptionalSec(o.swr != null ? o.swr : o.staleWhileRevalidate);
    const sie = parseOptionalSec(o.sie != null ? o.sie : o.staleIfError);

    if (
        (maxAge !== null && isNaN(maxAge)) ||
        (sMaxAge !== null && isNaN(sMaxAge)) ||
        (swr !== null && isNaN(swr)) ||
        (sie !== null && isNaN(sie))
    ) {
        return { ok: false, msg: '时间字段须为非负整数秒' };
    }

    const directives = [];
    let warning = '';

    if (noStore) {
        directives.push('no-store');
        if (
            noCache ||
            mustRevalidate ||
            proxyRevalidate ||
            immutable ||
            maxAge !== null ||
            sMaxAge !== null ||
            swr !== null ||
            sie !== null
        ) {
            warning = 'no-store 时已忽略 max-age / s-maxage / immutable 等其它缓存指令';
        }
    } else {
        directives.push(scope);
        if (noCache) directives.push('no-cache');
        if (mustRevalidate) directives.push('must-revalidate');
        if (proxyRevalidate) directives.push('proxy-revalidate');
        if (maxAge !== null) directives.push('max-age=' + maxAge);
        if (sMaxAge !== null) directives.push('s-maxage=' + sMaxAge);
        if (swr !== null) directives.push('stale-while-revalidate=' + swr);
        if (sie !== null) directives.push('stale-if-error=' + sie);
        if (immutable) directives.push('immutable');
    }

    const cacheControl = directives.join(', ');
    const headerLines = ['Cache-Control: ' + cacheControl];

    const includeExpires = !!o.includeExpires && !noStore && maxAge !== null;
    let expiresVal = '';
    if (includeExpires) {
        const d = o.now instanceof Date ? new Date(o.now.getTime()) : new Date();
        d.setTime(d.getTime() + maxAge * 1000);
        expiresVal = d.toUTCString();
        headerLines.push('Expires: ' + expiresVal);
    }

    let vary = o.vary != null ? String(o.vary).trim() : '';
    if (vary) {
        headerLines.push('Vary: ' + vary);
    }

    // 人话说明
    const summaryParts = [];
    if (noStore) {
        summaryParts.push('禁止存储（no-store），浏览器与中间缓存均不应保存响应');
    } else {
        summaryParts.push(scope === 'public' ? '可被共享缓存（CDN/代理）与浏览器缓存' : '仅允许浏览器私有缓存，共享缓存不应存储');
        if (noCache) {
            summaryParts.push('使用前须向源站重新验证（no-cache）');
        }
        if (maxAge !== null) {
            summaryParts.push('浏览器可缓存 ' + cacheControlFormatDuration(maxAge) + '（max-age）');
        }
        if (sMaxAge !== null) {
            summaryParts.push('共享缓存可缓存 ' + cacheControlFormatDuration(sMaxAge) + '（s-maxage）');
        }
        if (swr !== null) {
            summaryParts.push('过期后仍可先返回旧内容并在后台刷新 ' + cacheControlFormatDuration(swr));
        }
        if (sie !== null) {
            summaryParts.push('源站错误时可继续用旧缓存 ' + cacheControlFormatDuration(sie));
        }
        if (mustRevalidate) {
            summaryParts.push('过期后必须重新验证（must-revalidate）');
        }
        if (proxyRevalidate) {
            summaryParts.push('共享缓存过期后必须重新验证（proxy-revalidate）');
        }
        if (immutable) {
            summaryParts.push('内容视为不可变（immutable），期内无需再验证');
        }
    }
    if (includeExpires && expiresVal) {
        summaryParts.push('Expires ≈ ' + expiresVal);
    }
    if (vary) {
        summaryParts.push('按 ' + vary + ' 区分缓存变体（Vary）');
    }
    if (warning) {
        summaryParts.push('注意: ' + warning);
    }

    return {
        ok: true,
        cacheControl: cacheControl,
        headersText: headerLines.join('\n'),
        summary: summaryParts.join('。') + '。',
        msg: warning || undefined,
    };
}

function cacheControlGetPreset(id) {
    for (let i = 0; i < CACHE_CONTROL_PRESETS.length; i++) {
        if (CACHE_CONTROL_PRESETS[i].id === id) return CACHE_CONTROL_PRESETS[i];
    }
    return null;
}

function cacheControlReadOpts() {
    const scopeEl = document.querySelector('input[name="ccScope"]:checked');
    return {
        scope: scopeEl ? scopeEl.value : 'public',
        noStore: !!(document.getElementById('ccNoStore') && document.getElementById('ccNoStore').checked),
        noCache: !!(document.getElementById('ccNoCache') && document.getElementById('ccNoCache').checked),
        mustRevalidate: !!(document.getElementById('ccMustRevalidate') && document.getElementById('ccMustRevalidate').checked),
        proxyRevalidate: !!(
            document.getElementById('ccProxyRevalidate') && document.getElementById('ccProxyRevalidate').checked
        ),
        immutable: !!(document.getElementById('ccImmutable') && document.getElementById('ccImmutable').checked),
        maxAge: document.getElementById('ccMaxAge') ? document.getElementById('ccMaxAge').value : '',
        sMaxAge: document.getElementById('ccSMaxAge') ? document.getElementById('ccSMaxAge').value : '',
        swr: document.getElementById('ccSwr') ? document.getElementById('ccSwr').value : '',
        sie: document.getElementById('ccSie') ? document.getElementById('ccSie').value : '',
        includeExpires: !!(document.getElementById('ccExpires') && document.getElementById('ccExpires').checked),
        vary: document.getElementById('ccVary') ? document.getElementById('ccVary').value : '',
    };
}

function cacheControlApplyOpts(opts) {
    const o = opts || {};
    const scope = o.scope === 'private' ? 'private' : 'public';
    const scopeEl = document.querySelector('input[name="ccScope"][value="' + scope + '"]');
    if (scopeEl) scopeEl.checked = true;
    function setChk(id, v) {
        const el = document.getElementById(id);
        if (el) el.checked = !!v;
    }
    function setVal(id, v) {
        const el = document.getElementById(id);
        if (el) el.value = v == null ? '' : String(v);
    }
    setChk('ccNoStore', o.noStore);
    setChk('ccNoCache', o.noCache);
    setChk('ccMustRevalidate', o.mustRevalidate);
    setChk('ccProxyRevalidate', o.proxyRevalidate);
    setChk('ccImmutable', o.immutable);
    setVal('ccMaxAge', o.maxAge);
    setVal('ccSMaxAge', o.sMaxAge);
    setVal('ccSwr', o.swr);
    setVal('ccSie', o.sie);
    setChk('ccExpires', o.includeExpires);
    setVal('ccVary', o.vary);
}

function cacheControlApplyPreset(id) {
    const p = cacheControlGetPreset(id);
    if (!p) return;
    cacheControlApplyOpts(p.opts);
    const bar = document.getElementById('ccPresets');
    if (bar) {
        bar.querySelectorAll('.cc-chip').forEach(function (el) {
            el.classList.toggle('active', el.getAttribute('data-id') === id);
        });
    }
    cacheControlRender();
}

function cacheControlRender() {
    const r = cacheControlBuild(cacheControlReadOpts());
    const ccEl = document.getElementById('ccOutput');
    const headersEl = document.getElementById('ccHeaders');
    const sumEl = document.getElementById('ccSummary');
    const warnEl = document.getElementById('ccWarn');

    if (!r.ok) {
        if (ccEl) ccEl.value = r.msg || '';
        if (headersEl) headersEl.value = '';
        if (sumEl) sumEl.textContent = r.msg || '';
        if (warnEl) {
            warnEl.textContent = r.msg || '';
            warnEl.style.display = '';
        }
        if (typeof setStatus === 'function') setStatus(r.msg || '生成失败');
        return;
    }

    if (ccEl) ccEl.value = 'Cache-Control: ' + r.cacheControl;
    if (headersEl) headersEl.value = r.headersText || '';
    if (sumEl) sumEl.textContent = r.summary || '';
    if (warnEl) {
        if (r.msg) {
            warnEl.textContent = r.msg;
            warnEl.style.display = '';
        } else {
            warnEl.textContent = '';
            warnEl.style.display = 'none';
        }
    }
    if (typeof setStatus === 'function') setStatus('Cache-Control 已生成');
}

function cacheControlCopy(id) {
    const el = document.getElementById(id);
    const t = el ? el.value : '';
    if (!t || !String(t).trim()) {
        if (typeof toast === 'function') toast('无内容可复制');
        return;
    }
    if (typeof copyText === 'function') copyText(id);
    else if (typeof safeCopy === 'function') safeCopy(t);
}

function cacheControlClear() {
    cacheControlApplyOpts({
        scope: 'public',
        noStore: false,
        noCache: false,
        mustRevalidate: false,
        proxyRevalidate: false,
        immutable: false,
        maxAge: '',
        sMaxAge: '',
        swr: '',
        sie: '',
        includeExpires: false,
        vary: '',
    });
    const bar = document.getElementById('ccPresets');
    if (bar) {
        bar.querySelectorAll('.cc-chip').forEach(function (el) {
            el.classList.remove('active');
        });
    }
    cacheControlRender();
    if (typeof setStatus === 'function') setStatus('已重置');
}

function cacheControlInitPresets() {
    const bar = document.getElementById('ccPresets');
    if (!bar) return;
    let html = '';
    for (let i = 0; i < CACHE_CONTROL_PRESETS.length; i++) {
        const p = CACHE_CONTROL_PRESETS[i];
        html +=
            '<button type="button" class="outline cc-chip" data-id="' +
            escapeHtml(p.id) +
            '" onclick="cacheControlApplyPreset(\'' +
            escapeHtml(p.id) +
            '\')">' +
            escapeHtml(p.name) +
            '</button>';
    }
    bar.innerHTML = html;
}

if (typeof registerInit === 'function') {
    registerInit('cachecontrol', function () {
        cacheControlInitPresets();
        cacheControlApplyPreset('short-5m');
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        cacheControlBuild: cacheControlBuild,
        cacheControlFormatDuration: cacheControlFormatDuration,
        cacheControlGetPreset: cacheControlGetPreset,
        CACHE_CONTROL_PRESETS: CACHE_CONTROL_PRESETS,
    };
}
