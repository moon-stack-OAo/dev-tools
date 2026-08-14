// JSON → TypeScript / Kotlin / Go / C# / Python / Rust
// 纯函数导出供单元测试 require；UI 通过 registerInit 挂载。

const J2C_SAMPLE = `{
  "id": 1,
  "name": "张三",
  "email": "zhangsan@example.com",
  "active": true,
  "score": 98.5,
  "tags": ["dev", "java"],
  "profile": {
    "city": "上海",
    "age": 28
  },
  "orders": [
    {
      "orderId": "O1001",
      "amount": 199.9,
      "paid": true
    },
    {
      "orderId": "O1002",
      "amount": 59.0
    }
  ]
}`;

const J2C_LANGS = ["typescript", "kotlin", "go", "csharp", "python", "rust"];

// ============== 命名工具 ==============

function j2cIsIdentStart(ch) {
  return /[A-Za-z_$]/.test(ch);
}

function j2cIsIdentPart(ch) {
  return /[A-Za-z0-9_$]/.test(ch);
}

/** 将任意 key 拆成单词片段 */
function j2cSplitWords(name) {
  const s = String(name == null ? "" : name).trim();
  if (!s) return [];
  const normalized = s
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim();
  if (!normalized) return [];
  return normalized.split(/\s+/).filter(Boolean);
}

