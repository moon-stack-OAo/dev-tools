// === JS/TS 运行沙箱 ===
// 在浏览器内执行 JS/TS 代码（TS 经 sucrase 转译），捕获 console 输出与运行时异常。
// 纯函数（transformTS / runJS / runCode / formatLogValue / formatError / captureConsole）
// 通过 module.exports 导出供单元测试直接 require。

const JS_SAMPLE = `// JavaScript 示例
function fib(n) {
    if (n < 2) return n;
    return fib(n - 1) + fib(n - 2);
}

console.log('fib(10) =', fib(10));
console.log('当前时间:', new Date().toISOString());
console.table([{ a: 1, b: 2 }, { a: 3, b: 4 }]);

const obj = { name: 'dev-tools', version: 1 };
console.log('配置:', obj);
`;

const TS_SAMPLE = `// TypeScript 示例（类型注解将被 sucrase 剥离）
interface User {
    name: string;
    age: number;
}

const greet = (u: User): string => \`Hi, \${u.name} (\${u.age})\`;

const users: User[] = [
    { name: 'Alice', age: 28 },
    { name: 'Bob', age: 32 },
];

users.forEach((u) => console.log(greet(u)));

const sum = (nums: number[]): number => nums.reduce((a, b) => a + b, 0);
console.log('合计:', sum([1, 2, 3, 4, 5]));
`;

// === 纯函数：日志与异常格式化 ===

function formatLogValue(v) {
    if (v === undefined) return 'undefined';
    if (v === null) return 'null';
    const t = typeof v;
    if (t === 'string') return v;
    if (t === 'number' || t === 'boolean' || t === 'bigint') return String(v);
    if (t === 'function') return '[Function ' + (v.name || 'anonymous') + ']';
    if (t === 'symbol') return v.toString();
    try {
        return safeStringify(v, 2);
    } catch (e) {
        return '[Unserializable: ' + (e && e.message) + ']';
    }
}

function safeStringify(v, indent) {
    const seen = new WeakSet();
    return JSON.stringify(
        v,
        (key, val) => {
            if (typeof val === 'object' && val !== null) {
                if (seen.has(val)) return '[Circular]';
                seen.add(val);
            }
            if (typeof val === 'function') return '[Function ' + (val.name || 'anonymous') + ']';
            if (typeof val === 'bigint') return val.toString() + 'n';
            if (typeof val === 'undefined') return '[undefined]';
            return val;
        },
        indent
    );
}

function formatError(err) {
    if (err === null || err === undefined) return String(err);
    if (typeof err === 'string') return err;
    const name = err.name || 'Error';
    const msg = err.message || String(err);
    const stack = err.stack || '';
    const stackLines = stack.split('\n').slice(0, 3).join('\n').trim();
    return stackLines ? name + ': ' + msg + '\n' + stackLines : name + ': ' + msg;
}

// === 纯函数：执行与转译 ===

function captureConsole(fn) {
    const logs = [];
    const orig = {
        log: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error,
        debug: console.debug,
    };
    const wrap = (level) =>
        function () {
            const parts = [];
            for (let i = 0; i < arguments.length; i++) {
                parts.push(formatLogValue(arguments[i]));
            }
            logs.push({ level: level, text: parts.join(' ') });
        };
    console.log = wrap('log');
    console.info = wrap('info');
    console.warn = wrap('warn');
    console.error = wrap('error');
    console.debug = wrap('debug');
    try {
        const result = fn();
        return { ok: true, result: result, error: null, logs: logs };
    } catch (e) {
        return { ok: false, result: undefined, error: e, logs: logs };
    } finally {
        console.log = orig.log;
        console.info = orig.info;
        console.warn = orig.warn;
        console.error = orig.error;
        console.debug = orig.debug;
    }
}

function runJS(code) {
    return captureConsole(function () {
        const fn = new Function(code);
        return fn();
    });
}

