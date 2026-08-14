const {
    parseJavaClassForBuilder,
    generateBuilder,
    expandLombok,
    jbdGetterName,
} = require('../../js/codegen/javabuilder.js');

describe('jbdGetterName', () => {
    test('boolean is 前缀', () => {
        expect(jbdGetterName('active', 'boolean')).toBe('isActive');
        expect(jbdGetterName('name', 'String')).toBe('getName');
    });
});

describe('parseJavaClassForBuilder', () => {
    test('解析字段与 Lombok 注解', () => {
        const p = parseJavaClassForBuilder(`
@Data
@Builder
public class User {
    private Long id;
    private String userName;
    private boolean active;
}
`);
        expect(p.className).toBe('User');
        expect(p.lombokAnnos).toContain('Data');
        expect(p.lombokAnnos).toContain('Builder');
        expect(p.fields.map((f) => f.name)).toEqual(['id', 'userName', 'active']);
    });

    test('空输入', () => {
        expect(parseJavaClassForBuilder('').fields).toEqual([]);
    });
});

describe('generateBuilder', () => {
    test('生成 Builder 与链式方法', () => {
        const parsed = {
            className: 'User',
            fields: [
                { name: 'id', type: 'Long' },
                { name: 'name', type: 'String' },
            ],
        };
        const code = generateBuilder(parsed, { packageName: 'com.ex' });
        expect(code).toContain('package com.ex;');
        expect(code).toContain('public static UserBuilder builder()');
        expect(code).toContain('public UserBuilder id(Long id)');
        expect(code).toContain('public User build()');
        expect(code).toContain('getId');
    });
});

describe('expandLombok', () => {
    test('展开 getter/setter/builder/toString', () => {
        const parsed = parseJavaClassForBuilder(
            'class Order { private Long id; private String title; }',
        );
        const code = expandLombok(parsed, {
            getters: true,
            setters: true,
            builder: true,
            toString: true,
            equalsHashCode: true,
        });
        expect(code).toContain('getId');
        expect(code).toContain('setTitle');
        expect(code).toContain('OrderBuilder');
        expect(code).toContain('toString');
        expect(code).toContain('equals');
        expect(code).toContain('hashCode');
        expect(code).toContain('public Order()');
        expect(code).toContain('public Order(Long id, String title)');
    });

    test('仅字段无 builder', () => {
        const code = expandLombok(
            { className: 'A', fields: [{ name: 'x', type: 'int' }] },
            { builder: false, toString: false, allArgsCtor: false },
        );
        expect(code).not.toContain('Builder');
        expect(code).toContain('getX');
    });
});
