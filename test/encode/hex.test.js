const { strToHex, hexToStr } = require('../../js/encode/hex.js');

describe('hex 编解码', () => {
    test('strToHex 编码 ASCII', () => {
        expect(strToHex('AB')).toBe('4142');
    });

    test('strToHex 支持空格分隔与 0x 前缀', () => {
        expect(strToHex('AB', { space: true, prefix: true })).toBe('0X41 0X42');
    });

    test('strToHex 空串返回空', () => {
        expect(strToHex('')).toBe('');
    });

    test('hexToStr 解码 UTF-8', () => {
        expect(hexToStr('48656c6c6f')).toBe('Hello');
    });

    test('hexToStr 容忍 0x/空格/换行/逗号', () => {
        expect(hexToStr('0x48 0x65\n6c 6c,6f')).toBe('Hello');
    });

    test('hexToStr 非法输入抛错', () => {
        expect(() => hexToStr('xyz')).toThrow();
    });

    test('strToHex -> hexToStr 往返一致', () => {
        const s = '你好, world';
        expect(hexToStr(strToHex(s))).toBe(s);
    });
});
