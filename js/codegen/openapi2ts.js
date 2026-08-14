// OpenAPI → TypeScript Client

/**
 * 获取 js-yaml 全局
 * @returns {object|null}
 */
function o2tGetYaml() {
    if (typeof jsyaml !== 'undefined') return jsyaml;
    if (typeof window !== 'undefined' && window.jsyaml) return window.jsyaml;
    return null;
}

/**
 * 解析 OpenAPI 文本（JSON 优先，失败再 YAML）
 * @param {string} text
 * @returns {{ok:boolean, doc?:object, error?:string, format?:string}}
 */
function parseOpenApi(text) {
    const raw = String(text == null ? '' : text).trim();
    if (!raw) {
        return { ok: false, error: '请输入 OpenAPI 文档内容' };
    }

    let doc = null;
    let format = null;

    if (raw[0] === '{' || raw[0] === '[') {
        try {
            doc = JSON.parse(raw);
            format = 'json';
        } catch (e) {
            return { ok: false, error: 'JSON 解析失败: ' + (e.message || e) };
        }
    } else {
        const yaml = o2tGetYaml();
        if (!yaml || typeof yaml.load !== 'function') {
            return {
                ok: false,
                error: 'js-yaml 库未加载，无法解析 YAML；请改用 JSON，或刷新页面后重试',
            };
        }
        try {
            doc = yaml.load(raw);
            format = 'yaml';
        } catch (e) {
            return { ok: false, error: 'YAML 解析失败: ' + (e.message || e) };
        }
    }

    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
        return { ok: false, error: '文档根节点必须是对象' };
    }

    const isOas3 = typeof doc.openapi === 'string';
    const isSwagger2 = typeof doc.swagger === 'string';
    if (!isOas3 && !isSwagger2) {
        return {
            ok: false,
            error: '未识别为 OpenAPI 3 或 Swagger 2（缺少 openapi / swagger 字段）',
        };
    }

    return { ok: true, doc: doc, format: format };
}

/**
 * 安全标识符
 * @param {string} name
 * @returns {string}
 */
