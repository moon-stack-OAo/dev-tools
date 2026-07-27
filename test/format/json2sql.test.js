const {
  jsonToSqlInsert,
  j2sSqlValue,
  j2sQuoteIdent,
} = require("../../js/format/json2sql.js");

describe("jsonToSqlInsert", () => {
  test("单对象生成一条 INSERT", () => {
    const sql = jsonToSqlInsert({ id: 1, name: "a" }, { table: "user", batch: false });
    expect(sql).toContain("INSERT INTO `user`");
    expect(sql).toContain("`id`, `name`");
    expect(sql).toContain("(1, 'a')");
  });

  test("数组批量 VALUES", () => {
    const sql = jsonToSqlInsert(
      [
        { id: 1, name: "a" },
        { id: 2, name: "b" },
      ],
      { table: "t", dialect: "mysql", batch: true },
    );
    expect(sql).toMatch(/VALUES\s*\n\s*\(1, 'a'\),\n\s*\(2, 'b'\);/);
  });

  test("单引号转义", () => {
    const sql = jsonToSqlInsert([{ name: "O'Brien" }], {
      table: "t",
      batch: false,
      quoteIdent: false,
    });
    expect(sql).toContain("'O''Brien'");
  });

  test("null 与布尔", () => {
    const mysql = jsonToSqlInsert([{ a: null, b: true }], {
      dialect: "mysql",
      batch: false,
      quoteIdent: false,
    });
    expect(mysql).toContain("NULL");
    expect(mysql).toContain("TRUE");
    const oracle = jsonToSqlInsert([{ b: false }], {
      dialect: "oracle",
      batch: false,
      quoteIdent: false,
    });
    expect(oracle).toContain("0");
  });

  test("字段并集缺失填 NULL", () => {
    const sql = jsonToSqlInsert([{ a: 1 }, { b: 2 }], {
      batch: false,
      quoteIdent: false,
      table: "t",
    });
    const lines = sql.split("\n");
    expect(lines[0]).toContain("(1, NULL)");
    expect(lines[1]).toContain("(NULL, 2)");
  });

  test("postgres 双引号标识符", () => {
    expect(j2sQuoteIdent("user", "postgres")).toBe('"user"');
    expect(j2sQuoteIdent('a"b', "postgres")).toBe('"a""b"');
  });

  test("嵌套对象序列化为 JSON 字符串", () => {
    const sql = jsonToSqlInsert([{ meta: { x: 1 } }], {
      batch: false,
      quoteIdent: false,
    });
    expect(sql).toContain("'{\"x\":1}'");
  });

  test("空数组抛错", () => {
    expect(() => jsonToSqlInsert([])).toThrow("空");
  });
});

describe("j2sSqlValue", () => {
  test("数字与字符串", () => {
    expect(j2sSqlValue(3.14, "mysql")).toBe("3.14");
    expect(j2sSqlValue("hi", "mysql")).toBe("'hi'");
  });
});