function j2cToPascalCase(name) {
  const words = j2cSplitWords(name);
  if (!words.length) return "Root";
  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

function j2cToCamelCase(name) {
  const p = j2cToPascalCase(name);
  if (!p) return "field";
  return p.charAt(0).toLowerCase() + p.slice(1);
}

/** Go 导出字段名（首字母大写） */
function j2cToGoFieldName(name) {
  const p = j2cToPascalCase(name);
  // 常见缩写保持大写（可选轻量处理）
  return p || "Field";
}

/** 保证合法类型/标识符名 */
function j2cSanitizeTypeName(name, fallback) {
  let n = j2cToPascalCase(name || fallback || "Root");
  if (!n || !j2cIsIdentStart(n.charAt(0))) n = "T" + n;
  n = n
    .split("")
    .map((c, i) => (j2cIsIdentPart(c) ? c : i === 0 ? "T" : ""))
    .join("");
  if (!n) n = fallback || "Root";
  return n;
}

function j2cSanitizeFieldName(name, fallback) {
  let n = j2cToCamelCase(name || fallback || "field");
  if (!n || !j2cIsIdentStart(n.charAt(0))) n = "f" + n;
  n = n
    .split("")
    .filter((c) => j2cIsIdentPart(c))
    .join("");
  if (!n) n = fallback || "field";
  // TS/Kotlin/Go 关键字简单规避
  const reserved = {
    default: true,
    class: true,
    interface: true,
    type: true,
    package: true,
    return: true,
    function: true,
    var: true,
    let: true,
    const: true,
    import: true,
    export: true,
    from: true,
    as: true,
    new: true,
    this: true,
    super: true,
    extends: true,
    implements: true,
    private: true,
    public: true,
    protected: true,
    static: true,
    void: true,
    null: true,
    true: true,
    false: true,
    in: true,
    of: true,
    for: true,
    while: true,
    if: true,
    else: true,
    switch: true,
    case: true,
    break: true,
    continue: true,
    try: true,
    catch: true,
    finally: true,
    throw: true,
    async: true,
    await: true,
    yield: true,
    with: true,
    delete: true,
    typeof: true,
    instanceof: true,
    enum: true,
    data: true,
    object: true,
    fun: true,
    val: true,
    when: true,
    is: true,
    as: true,
    typealias: true,
    companion: true,
    struct: true,
    map: true,
    chan: true,
    go: true,
    defer: true,
    range: true,
    select: true,
    fallthrough: true,
    func: true,
  };
  if (reserved[n]) n = n + "_";
  return n;
}

// ============== 类型推断 ==============
// Type 节点:
// { kind: 'null' }
// { kind: 'string' }
// { kind: 'number', isInteger: boolean }
// { kind: 'boolean' }
// { kind: 'any' }
// { kind: 'array', item: Type }
// { kind: 'object', fields: { [jsonKey]: { type: Type, optional: boolean } }, nameHint?: string }

function j2cInferType(value) {
  if (value === null || value === undefined) return { kind: "null" };
  const t = typeof value;
  if (t === "string") return { kind: "string" };
  if (t === "boolean") return { kind: "boolean" };
  if (t === "number") {
    if (!Number.isFinite(value)) return { kind: "number", isInteger: false };
    return { kind: "number", isInteger: Number.isInteger(value) };
  }
  if (Array.isArray(value)) {
    if (!value.length) return { kind: "array", item: { kind: "any" } };
    let item = j2cInferType(value[0]);
    for (let i = 1; i < value.length; i++) {
      item = j2cMergeTypes(item, j2cInferType(value[i]));
    }
    return { kind: "array", item: item };
  }
  if (t === "object") {
    const fields = {};
    for (const [k, v] of Object.entries(value)) {
      fields[k] = { type: j2cInferType(v), optional: false };
    }
    return { kind: "object", fields: fields };
  }
  return { kind: "any" };
}

function j2cMergeTypes(a, b) {
  if (!a) return b;
  if (!b) return a;
  if (a.kind === "any") return b.kind === "null" ? a : b;
  if (b.kind === "any") return a.kind === "null" ? b : a;
  if (a.kind === "null") return j2cMakeOptional(b);
  if (b.kind === "null") return j2cMakeOptional(a);
  if (a.kind !== b.kind) {
    // number 与 boolean/string 等不同 → any
    if (
      (a.kind === "number" && b.kind === "number") ||
      (a.kind === "string" && b.kind === "string") ||
      (a.kind === "boolean" && b.kind === "boolean")
    ) {
      // same kind handled below
    } else {
      return { kind: "any" };
    }
  }
  if (a.kind === "string" || a.kind === "boolean") return a;
  if (a.kind === "number") {
    return {
      kind: "number",
      isInteger: !!(a.isInteger && b.isInteger),
    };
  }
  if (a.kind === "array") {
    return { kind: "array", item: j2cMergeTypes(a.item, b.item) };
  }
  if (a.kind === "object") {
    const keys = new Set([
      ...Object.keys(a.fields || {}),
      ...Object.keys(b.fields || {}),
    ]);
    const fields = {};
    for (const k of keys) {
      const fa = a.fields && a.fields[k];
      const fb = b.fields && b.fields[k];
      if (fa && fb) {
        fields[k] = {
          type: j2cMergeTypes(fa.type, fb.type),
          optional: !!(fa.optional || fb.optional),
        };
      } else if (fa) {
        fields[k] = { type: fa.type, optional: true };
      } else {
        fields[k] = { type: fb.type, optional: true };
      }
    }
    return { kind: "object", fields: fields, nameHint: a.nameHint || b.nameHint };
  }
  return { kind: "any" };
}

function j2cMakeOptional(type) {
  if (!type) return { kind: "any" };
  if (type.kind === "object") {
    const fields = {};
    for (const [k, f] of Object.entries(type.fields || {})) {
      fields[k] = { type: f.type, optional: true };
    }
    return { kind: "object", fields: fields, nameHint: type.nameHint };
  }
  // 标量 null 合并：在生成侧用 optional / pointer / nullable
  return Object.assign({}, type, { nullable: true });
}

// ============== 类型图收集（嵌套对象命名） ==============

function j2cCollectNamedTypes(rootType, rootName) {
  const types = []; // [{ name, type }] 声明顺序：依赖在前
  const usedNames = new Set();
  const pathNames = new Map(); // object identity path key -> name

  function uniqueName(base) {
    let n = j2cSanitizeTypeName(base, "Type");
    if (!usedNames.has(n)) {
      usedNames.add(n);
      return n;
    }
    let i = 2;
    while (usedNames.has(n + i)) i++;
    const finalName = n + i;
    usedNames.add(finalName);
    return finalName;
  }

  function walk(type, hint, path) {
    if (!type) return type;
    if (type.kind === "array") {
      const itemHint = hint
        ? j2cSanitizeTypeName(hint.replace(/s$/i, "") || hint + "Item", "Item")
        : "Item";
      const item = walk(type.item, itemHint, path + "[]");
      return { kind: "array", item: item, nullable: type.nullable };
    }
    if (type.kind !== "object") {
      return type;
    }
    // 先处理子字段
    const fields = {};
    for (const [k, f] of Object.entries(type.fields || {})) {
      const childHint = j2cToPascalCase(k);
      fields[k] = {
        type: walk(f.type, childHint, path + "." + k),
        optional: !!f.optional,
      };
    }
    const name = uniqueName(hint || rootName || "Root");
    const named = {
      kind: "object",
      fields: fields,
      name: name,
      nullable: type.nullable,
    };
    types.push({ name: name, type: named });
    pathNames.set(path, name);
    return named;
  }

  const root = walk(rootType, rootName, "$");
  // walk 会把 root 也 push 进去；保持依赖在前：当前实现是子先 push 再 push 自己，正确
  return { root: root, types: types };
}

// ============== 语言映射 ==============

function j2cTsScalar(type) {
  if (!type) return "unknown";
  switch (type.kind) {
    case "null":
      return "null";
    case "string":
      return "string";
    case "boolean":
      return "boolean";
    case "number":
      return "number";
    case "any":
      return "unknown";
    default:
      return "unknown";
  }
}

function j2cRenderTsType(type) {
  if (!type) return "unknown";
  if (type.kind === "array") {
    const inner = j2cRenderTsType(type.item);
    const base = inner.includes("|") || inner.includes("&") ? "(" + inner + ")" : inner;
    const arr = base + "[]";
    return type.nullable ? arr + " | null" : arr;
  }
  if (type.kind === "object") {
    const n = type.name || "Record<string, unknown>";
    return type.nullable ? n + " | null" : n;
  }
  const s = j2cTsScalar(type);
  return type.nullable ? s + " | null" : s;
}

function j2cGenerateTypeScript(rootType, rootName, opts) {
  opts = opts || {};
  const style = opts.tsStyle === "type" ? "type" : "interface";
  const root = j2cSanitizeTypeName(rootName, "Root");
  const { types } = j2cCollectNamedTypes(rootType, root);
  const blocks = [];

  for (const entry of types) {
    const t = entry.type;
    const lines = [];
    if (style === "type") {
      lines.push("export type " + entry.name + " = {");
    } else {
      lines.push("export interface " + entry.name + " {");
    }
    const keys = Object.keys(t.fields || {});
    if (!keys.length) {
      // 空对象
    }
    for (const k of keys) {
      const f = t.fields[k];
      const fieldName = j2cSanitizeFieldName(k, "field");
      // 保留原 JSON key 若与标识符不同，用引号
      const needQuote = fieldName !== k || !/^[A-Za-z_$][\w$]*$/.test(k);
      const left = needQuote ? JSON.stringify(k) : fieldName;
      const opt = f.optional ? "?" : "";
      lines.push("  " + left + opt + ": " + j2cRenderTsType(f.type) + ";");
    }
    if (style === "type") {
      lines.push("};");
    } else {
      lines.push("}");
    }
    blocks.push(lines.join("\n"));
  }

  if (!blocks.length) {
    // 根不是 object（如数组根）
    if (rootType && rootType.kind === "array") {
      const { types: itemTypes, root: itemRoot } = j2cCollectNamedTypes(
        rootType.item,
        root + "Item",
      );
      const itemBlocks = [];
      for (const entry of itemTypes) {
        const t = entry.type;
        const lines = [];
        if (style === "type") {
          lines.push("export type " + entry.name + " = {");
        } else {
          lines.push("export interface " + entry.name + " {");
        }
        for (const k of Object.keys(t.fields || {})) {
          const f = t.fields[k];
          const fieldName = j2cSanitizeFieldName(k, "field");
          const needQuote = fieldName !== k || !/^[A-Za-z_$][\w$]*$/.test(k);
          const left = needQuote ? JSON.stringify(k) : fieldName;
          const opt = f.optional ? "?" : "";
          lines.push("  " + left + opt + ": " + j2cRenderTsType(f.type) + ";");
        }
        lines.push(style === "type" ? "};" : "}");
        itemBlocks.push(lines.join("\n"));
      }
      const itemName =
        itemRoot && itemRoot.name
          ? itemRoot.name
          : j2cRenderTsType(rootType.item);
      itemBlocks.push("export type " + root + " = " + itemName + "[];");
      return itemBlocks.join("\n\n") + "\n";
    }
    return "export type " + root + " = " + j2cRenderTsType(rootType) + ";\n";
  }
  return blocks.join("\n\n") + "\n";
}

function j2cKtScalar(type) {
  if (!type) return "Any?";
  switch (type.kind) {
    case "null":
      return "Any?";
    case "string":
      return type.nullable ? "String?" : "String";
    case "boolean":
      return type.nullable ? "Boolean?" : "Boolean";
    case "number":
      if (type.isInteger) return type.nullable ? "Long?" : "Long";
      return type.nullable ? "Double?" : "Double";
    case "any":
      return "Any?";
    default:
      return "Any?";
  }
}

function j2cRenderKtType(type, optional) {
  if (!type) return "Any?";
  if (type.kind === "array") {
    const inner = j2cRenderKtType(type.item, false);
    const list = "List<" + inner + ">";
    return optional || type.nullable ? list + "?" : list;
  }
  if (type.kind === "object") {
    const n = type.name || "Map<String, Any?>";
    return optional || type.nullable ? n + "?" : n;
  }
  const s = j2cKtScalar(type);
  if (optional && !s.endsWith("?")) return s + "?";
  return s;
}

function j2cGenerateKotlin(rootType, rootName) {
  const root = j2cSanitizeTypeName(rootName, "RootDto");
  // 根为数组时特殊处理
  if (rootType && rootType.kind === "array") {
    const itemHint = root.replace(/s$/i, "") || root + "Item";
    const { types, root: itemRoot } = j2cCollectNamedTypes(
      rootType.item,
      itemHint,
    );
    const blocks = types.map((entry) => j2cRenderKtDataClass(entry));
    const itemName =
      itemRoot && itemRoot.name
        ? itemRoot.name
        : j2cRenderKtType(rootType.item, false);
    blocks.push(
      "// 根类型为数组: List<" + itemName + ">\n// typealias " + root + " = List<" + itemName + ">",
    );
    return blocks.join("\n\n") + "\n";
  }
  if (!rootType || rootType.kind !== "object") {
    return (
      "data class " +
      root +
      "(\n    val value: " +
      j2cRenderKtType(rootType, false) +
      "\n)\n"
    );
  }
  const { types } = j2cCollectNamedTypes(rootType, root);
  return types.map((entry) => j2cRenderKtDataClass(entry)).join("\n\n") + "\n";
}

function j2cRenderKtDataClass(entry) {
  const t = entry.type;
  const keys = Object.keys(t.fields || {});
  if (!keys.length) {
    return "data class " + entry.name + "()";
  }
  const lines = ["data class " + entry.name + "("];
  keys.forEach((k, idx) => {
    const f = t.fields[k];
    const fieldName = j2cSanitizeFieldName(k, "field");
    const typ = j2cRenderKtType(f.type, f.optional);
    const comma = idx < keys.length - 1 ? "," : "";
    // JSON 名与属性名不同时加 @SerialName 注释提示（无依赖序列化库，仅注释）
    if (fieldName !== k) {
      lines.push("    // json: \"" + k + "\"");
    }
    lines.push("    val " + fieldName + ": " + typ + comma);
  });
  lines.push(")");
  return lines.join("\n");
}

function j2cGoScalar(type) {
  if (!type) return "interface{}";
  switch (type.kind) {
    case "null":
      return "interface{}";
    case "string":
      return "string";
    case "boolean":
      return "bool";
    case "number":
      return type.isInteger ? "int64" : "float64";
    case "any":
      return "interface{}";
    default:
      return "interface{}";
  }
}

function j2cRenderGoType(type, optional) {
  if (!type) return "interface{}";
  if (type.kind === "array") {
    return "[]" + j2cRenderGoType(type.item, false);
  }
  if (type.kind === "object") {
    const n = type.name || "map[string]interface{}";
    if (optional || type.nullable) return "*" + n;
    return n;
  }
  const s = j2cGoScalar(type);
  if (optional || type.nullable) {
    if (s === "interface{}") return s;
    return "*" + s;
  }
  return s;
}

function j2cGenerateGo(rootType, rootName) {
  const root = j2cSanitizeTypeName(rootName, "Root");
  if (rootType && rootType.kind === "array") {
    const itemHint = root.replace(/s$/i, "") || root + "Item";
    const { types, root: itemRoot } = j2cCollectNamedTypes(
      rootType.item,
      itemHint,
    );
    const blocks = types.map((entry) => j2cRenderGoStruct(entry));
    const itemName =
      itemRoot && itemRoot.name
        ? itemRoot.name
        : j2cRenderGoType(rootType.item, false);
    blocks.push("// 根类型为数组: type " + root + " []" + itemName);
    return blocks.join("\n\n") + "\n";
  }
  if (!rootType || rootType.kind !== "object") {
    return (
      "type " +
      root +
      " " +
      j2cRenderGoType(rootType, false) +
      "\n"
    );
  }
  const { types } = j2cCollectNamedTypes(rootType, root);
  return types.map((entry) => j2cRenderGoStruct(entry)).join("\n\n") + "\n";
}

function j2cRenderGoStruct(entry) {
  const t = entry.type;
  const keys = Object.keys(t.fields || {});
  const lines = ["type " + entry.name + " struct {"];
  if (!keys.length) {
    lines.push("}");
    return lines.join("\n");
  }
  // 对齐字段
  const rows = keys.map((k) => {
    const f = t.fields[k];
    return {
      name: j2cToGoFieldName(k),
      type: j2cRenderGoType(f.type, f.optional),
      tag: '`json:"' + k + (f.optional ? ",omitempty" : "") + '"`',
    };
  });
  let maxName = 0;
  let maxType = 0;
  rows.forEach((r) => {
    if (r.name.length > maxName) maxName = r.name.length;
    if (r.type.length > maxType) maxType = r.type.length;
  });
  rows.forEach((r) => {
    lines.push(
      "\t" +
        r.name.padEnd(maxName) +
        " " +
        r.type.padEnd(maxType) +
        " " +
        r.tag,
    );
  });
  lines.push("}");
  return lines.join("\n");
}

// ============== C# ==============

function j2cCsScalar(type) {
  if (!type) return "object";
  switch (type.kind) {
    case "null":
      return "object";
    case "string":
      return "string";
    case "boolean":
      return "bool";
    case "number":
      return type.isInteger ? "long" : "double";
    case "any":
      return "object";
    default:
      return "object";
  }
}

function j2cRenderCsType(type, optional) {
  if (!type) return "object";
  if (type.kind === "array") {
    const inner = j2cRenderCsType(type.item, false);
    const list = "List<" + inner + ">";
    return optional || type.nullable ? list + "?" : list;
  }
  if (type.kind === "object") {
    const n = type.name || "Dictionary<string, object>";
    return optional || type.nullable ? n + "?" : n;
  }
  const s = j2cCsScalar(type);
  // string/object 引用类型在 C# 可空用 ?
  if (optional || type.nullable) {
    if (s === "object" || s === "string") return s + "?";
    return s + "?";
  }
  return s;
}

function j2cGenerateCSharp(rootType, rootName) {
  const root = j2cSanitizeTypeName(rootName, "Root");
  if (rootType && rootType.kind === "array") {
    const itemHint = root.replace(/s$/i, "") || root + "Item";
    const { types, root: itemRoot } = j2cCollectNamedTypes(
      rootType.item,
      itemHint,
    );
    const blocks = types.map((entry) => j2cRenderCsClass(entry));
    const itemName =
      itemRoot && itemRoot.name
        ? itemRoot.name
        : j2cRenderCsType(rootType.item, false);
    blocks.push("// 根类型为数组: List<" + itemName + ">");
    return "using System;\nusing System.Collections.Generic;\n\n" + blocks.join("\n\n") + "\n";
  }
  if (!rootType || rootType.kind !== "object") {
    return (
      "using System;\n\npublic class " +
      root +
      "\n{\n    public " +
      j2cRenderCsType(rootType, false) +
      " Value { get; set; }\n}\n"
    );
  }
  const { types } = j2cCollectNamedTypes(rootType, root);
  const body = types.map((entry) => j2cRenderCsClass(entry)).join("\n\n");
  return "using System;\nusing System.Collections.Generic;\n\n" + body + "\n";
}

function j2cRenderCsClass(entry) {
  const t = entry.type;
  const keys = Object.keys(t.fields || {});
  const lines = ["public class " + entry.name, "{"];
  if (!keys.length) {
    lines.push("}");
    return lines.join("\n");
  }
  keys.forEach((k) => {
    const f = t.fields[k];
    const propName = j2cToPascalCase(k) || "Field";
    const typ = j2cRenderCsType(f.type, f.optional);
    if (propName !== k) {
      lines.push("    // json: \"" + k + "\"");
    }
    lines.push("    public " + typ + " " + propName + " { get; set; }");
  });
  lines.push("}");
  return lines.join("\n");
}

// ============== Python ==============

function j2cPyScalar(type) {
  if (!type) return "Any";
  switch (type.kind) {
    case "null":
      return "None";
    case "string":
      return "str";
    case "boolean":
      return "bool";
    case "number":
      return type.isInteger ? "int" : "float";
    case "any":
      return "Any";
    default:
      return "Any";
  }
}

function j2cRenderPyType(type, optional) {
  if (!type) return "Any";
  let base;
  if (type.kind === "array") {
    base = "List[" + j2cRenderPyType(type.item, false) + "]";
  } else if (type.kind === "object") {
    base = type.name || "Dict[str, Any]";
  } else {
    base = j2cPyScalar(type);
  }
  if (optional || type.nullable) {
    if (base === "None") return "None";
    return "Optional[" + base + "]";
  }
  return base;
}

function j2cGeneratePython(rootType, rootName) {
  const root = j2cSanitizeTypeName(rootName, "Root");
  if (rootType && rootType.kind === "array") {
    const itemHint = root.replace(/s$/i, "") || root + "Item";
    const { types, root: itemRoot } = j2cCollectNamedTypes(
      rootType.item,
      itemHint,
    );
    const blocks = types.map((entry) => j2cRenderPyDataclass(entry));
    const itemName =
      itemRoot && itemRoot.name
        ? itemRoot.name
        : j2cRenderPyType(rootType.item, false);
    blocks.push("# 根类型为数组: List[" + itemName + "]");
    return j2cPyHeader() + blocks.join("\n\n") + "\n";
  }
  if (!rootType || rootType.kind !== "object") {
    return (
      j2cPyHeader() +
      "@dataclass\nclass " +
      root +
      ":\n    value: " +
      j2cRenderPyType(rootType, false) +
      "\n"
    );
  }
  const { types } = j2cCollectNamedTypes(rootType, root);
  return j2cPyHeader() + types.map((entry) => j2cRenderPyDataclass(entry)).join("\n\n") + "\n";
}

function j2cPyHeader() {
  return (
    "from __future__ import annotations\n\n" +
    "from dataclasses import dataclass\n" +
    "from typing import Any, Dict, List, Optional\n\n"
  );
}

function j2cRenderPyDataclass(entry) {
  const t = entry.type;
  const keys = Object.keys(t.fields || {});
  const lines = ["@dataclass", "class " + entry.name + ":"];
  if (!keys.length) {
    lines.push("    pass");
    return lines.join("\n");
  }
  keys.forEach((k) => {
    const f = t.fields[k];
    const fieldName = j2cSanitizeFieldName(k, "field");
    const typ = j2cRenderPyType(f.type, f.optional);
    if (fieldName !== k) {
      lines.push("    # json: \"" + k + "\"");
    }
    lines.push("    " + fieldName + ": " + typ);
  });
  return lines.join("\n");
}

// ============== Rust ==============

function j2cRustScalar(type) {
  if (!type) return "serde_json::Value";
  switch (type.kind) {
    case "null":
      return "serde_json::Value";
    case "string":
      return "String";
    case "boolean":
      return "bool";
    case "number":
      return type.isInteger ? "i64" : "f64";
    case "any":
      return "serde_json::Value";
    default:
      return "serde_json::Value";
  }
}

function j2cRenderRustType(type, optional) {
  if (!type) return "serde_json::Value";
  let base;
  if (type.kind === "array") {
    base = "Vec<" + j2cRenderRustType(type.item, false) + ">";
  } else if (type.kind === "object") {
    base = type.name || "serde_json::Map<String, serde_json::Value>";
  } else {
    base = j2cRustScalar(type);
  }
  if (optional || type.nullable) {
    return "Option<" + base + ">";
  }
  return base;
}

function j2cGenerateRust(rootType, rootName) {
  const root = j2cSanitizeTypeName(rootName, "Root");
  if (rootType && rootType.kind === "array") {
    const itemHint = root.replace(/s$/i, "") || root + "Item";
    const { types, root: itemRoot } = j2cCollectNamedTypes(
      rootType.item,
      itemHint,
    );
    const blocks = types.map((entry) => j2cRenderRustStruct(entry));
    const itemName =
      itemRoot && itemRoot.name
        ? itemRoot.name
        : j2cRenderRustType(rootType.item, false);
    blocks.push("// 根类型为数组: Vec<" + itemName + ">");
    return j2cRustHeader() + blocks.join("\n\n") + "\n";
  }
  if (!rootType || rootType.kind !== "object") {
    return (
      j2cRustHeader() +
      "#[derive(Debug, Clone, Serialize, Deserialize)]\n" +
      "pub struct " +
      root +
      " {\n    pub value: " +
      j2cRenderRustType(rootType, false) +
      ",\n}\n"
    );
  }
  const { types } = j2cCollectNamedTypes(rootType, root);
  return j2cRustHeader() + types.map((entry) => j2cRenderRustStruct(entry)).join("\n\n") + "\n";
}

function j2cRustHeader() {
  return "use serde::{Deserialize, Serialize};\n\n";
}

function j2cRenderRustStruct(entry) {
  const t = entry.type;
  const keys = Object.keys(t.fields || {});
  const lines = [
    "#[derive(Debug, Clone, Serialize, Deserialize)]",
    "pub struct " + entry.name + " {",
  ];
  if (!keys.length) {
    lines.push("}");
    return lines.join("\n");
  }
  keys.forEach((k) => {
    const f = t.fields[k];
    // snake_case 字段名
    const fieldName = j2cToSnakeCase(k);
    const typ = j2cRenderRustType(f.type, f.optional);
    if (fieldName !== k) {
      lines.push('    #[serde(rename = "' + k + '")]');
    }
    if (f.optional) {
      lines.push('    #[serde(default, skip_serializing_if = "Option::is_none")]');
    }
    lines.push("    pub " + fieldName + ": " + typ + ",");
  });
  lines.push("}");
  return lines.join("\n");
}

function j2cToSnakeCase(name) {
  const words = j2cSplitWords(name);
  if (!words.length) return "field";
  let n = words.map((w) => w.toLowerCase()).join("_");
  if (!j2cIsIdentStart(n.charAt(0))) n = "f_" + n;
  n = n
    .split("")
    .map((c) => (/[A-Za-z0-9_]/.test(c) ? c : "_"))
    .join("");
  // Rust 关键字简单规避
  const reserved = {
    type: true,
    match: true,
    self: true,
    super: true,
    crate: true,
    mod: true,
    use: true,
    pub: true,
    fn: true,
    let: true,
    mut: true,
    ref: true,
    impl: true,
    trait: true,
    struct: true,
    enum: true,
    where: true,
    as: true,
    in: true,
    if: true,
    else: true,
    loop: true,
    while: true,
    for: true,
    return: true,
    break: true,
    continue: true,
    move: true,
    box: true,
    true: true,
    false: true,
  };
  if (reserved[n]) n = n + "_";
  return n || "field";
}

// ============== 主入口 ==============

function j2cParseJson(text) {
  if (text == null || String(text).trim() === "") {
    return { ok: false, error: "请输入 JSON", value: null };
  }
  try {
    const value = JSON.parse(String(text));
    return { ok: true, error: null, value: value };
  } catch (e) {
    return {
      ok: false,
      error: "JSON 解析失败: " + (e && e.message ? e.message : String(e)),
      value: null,
    };
  }
}

/**
 * @param {string} jsonText
 * @param {string} lang - typescript | kotlin | go | csharp | python | rust
 * @param {{ rootName?: string, tsStyle?: 'interface'|'type' }} options
 * @returns {{ ok: boolean, code?: string, error?: string }}
 */
function jsonToCode(jsonText, lang, options) {
  options = options || {};
  const parsed = j2cParseJson(jsonText);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const language = String(lang || "typescript").toLowerCase();
  if (J2C_LANGS.indexOf(language) < 0) {
    return {
      ok: false,
      error: "不支持的语言: " + lang + "（支持: " + J2C_LANGS.join(", ") + "）",
    };
  }

  let rootName = (options.rootName || "").trim();
  if (!rootName) {
    rootName = language === "kotlin" ? "RootDto" : "Root";
  }
  rootName = j2cSanitizeTypeName(rootName, language === "kotlin" ? "RootDto" : "Root");

  const schema = j2cInferType(parsed.value);
  let code;
  try {
    if (language === "typescript") {
      code = j2cGenerateTypeScript(schema, rootName, {
        tsStyle: options.tsStyle || "interface",
      });
    } else if (language === "kotlin") {
      code = j2cGenerateKotlin(schema, rootName);
    } else if (language === "go") {
      code = j2cGenerateGo(schema, rootName);
    } else if (language === "csharp") {
      code = j2cGenerateCSharp(schema, rootName);
    } else if (language === "python") {
      code = j2cGeneratePython(schema, rootName);
    } else if (language === "rust") {
      code = j2cGenerateRust(schema, rootName);
    } else {
      code = j2cGenerateGo(schema, rootName);
    }
  } catch (e) {
    return {
      ok: false,
      error: "生成失败: " + (e && e.message ? e.message : String(e)),
    };
  }
  return { ok: true, code: code };
}

// ============== UI ==============

function j2cGetLang() {
  const sel = document.getElementById("j2cLang");
  return sel ? sel.value : "typescript";
}

function j2cGetRootName() {
  const el = document.getElementById("j2cRoot");
  return el ? el.value.trim() : "";
}

function j2cGetTsStyle() {
  const el = document.getElementById("j2cTsStyle");
  return el ? el.value : "interface";
}

function j2cSetOutput(text, isError) {
  const out = document.getElementById("j2cOutput");
  if (!out) return;
  out.textContent = text || "";
  if (isError) out.classList.add("error");
  else out.classList.remove("error");
}

function j2cUpdateLangUi() {
  const lang = j2cGetLang();
  const tsWrap = document.getElementById("j2cTsStyleWrap");
  if (tsWrap) tsWrap.style.display = lang === "typescript" ? "" : "none";
  const root = document.getElementById("j2cRoot");
  if (root && !root.dataset.userEdited) {
    root.placeholder = lang === "kotlin" ? "RootDto" : "Root";
    if (!root.value || root.value === "Root" || root.value === "RootDto") {
      root.value = lang === "kotlin" ? "RootDto" : "Root";
    }
  }
  const label = document.getElementById("j2cOutLabel");
  if (label) {
    const names = {
      typescript: "TypeScript",
      kotlin: "Kotlin",
      go: "Go",
      csharp: "C#",
      python: "Python",
      rust: "Rust",
    };
    label.textContent = "生成的 " + (names[lang] || lang) + " 代码";
  }
}

function j2cGenerate() {
  const input = document.getElementById("j2cInput");
  const text = input ? input.value : "";
  const r = jsonToCode(text, j2cGetLang(), {
    rootName: j2cGetRootName(),
    tsStyle: j2cGetTsStyle(),
  });
  if (!r.ok) {
    j2cSetOutput(r.error, true);
    return;
  }
  j2cSetOutput(r.code, false);
}

function j2cClear() {
  const input = document.getElementById("j2cInput");
  if (input) input.value = "";
  j2cSetOutput("", false);
}

function j2cLoadSample() {
  const input = document.getElementById("j2cInput");
  if (input) input.value = J2C_SAMPLE;
  j2cGenerate();
}

function j2cCopy() {
  if (typeof copyText === "function") copyText("j2cOutput");
}

function j2cInit() {
  j2cUpdateLangUi();
  const root = document.getElementById("j2cRoot");
  if (root) {
    root.addEventListener("input", function () {
      root.dataset.userEdited = "1";
    });
  }
  const lang = document.getElementById("j2cLang");
  if (lang) {
    lang.addEventListener("change", function () {
      j2cUpdateLangUi();
      const input = document.getElementById("j2cInput");
      if (input && input.value.trim()) j2cGenerate();
    });
  }
  const tsStyle = document.getElementById("j2cTsStyle");
  if (tsStyle) {
    tsStyle.addEventListener("change", function () {
      const input = document.getElementById("j2cInput");
      if (input && input.value.trim()) j2cGenerate();
    });
  }
}

if (typeof window !== "undefined") {
  window.j2cGenerate = j2cGenerate;
  window.j2cClear = j2cClear;
  window.j2cLoadSample = j2cLoadSample;
  window.j2cCopy = j2cCopy;
  window.j2cUpdateLangUi = j2cUpdateLangUi;
}

if (typeof registerInit !== "undefined") {
  registerInit("json2code", j2cInit);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    jsonToCode,
    j2cParseJson,
    j2cInferType,
    j2cMergeTypes,
    j2cToPascalCase,
    j2cToCamelCase,
    j2cToSnakeCase,
    j2cToGoFieldName,
    j2cSanitizeTypeName,
    j2cSanitizeFieldName,
    j2cCollectNamedTypes,
    j2cGenerateTypeScript,
    j2cGenerateKotlin,
    j2cGenerateGo,
    j2cGenerateCSharp,
    j2cGeneratePython,
    j2cGenerateRust,
    J2C_SAMPLE,
    J2C_LANGS,
  };
}
