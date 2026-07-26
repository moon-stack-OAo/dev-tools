const crypto = require("crypto");

if (typeof globalThis.crypto === "undefined") {
  globalThis.crypto = crypto.webcrypto;
}

const {
  ULID_ALPHABET,
  NANOID_ALPHABETS,
  generateUlid,
  parseUlid,
  generateNanoid,
  generateNanoidByKey,
  ulidEncodeTime,
} = require("../../js/generate/ulid.js");

describe("generateUlid", () => {
  test("长度为 26 且仅含 Crockford Base32", () => {
    const id = generateUlid();
    expect(id).toHaveLength(26);
    expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  test("多次生成结果唯一", () => {
    const set = new Set();
    for (let i = 0; i < 50; i++) set.add(generateUlid());
    expect(set.size).toBe(50);
  });

  test("指定时间戳时前 10 位固定", () => {
    const ts = 1700000000000;
    const a = generateUlid(ts);
    const b = generateUlid(ts);
    expect(a.slice(0, 10)).toBe(b.slice(0, 10));
    expect(a.slice(0, 10)).toBe(ulidEncodeTime(ts, 10));
  });

  test("时间戳过大抛错", () => {
    expect(() => generateUlid(0x1ffffffffffff)).toThrow(/48/);
  });
});

describe("parseUlid", () => {
  test("generateUlid ↔ parseUlid 互逆（时间戳）", () => {
    const ts = 1700000000000;
    const id = generateUlid(ts);
    const p = parseUlid(id);
    expect(p.timestamp).toBe(ts);
    expect(p.iso).toBe(new Date(ts).toISOString());
    expect(typeof p.localTime).toBe("string");
    expect(p.id).toHaveLength(26);
  });

  test("小写可解析", () => {
    const id = generateUlid(1700000000000);
    const p = parseUlid(id.toLowerCase());
    expect(p.timestamp).toBe(1700000000000);
  });

  test("非法长度/字符/空串抛错", () => {
    expect(() => parseUlid("")).toThrow();
    expect(() => parseUlid("ABC")).toThrow(/26/);
    expect(() => parseUlid("!!!!!!!!!!!!!!!!!!!!!!!!!!")).toThrow(/非法/);
  });

  test("Crockford 别名 I/L/O 可解析时间部分", () => {
    // 合法 ULID 再把时间段中的 0/1 换成 O/I 别名
    const base = generateUlid(0);
    // 时间 0 → 全 0，随机部分保持
    const withAlias = "OOOOOOOOOO" + base.slice(10);
    const p = parseUlid(withAlias);
    expect(p.timestamp).toBe(0);
  });
});

describe("ulidEncodeTime", () => {
  test("0 → 10 个 0", () => {
    expect(ulidEncodeTime(0, 10)).toBe("0000000000");
  });

  test("编码字符均在字母表内", () => {
    const s = ulidEncodeTime(Date.now(), 10);
    for (const c of s) {
      expect(ULID_ALPHABET.includes(c)).toBe(true);
    }
  });
});

describe("generateNanoid", () => {
  test("默认长度 21", () => {
    expect(generateNanoid()).toHaveLength(21);
  });

  test("可配置长度", () => {
    expect(generateNanoid(10)).toHaveLength(10);
    expect(generateNanoid(64)).toHaveLength(64);
  });

  test("长度被限制在 2~64", () => {
    expect(generateNanoid(1)).toHaveLength(2);
    expect(generateNanoid(100)).toHaveLength(64);
  });

  test("默认字母表仅 A-Za-z0-9", () => {
    const id = generateNanoid(40, NANOID_ALPHABETS.default);
    expect(id).toMatch(/^[A-Za-z0-9]+$/);
  });

  test("url-safe 字母表允许 _-", () => {
    const set = new Set();
    for (let i = 0; i < 30; i++) {
      set.add(generateNanoidByKey(32, "url-safe"));
    }
    for (const id of set) {
      expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(id).toHaveLength(32);
    }
    expect(set.size).toBe(30);
  });

  test("generateNanoidByKey default", () => {
    const id = generateNanoidByKey(16, "default");
    expect(id).toHaveLength(16);
    expect(id).toMatch(/^[A-Za-z0-9]+$/);
  });
});
