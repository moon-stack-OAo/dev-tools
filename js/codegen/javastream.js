// Java Stream API 代码生成器
// 核心: generateStreamCode(config) -> { code, imports }
// 配置: { source, steps, terminal, addImports, target }

const STEP_DEFS = [
    { kind: 'filter', label: 'filter', needsExpr: true, exprPlaceholder: 'u -> u.getAge() > 18' },
    { kind: 'map', label: 'map', needsExpr: true, exprPlaceholder: 'User::getName' },
    {
        kind: 'sorted',
        label: 'sorted',
        needsComparator: true,
        comparatorDefault: { type: 'naturalOrder' },
    },
    { kind: 'limit', label: 'limit', needsN: true },
    { kind: 'skip', label: 'skip', needsN: true },
    { kind: 'distinct', label: 'distinct' },
    { kind: 'peek', label: 'peek', needsExpr: true, exprPlaceholder: 'System.out::println' },
    { kind: 'flatMap', label: 'flatMap', needsExpr: true, exprPlaceholder: 'u -> u.getOrders()' },
    {
        kind: 'groupBy',
        label: 'groupBy',
        needsGroup: true,
        groupDefault: { key: 'city', downstream: 'toList' },
        isTerminal: true,
    },
    { kind: 'partitionBy', label: 'partitionBy', needsPred: true, isTerminal: true },
];

const TERMINAL_DEFS = [
    { kind: 'collect', collect: 'toList', label: 'collect(toList())' },
    { kind: 'collect', collect: 'toSet', label: 'collect(toSet())' },
    { kind: 'collect', collect: 'toMap', label: 'collect(toMap(k,v))', needsKv: true },
    {
        kind: 'collect',
        collect: 'joining',
        label: 'collect(joining)',
        needsSep: true,
        sepDefault: ', ',
    },
    { kind: 'findFirst', label: 'findFirst().orElse(null)' },
    { kind: 'findAny', label: 'findAny().orElse(null)' },
    { kind: 'count', label: 'count()' },
    { kind: 'anyMatch', label: 'anyMatch(...)', needsExpr: true },
    { kind: 'allMatch', label: 'allMatch(...)', needsExpr: true },
    { kind: 'noneMatch', label: 'noneMatch(...)', needsExpr: true },
    { kind: 'forEach', label: 'forEach(...)', needsExpr: true },
    { kind: 'reduce', label: 'reduce(id, op)', needsReduce: true },
];

