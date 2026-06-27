// 数据库类型映射表

const DBTYPE_DATA = [
    ['INT', 'NUMBER(10)', 'INTEGER', 'INT', 'Integer', 'INTEGER'],
    ['BIGINT', 'NUMBER(19)', 'BIGINT', 'BIGINT', 'Long', 'BIGINT'],
    ['SMALLINT', 'NUMBER(5)', 'SMALLINT', 'SMALLINT', 'Integer', 'SMALLINT'],
    ['TINYINT', 'NUMBER(3)', 'SMALLINT', 'TINYINT', 'Integer', 'TINYINT'],
    ['MEDIUMINT', 'NUMBER(7)', 'INTEGER', 'INT', 'Integer', 'INTEGER'],
    ['VARCHAR(N)', 'VARCHAR2(N)', 'VARCHAR(N)', 'NVARCHAR(N)', 'String', 'VARCHAR'],
    ['CHAR(N)', 'CHAR(N)', 'CHAR(N)', 'NCHAR(N)', 'String', 'CHAR'],
    ['TEXT', 'CLOB', 'TEXT', 'NVARCHAR(MAX)', 'String', 'LONGVARCHAR'],
    ['MEDIUMTEXT', 'CLOB', 'TEXT', 'NVARCHAR(MAX)', 'String', 'LONGVARCHAR'],
    ['LONGTEXT', 'CLOB', 'TEXT', 'NVARCHAR(MAX)', 'String', 'LONGVARCHAR'],
    ['TINYTEXT', 'VARCHAR2(255)', 'TEXT', 'NVARCHAR(255)', 'String', 'VARCHAR'],
    ['DATE', 'DATE', 'DATE', 'DATE', 'LocalDate', 'DATE'],
    ['TIME', 'DATE', 'TIME', 'TIME', 'LocalTime', 'TIME'],
    ['DATETIME', 'DATE', 'TIMESTAMP', 'DATETIME', 'LocalDateTime', 'TIMESTAMP'],
    ['TIMESTAMP', 'TIMESTAMP', 'TIMESTAMP', 'DATETIME2', 'LocalDateTime', 'TIMESTAMP'],
    ['YEAR', 'NUMBER(4)', 'SMALLINT', 'SMALLINT', 'Integer', 'SMALLINT'],
    ['DECIMAL(p,s)', 'NUMBER(p,s)', 'DECIMAL(p,s)', 'DECIMAL(p,s)', 'BigDecimal', 'DECIMAL'],
    ['NUMERIC(p,s)', 'NUMBER(p,s)', 'NUMERIC(p,s)', 'NUMERIC(p,s)', 'BigDecimal', 'NUMERIC'],
    ['FLOAT', 'BINARY_FLOAT', 'REAL', 'REAL', 'Float', 'REAL'],
    ['DOUBLE', 'BINARY_DOUBLE', 'DOUBLE PRECISION', 'FLOAT', 'Double', 'DOUBLE'],
    ['REAL', 'BINARY_DOUBLE', 'DOUBLE PRECISION', 'REAL', 'Double', 'DOUBLE'],
    ['BOOLEAN', 'NUMBER(1)', 'BOOLEAN', 'BIT', 'Boolean', 'BOOLEAN'],
    ['BIT', 'NUMBER(1)', 'BOOLEAN', 'BIT', 'Boolean', 'BOOLEAN'],
    ['BINARY(N)', 'RAW(N)', 'BYTEA', 'BINARY(N)', 'byte[]', 'BINARY'],
    ['VARBINARY(N)', 'RAW(N)', 'BYTEA', 'VARBINARY(N)', 'byte[]', 'VARBINARY'],
    ['BLOB', 'BLOB', 'BYTEA', 'VARBINARY(MAX)', 'byte[]', 'BLOB'],
    ['MEDIUMBLOB', 'BLOB', 'BYTEA', 'VARBINARY(MAX)', 'byte[]', 'BLOB'],
    ['LONGBLOB', 'BLOB', 'BYTEA', 'VARBINARY(MAX)', 'byte[]', 'BLOB'],
    ['CLOB', 'CLOB', 'TEXT', 'NVARCHAR(MAX)', 'String', 'CLOB'],
    ['JSON', 'CLOB (12c+ JSON)', 'JSONB', 'NVARCHAR(MAX)', 'String', 'VARCHAR'],
    ['UUID', 'RAW(16)', 'UUID', 'UNIQUEIDENTIFIER', 'String', 'VARCHAR'],
    ['ENUM', 'VARCHAR2', 'VARCHAR', 'NVARCHAR', 'String', 'VARCHAR'],
    ['SET', 'VARCHAR2', 'VARCHAR', 'NVARCHAR', 'String', 'VARCHAR'],
    ['XML', 'XMLTYPE', 'XML', 'XML', 'String', 'LONGVARCHAR'],
    ['GEOMETRY', 'SDO_GEOMETRY', 'GEOMETRY', 'GEOMETRY', 'byte[]', 'BINARY'],
];

let dbtypeFiltered = DBTYPE_DATA.slice();

function dbtypeRender() {
    const tbody = document.getElementById('dbtypeTbody');
    if (!tbody) return;
    const search = (document.getElementById('dbtypeSearch').value || '').toLowerCase().trim();
    const db = document.getElementById('dbtypeDb').value;

    let rows = DBTYPE_DATA;
    // 数据库筛选：高亮匹配列；不直接过滤行（让用户看完整对照），只在显示数上提示
    // 这里选择：按数据库筛选时，过滤掉该数据库列空白的行
    if (db !== 'all') {
        const idxMap = {mysql: 0, oracle: 1, postgresql: 2, sqlserver: 3};
        const idx = idxMap[db];
        if (idx != null) {
            rows = rows.filter((r) => r[idx] && r[idx].trim());
        }
    }
    if (search) {
        rows = rows.filter((r) => r.some((c) => (c || '').toLowerCase().includes(search)));
    }

    dbtypeFiltered = rows;
    const html = rows.map((r) => '<tr>' + r.map((c) => `<td>${escapeHtml(c)}</td>`).join('') + '</tr>').join('');
    tbody.innerHTML =
        html ||
        '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">无匹配记录</td></tr>';

    const count = document.getElementById('dbtypeCount');
    if (count) count.textContent = `共 ${rows.length} 条`;
}

function dbtypeInit() {
    dbtypeRender();
}

// 事件委托：避免面板异步加载时机问题
document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'dbtypeSearch') dbtypeRender();
});
document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'dbtypeDb') dbtypeRender();
});

// 暴露给 app.js 的延迟渲染钩子
window.dbtypeInit = dbtypeInit;

registerInit('dbtype', dbtypeInit);
