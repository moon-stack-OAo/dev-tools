const { encodeProtobuf, parseProtoSchema } = require('../../js/encode/protobuf.js');

global.parseProtoSchema = parseProtoSchema;
global.encodeProtobuf = encodeProtobuf;

const {
  grpcReadVarint,
  grpcDecodeProtobuf,
  grpcBuildFrame,
  grpcBytesToBase64,
  grpcBuildCurlCommand,
  grpcEncodeJsonWithSchema,
} = require('../../js/debug/grpc.js');

describe('gRPC Wire Format', () => {
  test('64-bit varint 不发生 32 位截断并以十进制输出', () => {
    const bytes = new Uint8Array([0x08, 0x81, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x10]);
    const [value, end] = grpcReadVarint(bytes, 1);
    expect(value).toBe(9007199254740993n);
    expect(end).toBe(9);
    expect(grpcDecodeProtobuf(bytes)).toContain('value=9007199254740993');
  });

  test('截断和超过 64 位的 varint 明确报错', () => {
    expect(() => grpcReadVarint(new Uint8Array([0x80]), 0)).toThrow('Varint 截断');
    expect(() => grpcReadVarint(new Uint8Array(10).fill(0x80), 0)).toThrow('超过 64 位');
  });

  test('构造 gRPC frame 使用压缩标志和 big-endian 长度', () => {
    expect(Array.from(grpcBuildFrame(new Uint8Array([1, 2, 3])))).toEqual([0, 0, 0, 0, 3, 1, 2, 3]);
  });

  test('JSON + Schema 编码并生成 curl data-binary', () => {
    const schemaText = 'message Request { uint64 id = 1; string name = 2; }';
    const value = { id: '9007199254740993', name: 'Ada' };
    const message = grpcEncodeJsonWithSchema(
      value,
      schemaText,
    );
    expect(Array.from(message)).toEqual(Array.from(encodeProtobuf(value, parseProtoSchema(schemaText))));
    expect(Array.from(message)).toEqual([8, 129, 128, 128, 128, 128, 128, 128, 16, 18, 3, 65, 100, 97]);
    const command = grpcBuildCurlCommand('https://example.test/Service/Call', 'application/grpc+proto', [['authorization', 'Bearer x']], message);
    expect(command).toContain('--data-binary');
    expect(command).toContain(grpcBytesToBase64(grpcBuildFrame(message)));
    expect(command).toContain('Content-Type: application/grpc+proto');
    expect(command).toContain('TE: trailers');
  });

  test('JSON + Schema 编码支持嵌套消息并与公共编码器一致', () => {
    const schemaText = `
      message Request {
        message User { uint64 id = 1; }
        User user = 1;
      }
    `;
    const value = { user: { id: '9007199254740993' } };
    const expected = encodeProtobuf(value, parseProtoSchema(schemaText));

    expect(Array.from(grpcEncodeJsonWithSchema(value, schemaText))).toEqual(Array.from(expected));
  });

  test('公共 Protobuf 编码器未加载时给出明确错误', () => {
    const parser = global.parseProtoSchema;
    const encoder = global.encodeProtobuf;
    try {
      delete global.parseProtoSchema;
      delete global.encodeProtobuf;
      expect(() => grpcEncodeJsonWithSchema({}, 'message Request {}')).toThrow('公共 Protobuf 编码器未加载');
    } finally {
      global.parseProtoSchema = parser;
      global.encodeProtobuf = encoder;
    }
  });
});
