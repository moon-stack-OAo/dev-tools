function specificityIsWhitespace(ch) {
    return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f';
}

function specificitySkipWs(s, i) {
    while (i < s.length && specificityIsWhitespace(s[i])) i++;
    return i;
}

function specificityReadIdent(s, i) {
    var start = i;
    while (i < s.length) {
        var c = s[i];
        if (
            (c >= 'a' && c <= 'z') ||
            (c >= 'A' && c <= 'Z') ||
            (c >= '0' && c <= '9') ||
            c === '-' ||
            c === '_' ||
            c === '\\' ||
            c.charCodeAt(0) > 127
        ) {
            if (c === '\\' && i + 1 < s.length) {
                i += 2;
            } else {
                i++;
            }
        } else {
            break;
        }
    }
    return { value: s.slice(start, i), index: i };
}

function specificityReadUntilBalanced(s, i, openCh, closeCh) {
    var depth = 0;
    var start = i;
    while (i < s.length) {
        var c = s[i];
        if (c === '\\' && i + 1 < s.length) {
            i += 2;
            continue;
        }
        if (c === '"' || c === "'") {
            var q = c;
            i++;
            while (i < s.length) {
                if (s[i] === '\\' && i + 1 < s.length) {
                    i += 2;
                    continue;
                }
                if (s[i] === q) {
                    i++;
                    break;
                }
                i++;
            }
            continue;
        }
        if (c === openCh) {
            depth++;
            i++;
            continue;
        }
        if (c === closeCh) {
            depth--;
            i++;
            if (depth === 0) {
                return { value: s.slice(start + 1, i - 1), index: i };
            }
            continue;
        }
        i++;
    }
    return { value: s.slice(start + 1), index: s.length };
}

function specificityMaxTuple(a, b) {
    if (a[0] !== b[0]) return a[0] > b[0] ? a : b;
    if (a[1] !== b[1]) return a[1] > b[1] ? a : b;
    return a[2] >= b[2] ? a : b;
}

