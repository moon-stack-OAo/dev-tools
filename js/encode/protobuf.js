// Protobuf Wire Types
const WIRE_TYPES = {
    0: 'varint',
    1: 'fixed64',
    2: 'length-delimited',
    5: 'fixed32',
};

// 解析 Protobuf varint
function decodeVarint(bytes, offset) {
    let result = 0;
    let shift = 0;
    let pos = offset;
    while (pos < bytes.length) {
        const b = bytes[pos];
        result |= (b & 0x7f) << shift;
        if ((b & 0x80) === 0) {
            return { value: result, bytesRead: pos - offset + 1 };
        }
        shift += 7;
        pos++;
        if (shift > 35) {
            throw new Error('Varint 太长');
        }
    }
    throw new Error('Varint 未结束');
}

// 解码 Protobuf 消息
function decodeProtobuf(bytes, offset, length, schema) {
    const result = {};
    const end = offset + (length || bytes.length);
    let pos = offset;

    while (pos < end) {
        try {
            // 解析 tag
            const tagResult = decodeVarint(bytes, pos);
            const tag = tagResult.value;
            pos += tagResult.bytesRead;

            const fieldNumber = tag >> 3;
            const wireType = tag & 0x07;

            // 获取字段名
            const fieldName = schema && schema[fieldNumber] ? schema[fieldNumber].name : 'field_' + fieldNumber;
            const fieldType = schema && schema[fieldNumber] ? schema[fieldNumber].type : null;

            let value;
            switch (wireType) {
                case 0: // varint
                    const varintResult = decodeVarint(bytes, pos);
                    value = varintResult.value;
                    pos += varintResult.bytesRead;
                    // 如果是负数（sint32/sint64/bool/enum）
                    if (fieldType === 'sint32' || fieldType === 'sint64') {
                        value = (value >>> 1) ^ -(value & 1);
                    }
                    break;

                case 1: // fixed64
                    if (pos + 8 > bytes.length) throw new Error('数据不足');
                    const buf64 = new ArrayBuffer(8);
                    const view64 = new DataView(buf64);
                    for (let i = 0; i < 8; i++) {
                        view64.setUint8(i, bytes[pos + i]);
                    }
                    value =
                        fieldType === 'double' ? view64.getFloat64(0, true) : view64.getBigUint64(0, true).toString();
                    pos += 8;
                    break;

                case 2: // length-delimited
                    const lenResult = decodeVarint(bytes, pos);
                    const len = lenResult.value;
                    pos += lenResult.bytesRead;
                    if (pos + len > bytes.length) throw new Error('数据不足');

                    // 尝试解析为嵌套消息
                    if (fieldType === 'string' || fieldType === 'bytes') {
                        if (fieldType === 'string') {
                            try {
                                value = new TextDecoder('utf-8').decode(bytes.slice(pos, pos + len));
                            } catch {
                                value = Array.from(bytes.slice(pos, pos + len))
                                    .map((b) => b.toString(16).padStart(2, '0'))
                                    .join(' ');
                            }
                        } else {
                            value = Array.from(bytes.slice(pos, pos + len))
                                .map((b) => b.toString(16).padStart(2, '0'))
                                .join(' ');
                        }
                    } else {
                        // 尝试作为嵌套消息解码
                        try {
                            const nested = decodeProtobuf(bytes, pos, len, null);
                            if (Object.keys(nested).length > 0) {
                                value = nested;
                            } else {
                                value = Array.from(bytes.slice(pos, pos + len))
                                    .map((b) => b.toString(16).padStart(2, '0'))
                                    .join(' ');
                            }
                        } catch {
                            value = Array.from(bytes.slice(pos, pos + len))
                                .map((b) => b.toString(16).padStart(2, '0'))
                                .join(' ');
                        }
                    }
                    pos += len;
                    break;

                case 5: // fixed32
                    if (pos + 4 > bytes.length) throw new Error('数据不足');
                    const buf32 = new ArrayBuffer(4);
                    const view32 = new DataView(buf32);
                    for (let i = 0; i < 4; i++) {
                        view32.setUint8(i, bytes[pos + i]);
                    }
                    value = fieldType === 'float' ? view32.getFloat32(0, true) : view32.getUint32(0, true);
                    pos += 4;
                    break;

                default:
                    throw new Error('未知 wire type: ' + wireType);
            }

            // 处理 repeated 字段
            if (result[fieldName] !== undefined) {
                if (!Array.isArray(result[fieldName])) {
                    result[fieldName] = [result[fieldName]];
                }
                result[fieldName].push(value);
            } else {
                result[fieldName] = value;
            }
        } catch (e) {
            break;
        }
    }

    return result;
}

// 解析 Proto schema
function parseProtoSchema(schemaText) {
    if (!schemaText) return null;
    const schema = {};
    const fieldRegex = /(?:optional|repeated|required)?\s*(\w+)\s+(\w+)\s*=\s*(\d+)/g;
    let match;
    while ((match = fieldRegex.exec(schemaText)) !== null) {
        const fieldNumber = parseInt(match[3]);
        schema[fieldNumber] = {
            type: match[1],
            name: match[2],
        };
    }
    return Object.keys(schema).length > 0 ? schema : null;
}

