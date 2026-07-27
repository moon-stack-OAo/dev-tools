const {
    flywayFileName,
    flywayTemplate,
    liquibaseYamlTemplate,
    liquibaseXmlTemplate,
    columnChangeSql,
} = require('../../js/codegen/flywaygen.js');

describe('flywayFileName', () => {
    test('基本命名', () => {
        expect(flywayFileName('1', 'init')).toBe('V1__init.sql');
        expect(flywayFileName('1.0.1', 'add user email')).toBe('V1.0.1__add_user_email.sql');
        expect(flywayFileName('V2', 'create_table')).toBe('V2__create_table.sql');
    });

    test('空描述默认 migration', () => {
        expect(flywayFileName(3, '')).toBe('V3__migration.sql');
    });

    test('无版本抛错', () => {
        expect(() => flywayFileName('', 'x')).toThrow();
    });
});

describe('flywayTemplate', () => {
    test('含头注释与 DDL', () => {
        const t = flywayTemplate('1', 'init schema', {
            ddl: 'CREATE TABLE t(id INT);',
            author: 'alice',
        });
        expect(t).toContain('V1__init_schema.sql');
        expect(t).toContain('Author: alice');
        expect(t).toContain('CREATE TABLE t(id INT);');
    });

    test('无 DDL 时 TODO', () => {
        const t = flywayTemplate('2', 'todo');
        expect(t).toContain('TODO');
    });
});

describe('liquibaseYamlTemplate', () => {
    test('sql changeset', () => {
        const y = liquibaseYamlTemplate({
            id: 'c1',
            author: 'dev',
            comment: 'demo',
            sql: 'SELECT 1;',
            changeType: 'sql',
        });
        expect(y).toContain('databaseChangeLog:');
        expect(y).toContain('id: c1');
        expect(y).toContain('SELECT 1;');
    });

    test('renameColumn', () => {
        const y = liquibaseYamlTemplate({
            id: 'r1',
            table: 'user',
            oldColumn: 'name',
            newColumn: 'user_name',
            columnType: 'varchar(64)',
        });
        expect(y).toContain('renameColumn');
        expect(y).toContain('oldColumnName: name');
        expect(y).toContain('newColumnName: user_name');
    });

    test('addColumn', () => {
        const y = liquibaseYamlTemplate({
            id: 'a1',
            table: 'user',
            newColumn: 'email',
            columnType: 'varchar(128)',
        });
        expect(y).toContain('addColumn');
        expect(y).toContain('name: email');
    });
});

describe('liquibaseXmlTemplate', () => {
    test('xml 结构', () => {
        const x = liquibaseXmlTemplate({
            id: 'x1',
            author: 'dev',
            sql: 'SELECT 1',
            changeType: 'sql',
        });
        expect(x).toContain('<?xml');
        expect(x).toContain('changeSet id="x1"');
        expect(x).toContain('SELECT 1');
    });
});

describe('columnChangeSql', () => {
    test('mysql add', () => {
        expect(
            columnChangeSql({ table: 't', newColumn: 'c', columnType: 'INT', dialect: 'mysql' }),
        ).toBe('ALTER TABLE t ADD COLUMN c INT NULL;');
    });

    test('mysql rename', () => {
        expect(
            columnChangeSql({
                table: 't',
                oldColumn: 'a',
                newColumn: 'b',
                columnType: 'INT',
                dialect: 'mysql',
            }),
        ).toContain('CHANGE COLUMN a b INT');
    });

    test('postgres rename', () => {
        expect(
            columnChangeSql({
                table: 't',
                oldColumn: 'a',
                newColumn: 'b',
                dialect: 'postgres',
            }),
        ).toBe('ALTER TABLE t RENAME COLUMN a TO b;');
    });
});