function o2tSafeIdent(name) {
    let s = String(name || '')
        .replace(/[^A-Za-z0-9_$]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
    if (!s) s = 'Unnamed';
    if (/^\d/.test(s)) s = '_' + s;
    return s;
}

/**
 * 路径+方法 → 函数名
 * @param {string} method
 * @param {string} path
 * @param {string} [operationId]
 * @returns {string}
 */
function o2tFnName(method, path, operationId) {
    if (operationId && String(operationId).trim()) {
        return o2tSafeIdent(String(operationId).trim());
    }
    const parts = String(path || '')
        .split('/')
        .filter(Boolean)
        .map(function (p) {
            if (p.startsWith('{') && p.endsWith('}')) {
                return 'By' + o2tSafeIdent(p.slice(1, -1)).replace(/^\w/, function (c) {
                    return c.toUpperCase();
                });
            }
            return o2tSafeIdent(p).replace(/^\w/, function (c) {
                return c.toUpperCase();
            });
        });
    const m = String(method || 'get').toLowerCase();
    const base = m + (parts.length ? parts.join('') : 'Root');
    return o2tSafeIdent(base);
}

/**
 * 解析 $ref 本地引用
 * @param {string} ref
 * @returns {string|null}
 */
function o2tRefName(ref) {
    if (!ref || typeof ref !== 'string') return null;
    const m = ref.match(/#\/components\/schemas\/([^/]+)$/);
    if (m) return o2tSafeIdent(m[1]);
    const m2 = ref.match(/#\/definitions\/([^/]+)$/);
    if (m2) return o2tSafeIdent(m2[1]);
    return null;
}

/**
 * schema → TS 类型字符串
 * @param {object} schema
 * @param {object} [ctx]
 * @returns {string}
 */
function o2tSchemaToTs(schema, ctx) {
    if (!schema || typeof schema !== 'object') return 'unknown';
    if (schema.$ref) {
        return o2tRefName(schema.$ref) || 'unknown';
    }
    if (Array.isArray(schema.enum) && schema.enum.length) {
        return schema.enum
            .map(function (v) {
                return typeof v === 'string' ? JSON.stringify(v) : String(v);
            })
            .join(' | ');
    }
    if (schema.allOf && Array.isArray(schema.allOf)) {
        const parts = schema.allOf.map(function (s) {
            return o2tSchemaToTs(s, ctx);
        });
        return parts.filter(Boolean).join(' & ') || 'unknown';
    }
    if (schema.oneOf && Array.isArray(schema.oneOf)) {
        const parts = schema.oneOf.map(function (s) {
            return o2tSchemaToTs(s, ctx);
        });
        return parts.filter(Boolean).join(' | ') || 'unknown';
    }
    if (schema.anyOf && Array.isArray(schema.anyOf)) {
        const parts = schema.anyOf.map(function (s) {
            return o2tSchemaToTs(s, ctx);
        });
        return parts.filter(Boolean).join(' | ') || 'unknown';
    }

    const t = schema.type;
    if (Array.isArray(t)) {
        return t
            .map(function (x) {
                return o2tSchemaToTs(Object.assign({}, schema, { type: x }), ctx);
            })
            .join(' | ');
    }

    switch (t) {
        case 'string':
            return 'string';
        case 'integer':
        case 'number':
            return 'number';
        case 'boolean':
            return 'boolean';
        case 'null':
            return 'null';
        case 'array':
            return o2tSchemaToTs(schema.items || {}, ctx) + '[]';
        case 'object':
        default:
            if (schema.properties && typeof schema.properties === 'object') {
                const req = Array.isArray(schema.required) ? schema.required : [];
                const keys = Object.keys(schema.properties);
                if (!keys.length) {
                    if (schema.additionalProperties) {
                        const ap =
                            schema.additionalProperties === true
                                ? 'unknown'
                                : o2tSchemaToTs(schema.additionalProperties, ctx);
                        return 'Record<string, ' + ap + '>';
                    }
                    return 'Record<string, unknown>';
                }
                const fields = keys.map(function (k) {
                    const opt = req.indexOf(k) >= 0 ? '' : '?';
                    const safe = /^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k);
                    return (
                        '  ' +
                        safe +
                        opt +
                        ': ' +
                        o2tSchemaToTs(schema.properties[k], ctx) +
                        ';'
                    );
                });
                return '{\n' + fields.join('\n') + '\n}';
            }
            if (schema.additionalProperties) {
                const ap =
                    schema.additionalProperties === true
                        ? 'unknown'
                        : o2tSchemaToTs(schema.additionalProperties, ctx);
                return 'Record<string, ' + ap + '>';
            }
            if (!t) return 'unknown';
            return 'Record<string, unknown>';
    }
}

/**
 * 从 components.schemas / definitions 生成 interface
 * @param {object} doc
 * @returns {string[]}
 */
function o2tGenerateInterfaces(doc) {
    const schemas =
        (doc.components && doc.components.schemas) || doc.definitions || {};
    const names = Object.keys(schemas);
    const lines = [];
    names.forEach(function (name) {
        const safe = o2tSafeIdent(name);
        const schema = schemas[name] || {};
        const ts = o2tSchemaToTs(schema);
        if (ts.startsWith('{')) {
            lines.push('export interface ' + safe + ' ' + ts);
        } else {
            lines.push('export type ' + safe + ' = ' + ts + ';');
        }
        lines.push('');
    });
    return lines;
}

/**
 * 取 requestBody schema
 * @param {object} op
 * @returns {object|null}
 */
function o2tRequestBodySchema(op) {
    if (!op || typeof op !== 'object') return null;
    if (op.requestBody && op.requestBody.content) {
        const content = op.requestBody.content;
        const json =
            content['application/json'] ||
            content['application/*+json'] ||
            content['*/*'];
        if (json && json.schema) return json.schema;
        const keys = Object.keys(content);
        for (let i = 0; i < keys.length; i++) {
            if (content[keys[i]] && content[keys[i]].schema) {
                return content[keys[i]].schema;
            }
        }
    }
    // Swagger 2 body param
    if (Array.isArray(op.parameters)) {
        for (let i = 0; i < op.parameters.length; i++) {
            const p = op.parameters[i];
            if (p && p.in === 'body' && p.schema) return p.schema;
        }
    }
    return null;
}

/**
 * 取成功响应 schema
 * @param {object} op
 * @returns {object|null}
 */
function o2tResponseSchema(op) {
    if (!op || !op.responses) return null;
    const responses = op.responses;
    const prefer = ['200', '201', '202', '204', 'default'];
    for (let i = 0; i < prefer.length; i++) {
        const r = responses[prefer[i]];
        if (!r) continue;
        if (r.content) {
            const json = r.content['application/json'] || r.content['*/*'];
            if (json && json.schema) return json.schema;
            const keys = Object.keys(r.content);
            for (let j = 0; j < keys.length; j++) {
                if (r.content[keys[j]] && r.content[keys[j]].schema) {
                    return r.content[keys[j]].schema;
                }
            }
        }
        if (r.schema) return r.schema; // swagger2
    }
    const codes = Object.keys(responses);
    for (let i = 0; i < codes.length; i++) {
        const r = responses[codes[i]];
        if (r && r.content) {
            const keys = Object.keys(r.content);
            for (let j = 0; j < keys.length; j++) {
                if (r.content[keys[j]] && r.content[keys[j]].schema) {
                    return r.content[keys[j]].schema;
                }
            }
        }
        if (r && r.schema) return r.schema;
    }
    return null;
}

/**
 * 收集参数
 * @param {object} pathItem
 * @param {object} op
 * @returns {Array}
 */
function o2tCollectParams(pathItem, op) {
    const list = [];
    const seen = {};
    function add(arr) {
        if (!Array.isArray(arr)) return;
        arr.forEach(function (p) {
            if (!p || typeof p !== 'object' || !p.name) return;
            if (p.$ref) return; // 简化：跳过未解析 ref 参数
            const key = (p.in || '') + ':' + p.name;
            if (seen[key]) return;
            seen[key] = true;
            list.push(p);
        });
    }
    add(pathItem && pathItem.parameters);
    add(op && op.parameters);
    return list;
}

/**
 * 生成 TS Client
 * @param {object} doc
 * @param {{baseUrl?:string}} [options]
 * @returns {string}
 */
function generateTsClient(doc, options) {
    const opts = options || {};
    let baseUrl = opts.baseUrl != null ? String(opts.baseUrl) : '';
    if (!baseUrl && doc.servers && doc.servers[0] && doc.servers[0].url) {
        baseUrl = String(doc.servers[0].url);
    }
    if (!baseUrl && doc.host) {
        const scheme =
            Array.isArray(doc.schemes) && doc.schemes[0] ? doc.schemes[0] : 'https';
        baseUrl = scheme + '://' + doc.host + (doc.basePath || '');
    }
    if (!baseUrl) baseUrl = '';

    const lines = [];
    const title = (doc.info && doc.info.title) || 'API';
    const version = (doc.info && doc.info.version) || '';
    lines.push('/**');
    lines.push(' * Auto-generated TypeScript client');
    lines.push(' * ' + title + (version ? ' v' + version : ''));
    lines.push(' * Do not edit manually.');
    lines.push(' */');
    lines.push('');
    lines.push('export type FetchLike = typeof fetch;');
    lines.push('');
    lines.push('export interface ClientOptions {');
    lines.push('  baseUrl?: string;');
    lines.push('  fetch?: FetchLike;');
    lines.push('  headers?: Record<string, string>;');
    lines.push('}');
    lines.push('');
    lines.push('export class ApiError extends Error {');
    lines.push('  status: number;');
    lines.push('  body: unknown;');
    lines.push('  constructor(message: string, status: number, body: unknown) {');
    lines.push('    super(message);');
    lines.push('    this.name = "ApiError";');
    lines.push('    this.status = status;');
    lines.push('    this.body = body;');
    lines.push('  }');
    lines.push('}');
    lines.push('');

    const ifaceLines = o2tGenerateInterfaces(doc);
    if (ifaceLines.length) {
        lines.push('// ---------- Schemas ----------');
        lines.push('');
        ifaceLines.forEach(function (l) {
            lines.push(l);
        });
    }

    lines.push('// ---------- Client ----------');
    lines.push('');
    lines.push('const DEFAULT_BASE_URL = ' + JSON.stringify(baseUrl) + ';');
    lines.push('');
    lines.push('export function createClient(options: ClientOptions = {}) {');
    lines.push('  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\\/$/, "");');
    lines.push('  const fetchFn: FetchLike = options.fetch ?? fetch;');
    lines.push('  const defaultHeaders: Record<string, string> = {');
    lines.push('    Accept: "application/json",');
    lines.push('    ...(options.headers || {}),');
    lines.push('  };');
    lines.push('');
    lines.push('  async function request<T>(');
    lines.push('    method: string,');
    lines.push('    path: string,');
    lines.push('    init?: {');
    lines.push('      query?: Record<string, string | number | boolean | undefined | null>;');
    lines.push('      body?: unknown;');
    lines.push('      headers?: Record<string, string>;');
    lines.push('      pathParams?: Record<string, string | number>;');
    lines.push('    },');
    lines.push('  ): Promise<T> {');
    lines.push('    let urlPath = path;');
    lines.push('    if (init?.pathParams) {');
    lines.push('      Object.keys(init.pathParams).forEach((k) => {');
    lines.push(
        '        urlPath = urlPath.replace(new RegExp("{" + k + "}", "g"), encodeURIComponent(String(init.pathParams![k])));',
    );
    lines.push('      });');
    lines.push('    }');
    lines.push('    const qs = new URLSearchParams();');
    lines.push('    if (init?.query) {');
    lines.push('      Object.keys(init.query).forEach((k) => {');
    lines.push('        const v = init.query![k];');
    lines.push('        if (v === undefined || v === null) return;');
    lines.push('        qs.set(k, String(v));');
    lines.push('      });');
    lines.push('    }');
    lines.push('    const q = qs.toString();');
    lines.push('    const url = baseUrl + urlPath + (q ? "?" + q : "");');
    lines.push('    const headers: Record<string, string> = { ...defaultHeaders, ...(init?.headers || {}) };');
    lines.push('    let body: string | undefined;');
    lines.push('    if (init?.body !== undefined && init?.body !== null) {');
    lines.push('      headers["Content-Type"] = headers["Content-Type"] || "application/json";');
    lines.push('      body = typeof init.body === "string" ? init.body : JSON.stringify(init.body);');
    lines.push('    }');
    lines.push('    const res = await fetchFn(url, { method, headers, body });');
    lines.push('    const text = await res.text();');
    lines.push('    let data: unknown = undefined;');
    lines.push('    if (text) {');
    lines.push('      try { data = JSON.parse(text); } catch { data = text; }');
    lines.push('    }');
    lines.push('    if (!res.ok) {');
    lines.push('      throw new ApiError(res.statusText || "HTTP " + res.status, res.status, data);');
    lines.push('    }');
    lines.push('    return data as T;');
    lines.push('  }');
    lines.push('');

    const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];
    const paths = doc.paths && typeof doc.paths === 'object' ? doc.paths : {};
    const pathKeys = Object.keys(paths);
    const usedNames = {};

    pathKeys.forEach(function (path) {
        const pathItem = paths[path] || {};
        methods.forEach(function (method) {
            const op = pathItem[method];
            if (!op || typeof op !== 'object') return;

            let fn = o2tFnName(method, path, op.operationId);
            if (usedNames[fn]) {
                let n = 2;
                while (usedNames[fn + n]) n++;
                fn = fn + n;
            }
            usedNames[fn] = true;

            const params = o2tCollectParams(pathItem, op);
            const pathParams = params.filter(function (p) {
                return p.in === 'path';
            });
            const queryParams = params.filter(function (p) {
                return p.in === 'query';
            });
            const headerParams = params.filter(function (p) {
                return p.in === 'header';
            });
            const bodySchema = o2tRequestBodySchema(op);
            const respSchema = o2tResponseSchema(op);
            const respTs = respSchema ? o2tSchemaToTs(respSchema) : 'unknown';
            const bodyTs = bodySchema ? o2tSchemaToTs(bodySchema) : null;

            const argParts = [];
            pathParams.forEach(function (p) {
                const t =
                    p.schema && p.schema.type === 'integer'
                        ? 'number'
                        : p.schema && p.schema.type === 'number'
                          ? 'number'
                          : p.schema && p.schema.type === 'boolean'
                            ? 'boolean'
                            : p.type === 'integer' || p.type === 'number'
                              ? 'number'
                              : p.type === 'boolean'
                                ? 'boolean'
                                : 'string';
                argParts.push(o2tSafeIdent(p.name) + ': ' + t);
            });
            if (queryParams.length) {
                const fields = queryParams.map(function (p) {
                    const opt = p.required ? '' : '?';
                    const t =
                        (p.schema && p.schema.type) || p.type || 'string';
                    const ts =
                        t === 'integer' || t === 'number'
                            ? 'number'
                            : t === 'boolean'
                              ? 'boolean'
                              : 'string';
                    return o2tSafeIdent(p.name) + opt + ': ' + ts;
                });
                argParts.push('query: { ' + fields.join('; ') + ' }');
            }
            if (bodyTs) {
                const required =
                    op.requestBody && op.requestBody.required !== false
                        ? true
                        : bodySchema;
                argParts.push('body' + (required ? '' : '?') + ': ' + bodyTs);
            }
            if (headerParams.length) {
                const fields = headerParams.map(function (p) {
                    const opt = p.required ? '' : '?';
                    return o2tSafeIdent(p.name) + opt + ': string';
                });
                argParts.push('headers?: { ' + fields.join('; ') + ' }');
            }

            const summary = op.summary || op.description || method.toUpperCase() + ' ' + path;
            lines.push('  /** ' + String(summary).replace(/\*\//g, '* /').split('\n')[0] + ' */');
            lines.push(
                '  async function ' +
                    fn +
                    '(' +
                    argParts.join(', ') +
                    '): Promise<' +
                    respTs +
                    '> {',
            );

            // pathParams object
            if (pathParams.length) {
                lines.push('    const pathParams = {');
                pathParams.forEach(function (p) {
                    const id = o2tSafeIdent(p.name);
                    lines.push('      ' + JSON.stringify(p.name) + ': ' + id + ',');
                });
                lines.push('    };');
            }

            if (queryParams.length) {
                lines.push('    const queryObj: Record<string, string | number | boolean | undefined | null> = {');
                queryParams.forEach(function (p) {
                    const id = o2tSafeIdent(p.name);
                    lines.push('      ' + JSON.stringify(p.name) + ': query.' + id + ',');
                });
                lines.push('    };');
            }

            if (headerParams.length) {
                lines.push('    const hdrs: Record<string, string> = {};');
                headerParams.forEach(function (p) {
                    const id = o2tSafeIdent(p.name);
                    if (p.required) {
                        lines.push(
                            '    if (headers && headers.' +
                                id +
                                ' != null) hdrs[' +
                                JSON.stringify(p.name) +
                                '] = headers.' +
                                id +
                                ';',
                        );
                    } else {
                        lines.push(
                            '    if (headers?.' +
                                id +
                                ' != null) hdrs[' +
                                JSON.stringify(p.name) +
                                '] = headers.' +
                                id +
                                ';',
                        );
                    }
                });
            }

            const callArgs = [
                JSON.stringify(method.toUpperCase()),
                JSON.stringify(path),
            ];
            const initParts = [];
            if (pathParams.length) initParts.push('pathParams');
            if (queryParams.length) initParts.push('query: queryObj');
            if (bodyTs) initParts.push('body');
            if (headerParams.length) initParts.push('headers: hdrs');
            if (initParts.length) {
                lines.push(
                    '    return request<' +
                        respTs +
                        '>(' +
                        callArgs.join(', ') +
                        ', { ' +
                        initParts.join(', ') +
                        ' });',
                );
            } else {
                lines.push(
                    '    return request<' + respTs + '>(' + callArgs.join(', ') + ');',
                );
            }
            lines.push('  }');
            lines.push('');
        });
    });

    // return object
    const fnNames = Object.keys(usedNames);
    lines.push('  return {');
    lines.push('    request,');
    fnNames.forEach(function (n) {
        lines.push('    ' + n + ',');
    });
    lines.push('  };');
    lines.push('}');
    lines.push('');
    lines.push('export type ApiClient = ReturnType<typeof createClient>;');
    lines.push('');

    return lines.join('\n');
}

// ---------- UI ----------

const O2T_SAMPLE = JSON.stringify(
    {
        openapi: '3.0.3',
        info: { title: 'Petstore Mini', version: '1.0.0' },
        servers: [{ url: 'https://petstore.example.com/api' }],
        paths: {
            '/pets': {
                get: {
                    operationId: 'listPets',
                    summary: 'List all pets',
                    parameters: [
                        {
                            name: 'limit',
                            in: 'query',
                            schema: { type: 'integer' },
                        },
                    ],
                    responses: {
                        '200': {
                            description: 'A paged array of pets',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/Pet' },
                                    },
                                },
                            },
                        },
                    },
                },
                post: {
                    operationId: 'createPet',
                    summary: 'Create a pet',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/NewPet' },
                            },
                        },
                    },
                    responses: {
                        '201': {
                            description: 'Created',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/Pet' },
                                },
                            },
                        },
                    },
                },
            },
            '/pets/{petId}': {
                get: {
                    operationId: 'getPetById',
                    summary: 'Info for a specific pet',
                    parameters: [
                        {
                            name: 'petId',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    responses: {
                        '200': {
                            description: 'Expected response',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/Pet' },
                                },
                            },
                        },
                    },
                },
                delete: {
                    operationId: 'deletePet',
                    summary: 'Delete a pet',
                    parameters: [
                        {
                            name: 'petId',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    responses: {
                        '204': { description: 'Pet deleted' },
                    },
                },
            },
        },
        components: {
            schemas: {
                Pet: {
                    type: 'object',
                    required: ['id', 'name'],
                    properties: {
                        id: { type: 'integer', format: 'int64' },
                        name: { type: 'string' },
                        tag: { type: 'string' },
                    },
                },
                NewPet: {
                    type: 'object',
                    required: ['name'],
                    properties: {
                        name: { type: 'string' },
                        tag: { type: 'string' },
                    },
                },
            },
        },
    },
    null,
    2,
);