// Base64 解码 Protobuf
function protobufDecodeBase64() {
    const input = document.getElementById('protobufInput').value.trim();
    const schemaText = document.getElementById('protobufSchema').value;
    const output = document.getElementById('protobufOutput');

    if (!input) {
        output.textContent = '请输入 Base64 编码的 Protobuf 数据';
        output.style.color = 'var(--error, #ff6b6b)';
        return;
    }

    try {
        // Base64 解码
        const binaryStr = atob(input);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
        }

        const schema = parseProtoSchema(schemaText);
        const result = decodeProtobuf(bytes, 0, bytes.length, schema);
        output.textContent = JSON.stringify(result, null, 2);
        output.style.color = '';
        setStatus('解码成功');
    } catch (e) {
        output.textContent = '解码失败: ' + e.message;
        output.style.color = 'var(--error, #ff6b6b)';
    }
}

// Hex 解码 Protobuf
function protobufDecodeHex() {
    const input = document.getElementById('protobufInput').value.trim();
    const schemaText = document.getElementById('protobufSchema').value;
    const output = document.getElementById('protobufOutput');

    if (!input) {
        output.textContent = '请输入 Hex 编码的 Protobuf 数据';
        output.style.color = 'var(--error, #ff6b6b)';
        return;
    }

    try {
        // Hex 解码
        const hex = input.replace(/\s+/g, '').replace(/^0x/i, '');
        if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) {
            throw new Error('非法 Hex 字符串');
        }
        const bytes = new Uint8Array(hex.match(/.{1,2}/g).map((h) => parseInt(h, 16)));

        const schema = parseProtoSchema(schemaText);
        const result = decodeProtobuf(bytes, 0, bytes.length, schema);
        output.textContent = JSON.stringify(result, null, 2);
        output.style.color = '';
        setStatus('解码成功');
    } catch (e) {
        output.textContent = '解码失败: ' + e.message;
        output.style.color = 'var(--error, #ff6b6b)';
    }
}

// JSON 编码为 Protobuf Base64
function protobufEncode() {
    const input = document.getElementById('protobufInput').value.trim();
    const schemaText = document.getElementById('protobufSchema').value;
    const output = document.getElementById('protobufOutput');

    if (!input) {
        output.textContent = '请输入 JSON 数据';
        output.style.color = 'var(--error, #ff6b6b)';
        return;
    }

    try {
        const json = JSON.parse(input);
        const schema = parseProtoSchema(schemaText);

        // 简单的 JSON → Protobuf 编码
        const bytes = encodeProtobuf(json, schema);
        const base64 = btoa(String.fromCharCode(...bytes));
        output.textContent =
            'Base64: ' +
            base64 +
            '\n\nHex: ' +
            Array.from(bytes)
                .map((b) => b.toString(16).padStart(2, '0'))
                .join(' ');
        output.style.color = '';
        setStatus('编码成功');
    } catch (e) {
        output.textContent = '编码失败: ' + e.message;
        output.style.color = 'var(--error, #ff6b6b)';
    }
}

// 编码 Protobuf 消息
function encodeProtobuf(obj, schema) {
    const bytes = [];

    for (const [key, value] of Object.entries(obj)) {
        // 查找字段号
        let fieldNumber = null;
        let fieldType = null;
        if (schema) {
            for (const [num, info] of Object.entries(schema)) {
                if (info.name === key) {
                    fieldNumber = parseInt(num);
                    fieldType = info.type;
                    break;
                }
            }
        }
        if (!fieldNumber) {
            // 尝试从 field_N 格式提取
            const match = key.match(/^field_(\d+)$/);
            if (match) {
                fieldNumber = parseInt(match[1]);
            } else {
                continue; // 跳过未知字段
            }
        }

        const encodeField = (val) => {
            let wireType;
            if (fieldType === 'double' || fieldType === 'float') {
                wireType = fieldType === 'double' ? 1 : 5;
            } else if (fieldType === 'string' || fieldType === 'bytes' || typeof val === 'object') {
                wireType = 2;
            } else {
                wireType = 0;
            }

            // 写 tag
            const tag = (fieldNumber << 3) | wireType;
            encodeVarint(bytes, tag);

            // 写值
            switch (wireType) {
                case 0: // varint
                    if (fieldType === 'sint32' || fieldType === 'sint64') {
                        val = (val << 1) ^ (val >> 31);
                    }
                    encodeVarint(bytes, val);
                    break;
                case 1: // fixed64
                    const buf64 = new ArrayBuffer(8);
                    const view64 = new DataView(buf64);
                    if (fieldType === 'double') {
                        view64.setFloat64(0, val, true);
                    } else {
                        view64.setBigUint64(0, BigInt(val), true);
                    }
                    for (let i = 0; i < 8; i++) bytes.push(view64.getUint8(i));
                    break;
                case 2: // length-delimited
                    let data;
                    if (typeof val === 'string') {
                        data = new TextEncoder().encode(val);
                    } else if (typeof val === 'object') {
                        data = encodeProtobuf(val, null);
                    } else {
                        data = new TextEncoder().encode(String(val));
                    }
                    encodeVarint(bytes, data.length);
                    for (const b of data) bytes.push(b);
                    break;
                case 5: // fixed32
                    const buf32 = new ArrayBuffer(4);
                    const view32 = new DataView(buf32);
                    if (fieldType === 'float') {
                        view32.setFloat32(0, val, true);
                    } else {
                        view32.setUint32(0, val, true);
                    }
                    for (let i = 0; i < 4; i++) bytes.push(view32.getUint8(i));
                    break;
            }
        };

        if (Array.isArray(value)) {
            value.forEach(encodeField);
        } else {
            encodeField(value);
        }
    }

    return new Uint8Array(bytes);
}

// 编码 varint
function encodeVarint(bytes, value) {
    value = value >>> 0;
    while (value > 0x7f) {
        bytes.push((value & 0x7f) | 0x80);
        value >>>= 7;
    }
    bytes.push(value & 0x7f);
}

registerInit('protobuf', function () {
    // 初始化
});
