// JMH 进阶配置生成器
// 核心: generateJmhClass(packageName, className, methods, global, opts) -> string
// methods: [{name, returnType, params:[{name, values:[string]}]|null, group:null|{name, groupThreads, role:'A'|'B'}}]
// global : {mode:[string], outputTimeUnit, threads, fork:{value, jvmArgs}, warmup, measurement, timeout, stateScope, compilerControl}
// opts   : {addMain, addSetup, addTearDown}

const BENCHMARK_MODES = ['Throughput', 'AverageTime', 'SampleTime', 'SingleShotTime', 'All'];
const TIME_UNITS = ['NANOSECONDS', 'MICROSECONDS', 'MILLISECONDS', 'SECONDS', 'MINUTES', 'HOURS', 'DAYS'];
const STATE_SCOPES = ['Thread', 'Benchmark', 'Group'];
const COMPILER_MODES = [
    'INTRINSIC',
    'NONINTRINSIC',
    'EXCLUSIVE',
    'DONTINLINE',
    'BYTE_FORCE_PRIMITIVE',
    'BYTE_FORCE_NON_PRIMITIVE',
];
const RETURN_TYPES = ['void', 'int', 'long', 'double', 'String', 'boolean', 'Object'];

const JMH_IMPORTS_BASE = [
    'org.openjdk.jmh.annotations.*',
    'org.openjdk.jmh.runner.Runner',
    'org.openjdk.jmh.runner.options.Options',
    'org.openjdk.jmh.runner.options.OptionsBuilder',
    'java.util.concurrent.TimeUnit',
];

function _jmpNum(v, d) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : d;
}

function _jmpSplitJvmArgs(s) {
    return (s || '')
        .split(/[\r\n,;]/)
        .map((x) => x.trim())
        .filter(Boolean);
}

// ===== 纯函数（与 UI 解耦，可单测）=====

function defaultConfig() {
    return {
        package: 'com.example',
        className: 'MyBenchmark',
        methods: [{ name: 'baseline', returnType: 'void', params: [], group: null }],
        global: {
            mode: ['Throughput'],
            outputTimeUnit: 'MILLISECONDS',
            threads: 1,
            fork: { value: 1, jvmArgs: '-Xms512m,-Xmx512m' },
            warmup: { iterations: 5, time: 1, timeUnit: 'SECONDS', batchSize: 1 },
            measurement: { iterations: 5, time: 1, timeUnit: 'SECONDS', batchSize: 1 },
            timeout: { time: 10, timeUnit: 'MINUTES' },
            stateScope: 'Thread',
            compilerControl: null,
        },
        opts: { addMain: true, addSetup: true, addTearDown: true },
    };
}

function validateConfig(config) {
    const errs = [];
    if (!config || typeof config !== 'object') {
        errs.push({ field: 'config', msg: '配置为空' });
        return errs;
    }
    const methods = Array.isArray(config.methods) ? config.methods : [];
    if (methods.length === 0) {
        errs.push({ field: 'methods', msg: '至少需要一个基准方法' });
    }
    const seenNames = new Set();
    methods.forEach((m, i) => {
        if (!m || typeof m.name !== 'string' || !m.name.trim()) {
            errs.push({ field: 'methods[' + i + '].name', msg: '方法名不能为空' });
            return;
        }
        const nm = m.name.trim();
        if (seenNames.has(nm)) {
            errs.push({ field: 'methods[' + i + '].name', msg: '方法名重复: ' + nm });
        }
        seenNames.add(nm);
        if (Array.isArray(m.params)) {
            m.params.forEach((p, j) => {
                if (!p || !p.name) {
                    errs.push({
                        field: 'methods[' + i + '].params[' + j + ']',
                        msg: '@Param 名称不能为空',
                    });
                } else if (!Array.isArray(p.values) || p.values.length === 0) {
                    errs.push({
                        field: 'methods[' + i + '].params[' + j + '].values',
                        msg: '@Param 至少需要一个值',
                    });
                }
            });
        }
        if (m.group && !m.group.name) {
            errs.push({ field: 'methods[' + i + '].group.name', msg: '@Group 名称不能为空' });
        }
    });
    const g = config.global || {};
    if (Array.isArray(g.mode) && g.mode.length > 0) {
        g.mode.forEach((m, i) => {
            if (BENCHMARK_MODES.indexOf(m) < 0) {
                errs.push({ field: 'global.mode[' + i + ']', msg: '未知 BenchmarkMode: ' + m });
            }
        });
    }
    if (g.outputTimeUnit && TIME_UNITS.indexOf(g.outputTimeUnit) < 0) {
        errs.push({ field: 'global.outputTimeUnit', msg: '未知 TimeUnit: ' + g.outputTimeUnit });
    }
    if (g.stateScope && STATE_SCOPES.indexOf(g.stateScope) < 0) {
        errs.push({ field: 'global.stateScope', msg: '未知 Scope: ' + g.stateScope });
    }
    if (g.compilerControl && COMPILER_MODES.indexOf(g.compilerControl) < 0) {
        errs.push({
            field: 'global.compilerControl',
            msg: '未知 CompilerControl.Mode: ' + g.compilerControl,
        });
    }
    return errs;
}

