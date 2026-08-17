// ============================================================
// GraphQL 轻量格式化 / 压缩 / 括号平衡检查
//   - 字符级扫描：字符串 / 块字符串 / 注释
//   - 按 { } ( ) [ ] 调整缩进
//   - 压缩：去除多余空白，保留字符串
//   - 不做完整 GraphQL 语法校验
// ============================================================

function _gqlSkipString(text, start) {
  const n = text.length;
  if (text[start] !== '"') return start + 1;
  if (text[start + 1] === '"' && text[start + 2] === '"') {
    let i = start + 3;
    while (i < n) {
      if (text[i] === '"' && text[i + 1] === '"' && text[i + 2] === '"') {
        return i + 3;
      }
      if (text[i] === "\\" && i + 1 < n) {
        i += 2;
        continue;
      }
      i++;
    }
    return n;
  }
  let i = start + 1;
  while (i < n) {
    const c = text[i];
    if (c === "\\") {
      i += 2;
      continue;
    }
    if (c === '"') return i + 1;
    if (c === "\n") return i;
    i++;
  }
  return n;
}

function _gqlSkipComment(text, start) {
  let i = start;
  const n = text.length;
  while (i < n && text[i] !== "\n") i++;
  return i;
}

function _gqlIsIdentStart(ch) {
  return (
    (ch >= "A" && ch <= "Z") ||
    (ch >= "a" && ch <= "z") ||
    ch === "_" ||
    ch === "$"
  );
}

function _gqlIsIdentChar(ch) {
  return (
    (ch >= "A" && ch <= "Z") ||
    (ch >= "a" && ch <= "z") ||
    (ch >= "0" && ch <= "9") ||
    ch === "_" ||
    ch === "$"
  );
}

// -----------------------------------------------------------
// 基础括号 / 引号平衡检查
// -----------------------------------------------------------
function checkGraphqlBalance(text) {
  const src = String(text == null ? "" : text);
  const issues = [];
  const stack = [];
  let i = 0;
  const n = src.length;
  let openQuote = 0;
  let closeQuote = 0;

  while (i < n) {
    const c = src[i];
    if (c === "#") {
      i = _gqlSkipComment(src, i);
      continue;
    }
    if (c === '"') {
      if (src[i + 1] === '"' && src[i + 2] === '"') {
        openQuote++;
        const end = _gqlSkipString(src, i);
        if (
          end > i + 3 &&
          src[end - 1] === '"' &&
          src[end - 2] === '"' &&
          src[end - 3] === '"'
        ) {
          closeQuote++;
        }
        i = end;
        continue;
      }
      openQuote++;
      const end = _gqlSkipString(src, i);
      if (end > i + 1 && src[end - 1] === '"') closeQuote++;
      i = end;
      continue;
    }
    if (c === "{" || c === "(" || c === "[") {
      stack.push({ ch: c, pos: i });
      i++;
      continue;
    }
    if (c === "}" || c === ")" || c === "]") {
      const expect = c === "}" ? "{" : c === ")" ? "(" : "[";
      if (stack.length === 0) {
        issues.push({
          kind: "unmatched-close",
          msg: "多余的闭合符 `" + c + "`",
        });
      } else {
        const top = stack.pop();
        if (top.ch !== expect) {
          issues.push({
            kind: "mismatch",
            msg:
              "括号不匹配：期望闭合 `" +
              (top.ch === "{" ? "}" : top.ch === "(" ? ")" : "]") +
              "`，实际为 `" +
              c +
              "`",
          });
        }
      }
      i++;
      continue;
    }
    i++;
  }

  for (let k = 0; k < stack.length; k++) {
    issues.push({
      kind: "unmatched-open",
      msg: "未闭合的 `" + stack[k].ch + "`",
    });
  }

  if (openQuote !== closeQuote) {
    issues.push({
      kind: "unbalanced-quote",
      msg: "引号不平衡：开 " + openQuote + " / 闭 " + closeQuote,
    });
  }

  return { ok: issues.length === 0, issues: issues };
}

