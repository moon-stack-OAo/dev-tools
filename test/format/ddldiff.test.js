const { parseDDL, diffSchemas } = require('../../js/format/ddldiff.js');

describe('parseDDL 单表', () => {
    test('基本字段解析（3 个列）', () => {
        const tables = parseDDL('CREATE TABLE users (id INT NOT NULL, name VARCHAR(50), email VARCHAR(100));');
        expect(tables.length).toBe(1);
        expect(tables[0].name).toBe('users');
        expect(tables[0].columns.length).toBe(3);
        expect(tables[0].columns[0]).toMatchObject({
            name: 'id',
            type: 'INT',
            length: null,
            nullable: false,
            autoInc: false,
        });
        expect(tables[0].columns[1].type).toBe('VARCHAR');
        expect(tables[0].columns[1].length).toBe(50);
        expect(tables[0].columns[1].nullable).toBe(true);
        expect(tables[0].columns[2].type).toBe('VARCHAR');
        expect(tables[0].columns[2].length).toBe(100);
    });

    test('多条 CREATE TABLE', () => {
        const tables = parseDDL(['CREATE TABLE a (id INT);', 'CREATE TABLE b (id INT, name VARCHAR(10));'].join('\n'));
        expect(tables.length).toBe(2);
        expect(tables[0].name).toBe('a');
        expect(tables[1].name).toBe('b');
        expect(tables[1].columns.length).toBe(2);
    });

    test('VARCHAR(50) 解析 length', () => {
        const tables = parseDDL('CREATE TABLE t (name VARCHAR(50) NOT NULL);');
        expect(tables[0].columns[0].type).toBe('VARCHAR');
        expect(tables[0].columns[0].length).toBe(50);
    });

    test('DECIMAL(10,2) 取主精度为 length', () => {
        const tables = parseDDL('CREATE TABLE t (price DECIMAL(10,2));');
        expect(tables[0].columns[0].type).toBe('DECIMAL');
        expect(tables[0].columns[0].length).toBe(10);
    });

    test('NOT NULL → nullable=false', () => {
        const tables = parseDDL('CREATE TABLE t (id INT NOT NULL, name VARCHAR(10));');
        expect(tables[0].columns[0].nullable).toBe(false);
        expect(tables[0].columns[1].nullable).toBe(true);
    });

    test('DEFAULT 字符串字面量', () => {
        const tables = parseDDL("CREATE TABLE t (status VARCHAR(10) DEFAULT 'active');");
        expect(tables[0].columns[0].default).toBe('active');
    });

    test('DEFAULT 数字', () => {
        const tables = parseDDL('CREATE TABLE t (count INT DEFAULT 0);');
        expect(tables[0].columns[0].default).toBe('0');
    });

    test('DEFAULT CURRENT_TIMESTAMP', () => {
        const tables = parseDDL('CREATE TABLE t (created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);');
        expect(tables[0].columns[0].default).toBe('CURRENT_TIMESTAMP');
    });

    test('DEFAULT NULL → null', () => {
        const tables = parseDDL('CREATE TABLE t (val INT DEFAULT NULL);');
        expect(tables[0].columns[0].default).toBe(null);
    });

    test('COMMENT 解析', () => {
        const tables = parseDDL("CREATE TABLE t (name VARCHAR(50) COMMENT '用户名');");
        expect(tables[0].columns[0].comment).toBe('用户名');
    });

    test('COMMENT 含转义引号', () => {
        const tables = parseDDL("CREATE TABLE t (name VARCHAR(50) COMMENT 'it''s ok');");
        expect(tables[0].columns[0].comment).toBe("it's ok");
    });

    test('AUTO_INCREMENT (MySQL) 识别', () => {
        const tables = parseDDL('CREATE TABLE t (id INT AUTO_INCREMENT);');
        expect(tables[0].columns[0].autoInc).toBe(true);
    });

    test('AUTOINCREMENT (SQLite) 识别', () => {
        const tables = parseDDL('CREATE TABLE t (id INTEGER AUTOINCREMENT);');
        expect(tables[0].columns[0].autoInc).toBe(true);
    });

    test('SERIAL (PostgreSQL) 识别', () => {
        const tables = parseDDL('CREATE TABLE t (id SERIAL);');
        expect(tables[0].columns[0].type).toBe('SERIAL');
        expect(tables[0].columns[0].autoInc).toBe(true);
    });

    test('跳过表级约束 PRIMARY KEY / INDEX / UNIQUE / CONSTRAINT', () => {
        const tables = parseDDL(
            'CREATE TABLE t (' +
                'id INT NOT NULL,' +
                'name VARCHAR(50),' +
                'PRIMARY KEY (id),' +
                'UNIQUE KEY uk_name (name),' +
                'INDEX idx_name (name),' +
                'CONSTRAINT fk_x FOREIGN KEY (id) REFERENCES o(id)' +
                ');'
        );
        expect(tables[0].columns.length).toBe(2);
        expect(tables[0].columns.map((c) => c.name)).toEqual(['id', 'name']);
    });

    test('反引号表名 / 字段名 (MySQL)', () => {
        const tables = parseDDL('CREATE TABLE `users` (`id` INT, `name` VARCHAR(50));');
        expect(tables[0].name).toBe('users');
        expect(tables[0].columns[0].name).toBe('id');
        expect(tables[0].columns[1].name).toBe('name');
    });

    test('双引号字段名 (PostgreSQL)', () => {
        const tables = parseDDL('CREATE TABLE users ("id" INT, "name" VARCHAR(50));');
        expect(tables[0].columns[0].name).toBe('id');
        expect(tables[0].columns[1].name).toBe('name');
    });

    test('SQL Server 方括号字段名', () => {
        const tables = parseDDL('CREATE TABLE [Users] ([Id] INT, [Name] VARCHAR(50));');
        expect(tables[0].name).toBe('Users');
        expect(tables[0].columns[0].name).toBe('Id');
        expect(tables[0].columns[1].name).toBe('Name');
    });

    test('字符串内含括号 / 逗号不影响解析', () => {
        const tables = parseDDL("CREATE TABLE t (id INT NOT NULL, note VARCHAR(100) DEFAULT 'a,b (c)');");
        expect(tables[0].columns.length).toBe(2);
        expect(tables[0].columns[1].default).toBe('a,b (c)');
    });

    test('列级 PRIMARY KEY / UNIQUE 保留在字段上', () => {
        const tables = parseDDL('CREATE TABLE t (id INT PRIMARY KEY, code VARCHAR(10) UNIQUE);');
        expect(tables[0].columns[0].primaryKey).toBe(true);
        expect(tables[0].columns[1].unique).toBe(true);
    });

    test('空字符串 / 非字符串返回空数组', () => {
        expect(parseDDL('')).toEqual([]);
        expect(parseDDL(null)).toEqual([]);
        expect(parseDDL('SELECT * FROM t;')).toEqual([]);
    });

    test('raw 字段包含原始 DDL 片段', () => {
        const tables = parseDDL('CREATE TABLE t (id INT);');
        expect(tables[0].raw).toContain('CREATE TABLE');
        expect(tables[0].raw).toContain('id INT');
    });

    test('CHARACTER VARYING 归一为 VARCHAR 类别', () => {
        const tables = parseDDL('CREATE TABLE t (name CHARACTER VARYING(50));');
        expect(tables[0].columns[0].type).toBe('CHARACTER VARYING');
        expect(tables[0].columns[0].length).toBe(50);
    });
});