function renderImports(usedImports) {
    const list = Array.isArray(usedImports) ? usedImports : [];
    const set = new Set();
    for (const it of list) {
        if (it) set.add(it);
    }
    return Array.from(set).sort();
}

function _jmpRenderHeader(global) {
    const g = global || {};
    const mode = Array.isArray(g.mode) && g.mode.length ? g.mode : ['Throughput'];
    const out = [];
    if (mode.indexOf('All') >= 0 && mode.length === 1) {
        out.push('@BenchmarkMode(Mode.All)');
        out.push('// Mode.All 等同于依次执行以下 4 种子模式:');
        ['Throughput', 'AverageTime', 'SampleTime', 'SingleShotTime'].forEach((m) => {
            out.push('//   - Mode.' + m);
        });
    } else if (mode.length === 1) {
        out.push('@BenchmarkMode(Mode.' + mode[0] + ')');
    } else if (mode.indexOf('All') >= 0) {
        out.push('@BenchmarkMode(Mode.All)');
    } else {
        out.push('@BenchmarkMode({ ' + mode.map((m) => 'Mode.' + m).join(', ') + ' })');
    }
    if (g.compilerControl) {
        out.push('@CompilerControl(CompilerControl.Mode.' + g.compilerControl + ')');
    }
    out.push('@OutputTimeUnit(TimeUnit.' + (g.outputTimeUnit || 'MILLISECONDS') + ')');
    const threads = _jmpNum(g.threads, 1);
    if (threads && threads !== 1) {
        out.push('@Threads(' + threads + ')');
    }
    const fork = g.fork || {};
    const fv = _jmpNum(fork.value, 1);
    const args = _jmpSplitJvmArgs(fork.jvmArgs);
    if (args.length) {
        out.push('@Fork(value = ' + fv + ', jvmArgs = {"' + args.join('", "') + '"})');
    } else {
        out.push('@Fork(' + fv + ')');
    }
    const warm = g.warmup || {};
    const wi = _jmpNum(warm.iterations, 5);
    const wt = _jmpNum(warm.time, 1);
    const wu = warm.timeUnit || 'SECONDS';
    const wbs = warm.batchSize && warm.batchSize !== 1 ? ', batchSize = ' + warm.batchSize : '';
    out.push('@Warmup(iterations = ' + wi + ', time = ' + wt + ', timeUnit = TimeUnit.' + wu + wbs + ')');
    const meas = g.measurement || {};
    const mi = _jmpNum(meas.iterations, 5);
    const mt = _jmpNum(meas.time, 1);
    const mu = meas.timeUnit || 'SECONDS';
    const mbs = meas.batchSize && meas.batchSize !== 1 ? ', batchSize = ' + meas.batchSize : '';
    out.push('@Measurement(iterations = ' + mi + ', time = ' + mt + ', timeUnit = TimeUnit.' + mu + mbs + ')');
    if (g.timeout && _jmpNum(g.timeout.time, 0) > 0) {
        out.push(
            '@Timeout(time = ' +
                _jmpNum(g.timeout.time, 0) +
                ', timeUnit = TimeUnit.' +
                (g.timeout.timeUnit || 'MINUTES') +
                ')'
        );
    }
    out.push('@State(Scope.' + (g.stateScope || 'Thread') + ')');
    return out;
}

