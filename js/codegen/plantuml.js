// PlantUML 类图生成器
// 核心纯函数(可被测试 require):
//   parseJavaToClasses(code)          -> [{name, type, fields, methods, parent, interfaces, generics, modifier}]
//   parseJsonToClasses(json)          -> [{name, fields, type:'class'}]
//   javaToPlantUml(code, opts)        -> PlantUML 源码(含 @startuml/@enduml)
//   jsonToPlantUml(jsonText, opts)    -> PlantUML 源码
//   plantumlEncodeSync(text)          -> PlantUML 自定义 URL-safe base64 字符串(Node 同步版)

const JAVA_MOD_KW =
    '(?:public|private|protected|static|final|abstract|synchronized|default|volatile|transient)';

// Java 常见基础/库类型：字段关联时跳过
const _PL_JAVA_SKIP_TYPES = new Set([
    'void',
    'boolean',
    'byte',
    'char',
    'short',
    'int',
    'long',
    'float',
    'double',
    'Boolean',
    'Byte',
    'Character',
    'Short',
    'Integer',
    'Long',
    'Float',
    'Double',
    'String',
    'Object',
    'Number',
    'Class',
    'Void',
    'BigDecimal',
    'BigInteger',
    'Date',
    'Calendar',
    'LocalDate',
    'LocalTime',
    'LocalDateTime',
    'ZonedDateTime',
    'OffsetDateTime',
    'Instant',
    'Duration',
    'Period',
    'UUID',
    'Optional',
    'List',
    'Set',
    'Map',
    'Collection',
    'Iterable',
    'Iterator',
    'ArrayList',
    'LinkedList',
    'HashSet',
    'TreeSet',
    'HashMap',
    'TreeMap',
    'LinkedHashMap',
    'LinkedHashSet',
    'ConcurrentHashMap',
    'Queue',
    'Deque',
    'Stack',
    'Vector',
    'Arrays',
    'Collections',
    'Stream',
    'Supplier',
    'Consumer',
    'Function',
    'Predicate',
    'Comparator',
    'Comparable',
    'Serializable',
    'Cloneable',
    'Runnable',
    'Callable',
    'Future',
    'CompletableFuture',
    'Exception',
    'RuntimeException',
    'Throwable',
    'Error',
    'StringBuilder',
    'StringBuffer',
    'CharSequence',
    'Enum',
    'Override',
    'Deprecated',
    'SuppressWarnings',
    'T',
    'E',
    'K',
    'V',
    'R',
    'U',
    'N',
]);

