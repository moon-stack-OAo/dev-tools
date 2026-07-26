// ============================================================
// OpenAPI / Swagger 摘要预览（纯前端）
//   - 支持 OpenAPI 3 / Swagger 2，JSON 或 YAML
//   - 展示 title / version / servers / paths
//   - 点击 path 查看 parameters / responses 简要信息
//   - 统计 path 数、method 数
// ============================================================

const OAV_HTTP_METHODS = [
  "get",
  "post",
  "put",
  "delete",
  "patch",
  "options",
  "head",
  "trace",
];

const OAV_SAMPLE = `openapi: 3.0.3
info:
  title: Petstore Sample
  version: 1.0.0
  description: Minimal OpenAPI sample for preview
servers:
  - url: https://api.example.com/v1
    description: Production
  - url: https://sandbox.example.com/v1
    description: Sandbox
paths:
  /pets:
    get:
      summary: List pets
      operationId: listPets
      parameters:
        - name: limit
          in: query
          required: false
          schema:
            type: integer
            format: int32
        - name: tags
          in: query
          schema:
            type: array
            items:
              type: string
      responses:
        "200":
          description: A paged array of pets
        "400":
          description: Invalid request
    post:
      summary: Create a pet
      operationId: createPet
      parameters:
        - name: X-Request-Id
          in: header
          required: false
          schema:
            type: string
      responses:
        "201":
          description: Pet created
        "default":
          description: Unexpected error
  /pets/{petId}:
    get:
      summary: Get a pet by ID
      operationId: getPet
      parameters:
        - name: petId
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Expected response
        "404":
          description: Pet not found
    delete:
      summary: Delete a pet
      operationId: deletePet
      parameters:
        - name: petId
          in: path
          required: true
          schema:
            type: string
      responses:
        "204":
          description: Pet deleted
`;

// -----------------------------------------------------------
// 解析：JSON 优先，失败再走 YAML（js-yaml）
// -----------------------------------------------------------
function oavGetYaml() {
  if (typeof jsyaml !== "undefined") return jsyaml;
  if (typeof window !== "undefined" && window.jsyaml) return window.jsyaml;
  return null;
}

function parseOpenApiDoc(text) {
  const raw = String(text == null ? "" : text).trim();
  if (!raw) {
    const err = new Error("请输入 OpenAPI / Swagger 文档内容");
    err.code = "empty";
    throw err;
  }

  let doc = null;
  let format = null;

  if (raw[0] === "{" || raw[0] === "[") {
    try {
      doc = JSON.parse(raw);
      format = "json";
    } catch (e) {
      const err = new Error("JSON 解析失败: " + e.message);
      err.code = "parse";
      throw err;
    }
  } else {
    const yaml = oavGetYaml();
    if (!yaml || typeof yaml.load !== "function") {
      const err = new Error("js-yaml 库未加载，无法解析 YAML");
      err.code = "lib";
      throw err;
    }
    try {
      doc = yaml.load(raw);
      format = "yaml";
    } catch (e) {
      const err = new Error("YAML 解析失败: " + (e.message || e));
      err.code = "parse";
      throw err;
    }
  }

  if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
    const err = new Error("文档根节点必须是对象");
    err.code = "invalid";
    throw err;
  }

  const isOas3 = typeof doc.openapi === "string";
  const isSwagger2 = typeof doc.swagger === "string";
  if (!isOas3 && !isSwagger2) {
    const err = new Error(
      "未识别为 OpenAPI 3 或 Swagger 2（缺少 openapi / swagger 字段）",
    );
    err.code = "invalid";
    throw err;
  }

  return { doc: doc, format: format, isOas3: isOas3, isSwagger2: isSwagger2 };
}

// -----------------------------------------------------------
// 摘要提取
// -----------------------------------------------------------
function oavPickServers(doc, isOas3) {
  if (isOas3) {
    const list = Array.isArray(doc.servers) ? doc.servers : [];
    return list.map(function (s) {
      if (!s || typeof s !== "object") return { url: String(s || ""), description: "" };
      return {
        url: s.url != null ? String(s.url) : "",
        description: s.description != null ? String(s.description) : "",
      };
    });
  }
  // Swagger 2: host + basePath + schemes
  const host = doc.host != null ? String(doc.host) : "";
  const basePath = doc.basePath != null ? String(doc.basePath) : "";
  let schemes = Array.isArray(doc.schemes) ? doc.schemes : [];
  if (!schemes.length) schemes = ["https"];
  if (!host) {
    return basePath ? [{ url: basePath, description: "basePath" }] : [];
  }
  return schemes.map(function (sch) {
    return {
      url: String(sch) + "://" + host + basePath,
      description: "scheme: " + sch,
    };
  });
}

