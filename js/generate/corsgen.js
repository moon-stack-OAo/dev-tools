// CORS 响应头生成

const CORS_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
const CORS_HEADER_PRESETS = [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-CSRF-Token',
];

/**
 * @param {object} opts
 * @returns {{
 *   ok: boolean,
 *   headers?: string[],
 *   text?: string,
 *   nginx?: string,
 *   express?: string,
 *   msg?: string
 * }}
 */
function corsBuildHeaders(opts) {
    const o = opts || {};
    let originMode = o.originMode === 'custom' ? 'custom' : 'star';
    let origin = '*';
    const customRaw = o.origin != null ? String(o.origin) : '';
    const customOrigins = customRaw
        .split(/[\r\n,]+/)
        .map(function (s) {
            return s.trim();
        })
        .filter(Boolean);

    if (originMode === 'custom') {
        if (!customOrigins.length) {
            return { ok: false, msg: '请填写至少一个 Origin' };
        }
        origin = customOrigins[0];
    }

    const credentials = !!o.credentials;
    if (credentials && origin === '*') {
        return {
            ok: false,
            msg: 'Allow-Credentials 为 true 时，Allow-Origin 不能为 *，请指定具体 Origin',
        };
    }

    let methods = Array.isArray(o.methods) ? o.methods.slice() : [];
    methods = methods
        .map(function (m) {
            return String(m).trim().toUpperCase();
        })
        .filter(Boolean);
    if (!methods.length) {
        methods = ['GET', 'POST'];
    }
    // 去重保序
    const methodSeen = Object.create(null);
    methods = methods.filter(function (m) {
        if (methodSeen[m]) return false;
        methodSeen[m] = true;
        return true;
    });

    let allowHeaders = [];
    if (Array.isArray(o.allowHeaders)) {
        allowHeaders = o.allowHeaders.slice();
    }
    if (o.allowHeadersCustom) {
        String(o.allowHeadersCustom)
            .split(/[\r\n,]+/)
            .map(function (s) {
                return s.trim();
            })
            .filter(Boolean)
            .forEach(function (h) {
                allowHeaders.push(h);
            });
    }
    allowHeaders = dedupeHeaders(allowHeaders);
    if (!allowHeaders.length) {
        allowHeaders = ['Content-Type', 'Authorization'];
    }

    let exposeHeaders = [];
    if (Array.isArray(o.exposeHeaders)) {
        exposeHeaders = o.exposeHeaders.slice();
    }
    if (o.exposeHeadersCustom) {
        String(o.exposeHeadersCustom)
            .split(/[\r\n,]+/)
            .map(function (s) {
                return s.trim();
            })
            .filter(Boolean)
            .forEach(function (h) {
                exposeHeaders.push(h);
            });
    }
    exposeHeaders = dedupeHeaders(exposeHeaders);

    let maxAge = o.maxAge;
    if (maxAge == null || maxAge === '') {
        maxAge = 86400;
    }
    maxAge = Number(maxAge);
    if (!isFinite(maxAge) || maxAge < 0) {
        return { ok: false, msg: 'Max-Age 须为非负整数秒' };
    }
    maxAge = Math.floor(maxAge);

    const includePreflight = o.includePreflight !== false;

    const headers = [
        'Access-Control-Allow-Origin: ' + origin,
        'Access-Control-Allow-Methods: ' + methods.join(', '),
        'Access-Control-Allow-Headers: ' + allowHeaders.join(', '),
    ];
    if (exposeHeaders.length) {
        headers.push('Access-Control-Expose-Headers: ' + exposeHeaders.join(', '));
    }
    if (credentials) {
        headers.push('Access-Control-Allow-Credentials: true');
    }
    headers.push('Access-Control-Max-Age: ' + maxAge);

    if (credentials) {
        headers.push('Vary: Origin');
    }

    let text = headers.join('\n');
    if (customOrigins.length > 1) {
        text +=
            '\n\n# 提示: 你填写了多个 Origin，浏览器每次响应只能带一个 Allow-Origin。\n' +
            '# 其它 Origin 需在服务端按请求 Origin 动态回显，例如:\n' +
            customOrigins
                .slice(1)
                .map(function (x) {
                    return '#   Access-Control-Allow-Origin: ' + x;
                })
                .join('\n');
    }
    if (includePreflight) {
        text +=
            '\n\n# --- OPTIONS 预检说明 ---\n' +
            '# 对预检请求 (OPTIONS) 返回 204/200，并附带上述 CORS 头。\n' +
            '# 浏览器会先发 OPTIONS，再发实际请求；Max-Age 控制预检缓存秒数。';
    }

    const nginxLines = headers.map(function (line) {
        const idx = line.indexOf(':');
        const name = line.slice(0, idx).trim();
        const val = line.slice(idx + 1).trim();
        return 'add_header ' + name + ' "' + val.replace(/"/g, '\\"') + '" always;';
    });
    const nginx =
        '# Nginx 片段（location 内）\n' +
        nginxLines.join('\n') +
        (credentials
            ? '\n# 若动态 Origin，请用 map $http_origin 等，勿写死 *'
            : '');

    const expressObj = {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': methods.join(', '),
        'Access-Control-Allow-Headers': allowHeaders.join(', '),
    };
    if (exposeHeaders.length) {
        expressObj['Access-Control-Expose-Headers'] = exposeHeaders.join(', ');
    }
    if (credentials) {
        expressObj['Access-Control-Allow-Credentials'] = 'true';
    }
    expressObj['Access-Control-Max-Age'] = String(maxAge);
    if (credentials) {
        expressObj['Vary'] = 'Origin';
    }

    const express =
        '// Express 示例\n' +
        "app.use(function (req, res, next) {\n" +
        '  res.set(' +
        JSON.stringify(expressObj, null, 2).replace(/\n/g, '\n  ') +
        ');\n' +
        "  if (req.method === 'OPTIONS') {\n" +
        '    return res.sendStatus(204);\n' +
        '  }\n' +
        '  next();\n' +
        '});';

    return {
        ok: true,
        headers: headers,
        text: text,
        nginx: nginx,
        express: express,
    };
}

function dedupeHeaders(list) {
    const seen = Object.create(null);
    const out = [];
    for (let i = 0; i < list.length; i++) {
        const h = String(list[i] || '').trim();
        if (!h) continue;
        const key = h.toLowerCase();
        if (seen[key]) continue;
        seen[key] = true;
        out.push(h);
    }
    return out;
}

function corsReadOpts() {
    const originModeEl = document.querySelector('input[name="corsOriginMode"]:checked');
    const originMode = originModeEl ? originModeEl.value : 'star';
    const originEl = document.getElementById('corsOrigin');
    const methods = [];
    CORS_METHODS.forEach(function (m) {
        const el = document.getElementById('corsMethod_' + m);
        if (el && el.checked) methods.push(m);
    });
    const allowHeaders = [];
    CORS_HEADER_PRESETS.forEach(function (h) {
        const el = document.getElementById('corsAH_' + h.replace(/[^a-zA-Z0-9]/g, '_'));
        if (el && el.checked) allowHeaders.push(h);
    });
    const allowCustom = document.getElementById('corsAllowHeadersCustom');
    const exposeCustom = document.getElementById('corsExposeHeaders');
    const credEl = document.getElementById('corsCredentials');
    const maxAgeEl = document.getElementById('corsMaxAge');
    const preEl = document.getElementById('corsPreflight');
    return {
        originMode: originMode,
        origin: originEl ? originEl.value : '',
        methods: methods,
        allowHeaders: allowHeaders,
        allowHeadersCustom: allowCustom ? allowCustom.value : '',
        exposeHeadersCustom: exposeCustom ? exposeCustom.value : '',
        credentials: credEl ? credEl.checked : false,
        maxAge: maxAgeEl ? maxAgeEl.value : 86400,
        includePreflight: preEl ? preEl.checked : true,
    };
}

function corsOnOriginModeChange() {
    const originModeEl = document.querySelector('input[name="corsOriginMode"]:checked');
    const custom = originModeEl && originModeEl.value === 'custom';
    const wrap = document.getElementById('corsOriginWrap');
    if (wrap) wrap.style.display = custom ? '' : 'none';
    corsRender();
}

function corsRender() {
    const r = corsBuildHeaders(corsReadOpts());
    const textEl = document.getElementById('corsText');
    const nginxEl = document.getElementById('corsNginx');
    const expressEl = document.getElementById('corsExpress');
    const warnEl = document.getElementById('corsWarn');

    if (!r.ok) {
        if (textEl) textEl.value = r.msg || '生成失败';
        if (nginxEl) nginxEl.value = '';
        if (expressEl) expressEl.value = '';
        if (warnEl) {
            warnEl.textContent = r.msg || '';
            warnEl.style.display = '';
        }
        if (typeof setStatus === 'function') setStatus(r.msg || '生成失败');
        return;
    }

    if (warnEl) {
        warnEl.textContent = '';
        warnEl.style.display = 'none';
    }
    if (textEl) textEl.value = r.text || '';
    if (nginxEl) nginxEl.value = r.nginx || '';
    if (expressEl) expressEl.value = r.express || '';
    if (typeof setStatus === 'function') setStatus('CORS 头已生成');
}

function corsCopy(id) {
    const el = document.getElementById(id);
    const t = el ? el.value : '';
    if (!t || !String(t).trim()) {
        if (typeof toast === 'function') toast('无内容可复制');
        return;
    }
    if (typeof copyText === 'function') copyText(id);
    else if (typeof safeCopy === 'function') safeCopy(t);
}

function corsClear() {
    const star = document.querySelector('input[name="corsOriginMode"][value="star"]');
    if (star) star.checked = true;
    const originEl = document.getElementById('corsOrigin');
    if (originEl) originEl.value = '';
    CORS_METHODS.forEach(function (m) {
        const el = document.getElementById('corsMethod_' + m);
        if (el) el.checked = m === 'GET' || m === 'POST' || m === 'OPTIONS';
    });
    CORS_HEADER_PRESETS.forEach(function (h) {
        const el = document.getElementById('corsAH_' + h.replace(/[^a-zA-Z0-9]/g, '_'));
        if (el) {
            el.checked = h === 'Content-Type' || h === 'Authorization' || h === 'X-Requested-With';
        }
    });
    const allowCustom = document.getElementById('corsAllowHeadersCustom');
    if (allowCustom) allowCustom.value = '';
    const exposeCustom = document.getElementById('corsExposeHeaders');
    if (exposeCustom) exposeCustom.value = '';
    const credEl = document.getElementById('corsCredentials');
    if (credEl) credEl.checked = false;
    const maxAgeEl = document.getElementById('corsMaxAge');
    if (maxAgeEl) maxAgeEl.value = '86400';
    const preEl = document.getElementById('corsPreflight');
    if (preEl) preEl.checked = true;
    corsOnOriginModeChange();
    if (typeof setStatus === 'function') setStatus('已重置');
}

function corsLoadExample() {
    const custom = document.querySelector('input[name="corsOriginMode"][value="custom"]');
    if (custom) custom.checked = true;
    const originEl = document.getElementById('corsOrigin');
    if (originEl) originEl.value = 'https://app.example.com\nhttps://admin.example.com';
    CORS_METHODS.forEach(function (m) {
        const el = document.getElementById('corsMethod_' + m);
        if (el) el.checked = true;
    });
    CORS_HEADER_PRESETS.forEach(function (h) {
        const el = document.getElementById('corsAH_' + h.replace(/[^a-zA-Z0-9]/g, '_'));
        if (el) el.checked = true;
    });
    const exposeCustom = document.getElementById('corsExposeHeaders');
    if (exposeCustom) exposeCustom.value = 'X-Request-Id, Content-Disposition';
    const credEl = document.getElementById('corsCredentials');
    if (credEl) credEl.checked = true;
    const maxAgeEl = document.getElementById('corsMaxAge');
    if (maxAgeEl) maxAgeEl.value = '7200';
    corsOnOriginModeChange();
    if (typeof setStatus === 'function') setStatus('已加载示例');
}

if (typeof registerInit === 'function') {
    registerInit('corsgen', function () {
        corsOnOriginModeChange();
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        corsBuildHeaders: corsBuildHeaders,
        CORS_METHODS: CORS_METHODS,
        CORS_HEADER_PRESETS: CORS_HEADER_PRESETS,
    };
}
