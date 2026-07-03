const {
    parsePythonOutput,
    formatPythonError,
    detectReadyState,
    validateCode,
    executePython,
    pyrEscapeHtml,
    PY_SAMPLE,
    MAX_CODE_LENGTH,
    getPyodideIndexURL,
} = require('../../js/codegen/pyrun.js');

describe('parsePythonOutput', () => {
    test('同时存在 stdout / stderr', () => {
        const r = parsePythonOutput('hello\n', 'warn\n');
        expect(r.stdout).toBe('hello');
        expect(r.stderr).toBe('warn');
    });

    test('尾部多余换行被裁剪', () => {
        const r = parsePythonOutput('line1\nline2\n\n\n', 'err\n\n');
        expect(r.stdout).toBe('line1\nline2');
        expect(r.stderr).toBe('err');
    });

    test('null / undefined 视为空串', () => {
        expect(parsePythonOutput(null, null)).toEqual({ stdout: '', stderr: '' });
        expect(parsePythonOutput(undefined, '')).toEqual({ stdout: '', stderr: '' });
    });

    test('非字符串值转字符串', () => {
        expect(parsePythonOutput(123, 0)).toEqual({ stdout: '123', stderr: '0' });
    });
});

describe('formatPythonError', () => {
    test('Error 对象包含 name + message', () => {
        const e = new Error('boom');
        const out = formatPythonError(e);
        expect(out).toContain('Error');
        expect(out).toContain('boom');
    });

    test('NameError 带类型前缀', () => {
        const e = new Error("name 'x' is not defined");
        e.name = 'NameError';
        const out = formatPythonError(e);
        expect(out).toContain('NameError');
        expect(out).toContain("name 'x' is not defined");
    });

    test('字符串直接返回', () => {
        expect(formatPythonError('plain text')).toBe('plain text');
    });

    test('null / undefined', () => {
        expect(formatPythonError(null)).toBe('null');
        expect(formatPythonError(undefined)).toBe('undefined');
    });
});

describe('detectReadyState', () => {
    test('null / undefined 返回 false', () => {
        expect(detectReadyState(null)).toBe(false);
        expect(detectReadyState(undefined)).toBe(false);
    });

    test('缺方法的对象视为未就绪', () => {
        expect(detectReadyState({})).toBe(false);
        expect(
            detectReadyState({
                runPythonAsync: () => {},
            })
        ).toBe(false);
    });

    test('完整方法集合视为就绪', () => {
        const ok = {
            runPythonAsync: () => {},
            setStdout: () => {},
            setStderr: () => {},
        };
        expect(detectReadyState(ok)).toBe(true);
    });
});

describe('validateCode', () => {
    test('合法代码通过', () => {
        expect(validateCode('print(1)')).toEqual({ ok: true });
        expect(validateCode('  print(1)\n')).toEqual({ ok: true });
    });

    test('空字符串 / 纯空白被拒绝', () => {
        const r = validateCode('   \n  ');
        expect(r.ok).toBe(false);
        expect(r.error).toContain('空');
    });

    test('非字符串被拒绝', () => {
        const r = validateCode(123);
        expect(r.ok).toBe(false);
        expect(r.error).toContain('字符串');
    });

    test('超过长度上限被拒绝', () => {
        const big = 'x'.repeat(MAX_CODE_LENGTH + 1);
        const r = validateCode(big);
        expect(r.ok).toBe(false);
        expect(r.error).toContain('上限');
    });

    test('边界长度（恰好等于上限）通过', () => {
        const r = validateCode('x'.repeat(MAX_CODE_LENGTH));
        expect(r.ok).toBe(true);
    });
});

describe('pyrEscapeHtml', () => {
    test('转义 < > & " \'', () => {
        const out = pyrEscapeHtml('<div class="a">&\'b\'</div>');
        expect(out).toContain('&lt;');
        expect(out).toContain('&gt;');
        expect(out).toContain('&amp;');
        expect(out).toContain('&quot;');
        expect(out).toContain('&#39;');
    });

    test('null / undefined 返回空串', () => {
        expect(pyrEscapeHtml(null)).toBe('');
        expect(pyrEscapeHtml(undefined)).toBe('');
    });

    test('已转义字符串保持不变', () => {
        const out = pyrEscapeHtml('plain text 123');
        expect(out).toBe('plain text 123');
    });
});

