const {
  JASYPT_SALT_SIZE,
  JASYPT_DEFAULT_ITERATIONS,
  jasyptMd5,
  jasyptDeriveKeyAndIv,
  jasyptEncrypt,
  jasyptDecrypt,
  jasyptStripEncWrapper,
  jasyptNormalizeIterations,
  jasyptBytesToBase64,
  jasyptBase64ToBytes,
} = require("../../js/security/jasypt.js");

function hex(u8) {
  return Array.from(u8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

describe("jasyptMd5", () => {
  test("空串", () => {
    expect(hex(jasyptMd5(new Uint8Array(0)))).toBe(
      "d41d8cd98f00b204e9800998ecf8427e",
    );
  });

  test("abc", () => {
    expect(hex(jasyptMd5(new TextEncoder().encode("abc")))).toBe(
      "900150983cd24fb0d6963f7d28e17f72",
    );
  });
});

describe("jasyptBytesToBase64 / jasyptBase64ToBytes", () => {
  test("往返一致", () => {
    const bytes = new Uint8Array([0, 1, 2, 255, 128]);
    expect(Array.from(jasyptBase64ToBytes(jasyptBytesToBase64(bytes)))).toEqual(
      [0, 1, 2, 255, 128],
    );
  });
});

describe("jasyptStripEncWrapper", () => {
  test("去掉 ENC(...)", () => {
    expect(jasyptStripEncWrapper("ENC(abc+/=)")).toBe("abc+/=");
  });

  test("无包装原样返回", () => {
    expect(jasyptStripEncWrapper("  rawB64  ")).toBe("rawB64");
  });
});

describe("jasyptNormalizeIterations", () => {
  test("默认合法值", () => {
    expect(jasyptNormalizeIterations(1000)).toBe(1000);
  });

  test("非法值抛错", () => {
    expect(() => jasyptNormalizeIterations(0)).toThrow();
    expect(() => jasyptNormalizeIterations(-1)).toThrow();
  });
});

describe("PBEWithMD5AndDES 与 Java 已知向量", () => {
  // password=secret, salt=0102030405060708, iterations=1000, plain=hello jasypt
  // 由 Java Cipher.getInstance("PBEWithMD5AndDES") 生成
  const salt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
  const knownB64 = "AQIDBAUGBwhKrD3yFFwF5gCp/grdj5Qa";

  test("密钥派生 key/iv 匹配", () => {
    const { key, iv } = jasyptDeriveKeyAndIv("secret", salt, 1000);
    expect(hex(key)).toBe("3b91822763d71265");
    expect(hex(iv)).toBe("8fcbfae6c67bd400");
  });

  test("解密 Java 密文", () => {
    expect(jasyptDecrypt(knownB64, "secret", { iterations: 1000 })).toBe(
      "hello jasypt",
    );
  });

  test("固定 salt 加密匹配 Java", () => {
    const cipher = jasyptEncrypt("hello jasypt", "secret", {
      iterations: 1000,
      salt,
      wrapEnc: false,
    });
    expect(cipher).toBe(knownB64);
  });

  test("ENC 包装解密", () => {
    expect(
      jasyptDecrypt("ENC(" + knownB64 + ")", "secret", { iterations: 1000 }),
    ).toBe("hello jasypt");
  });
});

describe("encrypt / decrypt 往返", () => {
  test("中英文明文往返", () => {
    const plain = "hello Jasypt 配置加解密 中文";
    const cipher = jasyptEncrypt(plain, "my-secret-pwd", {
      iterations: JASYPT_DEFAULT_ITERATIONS,
      wrapEnc: false,
    });
    expect(typeof cipher).toBe("string");
    expect(cipher.length).toBeGreaterThan(0);
    expect(jasyptDecrypt(cipher, "my-secret-pwd")).toBe(plain);
  });

  test("ENC 包装往返", () => {
    const plain = "jdbc:mysql://127.0.0.1:3306/db";
    const cipher = jasyptEncrypt(plain, "pwd", { wrapEnc: true });
    expect(cipher.startsWith("ENC(")).toBe(true);
    expect(cipher.endsWith(")")).toBe(true);
    expect(jasyptDecrypt(cipher, "pwd")).toBe(plain);
  });

  test("每次加密 salt 不同", () => {
    const a = jasyptEncrypt("same", "pwd");
    const b = jasyptEncrypt("same", "pwd");
    expect(a).not.toBe(b);
    expect(jasyptDecrypt(a, "pwd")).toBe("same");
    expect(jasyptDecrypt(b, "pwd")).toBe("same");
  });

  test("错误密码解密失败", () => {
    const cipher = jasyptEncrypt("data", "right");
    expect(() => jasyptDecrypt(cipher, "wrong")).toThrow();
  });
});

describe("空/错误输入", () => {
  test("加密空明文抛错", () => {
    expect(() => jasyptEncrypt("", "pwd")).toThrow("请输入明文");
  });

  test("加密空密码抛错", () => {
    expect(() => jasyptEncrypt("text", "")).toThrow("请输入密码");
  });

  test("解密空密文抛错", () => {
    expect(() => jasyptDecrypt("", "pwd")).toThrow("请输入密文");
  });

  test("解密过短密文抛错", () => {
    const short = jasyptBytesToBase64(new Uint8Array(JASYPT_SALT_SIZE));
    expect(() => jasyptDecrypt(short, "pwd")).toThrow("密文数据太短");
  });

  test("解密非法 Base64 抛错", () => {
    expect(() => jasyptDecrypt("!!!not-base64!!!", "pwd")).toThrow();
  });
});
