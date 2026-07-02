// === Python 运行沙箱（基于 Pyodide） ===
// 在浏览器内通过 Pyodide（CPython → WebAssembly）执行 Python 3 代码，捕获 stdout / stderr。
// 纯函数（parsePythonOutput / formatPythonError / detectReadyState / validateCode / escapeHtml）
// 通过 module.exports 导出供单元测试 require；异步入口（loadPyodideInstance / executePython）依赖浏览器全局 Pyodide。

const PY_SAMPLE = `# Python 3 示例（Pyodide 运行时）
import sys
from math import pi, sqrt

print("Python 版本:", sys.version.split()[0])
print("π =", pi)
print("√2 =", sqrt(2))

# 列表推导 + 字典
nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
squares = [n * n for n in nums if n % 2 == 0]
print("偶数平方:", squares)

stats = {n: n ** 3 for n in range(3)}
print("立方字典:", stats)
`;

// === 纯函数：输出/错误处理（可单测） ===

/**
 * 合并并标准化 stdout / stderr 输出。
 * - 去除尾部多余空行；
 * - 输出形如 { stdout: string, stderr: string }。
 */
function parsePythonOutput(stdout, stderr) {
    const norm = (s) => (s == null ? '' : String(s)).replace(/\n+$/, '');
    return { stdout: norm(stdout), stderr: norm(stderr) };
}

/**
 * 标准化 Pyodide 抛出的错误对象为可读字符串。
 * Pyodide 异常通常包含 name / message 以及 frame 形式的栈信息；
 * 这里保留名称、消息及前若干行栈，便于在 UI 中展示。
 */
function formatPythonError(err) {
    if (err === null || err === undefined) return String(err);
    if (typeof err === 'string') return err;
    const name = err.name || 'Error';
    const msg = err.message || String(err);
    const stack = err.stack || '';
    const stackLines = stack.split('\n').slice(0, 4).join('\n').trim();
    return stackLines ? name + ': ' + msg + '\n' + stackLines : name + ': ' + msg;
}

/**
 * 检查 Pyodide 实例是否就绪。
 * 已加载的 Pyodide 暴露 runPythonAsync / setStdout / setStderr 等方法。
 */
function detectReadyState(pyodide) {
    return !!pyodide && typeof pyodide.runPythonAsync === 'function' && typeof pyodide.setStdout === 'function';
}

// 代码长度上限（Pyodide 单次 runPython 不宜过大，避免内存压力）
const MAX_CODE_LENGTH = 100 * 1024;

/**
 * 校验 Python 代码：
 * - 非空（去除首尾空白）；
 * - 不超过 MAX_CODE_LENGTH；
 * 返回 { ok: true } 或 { ok: false, error: string }。
 */
function validateCode(code) {
    if (typeof code !== 'string') return { ok: false, error: '代码必须是字符串' };
    if (!code.trim()) return { ok: false, error: '代码为空' };
    if (code.length > MAX_CODE_LENGTH) return { ok: false, error: '代码超过 ' + MAX_CODE_LENGTH + ' 字符上限' };
    return { ok: true };
}

/**
 * HTML 转义：将 < > & " ' 替换为实体，避免把 Pyodide 输出写入 <pre> 时破坏格式或注入脚本。
 * 浏览器中直接复用 app.js 提供的全局 escapeHtml；测试环境由 test/setup.js 注入。
 */