describe('executePython（mock Pyodide）', () => {
    function makeMockPyodide(opts) {
        opts = opts || {};
        const api = {
            _stdout: null,
            _stderr: null,
            setStdout: (cfg) => {
                api._stdout = cfg.batched;
            },
            setStderr: (cfg) => {
                api._stderr = cfg.batched;
            },
            runPythonAsync: () => {
                if (opts.throw) return Promise.reject(opts.throw);
                if (opts.stdout && api._stdout) api._stdout(opts.stdout);
                if (opts.stderr && api._stderr) api._stderr(opts.stderr);
                return Promise.resolve(opts.result);
            },
        };
        return api;
    }

    test('成功执行时捕获 stdout', async () => {
        const py = makeMockPyodide({ stdout: 'hello\n', result: 'r' });
        const got = { out: '', err: '' };
        const r = await executePython("print('hello')", py, {
            onStdout: (s) => (got.out += s),
            onStderr: (s) => (got.err += s),
        });
        expect(r.ok).toBe(true);
        expect(r.result).toBe('r');
        expect(r.stdout).toBe('hello\n');
        expect(got.out).toBe('hello\n');
    });

    test('异常被捕获并通过 stderr 回调透传', async () => {
        const err = new Error('boom');
        err.name = 'ValueError';
        const py = makeMockPyodide({ throw: err });
        const r = await executePython('raise ValueError("boom")', py, {
            onStdout: () => {},
            onStderr: () => {},
        });
        expect(r.ok).toBe(false);
        expect(r.error).toBe(err);
        expect(formatPythonError(r.error)).toContain('ValueError');
    });

    test('空代码被拒绝且不调用 Pyodide', async () => {
        const py = makeMockPyodide({ result: 'unused' });
        let called = false;
        const orig = py.runPythonAsync;
        py.runPythonAsync = () => {
            called = true;
            return orig.apply(py, arguments);
        };
        const r = await executePython('   ', py, {
            onStdout: () => {},
            onStderr: () => {},
        });
        expect(r.ok).toBe(false);
        expect(r.error.message).toContain('空');
        expect(called).toBe(false);
    });

    test('未就绪的 Pyodide 直接返回错误', async () => {
        const r = await executePython('print(1)', null, {
            onStdout: () => {},
            onStderr: () => {},
        });
        expect(r.ok).toBe(false);
        expect(r.error.message).toContain('未就绪');
    });
});

describe('PY_SAMPLE 示例代码', () => {
    test('是 Python 注释开头', () => {
        expect(PY_SAMPLE.startsWith('#')).toBe(true);
    });

    test('包含 import / print', () => {
        expect(PY_SAMPLE).toContain('import');
        expect(PY_SAMPLE).toContain('print');
    });
});

describe('getPyodideIndexURL', () => {
    // Node 测试环境无 window，跳过这些测试
    const hasWindow = typeof window !== 'undefined';
    const origHref = hasWindow ? Object.getOwnPropertyDescriptor(window, 'location') : null;

    afterEach(() => {
        if (origHref && hasWindow) Object.defineProperty(window, 'location', origHref);
    });

    test('根路径 / 返回 /lib/pyodide/', () => {
        if (!hasWindow) return;
        Object.defineProperty(window, 'location', {
            value: { href: 'http://localhost/' },
            writable: true,
        });
        expect(getPyodideIndexURL()).toBe('http://localhost/lib/pyodide/');
    });

    test('子路径 /dev-tools/ 返回 /dev-tools/lib/pyodide/', () => {
        if (!hasWindow) return;
        Object.defineProperty(window, 'location', {
            value: { href: 'http://192.168.1.1/dev-tools/' },
            writable: true,
        });
        expect(getPyodideIndexURL()).toBe('http://192.168.1.1/dev-tools/lib/pyodide/');
    });

    test('子路径无尾部斜杠 /dev-tools 自动补全', () => {
        if (!hasWindow) return;
        Object.defineProperty(window, 'location', {
            value: { href: 'http://192.168.1.1/dev-tools' },
            writable: true,
        });
        expect(getPyodideIndexURL()).toBe('http://192.168.1.1/dev-tools/lib/pyodide/');
    });

    test('带端口的地址', () => {
        if (!hasWindow) return;
        Object.defineProperty(window, 'location', {
            value: { href: 'http://192.168.1.1:100/' },
            writable: true,
        });
        expect(getPyodideIndexURL()).toBe('http://192.168.1.1:100/lib/pyodide/');
    });

    test('深层子路径', () => {
        if (!hasWindow) return;
        Object.defineProperty(window, 'location', {
            value: { href: 'http://example.com/a/b/c/' },
            writable: true,
        });
        expect(getPyodideIndexURL()).toBe('http://example.com/a/b/c/lib/pyodide/');
    });
});
