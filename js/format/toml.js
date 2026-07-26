// ============================================================
// TOML 轻量解析 / 序列化 / 格式化 / 校验
// 支持子集：key=value、[table]、[[array of tables]]、
//   字符串、数字、布尔、数组、内联表、注释
// ============================================================

function TomlError(message, line, col) {
  const loc =
    line != null
      ? "第 " + line + " 行" + (col != null ? " 第 " + col + " 列" : "")
      : "";
  const err = new Error(loc ? loc + ": " + message : message);
  err.line = line;
  err.col = col;
  err.name = "TomlError";
  return err;
}

// -----------------------------------------------------------
// Parser
// -----------------------------------------------------------
function createTomlParser(text) {
  const src = String(text == null ? "" : text);
  let i = 0;
  let line = 1;
  let col = 1;

  function peek(n) {
    return src[i + (n || 0)];
  }

  function eof() {
    return i >= src.length;
  }

  function advance(n) {
    const steps = n == null ? 1 : n;
    for (let k = 0; k < steps; k++) {
      if (eof()) break;
      if (src[i] === "\n") {
        line++;
        col = 1;
      } else {
        col++;
      }
      i++;
    }
  }

  function mark() {
    return { i: i, line: line, col: col };
  }

  function restore(m) {
    i = m.i;
    line = m.line;
    col = m.col;
  }

  function fail(msg, atLine, atCol) {
    throw TomlError(msg, atLine != null ? atLine : line, atCol != null ? atCol : col);
  }

  function skipWs(includeNewline) {
    while (!eof()) {
      const c = peek();
      if (c === " " || c === "\t" || c === "\r") {
        advance();
        continue;
      }
      if (includeNewline && c === "\n") {
        advance();
        continue;
      }
      break;
    }
  }

  function skipComment() {
    if (peek() !== "#") return false;
    while (!eof() && peek() !== "\n") advance();
    return true;
  }

  function skipWsAndComments() {
    while (!eof()) {
      skipWs(true);
      if (!skipComment()) break;
    }
  }

  function isBareKeyChar(c) {
    return (
      (c >= "A" && c <= "Z") ||
      (c >= "a" && c <= "z") ||
      (c >= "0" && c <= "9") ||
      c === "_" ||
      c === "-"
    );
  }

  function parseBareKey() {
    if (!isBareKeyChar(peek())) fail("期望键名");
    let s = "";
    while (!eof() && isBareKeyChar(peek())) {
      s += peek();
      advance();
    }
    return s;
  }

  function parseBasicString(multiline) {
    // 调用时已消费开引号 "
    let s = "";
    while (!eof()) {
      const c = peek();
      if (multiline && c === '"' && peek(1) === '"' && peek(2) === '"') {
        advance(3);
        return s;
      }
      if (!multiline && c === '"') {
        advance();
        return s;
      }
      if (c === "\\") {
        advance();
        if (eof()) fail("字符串转义未结束");
        const e = peek();
        advance();
        if (e === "b") s += "\b";
        else if (e === "t") s += "\t";
        else if (e === "n") s += "\n";
        else if (e === "f") s += "\f";
        else if (e === "r") s += "\r";
        else if (e === '"') s += '"';
        else if (e === "\\") s += "\\";
        else if (e === "u") {
          let hex = "";
          for (let k = 0; k < 4; k++) {
            if (eof()) fail("无效 Unicode 转义");
            hex += peek();
            advance();
          }
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) fail("无效 Unicode 转义 \\u" + hex);
          s += String.fromCharCode(parseInt(hex, 16));
        } else if (e === "U") {
          let hex = "";
          for (let k = 0; k < 8; k++) {
            if (eof()) fail("无效 Unicode 转义");
            hex += peek();
            advance();
          }
          if (!/^[0-9a-fA-F]{8}$/.test(hex)) fail("无效 Unicode 转义 \\U" + hex);
          const code = parseInt(hex, 16);
          if (code > 0xffff) {
            // 简易代理对
            const v = code - 0x10000;
            s += String.fromCharCode(0xd800 + (v >> 10), 0xdc00 + (v & 0x3ff));
          } else {
            s += String.fromCharCode(code);
          }
        } else if (multiline && (e === "\n" || e === "\r" || e === " " || e === "\t")) {
          // 行末反斜杠续行
          while (!eof()) {
            const ch = peek();
            if (ch === " " || ch === "\t" || ch === "\r") {
              advance();
              continue;
            }
            if (ch === "\n") {
              advance();
              break;
            }
            break;
          }
        } else {
          fail("不支持的转义 \\" + e);
        }
        continue;
      }
      if (!multiline && (c === "\n" || c === "\r")) fail("字符串未闭合");
      s += c;
      advance();
    }
    fail("字符串未闭合");
  }

  function parseLiteralString(multiline) {
    // 调用时已消费开引号 '
    let s = "";
    while (!eof()) {
      const c = peek();
      if (multiline && c === "'" && peek(1) === "'" && peek(2) === "'") {
        advance(3);
        return s;
      }
      if (!multiline && c === "'") {
        advance();
        return s;
      }
      if (!multiline && (c === "\n" || c === "\r")) fail("字面量字符串未闭合");
      s += c;
      advance();
    }
    fail("字面量字符串未闭合");
  }

  function parseString() {
    if (peek() === '"') {
      if (peek(1) === '"' && peek(2) === '"') {
        advance(3);
        // 多行基础字符串：开头紧跟换行则忽略
        if (peek() === "\r") advance();
        if (peek() === "\n") advance();
        return parseBasicString(true);
      }
      advance();
      return parseBasicString(false);
    }
    if (peek() === "'") {
      if (peek(1) === "'" && peek(2) === "'") {
        // 多行字面量：子集支持基本读取
        advance(3);
        if (peek() === "\r") advance();
        if (peek() === "\n") advance();
        return parseLiteralString(true);
      }
      advance();
      return parseLiteralString(false);
    }
    fail("期望字符串");
  }

  function parseNumberOrBoolOrNullish() {
    // true / false
    if (src.slice(i, i + 4) === "true" && !isBareKeyChar(peek(4))) {
      advance(4);
      return true;
    }
    if (src.slice(i, i + 5) === "false" && !isBareKeyChar(peek(5))) {
      advance(5);
      return false;
    }

    // inf / nan（可选）
    if (src.slice(i, i + 3) === "inf" && !isBareKeyChar(peek(3))) {
      advance(3);
      return Infinity;
    }
    if (src.slice(i, i + 4) === "+inf" && !isBareKeyChar(peek(4))) {
      advance(4);
      return Infinity;
    }
    if (src.slice(i, i + 4) === "-inf" && !isBareKeyChar(peek(4))) {
      advance(4);
      return -Infinity;
    }
    if (src.slice(i, i + 3) === "nan" && !isBareKeyChar(peek(3))) {
      advance(3);
      return NaN;
    }

    const start = mark();
    let raw = "";
    if (peek() === "+" || peek() === "-") {
      raw += peek();
      advance();
    }
    if (peek() === "0" && (peek(1) === "x" || peek(1) === "X")) {
      raw += peek();
      advance();
      raw += peek();
      advance();
      while (!eof() && /[0-9a-fA-F_]/.test(peek())) {
        raw += peek();
        advance();
      }
      const cleaned = raw.replace(/_/g, "");
      const n = parseInt(cleaned, 16);
      if (isNaN(n)) {
        restore(start);
        fail("无效十六进制数字");
      }
      return n;
    }
    if (peek() === "0" && (peek(1) === "o" || peek(1) === "O")) {
      raw += peek();
      advance();
      raw += peek();
      advance();
      while (!eof() && /[0-7_]/.test(peek())) {
        raw += peek();
        advance();
      }
      const cleaned = raw.replace(/_/g, "");
      const n = parseInt(cleaned.slice(0, 1) === "-" || cleaned.slice(0, 1) === "+"
        ? cleaned.slice(0, 1) + cleaned.slice(3)
        : cleaned.slice(2), 8);
      // 更稳妥：去掉 0o 前缀
      const sign = cleaned[0] === "-" || cleaned[0] === "+" ? cleaned[0] : "";
      const body = cleaned.replace(/^[+-]?0[oO]/, "");
      const n2 = parseInt(sign + body, 8);
      if (isNaN(n2)) {
        restore(start);
        fail("无效八进制数字");
      }
      return n2;
    }
    if (peek() === "0" && (peek(1) === "b" || peek(1) === "B")) {
      raw += peek();
      advance();
      raw += peek();
      advance();
      while (!eof() && /[01_]/.test(peek())) {
        raw += peek();
        advance();
      }
      const cleaned = raw.replace(/_/g, "");
      const sign = cleaned[0] === "-" || cleaned[0] === "+" ? cleaned[0] : "";
      const body = cleaned.replace(/^[+-]?0[bB]/, "");
      const n2 = parseInt(sign + body, 2);
      if (isNaN(n2)) {
        restore(start);
        fail("无效二进制数字");
      }
      return n2;
    }

    // 十进制 / 浮点
    let hasDigit = false;
    while (!eof() && /[0-9_]/.test(peek())) {
      raw += peek();
      if (peek() !== "_") hasDigit = true;
      advance();
    }
    let isFloat = false;
    if (peek() === ".") {
      isFloat = true;
      raw += ".";
      advance();
      while (!eof() && /[0-9_]/.test(peek())) {
        raw += peek();
        if (peek() !== "_") hasDigit = true;
        advance();
      }
    }
    if (peek() === "e" || peek() === "E") {
      isFloat = true;
      raw += peek();
      advance();
      if (peek() === "+" || peek() === "-") {
        raw += peek();
        advance();
      }
      let expDigit = false;
      while (!eof() && /[0-9_]/.test(peek())) {
        raw += peek();
        if (peek() !== "_") expDigit = true;
        advance();
      }
      if (!expDigit) {
        restore(start);
        fail("无效科学计数法");
      }
    }
    if (!hasDigit) {
      restore(start);
      fail("期望值");
    }
    const cleaned = raw.replace(/_/g, "");
    const n = isFloat ? parseFloat(cleaned) : parseInt(cleaned, 10);
    if (isNaN(n)) {
      restore(start);
      fail("无效数字: " + raw);
    }
    return n;
  }

  function parseArray() {
    // 已消费 [
    const arr = [];
    skipWsAndComments();
    if (peek() === "]") {
      advance();
      return arr;
    }
    while (!eof()) {
      arr.push(parseValue());
      skipWsAndComments();
      if (peek() === ",") {
        advance();
        skipWsAndComments();
        if (peek() === "]") {
          advance();
          return arr;
        }
        continue;
      }
      if (peek() === "]") {
        advance();
        return arr;
      }
      fail("数组中期望 ',' 或 ']'");
    }
    fail("数组未闭合");
  }

  function parseInlineTable() {
    // 已消费 {
    const obj = {};
    skipWs(false);
    if (peek() === "}") {
      advance();
      return obj;
    }
    while (!eof()) {
      skipWs(false);
      const keyParts = parseKey();
      skipWs(false);
      if (peek() !== "=") fail("内联表中期望 '='");
      advance();
      skipWs(false);
      const val = parseValue();
      setDeep(obj, keyParts, val, false);
      skipWs(false);
      if (peek() === ",") {
        advance();
        skipWs(false);
        if (peek() === "}") {
          // 不允许尾随逗号在严格 TOML，这里宽松允许
          advance();
          return obj;
        }
        continue;
      }
      if (peek() === "}") {
        advance();
        return obj;
      }
      fail("内联表中期望 ',' 或 '}'");
    }
    fail("内联表未闭合");
  }

  function parseValue() {
    skipWs(false);
    const c = peek();
    if (c === '"' || c === "'") return parseString();
    if (c === "[") {
      advance();
      return parseArray();
    }
    if (c === "{") {
      advance();
      return parseInlineTable();
    }
    return parseNumberOrBoolOrNullish();
  }

  function parseQuotedKey() {
    if (peek() === '"') {
      advance();
      return parseBasicString(false);
    }
    if (peek() === "'") {
      advance();
      return parseLiteralString(false);
    }
    fail("期望键名");
  }

  function parseKey() {
    const parts = [];
    while (true) {
      skipWs(false);
      if (peek() === '"' || peek() === "'") {
        parts.push(parseQuotedKey());
      } else {
        parts.push(parseBareKey());
      }
      skipWs(false);
      if (peek() === ".") {
        advance();
        continue;
      }
      break;
    }
    return parts;
  }

  function ensureTable(root, path, isArrayTable) {
    let cur = root;
    for (let p = 0; p < path.length; p++) {
      const k = path[p];
      const last = p === path.length - 1;
      if (last && isArrayTable) {
        if (cur[k] == null) {
          cur[k] = [{}];
          return cur[k][0];
        }
        if (!Array.isArray(cur[k])) {
          fail("键 '" + path.join(".") + "' 已存在且不是表数组");
        }
        const next = {};
        cur[k].push(next);
        return next;
      }
      if (cur[k] == null) {
        if (last) {
          cur[k] = {};
          return cur[k];
        }
        cur[k] = {};
        cur = cur[k];
        continue;
      }
      if (Array.isArray(cur[k])) {
        // 指向最新表数组元素
        cur = cur[k][cur[k].length - 1];
        if (last && !isArrayTable) {
          return cur;
        }
        continue;
      }
      if (typeof cur[k] !== "object" || cur[k] === null) {
        fail("键 '" + path.slice(0, p + 1).join(".") + "' 已是值，不能作为表");
      }
      if (last) return cur[k];
      cur = cur[k];
    }
    return cur;
  }

  function setDeep(root, path, value, allowOverwrite) {
    let cur = root;
    for (let p = 0; p < path.length - 1; p++) {
      const k = path[p];
      if (cur[k] == null) {
        cur[k] = {};
      } else if (Array.isArray(cur[k])) {
        cur = cur[k][cur[k].length - 1];
        continue;
      } else if (typeof cur[k] !== "object" || cur[k] === null) {
        fail("无法在值上设置子键: " + path.slice(0, p + 1).join("."));
      }
      cur = cur[k];
    }
    const last = path[path.length - 1];
    if (
      !allowOverwrite &&
      Object.prototype.hasOwnProperty.call(cur, last) &&
      typeof cur[last] === "object" &&
      cur[last] !== null &&
      !Array.isArray(cur[last])
    ) {
      // 表已定义，不允许再赋值为标量
      fail("重复键: " + path.join("."));
    }
    if (
      !allowOverwrite &&
      Object.prototype.hasOwnProperty.call(cur, last) &&
      (typeof cur[last] !== "object" || cur[last] === null || Array.isArray(cur[last]))
    ) {
      fail("重复键: " + path.join("."));
    }
    cur[last] = value;
  }

  function parseDocument() {
    const root = {};
    let current = root;

    skipWsAndComments();
    while (!eof()) {
      skipWs(false);
      if (eof()) break;
      if (peek() === "#") {
        skipComment();
        skipWsAndComments();
        continue;
      }
      if (peek() === "\n" || peek() === "\r") {
        skipWsAndComments();
        continue;
      }

      if (peek() === "[") {
        const headerLine = line;
        advance();
        let isArrayTable = false;
        if (peek() === "[") {
          isArrayTable = true;
          advance();
        }
        skipWs(false);
        const path = parseKey();
        skipWs(false);
        if (isArrayTable) {
          if (peek() !== "]") fail("期望 ']]'", headerLine);
          advance();
          if (peek() !== "]") fail("期望 ']]'", headerLine);
          advance();
        } else {
          if (peek() !== "]") fail("期望 ']'", headerLine);
          advance();
        }
        // 行尾可有注释
        skipWs(false);
        if (peek() === "#") skipComment();
        if (!eof() && peek() !== "\n" && peek() !== "\r") {
          fail("表头后存在多余内容", headerLine);
        }
        current = ensureTable(root, path, isArrayTable);
        skipWsAndComments();
        continue;
      }

      // key = value
      const kvLine = line;
      const keyParts = parseKey();
      skipWs(false);
      if (peek() !== "=") fail("期望 '='", kvLine);
      advance();
      skipWs(false);
      const val = parseValue();
      setDeep(current, keyParts, val, false);
      skipWs(false);
      if (peek() === "#") skipComment();
      if (!eof() && peek() !== "\n" && peek() !== "\r") {
        fail("键值对后存在多余内容", kvLine);
      }
      skipWsAndComments();
    }
    return root;
  }

  return { parseDocument: parseDocument };
}