// -----------------------------------------------------------
// 格式化
//   - braceDepth：仅 { } 影响字段换行缩进
//   - listDepth：处于 ( ) [ ] 内时字段不强制换行
// -----------------------------------------------------------
function formatGraphql(text, opts) {
  opts = opts || {};
  const indentStr = opts.indent != null ? opts.indent : "  ";
  const src = String(text == null ? "" : text);
  if (!src.trim()) return "";

  const out = [];
  let braceDepth = 0;
  let listDepth = 0;
  let i = 0;
  const n = src.length;
  let line = "";
  let needSpace = false;

  function flushLine() {
    const t = line.replace(/[ \t]+$/g, "");
    if (!t) {
      line = "";
      needSpace = false;
      return;
    }
    out.push(indentStr.repeat(Math.max(0, braceDepth)) + t);
    line = "";
    needSpace = false;
  }

  function spaceBefore() {
    if (!line) {
      needSpace = false;
      return;
    }
    const last = line[line.length - 1];
    if (
      last === " " ||
      last === "(" ||
      last === "[" ||
      last === "{" ||
      last === "@" ||
      last === "$" ||
      last === "!" ||
      last === "."
    ) {
      needSpace = false;
      return;
    }
    needSpace = true;
  }

  function emit(s, opts2) {
    opts2 = opts2 || {};
    if (opts2.tightLeft) needSpace = false;
    if (needSpace && line) {
      const last = line[line.length - 1];
      if (last !== " " && last !== "(" && last !== "[" && last !== "{") {
        line += " ";
      }
    }
    needSpace = false;
    line += s;
    if (opts2.spaceAfter) needSpace = true;
  }

  while (i < n) {
    const c = src[i];

    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      // 列表内忽略源换行，折叠为空格
      if (listDepth > 0) {
        spaceBefore();
      } else {
        flushLine();
      }
      i++;
      continue;
    }
    if (c === " " || c === "\t") {
      spaceBefore();
      i++;
      continue;
    }

    if (c === "#") {
      const end = _gqlSkipComment(src, i);
      const cmt = src.slice(i, end).replace(/[ \t]+$/g, "");
      if (line) emit(" ", { tightLeft: true });
      // 修正：注释前空格
      if (line && line[line.length - 1] !== " ") {
        // re-emit with space
        line = line.replace(/[ \t]+$/, "");
        line += " ";
      }
      line += cmt;
      flushLine();
      i = end;
      continue;
    }

    if (c === '"') {
      const end = _gqlSkipString(src, i);
      const str = src.slice(i, end);
      if (str.indexOf("\n") >= 0 && str.startsWith('"""')) {
        flushLine();
        const lines = str.split(/\r?\n/);
        for (let li = 0; li < lines.length; li++) {
          const raw = lines[li];
          if (li === 0) {
            out.push(indentStr.repeat(Math.max(0, braceDepth)) + raw);
          } else if (li === lines.length - 1) {
            out.push(
              indentStr.repeat(Math.max(0, braceDepth)) +
                raw.replace(/^[ \t]*/, ""),
            );
          } else {
            out.push(
              indentStr.repeat(Math.max(0, braceDepth + 1)) +
                raw.replace(/^[ \t]*/, ""),
            );
          }
        }
        line = "";
        needSpace = false;
      } else {
        emit(str);
      }
      i = end;
      continue;
    }

    if (c === "{") {
      emit("{", { tightLeft: false });
      // keyword { / field {
      if (line.length >= 2) {
        const before = line[line.length - 2];
        if (_gqlIsIdentChar(before) || before === ")" || before === "]") {
          // 保证 { 前有空格
          line = line.slice(0, -1);
          if (line && line[line.length - 1] !== " ") line += " ";
          line += "{";
        }
      }
      flushLine();
      braceDepth++;
      i++;
      continue;
    }

    if (c === "}") {
      flushLine();
      braceDepth = Math.max(0, braceDepth - 1);
      line = "}";
      let j = i + 1;
      while (j < n && (src[j] === " " || src[j] === "\t")) j++;
      if (
        j >= n ||
        src[j] === "\n" ||
        src[j] === "\r" ||
        src[j] === "#" ||
        src[j] === "}"
      ) {
        flushLine();
      } else {
        spaceBefore();
      }
      i++;
      continue;
    }

    if (c === "(" || c === "[") {
      // `(` 紧贴字段名；`[` 在冒号后需要空格（ids: [1]）
      if (c === "[") {
        if (needSpace && line) {
          const last = line[line.length - 1];
          if (last !== " " && last !== "(" && last !== "[") line += " ";
        }
      }
      needSpace = false;
      line += c;
      listDepth++;
      i++;
      continue;
    }

    if (c === ")" || c === "]") {
      needSpace = false;
      line += c;
      listDepth = Math.max(0, listDepth - 1);
      i++;
      continue;
    }

    if (c === ":") {
      needSpace = false;
      line += ":";
      needSpace = true;
      i++;
      continue;
    }

    if (c === ",") {
      needSpace = false;
      line += ",";
      needSpace = true;
      i++;
      continue;
    }

    if (c === "!") {
      needSpace = false;
      line += "!";
      i++;
      continue;
    }

    if (c === "=" || c === "|" || c === "&") {
      emit(c, { spaceAfter: true });
      i++;
      continue;
    }

    if (c === "@") {
      spaceBefore();
      emit("@", { tightLeft: !needSpace });
      // 紧贴 directive 名
      needSpace = false;
      i++;
      while (i < n && _gqlIsIdentChar(src[i]) && src[i] !== "$") {
        line += src[i];
        i++;
      }
      continue;
    }

    if (c === "$") {
      spaceBefore();
      emit("$");
      needSpace = false;
      i++;
      while (i < n && _gqlIsIdentChar(src[i]) && src[i] !== "$") {
        line += src[i];
        i++;
      }
      continue;
    }

    if (c === "." && src[i + 1] === "." && src[i + 2] === ".") {
      // selection set 内 fragment：新行
      if (listDepth === 0 && braceDepth > 0 && line) {
        flushLine();
      } else {
        spaceBefore();
      }
      emit("...");
      needSpace = false;
      i += 3;
      while (i < n && _gqlIsIdentChar(src[i]) && src[i] !== "$") {
        line += src[i];
        i++;
      }
      continue;
    }

    // 标识符 / 数字 / 枚举值
    if (
      _gqlIsIdentStart(c) ||
      (c >= "0" && c <= "9") ||
      c === "-" ||
      c === "."
    ) {
      let j = i;
      // 数字（含小数、负号）
      if (c === "-" || (c >= "0" && c <= "9") || c === ".") {
        if (c === "-") j++;
        while (j < n && ((src[j] >= "0" && src[j] <= "9") || src[j] === ".")) {
          j++;
        }
        // 科学计数
        if (j < n && (src[j] === "e" || src[j] === "E")) {
          j++;
          if (j < n && (src[j] === "+" || src[j] === "-")) j++;
          while (j < n && src[j] >= "0" && src[j] <= "9") j++;
        }
      } else {
        while (j < n && _gqlIsIdentChar(src[j]) && src[j] !== "$") j++;
      }
      const tok = src.slice(i, j);

      // selection set 内：新字段换行（不在 listDepth 内）
      if (listDepth === 0 && braceDepth > 0 && line) {
        const last = line[line.length - 1];
        // 同行保留：on Type / 冒号后 / 开括号后
        const keepInline =
          last === ":" ||
          last === "(" ||
          last === "[" ||
          last === "@" ||
          last === "$" ||
          /(?:^|\s)on$/.test(line);
        if (!keepInline) {
          flushLine();
        } else {
          spaceBefore();
        }
      } else {
        spaceBefore();
      }
      emit(tok);
      i = j;
      continue;
    }

    emit(c);
    i++;
  }

  flushLine();
  while (out.length && out[0].trim() === "") out.shift();
  while (out.length && out[out.length - 1].trim() === "") out.pop();
  return out.join("\n");
}

