const { evalSimpleSpel } = require('../../js/debug/spel.js');

describe('evalSimpleSpel 字面量与运算', () => {
    test('数字运算', () => {
        expect(evalSimpleSpel('1 + 2 * 3')).toBe(7);
        expect(evalSimpleSpel('(1 + 2) * 3')).toBe(9);
        expect(evalSimpleSpel('10 % 3')).toBe(1);
        expect(evalSimpleSpel('10 / 2')).toBe(5);
        expect(evalSimpleSpel('-5 + 2')).toBe(-3);
    });

    test('比较与布尔', () => {
        expect(evalSimpleSpel('1 < 2')).toBe(true);
        expect(evalSimpleSpel('2 >= 2')).toBe(true);
        expect(evalSimpleSpel('1 == 1 && 2 != 3')).toBe(true);
        expect(evalSimpleSpel('true || false')).toBe(true);
        expect(evalSimpleSpel('!false')).toBe(true);
    });

    test('三元与字符串', () => {
        expect(evalSimpleSpel("1 > 0 ? 'yes' : 'no'")).toBe('yes');
        expect(evalSimpleSpel("'a' + 'b'")).toBe('ab');
        expect(evalSimpleSpel("'x' == 'x'")).toBe(true);
    });

    test('空表达式抛错', () => {
        expect(() => evalSimpleSpel('')).toThrow();
        expect(() => evalSimpleSpel('   ')).toThrow();
    });
});

describe('evalSimpleSpel 属性路径', () => {
    const ctx = { user: { age: 20, name: 'a', tags: ['java', 'spring'], profile: { city: 'SH' } } };

    test('点号路径', () => {
        expect(evalSimpleSpel('user.age', ctx)).toBe(20);
        expect(evalSimpleSpel('user.name', ctx)).toBe('a');
        expect(evalSimpleSpel('user.profile.city', ctx)).toBe('SH');
    });

    test('下标访问', () => {
        expect(evalSimpleSpel("user['name']", ctx)).toBe('a');
        expect(evalSimpleSpel("user['age']", ctx)).toBe(20);
        expect(evalSimpleSpel('user.tags[0]', ctx)).toBe('java');
    });

    test('比较属性', () => {
        expect(evalSimpleSpel('user.age > 18', ctx)).toBe(true);
        expect(evalSimpleSpel("user.age > 18 && user.name == 'a'", ctx)).toBe(true);
        expect(evalSimpleSpel("user.age > 18 ? 'adult' : 'minor'", ctx)).toBe('adult');
    });

    test('安全导航', () => {
        expect(evalSimpleSpel('user.missing?.x', ctx)).toBe(null);
    });

    test('不支持方法调用', () => {
        expect(() => evalSimpleSpel('user.name.length()', ctx)).toThrow(/方法调用/);
    });

    test('不支持 T()', () => {
        expect(() => evalSimpleSpel('T(java.lang.Math)', ctx)).toThrow(/T\(\)/);
    });
});
