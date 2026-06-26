const { randGen } = require('../../js/security/random.js');

describe('随机字符串生成 randGen', () => {
    test('生成长度正确', () => {
        expect(randGen(16, 'ABCDEF').length).toBe(16);
    });

    test('仅使用给定字符集', () => {
        const chars = 'AB';
        const out = randGen(80, chars);
        expect([...out].every(c => chars.includes(c))).toBe(true);
    });

    test('单字符集返回该字符重复', () => {
        expect(randGen(10, 'X')).toBe('XXXXXXXXXX');
    });

    test('两次生成大概率不同(随机性)', () => {
        const a = randGen(32, '0123456789abcdef');
        const b = randGen(32, '0123456789abcdef');
        expect(a).not.toBe(b);
    });
});
