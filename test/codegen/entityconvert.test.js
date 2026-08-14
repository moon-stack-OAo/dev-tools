const {
    parseJavaFields,
    generateJavaClass,
    ecStripSuffix,
    ecApplySuffix,
} = require('../../js/codegen/entityconvert.js');

describe('ecStripSuffix / ecApplySuffix', () => {
    test('剥离与添加后缀', () => {
        expect(ecStripSuffix('UserEntity')).toBe('User');
        expect(ecStripSuffix('UserDTO')).toBe('User');
        expect(ecApplySuffix('User', 'dto')).toBe('UserDTO');
        expect(ecApplySuffix('User', 'vo')).toBe('UserVO');
        expect(ecApplySuffix('User', 'entity')).toBe('UserEntity');
    });
});

describe('parseJavaFields', () => {
    test('解析 class 体与 package', () => {
        const src = `
package com.example;
public class UserEntity {
    private Long id;
    private String userName;
    private Integer age;
}
`;
        const p = parseJavaFields(src);
        expect(p.packageName).toBe('com.example');
        expect(p.className).toBe('UserEntity');
        expect(p.fields.map((f) => f.name)).toEqual(['id', 'userName', 'age']);
        expect(p.fields[1].type).toBe('String');
    });

    test('纯字段列表', () => {
        const p = parseJavaFields('Long id;\nString name;');
        expect(p.fields).toHaveLength(2);
        expect(p.fields[0]).toMatchObject({ name: 'id', type: 'Long' });
    });

    test('跳过方法与注解', () => {
        const p = parseJavaFields(`
class A {
    @Column
    private String name;
    public void foo() {}
    private int count;
}
`);
        expect(p.fields.map((f) => f.name)).toEqual(['name', 'count']);
    });
});

describe('generateJavaClass', () => {
    const fields = [
        { name: 'id', type: 'Long', comment: '主键' },
        { name: 'userName', type: 'String', comment: '' },
        { name: 'email', type: 'String', comment: '' },
    ];

    test('Entity → DTO', () => {
        const code = generateJavaClass(fields, {
            sourceType: 'entity',
            targetType: 'dto',
            className: 'UserDTO',
            packageName: 'com.example.dto',
            lombok: true,
            validation: true,
        });
        expect(code).toContain('package com.example.dto;');
        expect(code).toContain('public class UserDTO');
        expect(code).toContain('@Data');
        expect(code).toContain('@NotBlank');
        expect(code).toContain('private String userName;');
        expect(code).not.toContain('@Entity');
    });

    test('DTO → Entity 含 JPA', () => {
        const code = generateJavaClass(fields, {
            sourceType: 'dto',
            targetType: 'entity',
            className: 'UserEntity',
            lombok: true,
            jpa: true,
        });
        expect(code).toContain('@Entity');
        expect(code).toContain('@Table');
        expect(code).toContain('@Id');
        expect(code).toContain('@Column');
    });

    test('无 Lombok 生成 getter/setter', () => {
        const code = generateJavaClass([{ name: 'id', type: 'Long' }], {
            targetType: 'vo',
            className: 'UserVO',
            lombok: false,
            validation: false,
        });
        expect(code).not.toContain('@Data');
        expect(code).toContain('getId');
        expect(code).toContain('setId');
    });

    test('从 parse 结果生成自动后缀', () => {
        const parsed = parseJavaFields('class OrderEntity { private Long id; private String title; }');
        const code = generateJavaClass(parsed, { targetType: 'dto', packageName: 'com.x' });
        expect(code).toContain('class OrderDTO');
        expect(code).toContain('private Long id;');
    });
});
