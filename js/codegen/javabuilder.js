// Java Builder 生成 / 去 Lombok 展开
// 纯函数: parseJavaClassForBuilder / generateBuilder / expandLombok

/**
 * 解析带字段的 Java 类
 * @param {string} text
 * @returns {{className:string, packageName:string, fields:Array<{name:string,type:string}>, lombokAnnos:string[]}}
 */
function parseJavaClassForBuilder(text) {
    const result = {
        className: 'Generated',
        packageName: '',
        fields: [],
        lombokAnnos: [],
    };
    if (!text || !String(text).trim()) return result;

    let raw = String(text);
    const pkgMatch = raw.match(/^\s*package\s+([\w.]+)\s*;/m);
    if (pkgMatch) result.packageName = pkgMatch[1];

    const annoBlock = raw.match(/(?:^|\n)((?:\s*@\w+(?:\([^)]*\))?\s*)+)\s*(?:public\s+)?class\s+/);
    if (annoBlock) {
        const annos = annoBlock[1].match(/@(\w+)/g) || [];
        result.lombokAnnos = annos.map(function (a) {
            return a.slice(1);
        });
    }

    const classMatch = raw.match(/\bclass\s+([A-Za-z_$][\w$]*)\s*\{/);
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

    const chunks = [];
    body.split(/\r?\n/).forEach(function (line) {
        line.split(';').forEach(function (part) {
            const t = part.replace(/\/\/.*$/, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
            if (t) chunks.push(t);
        });
    });
    const fieldRe =
        /^(?:(?:public|private|protected|static|final|transient|volatile)\s+)*([A-Za-z_$][\w$.<>\[\],\s?]*)\s+([A-Za-z_$][\w$]*)\s*(?:=\s*[^;]+)?\s*$/;

    for (let i = 0; i < chunks.length; i++) {
        let line = chunks[i];
        if (!line || line.startsWith('@') || line.indexOf('(') !== -1) continue;
        if (/^(class|interface|enum|return|new|package|import)\b/.test(line)) continue;
        const m = line.match(fieldRe);
        if (!m) continue;
        const type = m[1].trim().replace(/\s+/g, ' ');
        const name = m[2].trim();
        if (/^(class|interface|enum|public|private|protected|static|final)$/.test(type)) continue;
        if (/\bstatic\b/.test(line) && /\bfinal\b/.test(line)) continue;
        result.fields.push({ name: name, type: type });
    }
    return result;
}

/**
 * 字段名 → getter 名
 * @param {string} name
 * @param {string} type
 * @returns {string}
 */
function jbdGetterName(name, type) {
    const cap = name.charAt(0).toUpperCase() + name.slice(1);
    if ((type === 'boolean' || type === 'Boolean') && !/^is[A-Z]/.test(name)) {
        return 'is' + cap;
    }
    return 'get' + cap;
}

/**
 * 生成手写 Builder 模式
 * @param {object} parsed parseJavaClassForBuilder 结果或 {className,fields}
 * @param {object} [options]
 * @param {boolean} [options.includeGetters=true]
 * @param {boolean} [options.includeSetters=false]
 * @param {boolean} [options.packageName]
 * @returns {string}
 */
function generateBuilder(parsed, options) {
    options = options || {};
    const className = (parsed && parsed.className) || 'Generated';
    const fields = (parsed && parsed.fields) || [];
    const packageName =
        options.packageName != null ? String(options.packageName).trim() : (parsed.packageName || '').trim();
    const includeGetters = options.includeGetters !== false;
    const includeSetters = !!options.includeSetters;
    const builderName = className + 'Builder';

    let code = '';
    if (packageName) code += 'package ' + packageName + ';\n\n';

    code += 'public class ' + className + ' {\n\n';
    fields.forEach(function (f) {
        code += '    private ' + f.type + ' ' + f.name + ';\n';
    });
    code += '\n';
    code += '    private ' + className + '() {\n    }\n\n';
    code += '    public static ' + builderName + ' builder() {\n';
    code += '        return new ' + builderName + '();\n';
    code += '    }\n\n';

    if (includeGetters) {
        fields.forEach(function (f) {
            const g = jbdGetterName(f.name, f.type);
            code += '    public ' + f.type + ' ' + g + '() {\n';
            code += '        return ' + f.name + ';\n';
            code += '    }\n\n';
        });
    }
    if (includeSetters) {
        fields.forEach(function (f) {
            const cap = f.name.charAt(0).toUpperCase() + f.name.slice(1);
            code += '    public void set' + cap + '(' + f.type + ' ' + f.name + ') {\n';
            code += '        this.' + f.name + ' = ' + f.name + ';\n';
            code += '    }\n\n';
        });
    }

    code += '    public static final class ' + builderName + ' {\n';
    fields.forEach(function (f) {
        code += '        private ' + f.type + ' ' + f.name + ';\n';
    });
    code += '\n';
    code += '        private ' + builderName + '() {\n        }\n\n';
    fields.forEach(function (f) {
        code += '        public ' + builderName + ' ' + f.name + '(' + f.type + ' ' + f.name + ') {\n';
        code += '            this.' + f.name + ' = ' + f.name + ';\n';
        code += '            return this;\n';
        code += '        }\n\n';
    });
    code += '        public ' + className + ' build() {\n';
    code += '            ' + className + ' obj = new ' + className + '();\n';
    fields.forEach(function (f) {
        code += '            obj.' + f.name + ' = this.' + f.name + ';\n';
    });
    code += '            return obj;\n';
    code += '        }\n';
    code += '    }\n';
    code += '}\n';
    return code;
}

/**
 * 展开 @Data / @Builder 为手写 getter/setter/builder
 * @param {object} parsed
 * @param {object} [options]
 * @param {boolean} [options.builder=true]
 * @param {boolean} [options.getters=true]
 * @param {boolean} [options.setters=true]
 * @param {boolean} [options.noArgsCtor=true]
 * @param {boolean} [options.allArgsCtor=true]
 * @param {boolean} [options.toString=true]
 * @param {boolean} [options.equalsHashCode=false]
 * @returns {string}
 */
function expandLombok(parsed, options) {
    options = options || {};
    const className = (parsed && parsed.className) || 'Generated';
    const fields = (parsed && parsed.fields) || [];
    const packageName =
        options.packageName != null ? String(options.packageName).trim() : (parsed.packageName || '').trim();
    const wantBuilder = options.builder !== false;
    const wantGetters = options.getters !== false;
    const wantSetters = options.setters !== false;
    const wantNoArgs = options.noArgsCtor !== false;
    const wantAllArgs = options.allArgsCtor !== false;
    const wantToString = options.toString !== false;
    const wantEq = !!options.equalsHashCode;

    let code = '';
    if (packageName) code += 'package ' + packageName + ';\n\n';
    code += 'public class ' + className + ' {\n\n';
    fields.forEach(function (f) {
        code += '    private ' + f.type + ' ' + f.name + ';\n';
    });
    code += '\n';

    if (wantNoArgs) {
        code += '    public ' + className + '() {\n    }\n\n';
    }
    if (wantAllArgs && fields.length) {
        const params = fields
            .map(function (f) {
                return f.type + ' ' + f.name;
            })
            .join(', ');
        code += '    public ' + className + '(' + params + ') {\n';
        fields.forEach(function (f) {
            code += '        this.' + f.name + ' = ' + f.name + ';\n';
        });
        code += '    }\n\n';
    }

    if (wantGetters) {
        fields.forEach(function (f) {
            const g = jbdGetterName(f.name, f.type);
            code += '    public ' + f.type + ' ' + g + '() {\n';
            code += '        return this.' + f.name + ';\n';
            code += '    }\n\n';
        });
    }
    if (wantSetters) {
        fields.forEach(function (f) {
            const cap = f.name.charAt(0).toUpperCase() + f.name.slice(1);
            code += '    public void set' + cap + '(' + f.type + ' ' + f.name + ') {\n';
            code += '        this.' + f.name + ' = ' + f.name + ';\n';
            code += '    }\n\n';
        });
    }

    if (wantToString) {
        code += '    @Override\n';
        code += '    public String toString() {\n';
        code += '        return "' + className + '{" +\n';
        fields.forEach(function (f, idx) {
            const sep = idx === 0 ? '' : ' + ", ';
            const prefix = idx === 0 ? '                "' : '                "';
            if (idx === 0) {
                code += '                "' + f.name + '=" + ' + f.name;
            } else {
                code += '\n                + ", ' + f.name + '=" + ' + f.name;
            }
        });
        if (fields.length) code += '\n                + "}";\n';
        else code += '                "}";\n';
        code += '    }\n\n';
    }

    if (wantEq) {
        code += '    @Override\n';
        code += '    public boolean equals(Object o) {\n';
        code += '        if (this == o) return true;\n';
        code += '        if (o == null || getClass() != o.getClass()) return false;\n';
        code += '        ' + className + ' that = (' + className + ') o;\n';
        if (fields.length) {
            const eqs = fields
                .map(function (f) {
                    return 'java.util.Objects.equals(' + f.name + ', that.' + f.name + ')';
                })
                .join('\n                && ');
            code += '        return ' + eqs + ';\n';
        } else {
            code += '        return true;\n';
        }
        code += '    }\n\n';
        code += '    @Override\n';
        code += '    public int hashCode() {\n';
        if (fields.length) {
            code +=
                '        return java.util.Objects.hash(' +
                fields
                    .map(function (f) {
                        return f.name;
                    })
                    .join(', ') +
                ');\n';
        } else {
            code += '        return 0;\n';
        }
        code += '    }\n\n';
    }

    if (wantBuilder) {
        const builderName = className + 'Builder';
        code += '    public static ' + builderName + ' builder() {\n';
        code += '        return new ' + builderName + '();\n';
        code += '    }\n\n';
        code += '    public static final class ' + builderName + ' {\n';
        fields.forEach(function (f) {
            code += '        private ' + f.type + ' ' + f.name + ';\n';
        });
        code += '\n        private ' + builderName + '() {}\n\n';
        fields.forEach(function (f) {
            code += '        public ' + builderName + ' ' + f.name + '(' + f.type + ' ' + f.name + ') {\n';
            code += '            this.' + f.name + ' = ' + f.name + ';\n';
            code += '            return this;\n';
            code += '        }\n\n';
        });
        code += '        public ' + className + ' build() {\n';
        if (wantAllArgs && fields.length) {
            code +=
                '            return new ' +
                className +
                '(' +
                fields
                    .map(function (f) {
                        return 'this.' + f.name;
                    })
                    .join(', ') +
                ');\n';
        } else {
            code += '            ' + className + ' obj = new ' + className + '();\n';
            fields.forEach(function (f) {
                code += '            obj.' + f.name + ' = this.' + f.name + ';\n';
            });
            code += '            return obj;\n';
        }
        code += '        }\n';
        code += '    }\n';
    }

    code += '}\n';
    return code;
}

// ========== UI ==========

function jbdGenerate() {
    const input = document.getElementById('jbdInput').value;
    const out = document.getElementById('jbdOutput');
    try {
        const parsed = parseJavaClassForBuilder(input);
        if (!parsed.fields.length) throw new Error('未识别到字段');
        const mode = document.getElementById('jbdMode').value;
        const packageName = document.getElementById('jbdPackage').value;
        let code;
        if (mode === 'expand') {
            code = expandLombok(parsed, {
                packageName: packageName,
                builder: document.getElementById('jbdOptBuilder').checked,
                getters: document.getElementById('jbdOptGetters').checked,
                setters: document.getElementById('jbdOptSetters').checked,
                toString: document.getElementById('jbdOptToString').checked,
                equalsHashCode: document.getElementById('jbdOptEquals').checked,
            });
        } else {
            code = generateBuilder(parsed, {
                packageName: packageName,
                includeGetters: document.getElementById('jbdOptGetters').checked,
                includeSetters: document.getElementById('jbdOptSetters').checked,
            });
        }
        out.textContent = code;
        out.className = 'output-box';
        setStatus('已生成，' + parsed.fields.length + ' 个字段');
    } catch (e) {
        out.textContent = '失败: ' + e.message;
        out.className = 'output-box error';
        setStatus('生成失败');
    }
}

function jbdClear() {
    document.getElementById('jbdInput').value = '';
    document.getElementById('jbdOutput').textContent = '';
    setStatus('已清空');
}

function jbdLoadSample() {
    document.getElementById('jbdInput').value = [
        'package com.example;',
        '',
        '@Data',
        '@Builder',
        'public class User {',
        '    private Long id;',
        '    private String userName;',
        '    private String email;',
        '    private boolean active;',
        '}',
    ].join('\n');
    document.getElementById('jbdMode').value = 'expand';
    setStatus('已加载示例');
}

if (typeof registerInit !== 'undefined') {
    registerInit('javabuilder', function () {});
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseJavaClassForBuilder: parseJavaClassForBuilder,
        generateBuilder: generateBuilder,
        expandLombok: expandLombok,
        jbdGetterName: jbdGetterName,
    };
}
