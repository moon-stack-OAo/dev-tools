// Protobuf Wire Types
const WIRE_TYPES = {
  0: "varint",
  1: "fixed64",
  2: "length-delimited",
  5: "fixed32",
};

const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);
const MAX_UINT64 = (1n << 64n) - 1n;
const INTEGER_TYPES = new Set([
  "int32",
  "int64",
  "uint32",
  "uint64",
  "sint32",
  "sint64",
  "bool",
  "enum",
]);

function bigIntToValue(value) {
  return value > MAX_SAFE_BIGINT || value < -MAX_SAFE_BIGINT
    ? value.toString()
    : Number(value);
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ");
}

// 解析最多 64 位的 Protobuf varint
function decodeVarint(bytes, offset, end) {
  let result = 0n;
  let shift = 0n;
  const limit = end === undefined ? bytes.length : end;

  for (let pos = offset; pos < limit; pos++) {
    const byte = bytes[pos];
    if (pos - offset === 9 && byte > 1) throw new Error("Varint 超过 64 位");
    result |= BigInt(byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) {
      return { value: result, bytesRead: pos - offset + 1 };
    }
    shift += 7n;
    if (pos - offset === 9) throw new Error("Varint 超过 64 位");
  }
  throw new Error("Varint 未结束");
}

function readLength(bytes, offset, end) {
  const lengthResult = decodeVarint(bytes, offset, end);
  if (lengthResult.value > MAX_SAFE_BIGINT) throw new Error("长度超过支持范围");
  return {
    length: Number(lengthResult.value),
    bytesRead: lengthResult.bytesRead,
  };
}

function getMessageFields(schema) {
  return schema && schema.fields ? schema.fields : schema;
}

function decodeInteger(value, fieldType) {
  if (fieldType === "int64") return bigIntToValue(BigInt.asIntN(64, value));
  if (fieldType === "sint64")
    return bigIntToValue((value >> 1n) ^ -(value & 1n));
  if (fieldType === "int32") return Number(BigInt.asIntN(32, value));
  if (fieldType === "sint32") return Number((value >> 1n) ^ -(value & 1n));
  if (fieldType === "uint64") return bigIntToValue(value);
  if (fieldType === "uint32") return Number(value & 0xffffffffn);
  if (fieldType === "bool") return value !== 0n;
  return bigIntToValue(value);
}

function addFieldValue(result, fieldName, value) {
  if (result[fieldName] !== undefined) {
    if (!Array.isArray(result[fieldName]))
      result[fieldName] = [result[fieldName]];
    result[fieldName].push(value);
  } else {
    result[fieldName] = value;
  }
}

// 解码 Protobuf 消息
function decodeProtobuf(bytes, offset, length, schema) {
  const result = {};
  const end = offset + (length === undefined ? bytes.length - offset : length);
  if (end > bytes.length) throw new Error("数据不足");
  const fields = getMessageFields(schema);
  let pos = offset;

  while (pos < end) {
    const tagResult = decodeVarint(bytes, pos, end);
    if (tagResult.value > MAX_SAFE_BIGINT)
      throw new Error("字段标签超过支持范围");
    const tag = Number(tagResult.value);
    const fieldNumber = Math.floor(tag / 8);
    const wireType = tag & 0x07;
    if (fieldNumber === 0) throw new Error("字段号不能为 0");
    pos += tagResult.bytesRead;

    const field = fields && fields[fieldNumber];
    const fieldName = field ? field.name : "field_" + fieldNumber;
    const fieldType = field ? field.type : null;
    let value;

    switch (wireType) {
      case 0: {
        const varintResult = decodeVarint(bytes, pos, end);
        value = decodeInteger(varintResult.value, fieldType);
        pos += varintResult.bytesRead;
        break;
      }
      case 1: {
        if (pos + 8 > end) throw new Error("数据不足");
        const view = new DataView(bytes.buffer, bytes.byteOffset + pos, 8);
        value =
          fieldType === "double"
            ? view.getFloat64(0, true)
            : view.getBigUint64(0, true).toString();
        pos += 8;
        break;
      }
      case 2: {
        const lengthResult = readLength(bytes, pos, end);
        pos += lengthResult.bytesRead;
        if (pos + lengthResult.length > end) throw new Error("数据不足");
        const dataEnd = pos + lengthResult.length;

        if (fieldType === "string") {
          value = new TextDecoder("utf-8").decode(bytes.slice(pos, dataEnd));
        } else if (fieldType === "bytes") {
          value = bytesToHex(bytes.slice(pos, dataEnd));
        } else if (field && field.messageSchema) {
          value = decodeProtobuf(
            bytes,
            pos,
            lengthResult.length,
            field.messageSchema,
          );
        } else {
          // 无 Schema 时保留原有的通用嵌套消息探测，非消息数据则展示为 Hex。
          try {
            const nested = decodeProtobuf(
              bytes,
              pos,
              lengthResult.length,
              null,
            );
            value =
              Object.keys(nested).length > 0
                ? nested
                : bytesToHex(bytes.slice(pos, dataEnd));
          } catch (e) {
            value = bytesToHex(bytes.slice(pos, dataEnd));
          }
        }
        pos = dataEnd;
        break;
      }
      case 5: {
        if (pos + 4 > end) throw new Error("数据不足");
        const view = new DataView(bytes.buffer, bytes.byteOffset + pos, 4);
        value =
          fieldType === "float"
            ? view.getFloat32(0, true)
            : view.getUint32(0, true);
        pos += 4;
        break;
      }
      default:
        throw new Error("未知 wire type: " + wireType);
    }
    addFieldValue(result, fieldName, value);
  }
  return result;
}