function oavParamBrief(p) {
  if (!p || typeof p !== "object") return null;
  const name = p.name != null ? String(p.name) : "";
  if (!name) return null;
  let type = "";
  if (p.schema && typeof p.schema === "object") {
    type = p.schema.type != null ? String(p.schema.type) : "";
    if (p.schema.format) type += "(" + p.schema.format + ")";
  } else if (p.type != null) {
    type = String(p.type);
    if (p.format) type += "(" + p.format + ")";
  }
  return {
    name: name,
    in: p.in != null ? String(p.in) : "",
    required: !!p.required,
    type: type,
    description: p.description != null ? String(p.description) : "",
  };
}

function oavResponseBrief(code, r) {
  const status = String(code);
  if (!r || typeof r !== "object") {
    return { status: status, description: "", contentTypes: [] };
  }
  const contentTypes = [];
  if (r.content && typeof r.content === "object") {
    Object.keys(r.content).forEach(function (ct) {
      contentTypes.push(ct);
    });
  }
  return {
    status: status,
    description: r.description != null ? String(r.description) : "",
    contentTypes: contentTypes,
  };
}

function summarizeOpenApi(doc) {
  const isOas3 = typeof doc.openapi === "string";
  const isSwagger2 = typeof doc.swagger === "string";
  const info = doc.info && typeof doc.info === "object" ? doc.info : {};
  const title = info.title != null ? String(info.title) : "(未命名)";
  const version = info.version != null ? String(info.version) : "";
  const description = info.description != null ? String(info.description) : "";
  const specVersion = isOas3
    ? "OpenAPI " + doc.openapi
    : isSwagger2
      ? "Swagger " + doc.swagger
      : "Unknown";

  const servers = oavPickServers(doc, isOas3);
  const pathsObj = doc.paths && typeof doc.paths === "object" ? doc.paths : {};
  const pathKeys = Object.keys(pathsObj);
  const operations = [];
  let methodCount = 0;

  pathKeys.forEach(function (path) {
    const item = pathsObj[path];
    if (!item || typeof item !== "object") return;
    const pathParams = Array.isArray(item.parameters) ? item.parameters : [];

    OAV_HTTP_METHODS.forEach(function (method) {
      const op = item[method];
      if (!op || typeof op !== "object") return;
      methodCount++;
      const opParams = Array.isArray(op.parameters) ? op.parameters : [];
      const mergedParams = pathParams.concat(opParams).map(oavParamBrief).filter(Boolean);

      const responses = [];
      if (op.responses && typeof op.responses === "object") {
        Object.keys(op.responses).forEach(function (code) {
          responses.push(oavResponseBrief(code, op.responses[code]));
        });
      }

      operations.push({
        path: path,
        method: method.toUpperCase(),
        summary: op.summary != null ? String(op.summary) : "",
        operationId: op.operationId != null ? String(op.operationId) : "",
        description: op.description != null ? String(op.description) : "",
        tags: Array.isArray(op.tags) ? op.tags.map(String) : [],
        parameters: mergedParams,
        responses: responses,
      });
    });
  });

  return {
    title: title,
    version: version,
    description: description,
    specVersion: specVersion,
    servers: servers,
    pathCount: pathKeys.length,
    methodCount: methodCount,
    operations: operations,
  };
}

// -----------------------------------------------------------
// UI
// -----------------------------------------------------------
let _oavLastSummary = null;
let _oavSelectedKey = null;

