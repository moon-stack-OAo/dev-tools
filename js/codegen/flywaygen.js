// Flyway / Liquibase 迁移骨架生成

/**
 * 生成 Flyway 文件名
 * @param {string|number} version 如 1 / 1.2 / 20240727.1
 * @param {string} description
 * @returns {string} V1__desc.sql
 */
function flywayFileName(version, description) {
    if (version == null || String(version).trim() === '') {
        throw new Error('请输入版本号');
    }
    let v = String(version).trim();
    // 去掉前缀 V
    if (/^V/i.test(v)) v = v.slice(1);
    // 不允许路径非法字符
    v = v.replace(/[^\w.-]/g, '_');
    if (!v) throw new Error('版本号无效');

    let desc = description == null ? '' : String(description).trim();
    desc = desc
        .replace(/\s+/g, '_')
        .replace(/[^\w\u4e00-\u9fff.-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
    if (!desc) desc = 'migration';
    return 'V' + v + '__' + desc + '.sql';
}

/**
 * 生成 Flyway SQL 模板
 * @param {string|number} version
 * @param {string} description
 * @param {object} [options]
 * @param {string} [options.ddl] 可选 DDL 正文
 * @param {string} [options.author]
 * @returns {string}
 */
function flywayTemplate(version, description, options) {
    const opts = options || {};
    const fileName = flywayFileName(version, description);
    const author = opts.author || 'dev';
    const desc = (description && String(description).trim()) || 'migration';
    const now = new Date().toISOString().slice(0, 10);
    const lines = [];
    lines.push('-- ' + fileName);
    lines.push('-- Description: ' + desc);
    lines.push('-- Author: ' + author);
    lines.push('-- Date: ' + now);
    lines.push('');
    if (opts.ddl && String(opts.ddl).trim()) {
        lines.push(String(opts.ddl).trim());
        lines.push('');
    } else {
        lines.push('-- TODO: write migration SQL');
        lines.push('-- Example:');
        lines.push('-- ALTER TABLE demo ADD COLUMN new_col VARCHAR(64) NULL COMMENT \'说明\';');
        lines.push('');
    }
    return lines.join('\n');
}

/**
 * 生成 Liquibase YAML changeset 骨架
 * @param {object} opts
 * @param {string} [opts.id]
 * @param {string} [opts.author='dev']
 * @param {string} [opts.comment]
 * @param {string} [opts.sql]
 * @param {string} [opts.oldColumn]
 * @param {string} [opts.newColumn]
 * @param {string} [opts.table]
 * @param {string} [opts.columnType='varchar(64)']
 * @param {'sql'|'renameColumn'|'addColumn'} [opts.changeType]
 * @returns {string}
 */
function liquibaseYamlTemplate(opts) {
    const o = opts || {};
    const id = o.id || 'changeset-' + Date.now();
    const author = o.author || 'dev';
    const comment = o.comment || o.description || '';
    const changeType = o.changeType || (o.oldColumn && o.newColumn ? 'renameColumn' : o.newColumn ? 'addColumn' : 'sql');

    const lines = [];
    lines.push('databaseChangeLog:');
    lines.push('  - changeSet:');
    lines.push('      id: ' + yamlQuote(id));
    lines.push('      author: ' + yamlQuote(author));
    if (comment) {
        lines.push('      comment: ' + yamlQuote(comment));
    }

    if (changeType === 'renameColumn') {
        const table = o.table || 'table_name';
        const oldCol = o.oldColumn || 'old_col';
        const newCol = o.newColumn || 'new_col';
        const colType = o.columnType || 'varchar(64)';
        lines.push('      changes:');
        lines.push('        - renameColumn:');
        lines.push('            tableName: ' + yamlQuote(table));
        lines.push('            oldColumnName: ' + yamlQuote(oldCol));
        lines.push('            newColumnName: ' + yamlQuote(newCol));
        lines.push('            columnDataType: ' + yamlQuote(colType));
    } else if (changeType === 'addColumn') {
        const table = o.table || 'table_name';
        const newCol = o.newColumn || 'new_col';
        const colType = o.columnType || 'varchar(64)';
        lines.push('      changes:');
        lines.push('        - addColumn:');
        lines.push('            tableName: ' + yamlQuote(table));
        lines.push('            columns:');
        lines.push('              - column:');
        lines.push('                  name: ' + yamlQuote(newCol));
        lines.push('                  type: ' + yamlQuote(colType));
        lines.push('                  constraints:');
        lines.push('                    nullable: true');
    } else {
        const sql = (o.sql && String(o.sql).trim()) || '-- TODO: SQL here';
        lines.push('      changes:');
        lines.push('        - sql:');
        lines.push('            sql: |');
        sql.split(/\r?\n/).forEach(function (line) {
            lines.push('              ' + line);
        });
    }
    lines.push('');
    return lines.join('\n');
}

/**
 * 生成 Liquibase XML changeset 骨架
 * @param {object} opts 同 liquibaseYamlTemplate
 * @returns {string}
 */
function liquibaseXmlTemplate(opts) {
    const o = opts || {};
    const id = o.id || 'changeset-' + Date.now();
    const author = o.author || 'dev';
    const comment = o.comment || o.description || '';
    const changeType = o.changeType || (o.oldColumn && o.newColumn ? 'renameColumn' : o.newColumn ? 'addColumn' : 'sql');

    const lines = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<databaseChangeLog');
    lines.push('    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"');
    lines.push('    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
    lines.push(
        '    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">',
    );
    lines.push('');
    lines.push('    <changeSet id="' + xmlEsc(id) + '" author="' + xmlEsc(author) + '">');
    if (comment) {
        lines.push('        <comment>' + xmlEsc(comment) + '</comment>');
    }

    if (changeType === 'renameColumn') {
        const table = o.table || 'table_name';
        const oldCol = o.oldColumn || 'old_col';
        const newCol = o.newColumn || 'new_col';
        const colType = o.columnType || 'varchar(64)';
        lines.push(
            '        <renameColumn tableName="' +
                xmlEsc(table) +
                '" oldColumnName="' +
                xmlEsc(oldCol) +
                '" newColumnName="' +
                xmlEsc(newCol) +
                '" columnDataType="' +
                xmlEsc(colType) +
                '"/>',
        );
    } else if (changeType === 'addColumn') {
        const table = o.table || 'table_name';
        const newCol = o.newColumn || 'new_col';
        const colType = o.columnType || 'varchar(64)';
        lines.push('        <addColumn tableName="' + xmlEsc(table) + '">');
        lines.push('            <column name="' + xmlEsc(newCol) + '" type="' + xmlEsc(colType) + '">');
        lines.push('                <constraints nullable="true"/>');
        lines.push('            </column>');
        lines.push('        </addColumn>');
    } else {
        const sql = (o.sql && String(o.sql).trim()) || '-- TODO: SQL here';
        lines.push('        <sql><![CDATA[');
        lines.push(sql);
        lines.push('        ]]></sql>');
    }

    lines.push('    </changeSet>');
    lines.push('');
    lines.push('</databaseChangeLog>');
    lines.push('');
    return lines.join('\n');
}

/**
 * 从旧列/新列生成 rename 或 add 的 SQL 片段
 * @param {object} opts
 * @param {string} opts.table
 * @param {string} [opts.oldColumn]
 * @param {string} opts.newColumn
 * @param {string} [opts.columnType='VARCHAR(64)']
 * @param {'mysql'|'postgres'|'oracle'|'sqlserver'} [opts.dialect='mysql']
 * @returns {string}
 */
function columnChangeSql(opts) {
    const o = opts || {};
    const table = o.table || 'table_name';
    const newCol = o.newColumn;
    if (!newCol) throw new Error('请输入新列名');
    const oldCol = o.oldColumn;
    const colType = o.columnType || 'VARCHAR(64)';
    const dialect = o.dialect || 'mysql';

    if (oldCol && String(oldCol).trim()) {
        // rename
        if (dialect === 'mysql') {
            return 'ALTER TABLE ' + table + ' CHANGE COLUMN ' + oldCol + ' ' + newCol + ' ' + colType + ';';
        }
        if (dialect === 'sqlserver') {
            return "EXEC sp_rename '" + table + "." + oldCol + "', '" + newCol + "', 'COLUMN';";
        }
        // postgres / oracle
        return 'ALTER TABLE ' + table + ' RENAME COLUMN ' + oldCol + ' TO ' + newCol + ';';
    }
    // add
    if (dialect === 'sqlserver') {
        return 'ALTER TABLE ' + table + ' ADD ' + newCol + ' ' + colType + ' NULL;';
    }
    return 'ALTER TABLE ' + table + ' ADD COLUMN ' + newCol + ' ' + colType + ' NULL;';
}

function yamlQuote(s) {
    const str = String(s);
    if (/[:#{}[\],&*?|>!%@`]/.test(str) || /^\s|\s$/.test(str) || str === '') {
        return '"' + str.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
    }
    return str;
}

function xmlEsc(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// === UI ===

function flyGenFlyway() {
    const version = document.getElementById('flyVersion').value;
    const desc = document.getElementById('flyDesc').value;
    const ddl = document.getElementById('flyDdl').value;
    const author = document.getElementById('flyAuthor').value;
    const out = document.getElementById('flyOutput');
    const nameOut = document.getElementById('flyFileName');
    try {
        const name = flywayFileName(version, desc);
        const content = flywayTemplate(version, desc, { ddl: ddl, author: author });
        if (nameOut) nameOut.textContent = name;
        out.textContent = content;
        out.className = 'output-box fly-output';
        if (typeof setStatus === 'function') setStatus('已生成 Flyway: ' + name);
    } catch (e) {
        out.textContent = e.message;
        out.className = 'output-box fly-output error';
    }
}

function flyGenLiquibase() {
    const format = document.getElementById('flyLbFormat').value;
    const id = document.getElementById('flyLbId').value.trim() || undefined;
    const author = document.getElementById('flyAuthor').value;
    const comment = document.getElementById('flyDesc').value;
    const table = document.getElementById('flyTable').value.trim();
    const oldCol = document.getElementById('flyOldCol').value.trim();
    const newCol = document.getElementById('flyNewCol').value.trim();
    const colType = document.getElementById('flyColType').value.trim();
    const ddl = document.getElementById('flyDdl').value;
    const out = document.getElementById('flyOutput');
    const nameOut = document.getElementById('flyFileName');

    let changeType = 'sql';
    if (oldCol && newCol) changeType = 'renameColumn';
    else if (newCol) changeType = 'addColumn';

    const opts = {
        id: id,
        author: author,
        comment: comment,
        table: table || undefined,
        oldColumn: oldCol || undefined,
        newColumn: newCol || undefined,
        columnType: colType || undefined,
        sql: ddl || undefined,
        changeType: changeType,
    };

    try {
        const content = format === 'xml' ? liquibaseXmlTemplate(opts) : liquibaseYamlTemplate(opts);
        if (nameOut) {
            nameOut.textContent = format === 'xml' ? 'db.changelog-xxx.xml' : 'db.changelog-xxx.yaml';
        }
        out.textContent = content;
        out.className = 'output-box fly-output';
        if (typeof setStatus === 'function') setStatus('已生成 Liquibase ' + format.toUpperCase());
    } catch (e) {
        out.textContent = e.message;
        out.className = 'output-box fly-output error';
    }
}

function flyGenColumnSql() {
    const table = document.getElementById('flyTable').value.trim();
    const oldCol = document.getElementById('flyOldCol').value.trim();
    const newCol = document.getElementById('flyNewCol').value.trim();
    const colType = document.getElementById('flyColType').value.trim();
    const dialect = document.getElementById('flyDialect').value;
    const out = document.getElementById('flyOutput');
    try {
        const sql = columnChangeSql({
            table: table,
            oldColumn: oldCol,
            newColumn: newCol,
            columnType: colType,
            dialect: dialect,
        });
        document.getElementById('flyDdl').value = sql;
        document.getElementById('flyFileName').textContent = '(列变更 SQL)';
        out.textContent = sql;
        out.className = 'output-box fly-output';
        if (typeof setStatus === 'function') setStatus('已生成列变更 SQL');
    } catch (e) {
        out.textContent = e.message;
        out.className = 'output-box fly-output error';
    }
}

function flyLoadSample() {
    document.getElementById('flyVersion').value = '1.0.1';
    document.getElementById('flyDesc').value = 'add user email';
    document.getElementById('flyAuthor').value = 'dev';
    document.getElementById('flyTable').value = 'sys_user';
    document.getElementById('flyOldCol').value = '';
    document.getElementById('flyNewCol').value = 'email';
    document.getElementById('flyColType').value = 'VARCHAR(128)';
    document.getElementById('flyDdl').value =
        'ALTER TABLE sys_user ADD COLUMN email VARCHAR(128) NULL COMMENT \'邮箱\';';
    document.getElementById('flyLbId').value = '20240727-add-user-email';
    flyGenFlyway();
}

function flyClear() {
    ['flyVersion', 'flyDesc', 'flyAuthor', 'flyTable', 'flyOldCol', 'flyNewCol', 'flyColType', 'flyDdl', 'flyLbId'].forEach(
        function (id) {
            const el = document.getElementById(id);
            if (el) el.value = '';
        },
    );
    const out = document.getElementById('flyOutput');
    if (out) {
        out.textContent = '';
        out.className = 'output-box fly-output';
    }
    const nameOut = document.getElementById('flyFileName');
    if (nameOut) nameOut.textContent = '';
    if (typeof setStatus === 'function') setStatus('已清空');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        flywayFileName: flywayFileName,
        flywayTemplate: flywayTemplate,
        liquibaseYamlTemplate: liquibaseYamlTemplate,
        liquibaseXmlTemplate: liquibaseXmlTemplate,
        columnChangeSql: columnChangeSql,
    };
}
