const {
  parseCookieHeader,
  parseSetCookie,
  buildSetCookie,
  buildCacheControl,
} = require("../../js/debug/cookiecache.js");

describe("parseCookieHeader", () => {
  test("解析多键值", () => {
    const r = parseCookieHeader("a=1; b=two; c=");
    expect(r.pairs).toHaveLength(3);
    expect(r.map.a).toBe("1");
    expect(r.map.b).toBe("two");
  });

  test("空输入", () => {
    expect(parseCookieHeader("").pairs).toEqual([]);
  });
});

describe("parseSetCookie", () => {
  test("解析属性与标志", () => {
    const c = parseSetCookie("sid=abc; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=60");
    expect(c.name).toBe("sid");
    expect(c.value).toBe("abc");
    expect(c.attributes.path).toBe("/");
    expect(c.attributes.httponly).toBe(true);
    expect(c.attributes.secure).toBe(true);
    expect(c.attributes.samesite).toBe("Lax");
    expect(c.attributes["max-age"]).toBe("60");
  });

  test("缺少 Secure 时有警告", () => {
    const c = parseSetCookie("a=1; Path=/");
    expect(c.warnings.some((w) => /Secure/.test(w))).toBe(true);
  });
});

describe("buildSetCookie", () => {
  test("生成完整头", () => {
    const h = buildSetCookie({
      name: "token",
      value: "x",
      path: "/",
      maxAge: 10,
      sameSite: "Lax",
      secure: true,
      httpOnly: true,
    });
    expect(h).toBe("token=x; Path=/; Max-Age=10; SameSite=Lax; Secure; HttpOnly");
  });

  test("名称为空抛错", () => {
    expect(() => buildSetCookie({ name: "" })).toThrow();
  });
});

describe("buildCacheControl", () => {
  test("no-store 优先", () => {
    const r = buildCacheControl({ noStore: true, maxAge: 100, public: true });
    expect(r.header).toBe("no-store");
  });

  test("组合指令", () => {
    const r = buildCacheControl({
      public: true,
      maxAge: 3600,
      immutable: true,
    });
    expect(r.header).toContain("public");
    expect(r.header).toContain("max-age=3600");
    expect(r.header).toContain("immutable");
  });
});
