const {
  jsonToCode,
  j2cParseJson,
  j2cInferType,
  j2cMergeTypes,
  j2cToPascalCase,
  j2cToCamelCase,
  j2cToGoFieldName,
  j2cSanitizeTypeName,
  j2cGenerateTypeScript,
  j2cGenerateKotlin,
  j2cGenerateGo,
  J2C_SAMPLE,
  J2C_LANGS,
} = require("../../js/codegen/json2code.js");

describe("j2cParseJson", () => {
  test("空输入报错", () => {
    expect(j2cParseJson("").ok).toBe(false);
    expect(j2cParseJson("   ").ok).toBe(false);
    expect(j2cParseJson(null).ok).toBe(false);
  });

  test("非法 JSON 友好报错", () => {
    const r = j2cParseJson("{a:1}");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/JSON 解析失败/);
  });

  test("合法 JSON 解析", () => {
    const r = j2cParseJson('{"x":1}');
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ x: 1 });
  });
});

describe("命名工具", () => {
  test("PascalCase / camelCase / Go 字段", () => {
    expect(j2cToPascalCase("user_name")).toBe("UserName");
    expect(j2cToPascalCase("user-id")).toBe("UserId");
    expect(j2cToCamelCase("UserName")).toBe("userName");
    expect(j2cToGoFieldName("user_name")).toBe("UserName");
  });

  test("sanitize 类型名", () => {
    expect(j2cSanitizeTypeName("root", "Root")).toBe("Root");
    expect(j2cSanitizeTypeName("123abc", "Root")).toMatch(/^T/);
  });
});

describe("类型推断", () => {
  test("标量类型", () => {
    expect(j2cInferType(null).kind).toBe("null");
    expect(j2cInferType("a").kind).toBe("string");
    expect(j2cInferType(true).kind).toBe("boolean");
    expect(j2cInferType(1)).toEqual({ kind: "number", isInteger: true });
    expect(j2cInferType(1.5)).toEqual({ kind: "number", isInteger: false });
  });

  test("对象与数组", () => {
    const t = j2cInferType({ a: 1, b: "x", c: [true] });
    expect(t.kind).toBe("object");
    expect(t.fields.a.type).toEqual({ kind: "number", isInteger: true });
    expect(t.fields.b.type.kind).toBe("string");
    expect(t.fields.c.type.kind).toBe("array");
    expect(t.fields.c.type.item.kind).toBe("boolean");
  });

  test("数组合并对象字段可选", () => {
    const a = j2cInferType({ id: 1, name: "a" });
    const b = j2cInferType({ id: 2 });
    const m = j2cMergeTypes(a, b);
    expect(m.fields.id.optional).toBe(false);
    expect(m.fields.name.optional).toBe(true);
  });
});

describe("TypeScript 生成", () => {
  test("简单对象 interface", () => {
    const schema = j2cInferType({ name: "n", age: 1, active: true });
    const code = j2cGenerateTypeScript(schema, "User");
    expect(code).toContain("export interface User");
    expect(code).toContain("name: string");
    expect(code).toContain("age: number");
    expect(code).toContain("active: boolean");
  });

  test("type 风格", () => {
    const schema = j2cInferType({ x: 1 });
    const code = j2cGenerateTypeScript(schema, "Foo", { tsStyle: "type" });
    expect(code).toContain("export type Foo = {");
    expect(code).toContain("x: number");
  });

  test("嵌套对象生成独立类型", () => {
    const schema = j2cInferType({
      profile: { city: "SH", age: 20 },
    });
    const code = j2cGenerateTypeScript(schema, "Root");
    expect(code).toContain("export interface Profile");
    expect(code).toContain("profile: Profile");
    expect(code).toContain("city: string");
  });

  test("数组对象与可选字段", () => {
    const schema = j2cInferType({
      orders: [
        { orderId: "1", amount: 1.5, paid: true },
        { orderId: "2", amount: 2 },
      ],
    });
    const code = j2cGenerateTypeScript(schema, "Root");
    expect(code).toMatch(/export interface Order/);
    expect(code).toContain("orders: Order[]");
    expect(code).toMatch(/paid\?: boolean/);
  });
});

describe("Kotlin 生成", () => {
  test("data class 基础字段", () => {
    const schema = j2cInferType({
      name: "n",
      age: 1,
      score: 1.2,
      active: true,
    });
    const code = j2cGenerateKotlin(schema, "UserDto");
    expect(code).toContain("data class UserDto(");
    expect(code).toContain("val name: String");
    expect(code).toContain("val age: Long");
    expect(code).toContain("val score: Double");
    expect(code).toContain("val active: Boolean");
  });

  test("嵌套与可选", () => {
    const schema = j2cInferType({
      items: [{ id: 1, title: "a" }, { id: 2 }],
    });
    const code = j2cGenerateKotlin(schema, "RootDto");
    expect(code).toMatch(/data class Item\(/);
    expect(code).toContain("val items: List<Item>");
    expect(code).toMatch(/val title: String\?/);
  });
});

describe("Go 生成", () => {
  test("struct + json tag", () => {
    const schema = j2cInferType({ user_name: "a", age: 1, score: 1.5 });
    const code = j2cGenerateGo(schema, "Root");
    expect(code).toContain("type Root struct {");
    expect(code).toMatch(/UserName\s+string\s+`json:"user_name"`/);
    expect(code).toMatch(/Age\s+int64\s+`json:"age"`/);
    expect(code).toMatch(/Score\s+float64\s+`json:"score"`/);
  });

  test("可选字段 omitempty 与指针", () => {
    const item = j2cInferType({ id: 1, name: "a" });
    const item2 = j2cInferType({ id: 2 });
    const merged = j2cMergeTypes(item, item2);
    const code = j2cGenerateGo(merged, "Order");
    expect(code).toContain('json:"name,omitempty"');
    expect(code).toMatch(/\*string/);
  });
});

describe("jsonToCode 集成", () => {
  test("支持三种语言", () => {
    expect(J2C_LANGS).toEqual(["typescript", "kotlin", "go"]);
    for (const lang of J2C_LANGS) {
      const r = jsonToCode(J2C_SAMPLE, lang, { rootName: "Root" });
      expect(r.ok).toBe(true);
      expect(r.code.length).toBeGreaterThan(20);
    }
  });

  test("非法语言报错", () => {
    const r = jsonToCode('{"a":1}', "java");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/不支持的语言/);
  });

  test("非法 JSON 报错", () => {
    const r = jsonToCode("{bad", "go");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/JSON 解析失败/);
  });

  test("Kotlin 默认根名 RootDto", () => {
    const r = jsonToCode('{"x":1}', "kotlin", {});
    expect(r.ok).toBe(true);
    expect(r.code).toContain("data class RootDto");
  });

  test("TS interface 默认", () => {
    const r = jsonToCode('{"x":1}', "typescript", { rootName: "Foo" });
    expect(r.ok).toBe(true);
    expect(r.code).toContain("export interface Foo");
  });
});