function generateMethod(methodDef, stateClass) {
    const m = methodDef || {};
    const name = m.name || 'myMethod';
    const ret = m.returnType || 'void';
    const group = m.group;
    const paramNames = Array.isArray(m.params) ? m.params.map((p) => p.name).filter(Boolean) : [];
    let sig = '    @Benchmark\n';
    if (group) {
        sig += '    @Group("' + group.name + '")\n';
        if (group.groupThreads && group.groupThreads !== 1) {
            sig += '    @GroupThreads(' + (group.groupThreads || 1) + ')\n';
        }
    }
    sig += '    public ' + ret + ' ' + name + '() {\n';
    const body = [];
    if (group) {
        if (group.role === 'B') {
            body.push('        // role B: 消费者,等待生产者信号');
            body.push('        long startNanos = phaser.arrive();');
            body.push('        // TODO: 在此访问 producer 产出的数据');
            body.push('        phaser.awaitAdvance(startNanos);');
        } else {
            body.push('        // role A: 生产者,广播到达信号');
            body.push('        phaser.awaitAdvance(phaser.arrive());');
        }
    } else {
        body.push('        // TODO: 实现被测逻辑');
        if (paramNames.length) {
            body.push('        // 当前参数: ' + paramNames.join(', '));
        }
    }
    if (ret !== 'void') {
        let retVal = 'null';
        if (ret === 'String') retVal = '""';
        else if (ret === 'boolean') retVal = 'false';
        else if (ret === 'int' || ret === 'long' || ret === 'double') retVal = '0';
        body.push('        return ' + retVal + ';');
    }
    return sig + body.join('\n') + '\n    }';
}

function generateJmhClass(packageName, className, methods, global, opts) {
    const o = opts || {};
    const addMain = o.addMain !== false;
    const addSetup = o.addSetup !== false;
    const addTearDown = o.addTearDown !== false;
    const safeMethods = Array.isArray(methods) ? methods.filter((m) => m && m.name) : [];
    const stateScope = (global && global.stateScope) || 'Thread';
    const hasGroup = safeMethods.some((m) => m.group);
    const usePhaser = hasGroup && stateScope === 'Group';

    // 收集去重的 @Param 字段
    const paramMap = new Map();
    for (const m of safeMethods) {
        if (!Array.isArray(m.params)) continue;
        for (const p of m.params) {
            if (!p || !p.name) continue;
            if (!paramMap.has(p.name)) {
                paramMap.set(p.name, {
                    name: p.name,
                    values: Array.isArray(p.values) ? p.values.slice() : [],
                });
            }
        }
    }

    const headerAnnos = _jmpRenderHeader(global);
    const cn = (className || 'MyBenchmark').replace(/[^A-Za-z0-9_$]/g, '');
    const pkg = (packageName || '').trim();

    const imports = JMH_IMPORTS_BASE.slice();
    if (usePhaser) imports.push('java.util.concurrent.Phaser');

    const parts = [];
    if (pkg) {
        parts.push('package ' + pkg + ';');
        parts.push('');
    }
    parts.push(imports.map((s) => 'import ' + s + ';').join('\n'));
    parts.push('');
    parts.push(headerAnnos.join('\n'));
    parts.push('public class ' + cn + ' {');
    parts.push('');

    // @Param 字段
    if (paramMap.size) {
        for (const [, p] of paramMap) {
            const values = (p.values || []).length
                ? '{' + p.values.map((v) => JSON.stringify(String(v))).join(', ') + '}'
                : '{}';
            parts.push('    @Param(' + values + ')');
            parts.push('    private String ' + p.name + ';');
            parts.push('');
        }
    }
    if (usePhaser) {
        parts.push('    private Phaser phaser;');
        parts.push('');
    }
    if (addSetup) {
        if (usePhaser) {
            let sz = 0;
            for (const m of safeMethods) {
                if (m.group) sz += m.group.groupThreads && m.group.groupThreads !== 1 ? m.group.groupThreads : 1;
            }
            parts.push('    @Setup(Level.Trial)');
            parts.push('    public void setup() {');
            parts.push('        phaser = new Phaser(' + sz + ');');
            parts.push('    }');
            parts.push('');
        } else {
            parts.push('    @Setup');
            parts.push('    public void setup() {');
            parts.push('        // TODO: 初始化被测对象');
            parts.push('    }');
            parts.push('');
        }
    }
    if (addTearDown) {
        parts.push('    @TearDown');
        parts.push('    public void tearDown() {');
        parts.push('        // TODO: 清理资源');
        parts.push('    }');
        parts.push('');
    }
    safeMethods.forEach((m) => {
        parts.push(generateMethod(m, cn));
        parts.push('');
    });
    if (addMain) {
        parts.push('    public static void main(String[] args) throws Exception {');
        parts.push('        Options opt = new OptionsBuilder()');
        parts.push('                .include("' + (pkg ? pkg + '.' : '') + cn + '")');
        parts.push('                .build();');
        parts.push('        new Runner(opt).run();');
        parts.push('    }');
        parts.push('');
    }
    parts.push('}');
    return parts.join('\n');
}

