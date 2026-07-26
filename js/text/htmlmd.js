// HTML ↔ Markdown 互转

const HTMLMD_SAMPLE_MD = `# Hello DevTools

这是一段 **Markdown** 演示，包含 *斜体*、\`行内代码\` 和 [链接](https://example.com)。

## 列表

- 无序列表项
- 另一项

1. 有序第一
2. 有序第二

## 代码

\`\`\`javascript
function greet(name) {
  return "Hello, " + name;
}
\`\`\`

> 引用：HTML 与 Markdown 可互相转换。

![示例图](https://example.com/a.png)
`;

const HTMLMD_SAMPLE_HTML = `<h1>Hello DevTools</h1>
<p>这是一段 <strong>HTML</strong> 演示，包含 <em>斜体</em>、<code>行内代码</code> 和 <a href="https://example.com">链接</a>。</p>
<h2>列表</h2>
<ul>
<li>无序列表项</li>
<li>另一项</li>
</ul>
<ol>
<li>有序第一</li>
<li>有序第二</li>
</ol>
<pre><code class="language-javascript">function greet(name) {
  return "Hello, " + name;
}
</code></pre>
<blockquote>
<p>引用：HTML 与 Markdown 可互相转换。</p>
</blockquote>
<p><img src="https://example.com/a.png" alt="示例图"></p>
`;

const _HTMLMD_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function htmlmdDecodeEntities(s) {
  if (!s) return "";
  return String(s)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => {
      const n = parseInt(h, 16);
      return Number.isFinite(n) ? String.fromCodePoint(n) : _;
    })
    .replace(/&#(\d+);/g, (_, d) => {
      const n = parseInt(d, 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : _;
    })
    .replace(/&([a-zA-Z]+);/g, (m, name) =>
      Object.prototype.hasOwnProperty.call(_HTMLMD_ENTITIES, name)
        ? _HTMLMD_ENTITIES[name]
        : m,
    );
}

function htmlmdEscapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlmdAttr(tag, name) {
  const re = new RegExp(
    "\\b" + name + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))",
    "i",
  );
  const m = String(tag).match(re);
  if (!m) return "";
  return htmlmdDecodeEntities(m[1] != null ? m[1] : m[2] != null ? m[2] : m[3]);
}