function _oavEsc(s) {
  if (typeof escapeHtml === "function") return escapeHtml(s);
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function _oavSetStatus(msg, isErr) {
  const el = document.getElementById("oavStatus");
  if (!el) return;
  el.textContent = msg || "";
  el.className = "nfm-status" + (isErr ? " oav-status-err" : "");
}

function _oavMethodClass(method) {
  const m = String(method || "").toLowerCase();
  if (m === "get") return "oav-m-get";
  if (m === "post") return "oav-m-post";
  if (m === "put") return "oav-m-put";
  if (m === "delete") return "oav-m-delete";
  if (m === "patch") return "oav-m-patch";
  return "oav-m-other";
}

function _oavRenderMeta(sum) {
  const meta = document.getElementById("oavMeta");
  if (!meta) return;
  const serversHtml =
    sum.servers && sum.servers.length
      ? '<ul class="oav-servers">' +
        sum.servers
          .map(function (s) {
            return (
              "<li><code>" +
              _oavEsc(s.url) +
              "</code>" +
              (s.description
                ? ' <span class="oav-muted">' + _oavEsc(s.description) + "</span>"
                : "") +
              "</li>"
            );
          })
          .join("") +
        "</ul>"
      : '<div class="oav-muted">无 servers</div>';

  meta.innerHTML =
    '<div class="oav-info">' +
    '<div class="oav-title">' +
    _oavEsc(sum.title) +
    (sum.version
      ? ' <span class="oav-ver">v' + _oavEsc(sum.version) + "</span>"
      : "") +
    "</div>" +
    '<div class="oav-spec">' +
    _oavEsc(sum.specVersion) +
    "</div>" +
    (sum.description
      ? '<div class="oav-desc">' + _oavEsc(sum.description) + "</div>"
      : "") +
    '<div class="oav-servers-label">Servers</div>' +
    serversHtml +
    "</div>";
}

function _oavRenderSummaryBar(sum) {
  const el = document.getElementById("oavSummary");
  if (!el) return;
  el.innerHTML =
    '<span class="oav-stat"><b>' +
    sum.pathCount +
    "</b> paths</span>" +
    '<span class="oav-stat"><b>' +
    sum.methodCount +
    "</b> methods</span>" +
    '<span class="oav-stat">' +
    _oavEsc(sum.specVersion) +
    "</span>";
}

function _oavRenderPaths(sum) {
  const el = document.getElementById("oavPaths");
  if (!el) return;
  if (!sum.operations.length) {
    el.innerHTML = '<div class="oav-empty">无 paths</div>';
    return;
  }
  const rows = sum.operations
    .map(function (op, idx) {
      const key = op.method + " " + op.path;
      const active = _oavSelectedKey === key ? " oav-path-active" : "";
      return (
        '<div class="oav-path-row' +
        active +
        '" data-idx="' +
        idx +
        '" onclick="oavSelectOp(' +
        idx +
        ')">' +
        '<span class="oav-method ' +
        _oavMethodClass(op.method) +
        '">' +
        _oavEsc(op.method) +
        "</span>" +
        '<span class="oav-path">' +
        _oavEsc(op.path) +
        "</span>" +
        '<span class="oav-op-summary">' +
        _oavEsc(op.summary || op.operationId || "") +
        "</span>" +
        "</div>"
      );
    })
    .join("");
  el.innerHTML = '<div class="oav-path-list">' + rows + "</div>";
}

function _oavRenderDetail(op) {
  const el = document.getElementById("oavDetail");
  if (!el) return;
  if (!op) {
    el.innerHTML =
      '<div class="oav-empty">点击上方 path 查看 parameters / responses</div>';
    return;
  }

  let paramsHtml = "";
  if (op.parameters && op.parameters.length) {
    paramsHtml =
      '<table class="oav-table"><thead><tr>' +
      "<th>name</th><th>in</th><th>required</th><th>type</th><th>description</th>" +
      "</tr></thead><tbody>" +
      op.parameters
        .map(function (p) {
          return (
            "<tr><td><code>" +
            _oavEsc(p.name) +
            "</code></td><td>" +
            _oavEsc(p.in) +
            "</td><td>" +
            (p.required ? "是" : "否") +
            "</td><td>" +
            _oavEsc(p.type) +
            "</td><td>" +
            _oavEsc(p.description) +
            "</td></tr>"
          );
        })
        .join("") +
      "</tbody></table>";
  } else {
    paramsHtml = '<div class="oav-muted">无 parameters</div>';
  }

  let respHtml = "";
  if (op.responses && op.responses.length) {
    respHtml =
      '<table class="oav-table"><thead><tr>' +
      "<th>status</th><th>description</th><th>content</th>" +
      "</tr></thead><tbody>" +
      op.responses
        .map(function (r) {
          return (
            "<tr><td><code>" +
            _oavEsc(r.status) +
            "</code></td><td>" +
            _oavEsc(r.description) +
            "</td><td>" +
            _oavEsc((r.contentTypes || []).join(", ")) +
            "</td></tr>"
          );
        })
        .join("") +
      "</tbody></table>";
  } else {
    respHtml = '<div class="oav-muted">无 responses</div>';
  }

  el.innerHTML =
    '<div class="oav-detail-head">' +
    '<span class="oav-method ' +
    _oavMethodClass(op.method) +
    '">' +
    _oavEsc(op.method) +
    "</span>" +
    '<span class="oav-path">' +
    _oavEsc(op.path) +
    "</span>" +
    (op.operationId
      ? ' <code class="oav-opid">' + _oavEsc(op.operationId) + "</code>"
      : "") +
    "</div>" +
    (op.summary
      ? '<div class="oav-detail-sum">' + _oavEsc(op.summary) + "</div>"
      : "") +
    (op.description
      ? '<div class="oav-desc">' + _oavEsc(op.description) + "</div>"
      : "") +
    '<div class="oav-section-title">Parameters</div>' +
    paramsHtml +
    '<div class="oav-section-title">Responses</div>' +
    respHtml;
}

function oavSelectOp(idx) {
  if (!_oavLastSummary || !_oavLastSummary.operations) return;
  const op = _oavLastSummary.operations[idx];
  if (!op) return;
  _oavSelectedKey = op.method + " " + op.path;
  _oavRenderPaths(_oavLastSummary);
  _oavRenderDetail(op);
}

function oavParse() {
  const input = document.getElementById("oavInput");
  const text = input ? input.value : "";
  try {
    const parsed = parseOpenApiDoc(text);
    const sum = summarizeOpenApi(parsed.doc);
    _oavLastSummary = sum;
    _oavSelectedKey = null;
    _oavRenderSummaryBar(sum);
    _oavRenderMeta(sum);
    _oavRenderPaths(sum);
    _oavRenderDetail(null);
    _oavSetStatus(
      "解析成功 · " +
        sum.pathCount +
        " paths · " +
        sum.methodCount +
        " methods · " +
        parsed.format.toUpperCase(),
    );
  } catch (e) {
    _oavLastSummary = null;
    _oavSelectedKey = null;
    const summary = document.getElementById("oavSummary");
    const meta = document.getElementById("oavMeta");
    const paths = document.getElementById("oavPaths");
    const detail = document.getElementById("oavDetail");
    if (summary) summary.innerHTML = "";
    if (meta) {
      meta.innerHTML =
        '<div class="oav-error">' + _oavEsc(e.message || String(e)) + "</div>";
    }
    if (paths) paths.innerHTML = "";
    if (detail) detail.innerHTML = "";
    _oavSetStatus(e.message || "解析失败", true);
  }
}

function oavSample() {
  const input = document.getElementById("oavInput");
  if (input) input.value = OAV_SAMPLE;
  oavParse();
}

function oavClear() {
  const input = document.getElementById("oavInput");
  if (input) input.value = "";
  _oavLastSummary = null;
  _oavSelectedKey = null;
  const summary = document.getElementById("oavSummary");
  const meta = document.getElementById("oavMeta");
  const paths = document.getElementById("oavPaths");
  const detail = document.getElementById("oavDetail");
  if (summary) summary.innerHTML = "";
  if (meta) meta.innerHTML = "";
  if (paths) paths.innerHTML = "";
  if (detail) detail.innerHTML = "";
  _oavSetStatus("已清空");
}

function oavInit() {
  const input = document.getElementById("oavInput");
  if (input && !input.value.trim()) {
    input.value = OAV_SAMPLE;
  }
  oavParse();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    parseOpenApiDoc: parseOpenApiDoc,
    summarizeOpenApi: summarizeOpenApi,
    OAV_HTTP_METHODS: OAV_HTTP_METHODS,
    OAV_SAMPLE: OAV_SAMPLE,
  };
}

if (typeof registerInit === "function") {
  registerInit("openapiview", oavInit);
}
