// Feign / 接口调用代码生成
// 纯函数: parseApiSpec / generateFeignClient / parseControllerMethods

/**
 * 解析伪 REST / 方法签名列表
 * 支持格式：
 *   GET /api/users/{id} getById
 *   POST /api/users create UserDTO
 *   UserDTO getById(Long id)
 *   @GetMapping("/users/{id}") UserDTO get(@PathVariable Long id)
 * @param {string} text
 * @returns {{methods:Array, classNameHint:string}}
 */
function parseApiSpec(text) {
    const methods = [];
    let classNameHint = '';
    if (!text || !String(text).trim()) return { methods: methods, classNameHint: classNameHint };

    const lines = String(text)
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split(/\r?\n/);

    let pendingMapping = null;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].replace(/\/\/.*$/, '').trim();
        if (!line) continue;

        // interface / class 名
        const iface = line.match(/\b(?:interface|class)\s+([A-Za-z_$][\w$]*)/);
        if (iface) {
            classNameHint = iface[1].replace(/Controller$/, '');
            continue;
        }

        // Spring 映射注解
        const mapAnno = line.match(
            /@(Get|Post|Put|Delete|Patch)Mapping\s*(?:\(\s*(?:value\s*=\s*)?["']([^"']*)["']\s*\))?/i,
        );
        if (mapAnno) {
            pendingMapping = {
                httpMethod: mapAnno[1].toUpperCase(),
                path: mapAnno[2] || '',
            };
            continue;
        }
        const reqMap = line.match(
            /@RequestMapping\s*\(\s*(?:value\s*=\s*)?["']([^"']*)["'](?:\s*,\s*method\s*=\s*RequestMethod\.(\w+))?/i,
        );
        if (reqMap) {
            pendingMapping = {
                httpMethod: (reqMap[2] || 'GET').toUpperCase(),
                path: reqMap[1] || '',
            };
            continue;
        }

        // REST 简写：METHOD path [methodName] [ReturnType]
        const rest = line.match(
            /^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+(\S+)(?:\s+([A-Za-z_$][\w$]*))?(?:\s+([A-Za-z_$][\w$.<>\[\],\s]+))?$/i,
        );
        if (rest) {
            const httpMethod = rest[1].toUpperCase();
            const path = rest[2];
            let methodName = rest[3] || fgInferMethodName(httpMethod, path);
            let returnType = (rest[4] || 'Object').trim();
            // 若第三段像类型（首字母大写且无小写方法特征），可能是返回类型
            if (rest[3] && /^[A-Z]/.test(rest[3]) && !rest[4] && /DTO|VO|Entity|List|Page|String|Long|Integer|Void|Response/.test(rest[3])) {
                returnType = rest[3];
                methodName = fgInferMethodName(httpMethod, path);
            }
            methods.push({
                httpMethod: httpMethod,
                path: path,
                methodName: methodName,
                returnType: returnType,
                params: fgInferPathParams(path),
            });
            pendingMapping = null;
            continue;
        }

        // Java 方法签名（可跟 pending mapping）
        const sig = line.match(
            /^(?:public\s+|protected\s+|private\s+)?(?:static\s+)?([A-Za-z_$][\w$.<>\[\],\s?]+)\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*;?\s*$/,
        );
        if (sig) {
            const returnType = sig[1].trim();
            const methodName = sig[2].trim();
            if (/^(class|interface|if|for|while|switch|return|new)$/.test(returnType)) continue;
            const params = fgParseParams(sig[3]);
            let httpMethod = 'GET';
            let path = '/' + methodName;
            if (pendingMapping) {
                httpMethod = pendingMapping.httpMethod;
                path = pendingMapping.path || path;
                pendingMapping = null;
            } else {
                httpMethod = fgInferHttpFromName(methodName);
                path = fgInferPathFromMethod(methodName, params);
            }
            // 合并 path 变量
            const pathParams = fgInferPathParams(path);
            pathParams.forEach(function (pp) {
                if (
                    !params.some(function (p) {
                        return p.name === pp.name;
                    })
                ) {
                    params.unshift(pp);
                }
            });
            methods.push({
                httpMethod: httpMethod,
                path: path,
                methodName: methodName,
                returnType: returnType,
                params: params,
            });
            continue;
        }
    }

    return { methods: methods, classNameHint: classNameHint };
}

/**
 * 从 Controller 风格文本解析（别名）
 * @param {string} text
 * @returns {{methods:Array, classNameHint:string}}
 */