function _plStripComments(code) {
    let s = code.replace(/\/\*[\s\S]*?\*\//g, ' ');
    s = s.replace(/\/\/[^\n\r]*/g, ' ');
    return s;
}

function _plEscapeType(t) {
    return String(t == null ? '' : t)
        .trim()
        .replace(/\s+/g, ' ');
}

function _plCleanName(name) {
    return String(name == null ? '' : name)
        .trim()
        .replace(/\s+/g, '');
}

function _plVisibilitySymbol(modifiers) {
    if (!Array.isArray(modifiers) || !modifiers.length) return '+';
    if (modifiers.indexOf('private') >= 0) return '-';
    if (modifiers.indexOf('protected') >= 0) return '#';
    return '+';
}

function _plGenSuffix(modifiers) {
    if (!Array.isArray(modifiers)) return '';
    const tags = [];
    if (modifiers.indexOf('static') >= 0) tags.push('static');
    if (modifiers.indexOf('abstract') >= 0) tags.push('abstract');
    if (!tags.length) return '';
    if (tags.length === 1) return ' {' + tags[0] + '}';
    return ' {' + tags.join(',') + '}';
}

function _plParseField(text) {
    // text 已经去首尾空白,以 ';' 结尾
    const s = text.replace(/;$/, '').trim();
    // 先抽取修饰符列表(可能在签名之前)
    const mods = s.match(
        /^(?:\s*(?:public|private|protected|static|final|volatile|transient|synchronized|abstract))+/,
    );
    let body = s;
    let modifierList = [];
    if (mods) {
        modifierList = mods[0].trim().split(/\s+/).filter(Boolean);
        body = s.substring(mods[0].length).trim();
    }
    // 剩余:Type name [= init];类型/字段名支持中文标识符
    const bm = body.match(
        /^([A-Za-z_$\u4e00-\u9fff][\w$.<>,\[\] ?\u4e00-\u9fff]*)\s+([A-Za-z_$\u4e00-\u9fff][\w\u4e00-\u9fff]*)\s*(?:=\s*[^;]*)?$/,
    );
    if (!bm) return null;
    return {
        name: bm[2],
        type: bm[1].trim(),
        modifiers: modifierList,
    };
}

function _plParseEnumConstants(text) {
    // 处理 enum 内的常量行:RED, GREEN, BLUE;
    const s = text.replace(/;$/, '').trim();
    if (!/^[A-Z][A-Z0-9_]*(?:\s*,\s*[A-Z][A-Z0-9_]*)*$/.test(s)) return null;
    return s.split(/\s*,\s*/).map((name) => ({
        name: name,
        type: 'enum_const',
        modifiers: [],
    }));
}

function _plParseAbstractMethod(text, className) {
    // 抽象方法/接口方法:以 ';' 结尾
    const s = text.replace(/;$/, '').trim();
    const re = new RegExp(
        '^(?:(?<modifier>(?:public|private|protected|static|abstract|final|synchronized|default)(?:\\s+(?:public|private|protected|static|abstract|final|synchronized|default))*)\\s+)?' +
            '(?:(?<returnType>[A-Za-z_$\\u4e00-\\u9fff][\\w$.<>,\\[\\]?\\u4e00-\\u9fff]*)\\s+)?' +
            '(?<name>[A-Za-z_$\\u4e00-\\u9fff][\\w\\u4e00-\\u9fff]*)\\s*\\((?<params>[^)]*)\\)' +
            '(?:\\s*throws\\s+[A-Za-z_\\w.,\\s\\u4e00-\\u9fff]+)?$',
    );
    const m = s.match(re);
    if (!m) return null;
    const mname = m.groups.name;
    const isCtor = mname === className;
    return {
        name: mname,
        returnType: m.groups.returnType ? m.groups.returnType.trim() : isCtor ? '' : 'void',
        params: _plParseParams(m.groups.params || ''),
        isConstructor: isCtor,
        modifiers: (m.groups.modifier || '').trim().split(/\s+/).filter(Boolean),
    };
}

function _plParseMethod(text, className) {
    // text 以 '{' 结尾,可能多行
    // 取第一个 '{' 之前的部分作为签名
    const firstBrace = text.indexOf('{');
    if (firstBrace < 0) return null;
    const sigPart = text.substring(0, firstBrace).replace(/\s+/g, ' ').trim();
    // 去除末尾的分号(有时接口方法只有签名)
    const sigClean = sigPart.replace(/;$/, '').trim();
    // 简单语法:可选修饰符(单次捕获全部) 可选返回类型 name(params) 可选throws
    const re = new RegExp(
        '^(?:(?<modifier>(?:public|private|protected|static|abstract|final|synchronized|default)(?:\\s+(?:public|private|protected|static|abstract|final|synchronized|default))*)\\s+)?' +
            '(?:(?<returnType>[A-Za-z_$\\u4e00-\\u9fff][\\w$.<>,\\[\\]?\\u4e00-\\u9fff]*)\\s+)?' +
            '(?<name>[A-Za-z_$\\u4e00-\\u9fff][\\w\\u4e00-\\u9fff]*)\\s*\\((?<params>[^)]*)\\)' +
            '(?:\\s*throws\\s+[A-Za-z_\\w.,\\s\\u4e00-\\u9fff]+)?$',
    );
    const m = sigClean.match(re);
    if (!m) return null;
    const mname = m.groups.name;
    const isCtor = mname === className;
    const params = _plParseParams(m.groups.params || '');
    return {
        name: mname,
        returnType: m.groups.returnType ? m.groups.returnType.trim() : isCtor ? '' : 'void',
        params: params,
        isConstructor: isCtor,
        modifiers: (m.groups.modifier || '').trim().split(/\s+/).filter(Boolean),
    };
}

function _plParseParams(text) {
    const s = text.trim();
    if (!s) return [];
    // 简化处理:按逗号顶层拆分(忽略 <>(), []内的逗号)
    const out = [];
    let depth = 0;
    let buf = '';
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (c === '<' || c === '(' || c === '[') depth++;
        else if (c === '>' || c === ')' || c === ']') depth--;
        if (c === ',' && depth === 0) {
            if (buf.trim()) out.push(_plParseParam(buf.trim()));
            buf = '';
            continue;
        }
        buf += c;
    }
    if (buf.trim()) out.push(_plParseParam(buf.trim()));
    return out;
}

function _plParseParam(text) {
    const s = text.trim();
    // 形式 1: Type name
    // 形式 2: Type... name (varargs)
    // 形式 3: final Type name
    // 形式 4: 注解 @Foo Type name
    const m = s.match(/^(?:@?\w+(?:\([^)]*\))?\s+)*(?:(final\s+))?(.+?)\s+([A-Za-z_]\w*)$/);
    if (!m) return { name: s, type: '' };
    return {
        name: m[3],
        type: (m[2] || '').trim(),
    };
}

// 提取类主体:从开 '{' 起到对应的 '}'
function _plExtractClassBody(code, openIdx) {
    if (code[openIdx] !== '{') return null;
    let depth = 0;
    let inStr = false;
    let strCh = '';
    for (let i = openIdx; i < code.length; i++) {
        const c = code[i];
        if (inStr) {
            if (c === strCh && code[i - 1] !== '\\') inStr = false;
            continue;
        }
        if (c === '"' || c === "'") {
            inStr = true;
            strCh = c;
            continue;
        }
        if (c === '{') depth++;
        else if (c === '}') {
            depth--;
            if (depth === 0) return code.substring(openIdx + 1, i);
        }
    }
    return null;
}

