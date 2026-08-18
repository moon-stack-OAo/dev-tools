const GRPC_STATUS_CODES = [
  { code: 0, name: "OK", desc: "成功" },
  { code: 1, name: "CANCELLED", desc: "操作被取消，通常是调用方主动取消" },
  { code: 2, name: "UNKNOWN", desc: "未知错误，调用方不应直接返回此状态" },
  { code: 3, name: "INVALID_ARGUMENT", desc: "客户端传入无效参数" },
  { code: 4, name: "DEADLINE_EXCEEDED", desc: "操作在截止时间前未完成" },
  { code: 5, name: "NOT_FOUND", desc: "请求的资源不存在" },
  { code: 6, name: "ALREADY_EXISTS", desc: "要创建的资源已存在" },
  { code: 7, name: "PERMISSION_DENIED", desc: "调用方无权限执行该操作" },
  { code: 8, name: "RESOURCE_EXHAUSTED", desc: "资源耗尽（配额、磁盘空间等）" },
  {
    code: 9,
    name: "FAILED_PRECONDITION",
    desc: "系统未处于执行该操作所需的状态",
  },
  { code: 10, name: "ABORTED", desc: "操作被中止，通常是并发冲突" },
  { code: 11, name: "OUT_OF_RANGE", desc: "操作尝试访问超出有效范围的内容" },
  { code: 12, name: "UNIMPLEMENTED", desc: "该方法未实现或服务端不支持" },
  { code: 13, name: "INTERNAL", desc: "服务端内部错误，不可恢复" },
  { code: 14, name: "UNAVAILABLE", desc: "服务当前不可用（网络/维护等）" },
  { code: 15, name: "DATA_LOSS", desc: "数据丢失或损坏（不可恢复）" },
  { code: 16, name: "UNAUTHENTICATED", desc: "未提供有效身份认证信息" },
];

function grpcSwitchTab(tab, name) {
  document
    .querySelectorAll("#panel-grpc .tab-bar .tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll("#panel-grpc .tab-content")
    .forEach((c) => c.classList.remove("active"));
  tab.classList.add("active");
  document.getElementById("grpc-tab-" + name).classList.add("active");
}

function grpcSwitchBodyMode() {
  const mode = document.querySelector('input[name="grpcBodyMode"]:checked').value;
  document.getElementById("grpcBodyBase64").style.display = mode === "base64" ? "" : "none";
  document.getElementById("grpcBodyJson").style.display = mode === "json" ? "" : "none";
}

function grpcAddMeta(key, val) {
  const container = document.getElementById("grpcMetaList");
  const row = document.createElement("div");
  row.className = "api-kv-row";
  const k = escapeHtml(key || "");
  const v = escapeHtml(val || "");
  row.innerHTML = `<input type="text" placeholder="Metadata Key (如 authorization)" value="${k}"><input type="text" placeholder="Value" value="${v}"><button class="outline sm" onclick="this.parentElement.remove()" title="删除">&#10005;</button>`;
  container.appendChild(row);
}

function grpcCollectMeta() {
  const result = [];
  document.querySelectorAll("#grpcMetaList .api-kv-row").forEach((row) => {
    const inputs = row.querySelectorAll("input");
    const key = inputs[0].value.trim();
    const val = inputs[1].value;
    if (key) result.push([key, val]);
  });
  return result;
}

function grpcShellQuote(s) {
  if (s === undefined || s === null) return "''";
  const str = String(s);
  if (str === "") return "''";
  if (!/[^A-Za-z0-9_\-./:=?&%@,+]/.test(str)) return str;
  return "'" + str.replace(/'/g, "'\\''") + "'";
}

function grpcBase64Encode(str) {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch (e) {
    return "";
  }
}

function grpcBytesToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  if (typeof btoa === "function") return btoa(binary);
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  throw new Error("当前环境不支持 Base64 编码");
}

function grpcBase64ToBytes(input) {
  const clean = String(input || "").replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean) || clean.length % 4 === 1)
    throw new Error("Base64 格式无效");
  let bin;
  try {
    if (typeof atob === "function") bin = atob(clean);
    else if (typeof Buffer !== "undefined") bin = Buffer.from(clean, "base64").toString("binary");
    else throw new Error("当前环境不支持 Base64 解码");
  } catch (e) {
    throw new Error("Base64 解码失败: " + e.message);
  }
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// gRPC data frame: 1 byte compression flag + 4 bytes big-endian message length.
function grpcBuildFrame(messageBytes) {
  const bytes = messageBytes instanceof Uint8Array ? messageBytes : new Uint8Array(messageBytes);
  if (bytes.length > 0xffffffff) throw new Error("请求消息超过 gRPC 4 字节长度上限");
  const frame = new Uint8Array(bytes.length + 5);
  frame[0] = 0;
  frame[1] = (bytes.length >>> 24) & 0xff;
  frame[2] = (bytes.length >>> 16) & 0xff;
  frame[3] = (bytes.length >>> 8) & 0xff;
  frame[4] = bytes.length & 0xff;
  frame.set(bytes, 5);
  return frame;
}