function o2tSetOutput(text, isError) {
    const out = document.getElementById('o2tOutput');
    if (!out) return;
    out.textContent = text || '';
    if (isError) out.classList.add('error');
    else out.classList.remove('error');
}

function o2tGenerate() {
    const input = document.getElementById('o2tInput');
    const baseEl = document.getElementById('o2tBaseUrl');
    const text = input ? input.value : '';
    const parsed = parseOpenApi(text);
    if (!parsed.ok) {
        o2tSetOutput(parsed.error, true);
        if (typeof toast === 'function' && /js-yaml/.test(parsed.error || '')) {
            toast(parsed.error);
        }
        if (typeof setStatus === 'function') setStatus(parsed.error);
        return;
    }
    try {
        const baseUrl = baseEl ? baseEl.value.trim() : '';
        const code = generateTsClient(parsed.doc, { baseUrl: baseUrl });
        o2tSetOutput(code, false);
        if (typeof setStatus === 'function') setStatus('TS Client 已生成');
    } catch (e) {
        const msg = e.message || String(e);
        o2tSetOutput(msg, true);
        if (typeof setStatus === 'function') setStatus(msg);
    }
}

function o2tLoadSample() {
    const input = document.getElementById('o2tInput');
    if (input) input.value = O2T_SAMPLE;
    const baseEl = document.getElementById('o2tBaseUrl');
    if (baseEl && !baseEl.value.trim()) {
        baseEl.value = 'https://petstore.example.com/api';
    }
    o2tGenerate();
}

function o2tClear() {
    const input = document.getElementById('o2tInput');
    if (input) input.value = '';
    o2tSetOutput('', false);
    if (typeof setStatus === 'function') setStatus('已清空');
}

if (typeof window !== 'undefined') {
    window.o2tGenerate = o2tGenerate;
    window.o2tLoadSample = o2tLoadSample;
    window.o2tClear = o2tClear;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseOpenApi: parseOpenApi,
        generateTsClient: generateTsClient,
        o2tFnName: o2tFnName,
        o2tSchemaToTs: o2tSchemaToTs,
        o2tSafeIdent: o2tSafeIdent,
        O2T_SAMPLE: O2T_SAMPLE,
    };
}
