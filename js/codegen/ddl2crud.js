// DDL → MyBatis-Plus 完整 CRUD
// 纯函数: parseDdlForCrud / generateMpEntity / generateMpMapper /
//         generateMpService / generateMpServiceImpl / generateMpController / generateCrudAll

const D2C_TYPE_MAP = {
    int: 'Integer',
    integer: 'Integer',
    tinyint: 'Integer',
    smallint: 'Integer',
    mediumint: 'Integer',
    bigint: 'Long',
    float: 'Float',
    double: 'Double',
    decimal: 'BigDecimal',
    numeric: 'BigDecimal',
    bit: 'Boolean',
    boolean: 'Boolean',
    bool: 'Boolean',
    varchar: 'String',
    char: 'String',
    text: 'String',
    longtext: 'String',
    mediumtext: 'String',
    tinytext: 'String',
    json: 'String',
    date: 'LocalDate',
    time: 'LocalTime',
    datetime: 'LocalDateTime',
    timestamp: 'LocalDateTime',
    blob: 'byte[]',
    longblob: 'byte[]',
    binary: 'byte[]',
    varbinary: 'byte[]',
};

function d2cUnquote(name) {
    return String(name || '')
        .replace(/^[`"[]/, '')
        .replace(/[`"\]]$/, '')
        .trim();
}

function d2cToCamel(s) {
    return String(s || '')
        .replace(/[_-](\w)/g, function (_, c) {
            return c.toUpperCase();
        })
        .replace(/^\w/, function (c) {
            return c.toLowerCase();
        });
}

function d2cToPascal(s) {
    const c = d2cToCamel(s);
    return c ? c.charAt(0).toUpperCase() + c.slice(1) : '';
}

function d2cInferEntity(tableName) {
    const stripped = String(tableName || '').replace(/^(t_|tb_|sys_)/i, '');
    return d2cToPascal(stripped) || 'GeneratedEntity';
}

function d2cSplitTopLevel(str, sep) {
    const result = [];
    let buf = '';
    let inSingle = false;
    let inDouble = false;
    let inBacktick = false;
    let parenDepth = 0;
    for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        const prev = i > 0 ? str[i - 1] : '';
        if (!inDouble && !inBacktick && ch === "'" && prev !== '\\') {
            inSingle = !inSingle;
            buf += ch;
            continue;
        }
        if (!inSingle && !inBacktick && ch === '"' && prev !== '\\') {
            inDouble = !inDouble;
            buf += ch;
            continue;
        }
        if (!inSingle && !inDouble && ch === '`') {
            inBacktick = !inBacktick;
            buf += ch;
            continue;
        }
        if (!inSingle && !inDouble && !inBacktick) {
            if (ch === '(') parenDepth++;
            else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);
            if (ch === sep && parenDepth === 0) {
                result.push(buf);
                buf = '';
                continue;
            }
        }
        buf += ch;
    }
    if (buf.length) result.push(buf);
    return result;
}

/**
 * 解析 DDL
 * @param {string} ddl
 * @returns {{table:string, pk:string, entityName:string, fields:Array}}
 */
