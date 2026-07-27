function xmlFormat() {
  const raw = document.getElementById("xmlInput").value;
  const out = document.getElementById("xmlOutput");
  if (!raw.trim()) {
    out.textContent = "请输入 XML";
    out.className = "output-box error";
    return;
  }
  try {
    const formatted = formatXml(raw);
    out.textContent = formatted;
    out.className = "output-box";
    setStatus("XML 格式化成功");
  } catch (e) {
    out.textContent = "XML 错误: " + e.message;
    out.className = "output-box error";
  }
}

/** 解析并校验 XML，返回规范化序列化字符串 */
function xmlParseAndSerialize(raw) {
  if (typeof DOMParser === "undefined") {
    // Node 测试环境：仅做字符串美化，不走 DOM
    return String(raw).trim();
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, "text/xml");
  const errors = doc.getElementsByTagName("parsererror");
  if (errors.length) {
    throw new Error((errors[0].textContent || "解析失败").trim());
  }
  return new XMLSerializer().serializeToString(doc);
}

/**
 * XML 美化缩进
 * @param {string} raw 原始 XML
 * @param {number} [indentSize=2] 缩进空格数
 */
function formatXml(raw, indentSize) {
  const serialized = xmlParseAndSerialize(raw);
  return formatXmlStr(serialized, indentSize);
}

/**
 * 纯字符串缩进（不解析 DOM）
 * 正确处理：开闭同行、自闭合、声明、注释、命名空间标签
 */
function formatXmlStr(xml, indentSize) {
  const size = indentSize == null || indentSize < 0 ? 2 : indentSize;
  const padUnit = " ".repeat(size);
  const normalized = String(xml)
    .replace(/\r\n|\r/g, "\n")
    .replace(/>\s*</g, ">\n<")
    .trim();
  if (!normalized) return "";

  const lines = normalized.split("\n");
  let depth = 0;
  const out = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const isClosing = /^<\//.test(line);
    const isDeclOrSpecial =
      /^<\?/.test(line) ||
      /^<!DOCTYPE/i.test(line) ||
      /^<!--/.test(line) ||
      /^<!\[CDATA\[/i.test(line);
    const isSelfClosing = /\/>\s*$/.test(line);
    // <tag>text</tag> 或 <tag attr="x">text</tag> 开闭在同一行
    const isOpenAndClose =
      /^<[^!?/][^>]*>[\s\S]*<\/[^>]+>\s*$/.test(line) && !isSelfClosing;

    if (isClosing) {
      depth = Math.max(0, depth - 1);
    }

    out.push(padUnit.repeat(depth) + line);

    // 仅「单独的开始标签」加深缩进
    if (
      !isClosing &&
      !isSelfClosing &&
      !isDeclOrSpecial &&
      !isOpenAndClose &&
      /^</.test(line)
    ) {
      depth++;
    }
  }

  return out.join("\n");
}

function xmlCompress() {
  const raw = document.getElementById("xmlInput").value;
  const out = document.getElementById("xmlOutput");
  if (!raw.trim()) {
    out.textContent = "请输入 XML";
    out.className = "output-box error";
    return;
  }
  try {
    // 先校验，再压缩（避免把无效 XML 糊成一行）
    const serialized = xmlParseAndSerialize(raw);
    out.textContent = compressXmlStr(serialized);
    out.className = "output-box";
    setStatus("XML 压缩成功");
  } catch (e) {
    out.textContent = "XML 错误: " + e.message;
    out.className = "output-box error";
  }
}

function compressXmlStr(xml) {
  return String(xml)
    .replace(/\r\n|\r|\n/g, " ")
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function xmlValidate() {
  const raw = document.getElementById("xmlInput").value;
  const out = document.getElementById("xmlOutput");
  if (!raw.trim()) {
    out.textContent = "请输入 XML";
    out.className = "output-box error";
    return;
  }
  try {
    xmlParseAndSerialize(raw);
    out.textContent = "✓ 有效的 XML";
    out.className = "output-box";
    setStatus("XML 有效");
  } catch (e) {
    out.textContent = "✗ 无效的 XML: " + e.message;
    out.className = "output-box error";
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    formatXmlStr,
    compressXmlStr,
    formatXml,
  };
}