// ===== UI 部分 =====

let _jmpMethods = [];

function _jmpCloneMethod(m) {
    return {
        name: m.name || '',
        returnType: m.returnType || 'void',
        params: (m.params || []).map((p) => ({
            name: p.name || '',
            values: Array.isArray(p.values) ? p.values.slice() : [],
        })),
        group: m.group
            ? {
                  name: m.group.name || '',
                  groupThreads: m.group.groupThreads || 1,
                  role: m.group.role || 'A',
              }
            : null,
    };
}

function _jmpReadGlobal() {
    const modeChecks = document.querySelectorAll('.jmp-mode');
    const mode = [];
    modeChecks.forEach((c) => {
        if (c.checked) mode.push(c.value);
    });
    return {
        mode: mode.length ? mode : ['Throughput'],
        outputTimeUnit: document.getElementById('jmpOutTime').value || 'MILLISECONDS',
        threads: parseInt(document.getElementById('jmpThreads').value, 10) || 1,
        fork: {
            value: parseInt(document.getElementById('jmpFork').value, 10) || 1,
            jvmArgs: document.getElementById('jmpJvmArgs').value || '',
        },
        warmup: {
            iterations: parseInt(document.getElementById('jmpWi').value, 10) || 5,
            time: parseInt(document.getElementById('jmpWt').value, 10) || 1,
            timeUnit: document.getElementById('jmpWtu').value || 'SECONDS',
            batchSize: parseInt(document.getElementById('jmpWb').value, 10) || 1,
        },
        measurement: {
            iterations: parseInt(document.getElementById('jmpMi').value, 10) || 5,
            time: parseInt(document.getElementById('jmpMt').value, 10) || 1,
            timeUnit: document.getElementById('jmpMtu').value || 'SECONDS',
            batchSize: parseInt(document.getElementById('jmpMb').value, 10) || 1,
        },
        timeout: {
            time: parseInt(document.getElementById('jmpTo').value, 10) || 0,
            timeUnit: document.getElementById('jmpTotu').value || 'MINUTES',
        },
        stateScope: document.getElementById('jmpStateScope').value || 'Thread',
        compilerControl: document.getElementById('jmpCC').value || null,
    };
}

function _jmpReadOpts() {
    return {
        addMain: document.getElementById('jmpAddMain').checked,
        addSetup: document.getElementById('jmpAddSetup').checked,
        addTearDown: document.getElementById('jmpAddTearDown').checked,
    };
}

function jmpAddMethod() {
    const n = _jmpMethods.length + 1;
    _jmpMethods.push({
        name: 'myMethod' + n,
        returnType: 'void',
        params: [],
        group: null,
    });
    jmpRenderMethods();
}

function jmpDelMethod(i) {
    _jmpMethods.splice(i, 1);
    jmpRenderMethods();
}

function _jmpAddCompanion(i) {
    const m = _jmpMethods[i];
    if (!m || !m.group) return;
    const role = m.group.role === 'A' ? 'B' : 'A';
    const newName = m.name + (role === 'B' ? '_consumer' : '_producer');
    if (_jmpMethods.some((x) => x.name === newName)) {
        toast('已存在同名方法: ' + newName);
        return;
    }
    _jmpMethods.push({
        name: newName,
        returnType: 'void',
        params: [],
        group: {
            name: m.group.name,
            groupThreads: m.group.groupThreads || 1,
            role: role,
        },
    });
    jmpRenderMethods();
}

function _jmpAddParam(i) {
    if (!_jmpMethods[i].params) _jmpMethods[i].params = [];
    _jmpMethods[i].params.push({ name: 'size', values: [] });
    jmpRenderMethods();
}

function _jmpDelParam(i, j) {
    _jmpMethods[i].params.splice(j, 1);
    jmpRenderMethods();
}

