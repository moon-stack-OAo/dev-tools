const {
    parseDdl,
    sqlTypeToJava,
    sqlTypeToPrisma,
    generateJpaEntity,
    generatePrismaModel,
    ddlToEntity,
    d2eToPascalCase,
    d2eToCamelCase,
} = require('../../js/codegen/ddl2entity.js');

describe('d2e case helpers', () => {
    test('Pascal / camel', () => {
        expect(d2eToPascalCase('sys_user')).toBe('SysUser');
        expect(d2eToCamelCase('user_name')).toBe('userName');
    });
});

describe('sqlTypeToJava / sqlTypeToPrisma', () => {
    test('常见类型映射', () => {
        expect(sqlTypeToJava('BIGINT')).toBe('Long');
        expect(sqlTypeToJava('VARCHAR(64)')).toBe('String');
        expect(sqlTypeToJava('DECIMAL(10,2)')).toBe('java.math.BigDecimal');
        expect(sqlTypeToJava('DATETIME')).toBe('java.time.LocalDateTime');
        expect(sqlTypeToPrisma('BIGINT')).toBe('BigInt');
        expect(sqlTypeToPrisma('VARCHAR')).toBe('String');
        expect(sqlTypeToPrisma('DECIMAL')).toBe('Decimal');
        expect(sqlTypeToPrisma('TINYINT')).toBe('Int');
    });
});

describe('parseDdl', () => {
    test('解析表名、列、PK、COMMENT、反引号', () => {
        const ddl =
            'CREATE TABLE `sys_user` (\n' +
            "  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',\n" +
            "  `user_name` VARCHAR(64) NOT NULL COMMENT '用户名',\n" +
            "  `email` VARCHAR(128) DEFAULT NULL COMMENT '邮箱',\n" +
            '  PRIMARY KEY (`id`)\n' +
            ') ENGINE=InnoDB;';
        const p = parseDdl(ddl);
        expect(p.tableName).toBe('sys_user');
        expect(p.primaryKeys).toEqual(['id']);
        expect(p.columns.map((c) => c.name)).toEqual(['id', 'user_name', 'email']);
        const id = p.columns[0];
        expect(id.primaryKey).toBe(true);
        expect(id.nullable).toBe(false);
        expect(id.sqlType).toBe('BIGINT');
        expect(id.comment).toBe('主键');
        const email = p.columns[2];
        expect(email.nullable).toBe(true);
        expect(email.comment).toBe('邮箱');
    });

    test('行内 PRIMARY KEY', () => {
        const p = parseDdl('CREATE TABLE t (id BIGINT PRIMARY KEY, name VARCHAR(32) NOT NULL);');
        expect(p.primaryKeys).toContain('id');
        expect(p.columns[0].primaryKey).toBe(true);
        expect(p.columns[1].nullable).toBe(false);
    });

    test('空 / 非法 DDL 抛错', () => {
        expect(() => parseDdl('')).toThrow(/未识别/);
        expect(() => parseDdl('SELECT 1')).toThrow(/未识别/);
    });
});

describe('generateJpaEntity', () => {
    test('Lombok + package', () => {
        const parsed = parseDdl(
            "CREATE TABLE users (id BIGINT PRIMARY KEY, name VARCHAR(64) NOT NULL COMMENT '名');",
        );
        const code = generateJpaEntity(parsed, {
            packageName: 'com.example.domain',
            useLombok: true,
        });
        expect(code).toContain('package com.example.domain;');
        expect(code).toContain('@Data');
        expect(code).toContain('@Entity');
        expect(code).toContain('@Table(name = "users")');
        expect(code).toContain('@Id');
        expect(code).toContain('@GeneratedValue');
        expect(code).toContain('private Long id;');
        expect(code).toContain('private String name;');
        expect(code).toContain('名');
    });

    test('无 Lombok 生成 getter/setter', () => {
        const parsed = parseDdl('CREATE TABLE t (id INT PRIMARY KEY);');
        const code = generateJpaEntity(parsed, { useLombok: false });
        expect(code).not.toContain('@Data');
        expect(code).toContain('getId');
        expect(code).toContain('setId');
    });
});

describe('generatePrismaModel', () => {
    test('model 与 map', () => {
        const parsed = parseDdl(
            'CREATE TABLE sys_user (id BIGINT PRIMARY KEY, user_name VARCHAR(64));',
        );
        const code = generatePrismaModel(parsed);
        expect(code).toContain('model SysUser');
        expect(code).toContain('id BigInt @id');
        expect(code).toContain('userName String?');
        expect(code).toContain('@map("user_name")');
        expect(code).toContain('@@map("sys_user")');
    });
});

describe('ddlToEntity', () => {
    test('jpa / prisma', () => {
        const sql = 'CREATE TABLE demo (id BIGINT PRIMARY KEY, title VARCHAR(32) NOT NULL);';
        const j = ddlToEntity(sql, 'jpa', { packageName: 'x', useLombok: true });
        expect(j.ok).toBe(true);
        expect(j.code).toContain('@Entity');
        const p = ddlToEntity(sql, 'prisma');
        expect(p.ok).toBe(true);
        expect(p.code).toContain('model Demo');
    });

    test('空输入', () => {
        const r = ddlToEntity('', 'jpa');
        expect(r.ok).toBe(false);
        expect(r.error).toMatch(/DDL/);
    });
});