function parseToml(text) {
  if (text == null || String(text).trim() === "") {
    return {};
  }
  return createTomlParser(text).parseDocument();
}

// -----------------------------------------------------------
// Serializer
// -----------------------------------------------------------
function isPlainObject(v) {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function escapeBasicString(s) {
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\u0008/g, "\\b")
    .replace(/\t/g, "\\t")
    .replace(/\n/g, "\\n")
    .replace(/\f/g, "\\f")
    .replace(/\r/g, "\\r");
}

function formatTomlKey(key) {
  const k = String(key);
  if (/^[A-Za-z0-9_-]+$/.test(k)) return k;
  return '"' + escapeBasicString(k) + '"';
}

function formatTomlKeyPath(parts) {
  return parts.map(formatTomlKey).join(".");
}

function formatTomlPrimitive(value) {
  if (typeof value === "string") {
    return '"' + escapeBasicString(value) + '"';
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (Number.isNaN(value)) return "nan";
    if (value === Infinity) return "inf";
    if (value === -Infinity) return "-inf";
    return String(value);
  }
  if (value === null || value === undefined) {
    return '""';
  }
  return '"' + escapeBasicString(String(value)) + '"';
}

function formatTomlInline(value) {
  if (Array.isArray(value)) {
    const items = value.map(function (v) {
      return formatTomlInline(v);
    });
    return "[" + items.join(", ") + "]";
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    const parts = [];
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      parts.push(formatTomlKey(k) + " = " + formatTomlInline(value[k]));
    }
    return "{ " + parts.join(", ") + " }";
  }
  return formatTomlPrimitive(value);
}

