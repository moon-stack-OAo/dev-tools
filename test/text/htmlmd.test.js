const {
  markdownToHtml,
  htmlToMarkdown,
  htmlmdSimpleMdToHtml,
  htmlmdDecodeEntities,
} = require("../../js/text/htmlmd.js");

// 测试中注入 marked（与浏览器 toolLibs 行为一致）
const marked = require("marked");
global.marked = marked;

describe("htmlmdDecodeEntities", () => {
  test("命名实体", () => {
    expect(htmlmdDecodeEntities("&amp;&lt;&gt;&quot;&apos;&nbsp;")).toBe(
      "&<>\"' ",
    );
  });
  test("数字实体", () => {
    expect(htmlmdDecodeEntities("&#65;&#x41;")).toBe("AA");
  });
});

describe("markdownToHtml (marked)", () => {
  test("标题与段落", () => {
    const html = markdownToHtml("# Title\n\nHello");
    expect(html).toContain("<h1");
    expect(html).toContain("Title");
    expect(html).toContain("Hello");
  });

  test("加粗斜体与行内代码", () => {
    const html = markdownToHtml("**bold** *em* `code`");
    expect(html).toMatch(/<strong>bold<\/strong>/);
    expect(html).toMatch(/<em>em<\/em>/);
    expect(html).toMatch(/<code>code<\/code>/);
  });

  test("链接与图片", () => {
    const html = markdownToHtml(
      "[a](https://ex.com) ![alt](https://ex.com/i.png)",
    );
    expect(html).toContain('href="https://ex.com"');
    expect(html).toContain('src="https://ex.com/i.png"');
    expect(html).toContain('alt="alt"');
  });

  test("列表", () => {
    const html = markdownToHtml("- a\n- b\n\n1. x\n2. y");
    expect(html).toContain("<ul>");
    expect(html).toContain("<ol>");
    expect(html).toContain("<li>");
  });

  test("代码块与引用", () => {
    const html = markdownToHtml("```js\nconst a = 1;\n```\n\n> quote");
    expect(html).toContain("<pre>");
    expect(html).toContain("<code");
    expect(html).toContain("<blockquote>");
  });
});

describe("htmlmdSimpleMdToHtml (fallback)", () => {
  test("基础转换", () => {
    const html = htmlmdSimpleMdToHtml("# H\n\n**b** *i* `c`");
    expect(html).toContain("<h1>H</h1>");
    expect(html).toContain("<strong>b</strong>");
    expect(html).toContain("<em>i</em>");
    expect(html).toContain("<code>c</code>");
  });

  test("列表与代码块", () => {
    const html = htmlmdSimpleMdToHtml("- a\n\n```\ncode\n```");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>a</li>");
    expect(html).toContain("<pre><code>");
    expect(html).toContain("code");
  });
});

describe("htmlToMarkdown", () => {
  test("标题 h1-h6", () => {
    expect(htmlToMarkdown("<h1>A</h1>")).toBe("# A");
    expect(htmlToMarkdown("<h2>B</h2>")).toBe("## B");
    expect(htmlToMarkdown("<h3>C</h3>")).toBe("### C");
    expect(htmlToMarkdown("<h6>F</h6>")).toBe("###### F");
  });

  test("段落与换行", () => {
    expect(htmlToMarkdown("<p>hello</p>")).toBe("hello");
    expect(htmlToMarkdown("<p>a<br>b</p>").replace(/\r/g, "")).toContain("a");
    expect(htmlToMarkdown("<p>a<br>b</p>")).toMatch(/a\s*\n\s*b/);
  });

  test("strong/em 与 code", () => {
    const md = htmlToMarkdown(
      "<p><strong>b</strong> <em>i</em> <code>c</code></p>",
    );
    expect(md).toContain("**b**");
    expect(md).toContain("*i*");
    expect(md).toContain("`c`");
  });

  test("链接与图片", () => {
    const md = htmlToMarkdown(
      '<p><a href="https://ex.com">link</a> <img src="https://ex.com/a.png" alt="pic"></p>',
    );
    expect(md).toContain("[link](https://ex.com)");
    expect(md).toContain("![pic](https://ex.com/a.png)");
  });

  test("ul/ol 列表", () => {
    const ul = htmlToMarkdown("<ul><li>a</li><li>b</li></ul>");
    expect(ul).toContain("- a");
    expect(ul).toContain("- b");
    const ol = htmlToMarkdown("<ol><li>x</li><li>y</li></ol>");
    expect(ol).toContain("1. x");
    expect(ol).toContain("2. y");
  });

  test("pre/code 与 blockquote", () => {
    const pre = htmlToMarkdown(
      '<pre><code class="language-js">const a = 1;\n</code></pre>',
    );
    expect(pre).toContain("```js");
    expect(pre).toContain("const a = 1;");
    const bq = htmlToMarkdown("<blockquote><p>quote</p></blockquote>");
    expect(bq).toMatch(/>\s*quote/);
  });

  test("实体解码", () => {
    expect(htmlToMarkdown("<p>a &amp; b &lt;c&gt;</p>")).toBe("a & b <c>");
  });

  test("HTML→MD→HTML 往返保留标题", () => {
    const md = htmlToMarkdown("<h1>Title</h1><p><strong>bold</strong></p>");
    expect(md).toContain("# Title");
    expect(md).toContain("**bold**");
    const html = markdownToHtml(md);
    expect(html).toContain("<h1");
    expect(html).toContain("Title");
    expect(html).toMatch(/<strong>bold<\/strong>/);
  });
});