function grpcBuildCurlCommand(endpoint, contentType, metadata, messageBytes) {
  if (!endpoint || !String(endpoint).trim()) throw new Error("请输入目标服务地址");
  const frameBase64 = grpcBytesToBase64(grpcBuildFrame(messageBytes));
  const lines = [
    "# 生成供 curl 或本地 HTTP/2 gRPC 代理使用的请求命令（浏览器不直接发送标准 HTTP/2 gRPC）",
    `curl -X POST ${grpcShellQuote(endpoint)} \\`,
    `  -H ${grpcShellQuote("Content-Type: " + contentType)} \\`,
    `  -H ${grpcShellQuote("TE: trailers")} \\`,
  ];
  if ((metadata || []).length) lines.push(`  -H ${grpcShellQuote("Accept: */*")} \\`);
  (metadata || []).forEach(([key, value]) => {
    const lower = key.toLowerCase();
    lines.push(`  -H ${grpcShellQuote(key + ": " + value)} \\`);
    if (!lower.endsWith("-bin") && !/^[A-Za-z0-9+/=]*$/.test(value)) {
      lines.push(`  -H ${grpcShellQuote(lower + "-bin: " + grpcBase64Encode(value))} \\`);
    }
  });
  lines.push(`  --data-binary ${grpcShellQuote(frameBase64)}`);
  return lines.join("\n");
}

function grpcEncodeJsonWithSchema(value, schemaText) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("JSON 必须是对象");
  const protobuf = typeof globalThis !== "undefined" ? globalThis : {};
  if (typeof protobuf.parseProtoSchema !== "function" || typeof protobuf.encodeProtobuf !== "function") {
    throw new Error("公共 Protobuf 编码器未加载，请先加载 protobuf 工具脚本");
  }
  return protobuf.encodeProtobuf(value, protobuf.parseProtoSchema(String(schemaText || "")));
}

function grpcBuildMeta() {
  const out = document.getElementById("grpcMetaOutput");
  const endpoint = document.getElementById("grpcEndpoint").value.trim();
  const contentType = document.getElementById("grpcCt").value;
  const meta = grpcCollectMeta();

  if (!endpoint) {
    out.textContent = "请输入目标服务地址";
    out.className = "output-box error";
    toast("请输入目标服务地址");
    return;
  }

  try {
    const mode = document.querySelector('input[name="grpcBodyMode"]:checked').value;
    let messageBytes;
    if (mode === "base64") {
      messageBytes = grpcBase64ToBytes(document.getElementById("grpcRequestBase64").value);
    } else {
      const json = JSON.parse(document.getElementById("grpcRequestJson").value);
      const schema = document.getElementById("grpcRequestSchema").value;
      messageBytes = grpcEncodeJsonWithSchema(json, schema);
    }
    out.textContent = grpcBuildCurlCommand(endpoint, contentType, meta, messageBytes);
    out.className = "output-box";
    setStatus("已生成 gRPC 帧请求命令");
  } catch (e) {
    out.textContent = "请求体生成失败: " + e.message;
    out.className = "output-box error";
  }
}