function jmpRenderMethods() {
    const container = document.getElementById('jmpMethods');
    if (!container) return;
    container.innerHTML = _jmpMethods
        .map((m, i) => {
            const groupEnabled = !!m.group;
            const paramRows = (m.params || [])
                .map(
                    (p, j) =>
                        '<div class="jmp-param-row">' +
                        '<input class="jmp-p-name" data-mi="' +
                        i +
                        '" data-pi="' +
                        j +
                        '" placeholder="name" value="' +
                        escapeHtml(p.name || '') +
                        '" style="width:90px">' +
                        '<textarea class="jmp-p-values" data-mi="' +
                        i +
                        '" data-pi="' +
                        j +
                        '" placeholder="多个值,逗号/换行分隔">' +
                        escapeHtml((p.values || []).join(', ')) +
                        '</textarea>' +
                        '<button class="jmp-p-del" data-mi="' +
                        i +
                        '" data-pi="' +
                        j +
                        '" title="删除 @Param">×</button>' +
                        '</div>'
                )
                .join('');
            const roleOpts =
                '<option value="A"' +
                (m.group && m.group.role === 'A' ? ' selected' : '') +
                '>A 生产者</option>' +
                '<option value="B"' +
                (m.group && m.group.role === 'B' ? ' selected' : '') +
                '>B 消费者</option>';
            const groupBlock = groupEnabled
                ? '<div class="jmp-section-title">' +
                  '@Group 详情' +
                  '<button class="jmp-act-btn" data-mi="' +
                  i +
                  '" data-act="add-companion">+ 添加对端</button>' +
                  '</div>' +
                  '<div class="jmp-group-row">' +
                  '<span class="jmp-mini-label">@Group</span>' +
                  '<input class="jmp-m-gname" data-mi="' +
                  i +
                  '" placeholder="g1" value="' +
                  escapeHtml(m.group.name || '') +
                  '" style="width:90px">' +
                  '<span class="jmp-mini-label">Threads</span>' +
                  '<input class="jmp-m-gthreads" data-mi="' +
                  i +
                  '" min="1" type="number" value="' +
                  (m.group.groupThreads || 1) +
                  '" style="width:60px">' +
                  '<span class="jmp-mini-label">角色</span>' +
                  '<select class="jmp-m-grole" data-mi="' +
                  i +
                  '" style="width:90px">' +
                  roleOpts +
                  '</select>' +
                  '</div>'
                : '';
            return (
                '<div class="jmp-method-card">' +
                '<div class="jmp-method-head">' +
                '<span class="jmp-method-no">#' +
                (i + 1) +
                '</span>' +
                '<input class="jmp-m-name" data-mi="' +
                i +
                '" placeholder="方法名" value="' +
                escapeHtml(m.name || '') +
                '">' +
                '<select class="jmp-m-ret" data-mi="' +
                i +
                '" style="width:90px">' +
                RETURN_TYPES.map(
                    (t) => '<option value="' + t + '"' + (m.returnType === t ? ' selected' : '') + '>' + t + '</option>'
                ).join('') +
                '</select>' +
                '<label class="jmp-cb"><input type="checkbox" class="jmp-m-groupenabled" data-mi="' +
                i +
                '"' +
                (groupEnabled ? ' checked' : '') +
                '> @Group</label>' +
                '<button class="jmp-m-del" data-mi="' +
                i +
                '" title="删除方法">×</button>' +
                '</div>' +
                '<div class="jmp-method-body">' +
                '<div class="jmp-section-title">' +
                '@Param 列表' +
                '<button class="jmp-act-btn" data-mi="' +
                i +
                '" data-act="add-param">+ 添加 @Param</button>' +
                '</div>' +
                '<div class="jmp-params-list">' +
                paramRows +
                '</div>' +
                groupBlock +
                '</div>' +
                '</div>'
            );
        })
        .join('');
    jmpGenerate();
}