describe('diffSchemas', () => {
    test('字段新增（dst 多一列）', () => {
        const src = parseDDL('CREATE TABLE t (id INT);');
        const dst = parseDDL('CREATE TABLE t (id INT, name VARCHAR(50));');
        const diff = diffSchemas(src, dst);
        expect(diff.length).toBe(1);
        expect(diff[0].status).toBe('modified');
        const added = diff[0].changes.find((c) => c.action === 'added');
        expect(added).toBeDefined();
        expect(added.column).toBe('name');
    });

    test('字段删除（src 多一列）', () => {
        const src = parseDDL('CREATE TABLE t (id INT, old_field INT);');
        const dst = parseDDL('CREATE TABLE t (id INT);');
        const diff = diffSchemas(src, dst);
        const removed = diff[0].changes.find((c) => c.action === 'removed');
        expect(removed).toBeDefined();
        expect(removed.column).toBe('old_field');
    });

    test('类型变更 INT → BIGINT', () => {
        const src = parseDDL('CREATE TABLE t (id INT);');
        const dst = parseDDL('CREATE TABLE t (id BIGINT);');
        const diff = diffSchemas(src, dst);
        const changed = diff[0].changes.find((c) => c.action === 'changed');
        expect(changed).toBeDefined();
        expect(changed.diffs).toContain('type');
    });

    test('length 变更 VARCHAR(50 → 100)', () => {
        const src = parseDDL('CREATE TABLE t (name VARCHAR(50));');
        const dst = parseDDL('CREATE TABLE t (name VARCHAR(100));');
        const diff = diffSchemas(src, dst);
        const changed = diff[0].changes.find((c) => c.action === 'changed');
        expect(changed).toBeDefined();
        expect(changed.diffs).toContain('length');
        expect(changed.srcInfo.length).toBe(50);
        expect(changed.dstInfo.length).toBe(100);
    });

    test('nullable 切换 NOT NULL ↔ NULL', () => {
        const src = parseDDL('CREATE TABLE t (name VARCHAR(50) NOT NULL);');
        const dst = parseDDL('CREATE TABLE t (name VARCHAR(50));');
        const diff = diffSchemas(src, dst);
        const changed = diff[0].changes.find((c) => c.action === 'changed');
        expect(changed).toBeDefined();
        expect(changed.diffs).toContain('nullable');
    });

    test('default 变化', () => {
        const src = parseDDL("CREATE TABLE t (status VARCHAR(10) DEFAULT 'active');");
        const dst = parseDDL("CREATE TABLE t (status VARCHAR(10) DEFAULT 'inactive');");
        const diff = diffSchemas(src, dst);
        const changed = diff[0].changes.find((c) => c.action === 'changed');
        expect(changed).toBeDefined();
        expect(changed.diffs).toContain('default');
    });

    test('comment 变化', () => {
        const src = parseDDL("CREATE TABLE t (name VARCHAR(50) COMMENT '用户名');");
        const dst = parseDDL("CREATE TABLE t (name VARCHAR(50) COMMENT 'user name');");
        const diff = diffSchemas(src, dst);
        const changed = diff[0].changes.find((c) => c.action === 'changed');
        expect(changed).toBeDefined();
        expect(changed.diffs).toContain('comment');
    });

    test('INT ≡ INTEGER 视为相同（无变更）', () => {
        const src = parseDDL('CREATE TABLE t (id INT);');
        const dst = parseDDL('CREATE TABLE t (id INTEGER);');
        const diff = diffSchemas(src, dst);
        expect(diff[0].status).toBe('modified');
        expect(diff[0].changes.length).toBe(0);
    });

    test('autoInc 变更识别', () => {
        const src = parseDDL('CREATE TABLE t (id INT);');
        const dst = parseDDL('CREATE TABLE t (id INT AUTO_INCREMENT);');
        const diff = diffSchemas(src, dst);
        const changed = diff[0].changes.find((c) => c.action === 'changed');
        expect(changed).toBeDefined();
        expect(changed.diffs).toContain('autoInc');
    });

    test('多表分别 diff', () => {
        const src = parseDDL('CREATE TABLE a (id INT); CREATE TABLE b (id INT, name VARCHAR(50));');
        const dst = parseDDL('CREATE TABLE a (id INT, new_col INT); CREATE TABLE b (id INT);');
        const diff = diffSchemas(src, dst);
        expect(diff.length).toBe(2);
        const a = diff.find((d) => d.table === 'a');
        const b = diff.find((d) => d.table === 'b');
        expect(a.changes.some((c) => c.action === 'added' && c.column === 'new_col')).toBe(true);
        expect(b.changes.some((c) => c.action === 'removed' && c.column === 'name')).toBe(true);
    });

    test('表整体新增 / 删除', () => {
        const src = parseDDL('CREATE TABLE a (id INT);');
        const dst = parseDDL('CREATE TABLE a (id INT); CREATE TABLE b (id INT);');
        const diff = diffSchemas(src, dst);
        const b = diff.find((d) => d.table === 'b');
        expect(b.status).toBe('added');
    });

    test('完全相同的 schema 无变化', () => {
        const ddl = 'CREATE TABLE t (id INT NOT NULL, name VARCHAR(50), age INT DEFAULT 0);';
        const src = parseDDL(ddl);
        const dst = parseDDL(ddl);
        const diff = diffSchemas(src, dst);
        expect(diff[0].status).toBe('modified');
        expect(diff[0].changes.length).toBe(0);
    });

    test('changed 行同时含多个 diff 字段', () => {
        const src = parseDDL("CREATE TABLE t (id INT NOT NULL DEFAULT 0 COMMENT 'old');");
        const dst = parseDDL("CREATE TABLE t (id BIGINT DEFAULT 1 COMMENT 'new');");
        const diff = diffSchemas(src, dst);
        const changed = diff[0].changes.find((c) => c.action === 'changed');
        expect(changed).toBeDefined();
        expect(changed.diffs).toContain('type');
        expect(changed.diffs).toContain('nullable');
        expect(changed.diffs).toContain('default');
        expect(changed.diffs).toContain('comment');
    });

    test('空输入返回空 diff 数组', () => {
        expect(diffSchemas([], [])).toEqual([]);
    });
});