function pyrEscapeHtml(s) {
    if (s === undefined || s === null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// === 异步入口：加载与执行（依赖浏览器全局 Pyodide / fetch） ===

/**
 * 通过 fetch 探测关键文件大小，估算加载进度（0~1）。
 * 用于驱动 #pyrProgressBar 的视觉反馈；不阻塞 Pyodide 自身的初始化。
 */
function probePyodideProgress(onProgress) {
    const files = ['pyodide.js', 'pyodide.asm.wasm', 'python_stdlib.zip'];
    const indexURL = '/lib/pyodide/';
    const probe = (url) =>
        fetch(url, { method: 'HEAD' })
            .then((r) => (r.ok ? Number(r.headers.get('content-length')) || 0 : 0))
            .catch(() => 0);
    let total = 0;
    return Promise.all(files.map((f) => probe(indexURL + f))).then((sizes) => {
        total = sizes.reduce((a, b) => a + b, 0);
        if (onProgress) onProgress(total > 0 ? 0.05 : 0);
        return total;
    });
}

/**
 * 加载 Pyodide 实例。
 * 依赖 window.loadPyodide（由工具注册的脚本 lib/pyodide/pyodide.js 注入）；
 * 若该全局不存在则抛出明确错误，便于排查 file:// 或未运行 npm install 的场景。
 */
function loadPyodideInstance(onProgress) {
    const loader = typeof window !== 'undefined' ? window.loadPyodide : null;
    if (typeof loader !== 'function') {
        return Promise.reject(new Error('未找到 Pyodide（请确认 public/lib/pyodide/ 目录文件完整）'));
    }
    return probePyodideProgress(onProgress).then(() => {
        if (onProgress) onProgress(0.15);
        return loader({ indexURL: '/lib/pyodide/' });
    });
}

/**
 * 在已就绪的 Pyodide 实例上执行 Python 代码。
 * 通过 setStdout / setStderr 的 batched 回调实时捕获输出；
 * 任意异常被捕获并返回 { ok: false, error }，不抛出。
 */
function executePython(code, pyodide, hooks) {
    hooks = hooks || {};
    const onStdout = hooks.onStdout || function () {};
    const onStderr = hooks.onStderr || function () {};
    if (!detectReadyState(pyodide)) {
        return Promise.resolve({ ok: false, error: new Error('Pyodide 未就绪') });
    }
    const valid = validateCode(code);
    if (!valid.ok) return Promise.resolve({ ok: false, error: new Error(valid.error) });

    let stdoutBuf = '';
    let stderrBuf = '';
    pyodide.setStdout({
        batched: (s) => {
            stdoutBuf += s;
            onStdout(s);
        },
    });
    pyodide.setStderr({
        batched: (s) => {
            stderrBuf += s;
            onStderr(s);
        },
    });
    return pyodide
        .runPythonAsync(code)
        .then((result) => ({ ok: true, result: result, stdout: stdoutBuf, stderr: stderrBuf }))
        .catch((err) => ({ ok: false, error: err, stdout: stdoutBuf, stderr: stderrBuf }));
}

// === UI 函数（浏览器全局，由 onclick 触发） ===

function pyrAppendOutput(target, text) {
    const id = target === 'stderr' ? 'pyrStderr' : 'pyrStdout';
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent += text;
}

if (typeof window !== 'undefined') window.pyrAppendOutput = pyrAppendOutput;

function pyrClearOutput() {
    const out = document.getElementById('pyrStdout');
    const err = document.getElementById('pyrStderr');
    if (out) out.textContent = '';
    if (err) err.textContent = '';
    const status = document.getElementById('pyrStatus');
    if (status) status.textContent = '';
}

if (typeof window !== 'undefined') window.pyrClearOutput = pyrClearOutput;

function pyrClear() {
    const ta = document.getElementById('pyrCode');
    if (ta) ta.value = '';
    pyrClearOutput();
}

if (typeof window !== 'undefined') window.pyrClear = pyrClear;

function pyrLoadSample() {
    const ta = document.getElementById('pyrCode');
    if (!ta) return;
    ta.value = PY_SAMPLE;
}

if (typeof window !== 'undefined') window.pyrLoadSample = pyrLoadSample;

function pyrOnReady() {
    const btn = document.getElementById('pyrRunBtn');
    const ta = document.getElementById('pyrCode');
    const status = document.getElementById('pyrStatus');
    const bar = document.getElementById('pyrProgressBar');
    const wrap = document.getElementById('pyrProgress');
    if (btn) btn.disabled = false;
    if (ta) ta.disabled = false;
    if (bar) bar.style.width = '100%';
    if (wrap) wrap.style.display = 'none';
    if (status) status.textContent = '✓ Python 运行时就绪';
    const code = document.getElementById('pyrCode');
    if (code && !code.value) code.value = PY_SAMPLE;
}

if (typeof window !== 'undefined') window.pyrOnReady = pyrOnReady;

function pyrRun() {
    const ta = document.getElementById('pyrCode');
    const status = document.getElementById('pyrStatus');
    const pyodide = typeof window !== 'undefined' ? window.__pyodideInstance : null;
    if (!ta) return;
    const code = ta.value;
    pyrClearOutput();
    if (!pyodide) {
        if (status) status.textContent = '✗ Python 运行时未就绪';
        pyrAppendOutput('stderr', 'Python 运行时未就绪，请等待加载完成\n');
        return;
    }
    if (status) status.textContent = '运行中...';
    const t0 = performance.now();
    executePython(code, pyodide, {
        onStdout: (s) => pyrAppendOutput('stdout', s),
        onStderr: (s) => pyrAppendOutput('stderr', s),
    }).then((r) => {
        const elapsed = (performance.now() - t0).toFixed(1);
        if (r.ok) {
            if (status) status.textContent = '✓ 运行成功 (' + elapsed + 'ms)';
        } else {
            pyrAppendOutput('stderr', formatPythonError(r.error) + '\n');
            if (status) status.textContent = '✗ 异常 (' + elapsed + 'ms)';
        }
    });
}

if (typeof window !== 'undefined') window.pyrRun = pyrRun;

// === 入口挂载：openTool 打开面板后调用 toolInits['pyrun']() 触发加载 ===

if (typeof registerInit === 'function') {
    registerInit('pyrun', function () {
        if (typeof window !== 'undefined' && window.__pyodideInstance && detectReadyState(window.__pyodideInstance)) {
            pyrOnReady();
            return;
        }
        const setBar = (p) => {
            const bar = document.getElementById('pyrProgressBar');
            if (bar) bar.style.width = Math.max(0, Math.min(1, p)) * 100 + '%';
        };
        loadPyodideInstance(setBar)
            .then((pyodide) => {
                if (typeof window !== 'undefined') window.__pyodideInstance = pyodide;
                setBar(1);
                pyrOnReady();
            })
            .catch((err) => {
                const status = document.getElementById('pyrStatus');
                if (status) status.textContent = '✗ 加载失败：' + (err && err.message ? err.message : String(err));
                const wrap = document.getElementById('pyrProgress');
                if (wrap) wrap.style.display = 'none';
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parsePythonOutput,
        formatPythonError,
        detectReadyState,
        validateCode,
        executePython,
        pyrEscapeHtml,
        PY_SAMPLE,
        MAX_CODE_LENGTH,
    };
}
