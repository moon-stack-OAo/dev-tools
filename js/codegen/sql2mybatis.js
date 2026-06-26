// =============================================================
// SQL → MyBatis 工具
// 解析 MySQL DDL 生成 MyBatis Mapper XML 与 Mapper Interface
// =============================================================

// ---------- 类型映射表 ----------
const SQL2MB_TYPE_MAP = {
    int: {java: 'Integer', jdbc: 'INTEGER'},
    integer: {java: 'Integer', jdbc: 'INTEGER'},
    tinyint: {java: 'Integer', jdbc: 'TINYINT'},
    smallint: {java: 'Integer', jdbc: 'SMALLINT'},
    bigint: {java: 'Long', jdbc: 'BIGINT'},
    float: {java: 'Float', jdbc: 'FLOAT'},
    double: {java: 'Double', jdbc: 'DOUBLE'},
    decimal: {java: 'BigDecimal', jdbc: 'DECIMAL'},
    numeric: {java: 'BigDecimal', jdbc: 'DECIMAL'},
    number: {java: 'BigDecimal', jdbc: 'DECIMAL'},
    bit: {java: 'Boolean', jdbc: 'BIT'},
    boolean: {java: 'Boolean', jdbc: 'BOOLEAN'},
    bool: {java: 'Boolean', jdbc: 'BOOLEAN'},
    varchar: {java: 'String', jdbc: 'VARCHAR'},
    char: {java: 'String', jdbc: 'CHAR'},
    text: {java: 'String', jdbc: 'LONGVARCHAR'},
    longtext: {java: 'String', jdbc: 'LONGVARCHAR'},
    mediumtext: {java: 'String', jdbc: 'LONGVARCHAR'},
    tinytext: {java: 'String', jdbc: 'VARCHAR'},
    nvarchar: {java: 'String', jdbc: 'NVARCHAR'},
    nchar: {java: 'String', jdbc: 'NCHAR'},
    json: {java: 'String', jdbc: 'VARCHAR'},
    date: {java: 'LocalDate', jdbc: 'DATE'},
    time: {java: 'LocalTime', jdbc: 'TIME'},
    datetime: {java: 'LocalDateTime', jdbc: 'TIMESTAMP'},
    timestamp: {java: 'LocalDateTime', jdbc: 'TIMESTAMP'},
    blob: {java: 'byte[]', jdbc: 'BLOB'},
    longblob: {java: 'byte[]', jdbc: 'LONGVARBINARY'},
    mediumblob: {java: 'byte[]', jdbc: 'LONGVARBINARY'},
    binary: {java: 'byte[]', jdbc: 'BINARY'},
    varbinary: {java: 'byte[]', jdbc: 'VARBINARY'}
};

// ---------- 命名转换 ----------
function sql2mbToCamel(s) {
    if (!s) return '';
    return String(s).replace(/[_-](\w)/g, (_, c) => c.toUpperCase()).replace(/^\w/, c => c.toLowerCase());
}

function sql2mbToPascal(s) {
    if (!s) return '';
    const camel = sql2mbToCamel(s);
    return camel.charAt(0).toUpperCase() + camel.slice(1);
}

// 根据表名推断实体类名：t_user -> User、sys_user -> SysUser、user -> User
function sql2mbInferEntityName(tableName) {
    if (!tableName) return 'GeneratedEntity';
    const stripped = tableName.replace(/^(t_|tb_|sys_)/i, '');
    return sql2mbToPascal(stripped) || 'GeneratedEntity';
}

