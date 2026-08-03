// URL 参数构造器：解析 / 生成 query

/**
 * 解析 URL，拆出 base、params、hash
 * @param {string} url
 * @returns {{ ok: boolean, base?: string, params?: Array<{k:string,v:string}>, hash?: string, msg?: string }}
 */
function urlQueryParse(url) {
    var raw = url == null ? '' : String(url).trim();
    if (!raw) {
        return { ok: false, msg: '请输入 URL' };
    }

    var hash = '';
    var hashIdx = raw.indexOf('#');
    var withoutHash = raw;
    if (hashIdx !== -1) {
        hash = raw.slice(hashIdx + 1);
        withoutHash = raw.slice(0, hashIdx);
    }

    var query = '';
    var base = withoutHash;
    var qIdx = withoutHash.indexOf('?');
    if (qIdx !== -1) {
        base = withoutHash.slice(0, qIdx);
        query = withoutHash.slice(qIdx + 1);
    }

    var params = [];
    if (query) {
        var pairs = query.split('&');
        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i];
            if (!pair) continue;
            var eq = pair.indexOf('=');
            var k;
            var v;
            if (eq === -1) {
                k = pair;
                v = '';
            } else {
                k = pair.slice(0, eq);
                v = pair.slice(eq + 1);
            }
            try {
                k = decodeURIComponent(k.replace(/\+/g, ' '));
            } catch (e) {
                // keep raw
            }
            try {
                v = decodeURIComponent(v.replace(/\+/g, ' '));
            } catch (e2) {
                // keep raw
            }
            params.push({ k: k, v: v });
        }
    }

    return { ok: true, base: base, params: params, hash: hash };
}

/**
 * 将 params 文本解析为 [{k,v}]
 * 每行 key=value；允许仅 key
 * @param {string} text
 * @returns {Array<{k:string,v:string}>}
 */
function urlQueryParseParamsText(text) {
    var lines = String(text || '').split(/\r?\n/);
    var params = [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line || line.charAt(0) === '#') continue;
        var eq = line.indexOf('=');
        if (eq === -1) {
            params.push({ k: line, v: '' });
        } else {
            params.push({ k: line.slice(0, eq).trim(), v: line.slice(eq + 1) });
        }
    }
    return params;
}

/**
 * 将 params 数组格式化为 textarea 文本
 * @param {Array<{k:string,v:string}>} params
 * @returns {string}
 */
function urlQueryParamsToText(params) {
    if (!params || !params.length) return '';
    return params
        .map(function (p) {
            return (p.k || '') + '=' + (p.v == null ? '' : p.v);
        })
        .join('\n');
}

/**
 * 构造完整 URL
 * @param {string} base
 * @param {Array<{k:string,v:string}>|string} params
 * @param {string} [hash]
 * @returns {{ ok: boolean, url?: string, msg?: string }}
 */
function urlQueryBuild(base, params, hash) {
    var b = base == null ? '' : String(base).trim();
    if (!b) {
        return { ok: false, msg: '请输入 Base URL' };
    }

    var list;
    if (typeof params === 'string') {
        list = urlQueryParseParamsText(params);
    } else {
        list = params || [];
    }

    // 去掉 base 自带的 ?query 与 #hash（由参数/hash 重建）
    var hashIdx = b.indexOf('#');
    if (hashIdx !== -1) b = b.slice(0, hashIdx);
    var qIdx = b.indexOf('?');
    if (qIdx !== -1) b = b.slice(0, qIdx);

    var qs = [];
    for (var i = 0; i < list.length; i++) {
        var p = list[i];
        var k = p && p.k != null ? String(p.k).trim() : '';
        if (!k) continue;
        var v = p && p.v != null ? String(p.v) : '';
        qs.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
    }

    var url = b;
    if (qs.length) url += '?' + qs.join('&');
    var h = hash == null ? '' : String(hash).trim();
    if (h) {
        if (h.charAt(0) === '#') h = h.slice(1);
        url += '#' + h;
    }
    return { ok: true, url: url };
}

// === UI ===
function urlqueryBuild() {
    var baseEl = document.getElementById('uqBase');
    var paramsEl = document.getElementById('uqParams');
    var hashEl = document.getElementById('uqHash');
    var out = document.getElementById('uqOutput');
    if (!baseEl || !paramsEl || !out) return;

    var r = urlQueryBuild(baseEl.value, paramsEl.value, hashEl ? hashEl.value : '');
    if (!r.ok) {
        out.textContent = r.msg || '生成失败';
        out.className = 'output-box error';
        if (typeof setStatus === 'function') setStatus(r.msg || '生成失败');
        return;
    }
    out.textContent = r.url;
    out.className = 'output-box';
    if (typeof setStatus === 'function') setStatus('URL 已生成');
}

function urlqueryParse() {
    var urlEl = document.getElementById('uqUrl');
    var baseEl = document.getElementById('uqBase');
    var paramsEl = document.getElementById('uqParams');
    var hashEl = document.getElementById('uqHash');
    var out = document.getElementById('uqOutput');
    if (!urlEl || !baseEl || !paramsEl) return;

    var r = urlQueryParse(urlEl.value);
    if (!r.ok) {
        if (out) {
            out.textContent = r.msg || '解析失败';
            out.className = 'output-box error';
        }
        if (typeof setStatus === 'function') setStatus(r.msg || '解析失败');
        return;
    }
    baseEl.value = r.base || '';
    paramsEl.value = urlQueryParamsToText(r.params);
    if (hashEl) hashEl.value = r.hash || '';
    if (out) {
        out.textContent = r.base + (r.params && r.params.length ? ' + ' + r.params.length + ' 个参数' : '') +
            (r.hash ? ' + hash' : '');
        out.className = 'output-box';
    }
    if (typeof setStatus === 'function') setStatus('URL 解析完成，已回填');
}

function urlqueryClear() {
    var ids = ['uqUrl', 'uqBase', 'uqParams', 'uqHash'];
    ids.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
    });
    var out = document.getElementById('uqOutput');
    if (out) {
        out.textContent = '生成或解析后显示结果';
        out.className = 'output-box';
    }
    if (typeof setStatus === 'function') setStatus('已清空');
}

function urlquerySample() {
    var urlEl = document.getElementById('uqUrl');
    if (urlEl) {
        urlEl.value = 'https://api.example.com/v1/users?page=1&size=20&keyword=%E5%BC%A0%E4%B8%89&active=true#list';
    }
    urlqueryParse();
    urlqueryBuild();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        urlQueryParse: urlQueryParse,
        urlQueryBuild: urlQueryBuild,
        urlQueryParseParamsText: urlQueryParseParamsText,
        urlQueryParamsToText: urlQueryParamsToText,
    };
}