function jmpBindMethodsEvents() {
    const container = document.getElementById('jmpMethods');
    if (!container || container._bound) return;
    container._bound = true;
    container.addEventListener('input', (e) => {
        const t = e.target;
        const i = parseInt(t.dataset.mi, 10);
        const pi = parseInt(t.dataset.pi, 10);
        if (Number.isNaN(i) || !_jmpMethods[i]) return;
        if (t.classList.contains('jmp-m-name')) _jmpMethods[i].name = t.value;
        else if (t.classList.contains('jmp-m-ret')) _jmpMethods[i].returnType = t.value;
        else if (t.classList.contains('jmp-p-name') && _jmpMethods[i].params[pi])
            _jmpMethods[i].params[pi].name = t.value;
        else if (t.classList.contains('jmp-p-values') && _jmpMethods[i].params[pi]) {
            _jmpMethods[i].params[pi].values = t.value
                .split(/[\r\n,]/)
                .map((s) => s.trim())
                .filter(Boolean);
        } else if (t.classList.contains('jmp-m-gname') && _jmpMethods[i].group) _jmpMethods[i].group.name = t.value;
        else if (t.classList.contains('jmp-m-gthreads') && _jmpMethods[i].group)
            _jmpMethods[i].group.groupThreads = parseInt(t.value, 10) || 1;
        jmpGenerate();
    });
    container.addEventListener('change', (e) => {
        const t = e.target;
        const i = parseInt(t.dataset.mi, 10);
        if (Number.isNaN(i) || !_jmpMethods[i]) return;
        if (t.classList.contains('jmp-m-groupenabled')) {
            _jmpMethods[i].group = t.checked ? { name: 'g1', groupThreads: 1, role: 'A' } : null;
            jmpRenderMethods();
        } else if (t.classList.contains('jmp-m-grole') && _jmpMethods[i].group) {
            _jmpMethods[i].group.role = t.value;
            jmpGenerate();
        }
    });
    container.addEventListener('click', (e) => {
        const t = e.target;
        const i = parseInt(t.dataset.mi, 10);
        const pi = parseInt(t.dataset.pi, 10);
        if (Number.isNaN(i)) return;
        if (t.classList.contains('jmp-m-del')) {
            jmpDelMethod(i);
        } else if (t.classList.contains('jmp-p-del')) {
            if (!Number.isNaN(pi)) _jmpDelParam(i, pi);
        } else if (t.dataset.act === 'add-param') {
            _jmpAddParam(i);
        } else if (t.dataset.act === 'add-companion') {
            _jmpAddCompanion(i);
        }
    });
}

function jmpGenerate() {
    const out = document.getElementById('jmpOutput');
    if (!out) return;
    const cfg = defaultConfig();
    cfg.package = (document.getElementById('jmpPackage').value || '').trim();
    cfg.className = (document.getElementById('jmpClass').value || '').trim() || 'MyBenchmark';
    cfg.methods = _jmpMethods.map(_jmpCloneMethod);
    cfg.global = _jmpReadGlobal();
    cfg.opts = _jmpReadOpts();
    const errs = validateConfig(cfg);
    if (errs.length) {
        out.textContent = '配置校验失败:\n' + errs.map((e) => '  [' + e.field + '] ' + e.msg).join('\n');
        out.className = 'output-box error';
        setStatus('配置有 ' + errs.length + ' 项错误');
        return;
    }
    const code = generateJmhClass(cfg.package, cfg.className, cfg.methods, cfg.global, cfg.opts);
    out.textContent = code;
    out.className = 'output-box';
    setStatus('JMH 进阶代码已生成 (' + code.length + ' 字节)');
}

function jmpCopy() {
    const id = _jmpCurrentMode === 'basic' ? 'jmpBasicOutput' : 'jmpOutput';
    const el = document.getElementById(id);
    if (el) copyText(el);
}

