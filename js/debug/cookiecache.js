// Cookie 解析 + Cache-Control 构造

/**
 * 解析 Cookie 请求头（name=value; name2=value2）
 * @param {string} raw
 * @returns {{pairs: Array<{name:string,value:string}>, map: object}}
 */
function parseCookieHeader(raw) {
    const pairs = [];
    const map = Object.create(null);
    if (!raw || !String(raw).trim()) {
        return { pairs: pairs, map: map };
    }
    String(raw)
        .split(';')
        .forEach(function (part) {
            const s = part.trim();
            if (!s) return;
            const eq = s.indexOf('=');
            let name;
            let value;
            if (eq < 0) {
                name = s;
                value = '';
            } else {
                name = s.slice(0, eq).trim();
                value = s.slice(eq + 1).trim();
            }
            if (!name) return;
            pairs.push({ name: name, value: value });
            if (map[name] === undefined) {
                map[name] = value;
            } else if (Array.isArray(map[name])) {
                map[name].push(value);
            } else {
                map[name] = [map[name], value];
            }
        });
    return { pairs: pairs, map: map };
}

/**
 * 解析 Set-Cookie 单行
 * @param {string} line
 * @returns {object}
 */
function parseSetCookie(line) {
    const result = {
        name: '',
        value: '',
        attributes: {},
        flags: [],
        raw: line || '',
        warnings: [],
    };
    if (!line || !String(line).trim()) {
        result.warnings.push('空 Set-Cookie');
        return result;
    }
    const parts = String(line).split(';');
    const first = parts[0].trim();
    const eq = first.indexOf('=');
    if (eq < 0) {
        result.name = first;
        result.value = '';
        result.warnings.push('缺少 name=value');
    } else {
        result.name = first.slice(0, eq).trim();
        result.value = first.slice(eq + 1).trim();
    }

    for (let i = 1; i < parts.length; i++) {
        const p = parts[i].trim();
        if (!p) continue;
        const e = p.indexOf('=');
        if (e < 0) {
            const flag = p;
            result.flags.push(flag);
            result.attributes[flag.toLowerCase()] = true;
        } else {
            const k = p.slice(0, e).trim();
            const v = p.slice(e + 1).trim();
            result.attributes[k.toLowerCase()] = v;
        }
    }

    // 安全提示
    const attrs = result.attributes;
    if (!attrs.secure) {
        result.warnings.push('未设置 Secure：仅建议 HTTPS 场景下使用');
    }
    if (!attrs.httponly) {
        result.warnings.push('未设置 HttpOnly：可被 JS 读取，注意 XSS');
    }
    if (!attrs.samesite) {
        result.warnings.push('未设置 SameSite：建议至少 Lax');
    } else {
        const ss = String(attrs.samesite).toLowerCase();
        if (ss === 'none' && !attrs.secure) {
            result.warnings.push('SameSite=None 必须配合 Secure');
        }
    }
    if (attrs['max-age'] !== undefined) {
        const n = parseInt(attrs['max-age'], 10);
        if (isNaN(n)) {
            result.warnings.push('Max-Age 非数字');
        } else if (n < 0) {
            result.warnings.push('Max-Age < 0：浏览器将立即删除 Cookie');
        }
    }
    return result;
}

/**
 * 解析多行 Set-Cookie（每行一条）
 * @param {string} text
 * @returns {object[]}
 */
function parseSetCookieMulti(text) {
    if (!text || !String(text).trim()) return [];
    return String(text)
        .split(/\r?\n/)
        .map(function (l) {
            return l.trim();
        })
        .filter(Boolean)
        .map(parseSetCookie);
}

/**
 * 构造 Set-Cookie 字符串
 * @param {object} opts
 * @returns {string}
 */
