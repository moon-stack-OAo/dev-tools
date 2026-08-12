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
  if (v === undefined) return "undefined";
  if (v === null) return "null";
  const t = typeof v;
  if (t === "string") return v;
  if (t === "number" || t === "boolean" || t === "bigint") return String(v);
  if (t === "function") return "[Function " + (v.name || "anonymous") + "]";
  if (t === "symbol") return v.toString();
  try {
    return safeStringify(v, 2);
  } catch (e) {
    return "[Unserializable: " + (e && e.message) + "]";
  }
}

function safeStringify(v, indent) {
  const seen = new WeakSet();
  return JSON.stringify(
    v,
    (key, val) => {
      if (typeof val === "object" && val !== null) {
        if (seen.has(val)) return "[Circular]";
        seen.add(val);
      }
      if (typeof val === "function")
        return "[Function " + (val.name || "anonymous") + "]";
      if (typeof val === "bigint") return val.toString() + "n";
      if (typeof val === "undefined") return "[undefined]";
      return val;
    },
    indent,
  );
}

function formatError(err) {
  if (err === null || err === undefined) return String(err);
  if (typeof err === "string") return err;
  const name = err.name || "Error";
  const msg = err.message || String(err);
  const stack = err.stack || "";
  const stackLines = stack.split("\n").slice(0, 3).join("\n").trim();
  return stackLines ? name + ": " + msg + "\n" + stackLines : name + ": " + msg;
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
    table: console.table,
  };
  const wrap = (level) =>
    function () {
      const parts = [];
      for (let i = 0; i < arguments.length; i++) {
        parts.push(formatLogValue(arguments[i]));
      }
      logs.push({ level: level, text: parts.join(" ") });
    };
  console.log = wrap("log");
  console.info = wrap("info");
  console.warn = wrap("warn");
  console.error = wrap("error");
  console.debug = wrap("debug");
  console.table = wrap("table");
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
    console.table = orig.table;
  }
}

function runJS(code) {
  return captureConsole(function () {
    const fn = new Function(code);
    return fn();
  });
}

function transformTS(code, options) {
  options = options || { transforms: ["typescript", "imports"] };
  const s =
    typeof window !== "undefined" && window.sucrase ? window.sucrase : null;
  if (s) {
    return s.transform(code, options).code;
  }
  if (typeof require !== "undefined") {
    const sucrase = require("sucrase");
    return sucrase.transform(code, options).code;
  }
  throw new Error("sucrase 不可用");
}

function runCode(code, lang) {
  if (lang === "ts") {
    let transpiled;
    try {
      transpiled = transformTS(code);
    } catch (e) {
      return {
        ok: false,
        result: undefined,
        error: new Error("TS 转译失败: " + (e && e.message)),
        logs: [],
        transpiled: "",
      };
    }
    const r = runJS(transpiled);
    return {
      ok: r.ok,
      result: r.result,
      error: r.error,
      logs: r.logs,
      transpiled: transpiled,
    };
  }
  const r = runJS(code);
  return {
    ok: r.ok,
    result: r.result,
    error: r.error,
    logs: r.logs,
    transpiled: "",
  };
}

// === UI 函数 ===

var _jsrEditor = null;

function jsrMapLang(kind) {
  return kind === "ts" ? "typescript" : "javascript";
}

function jsrEnsureEditor() {
  if (_jsrEditor) return _jsrEditor;
  if (typeof window === "undefined" || !window.CMEditor) return null;
  var ta = document.getElementById("jsrCode");
  if (!ta) return null;
  var wrap = ta.closest ? ta.closest(".jsr-editor-wrap") : ta.parentElement;
  if (!wrap || !wrap.classList || !wrap.classList.contains("jsr-editor-wrap")) {
    return null;
  }
  var sel = document.getElementById("jsrLang");
  var kind = sel ? sel.value : "js";
  _jsrEditor = window.CMEditor.create(wrap, {
    language: jsrMapLang(kind),
    tabSize: 2,
    onFormat: jsrFormatCode,
  });
  return _jsrEditor;
}

/**
 * 格式化编辑器中的 JS/TS（js-beautify）；由 Ctrl/Cmd+S 触发
 */
function jsrFormatCode() {
  var code = jsrGetCode();
  if (!String(code).trim()) {
    if (typeof setStatus === "function") setStatus("无可格式化内容");
    return;
  }
  var b =
    typeof Beautify !== "undefined"
      ? Beautify
      : typeof window !== "undefined"
        ? window.Beautify
        : null;
  if (!b || typeof b.js !== "function") {
    if (typeof toast === "function") toast("格式化库未加载");
    else if (typeof setStatus === "function") setStatus("格式化库未加载");
    return;
  }
  try {
    var formatted = b.js(code, {
      indent_size: 2,
      space_in_empty_paren: true,
      end_with_newline: true,
    });
    jsrSetCode(formatted);
    if (typeof setStatus === "function") setStatus("已格式化 (Ctrl+S)");
  } catch (e) {
    var msg = e && e.message ? e.message : String(e);
    if (typeof toast === "function") toast("格式化失败: " + msg);
    else if (typeof setStatus === "function") setStatus("格式化失败: " + msg);
  }
}

