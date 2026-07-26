const {
  formatGraphql,
  minifyGraphql,
  checkGraphqlBalance,
} = require("../../js/format/graphqlfmt.js");

// ============================================================
// formatGraphql
// ============================================================
describe("formatGraphql 基本", () => {
  test("空输入返回空", () => {
    expect(formatGraphql("")).toBe("");
    expect(formatGraphql("   ")).toBe("");
  });

  test("简单 query 缩进", () => {
    const out = formatGraphql("query{user{id name}}", { indent: "  " });
    expect(out).toBe("query {\n  user {\n    id\n    name\n  }\n}");
  });

  test("4 空格缩进", () => {
    const out = formatGraphql("query{user{id}}", { indent: "    " });
    expect(out).toBe("query {\n    user {\n        id\n    }\n}");
  });

  test("Tab 缩进", () => {
    const out = formatGraphql("query{user{id}}", { indent: "\t" });
    expect(out).toBe("query {\n\tuser {\n\t\tid\n\t}\n}");
  });

  test("mutation 格式化", () => {
    const src = "mutation Create($input:Input!){create(input:$input){id}}";
    const out = formatGraphql(src, { indent: "  " });
    expect(out).toContain("mutation Create($input: Input!) {");
    expect(out).toContain("create(input: $input) {");
    expect(out).toContain("id");
  });

  test("参数与冒号空格", () => {
    const out = formatGraphql("query($id:ID!){user(id:$id){name}}", {
      indent: "  ",
    });
    expect(out).toContain("$id: ID!");
    expect(out).toContain("user(id: $id)");
  });

  test("directive @include", () => {
    const src = "query($f:Boolean!){user{name@include(if:$f)}}";
    const out = formatGraphql(src, { indent: "  " });
    expect(out).toContain("@include(if: $f)");
  });

  test("fragment spread", () => {
    const src = "query{user{...UserFields}}";
    const out = formatGraphql(src, { indent: "  " });
    expect(out).toContain("...UserFields");
  });

  test("列表参数", () => {
    const src = "query{users(ids:[1,2,3]){id}}";
    const out = formatGraphql(src, { indent: "  " });
    expect(out).toContain("users(ids: [1, 2, 3])");
  });

  test("字符串字面量保留", () => {
    const src = 'query{user(name:"hello world"){id}}';
    const out = formatGraphql(src, { indent: "  " });
    expect(out).toContain('name: "hello world"');
  });

  test("注释保留", () => {
    const src = "query {\n  # get id\n  id\n}";
    const out = formatGraphql(src, { indent: "  " });
    expect(out).toContain("# get id");
    expect(out).toContain("id");
  });
});

// ============================================================
// minifyGraphql
// ============================================================
describe("minifyGraphql", () => {
  test("删除多余空白", () => {
    const src = "query  {\n  user  {\n    id\n    name\n  }\n}";
    const out = minifyGraphql(src);
    expect(out).toBe("query{user{id name}}");
  });

  test("删除注释", () => {
    const src = "query {\n  # cmt\n  id\n}";
    const out = minifyGraphql(src);
    expect(out).not.toContain("#");
    expect(out).toBe("query{id}");
  });

  test("保留字符串内空白", () => {
    const out = minifyGraphql('query{user(name:"a  b"){id}}');
    expect(out).toContain('"a  b"');
  });

  test("去掉可选逗号", () => {
    const out = minifyGraphql("query{users(ids:[1, 2, 3]){id}}");
    expect(out).toBe("query{users(ids:[1 2 3]){id}}");
  });

  test("空输入返回空", () => {
    expect(minifyGraphql("")).toBe("");
    expect(minifyGraphql("   \n")).toBe("");
  });

  test("变量与默认值", () => {
    const src = "query ($id: ID! = \"1\") { user(id: $id) { name } }";
    const out = minifyGraphql(src);
    expect(out).toContain("$id:ID!");
    expect(out).toContain('="1"');
    expect(out).toContain("user(id:$id)");
  });
});

// ============================================================
// checkGraphqlBalance
// ============================================================
describe("checkGraphqlBalance", () => {
  test("平衡时 ok", () => {
    const r = checkGraphqlBalance("query { user { id } }");
    expect(r.ok).toBe(true);
    expect(r.issues).toEqual([]);
  });

  test("缺闭合 }", () => {
    const r = checkGraphqlBalance("query { user { id }");
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.kind === "unmatched-open")).toBe(true);
  });

  test("多余闭合 }", () => {
    const r = checkGraphqlBalance("query { user { id } } }");
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.kind === "unmatched-close")).toBe(true);
  });

  test("括号类型不匹配", () => {
    const r = checkGraphqlBalance("query { user(id: 1] }");
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.kind === "mismatch")).toBe(true);
  });

  test("字符串内括号不计入", () => {
    const r = checkGraphqlBalance('query { user(name: "a{b}") { id } }');
    expect(r.ok).toBe(true);
  });

  test("未闭合引号", () => {
    const r = checkGraphqlBalance('query { user(name: "abc) { id } }');
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.kind === "unbalanced-quote")).toBe(true);
  });

  test("注释内括号不计入", () => {
    const r = checkGraphqlBalance("query {\n  # { not brace\n  id\n}");
    expect(r.ok).toBe(true);
  });

  test("圆括号与方括号", () => {
    const r = checkGraphqlBalance("query { users(ids: [1, 2]) { id } }");
    expect(r.ok).toBe(true);
  });
});

// ============================================================
// 往返：format → minify 语义保留
// ============================================================
describe("format / minify 往返", () => {
  test("格式化后再压缩得到稳定结构", () => {
    const src = "query GetUser($id:ID!){user(id:$id){id name posts{title}}}";
    const pretty = formatGraphql(src, { indent: "  " });
    const mini = minifyGraphql(pretty);
    expect(mini).toContain("query GetUser($id:ID!)");
    expect(mini).toContain("user(id:$id)");
    expect(mini).toContain("posts{title}");
    expect(checkGraphqlBalance(pretty).ok).toBe(true);
    expect(checkGraphqlBalance(mini).ok).toBe(true);
  });
});
