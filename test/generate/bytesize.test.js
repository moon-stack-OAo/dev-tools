const {
  bytesizeParseUnit,
  bytesizeToBytes,
  bytesizeConvert,
  bytesizeFormatNumber,
  bytesizeResultText,
} = require("../../js/generate/bytesize.js");

describe("bytesizeParseUnit", () => {
  test("SI 单位", () => {
    expect(bytesizeParseUnit("B")).toEqual({ base: 1000, exp: 0 });
    expect(bytesizeParseUnit("KB")).toEqual({ base: 1000, exp: 1 });
    expect(bytesizeParseUnit("mb")).toEqual({ base: 1000, exp: 2 });
    expect(bytesizeParseUnit("GB")).toEqual({ base: 1000, exp: 3 });
    expect(bytesizeParseUnit("TB")).toEqual({ base: 1000, exp: 4 });
    expect(bytesizeParseUnit("PB")).toEqual({ base: 1000, exp: 5 });
  });

  test("IEC 单位", () => {
    expect(bytesizeParseUnit("KiB")).toEqual({ base: 1024, exp: 1 });
    expect(bytesizeParseUnit("mib")).toEqual({ base: 1024, exp: 2 });
    expect(bytesizeParseUnit("GiB")).toEqual({ base: 1024, exp: 3 });
    expect(bytesizeParseUnit("TiB")).toEqual({ base: 1024, exp: 4 });
    expect(bytesizeParseUnit("PiB")).toEqual({ base: 1024, exp: 5 });
  });

  test("未知 / 空", () => {
    expect(bytesizeParseUnit("")).toBeNull();
    expect(bytesizeParseUnit("  ")).toBeNull();
    expect(bytesizeParseUnit("xyz")).toBeNull();
    expect(bytesizeParseUnit(null)).toBeNull();
  });
});

describe("bytesizeToBytes", () => {
  test("1 KB (1000) = 1000 B", () => {
    const r = bytesizeToBytes(1, "KB", 1000);
    expect(r.ok).toBe(true);
    expect(r.bytes).toBe(1000);
  });

  test("1 KiB (1024) = 1024 B", () => {
    const r = bytesizeToBytes(1, "KiB", 1024);
    expect(r.ok).toBe(true);
    expect(r.bytes).toBe(1024);
  });

  test("1.5 GiB", () => {
    const r = bytesizeToBytes(1.5, "GiB", 1024);
    expect(r.ok).toBe(true);
    expect(r.bytes).toBe(1.5 * 1024 * 1024 * 1024);
  });

  test("forceBase 覆盖：KB 按 1024 算", () => {
    const r = bytesizeToBytes(1, "KB", 1024);
    expect(r.ok).toBe(true);
    expect(r.bytes).toBe(1024);
  });

  test("空输入", () => {
    const r = bytesizeToBytes("", "B");
    expect(r.ok).toBe(false);
    expect(r.msg).toMatch(/请输入/);
  });

  test("负数", () => {
    const r = bytesizeToBytes(-1, "B");
    expect(r.ok).toBe(false);
  });

  test("未知单位", () => {
    const r = bytesizeToBytes(1, "foo");
    expect(r.ok).toBe(false);
    expect(r.msg).toMatch(/未知/);
  });
});

describe("bytesizeConvert", () => {
  test("1024 B → 全部 IEC 单位", () => {
    const r = bytesizeConvert(1024, "B", 1024);
    expect(r.ok).toBe(true);
    expect(r.base).toBe(1024);
    expect(r.rows).toHaveLength(6);
    const map = Object.fromEntries(r.rows.map((x) => [x.unit, x.value]));
    expect(map.B).toBe("1024");
    expect(map.KiB).toBe("1");
    expect(map.MiB).toBe("0.0009765625");
  });

  test("1 MB SI → KB/GB", () => {
    const r = bytesizeConvert(1, "MB", 1000);
    expect(r.ok).toBe(true);
    expect(r.base).toBe(1000);
    const map = Object.fromEntries(r.rows.map((x) => [x.unit, x.value]));
    expect(map.B).toBe("1000000");
    expect(map.KB).toBe("1000");
    expect(map.MB).toBe("1");
    expect(map.GB).toBe("0.001");
  });

  test("0", () => {
    const r = bytesizeConvert(0, "B", 1000);
    expect(r.ok).toBe(true);
    r.rows.forEach((row) => expect(row.value).toBe("0"));
  });
});

describe("bytesizeFormatNumber", () => {
  test("整数", () => {
    expect(bytesizeFormatNumber(1024)).toBe("1024");
    expect(bytesizeFormatNumber(0)).toBe("0");
  });

  test("小数去尾零", () => {
    expect(bytesizeFormatNumber(1.5)).toBe("1.5");
    expect(bytesizeFormatNumber(0.001)).toBe("0.001");
  });
});

describe("bytesizeResultText", () => {
  test("成功输出含单位行", () => {
    const r = bytesizeConvert(1, "KiB", 1024);
    const text = bytesizeResultText(r);
    expect(text).toMatch(/1024 \(IEC\)/);
    expect(text).toMatch(/1024 B/);
    expect(text).toMatch(/1 KiB/);
  });

  test("失败输出 msg", () => {
    expect(bytesizeResultText({ ok: false, msg: "请输入数值" })).toBe(
      "请输入数值",
    );
  });
});

describe("bytesizeConvert - 一致性", () => {
  test("相同输入多次结果一致", () => {
    const a = bytesizeConvert("1.5", "GiB", 1024);
    const b = bytesizeConvert("1.5", "GiB", 1024);
    expect(b).toEqual(a);
  });

  test("SI / IEC 1 单位 → 字节再回算", () => {
    const si = bytesizeConvert(1, "GB", 1000);
    expect(si.rows.find((x) => x.unit === "B").value).toBe("1000000000");
    const iec = bytesizeConvert(1, "GiB", 1024);
    expect(Number(iec.rows.find((x) => x.unit === "B").value)).toBe(
      1024 ** 3,
    );
  });
});
