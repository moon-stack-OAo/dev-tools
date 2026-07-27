const { desensitizeText } = require("../../js/text/desensitize.js");

describe("desensitizeText", () => {
  test("手机号脱敏", () => {
    const r = desensitizeText("联系 13812345678 谢谢", { types: ["phone"] });
    expect(r.text).toContain("138****5678");
    expect(r.hits.phone).toBe(1);
  });

  test("身份证脱敏", () => {
    const r = desensitizeText("110101199001011234", { types: ["idcard"] });
    expect(r.text).toBe("110101********1234");
  });

  test("邮箱脱敏", () => {
    const r = desensitizeText("a@b.com 与 zhangsan@example.com", { types: ["email"] });
    expect(r.text).toMatch(/z\*\*\*n@example\.com/);
    expect(r.hits.email).toBe(2);
  });

  test("银行卡中间打码", () => {
    const r = desensitizeText("6222021234567890123", { types: ["bank"] });
    expect(r.text.startsWith("6222")).toBe(true);
    expect(r.text.endsWith("0123")).toBe(true);
    expect(r.text).toMatch(/\*/);
  });

  test("JSON 模式按字段", () => {
    const r = desensitizeText(
      JSON.stringify({ phone: "13900001111", note: "13811112222" }),
      { mode: "json", types: ["phone"], jsonFields: ["phone"] },
    );
    const obj = JSON.parse(r.text);
    expect(obj.phone).toBe("139****1111");
    expect(obj.note).toBe("13811112222");
  });

  test("空文本", () => {
    expect(desensitizeText("", { types: ["phone"] }).text).toBe("");
  });
});
