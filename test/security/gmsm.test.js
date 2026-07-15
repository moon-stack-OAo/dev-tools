const { hexToBase64, base64ToHex } = require('../../js/security/gmsm.js');

describe('hexToBase64 / base64ToHex 互逆', () => {
    test('空串', () => {
        expect(hexToBase64('')).toBe('');
        expect(base64ToHex('')).toBe('');
    });

    test('已知 hex → base64', () => {
        // "Hi" = 4869 → SGk=
        expect(hexToBase64('4869')).toBe('SGk=');
    });

    test('已知 base64 → hex', () => {
        expect(base64ToHex('SGk=')).toBe('4869');
    });

    test('往返一致（偶数 hex）', () => {
        const hex = 'deadbeef00ff';
        expect(base64ToHex(hexToBase64(hex))).toBe(hex);
    });

    test('奇数长度 hex 补前导零', () => {
        // 'f' → '0f' → 1 字节
        expect(hexToBase64('f')).toBe(hexToBase64('0f'));
        expect(base64ToHex(hexToBase64('f'))).toBe('0f');
    });

    test('全零', () => {
        expect(base64ToHex(hexToBase64('0000'))).toBe('0000');
    });

    test('非法 base64 抛错', () => {
        expect(() => base64ToHex('!!!')).toThrow();
    });

    test('大写 hex 输入等价小写', () => {
        expect(hexToBase64('DEADBEEF')).toBe(hexToBase64('deadbeef'));
    });

    test('base64 输出不含换行', () => {
        const hex = 'a0'.repeat(200);
        const b64 = hexToBase64(hex);
        expect(b64).not.toMatch(/[\n\r]/);
    });

    test('多字节大数据往返一致', () => {
        const hex = 'ff'.repeat(500);
        expect(base64ToHex(hexToBase64(hex))).toBe(hex);
    });
});