// -----------------------------------------------------------
// 压缩：去多余空白与注释；字符串原样；去掉可选逗号
// -----------------------------------------------------------
function minifyGraphql(text) {
  const src = String(text == null ? "" : text);
  if (!src.trim()) return "";

  let out = "";
  let i = 0;
  const n = src.length;
  let needSpace = false;

  function isWord(ch) {
    return _gqlIsIdentChar(ch);
  }

  while (i < n) {
    const c = src[i];

    if (c === "#") {
      i = _gqlSkipComment(src, i);
      continue;
    }
    if (c === '"') {
      const end = _gqlSkipString(src, i);
      needSpace = false;
      out += src.slice(i, end);
      i = end;
      continue;
    }
    if (c === " " || c === "\t" || c === "\n" || c === "\r" || c === ",") {
      if (c !== "," && out.length) needSpace = true;
      i++;
      continue;
    }

    // 标点：多数紧贴
    if ("{}()[]:!".indexOf(c) >= 0) {
      needSpace = false;
      out += c;
      i++;
      continue;
    }

    if (c === "=" || c === "|" || c === "&") {
      // 两侧与标识符之间保留单空格
      if (out.length && isWord(out[out.length - 1])) out += " ";
      out += c;
      needSpace = true;
      i++;
      continue;
    }

    if (c === "@") {
      if (needSpace && out.length && isWord(out[out.length - 1])) out += " ";
      needSpace = false;
      out += "@";
      i++;
      continue;
    }

    if (c === "." && src[i + 1] === "." && src[i + 2] === ".") {
      if (needSpace && out.length && isWord(out[out.length - 1])) out += " ";
      needSpace = false;
      out += "...";
      i += 3;
      continue;
    }

    // 普通字符 / 标识符
    if (needSpace && out.length) {
      const prev = out[out.length - 1];
      // 仅在 word-word 之间插空格
      if (isWord(prev) && (isWord(c) || c === "$")) {
        out += " ";
      }
    }
    needSpace = false;
    out += c;
    i++;
  }

  return out.trim();
}

