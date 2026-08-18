const {
  decodeProtobuf,
  encodeProtobuf,
  parseProtoSchema,
} = require("../../js/encode/protobuf.js");

describe("Protobuf 编解码", () => {
  test("uint64 支持 4294967296", () => {
    const schema = parseProtoSchema("message Root { uint64 total = 1; }");
    const bytes = encodeProtobuf({ total: "4294967296" }, schema);
    expect(decodeProtobuf(bytes, 0, bytes.length, schema)).toEqual({
      total: 4294967296,
    });
  });

  test("超过 MAX_SAFE_INTEGER 的 uint64 以十进制字符串输出", () => {
    const schema = parseProtoSchema("message Root { uint64 total = 1; }");
    const bytes = encodeProtobuf({ total: "9007199254740993" }, schema);
    expect(decodeProtobuf(bytes, 0, bytes.length, schema)).toEqual({
      total: "9007199254740993",
    });
  });

  test("int64 与 sint64 使用 BigInt 往返", () => {
    const schema = parseProtoSchema(
      "message Root { int64 signed = 1; sint64 zigzag = 2; }",
    );
    const bytes = encodeProtobuf(
      { signed: "-9007199254740993", zigzag: "-9007199254740993" },
      schema,
    );
    expect(decodeProtobuf(bytes, 0, bytes.length, schema)).toEqual({
      signed: "-9007199254740993",
      zigzag: "-9007199254740993",
    });
  });

  test("嵌套消息使用各自作用域内的字段号", () => {
    const schema = parseProtoSchema(`
            message Root {
                string title = 1;
                Child child = 2;
                message Child { uint64 id = 1; }
            }
        `);
    const bytes = encodeProtobuf(
      { title: "root", child: { id: "4294967296" } },
      schema,
    );
    expect(decodeProtobuf(bytes, 0, bytes.length, schema)).toEqual({
      title: "root",
      child: { id: 4294967296 },
    });
  });

  test("编码嵌套消息时使用嵌套 Schema", () => {
    const schema = parseProtoSchema(
      "message Root { Child child = 1; message Child { string name = 1; } }",
    );
    const bytes = encodeProtobuf({ child: { name: "Ada" } }, schema);
    expect(Array.from(bytes)).toEqual([10, 5, 10, 3, 65, 100, 97]);
    expect(decodeProtobuf(bytes, 0, bytes.length, schema)).toEqual({
      child: { name: "Ada" },
    });
  });

  test("无 Schema 保留 repeated 与 bytes 通用解码", () => {
    const bytes = new Uint8Array([10, 2, 8, 1, 10, 2, 8, 2, 18, 2, 255, 0]);
    expect(decodeProtobuf(bytes, 0, bytes.length, null)).toEqual({
      field_1: [{ field_1: 1 }, { field_1: 2 }],
      field_2: "ff 00",
    });
  });

  test("截断 varint 直接抛出错误", () => {
    expect(() => decodeProtobuf(new Uint8Array([8, 128]), 0, 2, null)).toThrow(
      "Varint 未结束",
    );
  });
});