function tokenizeProto(schemaText) {
  return (
    schemaText
      .replace(/\/\/[^\n]*/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .match(/[A-Za-z_]\w*|\d+|[{}=;.]/g) || []
  );
}

function isScalarType(type) {
  return (
    INTEGER_TYPES.has(type) ||
    [
      "fixed32",
      "fixed64",
      "sfixed32",
      "sfixed64",
      "float",
      "double",
      "string",
      "bytes",
    ].includes(type)
  );
}

// 解析 Proto schema，保留每个 message 的独立字段作用域。
function parseProtoSchema(schemaText) {
  if (!schemaText || !schemaText.trim()) return null;
  const tokens = tokenizeProto(schemaText);
  const root = { messages: {}, root: null };
  let index = 0;

  function skipStatement() {
    while (
      index < tokens.length &&
      tokens[index] !== ";" &&
      tokens[index] !== "}"
    )
      index++;
    if (tokens[index] === ";") index++;
  }

  function parseMessage(parent) {
    const name = tokens[index++];
    if (!name || tokens[index++] !== "{") throw new Error("message 定义不完整");
    const message = {
      name: name,
      fields: {},
      nested: {},
      parent: parent || null,
    };
    if (parent) parent.nested[name] = message;
    else root.messages[name] = message;
    if (!root.root) root.root = message;

    while (index < tokens.length && tokens[index] !== "}") {
      if (tokens[index] === "message") {
        index++;
        parseMessage(message);
        continue;
      }
      let label = null;
      if (["optional", "required", "repeated"].includes(tokens[index]))
        label = tokens[index++];
      const type = tokens[index++];
      const fieldName = tokens[index++];
      if (!type || !fieldName || tokens[index++] !== "=") {
        skipStatement();
        continue;
      }
      const fieldNumber = Number(tokens[index++]);
      if (!Number.isInteger(fieldNumber) || fieldNumber <= 0)
        throw new Error("非法字段号");
      message.fields[fieldNumber] = {
        type: type,
        name: fieldName,
        repeated: label === "repeated",
      };
      skipStatement();
    }
    if (tokens[index] !== "}") throw new Error("message 缺少结束括号");
    index++;
    return message;
  }

  while (index < tokens.length) {
    if (tokens[index] === "message") {
      index++;
      parseMessage(null);
    } else {
      skipStatement();
    }
  }

  function resolveMessage(type, message) {
    if (isScalarType(type)) return null;
    const typeParts = type.split(".").filter(Boolean);
    for (let scope = message; scope; scope = scope.parent) {
      let candidate = scope.nested[typeParts[0]];
      for (let i = 1; candidate && i < typeParts.length; i++)
        candidate = candidate.nested[typeParts[i]];
      if (candidate) return candidate;
    }
    let candidate = root.messages[typeParts[0]];
    for (let i = 1; candidate && i < typeParts.length; i++)
      candidate = candidate.nested[typeParts[i]];
    return candidate || null;
  }

  function bindMessageTypes(message) {
    Object.values(message.fields).forEach((field) => {
      field.messageSchema = resolveMessage(field.type, message);
    });
    Object.values(message.nested).forEach(bindMessageTypes);
  }

  Object.values(root.messages).forEach(bindMessageTypes);
  return root.root;
}

function parseInteger(value, fieldType) {
  if (typeof value === "number" && !Number.isSafeInteger(value)) {
    throw new Error(fieldType + " 必须使用安全整数或十进制字符串");
  }
  try {
    return BigInt(value);
  } catch (e) {
    throw new Error(fieldType + " 必须是整数");
  }
}

function encodeInteger(bytes, value, fieldType) {
  let integer = parseInteger(value, fieldType || "varint");
  if (fieldType === "sint64") {
    if (integer < -(1n << 63n) || integer > (1n << 63n) - 1n)
      throw new Error("sint64 超出范围");
    integer = (integer << 1n) ^ (integer >> 63n);
  } else if (fieldType === "int64") {
    if (integer < -(1n << 63n) || integer > (1n << 63n) - 1n)
      throw new Error("int64 超出范围");
    integer = BigInt.asUintN(64, integer);
  } else if (fieldType === "uint64") {
    if (integer < 0n || integer > MAX_UINT64)
      throw new Error("uint64 超出范围");
  } else if (fieldType === "sint32") {
    if (integer < -2147483648n || integer > 2147483647n)
      throw new Error("sint32 超出范围");
    integer = (integer << 1n) ^ (integer >> 31n);
  } else if (fieldType === "int32") {
    if (integer < -2147483648n || integer > 2147483647n)
      throw new Error("int32 超出范围");
    integer = BigInt.asUintN(64, integer);
  } else if (fieldType === "uint32") {
    if (integer < 0n || integer > 4294967295n)
      throw new Error("uint32 超出范围");
  } else if (integer < 0n || integer > MAX_UINT64) {
    throw new Error("varint 超出范围");
  }
  encodeVarint(bytes, integer);
}

// 编码 Protobuf 消息
function encodeProtobuf(obj, schema) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj))
    throw new Error("消息必须是 JSON 对象");
  const bytes = [];
  const fields = getMessageFields(schema);

  for (const [key, value] of Object.entries(obj)) {
    let fieldNumber = null;
    let field = null;
    if (fields) {
      for (const [number, info] of Object.entries(fields)) {
        if (info.name === key) {
          fieldNumber = Number(number);
          field = info;
          break;
        }
      }
    }
    if (!fieldNumber) {
      const match = key.match(/^field_(\d+)$/);
      if (!match) continue;
      fieldNumber = Number(match[1]);
    }

    const encodeField = (fieldValue) => {
      const fieldType = field && field.type;
      const wireType =
        fieldType === "double" ||
        fieldType === "fixed64" ||
        fieldType === "sfixed64"
          ? 1
          : fieldType === "float" ||
              fieldType === "fixed32" ||
              fieldType === "sfixed32"
            ? 5
            : fieldType === "string" ||
                fieldType === "bytes" ||
                (field && field.messageSchema) ||
                (fieldValue && typeof fieldValue === "object")
              ? 2
              : 0;
      encodeVarint(bytes, (BigInt(fieldNumber) << 3n) | BigInt(wireType));

      if (wireType === 0) {
        encodeInteger(bytes, fieldValue, fieldType);
      } else if (wireType === 1) {
        const buffer = new ArrayBuffer(8);
        const view = new DataView(buffer);
        if (fieldType === "double")
          view.setFloat64(0, Number(fieldValue), true);
        else
          view.setBigUint64(
            0,
            BigInt.asUintN(64, parseInteger(fieldValue, fieldType)),
            true,
          );
        for (let i = 0; i < 8; i++) bytes.push(view.getUint8(i));
      } else if (wireType === 2) {
        let data;
        if (fieldType === "bytes") {
          data = new TextEncoder().encode(String(fieldValue));
        } else if (field && field.messageSchema) {
          data = encodeProtobuf(fieldValue, field.messageSchema);
        } else if (typeof fieldValue === "string") {
          data = new TextEncoder().encode(fieldValue);
        } else if (fieldValue && typeof fieldValue === "object") {
          data = encodeProtobuf(fieldValue, null);
        } else {
          data = new TextEncoder().encode(String(fieldValue));
        }
        encodeVarint(bytes, BigInt(data.length));
        for (const byte of data) bytes.push(byte);
      } else {
        const buffer = new ArrayBuffer(4);
        const view = new DataView(buffer);
        if (fieldType === "float") view.setFloat32(0, Number(fieldValue), true);
        else view.setUint32(0, Number(fieldValue), true);
        for (let i = 0; i < 4; i++) bytes.push(view.getUint8(i));
      }
    };

    if (Array.isArray(value)) value.forEach(encodeField);
    else encodeField(value);
  }
  return new Uint8Array(bytes);
}