function parseDdlForCrud(ddl) {
    if (!ddl || typeof ddl !== 'string' || !ddl.trim()) {
        throw new Error('DDL 内容为空');
    }
    const tableMatch = ddl.match(
        /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?([A-Za-z0-9_]+)`?(?:\s*\.\s*`?([A-Za-z0-9_]+)`?)?/i,
    );
    if (!tableMatch) throw new Error('未识别到 CREATE TABLE 语句');
    const table = tableMatch[2] || tableMatch[1];

    let pk = null;
    const pkMatch = ddl.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
    if (pkMatch) {
        pk = d2cUnquote(pkMatch[1].split(',')[0].trim());
    }

    const firstParen = ddl.indexOf('(');
    const lastParen = ddl.lastIndexOf(')');
    if (firstParen < 0 || lastParen <= firstParen) throw new Error('DDL 缺少字段定义');
    const body = ddl.substring(firstParen + 1, lastParen);
    const rows = d2cSplitTopLevel(body, ',');
    const fields = [];

    for (let r = 0; r < rows.length; r++) {
        const line = rows[r].trim();
        if (!line) continue;
        if (
            /^(PRIMARY\s+KEY|UNIQUE\s+(?:KEY|INDEX)|KEY|INDEX|CONSTRAINT|FOREIGN\s+KEY|FULLTEXT|SPATIAL)\b/i.test(
                line,
            )
        ) {
            continue;
        }
        if (/^(COMMENT|ENGINE|DEFAULT\s+CHARSET|CHARSET\s*=)/i.test(line)) continue;

        const nameMatch = line.match(/^`?([A-Za-z0-9_]+)`?/);
        if (!nameMatch) continue;
        const name = nameMatch[1];
        const rest = line.substring(nameMatch[0].length).trim();
        const typeMatch = rest.match(/^([A-Za-z]+)\s*(\(\s*([0-9]+)(?:\s*,\s*[0-9]+)?\s*\))?/);
        if (!typeMatch) continue;
        const sqlType = typeMatch[1].toLowerCase();
        const javaType = D2C_TYPE_MAP[sqlType] || 'String';
        const notNull = /NOT\s+NULL/i.test(line);
        const autoInc = /AUTO_INCREMENT/i.test(line);
        const commentMatch = line.match(/COMMENT\s+'((?:[^'\\]|\\.|'')*)'/i);
        const comment = commentMatch ? commentMatch[1].replace(/''/g, "'") : '';
        if (!pk && /\bPRIMARY\s+KEY\b/i.test(line)) pk = name;

        fields.push({
            name: name,
            property: d2cToCamel(name),
            sqlType: typeMatch[1],
            javaType: javaType,
            notNull: notNull,
            autoInc: autoInc,
            comment: comment,
            pk: false,
        });
    }

    if (!fields.length) throw new Error('未识别到任何字段');
    if (pk) {
        const pkField = fields.find(function (f) {
            return f.name === pk;
        });
        if (pkField) pkField.pk = true;
        else {
            fields[0].pk = true;
            pk = fields[0].name;
        }
    } else {
        fields[0].pk = true;
        pk = fields[0].name;
    }

    return {
        table: table,
        pk: pk,
        entityName: d2cInferEntity(table),
        fields: fields,
    };
}

function d2cCollectImports(fields) {
    const set = {};
    fields.forEach(function (f) {
        if (f.javaType === 'BigDecimal') set['java.math.BigDecimal'] = true;
        if (f.javaType === 'LocalDate') set['java.time.LocalDate'] = true;
        if (f.javaType === 'LocalDateTime') set['java.time.LocalDateTime'] = true;
        if (f.javaType === 'LocalTime') set['java.time.LocalTime'] = true;
    });
    return Object.keys(set).sort();
}

function d2cPkg(base, sub) {
    const b = (base || 'com.example').replace(/\.$/, '');
    return sub ? b + '.' + sub : b;
}

/**
 * 生成 Entity
 * @param {object} parsed
 * @param {object} [options]
 * @returns {string}
 */
function generateMpEntity(parsed, options) {
    options = options || {};
    const basePkg = options.packageName || 'com.example';
    const entityPkg = options.entityPackage || d2cPkg(basePkg, 'entity');
    const entityName = options.entityName || parsed.entityName;
    const useLombok = options.lombok !== false;
    const table = parsed.table;
    const fields = parsed.fields;
    const imports = d2cCollectImports(fields);

    let code = 'package ' + entityPkg + ';\n\n';
    if (useLombok) {
        code += 'import lombok.Data;\n';
        code += 'import lombok.Builder;\n';
        code += 'import lombok.NoArgsConstructor;\n';
        code += 'import lombok.AllArgsConstructor;\n';
    }
    code += 'import com.baomidou.mybatisplus.annotation.TableName;\n';
    code += 'import com.baomidou.mybatisplus.annotation.TableId;\n';
    code += 'import com.baomidou.mybatisplus.annotation.IdType;\n';
    code += 'import com.baomidou.mybatisplus.annotation.TableField;\n';
    imports.forEach(function (imp) {
        code += 'import ' + imp + ';\n';
    });
    code += '\n';
    if (useLombok) {
        code += '@Data\n@Builder\n@NoArgsConstructor\n@AllArgsConstructor\n';
    }
    code += '@TableName("' + table + '")\n';
    code += 'public class ' + entityName + ' {\n\n';

    fields.forEach(function (f) {
        if (f.comment) code += '    /** ' + f.comment + ' */\n';
        if (f.pk) {
            const idType = f.autoInc ? 'IdType.AUTO' : 'IdType.INPUT';
            code += '    @TableId(value = "' + f.name + '", type = ' + idType + ')\n';
        } else {
            code += '    @TableField("' + f.name + '")\n';
        }
        code += '    private ' + f.javaType + ' ' + f.property + ';\n\n';
    });

    if (!useLombok) {
        fields.forEach(function (f) {
            const cap = f.property.charAt(0).toUpperCase() + f.property.slice(1);
            code += '    public ' + f.javaType + ' get' + cap + '() {\n';
            code += '        return ' + f.property + ';\n';
            code += '    }\n\n';
            code += '    public void set' + cap + '(' + f.javaType + ' ' + f.property + ') {\n';
            code += '        this.' + f.property + ' = ' + f.property + ';\n';
            code += '    }\n\n';
        });
    }
    code += '}\n';
    return code;
}

function generateMpMapper(parsed, options) {
    options = options || {};
    const basePkg = options.packageName || 'com.example';
    const mapperPkg = options.mapperPackage || d2cPkg(basePkg, 'mapper');
    const entityPkg = options.entityPackage || d2cPkg(basePkg, 'entity');
    const entityName = options.entityName || parsed.entityName;
    const mapperName = entityName + 'Mapper';

    let code = 'package ' + mapperPkg + ';\n\n';
    code += 'import ' + entityPkg + '.' + entityName + ';\n';
    code += 'import com.baomidou.mybatisplus.core.mapper.BaseMapper;\n';
    code += 'import org.apache.ibatis.annotations.Mapper;\n\n';
    code += '@Mapper\n';
    code += 'public interface ' + mapperName + ' extends BaseMapper<' + entityName + '> {\n';
    code += '}\n';
    return code;
}

function generateMpService(parsed, options) {
    options = options || {};
    const basePkg = options.packageName || 'com.example';
    const servicePkg = options.servicePackage || d2cPkg(basePkg, 'service');
    const entityPkg = options.entityPackage || d2cPkg(basePkg, 'entity');
    const entityName = options.entityName || parsed.entityName;
    const serviceName = entityName + 'Service';

    let code = 'package ' + servicePkg + ';\n\n';
    code += 'import ' + entityPkg + '.' + entityName + ';\n';
    code += 'import com.baomidou.mybatisplus.extension.service.IService;\n\n';
    code += 'public interface ' + serviceName + ' extends IService<' + entityName + '> {\n';
    code += '}\n';
    return code;
}

function generateMpServiceImpl(parsed, options) {
    options = options || {};
    const basePkg = options.packageName || 'com.example';
    const servicePkg = options.servicePackage || d2cPkg(basePkg, 'service');
    const implPkg = options.serviceImplPackage || d2cPkg(servicePkg, 'impl');
    const mapperPkg = options.mapperPackage || d2cPkg(basePkg, 'mapper');
    const entityPkg = options.entityPackage || d2cPkg(basePkg, 'entity');
    const entityName = options.entityName || parsed.entityName;
    const mapperName = entityName + 'Mapper';
    const serviceName = entityName + 'Service';
    const implName = entityName + 'ServiceImpl';

    let code = 'package ' + implPkg + ';\n\n';
    code += 'import ' + entityPkg + '.' + entityName + ';\n';
    code += 'import ' + mapperPkg + '.' + mapperName + ';\n';
    code += 'import ' + servicePkg + '.' + serviceName + ';\n';
    code += 'import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;\n';
    code += 'import org.springframework.stereotype.Service;\n\n';
    code += '@Service\n';
    code +=
        'public class ' +
        implName +
        ' extends ServiceImpl<' +
        mapperName +
        ', ' +
        entityName +
        '>\n';
    code += '        implements ' + serviceName + ' {\n';
    code += '}\n';
    return code;
}

function generateMpController(parsed, options) {
    options = options || {};
    const basePkg = options.packageName || 'com.example';
    const controllerPkg = options.controllerPackage || d2cPkg(basePkg, 'controller');
    const servicePkg = options.servicePackage || d2cPkg(basePkg, 'service');
    const entityPkg = options.entityPackage || d2cPkg(basePkg, 'entity');
    const entityName = options.entityName || parsed.entityName;
    const serviceName = entityName + 'Service';
    const controllerName = entityName + 'Controller';
    const path =
        options.apiPath ||
        '/' +
            entityName
                .replace(/([a-z])([A-Z])/g, '$1-$2')
                .toLowerCase()
                .replace(/^-/, '');
    const pkField = parsed.fields.find(function (f) {
        return f.pk;
    });
    const pkType = pkField ? pkField.javaType : 'Long';
    const pkProp = pkField ? pkField.property : 'id';

    let code = 'package ' + controllerPkg + ';\n\n';
    code += 'import ' + entityPkg + '.' + entityName + ';\n';
    code += 'import ' + servicePkg + '.' + serviceName + ';\n';
    code += 'import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;\n';
    code += 'import com.baomidou.mybatisplus.extension.plugins.pagination.Page;\n';
    code += 'import org.springframework.beans.factory.annotation.Autowired;\n';
    code += 'import org.springframework.web.bind.annotation.*;\n\n';
    code += 'import java.util.List;\n\n';
    code += '@RestController\n';
    code += '@RequestMapping("' + path + '")\n';
    code += 'public class ' + controllerName + ' {\n\n';
    code += '    @Autowired\n';
    code += '    private ' + serviceName + ' ' + d2cToCamel(serviceName) + ';\n\n';

    code += '    @GetMapping("/{id}")\n';
    code +=
        '    public ' +
        entityName +
        ' getById(@PathVariable("id") ' +
        pkType +
        ' id) {\n';
    code += '        return ' + d2cToCamel(serviceName) + '.getById(id);\n';
    code += '    }\n\n';

    code += '    @GetMapping("/list")\n';
    code += '    public List<' + entityName + '> list() {\n';
    code += '        return ' + d2cToCamel(serviceName) + '.list();\n';
    code += '    }\n\n';

    code += '    @GetMapping("/page")\n';
    code +=
        '    public Page<' +
        entityName +
        '> page(@RequestParam(defaultValue = "1") long current,\n';
    code +=
        '                           @RequestParam(defaultValue = "10") long size) {\n';
    code +=
        '        return ' +
        d2cToCamel(serviceName) +
        '.page(new Page<>(current, size));\n';
    code += '    }\n\n';

    code += '    @PostMapping\n';
    code += '    public boolean save(@RequestBody ' + entityName + ' entity) {\n';
    code += '        return ' + d2cToCamel(serviceName) + '.save(entity);\n';
    code += '    }\n\n';

    code += '    @PutMapping\n';
    code += '    public boolean update(@RequestBody ' + entityName + ' entity) {\n';
    code += '        return ' + d2cToCamel(serviceName) + '.updateById(entity);\n';
    code += '    }\n\n';

    code += '    @DeleteMapping("/{id}")\n';
    code += '    public boolean remove(@PathVariable("id") ' + pkType + ' id) {\n';
    code += '        return ' + d2cToCamel(serviceName) + '.removeById(id);\n';
    code += '    }\n';
    code += '}\n';
    return code;
}

/**
 * 生成全部层
 * @param {string|object} ddlOrParsed
 * @param {object} [options]
 * @returns {{entity:string, mapper:string, service:string, serviceImpl:string, controller:string, meta:object}}
 */
function generateCrudAll(ddlOrParsed, options) {
    const parsed = typeof ddlOrParsed === 'string' ? parseDdlForCrud(ddlOrParsed) : ddlOrParsed;
    options = options || {};
    return {
        entity: generateMpEntity(parsed, options),
        mapper: generateMpMapper(parsed, options),
        service: generateMpService(parsed, options),
        serviceImpl: generateMpServiceImpl(parsed, options),
        controller: generateMpController(parsed, options),
        meta: {
            table: parsed.table,
            entityName: options.entityName || parsed.entityName,
            pk: parsed.pk,
            fieldCount: parsed.fields.length,
        },
    };
}

// ========== UI ==========

function d2cGenerate() {
    const input = document.getElementById('d2cInput').value;
    const out = document.getElementById('d2cOutput');
    try {
        const packageName = document.getElementById('d2cPackage').value.trim() || 'com.example';
        const lombok = document.getElementById('d2cLombok').checked;
        const layer = document.getElementById('d2cLayer').value;
        const result = generateCrudAll(input, { packageName: packageName, lombok: lombok });
        let text = '';
        if (layer === 'all') {
            text = [
                '// ========== Entity ==========',
                result.entity,
                '// ========== Mapper ==========',
                result.mapper,
                '// ========== Service ==========',
                result.service,
                '// ========== ServiceImpl ==========',
                result.serviceImpl,
                '// ========== Controller ==========',
                result.controller,
            ].join('\n');
        } else {
            text = result[layer] || '';
        }
        out.textContent = text;
        out.className = 'output-box';
        setStatus(
            '已生成 ' +
                result.meta.entityName +
                '（' +
                result.meta.fieldCount +
                ' 字段，表 ' +
                result.meta.table +
                '）',
        );
    } catch (e) {
        out.textContent = '失败: ' + e.message;
        out.className = 'output-box error';
        setStatus('生成失败');
    }
}

function d2cClear() {
    document.getElementById('d2cInput').value = '';
    document.getElementById('d2cOutput').textContent = '';
    setStatus('已清空');
}

function d2cLoadSample() {
    document.getElementById('d2cInput').value = [
        'CREATE TABLE `sys_user` (',
        "  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',",
        "  `user_name` VARCHAR(64) NOT NULL COMMENT '用户名',",
        "  `email` VARCHAR(128) DEFAULT NULL COMMENT '邮箱',",
        "  `age` INT DEFAULT 0 COMMENT '年龄',",
        "  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',",
        '  PRIMARY KEY (`id`)',
        ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;',
    ].join('\n');
    document.getElementById('d2cPackage').value = 'com.example';
    setStatus('已加载示例');
}

if (typeof registerInit !== 'undefined') {
    registerInit('ddl2crud', function () {});
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseDdlForCrud: parseDdlForCrud,
        generateMpEntity: generateMpEntity,
        generateMpMapper: generateMpMapper,
        generateMpService: generateMpService,
        generateMpServiceImpl: generateMpServiceImpl,
        generateMpController: generateMpController,
        generateCrudAll: generateCrudAll,
        d2cToCamel: d2cToCamel,
        d2cToPascal: d2cToPascal,
        d2cInferEntity: d2cInferEntity,
    };
}