function buildSetCookie(opts) {
    opts = opts || {};
    const name = (opts.name || '').trim();
    if (!name) throw new Error('Cookie 名称不能为空');
    const value = opts.value != null ? String(opts.value) : '';
    const parts = [name + '=' + value];
    if (opts.path) parts.push('Path=' + opts.path);
    if (opts.domain) parts.push('Domain=' + opts.domain);
    if (opts.maxAge !== '' && opts.maxAge != null && opts.maxAge !== undefined) {
        parts.push('Max-Age=' + opts.maxAge);
    }
    if (opts.expires) parts.push('Expires=' + opts.expires);
    if (opts.sameSite) parts.push('SameSite=' + opts.sameSite);
    if (opts.secure) parts.push('Secure');
    if (opts.httpOnly) parts.push('HttpOnly');
    if (opts.partitioned) parts.push('Partitioned');
    return parts.join('; ');
}

/**
 * 构造 Cache-Control
 * @param {object} opts
 * @returns {{header:string, notes:string[]}}
 */
function buildCacheControl(opts) {
    opts = opts || {};
    const dirs = [];
    const notes = [];

    if (opts.noStore) {
        dirs.push('no-store');
        notes.push('no-store：禁止任何缓存（含浏览器与中间代理）');
        return { header: dirs.join(', '), notes: notes };
    }
    if (opts.noCache) {
        dirs.push('no-cache');
        notes.push('no-cache：可存储但使用前须重新验证');
    }
    if (opts.private) {
        dirs.push('private');
        notes.push('private：仅浏览器私有缓存');
    } else if (opts.public) {
        dirs.push('public');
        notes.push('public：允许共享缓存（CDN）');
    }
    if (opts.mustRevalidate) {
        dirs.push('must-revalidate');
    }
    if (opts.immutable) {
        dirs.push('immutable');
        notes.push('immutable：内容在 max-age 内不会变，减少条件请求');
    }
    if (opts.noTransform) {
        dirs.push('no-transform');
    }
    if (opts.maxAge !== '' && opts.maxAge != null && opts.maxAge !== undefined) {
        dirs.push('max-age=' + opts.maxAge);
    }
    if (opts.sMaxAge !== '' && opts.sMaxAge != null && opts.sMaxAge !== undefined) {
        dirs.push('s-maxage=' + opts.sMaxAge);
        notes.push('s-maxage：仅共享缓存使用，覆盖 max-age');
    }
    if (opts.staleWhileRevalidate !== '' && opts.staleWhileRevalidate != null) {
        dirs.push('stale-while-revalidate=' + opts.staleWhileRevalidate);
    }
    if (opts.staleIfError !== '' && opts.staleIfError != null) {
        dirs.push('stale-if-error=' + opts.staleIfError);
    }

    if (!dirs.length) {
        notes.push('未选择任何指令，将输出空字符串');
    }
    return { header: dirs.join(', '), notes: notes };
}

function cookieParseRun() {
    const raw = document.getElementById('ccCookieInput').value;
    const out = document.getElementById('ccCookieOutput');
    const parsed = parseCookieHeader(raw);
    if (!parsed.pairs.length) {
        out.textContent = '未解析到 Cookie 键值对';
        out.className = 'output-box error';
        return;
    }
    const lines = [];
    lines.push('共 ' + parsed.pairs.length + ' 项\n');
    parsed.pairs.forEach(function (p, i) {
        lines.push(i + 1 + '. ' + p.name + ' = ' + p.value);
    });
    lines.push('\nJSON map:');
    lines.push(JSON.stringify(parsed.map, null, 2));
    out.textContent = lines.join('\n');
    out.className = 'output-box';
    setStatus('Cookie 解析完成');
}

function setCookieParseRun() {
    const raw = document.getElementById('ccSetCookieInput').value;
    const out = document.getElementById('ccSetCookieOutput');
    const list = parseSetCookieMulti(raw);
    if (!list.length) {
        out.textContent = '请输入 Set-Cookie（每行一条）';
        out.className = 'output-box error';
        return;
    }
    const lines = [];
    list.forEach(function (c, idx) {
        lines.push('── Set-Cookie #' + (idx + 1) + ' ──');
        lines.push('Name  : ' + c.name);
        lines.push('Value : ' + c.value);
        const keys = Object.keys(c.attributes);
        if (keys.length) {
            lines.push('Attrs :');
            keys.forEach(function (k) {
                lines.push('  ' + k + ' = ' + c.attributes[k]);
            });
        }
        if (c.warnings.length) {
            lines.push('提示 :');
            c.warnings.forEach(function (w) {
                lines.push('  • ' + w);
            });
        }
        lines.push('');
    });
    out.textContent = lines.join('\n');
    out.className = 'output-box';
    setStatus('Set-Cookie 解析完成');
}

