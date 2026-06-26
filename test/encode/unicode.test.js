const { unicodeEncodeStr, unicodeDecodeStr } = require('../../js/encode/unicode.js');

describe('unicode 编解码', () => {
    test('ASCII 保留原样', () => {
        expect(unicodeEncodeStr('Hello')).toBe('Hello');
    });

    test('中文编码为 \\uXXXX', () => {
        expect(unicodeEncodeStr('中文')).toBe('\\u4e2d\\u6587');
    });

    test('反斜杠转义', () => {
        expect(unicodeEncodeStr('\\')).toBe('\\u005c');
    });

    test('解码 \\uXXXX 序列', () => {
        expect(unicodeDecodeStr('\\u4e2d\\u6587')).toBe('中文');
    });

    test('无转义序列原样返回', () => {
        expect(unicodeDecodeStr('Hello')).toBe('Hello');
    });

    test('encode -> decode 往返一致(纯 ASCII)', () => {
        const s = 'test 123';
        expect(unicodeDecodeStr(unicodeEncodeStr(s))).toBe(s);
    });
});