function isArrayOfTables(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return false;
  for (let i = 0; i < arr.length; i++) {
    if (!isPlainObject(arr[i])) return false;
  }
  return true;
}

function stringifyToml(obj, options) {
  const indentSize = (options && options.indent) || 2;
  const indentUnit = typeof indentSize === "number" ? " ".repeat(indentSize) : String(indentSize);
  const lines = [];

  function writeTable(table, pathParts, isArrayItem) {
    const keys = Object.keys(table || {});
    const scalars = [];
    const nestedTables = [];
    const arrayTables = [];

    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const v = table[k];
      if (isArrayOfTables(v)) {
        arrayTables.push(k);
      } else if (isPlainObject(v)) {
        nestedTables.push(k);
      } else {
        scalars.push(k);
      }
    }

    if (pathParts.length > 0) {
      if (isArrayItem) {
        lines.push("[[" + formatTomlKeyPath(pathParts) + "]]");
      } else {
        lines.push("[" + formatTomlKeyPath(pathParts) + "]");
      }
    }

    for (let i = 0; i < scalars.length; i++) {
      const k = scalars[i];
      const v = table[k];
      // 数组（非表数组）用内联数组
      if (Array.isArray(v)) {
        lines.push(formatTomlKey(k) + " = " + formatTomlInline(v));
      } else {
        lines.push(formatTomlKey(k) + " = " + formatTomlPrimitive(v));
      }
    }

    for (let i = 0; i < nestedTables.length; i++) {
      const k = nestedTables[i];
      if (lines.length && lines[lines.length - 1] !== "") lines.push("");
      writeTable(table[k], pathParts.concat([k]), false);
    }

    for (let i = 0; i < arrayTables.length; i++) {
      const k = arrayTables[i];
      const arr = table[k];
      for (let j = 0; j < arr.length; j++) {
        if (lines.length && lines[lines.length - 1] !== "") lines.push("");
        writeTable(arr[j], pathParts.concat([k]), true);
      }
    }
  }

  if (!isPlainObject(obj)) {
    // 顶层非对象：包一层
    if (Array.isArray(obj)) {
      return "value = " + formatTomlInline(obj) + "\n";
    }
    return "value = " + formatTomlPrimitive(obj) + "\n";
  }

  writeTable(obj, [], false);
  // 清理多余空行
  const out = [];
  let prevBlank = false;
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (ln === "") {
      if (prevBlank || out.length === 0) continue;
      prevBlank = true;
      out.push("");
      continue;
    }
    prevBlank = false;
    out.push(ln);
  }
  while (out.length && out[out.length - 1] === "") out.pop();
  return out.join("\n") + (out.length ? "\n" : "");
}

