const {
  encodeCode128,
  code128ToModules,
  encodeCode39,
  barcodeEncode,
  CODE128_START_B,
  CODE128_START_C,
  CODE128_STOP,
  CODE39_MAP,
} = require("../../js/text/barcode.js");

describe("encodeCode128", () => {
  test("空内容抛错", () => {
    expect(() => encodeCode128("")).toThrow(/空/);
    expect(() => encodeCode128(null)).toThrow(/空/);
  });

  test("非 ASCII 抛错", () => {
    expect(() => encodeCode128("中文")).toThrow(/ASCII/);
  });

  test("纯偶数位数字使用 Code C 起始", () => {
    const codes = encodeCode128("123456");
    expect(codes[0]).toBe(CODE128_START_C);
    expect(codes[1]).toBe(12);
    expect(codes[2]).toBe(34);
    expect(codes[3]).toBe(56);
    expect(codes[codes.length - 1]).toBe(CODE128_STOP);
  });

  test("字母文本使用 Code B 起始", () => {
    const codes = encodeCode128("ABC");
    expect(codes[0]).toBe(CODE128_START_B);
    // A=33, B=34, C=35 (charCode-32)
    expect(codes[1]).toBe(33);
    expect(codes[2]).toBe(34);
    expect(codes[3]).toBe(35);
    expect(codes[codes.length - 1]).toBe(CODE128_STOP);
  });

  test("校验位正确：Hello", () => {
    // StartB=104, H=40, e=69, l=76, l=76, o=79
    // sum = 104 + 40*1 + 69*2 + 76*3 + 76*4 + 79*5
    // = 104 + 40 + 138 + 228 + 304 + 395 = 1209; 1209 % 103 = 76
    const codes = encodeCode128("Hello");
    expect(codes[0]).toBe(CODE128_START_B);
    expect(codes[codes.length - 2]).toBe(76);
    expect(codes[codes.length - 1]).toBe(CODE128_STOP);
  });

  test("code128ToModules 非空且仅含 0/1", () => {
    const codes = encodeCode128("Hi");
    const mods = code128ToModules(codes);
    expect(mods.length).toBeGreaterThan(20);
    expect(/^[01]+$/.test(mods)).toBe(true);
  });
});

describe("encodeCode39", () => {
  test("空内容抛错", () => {
    expect(() => encodeCode39("")).toThrow(/空/);
  });

  test("非法字符抛错", () => {
    expect(() => encodeCode39("ab@c")).toThrow(/不支持/);
  });

  test("小写自动转大写", () => {
    const r = encodeCode39("ab12");
    expect(r.display).toBe("AB12");
    expect(r.modules.length).toBeGreaterThan(0);
    expect(/^[01]+$/.test(r.modules)).toBe(true);
  });

  test("起止符 * 存在于映射", () => {
    expect(CODE39_MAP["*"]).toBeTruthy();
    expect(CODE39_MAP["*"].length).toBe(9);
  });

  test("数字编码成功", () => {
    const r = encodeCode39("12345");
    expect(r.display).toBe("12345");
    // 每个字符 9 位宽窄，宽=3窄=1，另加字符间空隙
    expect(r.modules.includes("1")).toBe(true);
    expect(r.modules.includes("0")).toBe(true);
  });
});

describe("barcodeEncode", () => {
  test("默认 code128", () => {
    const r = barcodeEncode("TEST");
    expect(r.format).toBe("code128");
    expect(r.display).toBe("TEST");
    expect(r.codes).toBeDefined();
    expect(r.codes[r.codes.length - 1]).toBe(CODE128_STOP);
  });

  test("code39 格式", () => {
    const r = barcodeEncode("SKU-01", "code39");
    expect(r.format).toBe("code39");
    expect(r.display).toBe("SKU-01");
  });

  test("未知码制抛错", () => {
    expect(() => barcodeEncode("x", "ean13")).toThrow(/不支持/);
  });
});