function specificityAdd(a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function specificityParseSimpleList(selector) {
    var s = String(selector || '');
    var i = 0;
    var total = [0, 0, 0];
    var n = s.length;

    while (i < n) {
        i = specificitySkipWs(s, i);
        if (i >= n) break;
        var ch = s[i];

        if (ch === '>' || ch === '+' || ch === '~' || ch === ',') {
            i++;
            continue;
        }

        if (ch === '*') {
            i++;
            continue;
        }

        if (ch === '#') {
            i++;
            var id = specificityReadIdent(s, i);
            if (!id.value) return { ok: false, msg: '无效的 ID 选择器' };
            total[0]++;
            i = id.index;
            continue;
        }

        if (ch === '.') {
            i++;
            var cls = specificityReadIdent(s, i);
            if (!cls.value) return { ok: false, msg: '无效的 class 选择器' };
            total[1]++;
            i = cls.index;
            continue;
        }

        if (ch === '[') {
            var attr = specificityReadUntilBalanced(s, i, '[', ']');
            if (attr.index <= i + 1 && !attr.value && s[i] === '[') {
                return { ok: false, msg: '未闭合的属性选择器' };
            }
            total[1]++;
            i = attr.index;
            continue;
        }

        if (ch === ':') {
            if (i + 1 < n && s[i + 1] === ':') {
                i += 2;
                var pe = specificityReadIdent(s, i);
                if (!pe.value) return { ok: false, msg: '无效的伪元素' };
                total[2]++;
                i = pe.index;
                if (i < n && s[i] === '(') {
                    var peArgs = specificityReadUntilBalanced(s, i, '(', ')');
                    i = peArgs.index;
                }
                continue;
            }

            i++;
            var nameObj = specificityReadIdent(s, i);
            var name = nameObj.value.toLowerCase();
            if (!name) return { ok: false, msg: '无效的伪类' };
            i = nameObj.index;

            var args = null;
            if (i < n && s[i] === '(') {
                var argObj = specificityReadUntilBalanced(s, i, '(', ')');
                args = argObj.value;
                i = argObj.index;
            }

            if (name === 'where') {
                continue;
            }

            if (name === 'not' || name === 'is' || name === 'has') {
                if (args == null) {
                    total[1]++;
                    continue;
                }
                var parts = specificitySplitSelectorList(args);
                var best = [0, 0, 0];
                var any = false;
                for (var p = 0; p < parts.length; p++) {
                    var pr = specificityParseSimpleList(parts[p]);
                    if (!pr.ok) return pr;
                    if (!any) {
                        best = pr.tuple;
                        any = true;
                    } else {
                        best = specificityMaxTuple(best, pr.tuple);
                    }
                }
                total = specificityAdd(total, best);
                continue;
            }

            if (name === 'nth-child' || name === 'nth-last-child' || name === 'nth-of-type' || name === 'nth-last-of-type') {
                total[1]++;
                if (args) {
                    var ofIdx = args.toLowerCase().lastIndexOf(' of ');
                    if (ofIdx !== -1) {
                        var ofSel = args.slice(ofIdx + 4);
                        var ofParts = specificitySplitSelectorList(ofSel);
                        var ofBest = [0, 0, 0];
                        var ofAny = false;
                        for (var oi = 0; oi < ofParts.length; oi++) {
                            var or = specificityParseSimpleList(ofParts[oi]);
                            if (!or.ok) return or;
                            if (!ofAny) {
                                ofBest = or.tuple;
                                ofAny = true;
                            } else {
                                ofBest = specificityMaxTuple(ofBest, or.tuple);
                            }
                        }
                        total = specificityAdd(total, ofBest);
                    }
                }
                continue;
            }

            // 单冒号伪元素（兼容写法）
            if (
                name === 'before' ||
                name === 'after' ||
                name === 'first-line' ||
                name === 'first-letter' ||
                name === 'selection' ||
                name === 'placeholder' ||
                name === 'marker' ||
                name === 'backdrop'
            ) {
                total[2]++;
                continue;
            }

            total[1]++;
            continue;
        }

        // type selector
        if (
            (ch >= 'a' && ch <= 'z') ||
            (ch >= 'A' && ch <= 'Z') ||
            ch === '_' ||
            ch === '-' ||
            ch === '\\' ||
            ch.charCodeAt(0) > 127
        ) {
            var type = specificityReadIdent(s, i);
            if (!type.value) return { ok: false, msg: '无效的类型选择器' };
            total[2]++;
            i = type.index;
            continue;
        }

        // unknown char — skip lightly for robustness on combinators already handled
        return { ok: false, msg: '无法解析选择器：位置 ' + i + ' 附近「' + ch + '」' };
    }

    return { ok: true, tuple: total };
}

function specificitySplitSelectorList(list) {
    var s = String(list || '');
    var parts = [];
    var depth = 0;
    var start = 0;
    for (var i = 0; i < s.length; i++) {
        var c = s[i];
        if (c === '\\' && i + 1 < s.length) {
            i++;
            continue;
        }
        if (c === '"' || c === "'") {
            var q = c;
            i++;
            while (i < s.length) {
                if (s[i] === '\\' && i + 1 < s.length) {
                    i += 2;
                    continue;
                }
                if (s[i] === q) break;
                i++;
            }
            continue;
        }
        if (c === '(' || c === '[') {
            depth++;
            continue;
        }
        if (c === ')' || c === ']') {
            depth = Math.max(0, depth - 1);
            continue;
        }
        if (c === ',' && depth === 0) {
            parts.push(s.slice(start, i).trim());
            start = i + 1;
        }
    }
    parts.push(s.slice(start).trim());
    return parts.filter(function (p) {
        return p.length > 0;
    });
}

/**
 * 计算 CSS 选择器特异性 (a,b,c) = ids, classes/attrs/pseudo-classes, elements/pseudo-elements
 * 多选择器列表取最高特异性
 * @param {string} selector
 * @returns {{ ok: boolean, a?: number, b?: number, c?: number, tuple?: string, score?: number, msg?: string }}
 */
function specificityCalculate(selector) {
    var raw = selector == null ? '' : String(selector).trim();
    if (!raw) {
        return { ok: false, msg: '请输入选择器' };
    }

    // 去掉注释
    raw = raw.replace(/\/\*[\s\S]*?\*\//g, ' ').trim();
    if (!raw) {
        return { ok: false, msg: '请输入选择器' };
    }

    var list = specificitySplitSelectorList(raw);
    if (!list.length) {
        return { ok: false, msg: '请输入选择器' };
    }

    var best = null;
    for (var i = 0; i < list.length; i++) {
        var r = specificityParseSimpleList(list[i]);
        if (!r.ok) return r;
        if (!best) {
            best = r.tuple;
        } else {
            best = specificityMaxTuple(best, r.tuple);
        }
    }

    var a = best[0];
    var b = best[1];
    var c = best[2];
    var score = a * 10000 + b * 100 + c;
    return {
        ok: true,
        a: a,
        b: b,
        c: c,
        tuple: a + ',' + b + ',' + c,
        score: score,
    };
}

function specificityRender() {
    var input = document.getElementById('spcInput');
    var out = document.getElementById('spcResult');
    var tupleEl = document.getElementById('spcTuple');
    var scoreEl = document.getElementById('spcScore');
    var detailEl = document.getElementById('spcDetail');
    if (!input || !out) return;

    var sel = input.value;
    if (!String(sel).trim()) {
        out.className = 'output-box';
        out.innerHTML = '<span style="color:var(--text-dim)">请输入 CSS 选择器</span>';
        if (tupleEl) tupleEl.textContent = '—';
        if (scoreEl) scoreEl.textContent = '—';
        if (detailEl) detailEl.innerHTML = '';
        return;
    }

    var r = specificityCalculate(sel);
    if (!r.ok) {
        out.className = 'output-box error';
        out.innerHTML = escapeHtml(r.msg || '计算失败');
        if (tupleEl) tupleEl.textContent = '—';
        if (scoreEl) scoreEl.textContent = '—';
        if (detailEl) detailEl.innerHTML = '';
        if (typeof setStatus === 'function') setStatus(r.msg || '计算失败');
        return;
    }

    if (tupleEl) tupleEl.textContent = '(' + r.tuple + ')';
    if (scoreEl) scoreEl.textContent = String(r.score);

    var bars =
        '<div class="spc-bars">' +
        '<div class="spc-bar"><div class="spc-bar-label">A · ID</div><div class="spc-bar-num">' +
        escapeHtml(String(r.a)) +
        '</div><div class="spc-bar-track"><div class="spc-bar-fill spc-bar-a" style="width:' +
        Math.min(100, r.a * 25) +
        '%"></div></div></div>' +
        '<div class="spc-bar"><div class="spc-bar-label">B · class / attr / 伪类</div><div class="spc-bar-num">' +
        escapeHtml(String(r.b)) +
        '</div><div class="spc-bar-track"><div class="spc-bar-fill spc-bar-b" style="width:' +
        Math.min(100, r.b * 20) +
        '%"></div></div></div>' +
        '<div class="spc-bar"><div class="spc-bar-label">C · 元素 / 伪元素</div><div class="spc-bar-num">' +
        escapeHtml(String(r.c)) +
        '</div><div class="spc-bar-track"><div class="spc-bar-fill spc-bar-c" style="width:' +
        Math.min(100, r.c * 15) +
        '%"></div></div></div>' +
        '</div>';

    var explain =
        '<div class="spc-explain">' +
        '<div><b>三元组</b> (a, b, c) = (ID 数, class/属性/伪类 数, 类型/伪元素 数)</div>' +
        '<div><b>比较</b> 先比 a，再比 b，再比 c；数字越大特异性越高</div>' +
        '<div><b>说明</b> * 不计；:where() 不计；:is()/:not()/:has() 取参数中最高；组合器 &gt; + ~ 不计</div>' +
        '</div>';

    out.className = 'output-box';
    out.innerHTML = bars + explain;
    if (detailEl) {
        detailEl.textContent = '特异性: (' + r.tuple + ')  权重近似: ' + r.score;
    }
    if (typeof setStatus === 'function') setStatus('特异性 ' + r.tuple);
}

function specificityClear() {
    var input = document.getElementById('spcInput');
    if (input) input.value = '';
    specificityRender();
    if (typeof setStatus === 'function') setStatus('已清空');
}

function specificityLoadExample() {
    var input = document.getElementById('spcInput');
    if (input) input.value = 'ul#nav li.active > a:hover::before';
    specificityRender();
}

if (typeof registerInit === 'function') {
    registerInit('specificity', function () {
        specificityRender();
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        specificityCalculate: specificityCalculate,
        specificitySplitSelectorList: specificitySplitSelectorList,
        specificityParseSimpleList: specificityParseSimpleList,
    };
}
