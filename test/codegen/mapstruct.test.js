const {
    parseSimpleJavaClass,
    generateMapStructMapper,
    parseMapStructPair,
    msNormalizeName,
} = require('../../js/codegen/mapstruct.js');

describe('parseSimpleJavaClass', () => {
    test('解析 class 与字段', () => {
        const r = parseSimpleJavaClass('class User {\n  Long id;\n  String userName;\n  String email;\n}');
        expect(r.className).toBe('User');
        expect(r.fields.map((f) => f.name)).toEqual(['id', 'userName', 'email']);
        expect(r.fields[0].type).toBe('Long');
    });

    test('纯字段列表', () => {
        const r = parseSimpleJavaClass('Long id;\nString name;');
        expect(r.className).toBe('');
        expect(r.fields).toHaveLength(2);
        expect(r.fields[1].name).toBe('name');
    });

    test('空输入', () => {
        expect(parseSimpleJavaClass('').fields).toEqual([]);
        expect(parseSimpleJavaClass(null).fields).toEqual([]);
    });
});

describe('msNormalizeName', () => {
    test('忽略大小写与下划线', () => {
        expect(msNormalizeName('userName')).toBe('username');
        expect(msNormalizeName('user_name')).toBe('username');
        expect(msNormalizeName('UserName')).toBe('username');
    });
});

describe('parseMapStructPair', () => {
    test('--- 分隔两端类', () => {
        const text =
            'class User {\n  Long id;\n  String userName;\n}\n---\nclass UserDTO {\n  Long id;\n  String username;\n}';
        const pair = parseMapStructPair(text);
        expect(pair.source.className).toBe('User');
        expect(pair.target.className).toBe('UserDTO');
        expect(pair.source.fields).toHaveLength(2);
        expect(pair.target.fields).toHaveLength(2);
    });
});

describe('generateMapStructMapper', () => {
    test('生成 @Mapper spring 与同名映射', () => {
        const source = parseSimpleJavaClass('class User { Long id; String email; }');
        const target = parseSimpleJavaClass('class UserDTO { Long id; String email; }');
        const code = generateMapStructMapper(source, target, { componentModel: 'spring' });
        expect(code).toContain('@Mapper(');
        expect(code).toContain('componentModel = MappingConstants.ComponentModel.SPRING');
        expect(code).toContain('public interface UserMapper');
        expect(code).toContain('UserDTO toUserDTO(User source);');
        // 同名无需 @Mapping
        expect(code).not.toMatch(/@Mapping\(source = "id"/);
    });

    test('userName → username 生成 @Mapping', () => {
        const source = parseSimpleJavaClass('class User { String userName; }');
        const target = parseSimpleJavaClass('class UserDTO { String username; }');
        const code = generateMapStructMapper(source, target);
        expect(code).toContain('@Mapping(source = "userName", target = "username")');
    });

    test('目标多余字段 ignore', () => {
        const source = parseSimpleJavaClass('class User { Long id; }');
        const target = parseSimpleJavaClass('class UserDTO { Long id; String phone; }');
        const code = generateMapStructMapper(source, target);
        expect(code).toContain('@Mapping(target = "phone", ignore = true)');
    });

    test('强制忽略与反向方法', () => {
        const source = parseSimpleJavaClass('class User { Long id; String password; }');
        const target = parseSimpleJavaClass('class UserDTO { Long id; }');
        const code = generateMapStructMapper(source, target, {
            reverse: true,
            ignoreTargets: [],
        });
        expect(code).toContain('User toUser(UserDTO target);');
    });

    test('packageName', () => {
        const source = parseSimpleJavaClass('class A { int x; }');
        const target = parseSimpleJavaClass('class B { int x; }');
        const code = generateMapStructMapper(source, target, { packageName: 'com.demo' });
        expect(code.startsWith('package com.demo;')).toBe(true);
    });
});
