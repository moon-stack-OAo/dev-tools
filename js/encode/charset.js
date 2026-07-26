// 字符编码工具（诚实能力说明）
// - 字节 → 文本：用 TextDecoder 按指定编码解码 Hex/Base64 字节（GBK 等依赖浏览器支持）
// - 文本 → 字节：仅 UTF-8（TextEncoder 只支持 UTF-8），输出 Hex / Base64
// - 多编码对照：同一份字节用多种编码解码，便于乱码还原 / 误读分析
// 注意：不是任意字符集互转；非 UTF-8 无法在本工具中「编码为字节」

const CHARSET_ENCODINGS = [
  { value: "utf-8", label: "UTF-8" },
  { value: "gbk", label: "GBK" },
  { value: "gb18030", label: "GB18030" },
  { value: "gb2312", label: "GB2312" },
  { value: "big5", label: "Big5" },
  { value: "shift_jis", label: "Shift_JIS" },
  { value: "euc-jp", label: "EUC-JP" },
  { value: "euc-kr", label: "EUC-KR" },
  { value: "iso-8859-1", label: "ISO-8859-1" },
  { value: "windows-1252", label: "Windows-1252" },
];

function charsetBytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function charsetBytesToBase64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function charsetParseHex(hex) {
  const cleaned = String(hex || "")
    .replace(/0x/gi, "")
    .replace(/[\s,;:_-]/g, "");
  if (!cleaned) throw new Error("Hex 为空");
  if (!/^[0-9a-fA-F]+$/.test(cleaned) || cleaned.length % 2 !== 0) {
    throw new Error("非法 Hex（需偶数位 0-9a-fA-F，可含空格/0x）");
  }
  const pairs = cleaned.match(/.{1,2}/g) || [];
  return new Uint8Array(pairs.map((h) => parseInt(h, 16)));
}

function charsetParseBase64(b64) {
  const cleaned = String(b64 || "")
    .replace(/\s+/g, "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  if (!cleaned) throw new Error("Base64 为空");
  try {
    const bin = atob(cleaned);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch (e) {
    throw new Error("非法 Base64");
  }
}

function charsetGetInputBytes() {
  const raw = document.getElementById("charsetInput").value;
  const fmt = document.getElementById("charsetInputFmt").value;
  if (!raw || !String(raw).trim()) throw new Error("请先输入内容");
  if (fmt === "hex") return charsetParseHex(raw);
  if (fmt === "base64") return charsetParseBase64(raw);
  // text：按 UTF-8 编码为字节（仅此方向可靠）
  return new TextEncoder().encode(raw);
}

function charsetDecodeBytes(bytes, encoding, fatal) {
  return new TextDecoder(encoding, { fatal: !!fatal }).decode(bytes);
}

function charsetIsEncodingSupported(encoding) {
  try {
    // 空字节探测：不支持的标签会在构造时抛错
    new TextDecoder(encoding);
    return true;
  } catch (e) {
    return false;
  }
}

/** 字节 → 文本（指定编码解码） */
function charsetDecode() {
  const out = document.getElementById("charsetOutput");
  try {
    const enc = document.getElementById("charsetEnc").value;
    if (!charsetIsEncodingSupported(enc)) {
      throw new Error("当前浏览器不支持编码：" + enc);
    }
    const bytes = charsetGetInputBytes();
    const text = charsetDecodeBytes(bytes, enc, false);
    out.textContent = text;
    out.className = "output-box";
    setStatus(
      "已按 " + enc + " 解码 " + bytes.length + " 字节 → 文本（" + text.length + " 字符）",
    );
  } catch (e) {
    out.textContent = "解码失败: " + e.message;
    out.className = "output-box error";
  }
}

/** 文本 → UTF-8 字节（Hex / Base64） */
function charsetEncodeUtf8() {
  const out = document.getElementById("charsetOutput");
  const outFmt = document.getElementById("charsetOutFmt").value;
  try {
    const inputFmt = document.getElementById("charsetInputFmt").value;
    let text;
    if (inputFmt === "text") {
      text = document.getElementById("charsetInput").value;
      if (!text) throw new Error("请先输入文本");
    } else {
      // 先按当前源编码把字节解成文本，再编码为 UTF-8（便于「乱码字节 → 正确文本 → UTF-8」）
      const enc = document.getElementById("charsetEnc").value;
      const bytes = charsetGetInputBytes();
      text = charsetDecodeBytes(bytes, enc, false);
    }
    const utf8 = new TextEncoder().encode(text);
    out.textContent =
      outFmt === "base64" ? charsetBytesToBase64(utf8) : charsetBytesToHex(utf8);
    out.className = "output-box";
    setStatus(
      "已输出 UTF-8 " +
        (outFmt === "base64" ? "Base64" : "Hex") +
        "（" +
        utf8.length +
        " 字节）",
    );
  } catch (e) {
    out.textContent = "编码失败: " + e.message;
    out.className = "output-box error";
  }
}

/** 多编码对照：同一份字节用多种编码解码 */
function charsetCompare() {
  const out = document.getElementById("charsetOutput");
  try {
    const bytes = charsetGetInputBytes();
    const lines = [];
    lines.push(
      "输入字节: " +
        bytes.length +
        " B | Hex: " +
        charsetBytesToHex(bytes).slice(0, 64) +
        (bytes.length > 32 ? "…" : ""),
    );
    lines.push("—— 多编码解码对照（便于乱码还原）——");
    for (const item of CHARSET_ENCODINGS) {
      if (!charsetIsEncodingSupported(item.value)) {
        lines.push(item.label.padEnd(14) + "  [浏览器不支持]");
        continue;
      }
      try {
        const text = charsetDecodeBytes(bytes, item.value, false);
        // 简单可读性提示：替换字符过多时标注
        const bad = (text.match(/\uFFFD/g) || []).length;
        const preview = text.length > 120 ? text.slice(0, 120) + "…" : text;
        const flag = bad > 0 ? "  [含" + bad + "个替换符U+FFFD]" : "";
        lines.push(item.label.padEnd(14) + "  " + preview + flag);
      } catch (e) {
        lines.push(item.label.padEnd(14) + "  [解码失败: " + e.message + "]");
      }
    }
    lines.push("");
    lines.push(
      "说明：本工具不能把文本编码为 GBK 等非 UTF-8 字节；编码输出仅支持 UTF-8。",
    );
    out.textContent = lines.join("\n");
    out.className = "output-box";
    setStatus("多编码对照完成");
  } catch (e) {
    out.textContent = "对照失败: " + e.message;
    out.className = "output-box error";
  }
}

function charsetClear() {
  document.getElementById("charsetInput").value = "";
  const out = document.getElementById("charsetOutput");
  out.textContent = "";
  out.className = "output-box";
  setStatus("已清空");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CHARSET_ENCODINGS,
    charsetBytesToHex,
    charsetBytesToBase64,
    charsetParseHex,
    charsetParseBase64,
    charsetDecodeBytes,
    charsetIsEncodingSupported,
  };
}