function grpcParsePb() {
  const input = document.getElementById("grpcPbInput").value.trim();
  const out = document.getElementById("grpcPbOutput");
  if (!input) {
    out.textContent = "请输入 Base64 字符串";
    out.className = "output-box error";
    return;
  }
  let bytes;
  try {
      bytes = grpcBase64ToBytes(input);
  } catch (e) {
    out.textContent = "Base64 解码失败: " + e.message;
    out.className = "output-box error";
    return;
  }
  try {
    out.textContent = grpcDecodeProtobuf(bytes);
    out.className = "output-box";
    setStatus("Protobuf 解析完成 (" + bytes.length + " 字节)");
  } catch (e) {
    out.textContent = "Wire Format 解析失败: " + e.message;
    out.className = "output-box error";
  }
}

function grpcParsePbHex() {
  const input = document.getElementById("grpcPbInput").value.trim();
  const out = document.getElementById("grpcPbOutput");
  if (!input) {
    out.textContent = "请输入 Hex 字符串";
    out.className = "output-box error";
    return;
  }
  const clean = input.replace(/\s+/g, "");
  if (!/^[0-9a-fA-F]+$/.test(clean) || clean.length % 2 !== 0) {
    out.textContent = "Hex 字符串格式无效 (需偶数长度)";
    out.className = "output-box error";
    return;
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  try {
    out.textContent = grpcDecodeProtobuf(bytes);
    out.className = "output-box";
    setStatus("Protobuf (Hex) 解析完成 (" + bytes.length + " 字节)");
  } catch (e) {
    out.textContent = "Wire Format 解析失败: " + e.message;
    out.className = "output-box error";
  }
}

function grpcReadVarint(bytes, pos) {
  let value = 0n;
  let shift = 0n;
  for (let count = 0; count < 10; count++) {
    if (pos >= bytes.length) throw new Error("Varint 截断：数据未结束");
    const b = bytes[pos++];
    if (count === 9 && (b & 0x7f) > 1) throw new Error("Varint 非法：超过 64 位");
    value |= BigInt(b & 0x7f) << shift;
    if ((b & 0x80) === 0) return [value, pos];
    if (count === 9) throw new Error("Varint 非法：超过 64 位");
    shift += 7n;
  }
  throw new Error("Varint 非法：超过 10 字节");
}

function grpcBytesToAscii(bytes) {
  let s = "";
  let printable = true;
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b < 32 && b !== 9 && b !== 10 && b !== 13) printable = false;
    if (b >= 32 && b < 127) s += String.fromCharCode(b);
    else if (b === 9) s += "\\t";
    else if (b === 10) s += "\\n";
    else if (b === 13) s += "\\r";
    else s += "\\x" + b.toString(16).padStart(2, "0");
  }
  return { text: s, printable };
}

function grpcTryUtf8(bytes) {
  try {
    const dec = new TextDecoder("utf-8", { fatal: true });
    return dec.decode(bytes);
  } catch (e) {
    return null;
  }
}

const GRPC_WIRE_TYPES = {
  0: "Varint",
  1: "Fixed64",
  2: "Length-delimited",
  3: "StartGroup (deprecated)",
  4: "EndGroup (deprecated)",
  5: "Fixed32",
};

