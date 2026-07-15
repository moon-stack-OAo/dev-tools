const bcryptjs = require('bcryptjs');
const {
    bcryptNormalizeRounds,
    bcryptValidateVerifyInput,
    bcryptHashSync,
    bcryptCompareSync,
} = require('../../js/security/bcrypt.js');

describe('bcryptNormalizeRounds', () => {
    test('合法范围透传', () => {
        expect(bcryptNormalizeRounds(4)).toBe(4);
        expect(bcryptNormalizeRounds(10)).toBe(10);
        expect(bcryptNormalizeRounds(14)).toBe(14);
    });

    test('非法/空值回落默认 10', () => {
        expect(bcryptNormalizeRounds('')).toBe(10);
        expect(bcryptNormalizeRounds(undefined)).toBe(10);
        expect(bcryptNormalizeRounds('abc')).toBe(10);
    });

    test('字符串数字可解析', () => {
        expect(bcryptNormalizeRounds('8')).toBe(8);
    });

    test('越界抛错', () => {
        expect(() => bcryptNormalizeRounds(3)).toThrow('cost 必须在 4~14 之间');
        expect(() => bcryptNormalizeRounds(15)).toThrow('cost 必须在 4~14 之间');
    });
});

describe('bcryptValidateVerifyInput', () => {
    test('正常输入 trim 哈希', () => {
        expect(bcryptValidateVerifyInput('pwd', '  $2a$10$abc  ')).toEqual({
            pwd: 'pwd',
            hash: '$2a$10$abc',
        });
    });

    test('空明文或空哈希抛错', () => {
        expect(() => bcryptValidateVerifyInput('', 'hash')).toThrow('请输入明文和哈希值');
        expect(() => bcryptValidateVerifyInput('pwd', '')).toThrow('请输入明文和哈希值');
        expect(() => bcryptValidateVerifyInput('pwd', '   ')).toThrow('请输入明文和哈希值');
    });
});

describe('bcryptHashSync / bcryptCompareSync', () => {
    test('库未加载抛错', () => {
        expect(() => bcryptHashSync('pwd', 4, null)).toThrow('bcrypt 库未加载');
        expect(() => bcryptCompareSync('pwd', '$2a$10$x', null)).toThrow('bcrypt 库未加载');
    });

    test('空密码哈希抛错', () => {
        expect(() => bcryptHashSync('', 4, bcryptjs)).toThrow('请输入明文密码');
    });

    test('hash 与 compare 往返匹配', () => {
        const hash = bcryptHashSync('secret', 4, bcryptjs);
        expect(hash).toMatch(/^\$2[aby]?\$/);
        expect(bcryptCompareSync('secret', hash, bcryptjs)).toBe(true);
        expect(bcryptCompareSync('wrong', hash, bcryptjs)).toBe(false);
    });

    test('cost 越界在 hash 时抛错', () => {
        expect(() => bcryptHashSync('pwd', 2, bcryptjs)).toThrow('cost 必须在 4~14 之间');
    });
});
