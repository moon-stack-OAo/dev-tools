const {
  base32Encode,
  base32Decode,
  base58Encode,
  base58Decode,
  base32ParseHex,
  base32BytesToHex,
  base32TextToBytes,
  base32BytesToText,
} = require("../../js/encode/base32.js");

describe("Base32 (RFC 4648)", () => {
  test("编码空 / 标准向量", () => {
    expect(base32Encode(new Uint8Array(0))).toBe("");
    expect(base32Encode(base32TextToBytes("f"))).toBe("MY======");
    expect(base32Encode(base32TextToBytes("fo"))).toBe("MZXQ====");
    expect(base32Encode(base32TextToBytes("foo"))).toBe("MZXW6===");
    expect(base32Encode(base32TextToBytes("foob"))).toBe("MZXW6YQ=");
    expect(base32Encode(base32TextToBytes("fooba"))).toBe("MZXW6YTB");
    expect(base32Encode(base32TextToBytes("foobar"))).toBe("MZXW6YTBOI======");
  });

  test("可选无 padding", () => {
    expect(base32Encode(base32TextToBytes("f"), { padding: false })).toBe("MY");
    expect(base32Encode(base32TextToBytes("foobar"), { padding: false })).toBe(
      "MZXW6YTBOI",
    );
  });

  test("解码标准向量与无 padding", () => {
    expect(base32BytesToText(base32Decode("MZXW6YTBOI======"))).toBe("foobar");
    expect(base32BytesToText(base32Decode("MZXW6YTBOI"))).toBe("foobar");
    expect(base32BytesToText(base32Decode("mzxw6ytboi"))).toBe("foobar");
  });

  test("往返一致（含中文）", () => {
    const s = "你好, Base32!";
    const bytes = base32TextToBytes(s);
    expect(base32Decode(base32Encode(bytes))).toEqual(bytes);
    expect(base32BytesToText(base32Decode(base32Encode(bytes)))).toBe(s);
  });

  test("非法字符抛错", () => {
    expect(() => base32Decode("MZXW6YTB0")).toThrow(/非法 Base32/);
    expect(() => base32Decode("!!!")).toThrow(/非法 Base32/);
  });
});

describe("Base58 (Bitcoin)", () => {
  test("编码空 / 前导零", () => {
    expect(base58Encode(new Uint8Array(0))).toBe("");
    expect(base58Encode(new Uint8Array([0]))).toBe("1");
    expect(base58Encode(new Uint8Array([0, 0]))).toBe("11");
    // 0x61 → "2g"，前导零映射为 '1'
    expect(base58Encode(new Uint8Array([0, 0, 0x61]))).toBe("112g");
    expect(Array.from(base58Decode("112g"))).toEqual([0, 0, 0x61]);
  });

  test("标准向量 Hello World", () => {
    const bytes = base32TextToBytes("Hello World");
    expect(base58Encode(bytes)).toBe("JxF12TrwUP45BMd");
    expect(base32BytesToText(base58Decode("JxF12TrwUP45BMd"))).toBe(
      "Hello World",
    );
  });

  test("Hex 往返", () => {
    const hex = "00010966776006953d5567439e5e39f86a0d273beed61967f6";
    const bytes = base32ParseHex(hex);
    const enc = base58Encode(bytes);
    expect(base32BytesToHex(base58Decode(enc))).toBe(hex);
  });

  test("往返一致（含中文）", () => {
    const s = "你好, Base58!";
    const bytes = base32TextToBytes(s);
    expect(base58Decode(base58Encode(bytes))).toEqual(bytes);
  });

  test("非法字符抛错（含 0/O/I/l）", () => {
    expect(() => base58Decode("0")).toThrow(/非法 Base58/);
    expect(() => base58Decode("O")).toThrow(/非法 Base58/);
    expect(() => base58Decode("I")).toThrow(/非法 Base58/);
    expect(() => base58Decode("l")).toThrow(/非法 Base58/);
  });
});

describe("辅助", () => {
  test("base32ParseHex 非法输入", () => {
    expect(() => base32ParseHex("xyz")).toThrow();
    expect(() => base32ParseHex("abc")).toThrow();
  });

  test("base32BytesToHex", () => {
    expect(base32BytesToHex(new Uint8Array([0x48, 0x65]))).toBe("4865");
  });
});
