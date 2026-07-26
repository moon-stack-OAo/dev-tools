const {
  parseToml,
  stringifyToml,
  formatToml,
  tomlToJsonString,
  jsonToTomlString,
  validateToml,
} = require("../../js/format/toml.js");

describe("parseToml 基础类型", () => {
  test("字符串 / 数字 / 布尔", () => {
    const obj = parseToml('name = "demo"\ncount = 42\nok = true\nflag = false\n');
    expect(obj).toEqual({ name: "demo", count: 42, ok: true, flag: false });
  });

  test("浮点与科学计数", () => {
    const obj = parseToml("a = 3.14\nb = 1e2\nc = -2.5e-1\n");
    expect(obj.a).toBeCloseTo(3.14);
    expect(obj.b).toBe(100);
    expect(obj.c).toBeCloseTo(-0.25);
  });

  test("数组", () => {
    const obj = parseToml('tags = ["a", "b", 1, true]\n');
    expect(obj.tags).toEqual(["a", "b", 1, true]);
  });

  test("内联表", () => {
    const obj = parseToml('meta = { active = true, level = 2 }\n');
    expect(obj.meta).toEqual({ active: true, level: 2 });
  });

  test("注释与空行", () => {
    const obj = parseToml("# c\n\nx = 1 # tail\n");
    expect(obj).toEqual({ x: 1 });
  });

  test("空输入", () => {
    expect(parseToml("")).toEqual({});
    expect(parseToml("   \n  ")).toEqual({});
  });
});

describe("parseToml 表结构", () => {
  test("[table]", () => {
    const obj = parseToml('[server]\nhost = "127.0.0.1"\nport = 8080\n');
    expect(obj).toEqual({ server: { host: "127.0.0.1", port: 8080 } });
  });

  test("点分表头", () => {
    const obj = parseToml("[a.b]\nx = 1\n");
    expect(obj).toEqual({ a: { b: { x: 1 } } });
  });

  test("[[array of tables]]", () => {
    const src = [
      "[[users]]",
      'name = "alice"',
      "[[users]]",
      'name = "bob"',
    ].join("\n");
    const obj = parseToml(src);
    expect(obj.users).toEqual([{ name: "alice" }, { name: "bob" }]);
  });

  test("顶层键 + 表混合", () => {
    const obj = parseToml('title = "t"\n[db]\nname = "app"\n');
    expect(obj).toEqual({ title: "t", db: { name: "app" } });
  });
});

describe("stringifyToml / formatToml", () => {
  test("基础对象序列化", () => {
    const out = stringifyToml({ a: 1, b: "x", c: true });
    expect(out).toContain("a = 1");
    expect(out).toContain('b = "x"');
    expect(out).toContain("c = true");
  });

  test("嵌套表", () => {
    const out = stringifyToml({ server: { port: 80 } });
    expect(out).toContain("[server]");
    expect(out).toContain("port = 80");
  });

  test("表数组", () => {
    const out = stringifyToml({ users: [{ name: "a" }, { name: "b" }] });
    expect(out).toContain("[[users]]");
    expect(out.match(/\[\[users\]\]/g).length).toBe(2);
  });

  test("formatToml 美化往返", () => {
    const src = 'title="x"\n[server]\nport=8080\n';
    const pretty = formatToml(src);
    const obj = parseToml(pretty);
    expect(obj).toEqual({ title: "x", server: { port: 8080 } });
  });
});

describe("TOML ↔ JSON", () => {
  test("TOML → JSON", () => {
    const json = tomlToJsonString('a = 1\n[b]\nc = "d"\n', true);
    expect(JSON.parse(json)).toEqual({ a: 1, b: { c: "d" } });
  });

  test("JSON → TOML", () => {
    const toml = jsonToTomlString('{"a":1,"b":{"c":"d"}}');
    const obj = parseToml(toml);
    expect(obj).toEqual({ a: 1, b: { c: "d" } });
  });

  test("往返：复杂结构", () => {
    const src = [
      'title = "Dev Tools"',
      "enabled = true",
      'tags = ["format", "toml"]',
      "",
      "[server]",
      "port = 8080",
      "",
      "[[users]]",
      'name = "alice"',
      "roles = [\"admin\"]",
      "",
      "[[users]]",
      'name = "bob"',
      "meta = { active = true, level = 2 }",
    ].join("\n");
    const obj1 = parseToml(src);
    const again = parseToml(stringifyToml(obj1));
    expect(again).toEqual(obj1);
  });
});

describe("validateToml", () => {
  test("合法", () => {
    const r = validateToml("a = 1\n");
    expect(r.ok).toBe(true);
  });

  test("非法：缺少等号，含行号", () => {
    const r = validateToml("a 1\n");
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/第\s*1\s*行/);
  });

  test("非法：字符串未闭合", () => {
    const r = validateToml('a = "oops\n');
    expect(r.ok).toBe(false);
  });

  test("非法 JSON → TOML", () => {
    expect(() => jsonToTomlString("{bad")).toThrow(/JSON/);
  });
});
