function sqlToPojo() {
    const input = document.getElementById('s2pInput').value;
    const out = document.getElementById('s2pOutput');
    if (!input) { out.textContent = '请输入 SQL DDL'; return; }
    const lines = input.split('\n').map(l => l.trim()).filter(l => l && !l.toUpperCase().startsWith('CREATE') && !l.toUpperCase().startsWith(')') && !l.toUpperCase().startsWith('PRIMARY') && !l.toUpperCase().startsWith('INDEX') && !l.toUpperCase().startsWith('KEY') && !l.toUpperCase().startsWith('UNIQUE') && !l.toUpperCase().startsWith('CONSTRAINT') && !l.toUpperCase().startsWith('ENGINE') && !l.toUpperCase().startsWith('DEFAULT'));
    const fields = [];
    for (const line of lines) {
        const clean = line.replace(/,$/, '').replace(/`/g, '').trim();
        if (!clean || clean.startsWith('--') || clean.startsWith('#')) continue;
        const parts = clean.split(/\s+/);
        if (parts.length < 2) continue;
        const col = parts[0];
        const sqlType = parts[1].toUpperCase().replace(/\(.*\)/, '');
        if (sqlType === 'PRIMARY' || sqlType === 'KEY' || sqlType === 'INDEX' || sqlType === 'UNIQUE' || sqlType === 'CONSTRAINT') continue;
        const javaType = sqlTypeToJava(sqlType);
        const comment = extractComment(clean);
        fields.push({ col, javaType, comment, sqlType: parts[1] });
    }
    if (!fields.length) { out.textContent = '未识别到字段定义'; return; }
    const tableName = extractTableName(input);
    const className = toPascalCase(tableName || 'GeneratedEntity');
    let code = '';
    code += 'import com.baomidou.mybatisplus.annotation.TableName;\n';
    code += 'import com.baomidou.mybatisplus.annotation.TableId;\n';
    code += 'import com.baomidou.mybatisplus.annotation.TableField;\n';
    code += 'import lombok.Data;\n\n';
    code += '@Data\n@TableName("' + tableName + '")\n';
    code += 'public class ' + className + ' {\n\n';
    fields.forEach(f => {
        if (f.comment) code += '    // ' + f.comment + '\n';
        const isId = f.col.toLowerCase() === 'id';
        code += '    ' + (isId ? '@TableId\n    ' : '') + 'private ' + f.javaType + ' ' + toCamelCase(f.col) + ';\n\n';
    });
    code += '}';
    out.textContent = code;
}

function sqlTypeToJava(t) {
    const map = {
        'INT': 'Integer', 'INTEGER': 'Integer', 'BIGINT': 'Long', 'TINYINT': 'Integer',
        'SMALLINT': 'Integer', 'VARCHAR': 'String', 'CHAR': 'String', 'TEXT': 'String',
        'LONGTEXT': 'String', 'MEDIUMTEXT': 'String', 'BLOB': 'byte[]', 'LONGBLOB': 'byte[]',
        'DATE': 'LocalDate', 'DATETIME': 'LocalDateTime', 'TIMESTAMP': 'LocalDateTime',
        'TIME': 'LocalTime', 'DECIMAL': 'BigDecimal', 'NUMERIC': 'BigDecimal',
        'FLOAT': 'Float', 'DOUBLE': 'Double', 'BOOLEAN': 'Boolean', 'BIT': 'Boolean'
    };
    return map[t] || 'String';
}

function extractComment(line) {
    const m = line.match(/COMMENT\s+'([^']+)'/i);
    return m ? m[1] : '';
}

function extractTableName(sql) {
    const m = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`?(\w+)`?\.)?`?(\w+)`?/i);
    return m ? (m[2] || m[1]) : '';
}

function toPascalCase(s) {
    return s.replace(/[_-](\w)/g, (_, c) => c.toUpperCase()).replace(/^\w/, c => c.toUpperCase());
}

function toCamelCase(s) {
    return s.replace(/[_-](\w)/g, (_, c) => c.toUpperCase());
}
