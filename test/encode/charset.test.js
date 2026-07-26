const {
  charsetParseHex,
  charsetParseBase64,
  charsetBytesToHex,
  charsetBytesToBase64,
  charsetDecodeBytes,
} = require("../../js/encode/charset.js");

describe("charset 字节编解码辅助", () => {
  test("charsetParseHex 解析 GBK 你好", () => {
    const bytes = charsetParseHex("c4e3 bac3");
    expect(Array.from(bytes)).toEqual([0xc4, 0xe3, 0xba, 0xc3]);
  });

  test("charsetParseHex 非法输入抛错", () => {
    expect(() => charsetParseHex("xyz")).toThrow();
    expect(() => charsetParseHex("abc")).toThrow();
  });

  test("charsetBytesToHex / Base64 往返", () => {
    const bytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
    expect(charsetBytesToHex(bytes)).toBe("48656c6c6f");
    const b64 = charsetBytesToBase64(bytes);
    expect(Array.from(charsetParseBase64(b64))).toEqual(Array.from(bytes));
  });

  test("charsetDecodeBytes UTF-8", () => {
    const bytes = new TextEncoder().encode("你好");
    expect(charsetDecodeBytes(bytes, "utf-8")).toBe("你好");
  });
});