function parseControllerMethods(text) {
    return parseApiSpec(text);
}

function fgInferMethodName(http, path) {
    const segs = String(path || '')
        .split('/')
        .filter(function (s) {
            return s && s[0] !== '{';
        });
    const last = segs[segs.length - 1] || 'resource';
    const base = last.replace(/[^A-Za-z0-9_]/g, '');
    const map = {
        GET: 'get',
        POST: 'create',
        PUT: 'update',
        DELETE: 'delete',
        PATCH: 'patch',
    };
    const prefix = map[http] || 'call';
    const pascal = base.charAt(0).toUpperCase() + base.slice(1);
    if (http === 'GET' && /\{/.test(path)) return 'getById';
    if (http === 'GET') return 'list' + pascal;
    return prefix + pascal;
}

function fgInferHttpFromName(name) {
    const n = name.toLowerCase();
    if (/^(get|find|query|list|load|fetch|select)/.test(n)) return 'GET';
    if (/^(create|add|save|insert|post)/.test(n)) return 'POST';
    if (/^(update|modify|edit|put)/.test(n)) return 'PUT';
    if (/^(delete|remove|del)/.test(n)) return 'DELETE';
    if (/^(patch)/.test(n)) return 'PATCH';
    return 'GET';
}

function fgInferPathFromMethod(name, params) {
    const n = name.replace(/^(get|find|query|list|create|add|save|update|delete|remove)/i, '');
    const pathBase = '/' + (n ? n.charAt(0).toLowerCase() + n.slice(1) : name);
    const idParam = (params || []).find(function (p) {
        return /id$/i.test(p.name) || p.name === 'id';
    });
    if (idParam) return pathBase + '/{' + idParam.name + '}';
    return pathBase;
}

function fgInferPathParams(path) {
    const params = [];
    const re = /\{([A-Za-z_$][\w$]*)\}/g;
    let m;
    while ((m = re.exec(path))) {
        params.push({
            name: m[1],
            type: /id$/i.test(m[1]) ? 'Long' : 'String',
            kind: 'path',
        });
    }
    return params;
}

function fgParseParams(raw) {
    const params = [];
    if (!raw || !raw.trim()) return params;
    // 简单按逗号拆（忽略泛型内逗号的粗糙处理）
    const parts = [];
    let buf = '';
    let depth = 0;
    for (let i = 0; i < raw.length; i++) {
        const ch = raw[i];
        if (ch === '<') depth++;
        if (ch === '>') depth = Math.max(0, depth - 1);
        if (ch === ',' && depth === 0) {
            parts.push(buf.trim());
            buf = '';
            continue;
        }
        buf += ch;
    }
    if (buf.trim()) parts.push(buf.trim());

    parts.forEach(function (part) {
        let kind = 'query';
        let type = 'String';
        let name = 'arg';
        if (/@PathVariable/.test(part)) kind = 'path';
        else if (/@RequestBody/.test(part)) kind = 'body';
        else if (/@RequestParam/.test(part)) kind = 'query';
        else if (/@RequestHeader/.test(part)) kind = 'header';

        const cleaned = part
            .replace(/@\w+(?:\([^)]*\))?/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        const m = cleaned.match(/^([A-Za-z_$][\w$.<>\[\],\s?]*)\s+([A-Za-z_$][\w$]*)$/);
        if (m) {
            type = m[1].trim();
            name = m[2].trim();
        } else {
            const only = cleaned.match(/^([A-Za-z_$][\w$]*)$/);
            if (only) name = only[1];
        }
        // 无注解时：复杂类型当 body
        if (kind === 'query' && !/@/.test(part)) {
            if (/DTO|VO|Entity|Request|Body|Form|Command/i.test(type) || /^(Map|List|Set)</.test(type)) {
                kind = 'body';
            } else if (/id$/i.test(name)) {
                kind = 'path';
            }
        }
        params.push({ name: name, type: type, kind: kind });
    });
    return params;
}

/**
 * 生成 @FeignClient 接口
 * @param {object|string} spec parseApiSpec 结果或原始文本
 * @param {object} [options]
 * @param {string} [options.clientName]
 * @param {string} [options.serviceName] spring.application.name
 * @param {string} [options.url]
 * @param {string} [options.path] context path 前缀
 * @param {string} [options.packageName]
 * @param {string} [options.configuration]
 * @returns {string}
 */
function generateFeignClient(spec, options) {
    options = options || {};
    const parsed = typeof spec === 'string' ? parseApiSpec(spec) : spec || { methods: [] };
    const methods = parsed.methods || [];
    const packageName = (options.packageName || '').trim();
    const clientName =
        (options.clientName || '').trim() ||
        (parsed.classNameHint ? parsed.classNameHint + 'Client' : 'RemoteClient');
    const serviceName = (options.serviceName || '').trim() || 'remote-service';
    const url = (options.url || '').trim();
    const basePath = (options.path || '').trim();
    const configuration = (options.configuration || '').trim();

    let code = '';
    if (packageName) code += 'package ' + packageName + ';\n\n';

    code += 'import org.springframework.cloud.openfeign.FeignClient;\n';
    code += 'import org.springframework.web.bind.annotation.*;\n\n';

    // 可能用到的类型 import 略（保持简单）
    let anno = '@FeignClient(name = "' + serviceName + '"';
    if (url) anno += ', url = "' + url + '"';
    if (basePath) anno += ', path = "' + basePath + '"';
    if (configuration) anno += ', configuration = ' + configuration + '.class';
    anno += ')\n';

    code += anno;
    code += 'public interface ' + clientName + ' {\n\n';

    if (!methods.length) {
        code += '    // 未识别到方法，请检查输入格式\n';
    }

    methods.forEach(function (m) {
        const mapping = fgMappingAnno(m.httpMethod, m.path);
        code += '    ' + mapping + '\n';
        const params = (m.params || [])
            .map(function (p) {
                return fgParamAnno(p) + p.type + ' ' + p.name;
            })
            .join(', ');
        code += '    ' + m.returnType + ' ' + m.methodName + '(' + params + ');\n\n';
    });

    code += '}\n';
    return code;
}

function fgMappingAnno(http, path) {
    const map = {
        GET: 'GetMapping',
        POST: 'PostMapping',
        PUT: 'PutMapping',
        DELETE: 'DeleteMapping',
        PATCH: 'PatchMapping',
    };
    const anno = map[http] || 'RequestMapping';
    if (!path) return '@' + anno;
    return '@' + anno + '("' + path + '")';
}

function fgParamAnno(p) {
    if (p.kind === 'path') return '@PathVariable("' + p.name + '") ';
    if (p.kind === 'body') return '@RequestBody ';
    if (p.kind === 'header') return '@RequestHeader("' + p.name + '") ';
    return '@RequestParam("' + p.name + '") ';
}

// ========== UI ==========

function fgGenerate() {
    const input = document.getElementById('fgInput').value;
    const out = document.getElementById('fgOutput');
    try {
        const code = generateFeignClient(input, {
            packageName: document.getElementById('fgPackage').value,
            clientName: document.getElementById('fgClientName').value,
            serviceName: document.getElementById('fgServiceName').value,
            url: document.getElementById('fgUrl').value,
            path: document.getElementById('fgPath').value,
        });
        out.textContent = code;
        out.className = 'output-box';
        const n = parseApiSpec(input).methods.length;
        setStatus('已生成 Feign Client，' + n + ' 个方法');
    } catch (e) {
        out.textContent = '失败: ' + e.message;
        out.className = 'output-box error';
        setStatus('生成失败');
    }
}

function fgClear() {
    document.getElementById('fgInput').value = '';
    document.getElementById('fgOutput').textContent = '';
    setStatus('已清空');
}

function fgLoadSample() {
    document.getElementById('fgInput').value = [
        'GET /api/users/{id} getById UserDTO',
        'GET /api/users listUsers List<UserDTO>',
        'POST /api/users createUser UserDTO',
        'PUT /api/users/{id} updateUser UserDTO',
        'DELETE /api/users/{id} deleteUser void',
        '',
        '// 或 Controller 风格：',
        '@GetMapping("/orders/{id}")',
        'OrderDTO getOrder(@PathVariable Long id);',
        '@PostMapping("/orders")',
        'OrderDTO createOrder(@RequestBody OrderDTO body);',
    ].join('\n');
    document.getElementById('fgServiceName').value = 'user-service';
    document.getElementById('fgClientName').value = 'UserClient';
    document.getElementById('fgPackage').value = 'com.example.client';
    setStatus('已加载示例');
}

if (typeof registerInit !== 'undefined') {
    registerInit('feigngen', function () {});
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseApiSpec: parseApiSpec,
        parseControllerMethods: parseControllerMethods,
        generateFeignClient: generateFeignClient,
        fgInferMethodName: fgInferMethodName,
        fgParseParams: fgParseParams,
    };
}