function transformTS(code, options) {
    options = options || { transforms: ['typescript', 'imports'] };
    const s = typeof window !== 'undefined' && window.sucrase ? window.sucrase : null;
    if (s) {
        return s.transform(code, options).code;
    }
    if (typeof require !== 'undefined') {
        const sucrase = require('sucrase');
        return sucrase.transform(code, options).code;
    }
    throw new Error('sucrase 不可用');
}

function runCode(code, lang) {
    if (lang === 'ts') {
        let transpiled;
        try {
            transpiled = transformTS(code);
        } catch (e) {
            return {
                ok: false,
                result: undefined,
                error: new Error('TS 转译失败: ' + (e && e.message)),
                logs: [],
                transpiled: '',
            };
        }
        const r = runJS(transpiled);
        return { ok: r.ok, result: r.result, error: r.error, logs: r.logs, transpiled: transpiled };
    }
    const r = runJS(code);
    return { ok: r.ok, result: r.result, error: r.error, logs: r.logs, transpiled: '' };
}

// === UI 函数 ===

function jsrAppendOutput(text, type) {
    const id = type === 'stderr' ? 'jsrStderr' : 'jsrStdout';
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent += text;
}

function jsrClearOutput() {
    const out = document.getElementById('jsrStdout');
    const err = document.getElementById('jsrStderr');
    if (out) out.textContent = '';
    if (err) err.textContent = '';
    const status = document.getElementById('jsrStatus');
    if (status) status.textContent = '';
}

function jsrClear() {
    const ta = document.getElementById('jsrCode');
    if (ta) ta.value = '';
    jsrClearOutput();
}

if (typeof window !== 'undefined') window.jsrClear = jsrClear;

function jsrLoadSample(kind) {
    const ta = document.getElementById('jsrCode');
    if (!ta) return;
    ta.value = kind === 'ts' ? TS_SAMPLE : JS_SAMPLE;
    const sel = document.getElementById('jsrLang');
    if (sel) sel.value = kind;
}

if (typeof window !== 'undefined') window.jsrLoadSample = jsrLoadSample;

function jsrOnLangChange() {
    const sel = document.getElementById('jsrLang');
    if (!sel) return;
    jsrClearOutput();
    jsrLoadSample(sel.value);
}

if (typeof window !== 'undefined') window.jsrOnLangChange = jsrOnLangChange;

function jsrRun() {
    const ta = document.getElementById('jsrCode');
    const sel = document.getElementById('jsrLang');
    const status = document.getElementById('jsrStatus');
    if (!ta) return;
    const code = ta.value;
    const lang = sel ? sel.value : 'js';
    jsrClearOutput();
    const t0 = performance.now();
    const r = runCode(code, lang);
    const elapsed = (performance.now() - t0).toFixed(1);

    if (r.logs && r.logs.length) {
        r.logs.forEach(function (entry) {
            const stream = entry.level === 'error' ? 'stderr' : 'stdout';
            jsrAppendOutput(entry.text + '\n', stream);
        });
    }

    if (r.ok) {
        if (typeof r.result !== 'undefined') {
            jsrAppendOutput('// 返回值: ' + formatLogValue(r.result) + '\n', 'stdout');
        }
        if (status) status.textContent = '✓ 运行成功 (' + elapsed + 'ms)';
    } else {
        jsrAppendOutput(formatError(r.error) + '\n', 'stderr');
        if (status) status.textContent = '✗ 异常 (' + elapsed + 'ms)';
    }
}

if (typeof window !== 'undefined') window.jsrRun = jsrRun;

// === 入口挂载 ===

if (typeof registerInit === 'function') {
    registerInit('jsrun', function () {
        const ta = document.getElementById('jsrCode');
        if (ta && !ta.value) jsrLoadSample('js');
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { transformTS, runJS, runCode, formatLogValue, formatError, captureConsole, JS_SAMPLE, TS_SAMPLE };
}