function htmlmdSimpleMdToHtml(md) {
  let s = String(md || "").replace(/\r\n?/g, "\n");
  const fences = [];
  s = s.replace(/```([^\n`]*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const i = fences.length;
    fences.push(
      "<pre><code" +
        (lang.trim()
          ? ' class="language-' + htmlmdEscapeHtml(lang.trim()) + '"'
          : "") +
        ">" +
        htmlmdEscapeHtml(code.replace(/\n$/, "")) +
        "</code></pre>",
    );
    return "\n%%FENCE" + i + "%%\n";
  });

  const lines = s.split("\n");
  const out = [];
  let i = 0;
  let inUl = false;
  let inOl = false;
  let inBq = false;

  function closeLists() {
    if (inUl) {
      out.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      out.push("</ol>");
      inOl = false;
    }
  }

  function closeBq() {
    if (inBq) {
      out.push("</blockquote>");
      inBq = false;
    }
  }

  function inline(t) {
    let x = htmlmdEscapeHtml(t);
    x = x.replace(
      /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
      '<img src="$2" alt="$1">',
    );
    x = x.replace(
      /\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
      '<a href="$2">$1</a>',
    );
    x = x.replace(/`([^`]+)`/g, "<code>$1</code>");
    x = x.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    x = x.replace(/__([^_]+)__/g, "<strong>$1</strong>");
    x = x.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    x = x.replace(/_([^_]+)_/g, "<em>$1</em>");
    return x;
  }

  while (i < lines.length) {
    const line = lines[i];
    const fenceM = line.match(/^%%FENCE(\d+)%%$/);
    if (fenceM) {
      closeLists();
      closeBq();
      out.push(fences[Number(fenceM[1])]);
      i++;
      continue;
    }

    const hm = line.match(/^(#{1,6})\s+(.*)$/);
    if (hm) {
      closeLists();
      closeBq();
      const lv = hm[1].length;
      out.push("<h" + lv + ">" + inline(hm[2].trim()) + "</h" + lv + ">");
      i++;
      continue;
    }

    const bq = line.match(/^>\s?(.*)$/);
    if (bq) {
      closeLists();
      if (!inBq) {
        out.push("<blockquote>");
        inBq = true;
      }
      out.push("<p>" + inline(bq[1]) + "</p>");
      i++;
      continue;
    } else {
      closeBq();
    }

    const ul = line.match(/^[-*+]\s+(.*)$/);
    if (ul) {
      if (inOl) {
        out.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        out.push("<ul>");
        inUl = true;
      }
      out.push("<li>" + inline(ul[1]) + "</li>");
      i++;
      continue;
    }

    const ol = line.match(/^\d+\.\s+(.*)$/);
    if (ol) {
      if (inUl) {
        out.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        out.push("<ol>");
        inOl = true;
      }
      out.push("<li>" + inline(ol[1]) + "</li>");
      i++;
      continue;
    }

    closeLists();

    if (!line.trim()) {
      i++;
      continue;
    }

    out.push("<p>" + inline(line) + "</p>");
    i++;
  }
  closeLists();
  closeBq();
  return out.join("\n");
}

function markdownToHtml(md) {
  const input = md == null ? "" : String(md);
  if (typeof marked !== "undefined" && typeof marked.parse === "function") {
    return marked.parse(input, { gfm: true, breaks: false });
  }
  return htmlmdSimpleMdToHtml(input);
}

function htmlmdInlineToMd(html) {
  let s = String(html || "");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<(strong|b)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi, (_, _t, t) => {
    return "**" + htmlmdInlineToMd(t) + "**";
  });
  s = s.replace(/<(em|i)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi, (_, _t, t) => {
    return "*" + htmlmdInlineToMd(t) + "*";
  });
  s = s.replace(/<code(?:\s[^>]*)?>([\s\S]*?)<\/code>/gi, (_, t) => {
    return "`" + htmlmdDecodeEntities(t.replace(/<[^>]+>/g, "")) + "`";
  });
  s = s.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (m, attrs, text) => {
    const href = htmlmdAttr(attrs, "href");
    const label = htmlmdInlineToMd(text).trim() || href;
    if (!href) return label;
    return "[" + label + "](" + href + ")";
  });
  s = s.replace(/<img\b([^>]*)\/?>/gi, (m, attrs) => {
    const src = htmlmdAttr(attrs, "src");
    const alt = htmlmdAttr(attrs, "alt");
    if (!src) return alt || "";
    return "![" + alt + "](" + src + ")";
  });
  s = s.replace(/<\/?[a-zA-Z][a-zA-Z0-9]*\b[^>]*>/g, "");
  // 实体延迟到 htmlToMarkdown 末尾统一解码，避免 &lt;c&gt; 变成 <c> 后再被当标签剥掉
  return s;
}

function htmlmdListItems(inner, ordered) {
  const items = [];
  const re = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
  let m;
  while ((m = re.exec(inner)) !== null) {
    items.push(htmlmdInlineToMd(m[1]).trim().replace(/\n+/g, " "));
  }
  if (!items.length) return "";
  return items
    .map((t, idx) => (ordered ? idx + 1 + ". " : "- ") + t)
    .join("\n");
}

function htmlToMarkdown(html) {
  let s = String(html == null ? "" : html).replace(/\r\n?/g, "\n");
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, "");

  // pre/code blocks
  s = s.replace(
    /<pre\b[^>]*>\s*<code\b([^>]*)>([\s\S]*?)<\/code>\s*<\/pre>/gi,
    (_, attrs, code) => {
      const cls = htmlmdAttr(attrs, "class");
      let lang = "";
      const lm = cls.match(/(?:^|\s)language-([a-zA-Z0-9_+-]+)/);
      if (lm) lang = lm[1];
      const body = htmlmdDecodeEntities(code.replace(/<[^>]+>/g, "")).replace(
        /\n$/,
        "",
      );
      return "\n\n```" + lang + "\n" + body + "\n```\n\n";
    },
  );
  s = s.replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (_, code) => {
    const body = htmlmdDecodeEntities(code.replace(/<[^>]+>/g, "")).replace(
      /\n$/,
      "",
    );
    return "\n\n```\n" + body + "\n```\n\n";
  });

  // headings h1-h6
  for (let lv = 6; lv >= 1; lv--) {
    const re = new RegExp(
      "<h" + lv + "\\b[^>]*>([\\s\\S]*?)<\\/h" + lv + ">",
      "gi",
    );
    s = s.replace(re, (_, t) => {
      return "\n\n" + "#".repeat(lv) + " " + htmlmdInlineToMd(t).trim() + "\n\n";
    });
  }

  // blockquote (single-level subset)
  s = s.replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner) => {
    const md = htmlToMarkdown(inner)
      .trim()
      .split("\n")
      .map((line) => (line ? "> " + line : ">"))
      .join("\n");
    return "\n\n" + md + "\n\n";
  });

  // lists
  s = s.replace(/<ul\b[^>]*>([\s\S]*?)<\/ul>/gi, (_, inner) => {
    return "\n\n" + htmlmdListItems(inner, false) + "\n\n";
  });
  s = s.replace(/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi, (_, inner) => {
    return "\n\n" + htmlmdListItems(inner, true) + "\n\n";
  });

  // paragraphs
  s = s.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (_, t) => {
    return "\n\n" + htmlmdInlineToMd(t).trim() + "\n\n";
  });

  // remaining br / block-ish closers
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<\/(div|section|article|header|footer|main|tr)>/gi, "\n");
  s = s.replace(/<(hr)\b[^>]*\/?>/gi, "\n\n---\n\n");

  // leftover tags → inline pass then strip
  s = htmlmdInlineToMd(s);
  s = htmlmdDecodeEntities(s);

  // normalize whitespace
  s = s.replace(/[ \t]+\n/g, "\n");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

function htmlmdGetDir() {
  const el = document.getElementById("htmlmdDir");
  return el ? el.value : "md2html";
}

function htmlmdUpdateLabels() {
  const dir = htmlmdGetDir();
  const inLabel = document.getElementById("htmlmdInputLabel");
  const outLabel = document.getElementById("htmlmdOutputLabel");
  if (dir === "html2md") {
    if (inLabel) inLabel.textContent = "HTML 输入";
    if (outLabel) outLabel.textContent = "Markdown 输出";
  } else {
    if (inLabel) inLabel.textContent = "Markdown 输入";
    if (outLabel) outLabel.textContent = "HTML 输出";
  }
}

function htmlmdUpdatePreview(result, dir) {
  const wrap = document.getElementById("htmlmdPreviewWrap");
  const preview = document.getElementById("htmlmdPreview");
  const show = document.getElementById("htmlmdShowPreview");
  if (!wrap || !preview || !show) return;
  if (!show.checked || !result) {
    wrap.style.display = "none";
    preview.innerHTML = "";
    return;
  }
  wrap.style.display = "";
  try {
    if (dir === "md2html") {
      preview.innerHTML = result;
    } else {
      preview.innerHTML = markdownToHtml(result);
    }
  } catch (e) {
    preview.textContent = "预览失败: " + e.message;
  }
}

function htmlmdConvert() {
  const inputEl = document.getElementById("htmlmdInput");
  const out = document.getElementById("htmlmdOutput");
  if (!inputEl || !out) return;
  const raw = inputEl.value;
  const dir = htmlmdGetDir();
  if (!raw.trim()) {
    out.textContent = "请输入内容";
    out.className = "output-box error";
    htmlmdUpdatePreview("", dir);
    return;
  }
  try {
    let result;
    if (dir === "html2md") {
      result = htmlToMarkdown(raw);
    } else {
      result = markdownToHtml(raw);
    }
    out.textContent = result;
    out.className = "output-box";
    htmlmdUpdatePreview(result, dir);
    setStatus(
      dir === "html2md" ? "HTML → Markdown 完成" : "Markdown → HTML 完成",
    );
  } catch (e) {
    out.textContent = "转换失败: " + e.message;
    out.className = "output-box error";
    htmlmdUpdatePreview("", dir);
  }
}

function htmlmdCopy() {
  const out = document.getElementById("htmlmdOutput");
  const text = out ? out.textContent : "";
  if (!text || text === "请输入内容" || text.indexOf("转换失败:") === 0) {
    toast("暂无内容可复制");
    return;
  }
  safeCopy(text, "已复制");
}

function htmlmdClear() {
  const inputEl = document.getElementById("htmlmdInput");
  const out = document.getElementById("htmlmdOutput");
  if (inputEl) inputEl.value = "";
  if (out) {
    out.textContent = "";
    out.className = "output-box";
  }
  htmlmdUpdatePreview("", htmlmdGetDir());
  setStatus("已清空");
}

function htmlmdLoadSample() {
  const inputEl = document.getElementById("htmlmdInput");
  if (!inputEl) return;
  const dir = htmlmdGetDir();
  inputEl.value = dir === "html2md" ? HTMLMD_SAMPLE_HTML : HTMLMD_SAMPLE_MD;
  htmlmdConvert();
  setStatus("已加载示例");
}

let htmlmdInited = false;

function htmlmdInit() {
  if (htmlmdInited) return;
  const dirEl = document.getElementById("htmlmdDir");
  const previewEl = document.getElementById("htmlmdShowPreview");
  if (dirEl) {
    dirEl.addEventListener("change", () => {
      htmlmdUpdateLabels();
      const out = document.getElementById("htmlmdOutput");
      if (out) {
        out.textContent = "";
        out.className = "output-box";
      }
      htmlmdUpdatePreview("", htmlmdGetDir());
    });
  }
  if (previewEl) {
    previewEl.addEventListener("change", () => {
      const out = document.getElementById("htmlmdOutput");
      const text = out ? out.textContent : "";
      if (
        text &&
        text !== "请输入内容" &&
        text.indexOf("转换失败:") !== 0
      ) {
        htmlmdUpdatePreview(text, htmlmdGetDir());
      } else {
        htmlmdUpdatePreview("", htmlmdGetDir());
      }
    });
  }
  htmlmdUpdateLabels();
  htmlmdInited = true;
}

registerInit("htmlmd", htmlmdInit);

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    markdownToHtml,
    htmlToMarkdown,
    htmlmdSimpleMdToHtml,
    htmlmdDecodeEntities,
  };
}