function setCookieBuildRun() {
    const out = document.getElementById('ccBuildCookieOutput');
    try {
        const header = buildSetCookie({
            name: document.getElementById('ccName').value,
            value: document.getElementById('ccValue').value,
            path: document.getElementById('ccPath').value,
            domain: document.getElementById('ccDomain').value,
            maxAge: document.getElementById('ccMaxAge').value,
            expires: document.getElementById('ccExpires').value,
            sameSite: document.getElementById('ccSameSite').value,
            secure: document.getElementById('ccSecure').checked,
            httpOnly: document.getElementById('ccHttpOnly').checked,
            partitioned: document.getElementById('ccPartitioned').checked,
        });
        out.textContent = header;
        out.className = 'output-box';
        setStatus('Set-Cookie 已生成');
    } catch (e) {
        out.textContent = e.message;
        out.className = 'output-box error';
    }
}

function cacheControlBuildRun() {
    const out = document.getElementById('ccCacheOutput');
    const result = buildCacheControl({
        noStore: document.getElementById('ccNoStore').checked,
        noCache: document.getElementById('ccNoCache').checked,
        public: document.getElementById('ccPublic').checked,
        private: document.getElementById('ccPrivate').checked,
        mustRevalidate: document.getElementById('ccMustRevalidate').checked,
        immutable: document.getElementById('ccImmutable').checked,
        noTransform: document.getElementById('ccNoTransform').checked,
        maxAge: document.getElementById('ccCacheMaxAge').value,
        sMaxAge: document.getElementById('ccSMaxAge').value,
        staleWhileRevalidate: document.getElementById('ccSwr').value,
        staleIfError: document.getElementById('ccSie').value,
    });
    const lines = [];
    lines.push('Cache-Control: ' + (result.header || '(空)'));
    if (result.notes.length) {
        lines.push('');
        result.notes.forEach(function (n) {
            lines.push('• ' + n);
        });
    }
    // 常用组合示例
    lines.push('\n── 常用组合 ──');
    lines.push('静态资源长期缓存: public, max-age=31536000, immutable');
    lines.push('HTML 需校验:     no-cache');
    lines.push('敏感接口:        no-store');
    lines.push('CDN 与浏览器不同: public, max-age=60, s-maxage=600');
    out.textContent = lines.join('\n');
    out.className = 'output-box';
    setStatus('Cache-Control 已生成');
}

function cookiecacheLoadSample() {
    document.getElementById('ccCookieInput').value =
        'sessionId=abc123; theme=dark; rememberMe=true';
    document.getElementById('ccSetCookieInput').value =
        'sessionId=abc123; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600\n' +
        'tracking=1; Path=/; SameSite=None; Secure; Max-Age=86400';
    document.getElementById('ccName').value = 'token';
    document.getElementById('ccValue').value = 'eyJhbGciOi...';
    document.getElementById('ccPath').value = '/';
    document.getElementById('ccMaxAge').value = '7200';
    document.getElementById('ccSameSite').value = 'Lax';
    document.getElementById('ccSecure').checked = true;
    document.getElementById('ccHttpOnly').checked = true;
    document.getElementById('ccCacheMaxAge').value = '3600';
    document.getElementById('ccPublic').checked = true;
    setStatus('已加载示例');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseCookieHeader: parseCookieHeader,
        parseSetCookie: parseSetCookie,
        parseSetCookieMulti: parseSetCookieMulti,
        buildSetCookie: buildSetCookie,
        buildCacheControl: buildCacheControl,
    };
}