// 编码最多 64 位的 varint
function encodeVarint(bytes, value) {
  let integer = typeof value === "bigint" ? value : BigInt(value);
  if (integer < 0n || integer > MAX_UINT64) throw new Error("varint 超出范围");
  while (integer > 0x7fn) {
    bytes.push(Number((integer & 0x7fn) | 0x80n));
    integer >>= 7n;
  }
  bytes.push(Number(integer));
}

function base64ToBytes(input) {
  const binary = atob(input);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function showDecodedResult(bytes, schemaText, output) {
  const result = decodeProtobuf(
    bytes,
    0,
    bytes.length,
    parseProtoSchema(schemaText),
  );
  output.textContent = JSON.stringify(result, null, 2);
  output.className = "output-box pb-output";
  setStatus("解码成功");
}

// Base64 解码 Protobuf
function protobufDecodeBase64() {
  const input = document.getElementById("protobufInput").value.trim();
  const schemaText = document.getElementById("protobufSchema").value;
  const output = document.getElementById("protobufOutput");
  if (!input) {
    output.textContent = "请输入 Base64 编码的 Protobuf 数据";
    output.className = "output-box pb-output error";
    return;
  }
  try {
    showDecodedResult(base64ToBytes(input), schemaText, output);
  } catch (e) {
    output.textContent = "解码失败: " + e.message;
    output.className = "output-box pb-output error";
  }
}

// Hex 解码 Protobuf
function protobufDecodeHex() {
  const input = document.getElementById("protobufInput").value.trim();
  const schemaText = document.getElementById("protobufSchema").value;
  const output = document.getElementById("protobufOutput");
  if (!input) {
    output.textContent = "请输入 Hex 编码的 Protobuf 数据";
    output.className = "output-box pb-output error";
    return;
  }
  try {
    const hex = input.replace(/\s+/g, "").replace(/^0x/i, "");
    if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0)
      throw new Error("非法 Hex 字符串");
    showDecodedResult(
      new Uint8Array(hex.match(/.{1,2}/g).map((item) => parseInt(item, 16))),
      schemaText,
      output,
    );
  } catch (e) {
    output.textContent = "解码失败: " + e.message;
    output.className = "output-box pb-output error";
  }
}

// JSON 编码为 Protobuf Base64
function protobufEncode() {
  const input = document.getElementById("protobufInput").value.trim();
  const schemaText = document.getElementById("protobufSchema").value;
  const output = document.getElementById("protobufOutput");
  if (!input) {
    output.textContent = "请输入 JSON 数据";
    output.className = "output-box pb-output error";
    return;
  }
  try {
    const bytes = encodeProtobuf(
      JSON.parse(input),
      parseProtoSchema(schemaText),
    );
    output.textContent =
      "Base64: " +
      btoa(String.fromCharCode(...bytes)) +
      "\n\nHex: " +
      bytesToHex(bytes);
    output.className = "output-box pb-output";
    setStatus("编码成功");
  } catch (e) {
    output.textContent = "编码失败: " + e.message;
    output.className = "output-box pb-output error";
  }
}

if (typeof module !== "undefined") {
  module.exports = {
    decodeVarint,
    decodeProtobuf,
    encodeVarint,
    encodeProtobuf,
    parseProtoSchema,
  };
}

registerInit("protobuf", function () {});