// 在清理后文本中按成员拆分:返回 [{text, kind:'field'|'block'}]
function _plSplitMembers(body) {
    const members = [];
    let depth = 0;
    let buf = '';
    let inStr = false;
    let strCh = '';
    for (let i = 0; i < body.length; i++) {
        const c = body[i];
        if (inStr) {
            buf += c;
            if (c === strCh && body[i - 1] !== '\\') inStr = false;
            continue;
        }
        if (c === '"' || c === "'") {
            inStr = true;
            strCh = c;
            buf += c;
            continue;
        }
        if (c === '{') {
            depth++;
            buf += c;
            continue;
        }
        if (c === '}') {
            depth--;
            buf += c;
            if (depth === 0) {
                const t = buf.trim();
                if (t) members.push({ text: t, kind: 'block' });
                buf = '';
            }
            continue;
        }
        if (c === ';' && depth === 0) {
            buf += c;
            const t = buf.trim();
            if (t) members.push({ text: t, kind: 'field' });
            buf = '';
            continue;
        }
        buf += c;
    }
    // 末尾剩余(如 enum 常量末尾 ';')
    const tail = buf.trim();
    if (tail && tail.endsWith(';')) {
        members.push({ text: tail, kind: 'field' });
    }
    return members;
}

// 抽取接口/枚举/类头部完整修饰文本(matcher 函数返回完整头)
function _plMatchHeader(cleaned) {
    // 不使用 ^ 行首锚点,允许同一行/跨行多个类按顺序识别
    // 头修饰符使用单次命名捕获(覆盖所有修饰符),避免 named group 在 +/* 内只保留最后一次
    // 类名/父类支持中文(CJK 统一汉字)起始字符
    const re = new RegExp(
        '(?:(?<headMod>(?:public|private|protected|abstract|final|static)(?:\\s+(?:public|private|protected|abstract|final|static))*)\\s+)?' +
            '(?<type>class|interface|enum)' +
            '\\s+(?<name>[A-Z\\u4e00-\\u9fff][\\w\\u4e00-\\u9fff]*)' +
            '(?:<(?<generics>(?:[^<>]|<[^>]*>)*)>)?' +
            '(?:\\s+extends\\s+(?<parent>[A-Z\\u4e00-\\u9fff][\\w\\u4e00-\\u9fff]*)(?:<[^>]+>)?)?' +
            '(?:\\s+implements\\s+(?<interfaces>[^{]+?))?' +
            '\\s*\\{',
        'g',
    );
    const out = [];
    let m;
    while ((m = re.exec(cleaned)) !== null) {
        const g = m.groups || {};
        out.push({
            start: m.index,
            headerEnd: m.index + m[0].length - 1,
            type: g.type || '',
            name: g.name || '',
            generics: g.generics || '',
            parent: g.parent || '',
            interfaces: g.interfaces || '',
            modifier: g.headMod ? g.headMod.trim() : '',
        });
        if (m.index === re.lastIndex) re.lastIndex++;
    }
    return out;
}

function _plExtractPackage(cleaned) {
    const m = String(cleaned || '').match(/\bpackage\s+([A-Za-z_][\w.]*)\s*;/);
    return m ? m[1] : null;
}

function parseJavaToClasses(code) {
    if (!code || typeof code !== 'string') return [];
    const cleaned = _plStripComments(code);
    const headers = _plMatchHeader(cleaned);
    const classes = [];
    for (const h of headers) {
        const body = _plExtractClassBody(cleaned, h.headerEnd);
        if (body == null) continue;
        const members = _plSplitMembers(body);
        const fields = [];
        const methods = [];
        for (const m of members) {
            if (m.kind === 'field') {
                const stripped = m.text.replace(/;$/, '').trim();
                // enum 常量(单行多个):RED, GREEN, BLUE;
                if (/^[A-Z][A-Z0-9_]*(?:\s*,\s*[A-Z][A-Z0-9_]*)+$/.test(stripped)) {
                    const enums = _plParseEnumConstants(m.text);
                    if (enums) enums.forEach((e) => fields.push(e));
                    continue;
                }
                // 抽象方法/接口签名:以 ';' 结束且形如 method(params)
                if (/\([^)]*\)\s*$/.test(stripped)) {
                    const mtd = _plParseAbstractMethod(m.text, h.name);
                    if (mtd) {
                        methods.push(mtd);
                        continue;
                    }
                }
                const f = _plParseField(m.text);
                if (f) fields.push(f);
            } else if (m.kind === 'block') {
                const mtd = _plParseMethod(m.text, h.name);
                if (mtd) methods.push(mtd);
            }
        }
        const interfaces = h.interfaces
            ? h.interfaces
                  .split(',')
                  .map((s) => s.trim().replace(/<[^>]+>/g, ''))
                  .filter(Boolean)
            : [];
        classes.push({
            name: h.name,
            type: h.modifier && h.modifier.indexOf('abstract') >= 0 ? 'abstract' : h.type,
            fields: fields,
            methods: methods,
            parent: h.parent || null,
            interfaces: interfaces,
            generics: h.generics ? h.generics.split(',').map((s) => s.trim()) : [],
            modifier: h.modifier ? h.modifier.split(/\s+/).filter(Boolean) : [],
        });
    }
    return classes;
}

