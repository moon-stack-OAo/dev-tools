const { rsaBytesToBase64, rsaBase64ToBytes } = require('../../js/security/rsa.js');

describe('rsaBytesToBase64 / rsaBase64ToBytes 互逆', () => {
    test('空数组', () => {
        expect(rsaBytesToBase64(new Uint8Array(0))).toBe('');
        expect(Array.from(rsaBase64ToBytes(''))).toEqual([]);
    });

    test('小数组往返一致', () => {
        const bytes = new Uint8Array([0, 1, 2, 255, 128]);
        expect(Array.from(rsaBase64ToBytes(rsaBytesToBase64(bytes)))).toEqual([0, 1, 2, 255, 128]);
    });

    test('ArrayBuffer 可编码', () => {
        const buf = new Uint8Array([72, 105]).buffer; // "Hi"
        expect(rsaBytesToBase64(buf)).toBe('SGk=');
    });

    test('大数组不抛栈溢出', () => {
        const large = new Uint8Array(100000);
        for (let i = 0; i < large.length; i++) large[i] = i & 0xff;
        const b64 = rsaBytesToBase64(large);
        const back = rsaBase64ToBytes(b64);
        expect(back.length).toBe(large.length);
        expect(back[0]).toBe(0);
        expect(back[255]).toBe(255);
        expect(back[99999]).toBe(99999 & 0xff);
    });

    test('已知 Base64 解码', () => {
        // "Hi" → SGk=
        expect(Array.from(rsaBase64ToBytes('SGk='))).toEqual([72, 105]);
    });

    test('非法 Base64 抛错', () => {
        expect(() => rsaBase64ToBytes('!!!')).toThrow();
    });

    test('精确分块大小 0x8000 字节往返', () => {
        const size = 0x8000;
        const arr = new Uint8Array(size);
        for (let i = 0; i < size; i++) arr[i] = i & 0xff;
        const b64 = rsaBytesToBase64(arr);
        const back = rsaBase64ToBytes(b64);
        expect(back.length).toBe(size);
        expect(back[0]).toBe(0);
        expect(back[127]).toBe(127);
        expect(back[size - 1]).toBe((size - 1) & 0xff);
    });

    test('跨分块边界 0x8001 字节', () => {
        const size = 0x8000 + 1;
        const arr = new Uint8Array(size);
        arr[0x8000] = 0xab;
        const b64 = rsaBytesToBase64(arr);
        const back = rsaBase64ToBytes(b64);
        expect(back.length).toBe(size);
        expect(back[0x8000]).toBe(0xab);
    });

    test('含空白的 Base64 可解码', () => {
        // "Hi" 标准 Base64 = SGk=，加空格/换行后 trim 后仍可解
        const b64 = '  SGk=  ';
        expect(Array.from(rsaBase64ToBytes(b64))).toEqual([72, 105]);
    });

    test('普通数组输入可编码', () => {
        // 传入普通数组而非 Uint8Array
        const arr = [72, 101, 108, 108, 111]; // "Hello"
        expect(rsaBytesToBase64(arr)).toBe('SGVsbG8=');
    });

    test('单字节数组', () => {
        const bytes = new Uint8Array([65]); // "A"
        expect(rsaBytesToBase64(bytes)).toBe('QQ==');
        expect(Array.from(rsaBase64ToBytes('QQ=='))).toEqual([65]);
    });

    test('全零数组往返', () => {
        const bytes = new Uint8Array(10).fill(0);
        const b64 = rsaBytesToBase64(bytes);
        const back = rsaBase64ToBytes(b64);
        expect(back.length).toBe(10);
        expect(Array.from(back)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    });

    test('全 0xFF 数组往返', () => {
        const bytes = new Uint8Array(10).fill(0xff);
        const b64 = rsaBytesToBase64(bytes);
        const back = rsaBase64ToBytes(b64);
        expect(back.length).toBe(10);
        expect(Array.from(back)).toEqual([255, 255, 255, 255, 255, 255, 255, 255, 255, 255]);
    });

    test('仅空白的 Base64 返回空数组', () => {
        // trim() 后为空字符串，atob('') 返回空字符串
        expect(Array.from(rsaBase64ToBytes('   '))).toEqual([]);
    });
});
