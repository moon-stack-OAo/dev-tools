// Spring Boot relaxed binding 键名互转

/**
 * 将配置键拆成词段（简化版 relaxed binding）
 * 支持：camelCase、kebab-case、snake_case、ENV、点号路径
 * @param {string} key
 * @returns {string[]}
 */
function springBindingTokenize(key) {
    var s = String(key).trim();
    if (!s) return [];

    // 去掉常见前缀噪音空格
    // ENV 形式：全大写且含 _，可能含 .
    // 统一：. - _ 都当分隔，同时拆 camelCase

    // 先把 . 和 - 换成 _
    var norm = s.replace(/[.\-]/g, '_');

    // 若几乎全是大写字母/数字/下划线，按 ENV 处理（按 _ 分）
    if (/^[A-Z0-9_]+$/.test(norm) && /_/.test(norm)) {
        return norm
            .split('_')
            .filter(Boolean)
            .map(function (t) {
                return t.toLowerCase();
            });
    }

    // 含下划线：按 _ 分，再对每段拆 camel
    var parts = [];
    var chunks = norm.split('_').filter(Boolean);
    for (var i = 0; i < chunks.length; i++) {
        var sub = springBindingSplitCamel(chunks[i]);
        for (var j = 0; j < sub.length; j++) parts.push(sub[j]);
    }
    return parts.filter(Boolean);
}

/**
 * 拆 camelCase / PascalCase / 连续大写缩写
 * @param {string} word
 * @returns {string[]}
 */
function springBindingSplitCamel(word) {
    if (!word) return [];
    // 已是全小写或含非字母
    var s = String(word);
    // myPropName → my Prop Name；HTTPServer → HTTP Server；myURLValue → my URL Value
    var spaced = s
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
    return spaced
        .split(/\s+/)
        .filter(Boolean)
        .map(function (t) {
            return t.toLowerCase();
        });
}

/**
 * 词段 → 各种形式
 * @param {string[]} tokens
 * @returns {{ canonical: string, camel: string, kebab: string, snake: string, env: string, systemProp: string }}
 */
function springBindingFromTokens(tokens) {
    var t = tokens.map(function (x) {
        return String(x).toLowerCase().replace(/[^a-z0-9]/g, '');
    }).filter(Boolean);

    if (!t.length) {
        return {
            canonical: '',
            camel: '',
            kebab: '',
            snake: '',
            env: '',
            systemProp: '',
        };
    }

    var kebab = t.join('-');
    var snake = t.join('_');
    var camel = t[0] + t.slice(1).map(function (w) {
        return w.charAt(0).toUpperCase() + w.slice(1);
    }).join('');
    // Spring canonical 通常用 kebab 或 relaxed 的标准形式；此处用点分小写词
    var canonical = t.join('.');
    var env = t.join('_').toUpperCase();
    // system property 常用点号或 kebab；Spring 中 system 属性与 relaxed 等价，这里给点分
    var systemProp = t.join('.');

    return {
        canonical: canonical,
        camel: camel,
        kebab: kebab,
        snake: snake,
        env: env,
        systemProp: systemProp,
    };
}

/**
 * Spring relaxed binding 互转
 * @param {string} key
 * @param {string} [target] 可选：camel|kebab|snake|env|systemProp|canonical
 * @returns {{
 *   ok: boolean,
 *   results?: { canonical: string, camel: string, kebab: string, snake: string, env: string, systemProp: string },
 *   primary?: string,
 *   tokens?: string[],
 *   msg?: string
 * }}
 */
function springBindingConvert(key, target) {
    if (key == null || String(key).trim() === '') {
        return { ok: false, msg: '请输入配置键' };
    }
    var raw = String(key).trim();

    // 处理带 SPRING_APPLICATION_JSON 之类整段 ENV：仅转换键本身
    // 支持 my.prop-name / MY_PROP_NAME / myPropName / my_prop_name
    var tokens = springBindingTokenize(raw);
    if (!tokens.length) {
        return { ok: false, msg: '无法识别的键名' };
    }

    var results = springBindingFromTokens(tokens);
    var map = {
        camel: results.camel,
        kebab: results.kebab,
        snake: results.snake,
        env: results.env,
        systemProp: results.systemProp,
        canonical: results.canonical,
    };

    var primary = null;
    if (target != null && String(target).trim() !== '') {
        var t = String(target).trim().toLowerCase();
        if (t === 'system' || t === 'system-prop' || t === 'system_prop') t = 'systemprop';
        if (t === 'systemprop') t = 'systemProp';
        if (t === 'env' || t === 'environment') t = 'env';
        if (!(t in map) && t !== 'systemProp') {
            // 兼容
            if (t === 'systemprop') {
                primary = results.systemProp;
            } else {
                return {
                    ok: false,
                    results: results,
                    tokens: tokens,
                    msg: '未知 target，可选: camel / kebab / snake / env / systemProp / canonical',
                };
            }
        } else {
            primary = t === 'systemProp' ? results.systemProp : map[t];
        }
    }

    return {
        ok: true,
        results: results,
        primary: primary != null ? primary : results.kebab,
        tokens: tokens,
        msg: '转换成功（简化版 relaxed binding）',
    };
}

// === UI ===

function spbSetOut(text, isError) {
    var out = document.getElementById('spbOutput');
    if (!out) return;
    out.textContent = text;
    out.className = isError ? 'output-box error' : 'output-box';
}

function spbConvertUi() {
    var key = document.getElementById('spbInput').value;
    var r = springBindingConvert(key);
    if (!r.ok) {
        spbSetOut(r.msg || '转换失败', true);
        if (typeof setStatus === 'function') setStatus('转换失败');
        return;
    }
    var res = r.results;
    var lines = [
        'tokens: ' + r.tokens.join(' / '),
        'canonical (dot):  ' + res.canonical,
        'camelCase:        ' + res.camel,
        'kebab-case:       ' + res.kebab,
        'snake_case:       ' + res.snake,
        'ENV:              ' + res.env,
        'system property:  ' + res.systemProp,
        '',
        '说明: Spring Boot relaxed binding 简化版，覆盖常见 my.prop-name / myPropName / MY_PROP_NAME',
    ];
    spbSetOut(lines.join('\n'), false);
    if (typeof setStatus === 'function') setStatus('转换完成');
}

function spbLoadSample() {
    document.getElementById('spbInput').value = 'my.prop-name';
    spbConvertUi();
}

function spbClear() {
    var el = document.getElementById('spbInput');
    if (el) el.value = '';
    spbSetOut('', false);
    if (typeof setStatus === 'function') setStatus('已清空');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        springBindingConvert: springBindingConvert,
        springBindingTokenize: springBindingTokenize,
        springBindingFromTokens: springBindingFromTokens,
    };
}
