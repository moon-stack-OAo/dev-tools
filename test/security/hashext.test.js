const { crc32Bytes, crc32cBytes, adler32Bytes } = require("../../js/security/hashext.js");

function enc(s) {
  return new TextEncoder().encode(s);
}

describe("hashext CRC / Adler32", () => {
  test("crc32 标准向量 123456789", () => {
    expect(crc32Bytes(enc("123456789")).toString(16)).toBe("cbf43926");
  });

  test("crc32 空串", () => {
    expect(crc32Bytes(enc("")).toString(16)).toBe("0");
  });

  test("crc32c 非空", () => {
    const v = crc32cBytes(enc("123456789"));
    expect(typeof v).toBe("number");
    expect(v).not.toBe(crc32Bytes(enc("123456789")));
  });

  test("adler32 标准向量 123456789", () => {
    // Adler-32("123456789") = 0x091E01DE
    expect(adler32Bytes(enc("123456789")).toString(16)).toBe("91e01de");
  });
});