function _jsCap(s) {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function _jsTypeName(srcType) {
    if (!srcType) return '';
    const m = srcType.match(/<\s*([A-Z]\w*)\s*>/);
    if (m) return m[1];
    const arrM = srcType.match(/([A-Z]\w*)\s*\[\s*\]\s*$/);
    if (arrM) return arrM[1];
    return '';
}

function _jsSourceStream(srcType, srcVar, imports) {
    if (/^Map\s*</i.test(srcType)) {
        return srcVar + '.entrySet().stream()';
    }
    if (/^(int|long|double)\s*\[\s*\]\s*$/.test(srcType)) {
        imports.add('java.util.Arrays');
        return 'Arrays.stream(' + srcVar + ')';
    }
    if (/\[\s*\]\s*$/.test(srcType)) {
        imports.add('java.util.Arrays');
        return 'Arrays.stream(' + srcVar + ')';
    }
    return srcVar + '.stream()';
}

function _jsRenderStep(step, typeName, imports) {
    switch (step.kind) {
        case 'filter':
            return '.filter(' + (step.expr || 'x -> true') + ')';
        case 'map':
            return '.map(' + (step.expr || 'x -> x') + ')';
        case 'sorted': {
            const c = step.comparator;
            if (!c || c === 'naturalOrder' || (typeof c === 'object' && c.type === 'naturalOrder')) {
                return '.sorted()';
            }
            if (typeof c === 'object' && c.field) {
                imports.add('java.util.Comparator');
                const owner = typeName || 'T';
                const getter = owner + '::get' + _jsCap(c.field);
                return (
                    '.sorted(Comparator.comparing(' + getter + ')' + (c.direction === 'desc' ? '.reversed()' : '') + ')'
                );
            }
            return '.sorted()';
        }
        case 'limit':
            return '.limit(' + (step.n != null && step.n !== '' ? step.n : 10) + ')';
        case 'skip':
            return '.skip(' + (step.n != null && step.n !== '' ? step.n : 0) + ')';
        case 'distinct':
            return '.distinct()';
        case 'peek':
            return '.peek(' + (step.expr || 'System.out::println') + ')';
        case 'flatMap':
            return '.flatMap(' + (step.expr || 'x -> x.stream()') + ')';
        case 'groupBy': {
            imports.add('java.util.stream.Collectors');
            const owner = typeName || 'T';
            const getter = owner + '::get' + _jsCap(step.key || 'key');
            let downstream;
            switch (step.downstream) {
                case 'toSet':
                    downstream = 'Collectors.toSet()';
                    break;
                case 'counting':
                    downstream = 'Collectors.counting()';
                    break;
                case 'mapping':
                    downstream = 'Collectors.mapping(' + (step.mapping || 'x -> x') + ', Collectors.toList())';
                    break;
                case 'toList':
                default:
                    downstream = 'Collectors.toList()';
                    break;
            }
            return '.collect(Collectors.groupingBy(' + getter + ', ' + downstream + '))';
        }
        case 'partitionBy': {
            imports.add('java.util.stream.Collectors');
            return '.collect(Collectors.partitioningBy(' + (step.pred || 'x -> true') + '))';
        }
        default:
            return '';
    }
}

function _jsRenderTerminal(terminal, imports) {
    const t = terminal || { kind: 'collect', collect: 'toList' };
    switch (t.kind) {
        case 'collect': {
            const c = t.collect || 'toList';
            if (c === 'toMap') {
                imports.add('java.util.stream.Collectors');
                const k = t.key || 'k -> k';
                const v = t.value || 'v -> v';
                return '.collect(Collectors.toMap(' + k + ', ' + v + '))';
            }
            if (c === 'joining') {
                imports.add('java.util.stream.Collectors');
                const sep = t.sep != null ? JSON.stringify(t.sep) : '", "';
                return '.collect(Collectors.joining(' + sep + '))';
            }
            if (c === 'toSet') {
                imports.add('java.util.stream.Collectors');
                return '.collect(Collectors.toSet())';
            }
            imports.add('java.util.stream.Collectors');
            return '.collect(Collectors.toList())';
        }
        case 'findFirst':
            return '.findFirst().orElse(null)';
        case 'findAny':
            return '.findAny().orElse(null)';
        case 'count':
            return '.count()';
        case 'anyMatch':
            return '.anyMatch(' + (t.expr || 'x -> true') + ')';
        case 'allMatch':
            return '.allMatch(' + (t.expr || 'x -> true') + ')';
        case 'noneMatch':
            return '.noneMatch(' + (t.expr || 'x -> true') + ')';
        case 'forEach':
            return '.forEach(' + (t.expr || 'System.out::println') + ')';
        case 'reduce':
            if (t.identity != null && t.identity !== '') {
                return '.reduce(' + t.identity + ', ' + (t.op || '(a, b) -> a') + ')';
            }
            return '.reduce(' + (t.op || '(a, b) -> a') + ').orElse(null)';
        default:
            imports.add('java.util.stream.Collectors');
            return '.collect(Collectors.toList())';
    }
}

// 核心纯函数:生成 Stream 代码片段
function generateStreamCode(config) {
    config = config || {};
    const source = config.source || {};
    const target = config.target || {};
    const addImports = config.addImports !== false;
    const steps = Array.isArray(config.steps) ? config.steps : [];

    const srcType = (source.type || '').trim();
    const srcVar = (source.var || 'data').trim() || 'data';
    const imports = new Set();

    const streamHead = _jsSourceStream(srcType, srcVar, imports);
    const typeName = _jsTypeName(srcType);

    const parts = [streamHead];
    let consumed = false;

    for (const step of steps) {
        if (!step || !step.kind) continue;
        const rendered = _jsRenderStep(step, typeName, imports);
        if (rendered) parts.push(rendered);
        if (step.kind === 'groupBy' || step.kind === 'partitionBy') consumed = true;
    }

    if (!consumed) {
        parts.push(_jsRenderTerminal(config.terminal, imports));
    }

    let chain;
    if (parts.length <= 2) {
        chain = parts.join('');
    } else {
        chain = parts[0] + '\n        ' + parts.slice(1).join('\n        ');
    }

    let code;
    if (target.declare) {
        const tgtType = (target.type || '').trim();
        const tgtVar = (target.var || 'result').trim() || 'result';
        const decl = tgtType ? tgtType + ' ' + tgtVar : tgtVar;
        code = decl + ' = ' + chain + ';';
    } else {
        code = chain + ';';
    }

    return {
        code: code,
        imports: addImports ? Array.from(imports).sort() : [],
    };
}

// ===== UI 部分 =====
let _jsSteps = []; // 当前步骤状态

function jsReadConfig() {
    return {
        source: {
            type: (document.getElementById('jsSrcType').value || '').trim(),
            var: (document.getElementById('jsSrcVar').value || '').trim() || 'users',
        },
        target: {
            declare: document.getElementById('jsDeclare').checked,
            var: (document.getElementById('jsTgtVar').value || '').trim() || 'result',
            type: (document.getElementById('jsTgtType').value || '').trim(),
        },
        terminal: jsReadTerminal(),
        addImports: document.getElementById('jsAddImports').checked,
    };
}

function jsReadTerminal() {
    const sel = document.getElementById('jsTerminal');
    const idx = parseInt(sel.value, 10);
    const def = TERMINAL_DEFS[idx] || TERMINAL_DEFS[0];
    const out = { kind: def.kind };
    if (def.kind === 'collect') {
        out.collect = def.collect;
        if (def.needsKv) {
            out.key = (document.getElementById('jsTk').value || '').trim() || 'k -> k';
            out.value = (document.getElementById('jsTv').value || '').trim() || 'v -> v';
        }
        if (def.needsSep) {
            out.sep = document.getElementById('jsTsep').value;
        }
    } else if (def.needsExpr) {
        out.expr = (document.getElementById('jsTexpr').value || '').trim() || 'x -> true';
    } else if (def.needsReduce) {
        out.identity = document.getElementById('jsTid').value;
        out.op = (document.getElementById('jsTop').value || '').trim() || '(a, b) -> a';
    }
    return out;
}

function jsReadSteps() {
    return _jsSteps.map((s) => {
        if (s.kind === 'limit' || s.kind === 'skip') return { kind: s.kind, n: parseInt(s.n, 10) || 0 };
        if (s.kind === 'filter' || s.kind === 'map' || s.kind === 'peek' || s.kind === 'flatMap') {
            return { kind: s.kind, expr: s.expr };
        }
        if (s.kind === 'sorted') return { kind: 'sorted', comparator: s.comparator };
        if (s.kind === 'distinct') return { kind: 'distinct' };
        if (s.kind === 'groupBy') {
            const out = { kind: 'groupBy', key: s.key, downstream: s.downstream };
            if (s.downstream === 'mapping') out.mapping = s.mapping;
            return out;
        }
        if (s.kind === 'partitionBy') return { kind: 'partitionBy', pred: s.pred };
        return { kind: s.kind };
    });
}

function jsRender() {
    const container = document.getElementById('jsSteps');
    if (!container) return;
    container.innerHTML = _jsSteps
        .map((s, i) => {
            const def = STEP_DEFS.find((d) => d.kind === s.kind) || STEP_DEFS[0];
            let params = '';
            if (def.needsExpr) {
                params =
                    '<input class="js-param" data-i="' +
                    i +
                    '" data-k="expr" placeholder="' +
                    escapeHtml(def.exprPlaceholder || 'expr') +
                    '" value="' +
                    escapeHtml(s.expr || '') +
                    '" style="flex:1;min-width:160px">';
            } else if (def.needsN) {
                params =
                    '<input class="js-param" data-i="' +
                    i +
                    '" data-k="n" placeholder="N" type="number" value="' +
                    escapeHtml(String(s.n != null ? s.n : '')) +
                    '" style="width:80px">';
            } else if (def.needsComparator) {
                const c = s.comparator || { type: 'naturalOrder' };
                const isField = c.type === 'field';
                params =
                    '<select class="js-param js-comp-type" data-i="' +
                    i +
                    '" data-k="compType" style="width:120px">' +
                    '<option value="naturalOrder"' +
                    (c.type === 'naturalOrder' ? ' selected' : '') +
                    '>naturalOrder</option>' +
                    '<option value="field"' +
                    (isField ? ' selected' : '') +
                    '>byField</option>' +
                    '</select>' +
                    (isField
                        ? '<input class="js-param" data-i="' +
                          i +
                          '" data-k="field" placeholder="name" value="' +
                          escapeHtml(c.field || '') +
                          '" style="width:100px">' +
                          '<select class="js-param" data-i="' +
                          i +
                          '" data-k="direction" style="width:80px">' +
                          '<option value="asc"' +
                          (c.direction !== 'desc' ? ' selected' : '') +
                          '>asc</option>' +
                          '<option value="desc"' +
                          (c.direction === 'desc' ? ' selected' : '') +
                          '>desc</option>' +
                          '</select>'
                        : '');
            } else if (def.needsGroup) {
                params =
                    '<input class="js-param" data-i="' +
                    i +
                    '" data-k="key" placeholder="key 字段" value="' +
                    escapeHtml(s.key || '') +
                    '" style="width:110px">' +
                    '<select class="js-param" data-i="' +
                    i +
                    '" data-k="downstream" style="width:110px">' +
                    ['toList', 'toSet', 'counting', 'mapping']
                        .map(
                            (v) =>
                                '<option value="' +
                                v +
                                '"' +
                                (s.downstream === v ? ' selected' : '') +
                                '>' +
                                v +
                                '</option>'
                        )
                        .join('') +
                    '</select>' +
                    (s.downstream === 'mapping'
                        ? '<input class="js-param" data-i="' +
                          i +
                          '" data-k="mapping" placeholder="x -> x" value="' +
                          escapeHtml(s.mapping || '') +
                          '" style="flex:1;min-width:120px">'
                        : '');
            } else if (def.needsPred) {
                params =
                    '<input class="js-param" data-i="' +
                    i +
                    '" data-k="pred" placeholder="u -> u.isActive()" value="' +
                    escapeHtml(s.pred || '') +
                    '" style="flex:1;min-width:160px">';
            }
            const kindOpts = STEP_DEFS.map(
                (d) =>
                    '<option value="' +
                    d.kind +
                    '"' +
                    (d.kind === s.kind ? ' selected' : '') +
                    '>' +
                    d.label +
                    '</option>'
            ).join('');
            return (
                '<div class="js-step">' +
                '<select class="js-kind" data-i="' +
                i +
                '">' +
                kindOpts +
                '</select>' +
                params +
                '<button class="js-del" data-i="' +
                i +
                '" title="删除">×</button>' +
                '</div>'
            );
        })
        .join('');
    jsGenerate();
}

function jsRenderTerminal() {
    const sel = document.getElementById('jsTerminal');
    sel.innerHTML = TERMINAL_DEFS.map((t, i) => '<option value="' + i + '">' + t.label + '</option>').join('');
    jsRenderTerminalExtra();
}

function jsRenderTerminalExtra() {
    const idx = parseInt(document.getElementById('jsTerminal').value, 10);
    const def = TERMINAL_DEFS[idx];
    const box = document.getElementById('jsTerminalExtra');
    if (!box) return;
    let html = '';
    if (def.needsKv) {
        html =
            '<input id="jsTk" placeholder="key: x -> x" value="k -> k" style="width:160px">' +
            '<input id="jsTv" placeholder="value: x -> x" value="v -> v" style="width:160px">';
    } else if (def.needsSep) {
        html = '<input id="jsTsep" placeholder="分隔符" value=", " style="width:120px">';
    } else if (def.needsExpr) {
        html = '<input id="jsTexpr" placeholder="lambda" value="x -> true" style="flex:1;min-width:200px">';
    } else if (def.needsReduce) {
        html =
            '<input id="jsTid" placeholder="identity (可空)" style="width:140px">' +
            '<input id="jsTop" placeholder="op" value="(a, b) -> a" style="width:160px">';
    }
    box.innerHTML = html;
    jsGenerate();
}

function jsGenerate() {
    const config = jsReadConfig();
    config.steps = jsReadSteps();
    const result = generateStreamCode(config);
    const out = document.getElementById('jsOutput');
    const importsEl = document.getElementById('jsImports');
    if (importsEl) {
        importsEl.textContent = result.imports.length ? result.imports.join('\n') : '// (无新增 import)';
    }
    if (out) out.textContent = result.code;
}

function jsAddStep() {
    _jsSteps.push({ kind: 'filter', expr: '' });
    jsRender();
}

function jsAddSample() {
    _jsSteps = [
        { kind: 'filter', expr: 'u -> u.getAge() >= 18' },
        { kind: 'map', expr: 'User::getName' },
        { kind: 'sorted', comparator: { type: 'field', field: 'name', direction: 'asc' } },
    ];
    const tSel = document.getElementById('jsTerminal');
    const idx = TERMINAL_DEFS.findIndex((t) => t.kind === 'collect' && t.collect === 'toList');
    if (idx >= 0) tSel.value = String(idx);
    jsRenderTerminalExtra();
    jsRender();
}

function jsClearAll() {
    _jsSteps = [];
    jsRender();
}

function jsRemoveStep(i) {
    _jsSteps.splice(i, 1);
    jsRender();
}

function jsCopy() {
    const out = document.getElementById('jsOutput');
    if (out) copyText(out);
}

function jsInit() {
    const stepsEl = document.getElementById('jsSteps');
    if (stepsEl) {
        stepsEl.addEventListener('change', (e) => {
            const t = e.target;
            const i = parseInt(t.dataset.i, 10);
            if (Number.isNaN(i) || !_jsSteps[i]) return;
            if (t.classList.contains('js-kind')) {
                const def = STEP_DEFS.find((d) => d.kind === t.value) || STEP_DEFS[0];
                if (def.needsExpr) _jsSteps[i] = { kind: def.kind, expr: '' };
                else if (def.needsN) _jsSteps[i] = { kind: def.kind, n: 10 };
                else if (def.needsComparator) _jsSteps[i] = { kind: 'sorted', comparator: { type: 'naturalOrder' } };
                else if (def.needsGroup) _jsSteps[i] = { kind: 'groupBy', key: '', downstream: 'toList' };
                else if (def.needsPred) _jsSteps[i] = { kind: 'partitionBy', pred: '' };
                else _jsSteps[i] = { kind: def.kind };
            } else if (t.classList.contains('js-comp-type')) {
                if (t.value === 'naturalOrder') {
                    _jsSteps[i].comparator = { type: 'naturalOrder' };
                } else {
                    _jsSteps[i].comparator = { type: 'field', field: '', direction: 'asc' };
                }
            } else if (t.dataset.k === 'downstream') {
                _jsSteps[i].downstream = t.value;
                if (t.value !== 'mapping') delete _jsSteps[i].mapping;
            } else if (t.dataset.k === 'direction') {
                _jsSteps[i].comparator.direction = t.value;
            } else if (t.dataset.k) {
                _jsSteps[i][t.dataset.k] = t.value;
            }
            jsRender();
        });
        stepsEl.addEventListener('input', (e) => {
            const t = e.target;
            const i = parseInt(t.dataset.i, 10);
            if (Number.isNaN(i) || !_jsSteps[i]) return;
            if (t.dataset.k) {
                _jsSteps[i][t.dataset.k] = t.value;
                if (t.dataset.k === 'compType') {
                    if (t.value === 'naturalOrder') _jsSteps[i].comparator = { type: 'naturalOrder' };
                }
                jsGenerate();
            }
        });
        stepsEl.addEventListener('click', (e) => {
            if (e.target.classList.contains('js-del')) {
                jsRemoveStep(parseInt(e.target.dataset.i, 10));
            }
        });
    }
    const termBox = document.getElementById('jsTerminalExtra');
    if (termBox) {
        termBox.addEventListener('input', jsGenerate);
    }
    ['jsSrcType', 'jsSrcVar', 'jsTgtVar', 'jsTgtType', 'jsDeclare', 'jsAddImports'].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', jsGenerate);
        el.addEventListener('change', jsGenerate);
    });
    const tSel = document.getElementById('jsTerminal');
    if (tSel) tSel.addEventListener('change', jsRenderTerminalExtra);
    jsRenderTerminal();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generateStreamCode };
}

if (typeof registerInit !== 'undefined') {
    registerInit('javastream', jsInit);
}