// ---------- DDL 解析 ----------
function sql2mbParseDDL(ddl) {
    if (!ddl || typeof ddl !== 'string') {
        throw new Error('DDL 内容为空');
    }

    // 提取表名：支持反引号、`db.table`、IF NOT EXISTS
    const tableMatch = ddl.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?([A-Za-z0-9_]+)`?(?:\s*\.\s*`?([A-Za-z0-9_]+)`?)?/i);
    if (!tableMatch) {
        throw new Error('未识别到 CREATE TABLE 语句');
    }
    const table = tableMatch[2] || tableMatch[1];

    // 提取 PRIMARY KEY：兼容 PRIMARY KEY (id) 与 PRIMARY KEY `id`
    let pk = null;
    const pkMatch = ddl.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
    if (pkMatch) {
        const first = pkMatch[1].split(',')[0].trim().replace(/`/g, '');
        if (first) pk = first;
    }

    // 提取字段：取出第一个 '(' 后到最后一个 ')' 之间的内容（去除尾部 ENGINE/CHARSET/COMMENT 等）
    const firstParen = ddl.indexOf('(');
    const lastParen = ddl.lastIndexOf(')');
    if (firstParen < 0 || lastParen <= firstParen) {
        throw new Error('DDL 缺少字段定义');
    }
    const body = ddl.substring(firstParen + 1, lastParen);

    // 切分行：按逗号分行，但需要避免在 COMMENT '...' 字符串内的逗号被切错
    const rows = sql2mbSplitTopLevel(body, ',');

    const fields = [];
    for (const rawRow of rows) {
        const line = rawRow.trim();
        if (!line) continue;

        // 跳过 PRIMARY KEY / KEY / INDEX / UNIQUE / CONSTRAINT / FOREIGN KEY 等
        if (/^(PRIMARY\s+KEY|UNIQUE\s+(?:KEY|INDEX)|KEY|INDEX|CONSTRAINT|FOREIGN\s+KEY|FULLTEXT|SPATIAL)\b/i.test(line)) {
            continue;
        }

        // 跳过表级 COMMENT（出现位置在表末尾，例如 COMMENT='用户表'）
        if (/^(COMMENT|ENGINE|DEFAULT\s+CHARSET|DEFAULT\s+CHARSET\s*=|CHARSET\s*=)/i.test(line)) {
            continue;
        }

        // 提取字段名
        const nameMatch = line.match(/^`?([A-Za-z0-9_]+)`?/);
        if (!nameMatch) continue;
        const name = nameMatch[1];

        // 提取类型：紧跟字段名后的第一个词（可能带括号长度）
        const restAfterName = line.substring(nameMatch[0].length).trim();
        const typeMatch = restAfterName.match(/^([A-Za-z]+)\s*(\(\s*([0-9]+)\s*\))?/);
        if (!typeMatch) continue;
        const sqlType = typeMatch[1].toLowerCase();
        const length = typeMatch[3] ? parseInt(typeMatch[3], 10) : null;

        const typeInfo = SQL2MB_TYPE_MAP[sqlType] || {java: 'String', jdbc: 'VARCHAR'};

        // 提取 NOT NULL / NULL
        const notNull = /NOT\s+NULL/i.test(line);

        // AUTO_INCREMENT
        const autoInc = /AUTO_INCREMENT/i.test(line);

        // COMMENT 'xxx'
        const commentMatch = line.match(/COMMENT\s+'((?:[^'\\]|\\.|'')*)'/i);
        const comment = commentMatch ? commentMatch[1].replace(/''/g, "'") : '';

        // DEFAULT 值（粗略提取，仅用于记录）
        const defaultMatch = line.match(/DEFAULT\s+('(?:[^'\\]|\\.|'')*'|NULL|CURRENT_TIMESTAMP|NOW\(\)|[0-9.+-]+)/i);
        const defaultVal = defaultMatch ? defaultMatch[1] : '';

        // 如果尚未识别到主键，且字段被标记为 PRIMARY KEY（行内主键定义）
        if (!pk && /\bPRIMARY\s+KEY\b/i.test(line)) {
            pk = name;
        }

        fields.push({
            name,
            sqlType: typeMatch[1],
            length,
            notNull,
            autoInc,
            defaultVal,
            jdbcType: typeInfo.jdbc,
            javaType: typeInfo.java,
            comment,
            pk: false
        });
    }

    if (fields.length === 0) {
        throw new Error('未识别到任何字段');
    }

    // 主键标记
    if (pk) {
        const pkField = fields.find(f => f.name === pk);
        if (pkField) pkField.pk = true;
        else {
            // 主键未在字段列表中（罕见情况），加一个占位字段
            const pkType = SQL2MB_TYPE_MAP.bigint;
            fields.unshift({
                name: pk,
                sqlType: 'bigint',
                length: 20,
                notNull: true,
                autoInc: true,
                defaultVal: '',
                jdbcType: pkType.jdbc,
                javaType: pkType.java,
                comment: '主键',
                pk: true
            });
        }
    } else {
        // 兜底：默认第一字段为主键
        fields[0].pk = true;
        pk = fields[0].name;
    }

    return {table, pk, fields};
}

