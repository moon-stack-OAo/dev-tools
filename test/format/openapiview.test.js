const {
  parseOpenApiDoc,
  summarizeOpenApi,
  OAV_SAMPLE,
} = require("../../js/format/openapiview.js");

// 测试环境注入 js-yaml（与浏览器 toolLibs 行为一致）
const jsyaml = require("js-yaml");
global.jsyaml = jsyaml;

const OAS3_JSON = {
  openapi: "3.0.3",
  info: { title: "Demo API", version: "2.1.0", description: "demo desc" },
  servers: [{ url: "https://api.demo.com", description: "prod" }],
  paths: {
    "/users": {
      get: {
        summary: "List users",
        operationId: "listUsers",
        parameters: [
          {
            name: "page",
            in: "query",
            required: false,
            schema: { type: "integer" },
          },
        ],
        responses: {
          "200": { description: "ok", content: { "application/json": {} } },
        },
      },
      post: {
        summary: "Create user",
        responses: { "201": { description: "created" } },
      },
    },
    "/users/{id}": {
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      get: {
        summary: "Get user",
        responses: { "200": { description: "ok" }, "404": { description: "not found" } },
      },
    },
  },
};

const SWAGGER2_JSON = {
  swagger: "2.0",
  info: { title: "Swagger Demo", version: "1.0.0" },
  host: "petstore.swagger.io",
  basePath: "/v2",
  schemes: ["https", "http"],
  paths: {
    "/pet": {
      get: {
        summary: "Find pets",
        parameters: [
          { name: "status", in: "query", type: "string", required: false },
        ],
        responses: { "200": { description: "success" } },
      },
    },
  },
};

describe("parseOpenApiDoc", () => {
  test("空输入抛错", () => {
    expect(() => parseOpenApiDoc("")).toThrow(/请输入/);
    expect(() => parseOpenApiDoc("   ")).toThrow(/请输入/);
  });

  test("非法 JSON 友好报错", () => {
    expect(() => parseOpenApiDoc("{not json")).toThrow(/JSON 解析失败/);
  });

  test("非法 YAML 友好报错", () => {
    expect(() => parseOpenApiDoc(":\n  - bad: [")).toThrow(/YAML 解析失败/);
  });

  test("非 OpenAPI 文档报错", () => {
    expect(() => parseOpenApiDoc('{"foo":1}')).toThrow(/未识别/);
  });

  test("解析 OpenAPI 3 JSON", () => {
    const r = parseOpenApiDoc(JSON.stringify(OAS3_JSON));
    expect(r.format).toBe("json");
    expect(r.isOas3).toBe(true);
    expect(r.doc.info.title).toBe("Demo API");
  });

  test("解析 OpenAPI 3 YAML（示例）", () => {
    const r = parseOpenApiDoc(OAV_SAMPLE);
    expect(r.format).toBe("yaml");
    expect(r.isOas3).toBe(true);
    expect(r.doc.info.title).toBe("Petstore Sample");
  });

  test("解析 Swagger 2 JSON", () => {
    const r = parseOpenApiDoc(JSON.stringify(SWAGGER2_JSON));
    expect(r.isSwagger2).toBe(true);
    expect(r.doc.swagger).toBe("2.0");
  });
});

describe("summarizeOpenApi", () => {
  test("OpenAPI 3 摘要与统计", () => {
    const sum = summarizeOpenApi(OAS3_JSON);
    expect(sum.title).toBe("Demo API");
    expect(sum.version).toBe("2.1.0");
    expect(sum.specVersion).toBe("OpenAPI 3.0.3");
    expect(sum.pathCount).toBe(2);
    expect(sum.methodCount).toBe(3);
    expect(sum.servers).toEqual([
      { url: "https://api.demo.com", description: "prod" },
    ]);
  });

  test("operations 包含 method/path/summary", () => {
    const sum = summarizeOpenApi(OAS3_JSON);
    const getUsers = sum.operations.find(
      (o) => o.method === "GET" && o.path === "/users",
    );
    expect(getUsers).toBeTruthy();
    expect(getUsers.summary).toBe("List users");
    expect(getUsers.operationId).toBe("listUsers");
    expect(getUsers.parameters.some((p) => p.name === "page")).toBe(true);
    expect(getUsers.responses.some((r) => r.status === "200")).toBe(true);
  });

  test("path 级 parameters 合并到 operation", () => {
    const sum = summarizeOpenApi(OAS3_JSON);
    const getById = sum.operations.find(
      (o) => o.method === "GET" && o.path === "/users/{id}",
    );
    expect(getById.parameters.some((p) => p.name === "id" && p.in === "path")).toBe(
      true,
    );
    expect(getById.responses.length).toBe(2);
  });

  test("Swagger 2 servers 由 host/basePath/schemes 组装", () => {
    const sum = summarizeOpenApi(SWAGGER2_JSON);
    expect(sum.title).toBe("Swagger Demo");
    expect(sum.specVersion).toBe("Swagger 2.0");
    expect(sum.pathCount).toBe(1);
    expect(sum.methodCount).toBe(1);
    expect(sum.servers.map((s) => s.url)).toEqual([
      "https://petstore.swagger.io/v2",
      "http://petstore.swagger.io/v2",
    ]);
  });

  test("Swagger 2 parameters type 字段", () => {
    const sum = summarizeOpenApi(SWAGGER2_JSON);
    const op = sum.operations[0];
    expect(op.parameters[0]).toMatchObject({
      name: "status",
      in: "query",
      type: "string",
    });
  });

  test("无 paths 时计数为 0", () => {
    const sum = summarizeOpenApi({
      openapi: "3.0.0",
      info: { title: "Empty", version: "0.0.1" },
    });
    expect(sum.pathCount).toBe(0);
    expect(sum.methodCount).toBe(0);
    expect(sum.operations).toEqual([]);
  });

  test("内置示例可完整摘要", () => {
    const { doc } = parseOpenApiDoc(OAV_SAMPLE);
    const sum = summarizeOpenApi(doc);
    expect(sum.title).toBe("Petstore Sample");
    expect(sum.pathCount).toBe(2);
    expect(sum.methodCount).toBe(4);
    expect(sum.servers.length).toBe(2);
    const del = sum.operations.find(
      (o) => o.method === "DELETE" && o.path === "/pets/{petId}",
    );
    expect(del).toBeTruthy();
    expect(del.parameters.some((p) => p.name === "petId")).toBe(true);
  });
});
