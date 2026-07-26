const {
  evaluatePasswordStrength,
  pwdHasUpper,
  pwdHasLower,
  pwdHasDigit,
  pwdHasSpecial,
  pwdIsCommonWeak,
  pwdHasSequential,
  pwdHasRepeated,
  pwdScoreToLevel,
} = require("../../js/security/pwdstrength.js");

describe("字符类检查", () => {
  test("大小写/数字/特殊字符", () => {
    expect(pwdHasUpper("Abc")).toBe(true);
    expect(pwdHasUpper("abc")).toBe(false);
    expect(pwdHasLower("Abc")).toBe(true);
    expect(pwdHasLower("ABC")).toBe(false);
    expect(pwdHasDigit("a1")).toBe(true);
    expect(pwdHasDigit("ab")).toBe(false);
    expect(pwdHasSpecial("a!")).toBe(true);
    expect(pwdHasSpecial("a1")).toBe(false);
  });
});

describe("弱密码 / 序列 / 重复", () => {
  test("常见弱密码", () => {
    expect(pwdIsCommonWeak("password")).toBe(true);
    expect(pwdIsCommonWeak("Password")).toBe(true);
    expect(pwdIsCommonWeak("123456")).toBe(true);
    expect(pwdIsCommonWeak("admin123")).toBe(true);
    expect(pwdIsCommonWeak("MyStr0ng!Pass")).toBe(false);
  });

  test("连续序列", () => {
    expect(pwdHasSequential("abc")).toBe(true);
    expect(pwdHasSequential("cba")).toBe(true);
    expect(pwdHasSequential("123")).toBe(true);
    expect(pwdHasSequential("qwe")).toBe(true);
    expect(pwdHasSequential("a1b2c3")).toBe(false);
  });

  test("连续重复", () => {
    expect(pwdHasRepeated("aaa")).toBe(true);
    expect(pwdHasRepeated("1111")).toBe(true);
    expect(pwdHasRepeated("aab")).toBe(false);
    expect(pwdHasRepeated("abab")).toBe(false);
  });
});

describe("pwdScoreToLevel", () => {
  test("分数映射等级", () => {
    expect(pwdScoreToLevel(0).key).toBe("weak");
    expect(pwdScoreToLevel(39).key).toBe("weak");
    expect(pwdScoreToLevel(40).key).toBe("medium");
    expect(pwdScoreToLevel(59).key).toBe("medium");
    expect(pwdScoreToLevel(60).key).toBe("strong");
    expect(pwdScoreToLevel(79).key).toBe("strong");
    expect(pwdScoreToLevel(80).key).toBe("very-strong");
    expect(pwdScoreToLevel(100).key).toBe("very-strong");
  });
});

describe("evaluatePasswordStrength", () => {
  test("空输入", () => {
    const r = evaluatePasswordStrength("");
    expect(r.level).toBe("empty");
    expect(r.score).toBe(0);
    expect(r.checks).toEqual([]);
    expect(r.suggestions.length).toBeGreaterThan(0);
  });

  test("null / undefined 视为空", () => {
    expect(evaluatePasswordStrength(null).level).toBe("empty");
    expect(evaluatePasswordStrength(undefined).level).toBe("empty");
  });

  test("极弱短密码", () => {
    const r = evaluatePasswordStrength("123");
    expect(r.level).toBe("weak");
    expect(r.score).toBeLessThanOrEqual(25);
    expect(r.checks.find((c) => c.id === "len8").pass).toBe(false);
  });

  test("常见弱密码得分被压制", () => {
    const r = evaluatePasswordStrength("password");
    expect(r.level).toBe("weak");
    expect(r.score).toBeLessThanOrEqual(25);
    expect(r.checks.find((c) => c.id === "not-common").pass).toBe(false);
  });

  test("中等强度：长度与基础字符类", () => {
    const r = evaluatePasswordStrength("Nex7Orbit9");
    expect(r.score).toBeGreaterThanOrEqual(40);
    expect(["medium", "strong", "very-strong"]).toContain(r.level);
    expect(r.checks.find((c) => c.id === "upper").pass).toBe(true);
    expect(r.checks.find((c) => c.id === "lower").pass).toBe(true);
    expect(r.checks.find((c) => c.id === "digit").pass).toBe(true);
  });

  test("强密码：含特殊字符且足够长", () => {
    const r = evaluatePasswordStrength("Tr0ub4dor&3xY!");
    expect(r.score).toBeGreaterThanOrEqual(60);
    expect(["strong", "very-strong"]).toContain(r.level);
    expect(r.checks.find((c) => c.id === "special").pass).toBe(true);
  });

  test("很强：长且复杂、无序列重复", () => {
    const r = evaluatePasswordStrength("Kp9$mQ2!vL7#nR4@wX");
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.level).toBe("very-strong");
    expect(r.checks.find((c) => c.id === "no-seq").pass).toBe(true);
    expect(r.checks.find((c) => c.id === "no-repeat").pass).toBe(true);
    expect(r.checks.find((c) => c.id === "not-common").pass).toBe(true);
  });

  test("检查项与建议字段完整", () => {
    const r = evaluatePasswordStrength("a");
    expect(Array.isArray(r.checks)).toBe(true);
    expect(r.checks.length).toBeGreaterThan(5);
    r.checks.forEach((c) => {
      expect(c).toHaveProperty("id");
      expect(c).toHaveProperty("label");
      expect(c).toHaveProperty("pass");
      expect(c).toHaveProperty("weight");
    });
    expect(Array.isArray(r.suggestions)).toBe(true);
    expect(r.suggestions.length).toBeGreaterThan(0);
    expect(r.length).toBe(1);
  });

  test("含序列时对应检查失败并给建议", () => {
    const r = evaluatePasswordStrength("Abcd1234!");
    expect(r.checks.find((c) => c.id === "no-seq").pass).toBe(false);
    expect(r.suggestions.some((s) => s.indexOf("连续") >= 0)).toBe(true);
  });
});