// 按顶层分隔符切分字符串（处理引号与括号嵌套）
function sql2mbSplitTopLevel(str, sep) {
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

// ---------- 自动联动 ----------
function sql2mbAutoParse() {
    const input = document.getElementById('sql2mbInput').value;
    if (!input.trim()) return;
    let parsed;
    try {
        parsed = sql2mbParseDDL(input);
    } catch (e) {
        return; // 解析失败时不打扰用户
    }

    const tableEl = document.getElementById('sql2mbTable');
    const entityEl = document.getElementById('sql2mbEntity');
    const pkEl = document.getElementById('sql2mbPk');
    const pkJdbcEl = document.getElementById('sql2mbPkJdbc');

    // 自动联动：仅在字段为空时填充，避免覆盖用户已输入的值
    if (!tableEl.value.trim()) tableEl.value = parsed.table;
    if (!entityEl.value.trim()) entityEl.value = sql2mbInferEntityName(parsed.table);
    if (!pkEl.value.trim()) pkEl.value = parsed.pk;
    if (!pkJdbcEl.value.trim()) {
        const pkField = parsed.fields.find(f => f.name === parsed.pk);
        if (pkField) pkJdbcEl.value = pkField.jdbcType;
    }
}

// ---------- 生成主流程 ----------
function sql2mbGenerate() {
    const input = document.getElementById('sql2mbInput').value;
    const xmlOut = document.getElementById('sql2mbXmlOutput');
    const javaOut = document.getElementById('sql2mbJavaOutput');
    const status = document.getElementById('sql2mbStatus');

    // 清空错误状态
    xmlOut.classList.remove('error');
    javaOut.classList.remove('error');
    xmlOut.textContent = '';
    javaOut.textContent = '';

    if (!input.trim()) {
        toast('请输入 DDL');
        xmlOut.classList.add('error');
        xmlOut.textContent = '请输入 CREATE TABLE 语句';
        setStatus('生成失败');
        return;
    }

    let parsed;
    try {
        parsed = sql2mbParseDDL(input);
    } catch (e) {
        toast('DDL 解析失败: ' + e.message);
        xmlOut.classList.add('error');
        xmlOut.textContent = 'DDL 解析失败: ' + e.message;
        javaOut.classList.add('error');
        javaOut.textContent = 'DDL 解析失败: ' + e.message;
        setStatus('解析失败');
        return;
    }

    const mode = document.getElementById('sql2mbMode').value;
    const resultMode = document.getElementById('sql2mbResultMode').value;

    // 用户自定义值优先，未填写则回退到解析结果
    const table = (document.getElementById('sql2mbTable').value || parsed.table).trim();
    const entity = (document.getElementById('sql2mbEntity').value || sql2mbInferEntityName(parsed.table)).trim();
    const pk = (document.getElementById('sql2mbPk').value || parsed.pk).trim();
    const pkJdbc = (document.getElementById('sql2mbPkJdbc').value ||
        (parsed.fields.find(f => f.name === parsed.pk) || {}).jdbcType || 'BIGINT').trim();
    const namespace = (document.getElementById('sql2mbNamespace').value || 'com.example.mapper.' + entity + 'Mapper').trim();
    const useGen = document.getElementById('sql2mbUseGen').checked;
    const useParam = document.getElementById('sql2mbUseParam').checked;

    const cfg = {table, entity, pk, pkJdbc, namespace, useGen, useParam, resultMode, fields: parsed.fields};

    if (mode === 'xml' || mode === 'both') {
        xmlOut.textContent = sql2mbBuildXml(cfg);
    }
    if (mode === 'mapper' || mode === 'both') {
        javaOut.textContent = sql2mbBuildMapperInterface(cfg);
    }

    const parts = [];
    if (mode === 'xml' || mode === 'both') parts.push('XML');
    if (mode === 'mapper' || mode === 'both') parts.push('Mapper');
    setStatus('已生成 ' + parts.join(' + ') + ' · ' + parsed.fields.length + ' 个字段 · 主键: ' + pk);
}

// ---------- XML 生成 ----------
function sql2mbBuildXml(cfg) {
    const lines = [];
    const resultMapId = cfg.entity + 'Map';
    const baseColListId = 'Base_Column_List';

    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">');
    lines.push('<mapper namespace="' + cfg.namespace + '">');
    lines.push('');

    // ----- resultMap -----
    lines.push('    <!-- 结果映射 -->');
    lines.push('    <resultMap id="' + resultMapId + '" type="' + sql2mbEntityQualifiedName(cfg) + '">');
    cfg.fields.forEach(f => {
        const commentSuffix = f.comment ? ' <!-- ' + f.comment + ' -->' : '';
        if (f.pk) {
            const jdbc = f.jdbcType || cfg.pkJdbc || 'BIGINT';
            lines.push('        <id column="' + f.name + '" property="' + sql2mbToCamel(f.name) + '" jdbcType="' + jdbc + '" />' + commentSuffix);
        } else {
            lines.push('        <result column="' + f.name + '" property="' + sql2mbToCamel(f.name) + '" jdbcType="' + f.jdbcType + '" />' + commentSuffix);
        }
    });
    lines.push('    </resultMap>');
    lines.push('');

    // ----- Base_Column_List -----
    lines.push('    <!-- 通用列 -->');
    lines.push('    <sql id="' + baseColListId + '">');
    lines.push('        ' + cfg.fields.map(f => '`' + f.name + '`').join(', '));
    lines.push('    </sql>');
    lines.push('');

    // ----- selectByPrimaryKey -----
    const pkField = cfg.fields.find(f => f.name === cfg.pk) || cfg.fields[0];
    const pkJdbc = pkField.jdbcType || cfg.pkJdbc || 'BIGINT';
    const pkJava = pkField.javaType || 'Long';
    lines.push('    <!-- 主键查询 -->');
    lines.push('    <select id="selectByPrimaryKey" parameterType="' + pkJava + '" ' + sql2mbResultMapAttr(cfg) + '>');
    lines.push('        select');
    lines.push('        <include refid="' + baseColListId + '" />');
    lines.push('        from ' + cfg.table);
    lines.push('        where `' + cfg.pk + '` = #{' + cfg.pk + '}');
    lines.push('    </select>');
    lines.push('');

    // ----- deleteByPrimaryKey -----
    lines.push('    <!-- 主键删除 -->');
    lines.push('    <delete id="deleteByPrimaryKey" parameterType="' + pkJava + '">');
    lines.push('        delete from ' + cfg.table);
    lines.push('        where `' + cfg.pk + '` = #{' + cfg.pk + '}');
    lines.push('    </delete>');
    lines.push('');

    // ----- insert (全量) -----
    lines.push('    <!-- 全量插入 -->');
    if (cfg.useGen && pkField.autoInc) {
        lines.push('    <insert id="insert" parameterType="' + sql2mbEntityQualifiedName(cfg) + '" useGeneratedKeys="true" keyProperty="' + cfg.pk + '">');
    } else {
        lines.push('    <insert id="insert" parameterType="' + sql2mbEntityQualifiedName(cfg) + '">');
    }
    lines.push('        insert into ' + cfg.table + ' (' + cfg.fields.map(f => '`' + f.name + '`').join(', ') + ')');
    lines.push('        values (' + cfg.fields.map(f => '#{' + sql2mbToCamel(f.name) + ', jdbcType=' + f.jdbcType + '}').join(', ') + ')');
    lines.push('    </insert>');
    lines.push('');

    // ----- insertSelective -----
    lines.push('    <!-- 选择性插入（NULL 字段不写入） -->');
    if (cfg.useGen && pkField.autoInc) {
        lines.push('    <insert id="insertSelective" parameterType="' + sql2mbEntityQualifiedName(cfg) + '" useGeneratedKeys="true" keyProperty="' + cfg.pk + '">');
    } else {
        lines.push('    <insert id="insertSelective" parameterType="' + sql2mbEntityQualifiedName(cfg) + '">');
    }
    lines.push('        insert into ' + cfg.table);
    lines.push('        <trim prefix="(" suffix=")" suffixOverrides=",">');
    cfg.fields.forEach(f => {
        lines.push('            <if test="' + sql2mbToCamel(f.name) + ' != null">');
        lines.push('                `' + f.name + '`,');
        lines.push('            </if>');
    });
    lines.push('        </trim>');
    lines.push('        <trim prefix="values (" suffix=")" suffixOverrides=",">');
    cfg.fields.forEach(f => {
        lines.push('            <if test="' + sql2mbToCamel(f.name) + ' != null">');
        lines.push('                #{' + sql2mbToCamel(f.name) + ', jdbcType=' + f.jdbcType + '},');
        lines.push('            </if>');
    });
    lines.push('        </trim>');
    lines.push('    </insert>');
    lines.push('');

    // ----- updateByPrimaryKeySelective -----
    lines.push('    <!-- 选择性更新 -->');
    lines.push('    <update id="updateByPrimaryKeySelective" parameterType="' + sql2mbEntityQualifiedName(cfg) + '">');
    lines.push('        update ' + cfg.table);
    lines.push('        <set>');
    cfg.fields.filter(f => !f.pk).forEach(f => {
        lines.push('            <if test="' + sql2mbToCamel(f.name) + ' != null">');
        lines.push('                `' + f.name + '` = #{' + sql2mbToCamel(f.name) + ', jdbcType=' + f.jdbcType + '},');
        lines.push('            </if>');
    });
    lines.push('        </set>');
    lines.push('        where `' + cfg.pk + '` = #{' + sql2mbToCamel(cfg.pk) + '}');
    lines.push('    </update>');
    lines.push('');

    // ----- updateByPrimaryKey (全量) -----
    lines.push('    <!-- 全量更新 -->');
    lines.push('    <update id="updateByPrimaryKey" parameterType="' + sql2mbEntityQualifiedName(cfg) + '">');
    lines.push('        update ' + cfg.table);
    lines.push('        set ' + cfg.fields.filter(f => !f.pk).map(f => '`' + f.name + '` = #{' + sql2mbToCamel(f.name) + ', jdbcType=' + f.jdbcType + '}').join(',\n            '));
    lines.push('        where `' + cfg.pk + '` = #{' + sql2mbToCamel(cfg.pk) + '}');
    lines.push('    </update>');
    lines.push('');

    // ----- selectAll -----
    lines.push('    <!-- 查询全部 -->');
    lines.push('    <select id="selectAll" ' + sql2mbResultMapAttr(cfg) + '>');
    lines.push('        select');
    lines.push('        <include refid="' + baseColListId + '" />');
    lines.push('        from ' + cfg.table);
    lines.push('    </select>');

    lines.push('');
    lines.push('</mapper>');
    return lines.join('\n');
}

// 实体类限定名：默认 com.example.entity.Xxx
function sql2mbEntityQualifiedName(cfg) {
    const ns = cfg.namespace || '';
    const dot = ns.lastIndexOf('.');
    const basePkg = dot > 0 ? ns.substring(0, dot) : 'com.example';
    const entityPkg = basePkg
        .replace(/\.mapper$/i, '.entity')
        .replace(/\.dao$/i, '.entity')
        .replace(/\.mappers$/i, '.entity');
    return entityPkg + '.' + cfg.entity;
}

// resultType/resultMap 属性片段
function sql2mbResultMapAttr(cfg) {
    if (cfg.resultMode === 'resultType') {
        return 'resultType="' + sql2mbEntityQualifiedName(cfg) + '"';
    }
    return 'resultMap="' + cfg.entity + 'Map"';
}

// ---------- Mapper Interface 生成 ----------
function sql2mbBuildMapperInterface(cfg) {
    const lines = [];
    const entityQualified = sql2mbEntityQualifiedName(cfg);
    const pkField = cfg.fields.find(f => f.name === cfg.pk) || cfg.fields[0];
    const pkJava = pkField.javaType || 'Long';

    const ns = cfg.namespace || '';
    const dot = ns.lastIndexOf('.');
    const pkg = dot > 0 ? ns.substring(0, dot) : 'com.example.mapper';

    lines.push('package ' + pkg + ';');
    lines.push('');
    lines.push('import ' + entityQualified + ';');
    lines.push('import java.util.List;');
    if (cfg.useParam) lines.push('import org.apache.ibatis.annotations.Param;');
    lines.push('');

    const interfaceName = ns.substring(dot + 1) || (cfg.entity + 'Mapper');
    lines.push('public interface ' + interfaceName + ' {');
    lines.push('');

    // deleteByPrimaryKey
    lines.push('    /**');
    lines.push('     * 根据主键删除');
    lines.push('     */');
    lines.push('    int deleteByPrimaryKey(' + sql2mbParam(cfg, pkJava, cfg.pk) + ');');
    lines.push('');

    // insert
    lines.push('    /**');
    lines.push('     * 全量插入');
    lines.push('     */');
    lines.push('    int insert(' + sql2mbParam(cfg, cfg.entity, 'record') + ');');
    lines.push('');

    // insertSelective
    lines.push('    /**');
    lines.push('     * 选择性插入');
    lines.push('     */');
    lines.push('    int insertSelective(' + sql2mbParam(cfg, cfg.entity, 'record') + ');');
    lines.push('');

    // selectByPrimaryKey
    lines.push('    /**');
    lines.push('     * 根据主键查询');
    lines.push('     */');
    lines.push('    ' + cfg.entity + ' selectByPrimaryKey(' + sql2mbParam(cfg, pkJava, cfg.pk) + ');');
    lines.push('');

    // updateByPrimaryKeySelective
    lines.push('    /**');
    lines.push('     * 选择性更新');
    lines.push('     */');
    lines.push('    int updateByPrimaryKeySelective(' + sql2mbParam(cfg, cfg.entity, 'record') + ');');
    lines.push('');

    // updateByPrimaryKey
    lines.push('    /**');
    lines.push('     * 全量更新');
    lines.push('     */');
    lines.push('    int updateByPrimaryKey(' + sql2mbParam(cfg, cfg.entity, 'record') + ');');
    lines.push('');

    // selectAll
    lines.push('    /**');
    lines.push('     * 查询全部');
    lines.push('     */');
    lines.push('    List<' + cfg.entity + '> selectAll();');

    lines.push('');
    lines.push('}');
    return lines.join('\n');
}

function sql2mbParam(cfg, javaType, name) {
    if (!cfg.useParam) return javaType + ' ' + name;
    return '@Param("' + name + '") ' + javaType + ' ' + name;
}

// ---------- 事件处理 ----------
function sql2mbLoadExample() {
    const example = [
        "CREATE TABLE `user` (",
        "  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键ID',",
        "  `user_name` varchar(50) DEFAULT NULL COMMENT '用户名',",
        "  `email` varchar(100) DEFAULT NULL COMMENT '邮箱',",
        "  `age` int(11) DEFAULT NULL COMMENT '年龄',",
        "  `status` tinyint(4) DEFAULT '1' COMMENT '状态 1-正常 0-禁用',",
        "  `created_at` datetime DEFAULT NULL COMMENT '创建时间',",
        "  `updated_at` datetime DEFAULT NULL COMMENT '更新时间',",
        "  PRIMARY KEY (`id`),",
        "  KEY `idx_email` (`email`)",
        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';"
    ].join('\n');
    document.getElementById('sql2mbInput').value = example;
    sql2mbAutoParse();
    sql2mbGenerate();
}

function sql2mbClearInput() {
    document.getElementById('sql2mbInput').value = '';
    const xmlOut = document.getElementById('sql2mbXmlOutput');
    const javaOut = document.getElementById('sql2mbJavaOutput');
    xmlOut.textContent = '';
    javaOut.textContent = '';
    xmlOut.classList.remove('error');
    javaOut.classList.remove('error');
    document.getElementById('sql2mbStatus').textContent = '';
}

function sql2mbCopyAll() {
    const xmlText = document.getElementById('sql2mbXmlOutput').textContent;
    const javaText = document.getElementById('sql2mbJavaOutput').textContent;
    const parts = [];
    if (xmlText && !xmlText.startsWith('DDL')) parts.push('// ===== Mapper XML =====\n' + xmlText);
    if (javaText && !javaText.startsWith('DDL')) parts.push('// ===== Mapper Interface =====\n' + javaText);
    if (!parts.length) {
        toast('暂无可复制内容，请先生成');
        return;
    }
    safeCopy(parts.join('\n\n'), '已复制 XML + Mapper');
}

// =============================================================
// 下载 ZIP：将当前界面已生成的 XML 与 Interface 打包下载
// 严格复用 #sql2mbXmlOutput / #sql2mbJavaOutput 的内容，不重复解析 DDL，
// 保证 ZIP 内文件与界面展示完全一致。
// =============================================================
function sql2mbDownloadZip() {
    // 1. 读取界面上的生成结果
    const xmlText = document.getElementById('sql2mbXmlOutput').textContent;
    const javaText = document.getElementById('sql2mbJavaOutput').textContent;

    // 2. 校验是否已生成（避免看似可点但无反应）
    //    错误态文案以 "DDL" 开头，正常内容以 "<?xml" / "package " 开头
    const hasXml = xmlText && !xmlText.startsWith('DDL') && !xmlText.startsWith('请输入');
    const hasJava = javaText && !javaText.startsWith('DDL') && !javaText.startsWith('请输入');
    if (!hasXml && !hasJava) {
        toast('请先生成');
        return;
    }

    // 3. 推导包名路径与实体类名（与生成逻辑保持一致；空值兜底）
    const entityEl = document.getElementById('sql2mbEntity');
    const nsEl = document.getElementById('sql2mbNamespace');
    const entityName = (entityEl && entityEl.value.trim()) ? entityEl.value.trim() : 'User';
    const namespace = (nsEl && nsEl.value.trim()) ? nsEl.value.trim() : ('com.example.mapper.' + entityName + 'Mapper');

    // 从 namespace（如 com.example.mapper.UserMapper）取包名 com.example.mapper
    const lastDot = namespace.lastIndexOf('.');
    const mapperPackage = lastDot > 0 ? namespace.substring(0, lastDot) : 'com.example.mapper';
    // 包名 -> 目录路径：com.example.mapper -> com/example/mapper
    const mapperPackagePath = mapperPackage.replace(/\./g, '/');

    // 接口文件名：namespace 最后一段（无点号时回退到 <Entity>Mapper）
    const interfaceSimpleName = lastDot > 0 ? namespace.substring(lastDot + 1) : (entityName + 'Mapper');
    const xmlFileName = interfaceSimpleName + '.xml';
    const javaFileName = interfaceSimpleName + '.java';

    // 4. 生成带时间戳的下载文件名，避免重复覆盖
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const ts = now.getFullYear()
        + pad(now.getMonth() + 1)
        + pad(now.getDate())
        + pad(now.getHours())
        + pad(now.getMinutes())
        + pad(now.getSeconds());
    const downloadName = 'mybatis-' + entityName + '-' + ts + '.zip';

    // 5. 使用 JSZip 打包（全局 JSZip 由 index.html 引入）
    try {
        if (typeof JSZip === 'undefined') {
            toast('ZIP 打包失败: 未加载 JSZip，请检查 lib/jszip.min.js');
            return;
        }
        const zip = new JSZip();
        if (hasXml) {
            zip.file(mapperPackagePath + '/' + xmlFileName, xmlText);
        }
        if (hasJava) {
            zip.file(mapperPackagePath + '/' + javaFileName, javaText);
        }

        // 6. 异步生成 Blob -> 触发浏览器下载（避免 data: URI 大文件卡顿）
        zip.generateAsync({type: 'blob', compression: 'DEFLATE', compressionOptions: {level: 6}})
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = downloadName;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                // 释放临时 URL，避免内存泄漏
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                toast('已下载 ZIP');
            })
            .catch(err => {
                console.error('[sql2mybatis] ZIP 生成失败', err);
                toast('ZIP 打包失败: ' + (err && err.message ? err.message : err));
            });
    } catch (e) {
        console.error('[sql2mybatis] ZIP 打包异常', e);
        toast('ZIP 打包失败: ' + (e && e.message ? e.message : e));
    }
}

function sql2mbSwitchTab(tab) {
    const tabs = ['xml', 'mapper'];
    tabs.forEach(t => {
        const tabEl = document.getElementById('sql2mbTab-' + t);
        const contentEl = document.getElementById('sql2mbTabContent-' + t);
        if (!tabEl || !contentEl) return;
        if (t === tab) {
            tabEl.classList.add('active');
            contentEl.classList.add('active');
        } else {
            tabEl.classList.remove('active');
            contentEl.classList.remove('active');
        }
    });
}

// ---------- 自动联动绑定 ----------
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
        const input = document.getElementById('sql2mbInput');
        if (input) {
            input.addEventListener('input', sql2mbAutoParse);
        }
    });
}