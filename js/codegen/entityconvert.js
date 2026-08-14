// Entity ↔ DTO ↔ VO 转换器
// 纯函数: parseJavaFields / generateJavaClass

/**
 * 解析 Java 类字段（支持 class 体或纯字段列表）
 * @param {string} text
 * @returns {{className:string, packageName:string, fields:Array<{name:string,type:string,comment:string}>}}
 */
function parseJavaFields(text) {
    const result = { className: '', packageName: '', fields: [] };
    if (!text || !String(text).trim()) return result;

    let raw = String(text);
    raw = raw.replace(/\/\*[\s\S]*?\*\//g, function (m) {
        // 保留简单 Javadoc 作为下一字段 comment 的候选
        return m;
    });

    const pkgMatch = raw.match(/^\s*package\s+([\w.]+)\s*;/m);
    if (pkgMatch) result.packageName = pkgMatch[1];

    const classMatch = raw.match(
        /\b(?:public\s+|protected\s+|private\s+)?(?:static\s+)?(?:final\s+)?class\s+([A-Za-z_$][\w$]*)\s*(?:extends\s+[\w.<>,\s]+)?(?:implements\s+[\w.<>,\s]+)?\s*\{/,
    );
    let body = raw;
    if (classMatch) {
        result.className = classMatch[1];
        const openIdx = raw.indexOf('{', classMatch.index);
        if (openIdx >= 0) {
            let depth = 0;
            let end = -1;
            for (let i = openIdx; i < raw.length; i++) {
                if (raw[i] === '{') depth++;
                else if (raw[i] === '}') {
                    depth--;
                    if (depth === 0) {
                        end = i;
                        break;
                    }
                }
            }
            body = end > openIdx ? raw.slice(openIdx + 1, end) : raw.slice(openIdx + 1);
        }
    }

    // 按行再按分号拆，支持单行多字段
    const chunks = [];
    let pendingComment = '';
    body.split(/\r?\n/).forEach(function (line) {
        const jd = line.match(/^\s*\/\*\*?\s*(.*?)\s*\*\/\s*$/);
        if (jd) {
            pendingComment = jd[1].replace(/^\*\s*/, '').trim();
            return;
        }
        const lineComment = line.match(/\/\/\s*(.*)$/);
        let inlineComment = '';
        if (lineComment && !/^\s*\/\//.test(line)) {
            inlineComment = lineComment[1].trim();
            line = line.replace(/\/\/.*$/, '');
        }
        line.split(';').forEach(function (part) {
            const t = part.replace(/\/\*[\s\S]*?\*\//g, '').trim();
            if (t) chunks.push({ text: t, comment: pendingComment || inlineComment || '' });
            pendingComment = '';
            inlineComment = '';
        });
    });

    const fieldRe =
        /^(?:(?:public|private|protected|static|final|transient|volatile)\s+)*([A-Za-z_$][\w$.<>\[\],\s?]*)\s+([A-Za-z_$][\w$]*)\s*(?:=\s*[^;]+)?\s*$/;

    for (let i = 0; i < chunks.length; i++) {
        let line = chunks[i].text;
        if (!line) continue;
        if (line.startsWith('@')) continue;
        if (line.startsWith('//') || line.startsWith('*')) continue;
        if (line.indexOf('(') !== -1) continue;
        if (/^(class|interface|enum|return|new|package|import|throws)\b/.test(line)) continue;

        const m = line.match(fieldRe);
        if (!m) continue;
        const type = m[1].trim().replace(/\s+/g, ' ');
        const name = m[2].trim();
        if (/^(class|interface|enum|return|new|package|import)$/.test(type)) continue;
        if (/^(class|interface|enum|public|private|protected|static|final)$/.test(name)) continue;

        result.fields.push({
            name: name,
            type: type,
            comment: chunks[i].comment || '',
        });
    }
    return result;
}

/**
 * 去掉类名后缀 Entity/DTO/VO/Do/Po 等
 * @param {string} name
 * @returns {string}
 */
function ecStripSuffix(name) {
    return String(name || '').replace(/(Entity|DTO|Dto|VO|Vo|DO|Do|PO|Po|Req|Resp|Request|Response)$/i, '');
}

/**
 * 根据目标类型加后缀
 * @param {string} base
 * @param {string} kind entity|dto|vo
 * @returns {string}
 */
function ecApplySuffix(base, kind) {
    const b = base || 'Generated';
    if (kind === 'entity') return b + 'Entity';
    if (kind === 'dto') return b + 'DTO';
    if (kind === 'vo') return b + 'VO';
    return b;
}

/**
 * 类型是否需要额外 import
 * @param {string} type
 * @returns {string|null}
 */
function ecTypeImport(type) {
    const simple = String(type || '').replace(/<.*>/, '').replace(/\[\]$/, '').trim();
    const map = {
        BigDecimal: 'java.math.BigDecimal',
        BigInteger: 'java.math.BigInteger',
        LocalDate: 'java.time.LocalDate',
        LocalDateTime: 'java.time.LocalDateTime',
        LocalTime: 'java.time.LocalTime',
        Instant: 'java.time.Instant',
        Date: 'java.util.Date',
        List: 'java.util.List',
        Set: 'java.util.Set',
        Map: 'java.util.Map',
        UUID: 'java.util.UUID',
    };
    return map[simple] || null;
}

/**
 * 启发式 Validation 注解
 * @param {{name:string,type:string}} field
 * @returns {string[]}
 */
function ecValidationAnnos(field) {
    const annos = [];
    const t = (field.type || '').replace(/<.*>/, '').replace(/\[\]$/, '').trim();
    const n = (field.name || '').toLowerCase();
    if (t === 'String') {
        annos.push('@NotBlank');
        if (/(email|mail)/.test(n)) annos.push('@Email');
        else annos.push('@Size(max = 255)');
    } else if (t === 'Integer' || t === 'Long' || t === 'int' || t === 'long') {
        annos.push('@NotNull');
        if (/(age)/.test(n)) annos.push('@Min(0)', '@Max(150)');
    } else if (t === 'BigDecimal' || t === 'Double' || t === 'Float') {
        annos.push('@NotNull');
    } else if (/^(LocalDate|LocalDateTime|Date|Instant)/.test(t)) {
        annos.push('@NotNull');
    } else if (t !== 'boolean' && t !== 'Boolean') {
        annos.push('@NotNull');
    }
    return annos;
}

/**
 * 生成 Java 类
 * @param {Array|{fields:Array}} fields 字段列表或 parse 结果
 * @param {object} options
 * @param {string} [options.sourceType] entity|dto|vo
 * @param {string} [options.targetType] entity|dto|vo
 * @param {string} [options.className]
 * @param {string} [options.packageName]
 * @param {string} [options.tableName]
 * @param {boolean} [options.lombok=true]
 * @param {boolean} [options.validation=false]
 * @param {boolean} [options.jpa=true] 目标为 entity 时是否加 JPA
 * @returns {string}
 */
function generateJavaClass(fields, options) {
    options = options || {};
    let list = [];
    let parsedName = '';
    let parsedPkg = '';
    if (Array.isArray(fields)) {
        list = fields;
    } else if (fields && Array.isArray(fields.fields)) {
        list = fields.fields;
        parsedName = fields.className || '';
        parsedPkg = fields.packageName || '';
    }

    const sourceType = (options.sourceType || 'entity').toLowerCase();
    const targetType = (options.targetType || 'dto').toLowerCase();
    const useLombok = options.lombok !== false;
    const useValidation = !!options.validation || targetType === 'dto' || targetType === 'vo';
    // VO 默认校验可关；仅当 options.validation === true 或 dto 时默认开
    const wantValidation =
        options.validation === true ||
        (options.validation !== false && targetType === 'dto');
    const useJpa = options.jpa !== false && targetType === 'entity';
    const packageName = (options.packageName != null ? options.packageName : parsedPkg || '').trim();

    let className = (options.className || '').trim();
    if (!className) {
        const base = ecStripSuffix(parsedName) || 'Generated';
        className = ecApplySuffix(base, targetType);
    }

    const tableName =
        (options.tableName || '').trim() ||
        className
            .replace(/(Entity|DTO|Dto|VO|Vo)$/i, '')
            .replace(/([a-z])([A-Z])/g, '$1_$2')
            .toLowerCase();

    const imports = [];
    function addImport(p) {
        if (p && imports.indexOf(p) < 0) imports.push(p);
    }

    if (useLombok) {
        addImport('lombok.Data');
        if (targetType === 'entity' || targetType === 'dto') {
            addImport('lombok.Builder');
            addImport('lombok.NoArgsConstructor');
            addImport('lombok.AllArgsConstructor');
        }
    }
    if (useJpa) {
        addImport('javax.persistence.Entity');
        addImport('javax.persistence.Table');
        addImport('javax.persistence.Id');
        addImport('javax.persistence.GeneratedValue');
        addImport('javax.persistence.GenerationType');
        addImport('javax.persistence.Column');
    }
    if (wantValidation) {
        addImport('javax.validation.constraints.NotBlank');
        addImport('javax.validation.constraints.NotNull');
        addImport('javax.validation.constraints.Size');
        addImport('javax.validation.constraints.Email');
        addImport('javax.validation.constraints.Min');
        addImport('javax.validation.constraints.Max');
    }

    list.forEach(function (f) {
        const ti = ecTypeImport(f.type);
        if (ti) addImport(ti);
    });

    imports.sort();

    let code = '';
    if (packageName) {
        code += 'package ' + packageName + ';\n\n';
    }
    imports.forEach(function (imp) {
        code += 'import ' + imp + ';\n';
    });
    if (imports.length) code += '\n';

    if (useLombok) {
        code += '@Data\n';
        if (targetType === 'entity' || targetType === 'dto') {
            code += '@Builder\n@NoArgsConstructor\n@AllArgsConstructor\n';
        }
    }
    if (useJpa) {
        code += '@Entity\n';
        code += '@Table(name = "' + tableName + '")\n';
    }

    code += 'public class ' + className + ' {\n\n';

    list.forEach(function (f) {
        const name = f.name;
        const type = f.type || 'Object';
        if (f.comment) {
            code += '    /** ' + f.comment + ' */\n';
        }
        if (useJpa) {
            if (/^id$/i.test(name)) {
                code += '    @Id\n';
                code += '    @GeneratedValue(strategy = GenerationType.IDENTITY)\n';
            } else {
                const col = name.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
                code += '    @Column(name = "' + col + '")\n';
            }
        }
        if (wantValidation) {
            ecValidationAnnos(f).forEach(function (a) {
                code += '    ' + a + '\n';
            });
        }
        // 从 Entity 转出时去掉 JPA 语义，仅保留字段
        code += '    private ' + type + ' ' + name + ';\n\n';
    });

    if (!useLombok) {
        list.forEach(function (f) {
            const name = f.name;
            const type = f.type || 'Object';
            const cap = name.charAt(0).toUpperCase() + name.slice(1);
            const isBool = type === 'boolean' || type === 'Boolean';
            const getter = isBool && !/^is/i.test(name) ? 'is' + cap : 'get' + cap;
            code += '    public ' + type + ' ' + getter + '() {\n';
            code += '        return ' + name + ';\n';
            code += '    }\n\n';
            code += '    public void set' + cap + '(' + type + ' ' + name + ') {\n';
            code += '        this.' + name + ' = ' + name + ';\n';
            code += '    }\n\n';
        });
    }

    code += '}\n';
    return code;
}

// ========== UI ==========

function ecGenerate() {
    const input = document.getElementById('ecInput').value;
    const out = document.getElementById('ecOutput');
    try {
        const parsed = parseJavaFields(input);
        if (!parsed.fields.length) {
            throw new Error('未识别到字段，请粘贴 Java 类或字段列表');
        }
        const sourceType = document.getElementById('ecSource').value;
        const targetType = document.getElementById('ecTarget').value;
        const packageName = document.getElementById('ecPackage').value;
        const className = document.getElementById('ecClassName').value;
        const lombok = document.getElementById('ecLombok').checked;
        const validation = document.getElementById('ecValidation').checked;
        const code = generateJavaClass(parsed, {
            sourceType: sourceType,
            targetType: targetType,
            packageName: packageName,
            className: className,
            lombok: lombok,
            validation: validation,
            jpa: targetType === 'entity',
        });
        out.textContent = code;
        out.className = 'output-box';
        setStatus('已生成 ' + targetType.toUpperCase() + '，' + parsed.fields.length + ' 个字段');
    } catch (e) {
        out.textContent = '失败: ' + e.message;
        out.className = 'output-box error';
        setStatus('生成失败');
    }
}

function ecClear() {
    document.getElementById('ecInput').value = '';
    document.getElementById('ecOutput').textContent = '';
    setStatus('已清空');
}

function ecLoadSample() {
    document.getElementById('ecInput').value = [
        'package com.example.domain;',
        '',
        '@Entity',
        '@Table(name = "sys_user")',
        '@Data',
        'public class UserEntity {',
        '    /** 主键 */',
        '    @Id',
        '    private Long id;',
        '    private String userName;',
        '    private String email;',
        '    private Integer age;',
        '    private java.time.LocalDateTime createTime;',
        '}',
    ].join('\n');
    document.getElementById('ecSource').value = 'entity';
    document.getElementById('ecTarget').value = 'dto';
    document.getElementById('ecPackage').value = 'com.example.dto';
    document.getElementById('ecClassName').value = '';
    setStatus('已加载示例');
}

if (typeof registerInit !== 'undefined') {
    registerInit('entityconvert', function () {});
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseJavaFields: parseJavaFields,
        generateJavaClass: generateJavaClass,
        ecStripSuffix: ecStripSuffix,
        ecApplySuffix: ecApplySuffix,
    };
}