function jmpLoadConfig(cfg) {
    cfg = cfg || defaultConfig();
    const packageEl = document.getElementById('jmpPackage');
    const classEl = document.getElementById('jmpClass');
    if (packageEl) packageEl.value = cfg.package || 'com.example';
    if (classEl) classEl.value = cfg.className || 'MyBenchmark';
    document.querySelectorAll('.jmp-mode').forEach((c) => {
        c.checked = (cfg.global.mode || []).indexOf(c.value) >= 0;
    });
    document.getElementById('jmpOutTime').value = cfg.global.outputTimeUnit || 'MILLISECONDS';
    document.getElementById('jmpThreads').value = cfg.global.threads || 1;
    document.getElementById('jmpFork').value = (cfg.global.fork || {}).value || 1;
    document.getElementById('jmpJvmArgs').value = (cfg.global.fork || {}).jvmArgs || '';
    const w = cfg.global.warmup || {};
    document.getElementById('jmpWi').value = w.iterations || 5;
    document.getElementById('jmpWt').value = w.time || 1;
    document.getElementById('jmpWtu').value = w.timeUnit || 'SECONDS';
    document.getElementById('jmpWb').value = w.batchSize || 1;
    const mm = cfg.global.measurement || {};
    document.getElementById('jmpMi').value = mm.iterations || 5;
    document.getElementById('jmpMt').value = mm.time || 1;
    document.getElementById('jmpMtu').value = mm.timeUnit || 'SECONDS';
    document.getElementById('jmpMb').value = mm.batchSize || 1;
    const to = cfg.global.timeout || {};
    document.getElementById('jmpTo').value = to.time || 10;
    document.getElementById('jmpTotu').value = to.timeUnit || 'MINUTES';
    document.getElementById('jmpStateScope').value = cfg.global.stateScope || 'Thread';
    document.getElementById('jmpCC').value = cfg.global.compilerControl || '';
    document.getElementById('jmpAddMain').checked = cfg.opts.addMain !== false;
    document.getElementById('jmpAddSetup').checked = cfg.opts.addSetup !== false;
    document.getElementById('jmpAddTearDown').checked = cfg.opts.addTearDown !== false;
    _jmpMethods = cfg.methods.map(_jmpCloneMethod);
    jmpRenderMethods();
}

// ===== 基础模式（与原 jmh 工具等价，便于单测）=====

function _jmpNumOr(v, d) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : d;
}

function generateBasicJmh(opts) {
    const o = opts || {};
    const className = (o.className || 'MyBenchmark').trim() || 'MyBenchmark';
    const methodName = (o.methodName || 'myMethod').trim() || 'myMethod';
    const mode = o.mode || 'Throughput';
    const fork = _jmpNumOr(o.fork, 1);
    const warmupIter = _jmpNumOr(o.warmupIter, 5);
    const warmupTime = _jmpNumOr(o.warmupTime, 1);
    const measureIter = _jmpNumOr(o.measureIter, 5);
    const measureTime = _jmpNumOr(o.measureTime, 1);
    const state = o.state !== false;

    const modeLabel =
        {
            Throughput: 'Mode.Throughput',
            AverageTime: 'Mode.AverageTime',
            SampleTime: 'Mode.SampleTime',
            SingleShotTime: 'Mode.SingleShotTime',
            All: 'Mode.All',
        }[mode] || 'Mode.Throughput';

    let code = `import org.openjdk.jmh.annotations.*;
import org.openjdk.jmh.runner.Runner;
import org.openjdk.jmh.runner.options.Options;
import org.openjdk.jmh.runner.options.OptionsBuilder;
import java.util.concurrent.TimeUnit;

@BenchmarkMode(${modeLabel})
@OutputTimeUnit(TimeUnit.MILLISECONDS)
@Fork(value = ${fork}, jvmArgs = {"-Xms512m", "-Xmx512m"})
@Warmup(iterations = ${warmupIter}, time = ${warmupTime}, timeUnit = TimeUnit.SECONDS)
@Measurement(iterations = ${measureIter}, time = ${measureTime}, timeUnit = TimeUnit.SECONDS)`;
    if (state) {
        code += `
@State(Scope.Thread)`;
    }
    code += `
public class ${className} {
`;

    if (state) {
        code += `
    @Setup
    public void setup() {
        // TODO: 初始化资源
    }

    @TearDown
    public void tearDown() {
        // TODO: 清理资源
    }
`;
    }

    code += `
    @Benchmark
    public void ${methodName}() {
        // TODO: 实现被测逻辑
    }

    public static void main(String[] args) throws Exception {
        Options opt = new OptionsBuilder()
                .include(${className}.class.getSimpleName())
                .build();
        new Runner(opt).run();
    }
}`;

    return code;
}

function applyBasicConfig() {
    if (typeof document === 'undefined') {
        return {
            className: '',
            methodName: '',
            mode: 'Throughput',
            fork: undefined,
            warmupIter: undefined,
            warmupTime: undefined,
            measureIter: undefined,
            measureTime: undefined,
            state: true,
        };
    }
    const get = (id) => document.getElementById(id);
    return {
        className: (get('jmpBasicClass')?.value || '').trim(),
        methodName: (get('jmpBasicMethod')?.value || '').trim(),
        mode: get('jmpBasicMode')?.value || 'Throughput',
        fork: get('jmpBasicFork')?.value,
        warmupIter: get('jmpBasicWarmup')?.value,
        warmupTime: get('jmpBasicWarmupTime')?.value,
        measureIter: get('jmpBasicMeas')?.value,
        measureTime: get('jmpBasicMeasTime')?.value,
        state: get('jmpBasicState') ? get('jmpBasicState').checked : true,
    };
}