function formatToml(text, options) {
  const obj = parseToml(text);
  return stringifyToml(obj, options);
}

function tomlToJsonString(text, pretty) {
  const obj = parseToml(text);
  return pretty === false ? JSON.stringify(obj) : JSON.stringify(obj, null, 2);
}

function jsonToTomlString(text, options) {
  let obj;
  try {
    obj = JSON.parse(text);
  } catch (e) {
    throw new Error("JSON 解析错误: " + e.message);
  }
  return stringifyToml(obj, options);
}

function validateToml(text) {
  try {
    parseToml(text);
    return { ok: true, message: "✓ 有效的 TOML（常用子集）" };
  } catch (e) {
    return {
      ok: false,
      message: "✗ 无效的 TOML: " + e.message,
      line: e.line,
      col: e.col,
    };
  }
}

// -----------------------------------------------------------
// UI
// -----------------------------------------------------------
const _TOML_SAMPLE = [
  "# TOML 示例",
  'title = "Dev Tools"',
  "enabled = true",
  "version = 1.0",
  "tags = [\"format\", \"toml\", \"json\"]",
  "",
  "[server]",
  'host = "127.0.0.1"',
  "port = 8080",
  "",
  "[server.db]",
  'name = "app"',
  "pool = 10",
  "",
  "[[users]]",
  'name = "alice"',
  "roles = [\"admin\", \"dev\"]",
  "",
  "[[users]]",
  'name = "bob"',
  'meta = { active = true, level = 2 }',
].join("\n");

