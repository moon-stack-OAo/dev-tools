const { ddlToMermaid, parseDdl, dmUnquote, dmNormalizeType } = require('../../js/codegen/ddlmermaid.js');

describe('dmUnquote / dmNormalizeType', () => {
    test('去引号', () => {
        expect(dmUnquote('`users`')).toBe('users');
        expect(dmUnquote('"orders"')).toBe('orders');
        expect(dmUnquote('[t]')).toBe('t');
    });

    test('类型规范化', () => {
        expect(dmNormalizeType('VARCHAR(64)')).toBe('varchar');
        expect(dmNormalizeType('BIGINT')).toBe('bigint');
        expect(dmNormalizeType('DECIMAL(10,2)')).toBe('decimal');
    });
});

describe('parseDdl', () => {
    test('解析单表与 PK', () => {
        const ddl = 'CREATE TABLE users (\n  id BIGINT PRIMARY KEY,\n  name VARCHAR(64) NOT NULL\n);';
        const p = parseDdl(ddl);
        expect(p.tables).toHaveLength(1);
        expect(p.tables[0].name).toBe('users');
        expect(p.tables[0].pks).toContain('id');
        expect(p.tables[0].columns.map((c) => c.name)).toEqual(['id', 'name']);
    });

    test('表级 FOREIGN KEY', () => {
        const ddl =
            'CREATE TABLE users (id BIGINT PRIMARY KEY);\n' +
            'CREATE TABLE orders (\n' +
            '  id BIGINT PRIMARY KEY,\n' +
            '  user_id BIGINT,\n' +
            '  FOREIGN KEY (user_id) REFERENCES users(id)\n' +
            ');';
        const p = parseDdl(ddl);
        expect(p.tables).toHaveLength(2);
        expect(p.relationships).toHaveLength(1);
        expect(p.relationships[0].fromTable).toBe('orders');
        expect(p.relationships[0].toTable).toBe('users');
        expect(p.relationships[0].fromColumn).toBe('user_id');
    });

    test('列级 REFERENCES', () => {
        const ddl =
            'CREATE TABLE t1 (id INT PRIMARY KEY);\n' +
            'CREATE TABLE t2 (id INT PRIMARY KEY, t1_id INT REFERENCES t1(id));';
        const p = parseDdl(ddl);
        expect(p.relationships).toHaveLength(1);
        expect(p.relationships[0].toTable).toBe('t1');
    });
});

describe('ddlToMermaid', () => {
    test('生成 erDiagram', () => {
        const ddl =
            'CREATE TABLE users (\n  id BIGINT PRIMARY KEY,\n  name VARCHAR(64)\n);\n' +
            'CREATE TABLE orders (\n  id BIGINT PRIMARY KEY,\n  user_id BIGINT,\n' +
            '  CONSTRAINT fk FOREIGN KEY (user_id) REFERENCES users(id)\n);';
        const m = ddlToMermaid(ddl);
        expect(m.startsWith('erDiagram')).toBe(true);
        expect(m).toContain('users {');
        expect(m).toContain('bigint id PK');
        expect(m).toContain('orders {');
        expect(m).toContain('bigint user_id FK');
        expect(m).toMatch(/users\s+\|\|--o\{\s+orders/);
    });

    test('空 DDL 抛错', () => {
        expect(() => ddlToMermaid('')).toThrow(/未识别/);
        expect(() => ddlToMermaid('SELECT 1')).toThrow(/未识别/);
    });
});
