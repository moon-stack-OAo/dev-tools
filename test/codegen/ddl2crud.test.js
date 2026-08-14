const {
    parseDdlForCrud,
    generateMpEntity,
    generateMpMapper,
    generateMpService,
    generateMpServiceImpl,
    generateMpController,
    generateCrudAll,
    d2cInferEntity,
} = require('../../js/codegen/ddl2crud.js');

const SAMPLE =
    "CREATE TABLE `sys_user` (\n" +
    "  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',\n" +
    "  `user_name` VARCHAR(64) NOT NULL COMMENT '用户名',\n" +
    "  `email` VARCHAR(128) DEFAULT NULL,\n" +
    '  PRIMARY KEY (`id`)\n' +
    ') ENGINE=InnoDB;';

describe('d2cInferEntity', () => {
    test('去前缀', () => {
        expect(d2cInferEntity('sys_user')).toBe('User');
        expect(d2cInferEntity('t_order')).toBe('Order');
        expect(d2cInferEntity('product')).toBe('Product');
    });
});

describe('parseDdlForCrud', () => {
    test('解析表与字段', () => {
        const p = parseDdlForCrud(SAMPLE);
        expect(p.table).toBe('sys_user');
        expect(p.pk).toBe('id');
        expect(p.entityName).toBe('User');
        expect(p.fields.map((f) => f.name)).toEqual(['id', 'user_name', 'email']);
        expect(p.fields[0].pk).toBe(true);
        expect(p.fields[0].javaType).toBe('Long');
        expect(p.fields[1].property).toBe('userName');
        expect(p.fields[1].comment).toBe('用户名');
    });

    test('空 DDL 抛错', () => {
        expect(() => parseDdlForCrud('')).toThrow(/空/);
        expect(() => parseDdlForCrud('SELECT 1')).toThrow(/CREATE TABLE/);
    });
});

describe('generate layers', () => {
    const parsed = parseDdlForCrud(SAMPLE);
    const opts = { packageName: 'com.demo', lombok: true };

    test('Entity', () => {
        const code = generateMpEntity(parsed, opts);
        expect(code).toContain('package com.demo.entity;');
        expect(code).toContain('@TableName("sys_user")');
        expect(code).toContain('@TableId');
        expect(code).toContain('private String userName;');
        expect(code).toContain('@Data');
    });

    test('Mapper / Service / Impl', () => {
        expect(generateMpMapper(parsed, opts)).toContain('extends BaseMapper<User>');
        expect(generateMpService(parsed, opts)).toContain('extends IService<User>');
        const impl = generateMpServiceImpl(parsed, opts);
        expect(impl).toContain('ServiceImpl<UserMapper, User>');
        expect(impl).toContain('@Service');
    });

    test('Controller CRUD', () => {
        const code = generateMpController(parsed, opts);
        expect(code).toContain('@RestController');
        expect(code).toContain('@GetMapping("/{id}")');
        expect(code).toContain('@PostMapping');
        expect(code).toContain('@DeleteMapping');
        expect(code).toContain('UserService');
    });
});

describe('generateCrudAll', () => {
    test('返回五层', () => {
        const all = generateCrudAll(SAMPLE, { packageName: 'com.x' });
        expect(all.entity).toContain('class User');
        expect(all.mapper).toContain('UserMapper');
        expect(all.service).toContain('UserService');
        expect(all.serviceImpl).toContain('UserServiceImpl');
        expect(all.controller).toContain('UserController');
        expect(all.meta.table).toBe('sys_user');
        expect(all.meta.fieldCount).toBe(3);
    });
});