if (typeof window !== "undefined") window.jsrFormatCode = jsrFormatCode;

function jsrGetCode() {
  var ed = jsrEnsureEditor();
  if (ed) return ed.getValue();
  var ta = document.getElementById("jsrCode");
  return ta ? ta.value : "";
}

function jsrSetCode(v) {
  var text = v == null ? "" : String(v);
  var ed = jsrEnsureEditor();
  if (ed) {
    ed.setValue(text);
    return;
  }
  var ta = document.getElementById("jsrCode");
  if (ta) ta.value = text;
}

function jsrEsc(s) {
  if (typeof escapeHtml === "function") return escapeHtml(s);
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * 规范化 console level 到样式 class 后缀
 * @param {string} level
 * @returns {string}
 */
function jsrNormalizeLevel(level) {
  var lv = String(level || "log").toLowerCase();
  if (lv === "warning") return "warn";
  if (
    lv === "log" ||
    lv === "info" ||
    lv === "warn" ||
    lv === "error" ||
    lv === "debug" ||
    lv === "return" ||
    lv === "table"
  ) {
    return lv;
  }
  return "log";
}

/**
 * 向控制台追加一行（按 level 着色）
 * @param {string} text
 * @param {string} [level='log']
 */
function jsrAppendOutput(text, level) {
  var el = document.getElementById("jsrConsole");
  if (!el) return;
  var lv = jsrNormalizeLevel(level);
  var tagLabel =
    lv === "return"
      ? "ret"
      : lv === "warn"
        ? "warn"
        : lv === "error"
          ? "err"
          : lv === "info"
            ? "info"
            : lv === "debug"
              ? "dbg"
              : lv === "table"
                ? "table"
                : "log";
  var line = document.createElement("div");
  line.className = "jsr-line jsr-line-" + lv;
  line.innerHTML =
    '<span class="jsr-line-tag">' +
    tagLabel +
    '</span><span class="jsr-line-body">' +
    jsrEsc(text == null ? "" : String(text)) +
    "</span>";
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

function jsrClearOutput() {
  var out = document.getElementById("jsrConsole");
  if (out) out.innerHTML = "";
  // 兼容旧 DOM（若未刷新缓存）
  var legacyOut = document.getElementById("jsrStdout");
  var legacyErr = document.getElementById("jsrStderr");
  if (legacyOut) legacyOut.textContent = "";
  if (legacyErr) legacyErr.textContent = "";
  var status = document.getElementById("jsrStatus");
  if (status) status.textContent = "";
}

if (typeof window !== "undefined") window.jsrClearOutput = jsrClearOutput;

function jsrClear() {
  jsrSetCode("");
  jsrClearOutput();
}

if (typeof window !== "undefined") window.jsrClear = jsrClear;

function jsrLoadSample(kind) {
  jsrSetCode(kind === "ts" ? TS_SAMPLE : JS_SAMPLE);
  const sel = document.getElementById("jsrLang");
  if (sel) sel.value = kind;
  var ed = jsrEnsureEditor();
  if (ed) ed.setLanguage(jsrMapLang(kind));
}

if (typeof window !== "undefined") window.jsrLoadSample = jsrLoadSample;

function jsrOnLangChange() {
  const sel = document.getElementById("jsrLang");
  if (!sel) return;
  jsrClearOutput();
  var ed = jsrEnsureEditor();
  if (ed) ed.setLanguage(jsrMapLang(sel.value));
  jsrLoadSample(sel.value);
}

if (typeof window !== "undefined") window.jsrOnLangChange = jsrOnLangChange;

function jsrRun() {
  const ta = document.getElementById("jsrCode");
  const sel = document.getElementById("jsrLang");
  const status = document.getElementById("jsrStatus");
  if (!ta && !jsrEnsureEditor()) return;
  const code = jsrGetCode();
  const lang = sel ? sel.value : "js";
  jsrClearOutput();
  const t0 = performance.now();
  const r = runCode(code, lang);
  const elapsed = (performance.now() - t0).toFixed(1);

  if (r.logs && r.logs.length) {
    r.logs.forEach(function (entry) {
      jsrAppendOutput(entry.text, entry.level || "log");
    });
  }

  if (r.ok) {
    if (typeof r.result !== "undefined") {
      jsrAppendOutput("返回值: " + formatLogValue(r.result), "return");
    }
    if (status) status.textContent = "✓ 运行成功 (" + elapsed + "ms)";
  } else {
    jsrAppendOutput(formatError(r.error), "error");
    if (status) status.textContent = "✗ 异常 (" + elapsed + "ms)";
  }
}

if (typeof window !== "undefined") window.jsrRun = jsrRun;

// === 入口挂载 ===

if (typeof registerInit === "function") {
  registerInit("jsrun", function () {
    jsrEnsureEditor();
    if (!jsrGetCode()) jsrLoadSample("js");
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    transformTS,
    runJS,
    runCode,
    formatLogValue,
    formatError,
    captureConsole,
    jsrNormalizeLevel,
    JS_SAMPLE,
    TS_SAMPLE,
  };
}
