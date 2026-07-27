// MapStruct Mapper 骨架生成

/**
 * 解析简化 Java 类文本
 * 支持：
 * - class User { Long id; String userName; }
 * - 纯字段列表：Long id; String userName;
 * - 一行一个 name 或 type name
 * @param {string} text
 * @returns {{className:string, fields:Array<{name:string,type:string}>}}
 */
function parseSimpleJavaClass(text) {
    const result = { className: '', fields: [] };
    if (!text || !String(text).trim()) {
        return result;
    }
    let raw = String(text).trim();
    // 去掉块注释 / 行注释
    raw = raw.replace(/\/\*[\s\S]*?\*\//g, '');
    raw = raw.replace(/\/\/[^\n\r]*/g, '');

    const classMatch = raw.match(/\bclass\s+([A-Za-z_$][\w$]*)\s*\{([\s\S]*)\}/);
    let body = raw;
    if (classMatch) {
        result.className = classMatch[1];
        body = classMatch[2];
    }

    // 按行再按分号拆，支持单行多字段：Long id; String name;
    const chunks = [];
    body.split(/\r?\n/).forEach(function (line) {
        line.split(';').forEach(function (part) {
            const t = part.trim();
            if (t) chunks.push(t);
        });
    });
    const fieldRe =
        /^(?:(?:public|private|protected|static|final|transient|volatile)\s+)*([A-Za-z_$][\w$.<>\[\],\s?]*)\s+([A-Za-z_$][\w$]*)\s*$/;
    const nameOnlyRe = /^([A-Za-z_$][\w$]*)$/;

    for (let i = 0; i < chunks.length; i++) {
        let line = chunks[i].trim();
        if (!line) continue;
        if (line.startsWith('@')) continue;
        if (line.indexOf('(') !== -1) continue; // 方法
        // 去掉末尾逗号
        line = line.replace(/,\s*$/, '');
        const m = line.match(fieldRe);
        if (m) {
            const type = m[1].trim().replace(/\s+/g, ' ');
            const name = m[2].trim();
            // 跳过 class/interface 等关键字误匹配
            if (/^(class|interface|enum|return|new|package|import)$/.test(type)) continue;
            result.fields.push({ name: name, type: type });
            continue;
        }
        // 仅字段名（无类型）
        const n = line.match(nameOnlyRe);
        if (n && !/^(class|interface|enum|public|private|protected|static|final)$/.test(n[1])) {
            result.fields.push({ name: n[1], type: 'Object' });
        }
    }
    return result;
}

/**
 * 规范化字段名用于模糊匹配（忽略大小写与下划线）
 * @param {string} name
 * @returns {string}
 */
function msNormalizeName(name) {
    return String(name || '')
        .replace(/_/g, '')
        .toLowerCase();
}

/**
 * 生成 MapStruct Mapper 接口
 * @param {object} source 源类 {className, fields}
 * @param {object} target 目标类 {className, fields}
 * @param {object} [options]
 * @param {string} [options.mapperName]
 * @param {string} [options.componentModel='spring'] default|spring|cdi|jsr330
 * @param {boolean} [options.ignoreUnmapped=true]
 * @param {string[]} [options.ignoreTargets] 强制忽略的目标字段
 * @param {Array<{source:string,target:string}>} [options.extraMappings] 额外映射
 * @param {string} [options.methodName='toTarget']
 * @param {boolean} [options.reverse=false] 同时生成反向方法
 * @param {string} [options.packageName]
 * @returns {string}
 */
function generateMapStructMapper(source, target, options) {
    options = options || {};
    source = source || { className: '', fields: [] };
    target = target || { className: '', fields: [] };

    const srcName = source.className || 'Source';
    const tgtName = target.className || 'Target';
    const mapperName = options.mapperName || srcName + 'Mapper';
    const componentModel = options.componentModel != null ? options.componentModel : 'spring';
    const ignoreUnmapped = options.ignoreUnmapped !== false;
    const methodName = options.methodName || 'to' + tgtName;
    const reverse = !!options.reverse;
    const packageName = (options.packageName || '').trim();
    const ignoreTargets = options.ignoreTargets || [];
    const extraMappings = options.extraMappings || [];

    const srcFields = source.fields || [];
    const tgtFields = target.fields || [];

    const srcByNorm = Object.create(null);
    srcFields.forEach(function (f) {
        srcByNorm[msNormalizeName(f.name)] = f.name;
    });
    const srcByExact = Object.create(null);
    srcFields.forEach(function (f) {
        srcByExact[f.name] = f.name;
    });

    const ignoreSet = Object.create(null);
    ignoreTargets.forEach(function (n) {
        ignoreSet[n] = true;
    });

    const mappings = [];
    const mappedTargets = Object.create(null);

    // 额外映射优先
    extraMappings.forEach(function (m) {
        if (!m || !m.target) return;
        mappings.push({ source: m.source || '', target: m.target, ignore: !!m.ignore });
        mappedTargets[m.target] = true;
    });

    tgtFields.forEach(function (tf) {
        if (mappedTargets[tf.name]) return;
        if (ignoreSet[tf.name]) {
            mappings.push({ source: '', target: tf.name, ignore: true });
            mappedTargets[tf.name] = true;
            return;
        }
        // 精确匹配
        if (srcByExact[tf.name]) {
            // 同名无需 @Mapping
            mappedTargets[tf.name] = true;
            return;
        }
        // 规范化匹配（userName ↔ username）
        const norm = msNormalizeName(tf.name);
        if (srcByNorm[norm] && srcByNorm[norm] !== tf.name) {
            mappings.push({ source: srcByNorm[norm], target: tf.name, ignore: false });
            mappedTargets[tf.name] = true;
            return;
        }
        // 未匹配 → ignore
        mappings.push({ source: '', target: tf.name, ignore: true });
        mappedTargets[tf.name] = true;
    });

    const lines = [];
    if (packageName) {
        lines.push('package ' + packageName + ';');
        lines.push('');
    }
    lines.push('import org.mapstruct.Mapper;');
    lines.push('import org.mapstruct.Mapping;');
    lines.push('import org.mapstruct.MappingConstants;');
    lines.push('import org.mapstruct.ReportingPolicy;');
    lines.push('');

    // @Mapper 注解
    const mapperArgs = [];
    if (componentModel && componentModel !== 'default') {
        if (componentModel === 'spring') {
            mapperArgs.push('componentModel = MappingConstants.ComponentModel.SPRING');
        } else {
            mapperArgs.push("componentModel = \"" + componentModel + "\"");
        }
    }
    if (ignoreUnmapped) {
        mapperArgs.push('unmappedTargetPolicy = ReportingPolicy.IGNORE');
    }
    if (mapperArgs.length) {
        lines.push('@Mapper(' + mapperArgs.join(', ') + ')');
    } else {
        lines.push('@Mapper');
    }
    lines.push('public interface ' + mapperName + ' {');
    lines.push('');

    // 正向映射注解
    mappings.forEach(function (m) {
        if (m.ignore) {
            lines.push('    @Mapping(target = "' + m.target + '", ignore = true)');
        } else if (m.source) {
            lines.push('    @Mapping(source = "' + m.source + '", target = "' + m.target + '")');
        }
    });
    lines.push('    ' + tgtName + ' ' + methodName + '(' + srcName + ' source);');
    lines.push('');

    if (reverse) {
        // 反向：target → source
        const revMappings = [];
        const revMapped = Object.create(null);
        const tgtByNorm = Object.create(null);
        const tgtByExact = Object.create(null);
        tgtFields.forEach(function (f) {
            tgtByNorm[msNormalizeName(f.name)] = f.name;
            tgtByExact[f.name] = f.name;
        });

        srcFields.forEach(function (sf) {
            if (tgtByExact[sf.name]) {
                revMapped[sf.name] = true;
                return;
            }
            const norm = msNormalizeName(sf.name);
            if (tgtByNorm[norm] && tgtByNorm[norm] !== sf.name) {
                revMappings.push({ source: tgtByNorm[norm], target: sf.name });
                revMapped[sf.name] = true;
                return;
            }
            revMappings.push({ target: sf.name, ignore: true });
            revMapped[sf.name] = true;
        });

        revMappings.forEach(function (m) {
            if (m.ignore) {
                lines.push('    @Mapping(target = "' + m.target + '", ignore = true)');
            } else if (m.source) {
                lines.push('    @Mapping(source = "' + m.source + '", target = "' + m.target + '")');
            }
        });
        const revMethod = 'to' + srcName;
        lines.push('    ' + srcName + ' ' + revMethod + '(' + tgtName + ' target);');
        lines.push('');
    }

    lines.push('}');
    return lines.join('\n');
}

/**
 * 从「源---目标」合并文本解析两端类
 * @param {string} text
 * @returns {{source:object, target:object}}
 */
function parseMapStructPair(text) {
    const raw = String(text || '');
    const parts = raw.split(/\n\s*---\s*\n|\n---\n|^\s*---\s*$/m);
    if (parts.length >= 2) {
        return {
            source: parseSimpleJavaClass(parts[0]),
            target: parseSimpleJavaClass(parts.slice(1).join('\n---\n')),
        };
    }
    // 尝试匹配两个 class
    const classBlocks = raw.match(/\bclass\s+[A-Za-z_$][\w$]*\s*\{[\s\S]*?\}/g);
    if (classBlocks && classBlocks.length >= 2) {
        return {
            source: parseSimpleJavaClass(classBlocks[0]),
            target: parseSimpleJavaClass(classBlocks[1]),
        };
    }
    return {
        source: parseSimpleJavaClass(raw),
        target: { className: '', fields: [] },
    };
}

function mapstructGenerate() {
    const mode = (document.getElementById('msMode') || {}).value || 'pair';
    const out = document.getElementById('msOutput');
    const componentModel = (document.getElementById('msComponent') || {}).value || 'spring';
    const ignoreUnmapped = !!(document.getElementById('msIgnoreUnmapped') || {}).checked;
    const reverse = !!(document.getElementById('msReverse') || {}).checked;
    const packageName = ((document.getElementById('msPackage') || {}).value || '').trim();
    const mapperName = ((document.getElementById('msMapperName') || {}).value || '').trim();
    const ignoreRaw = ((document.getElementById('msIgnoreFields') || {}).value || '').trim();
    const ignoreTargets = ignoreRaw
        ? ignoreRaw.split(/[,;\s]+/).filter(Boolean)
        : [];

    try {
        let source;
        let target;
        if (mode === 'split') {
            source = parseSimpleJavaClass(document.getElementById('msSource').value);
            target = parseSimpleJavaClass(document.getElementById('msTarget').value);
        } else {
            const pair = parseMapStructPair(document.getElementById('msPair').value);
            source = pair.source;
            target = pair.target;
        }
        if (!source.fields.length) {
            throw new Error('未解析到源类字段');
        }
        if (!target.fields.length) {
            throw new Error('未解析到目标类字段');
        }
        const code = generateMapStructMapper(source, target, {
            componentModel: componentModel,
            ignoreUnmapped: ignoreUnmapped,
            reverse: reverse,
            packageName: packageName,
            mapperName: mapperName || undefined,
            ignoreTargets: ignoreTargets,
        });
        out.textContent = code;
        out.className = 'output-box';
        setStatus('MapStruct Mapper 已生成');
    } catch (e) {
        out.textContent = e.message;
        out.className = 'output-box error';
    }
}

function mapstructLoadSample() {
    const sample =
        'class User {\n' +
        '  Long id;\n' +
        '  String userName;\n' +
        '  String email;\n' +
        '  String password;\n' +
        '}\n' +
        '---\n' +
        'class UserDTO {\n' +
        '  Long id;\n' +
        '  String username;\n' +
        '  String email;\n' +
        '  String phone;\n' +
        '}';
    const pair = document.getElementById('msPair');
    if (pair) pair.value = sample;
    const src = document.getElementById('msSource');
    const tgt = document.getElementById('msTarget');
    if (src) {
        src.value = 'class User {\n  Long id;\n  String userName;\n  String email;\n  String password;\n}';
    }
    if (tgt) {
        tgt.value = 'class UserDTO {\n  Long id;\n  String username;\n  String email;\n  String phone;\n}';
    }
    setStatus('已加载示例');
}

function mapstructClear() {
    ['msPair', 'msSource', 'msTarget', 'msPackage', 'msMapperName', 'msIgnoreFields'].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const out = document.getElementById('msOutput');
    if (out) out.textContent = '';
    setStatus('已清空');
}

function mapstructToggleMode() {
    const mode = (document.getElementById('msMode') || {}).value || 'pair';
    const pairBox = document.getElementById('msPairBox');
    const splitBox = document.getElementById('msSplitBox');
    if (pairBox) pairBox.style.display = mode === 'pair' ? '' : 'none';
    if (splitBox) splitBox.style.display = mode === 'split' ? '' : 'none';
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseSimpleJavaClass: parseSimpleJavaClass,
        generateMapStructMapper: generateMapStructMapper,
        parseMapStructPair: parseMapStructPair,
        msNormalizeName: msNormalizeName,
    };
}
