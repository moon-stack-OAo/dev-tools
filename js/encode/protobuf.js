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

function isPackableType(type) {
  return INTEGER_TYPES.has(type) || ["fixed32", "fixed64", "sfixed32", "sfixed64", "float", "double"].includes(type);
}

function decodeFixed(bytes, pos, size, fieldType) {
  if (pos + size > bytes.length) throw new Error("数据不足");
  const view = new DataView(bytes.buffer, bytes.byteOffset + pos, size);
  if (fieldType === "float") return view.getFloat32(0, true);
  if (fieldType === "double") return view.getFloat64(0, true);
  if (size === 4) {
    const value = view.getUint32(0, true);
    return fieldType === "sfixed32" ? Number(BigInt.asIntN(32, BigInt(value))) : value;
  }
  const value = view.getBigUint64(0, true);
  if (!fieldType) return value.toString();
  return fieldType === "sfixed64" ? bigIntToValue(BigInt.asIntN(64, value)) : bigIntToValue(value);
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

function addDecodedField(result, field, fieldNumber, value) {
  const fieldName = field ? field.name : "field_" + fieldNumber;
  if (field && field.map) {
    if (!result[fieldName]) result[fieldName] = {};
    result[fieldName][String(value[0])] = value[1];
  } else if (field && field.oneof) {
    result[fieldName] = value;
  } else {
    addFieldValue(result, fieldName, value);
  }
}

function decodeMapEntry(bytes, offset, length, field) {
  const entry = decodeProtobuf(bytes, offset, length, {
    1: field.keyField,
    2: field.valueField,
  });
  return [entry.field_1 === undefined ? "" : entry.field_1, entry.field_2];
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
    const fieldType = field ? field.type : null;
    let value;

    if (field && field.oneof && field.oneof.fields) {
      for (const otherField of field.oneof.fields) {
        if (otherField !== field) delete result[otherField.name];
      }
    }

    if (field && field.repeated && !field.map && isPackableType(fieldType) && wireType === 2) {
      const lengthResult = readLength(bytes, pos, end);
      pos += lengthResult.bytesRead;
      const dataEnd = pos + lengthResult.length;
      if (dataEnd > end) throw new Error("数据不足");
      while (pos < dataEnd) {
        let item;
        if (fieldType === "fixed32" || fieldType === "sfixed32" || fieldType === "float") {
          if (pos + 4 > dataEnd) throw new Error("packed 字段长度非法");
          item = decodeFixed(bytes, pos, 4, fieldType);
          pos += 4;
        } else if (fieldType === "fixed64" || fieldType === "sfixed64" || fieldType === "double") {
          if (pos + 8 > dataEnd) throw new Error("packed 字段长度非法");
          item = decodeFixed(bytes, pos, 8, fieldType);
          pos += 8;
        } else {
          const itemResult = decodeVarint(bytes, pos, dataEnd);
          item = decodeInteger(itemResult.value, fieldType);
          pos += itemResult.bytesRead;
        }
        addDecodedField(result, field, fieldNumber, item);
      }
      continue;
    }

    switch (wireType) {
      case 0: {
        const varintResult = decodeVarint(bytes, pos, end);
        value = decodeInteger(varintResult.value, fieldType);
        pos += varintResult.bytesRead;
        break;
      }
      case 1: {
        if (pos + 8 > end) throw new Error("数据不足");
        value = decodeFixed(bytes, pos, 8, fieldType);
        pos += 8;
        break;
      }
      case 2: {
        const lengthResult = readLength(bytes, pos, end);
        pos += lengthResult.bytesRead;
        if (pos + lengthResult.length > end) throw new Error("数据不足");
        const dataEnd = pos + lengthResult.length;

        if (field && field.map) {
          value = decodeMapEntry(bytes, pos, lengthResult.length, field);
        } else if (fieldType === "string") {
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
        value = decodeFixed(bytes, pos, 4, fieldType);
        pos += 4;
        break;
      }
      default:
        throw new Error("未知 wire type: " + wireType);
    }
    addDecodedField(result, field, fieldNumber, value);
  }
  return result;
}

function tokenizeProto(schemaText) {
  return schemaText
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .match(/"(?:\\.|[^"\\])*"|[A-Za-z_]\w*|-?\d+|[{}=;.,\[\]<>]/g) || [];
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
  const root = { messages: {}, enums: {}, root: null };
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

  function parseEnum(parent) {
    const name = tokens[index++];
    if (!name || tokens[index++] !== "{") throw new Error("enum 定义不完整");
    const enumSchema = { name, values: {}, parent: parent || null };
    if (parent) parent.enums[name] = enumSchema;
    else root.enums[name] = enumSchema;
    while (index < tokens.length && tokens[index] !== "}") {
      const valueName = tokens[index++];
      if (tokens[index++] !== "=") {
        skipStatement();
        continue;
      }
      const value = Number(tokens[index++]);
      if (!Number.isInteger(value)) throw new Error("非法 enum 值");
      enumSchema.values[valueName] = value;
      skipStatement();
    }
    if (tokens[index] !== "}") throw new Error("enum 缺少结束括号");
    index++;
    return enumSchema;
  }

  function parseField(message, label, oneof) {
    let type;
    let map = false;
    let keyType;
    if (tokens[index] === "map") {
      map = true;
      index++;
      if (tokens[index++] !== "<") throw new Error("map 定义不完整");
      keyType = tokens[index++];
      if (tokens[index++] !== ",") throw new Error("map 定义不完整");
      type = tokens[index++];
      if (tokens[index++] !== ">") throw new Error("map 定义不完整");
    } else {
      type = tokens[index++];
    }
    const fieldName = tokens[index++];
    if (!type || !fieldName || tokens[index++] !== "=") {
      skipStatement();
      return null;
    }
    const fieldNumber = Number(tokens[index++]);
    if (!Number.isInteger(fieldNumber) || fieldNumber <= 0) throw new Error("非法字段号");
    const field = { type, name: fieldName, repeated: label === "repeated" || map, packed: undefined };
    if (oneof) field.oneof = oneof;
    if (map) {
      field.map = true;
      field.keyField = { type: keyType, name: "field_1" };
      field.valueField = { type, name: "field_2" };
    }
    if (tokens[index] === "[") {
      index++;
      while (index < tokens.length && tokens[index] !== "]") {
        if (tokens[index] === "packed" && tokens[index + 1] === "=" && tokens[index + 2] === "false") field.packed = false;
        index++;
      }
      if (tokens[index] === "]") index++;
    }
    skipStatement();
    message.fields[fieldNumber] = field;
    return field;
  }

  function parseMessage(parent) {
    const name = tokens[index++];
    if (!name || tokens[index++] !== "{") throw new Error("message 定义不完整");
    const message = {
      name: name,
      fields: {},
      nested: {},
      enums: {},
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
      if (tokens[index] === "enum") {
        index++;
        parseEnum(message);
        continue;
      }
      if (tokens[index] === "oneof") {
        index++;
        const oneofName = tokens[index++];
        if (tokens[index++] !== "{") throw new Error("oneof 定义不完整");
        const oneof = { name: oneofName, fields: [] };
        while (index < tokens.length && tokens[index] !== "}") {
          const field = parseField(message, null, oneof);
          if (field) oneof.fields.push(field);
        }
        if (tokens[index] === "}") index++;
        continue;
      }
      let label = null;
      if (["optional", "required", "repeated"].includes(tokens[index])) label = tokens[index++];
      if (["reserved", "extensions", "option"].includes(tokens[index])) {
        skipStatement();
        continue;
      }
      parseField(message, label);
    }
    if (tokens[index] !== "}") throw new Error("message 缺少结束括号");
    index++;
    return message;
  }

  while (index < tokens.length) {
    if (tokens[index] === "message") {
      index++;
      parseMessage(null);
    } else if (tokens[index] === "enum") {
      index++;
      parseEnum(null);
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

  function resolveEnum(type, message) {
    if (isScalarType(type)) return null;
    const typeParts = type.split(".").filter(Boolean);
    for (let scope = message; scope; scope = scope.parent) {
      let candidate = scope.enums[typeParts[0]];
      if (candidate) return candidate;
    }
    return root.enums[typeParts[0]] || null;
  }

  function bindMessageTypes(message) {
    Object.values(message.fields).forEach((field) => {
      field.messageSchema = resolveMessage(field.type, message);
      field.enumSchema = resolveEnum(field.type, message);
      if (field.map) {
        field.valueField.messageSchema = resolveMessage(field.valueField.type, message);
        field.valueField.enumSchema = resolveEnum(field.valueField.type, message);
        field.keyField.messageSchema = resolveMessage(field.keyField.type, message);
      }
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

function encodeInteger(bytes, value, fieldType, enumSchema) {
  if (enumSchema && typeof value === "string" && enumSchema.values[value] !== undefined) value = enumSchema.values[value];
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

    const encodePrimitive = (target, fieldValue, fieldType, fieldInfo) => {
      if (fieldType === "double") {
        const buffer = new ArrayBuffer(8);
        new DataView(buffer).setFloat64(0, Number(fieldValue), true);
        for (const byte of new Uint8Array(buffer)) target.push(byte);
      } else if (fieldType === "float") {
        const buffer = new ArrayBuffer(4);
        new DataView(buffer).setFloat32(0, Number(fieldValue), true);
        for (const byte of new Uint8Array(buffer)) target.push(byte);
      } else if (["fixed32", "sfixed32"].includes(fieldType)) {
        const integer = parseInteger(fieldValue, fieldType);
        if (fieldType === "sfixed32" && (integer < -2147483648n || integer > 2147483647n)) throw new Error("sfixed32 超出范围");
        if (fieldType === "fixed32" && (integer < 0n || integer > 4294967295n)) throw new Error("fixed32 超出范围");
        const buffer = new ArrayBuffer(4);
        new DataView(buffer).setUint32(0, Number(BigInt.asUintN(32, integer)), true);
        for (const byte of new Uint8Array(buffer)) target.push(byte);
      } else if (["fixed64", "sfixed64"].includes(fieldType)) {
        const integer = parseInteger(fieldValue, fieldType);
        if (fieldType === "sfixed64" && (integer < -(1n << 63n) || integer > (1n << 63n) - 1n)) throw new Error("sfixed64 超出范围");
        if (fieldType === "fixed64" && (integer < 0n || integer > MAX_UINT64)) throw new Error("fixed64 超出范围");
        const buffer = new ArrayBuffer(8);
        new DataView(buffer).setBigUint64(0, BigInt.asUintN(64, integer), true);
        for (const byte of new Uint8Array(buffer)) target.push(byte);
      } else {
        encodeInteger(target, fieldValue, fieldType, fieldInfo && fieldInfo.enumSchema);
      }
    };

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
        encodePrimitive(bytes, fieldValue, fieldType, field);
      } else if (wireType === 1) {
        encodePrimitive(bytes, fieldValue, fieldType, field);
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
        encodePrimitive(bytes, fieldValue, fieldType, field);
      }
    };

    if (field && field.map && value && typeof value === "object" && !Array.isArray(value)) {
      for (const [key, mapValue] of Object.entries(value)) {
        const entry = encodeProtobuf({ field_1: key, field_2: mapValue }, {
          1: field.keyField,
          2: field.valueField,
        });
        encodeVarint(bytes, (BigInt(fieldNumber) << 3n) | 2n);
        encodeVarint(bytes, BigInt(entry.length));
        bytes.push(...entry);
      }
    } else if (Array.isArray(value) && field && field.repeated && field.packed !== false && isPackableType(field.type)) {
      const packed = [];
      value.forEach((item) => encodePrimitive(packed, item, field.type, field));
      encodeVarint(bytes, (BigInt(fieldNumber) << 3n) | 2n);
      encodeVarint(bytes, BigInt(packed.length));
      bytes.push(...packed);
    } else if (Array.isArray(value)) value.forEach(encodeField);
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