// ============================================================
// UI
// ============================================================

const _GQL_SAMPLE = [
  "query GetUser($id: ID!, $withPosts: Boolean = true) {",
  "  user(id: $id) {",
  "    id",
  "    name",
  "    email",
  "    posts(first: 10) @include(if: $withPosts) {",
  "      edges {",
  "        node {",
  "          title",
  "          createdAt",
  "        }",
  "      }",
  "    }",
  "  }",
  "}",
  "",
  "mutation CreatePost($input: CreatePostInput!) {",
  "  createPost(input: $input) {",
  "    id",
  "    title",
  "  }",
  "}",
].join("\n");

function _gqlIndentValue(v) {
  if (v === "\\t" || v === "\t") return "\t";
  if (v === "4") return "    ";
  return "  ";
}

function _gqlSetStatus(msg, isErr) {
  const el = document.getElementById("gqlStatus");
  if (!el) return;
  el.textContent = msg;
  el.style.color = isErr ? "var(--danger)" : "var(--text-dim)";
}

function _gqlShowBalance(text) {
  const el = document.getElementById("gqlBalance");
  if (!el) return;
  if (!String(text || "").trim()) {
    el.innerHTML = '<span class="gql-lint-empty">未检查</span>';
    return;
  }
  const r = checkGraphqlBalance(text);
  if (r.ok) {
    el.innerHTML = '<span class="gql-lint-empty">括号 / 引号平衡 ✓</span>';
    return;
  }
  const parts = [];
  for (let k = 0; k < r.issues.length; k++) {
    const it = r.issues[k];
    const esc =
      typeof escapeHtml === "function"
        ? escapeHtml
        : function (s) {
            return String(s);
          };
    parts.push(
      '<div class="gql-lint-item gql-lint-error">' +
        '<i class="bi bi-x-circle-fill"></i>' +
        '<span class="gql-lint-rule">[' +
        esc(it.kind) +
        "]</span>" +
        '<span class="gql-lint-msg">' +
        esc(it.msg) +
        "</span>" +
        "</div>",
    );
  }
  el.innerHTML = parts.join("");
}

function _gqlFormat() {
  const input = document.getElementById("gqlInput").value;
  const out = document.getElementById("gqlOutput");
  const sel = document.getElementById("gqlIndent");
  const indent = _gqlIndentValue(sel ? sel.value : "2");
  if (!input.trim()) {
    out.value = "";
    _gqlSetStatus("请输入 GraphQL");
    _gqlShowBalance("");
    return;
  }
  try {
    const formatted = formatGraphql(input, { indent: indent });
    out.value = formatted;
    _gqlSetStatus("格式化完成，共 " + formatted.split("\n").length + " 行");
  } catch (e) {
    out.value = "";
    _gqlSetStatus("格式化失败: " + e.message, true);
  }
  _gqlShowBalance(input);
}

function _gqlMinify() {
  const input = document.getElementById("gqlInput").value;
  const out = document.getElementById("gqlOutput");
  if (!input.trim()) {
    out.value = "";
    _gqlSetStatus("请输入 GraphQL");
    _gqlShowBalance("");
    return;
  }
  try {
    const mini = minifyGraphql(input);
    out.value = mini;
    _gqlSetStatus("已压缩: " + mini.length + " 字符");
  } catch (e) {
    out.value = "";
    _gqlSetStatus("压缩失败: " + e.message, true);
  }
  _gqlShowBalance(input);
}

function _gqlCopy() {
  const out = document.getElementById("gqlOutput");
  if (!out || !out.value) {
    if (typeof toast === "function") toast("没有可复制内容");
    return;
  }
  if (typeof safeCopy === "function") {
    safeCopy(out.value, "已复制格式化结果");
  } else if (typeof copyText === "function") {
    copyText("gqlOutput");
  }
}

function _gqlSample() {
  document.getElementById("gqlInput").value = _GQL_SAMPLE;
  _gqlFormat();
}

function _gqlClear() {
  document.getElementById("gqlInput").value = "";
  document.getElementById("gqlOutput").value = "";
  const bal = document.getElementById("gqlBalance");
  if (bal) bal.innerHTML = '<span class="gql-lint-empty">未检查</span>';
  _gqlSetStatus("已清空");
}

function gqlInit() {
  const inEl = document.getElementById("gqlInput");
  if (inEl && !inEl.value) {
    inEl.value = _GQL_SAMPLE;
  }
  _gqlFormat();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    formatGraphql: formatGraphql,
    minifyGraphql: minifyGraphql,
    checkGraphqlBalance: checkGraphqlBalance,
  };
}

if (typeof registerInit === "function") {
  registerInit("graphqlfmt", gqlInit);
}
