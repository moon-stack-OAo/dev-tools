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

  test("proto3 repeated 数值字段默认使用 packed，并可关闭 packed", () => {
    const packedSchema = parseProtoSchema("syntax = \"proto3\"; message Root { repeated int32 values = 1; }");
    const packed = encodeProtobuf({ values: [1, 150, 3] }, packedSchema);
    expect(Array.from(packed)).toEqual([10, 4, 1, 150, 1, 3]);
    expect(decodeProtobuf(packed, 0, packed.length, packedSchema)).toEqual({ values: [1, 150, 3] });

    const unpackedSchema = parseProtoSchema(
      "message Root { repeated int32 values = 1 [packed = false]; }",
    );
    const unpacked = encodeProtobuf({ values: [1, 2] }, unpackedSchema);
    expect(Array.from(unpacked)).toEqual([8, 1, 8, 2]);
    expect(decodeProtobuf(unpacked, 0, unpacked.length, unpackedSchema)).toEqual({ values: [1, 2] });
  });

  test("支持 scalar map 和消息 value map", () => {
    const schema = parseProtoSchema(`
      syntax = "proto3";
      package demo;
      import "common.proto";
      message Root {
        map<string, int32> counts = 1;
        map<int32, Child> children = 2;
        message Child { string name = 1; }
        reserved 10 to 12;
      }
    `);
    const input = { counts: { ok: 2 }, children: { "7": { name: "Ada" } } };
    const bytes = encodeProtobuf(input, schema);
    expect(decodeProtobuf(bytes, 0, bytes.length, schema)).toEqual(input);
  });

  test("oneof 只保留最后出现的字段", () => {
    const schema = parseProtoSchema("message Root { oneof value { string name = 1; int32 id = 2; } }");
    expect(decodeProtobuf(new Uint8Array([10, 3, 65, 100, 97, 16, 7]), 0, 7, schema)).toEqual({ id: 7 });
    expect(decodeProtobuf(new Uint8Array([16, 7, 10, 3, 65, 100, 97]), 0, 7, schema)).toEqual({ name: "Ada" });
  });

  test("enum 保留数字解码，同时支持名称编码", () => {
    const schema = parseProtoSchema(`
      enum State { UNKNOWN = 0; READY = 1; }
      message Root { State state = 1; }
    `);
    const bytes = encodeProtobuf({ state: "READY" }, schema);
    expect(Array.from(bytes)).toEqual([8, 1]);
    expect(decodeProtobuf(bytes, 0, bytes.length, schema)).toEqual({ state: 1 });
  });

  test("sfixed32 和 sfixed64 支持有符号值往返", () => {
    const schema = parseProtoSchema("message Root { sfixed32 small = 1; sfixed64 large = 2; }");
    const input = { small: -2, large: "-9007199254740993" };
    const bytes = encodeProtobuf(input, schema);
    expect(decodeProtobuf(bytes, 0, bytes.length, schema)).toEqual(input);
  });
});