function tomlProcess(fn, emptyMsg) {
  const raw = document.getElementById("tomlInput").value;
  const out = document.getElementById("tomlOutput");
  if (!raw.trim()) {
    out.textContent = emptyMsg || "请输入内容";
    out.className = "output-box error";
    return;
  }
  try {
    out.textContent = fn(raw);
    out.className = "output-box";
    setStatus("TOML 处理成功");
  } catch (e) {
    out.textContent = "错误: " + e.message;
    out.className = "output-box error";
  }
}

function tomlFormat() {
  tomlProcess(function (raw) {
    return formatToml(raw, { indent: 2 });
  });
}

function tomlToJson() {
  tomlProcess(function (raw) {
    return tomlToJsonString(raw, true);
  });
}

function jsonToToml() {
  tomlProcess(function (raw) {
    return jsonToTomlString(raw);
  }, "请输入 JSON");
}

function tomlValidate() {
  const raw = document.getElementById("tomlInput").value;
  const out = document.getElementById("tomlOutput");
  if (!raw.trim()) {
    out.textContent = "请输入 TOML";
    out.className = "output-box error";
    return;
  }
  const r = validateToml(raw);
  out.textContent = r.message;
  out.className = r.ok ? "output-box" : "output-box error";
  setStatus(r.ok ? "TOML 有效" : "TOML 无效");
}

function tomlSample() {
  document.getElementById("tomlInput").value = _TOML_SAMPLE;
  tomlFormat();
  setStatus("已加载示例");
}

function tomlClear() {
  document.getElementById("tomlInput").value = "";
  const out = document.getElementById("tomlOutput");
  out.textContent = "";
  out.className = "output-box";
  setStatus("已清空");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    parseToml: parseToml,
    stringifyToml: stringifyToml,
    formatToml: formatToml,
    tomlToJsonString: tomlToJsonString,
    jsonToTomlString: jsonToTomlString,
    validateToml: validateToml,
  };
}