function grpcDecodeProtobuf(bytes) {
  const lines = [];
  lines.push("总字节数: " + bytes.length);
  lines.push(
    "Hex 预览: " +
      Array.from(bytes.slice(0, 64))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ") +
      (bytes.length > 64 ? " ..." : ""),
  );
  lines.push("---");
  let pos = 0;
  let idx = 0;
  while (pos < bytes.length) {
    const startPos = pos;
    const [tag, newPos] = grpcReadVarint(bytes, pos);
    if (newPos === pos) break;
    pos = newPos;
    if (tag > 0xfffffffffffffff8n) throw new Error("字段标签非法");
    const fieldNumber = Number(tag >> 3n);
    const wireType = Number(tag & 0x07n);
    if (fieldNumber === 0) throw new Error("字段号不能为 0");

    if (wireType === 0) {
      const [val, np] = grpcReadVarint(bytes, pos);
      pos = np;
      lines.push(
        `#${++idx} field=${fieldNumber} type=varint  value=${val.toString()} (0x${val.toString(16)})  bytes=${startPos}-${pos}`,
      );
    } else if (wireType === 1) {
      if (pos + 8 > bytes.length) {
        lines.push(`#${++idx} field=${fieldNumber} type=fixed64  [截断]`);
        break;
      }
      let v = 0n;
      for (let i = 0; i < 8; i++) v |= BigInt(bytes[pos + i]) << BigInt(i * 8);
      const dv = v.toString();
      pos += 8;
      lines.push(
        `#${++idx} field=${fieldNumber} type=fixed64 value=${dv}  bytes=${startPos}-${pos}`,
      );
    } else if (wireType === 2) {
      const [len, np] = grpcReadVarint(bytes, pos);
      pos = np;
      if (len > BigInt(bytes.length - pos)) {
        lines.push(
          `#${++idx} field=${fieldNumber} type=length-delimited  [截断: 需要 ${len.toString()} 字节, 剩余 ${bytes.length - pos}]`,
        );
        throw new Error("Length-delimited 数据截断");
      }
      const numericLength = Number(len);
      const slice = bytes.slice(pos, pos + numericLength);
      const utf8 = grpcTryUtf8(slice);
      const ascii = grpcBytesToAscii(slice);
      const hex =
        Array.from(slice.slice(0, 32))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" ") + (slice.length > 32 ? " ..." : "");
      const maybeNested = len > 0 && ascii.printable === false && utf8 === null;
      lines.push(
        `#${++idx} field=${fieldNumber} type=length-delimited length=${len.toString()}  bytes=${startPos}-${pos + numericLength}`,
      );
      if (utf8 !== null) {
        lines.push(
          '    UTF-8 : "' +
            utf8
              .replace(/\n/g, "\\n")
              .replace(/\r/g, "\\r")
              .replace(/\t/g, "\\t") +
            '"',
        );
      }
      lines.push('    ASCII: "' + ascii.text + '"');
      lines.push("    HEX  : " + hex);
      if (maybeNested) {
        lines.push("    [提示] 看起来像嵌套 message，可尝试递归解析");
      }
      pos += numericLength;
    } else if (wireType === 5) {
      if (pos + 4 > bytes.length) {
        lines.push(`#${++idx} field=${fieldNumber} type=fixed32  [截断]`);
        break;
      }
      const v =
        (bytes[pos] |
          (bytes[pos + 1] << 8) |
          (bytes[pos + 2] << 16) |
          (bytes[pos + 3] << 24)) >>>
        0;
      pos += 4;
      lines.push(
        `#${++idx} field=${fieldNumber} type=fixed32 value=${v} (0x${v.toString(16)})  bytes=${startPos}-${pos}`,
      );
    } else {
      lines.push(
        `#${++idx} field=${fieldNumber} wire_type=${wireType} (${GRPC_WIRE_TYPES[wireType] || "unknown"}) 无法解析，停止`,
      );
      break;
    }
  }
  if (pos < bytes.length) {
    lines.push(`--- (剩余 ${bytes.length - pos} 字节未解析)`);
  }
  return lines.join("\n");
}

function grpcRenderStatusTable() {
  const tbody = document.getElementById("grpcStatusTbody");
  if (!tbody) return;
  tbody.innerHTML = GRPC_STATUS_CODES.map(
    (c) => `<tr><td>${c.code}</td><td>${c.name}</td><td>${c.desc}</td></tr>`,
  ).join("");
}

function grpcInit() {
  if (
    document.getElementById("grpcMetaList") &&
    !document.querySelector("#grpcMetaList .api-kv-row")
  ) {
    grpcAddMeta("authorization", "Bearer xxx");
    grpcAddMeta("x-request-id", "");
  }
  grpcRenderStatusTable();
}

registerInit("grpc", grpcInit);

if (typeof module !== "undefined") {
  module.exports = {
    grpcReadVarint,
    grpcDecodeProtobuf,
    grpcBuildFrame,
    grpcBytesToBase64,
    grpcBuildCurlCommand,
    grpcEncodeJsonWithSchema,
  };
}