function jmpGenerateBasic() {
    const out = document.getElementById('jmpBasicOutput') || document.getElementById('jmpOutput');
    if (!out) return;
    const opts = applyBasicConfig();
    const code = generateBasicJmh(opts);
    out.textContent = code;
    out.className = 'output-box';
    setStatus('JMH 基础代码已生成 (' + code.length + ' 字节)');
}

let _jmpCurrentMode = 'advanced';

function _jmpSetMode(mode) {
    _jmpCurrentMode = mode === 'basic' ? 'basic' : 'advanced';
    const tabBasic = document.getElementById('jmpTabBasic');
    const tabAdvanced = document.getElementById('jmpTabAdvanced');
    const secBasic = document.getElementById('jmpBasicPanel');
    const secAdvanced = document.getElementById('jmpAdvancedPanel');
    if (tabBasic && tabAdvanced) {
        tabBasic.classList.toggle('active', _jmpCurrentMode === 'basic');
        tabAdvanced.classList.toggle('active', _jmpCurrentMode === 'advanced');
    }
    if (secBasic && secAdvanced) {
        secBasic.style.display = _jmpCurrentMode === 'basic' ? '' : 'none';
        secAdvanced.style.display = _jmpCurrentMode === 'advanced' ? '' : 'none';
    }
    if (_jmpCurrentMode === 'basic') {
        jmpGenerateBasic();
    } else {
        jmpGenerate();
    }
}

function switchJmpMode(mode) {
    _jmpSetMode(mode);
}

function _jmpResolveInitialMode() {
    try {
        const hash = (typeof window !== 'undefined' && window.location && window.location.hash) || '';
        const m = hash.match(/mode=(basic|advanced)/i);
        return m ? m[1].toLowerCase() : 'advanced';
    } catch (e) {
        return 'advanced';
    }
}

function jmpInit() {
    jmpBindMethodsEvents();
    const fields = [
        'jmpPackage',
        'jmpClass',
        'jmpOutTime',
        'jmpThreads',
        'jmpFork',
        'jmpJvmArgs',
        'jmpWi',
        'jmpWt',
        'jmpWtu',
        'jmpWb',
        'jmpMi',
        'jmpMt',
        'jmpMtu',
        'jmpMb',
        'jmpTo',
        'jmpTotu',
        'jmpStateScope',
        'jmpCC',
        'jmpAddMain',
        'jmpAddSetup',
        'jmpAddTearDown',
    ];
    fields.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', jmpGenerate);
        el.addEventListener('change', jmpGenerate);
    });
    document.querySelectorAll('.jmp-mode').forEach((c) => {
        c.addEventListener('change', jmpGenerate);
    });
    const basicFields = [
        'jmpBasicClass',
        'jmpBasicMethod',
        'jmpBasicMode',
        'jmpBasicFork',
        'jmpBasicWarmup',
        'jmpBasicWarmupTime',
        'jmpBasicMeas',
        'jmpBasicMeasTime',
        'jmpBasicState',
    ];
    basicFields.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', jmpGenerateBasic);
        el.addEventListener('change', jmpGenerateBasic);
    });
    const tabBasic = document.getElementById('jmpTabBasic');
    const tabAdvanced = document.getElementById('jmpTabAdvanced');
    if (tabBasic) tabBasic.addEventListener('click', () => switchJmpMode('basic'));
    if (tabAdvanced) tabAdvanced.addEventListener('click', () => switchJmpMode('advanced'));
    jmpLoadConfig(defaultConfig());
    _jmpSetMode(_jmpResolveInitialMode());
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        defaultConfig: defaultConfig,
        validateConfig: validateConfig,
        renderImports: renderImports,
        generateMethod: generateMethod,
        generateJmhClass: generateJmhClass,
        generateBasicJmh: generateBasicJmh,
        applyBasicConfig: applyBasicConfig,
    };
}

if (typeof registerInit !== 'undefined') {
    registerInit('jmhpro', jmpInit);
}
