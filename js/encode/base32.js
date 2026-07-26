// Base32 (RFC 4648) / Base58 (Bitcoin) 编解码

const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const B32_LOOKUP = (function () {
  const map = Object.create(null);
  for (let i = 0; i < B32_ALPHABET.length; i++) {
    map[B32_ALPHABET[i]] = i;
    map[B32_ALPHABET[i].toLowerCase()] = i;
  }
  return map;
})();

const B58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const B58_LOOKUP = (function () {
  const map = Object.create(null);
  for (let i = 0; i < B58_ALPHABET.length; i++) {
    map[B58_ALPHABET[i]] = i;
  }
  return map;
})();

function base32ParseHex(hex) {
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

function base32BytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function base32TextToBytes(text) {
  return new TextEncoder().encode(String(text || ""));
}

function base32BytesToText(bytes) {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

/** Base32 编码（RFC 4648），padding 默认 true */
function base32Encode(bytes, options) {
  options = options || {};
  const padding = options.padding !== false;
  if (!bytes || !bytes.length) return "";
  let bits = 0;
  let value = 0;
  let output = "";
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      output += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += B32_ALPHABET[(value << (5 - bits)) & 31];
  }
  if (padding) {
    while (output.length % 8 !== 0) output += "=";
  }
  return output;
}

/** Base32 解码（RFC 4648），忽略空白，允许无 padding */
function base32Decode(str) {
  const cleaned = String(str || "")
    .replace(/\s+/g, "")
    .replace(/=+$/, "");
  if (!cleaned) return new Uint8Array(0);
  let bits = 0;
  let value = 0;
  const out = [];
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    const idx = B32_LOOKUP[ch];
    if (idx === undefined) {
      throw new Error("非法 Base32 字符: " + ch + "（仅允许 A-Z / 2-7 / =）");
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

/** Base58 编码（Bitcoin 字母表，含前导零 → '1'） */
function base58Encode(bytes) {
  if (!bytes || !bytes.length) return "";
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;

  const size = Math.ceil(((bytes.length - zeros) * 138) / 100) + 1;
  const b58 = new Uint8Array(size);
  let length = 0;

  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i];
    let j = 0;
    for (let k = size - 1; k >= 0; k--, j++) {
      if (carry === 0 && j >= length) break;
      carry += 256 * b58[k];
      b58[k] = carry % 58;
      carry = (carry / 58) | 0;
    }
    length = j;
  }

  let start = size - length;
  while (start < size && b58[start] === 0) start++;

  let result = "";
  for (let i = 0; i < zeros; i++) result += "1";
  for (let i = start; i < size; i++) result += B58_ALPHABET[b58[i]];
  return result;
}

/** Base58 解码（Bitcoin 字母表） */
function base58Decode(str) {
  const cleaned = String(str || "").replace(/\s+/g, "");
  if (!cleaned) return new Uint8Array(0);

  let zeros = 0;
  while (zeros < cleaned.length && cleaned[zeros] === "1") zeros++;

  const size = Math.ceil(((cleaned.length - zeros) * 733) / 1000) + 1;
  const b256 = new Uint8Array(size);
  let length = 0;

  for (let i = zeros; i < cleaned.length; i++) {
    const ch = cleaned[i];
    const idx = B58_LOOKUP[ch];
    if (idx === undefined) {
      throw new Error(
        "非法 Base58 字符: " + ch + "（Bitcoin 字母表，无 0/O/I/l）",
      );
    }
    let carry = idx;
    let j = 0;
    for (let k = size - 1; k >= 0; k--, j++) {
      if (carry === 0 && j >= length) break;
      carry += 58 * b256[k];
      b256[k] = carry % 256;
      carry = (carry / 256) | 0;
    }
    length = j;
  }

  let start = size - length;
  while (start < size && b256[start] === 0) start++;

  const out = new Uint8Array(zeros + (size - start));
  for (let i = 0; i < zeros; i++) out[i] = 0;
  let p = zeros;
  for (let i = start; i < size; i++) out[p++] = b256[i];
  return out;
}

function base32GetInputBytes() {
  const raw = document.getElementById("b32Input").value;
  if (!raw) throw new Error("请输入内容");
  const fmt = document.getElementById("b32InputFmt").value;
  if (fmt === "hex") return base32ParseHex(raw);
  return base32TextToBytes(raw);
}

function base32FormatOutput(bytes) {
  const fmt = document.getElementById("b32OutputFmt").value;
  if (fmt === "hex") return base32BytesToHex(bytes);
  return base32BytesToText(bytes);
}

function base32DoEncode() {
  const out = document.getElementById("b32Output");
  try {
    const bytes = base32GetInputBytes();
    const algo = document.getElementById("b32Algo").value;
    let result;
    if (algo === "base58") {
      result = base58Encode(bytes);
    } else {
      const padding = document.getElementById("b32Padding").checked;
      result = base32Encode(bytes, { padding: padding });
    }
    out.textContent = result;
    out.className = "output-box";
    setStatus("编码成功");
  } catch (e) {
    out.textContent = "编码失败: " + e.message;
    out.className = "output-box error";
    setStatus("编码失败");
  }
}

function base32DoDecode() {
  const out = document.getElementById("b32Output");
  const raw = document.getElementById("b32Input").value;
  if (!raw) {
    out.textContent = "请输入内容";
    out.className = "output-box error";
    return;
  }
  try {
    const algo = document.getElementById("b32Algo").value;
    const bytes =
      algo === "base58" ? base58Decode(raw) : base32Decode(raw);
    out.textContent = base32FormatOutput(bytes);
    out.className = "output-box";
    setStatus("解码成功");
  } catch (e) {
    out.textContent = "解码失败: " + e.message;
    out.className = "output-box error";
    setStatus("解码失败");
  }
}

function base32Clear() {
  document.getElementById("b32Input").value = "";
  const out = document.getElementById("b32Output");
  out.textContent = "";
  out.className = "output-box";
  setStatus("已清空");
}

function base32OnAlgoChange() {
  const algo = document.getElementById("b32Algo").value;
  const padLabel = document.getElementById("b32PaddingLabel");
  if (padLabel) padLabel.style.display = algo === "base32" ? "" : "none";
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    base32Encode,
    base32Decode,
    base58Encode,
    base58Decode,
    base32ParseHex,
    base32BytesToHex,
    base32TextToBytes,
    base32BytesToText,
  };
}
