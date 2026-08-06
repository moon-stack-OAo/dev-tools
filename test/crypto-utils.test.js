const {
    bytesToHex,
    hexToBytes,
    bytesToBase64,
    base64ToBytes,
    bytesToBase64Url,
    base64UrlToBytes,
    strToBytes,
    bytesToStr,
} = require('../js/crypto-utils.js');

describe('bytesToHex / hexToBytes', () => {
    test('已知值与补零', () => {
        expect(bytesToHex(new Uint8Array([0, 255, 16]))).toBe('00ff10');
    });

    test('互逆', () => {
        const src = new Uint8Array([1, 2, 3, 250]);
        expect(Array.from(hexToBytes(bytesToHex(src)))).toEqual(Array.from(src));
    });

    test('忽略空白', () => {
        expect(Array.from(hexToBytes('00 ff\n10'))).toEqual([0, 255, 16]);
    });

    test('非法字符 throw', () => {
        expect(() => hexToBytes('zz')).toThrow();
        expect(() => hexToBytes('abc')).toThrow();
    });
});

describe('bytesToBase64 / base64ToBytes', () => {
    test('已知值 Hi', () => {
        expect(bytesToBase64(new Uint8Array([72, 105]))).toBe('SGk=');
    });

    test('互逆', () => {
        const bytes = new Uint8Array([0, 1, 2, 255, 128]);
        expect(Array.from(base64ToBytes(bytesToBase64(bytes)))).toEqual(Array.from(bytes));
    });

    test('允许空白', () => {
        expect(Array.from(base64ToBytes('SG\nk='))).toEqual([72, 105]);
    });
});

describe('base64url', () => {
    test('无 padding 与互逆', () => {
        const bytes = strToBytes('hello world!!');
        const u = bytesToBase64Url(bytes);
        expect(u.includes('=')).toBe(false);
        expect(u.includes('+')).toBe(false);
        expect(u.includes('/')).toBe(false);
        expect(bytesToStr(base64UrlToBytes(u))).toBe('hello world!!');
    });
});

describe('utf8', () => {
    test('中文往返', () => {
        const s = '你好-devtools';
        expect(bytesToStr(strToBytes(s))).toBe(s);
    });
});