// JSON 解析:object/array → classes(嵌套对象推断关系)
function _plInferJsonTypeName(obj) {
    if (obj === null) return 'Object';
    if (Array.isArray(obj)) return 'Object';
    if (typeof obj !== 'object') return typeof obj;
    return 'Object';
}

function _plJsonScalarType(val) {
    if (val === null) return 'Object';
    if (typeof val === 'string') return 'String';
    if (typeof val === 'number') return Number.isInteger(val) ? 'Integer' : 'Number';
    if (typeof val === 'boolean') return 'Boolean';
    if (Array.isArray(val)) return 'List';
    if (typeof val === 'object') return 'Object';
    return 'String';
}

function _plCapitalize(s) {
    if (!s) return 'Object';
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// 常见缩写 → 全称(JSON 嵌套对象 key 推导类名时优先使用)
const _PL_JSON_KEY_ABBR = {
    addr: 'Address',
    address: 'Address',
    desc: 'Description',
    description: 'Description',
    info: 'Information',
    information: 'Information',
    pic: 'Picture',
    picture: 'Picture',
    img: 'Image',
    image: 'Image',
    btn: 'Button',
    button: 'Button',
    tel: 'Telephone',
    telephone: 'Telephone',
    phone: 'Phone',
    num: 'Number',
    number: 'Number',
    qty: 'Quantity',
    quantity: 'Quantity',
    pwd: 'Password',
    password: 'Password',
    usr: 'User',
    user: 'User',
    cfg: 'Config',
    config: 'Config',
    doc: 'Document',
    document: 'Document',
    msg: 'Message',
    message: 'Message',
    txt: 'Text',
    text: 'Text',
    stat: 'Statistics',
    statistics: 'Statistics',
    profile: 'Profile',
};

function _plClassNameFromKey(k) {
    if (!k) return 'Object';
    const lower = String(k).toLowerCase();
    if (_PL_JSON_KEY_ABBR[lower]) return _PL_JSON_KEY_ABBR[lower];
    return _plCapitalize(k);
}

function _plJsonItemClassName(key) {
    const base = String(key || '')
        .replace(/s$/i, '')
        .replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    return _plClassNameFromKey(base);
}

function parseJsonToClasses(json, opts) {
    opts = opts || {};
    const arr = Array.isArray(json) ? json : json && typeof json === 'object' ? [json] : [];
    const classesMap = new Map(); // name -> {name, fields:[{name, type, isNested}]}
    const parentChild = []; // [{parent, child, fieldName}]
    const created = new Set();
    const relSeen = new Set();

    function ensure(name) {
        const k = _plCleanName(name) || 'Object';
        if (!classesMap.has(k)) {
            classesMap.set(k, { name: k, fields: [], type: 'class' });
            created.add(k);
        }
        return classesMap.get(k);
    }

    function addRel(parent, child, fieldName) {
        const p = _plCleanName(parent);
        const c = _plCleanName(child);
        const f = fieldName || '';
        const key = p + '|' + c + '|' + f;
        if (!p || !c || relSeen.has(key)) return;
        relSeen.add(key);
        parentChild.push({ parent: p, child: c, fieldName: f });
    }

    function walk(obj, nameHint) {
        if (!obj || typeof obj !== 'object') return;
        const className =
            nameHint && /^[A-Z\u4e00-\u9fff][\w\u4e00-\u9fff]*$/.test(nameHint) ? nameHint : 'Object';
        const cls = ensure(className);
        for (const [k, v] of Object.entries(obj)) {
            if (v === null || typeof v !== 'object') {
                cls.fields.push({
                    name: k,
                    type: _plJsonScalarType(v),
                    isNested: false,
                });
            } else if (Array.isArray(v)) {
                if (v.length > 0 && typeof v[0] === 'object' && v[0] !== null) {
                    const itemName = _plJsonItemClassName(k);
                    cls.fields.push({ name: k, type: 'List<' + itemName + '>', isNested: true });
                    ensure(itemName);
                    addRel(className, itemName, k);
                    for (const item of v) {
                        walk(item, itemName);
                    }
                } else {
                    cls.fields.push({ name: k, type: 'List', isNested: false });
                }
            } else if (typeof v === 'object') {
                const nestedName = _plClassNameFromKey(k);
                cls.fields.push({ name: k, type: nestedName, isNested: true });
                addRel(className, nestedName, k);
                walk(v, nestedName);
            }
        }
    }

    arr.forEach((root, idx) => {
        if (!root || typeof root !== 'object') return;
        let rootName;
        if (opts.rootName && arr.length === 1 && !Array.isArray(json)) {
            rootName = _plCleanName(opts.rootName) || 'Root';
        } else if (arr.length === 1 && !Array.isArray(json)) {
            rootName = 'Root';
        } else {
            rootName = 'Root' + (idx + 1);
        }
        walk(root, rootName);
    });
    return {
        classes: Array.from(classesMap.values()),
        relations: parentChild,
    };
}

// PlantUML 输出辅助
function _plFormatParam(p) {
    if (!p) return '';
    const name = p.name || '';
    const type = _plEscapeType(p.type || '');
    if (type) return name + ': ' + type;
    return name;
}

function _plRenderClass(cls, opts) {
    const showFields = opts.showFields;
    const showMethods = opts.showMethods;
    const showCtors = opts.showConstructors;
    const showMods = opts.showModifiers;
    const showGen = opts.showGenerics;
    const lines = [];
    let header = '';
    if (cls.type === 'interface') {
        header = 'interface';
    } else if (cls.type === 'enum') {
        header = 'enum';
    } else if (cls.type === 'abstract') {
        header = 'abstract class';
    } else {
        header = 'class';
    }
    let genericsSuffix = '';
    if (showGen && cls.generics && cls.generics.length) {
        genericsSuffix = '<' + cls.generics.join(', ') + '>';
    }
    const clsName = _plCleanName(cls.name);
    lines.push(header + ' ' + clsName + genericsSuffix + ' {');
    if (cls.type === 'enum') {
        const seen = new Set();
        const consts = (cls.fields || []).filter((f) => /^[A-Z][A-Z0-9_]*$/.test(f.name));
        if (consts.length) {
            const names = consts.map((c) => c.name).filter((n) => !seen.has(n) && seen.add(n));
            if (names.length) lines.push('    ' + names.join(', '));
        }
    }
    if (showFields) {
        for (const f of cls.fields || []) {
            if (/^[A-Z][A-Z0-9_]*$/.test(f.name) && cls.type === 'enum') continue;
            const vis = showMods ? _plVisibilitySymbol(f.modifiers || []) : '';
            const suffix = showMods ? _plGenSuffix(f.modifiers || []) : '';
            lines.push('    ' + vis + f.name + suffix + ': ' + _plEscapeType(f.type));
        }
    }
    if (showMethods) {
        for (const m of cls.methods || []) {
            if (m.isConstructor && !showCtors) continue;
            if (!m.isConstructor && m.name === cls.name && showCtors === false) continue;
            const vis = showMods ? _plVisibilitySymbol(m.modifiers || []) : '';
            const suffix = showMods ? _plGenSuffix(m.modifiers || []) : '';
            const params = (m.params || []).map(_plFormatParam).join(', ');
            const ret = m.isConstructor ? '' : ': ' + _plEscapeType(m.returnType || 'void');
            let sig = vis + m.name + '(' + params + ')';
            if (!m.isConstructor) sig += ret;
            lines.push('    ' + sig + suffix);
        }
    }
    lines.push('}');
    return lines.join('\n');
}

function _plRenderInheritRelations(classes) {
    const rels = [];
    const seen = new Set();
    for (const cls of classes) {
        const name = _plCleanName(cls.name);
        if (cls.parent && !(cls.interfaces || []).includes(cls.parent)) {
            const line = _plCleanName(cls.parent) + ' <|-- ' + name;
            if (!seen.has(line)) {
                seen.add(line);
                rels.push(line);
            }
        }
        for (const i of cls.interfaces || []) {
            if (i === cls.parent) continue;
            const line = _plCleanName(i) + ' <|.. ' + name;
            if (!seen.has(line)) {
                seen.add(line);
                rels.push(line);
            }
        }
    }
    return rels;
}

// 从字段类型中提取可能的关联类名（List<Foo> → Foo，简单类型名匹配）
function _plExtractAssocTypeNames(typeStr) {
    const s = String(typeStr || '')
        .trim()
        .replace(/\s+/g, '');
    if (!s || s === 'enum_const') return [];
    const names = [];
    // 收集标识符（跳过关键字式小写原生类型会在后续过滤）
    const re = /[A-Za-z_$\u4e00-\u9fff][\w$\u4e00-\u9fff]*/g;
    let m;
    while ((m = re.exec(s)) !== null) {
        names.push(m[0]);
    }
    return names;
}

function _plRenderFieldAssociations(classes) {
    const classNames = new Set(classes.map((c) => _plCleanName(c.name)));
    const rels = [];
    const seen = new Set();
    for (const cls of classes) {
        const from = _plCleanName(cls.name);
        for (const f of cls.fields || []) {
            if (!f || !f.type || f.type === 'enum_const') continue;
            const candidates = _plExtractAssocTypeNames(f.type);
            for (const raw of candidates) {
                const to = _plCleanName(raw);
                if (!to || to === from) continue;
                if (_PL_JAVA_SKIP_TYPES.has(to)) continue;
                if (!classNames.has(to)) continue;
                const line = from + ' --> ' + to + ' : ' + f.name;
                if (seen.has(line)) continue;
                seen.add(line);
                rels.push(line);
            }
        }
    }
    return rels;
}

function _plUmlPreamble(opts) {
    const lines = ['@startuml'];
    if (opts.skin !== false) {
        lines.push('skinparam classAttributeIconSize 0');
        lines.push('skinparam monochrome false');
        lines.push('hide empty members');
    }
    if (opts.direction === 'lr') {
        lines.push('left to right direction');
    }
    return lines;
}

function _plEmptyUml(opts, note) {
    const parts = _plUmlPreamble(opts || {});
    if (note) {
        parts.push('note "' + String(note).replace(/"/g, "'") + '" as N1');
    }
    parts.push('@enduml');
    return parts.join('\n') + '\n';
}

function javaToPlantUml(code, opts) {
    opts = opts || {};
    const cleaned = typeof code === 'string' ? _plStripComments(code) : '';
    const classes = parseJavaToClasses(code);
    if (!classes.length) {
        // 保持空输入最小输出；有内容但未解析到类时给出 note
        if (!code || !String(code).trim()) {
            return '@startuml\n@enduml\n';
        }
        return _plEmptyUml(opts, '未解析到类/接口/枚举定义');
    }
    const blocks = classes.map((cls) => _plRenderClass(cls, opts));
    const inheritRels = _plRenderInheritRelations(classes);
    const assocRels = opts.showAssociations !== false ? _plRenderFieldAssociations(classes) : [];
    const allRels = inheritRels.concat(assocRels);
    // 关系去重
    const relSeen = new Set();
    const relLines = allRels.filter((r) => {
        if (relSeen.has(r)) return false;
        relSeen.add(r);
        return true;
    });

    const parts = _plUmlPreamble(opts);
    const pkg = opts.showPackage !== false ? _plExtractPackage(cleaned) : null;
    if (pkg) {
        parts.push('package ' + pkg + ' {');
        parts.push(blocks.join('\n'));
        parts.push('}');
    } else {
        parts.push(blocks.join('\n'));
    }
    if (relLines.length) parts.push(relLines.join('\n'));
    parts.push('@enduml');
    return parts.join('\n') + '\n';
}

function jsonToPlantUml(jsonText, opts) {
    opts = opts || {};
    let parsed;
    try {
        parsed = typeof jsonText === 'string' ? JSON.parse(jsonText) : jsonText;
    } catch (e) {
        if (!jsonText || !String(jsonText).trim()) {
            return '@startuml\n@enduml\n';
        }
        return _plEmptyUml(opts, 'JSON 解析失败');
    }
    const { classes, relations } = parseJsonToClasses(parsed, opts);
    if (!classes.length) {
        if (jsonText == null || (typeof jsonText === 'string' && !jsonText.trim())) {
            return '@startuml\n@enduml\n';
        }
        return _plEmptyUml(opts, '未从 JSON 推断出类结构');
    }
    // 字段直接渲染
    const blocks = classes.map((cls) => {
        const lines = ['class ' + _plCleanName(cls.name) + ' {'];
        for (const f of cls.fields) {
            lines.push('    +' + f.name + ': ' + f.type);
        }
        lines.push('}');
        return lines.join('\n');
    });
    const relSeen = new Set();
    const relLines = [];
    for (const r of relations) {
        const fieldPart = r.fieldName ? ' : ' + r.fieldName : '';
        const line = r.parent + ' "1" *-- "0..*" ' + r.child + fieldPart;
        if (relSeen.has(line)) continue;
        relSeen.add(line);
        relLines.push(line);
    }
    const parts = _plUmlPreamble(opts);
    parts.push(blocks.join('\n'));
    if (relLines.length) parts.push(relLines.join('\n'));
    parts.push('@enduml');
    return parts.join('\n') + '\n';
}

// PlantUML 自定义 URL-safe base64 编码(同步:Node 测试用 zlib;异步:浏览器 CompressionStream)
function plantumlEncodeSync(text) {
    if (text == null || text === '') return '';
    const zlib = require('zlib');
    const compressed = zlib.deflateRawSync(Buffer.from(text, 'utf8'));
    return compressed
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function _plB64UrlSafe(uint8) {
    let bin = '';
    for (let i = 0; i < uint8.length; i++) bin += String.fromCharCode(uint8[i]);
    // 在现代浏览器 globalThis.btoa 可用;若不可用则通过 Buffer 回退(不可能发生在浏览器)
    if (typeof btoa !== 'undefined') {
        return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    return Buffer.from(uint8)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function plantumlEncode(text) {
    if (text == null) return Promise.resolve('');
    if (typeof CompressionStream === 'undefined') {
        // 降级为 Node 风格同步返回(兼容 jsdom/老版本)
        return Promise.resolve(plantumlEncodeSync(text));
    }
    const data = new TextEncoder().encode(text);
    const stream = new Blob([data]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    return new Response(stream).arrayBuffer().then((buf) => _plB64UrlSafe(new Uint8Array(buf)));
}

// ========== UI ==========

function plInit() {
    const srcType = document.getElementById('plSrcType');
    if (srcType) srcType.addEventListener('change', plToggleSourceHint);
    const srcEl = document.getElementById('plSrcInput');
    if (srcEl) {
        if (!srcEl.value.trim()) {
            srcEl.value = plSampleJava();
            const typeEl = document.getElementById('plSrcType');
            if (typeEl) typeEl.value = 'java';
        }
        const debounced = debounce(plGenerate, 800);
        srcEl.addEventListener('input', debounced);
        srcEl.addEventListener('change', debounced);
    }
    [
        'plOptFields',
        'plOptMethods',
        'plOptCtors',
        'plOptMods',
        'plOptGens',
        'plOptAssoc',
        'plOptSkin',
    ].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', plGenerate);
    });
    const btnGen = document.getElementById('plBtnGen');
    if (btnGen) btnGen.addEventListener('click', plGenerate);
    const btnReset = document.getElementById('plBtnReset');
    if (btnReset) btnReset.addEventListener('click', plResetPreview);
    const btnCopy = document.getElementById('plBtnCopy');
    if (btnCopy) btnCopy.addEventListener('click', () => copyText('plOutput'));
    const btnDl = document.getElementById('plBtnDownload');
    if (btnDl) btnDl.addEventListener('click', plDownloadPuml);
    const btnJava = document.getElementById('plBtnSampleJava');
    if (btnJava) btnJava.addEventListener('click', plLoadSample);
    const btnJson = document.getElementById('plBtnSampleJson');
    if (btnJson) btnJson.addEventListener('click', plLoadSampleJson);
    const img = document.getElementById('plPreview');
    if (img) {
        img.addEventListener('click', () => {
            if (img.src) window.open(img.src, '_blank', 'noopener');
        });
        img.style.cursor = 'zoom-in';
        img.title = '点击放大查看';
    }
    plGenerate();
    setStatus('PlantUML 工具就绪');
}

function plDownloadPuml() {
    const outEl = document.getElementById('plOutput');
    const text = outEl ? outEl.value : '';
    if (!text || !text.trim()) {
        if (typeof toast === 'function') toast('暂无 PlantUML 源码可下载', 'warn');
        return;
    }
    if (typeof downloadBlob === 'function') {
        downloadBlob('diagram.puml', new Blob([text], { type: 'text/plain;charset=utf-8' }));
        if (typeof toast === 'function') toast('已下载 diagram.puml', 'ok');
    } else if (typeof toast === 'function') {
        toast('下载功能不可用', 'err');
    }
}

function plShowPreviewLoading() {
    const placeholder = document.getElementById('plPreviewPlaceholder');
    const errBox = document.getElementById('plPreviewError');
    const img = document.getElementById('plPreview');
    if (img) {
        img.style.display = 'none';
        img.removeAttribute('src');
    }
    if (errBox) {
        errBox.style.display = 'none';
        errBox.innerHTML = '';
    }
    if (placeholder) {
        placeholder.style.display = 'flex';
        placeholder.innerHTML =
            '<div><i class="bi bi-hourglass-split pl-spin"></i><div>正在生成预览…</div></div>';
    }
}

function plShowPreviewError(msg) {
    const placeholder = document.getElementById('plPreviewPlaceholder');
    const errBox = document.getElementById('plPreviewError');
    const img = document.getElementById('plPreview');
    if (img) {
        img.style.display = 'none';
        img.removeAttribute('src');
    }
    if (placeholder) placeholder.style.display = 'none';
    if (errBox) {
        errBox.style.display = 'flex';
        errBox.innerHTML =
            '<div><i class="bi bi-x-circle"></i><div>' + escapeHtml(msg) + '</div></div>';
    }
}

function plResetPreview() {
    const placeholder = document.getElementById('plPreviewPlaceholder');
    const errBox = document.getElementById('plPreviewError');
    const img = document.getElementById('plPreview');
    if (img) {
        img.removeAttribute('src');
        img.style.display = 'none';
    }
    if (placeholder) {
        placeholder.style.display = 'flex';
        placeholder.innerHTML =
            '<div><i class="bi bi-arrow-clockwise"></i><div>已重置,请先生成</div></div>';
    }
    if (errBox) {
        errBox.style.display = 'none';
        errBox.innerHTML = '';
    }
}

function plSampleJava() {
    return [
        'package com.example.pet;',
        '',
        'public abstract class Animal {',
        '    protected String name;',
        '',
        '    public Animal(String name) {',
        '        this.name = name;',
        '    }',
        '',
        '    public abstract String speak();',
        '}',
        '',
        'public interface Eater {',
        '    void eat(Food food);',
        '}',
        '',
        'public class Food {',
        '    private String name;',
        '    private int calories;',
        '',
        '    public Food(String name, int calories) {',
        '        this.name = name;',
        '        this.calories = calories;',
        '    }',
        '}',
        '',
        'public class Dog extends Animal implements Eater {',
        '    private String breed;',
        '    private Food favorite;',
        '',
        '    public Dog(String name, String breed) {',
        '        super(name);',
        '        this.breed = breed;',
        '    }',
        '',
        '    @Override',
        '    public String speak() {',
        '        return "Woof";',
        '    }',
        '',
        '    @Override',
        '    public void eat(Food food) {',
        '        this.favorite = food;',
        '    }',
        '}',
    ].join('\n');
}

function plSampleJson() {
    return JSON.stringify(
        {
            id: 1,
            name: '张三',
            active: true,
            tags: ['a', 'b'],
            items: [{ sku: 'A1', qty: 2 }],
            address: {
                city: '上海',
                zip: '200000',
            },
        },
        null,
        2,
    );
}

function plLoadSample() {
    const src = document.getElementById('plSrcInput');
    const typeEl = document.getElementById('plSrcType');
    if (src) src.value = plSampleJava();
    if (typeEl) typeEl.value = 'java';
    plGenerate();
}

function plLoadSampleJson() {
    const src = document.getElementById('plSrcInput');
    const typeEl = document.getElementById('plSrcType');
    if (src) src.value = plSampleJson();
    if (typeEl) typeEl.value = 'json';
    plGenerate();
}

function plToggleSourceHint() {
    const t = document.getElementById('plSrcType');
    const src = document.getElementById('plSrcInput');
    if (!t || !src) return;
    if (t.value === 'java' && !src.value.trim()) src.value = plSampleJava();
    if (t.value === 'json' && !src.value.trim()) src.value = plSampleJson();
    plGenerate();
}

function _plReadOpts() {
    const skinEl = document.getElementById('plOptSkin');
    const assocEl = document.getElementById('plOptAssoc');
    return {
        showFields: !!(document.getElementById('plOptFields') || {}).checked,
        showMethods: !!(document.getElementById('plOptMethods') || {}).checked,
        showConstructors: !!(document.getElementById('plOptCtors') || {}).checked,
        showModifiers: !!(document.getElementById('plOptMods') || {}).checked,
        showGenerics: !!(document.getElementById('plOptGens') || {}).checked,
        showAssociations: assocEl ? !!assocEl.checked : true,
        skin: skinEl ? !!skinEl.checked : true,
    };
}

function plGenerate() {
    const srcTypeEl = document.getElementById('plSrcType');
    const srcEl = document.getElementById('plSrcInput');
    const outEl = document.getElementById('plOutput');
    const img = document.getElementById('plPreview');
    const placeholder = document.getElementById('plPreviewPlaceholder');
    const errBox = document.getElementById('plPreviewError');
    const openLink = document.getElementById('plOpenLink');

    if (!srcTypeEl || !srcEl || !outEl) return;
    const srcType = srcTypeEl.value;
    const src = srcEl.value;
    const opts = _plReadOpts();

    let uml = '';
    let errMsg = '';
    if (!src.trim()) {
        errMsg = '请输入 Java 源码或 JSON';
    } else if (srcType === 'java') {
        try {
            uml = javaToPlantUml(src, opts);
            if (uml.indexOf('未解析到类') >= 0) {
                errMsg = '未解析到类/接口/枚举，请检查源码格式';
            }
        } catch (e) {
            errMsg = 'Java 解析失败: ' + ((e && e.message) || String(e));
        }
    } else if (srcType === 'json') {
        try {
            uml = jsonToPlantUml(src, opts);
            if (uml.indexOf('JSON 解析失败') >= 0) {
                errMsg = 'JSON 解析失败，请检查语法';
            } else if (uml.indexOf('未从 JSON 推断') >= 0) {
                errMsg = '未能从 JSON 推断出类结构';
            }
        } catch (e) {
            errMsg = 'JSON 解析失败: ' + ((e && e.message) || String(e));
        }
    } else {
        errMsg = '未知源类型';
    }

    if (uml) outEl.value = uml;
    else outEl.value = '';

    if (errMsg) {
        plShowPreviewError(errMsg);
        if (openLink) openLink.removeAttribute('href');
        return;
    }

    if (!uml || uml.indexOf('@startuml') < 0) {
        if (img) img.style.display = 'none';
        if (errBox) errBox.style.display = 'none';
        if (placeholder) {
            placeholder.style.display = 'flex';
            placeholder.innerHTML =
                '<div><i class="bi bi-info-circle"></i><div>请先生成内容后再预览</div></div>';
        }
        return;
    }

    plShowPreviewLoading();

    plantumlEncode(uml)
        .then((encoded) => {
            if (!encoded) {
                plShowPreviewError('编码失败: 输出为空');
                return;
            }
            const svgUrl = 'https://www.plantuml.com/plantuml/svg/' + encoded;
            const umlUrl = 'https://www.plantuml.com/plantuml/uml/' + encoded;
            if (img) {
                img.onerror = () => {
                    plShowPreviewError('预览加载失败: 网络不可达或 plantuml.com 无响应，请稍后重试');
                };
                img.onload = () => {
                    if (placeholder) placeholder.style.display = 'none';
                    if (errBox) errBox.style.display = 'none';
                    img.style.display = 'block';
                };
                img.src = svgUrl;
            }
            if (openLink) {
                openLink.href = umlUrl;
                openLink.style.pointerEvents = 'auto';
                openLink.style.opacity = '1';
            }
        })
        .catch((e) => {
            plShowPreviewError('编码失败: ' + ((e && e.message) || String(e)));
        });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseJavaToClasses,
        parseJsonToClasses,
        javaToPlantUml,
        jsonToPlantUml,
        plantumlEncodeSync,
        plantumlEncode,
    };
}

if (typeof registerInit !== 'undefined') {
    registerInit('plantuml', plInit);
}
