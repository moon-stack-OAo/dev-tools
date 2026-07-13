const {
    hmacMd5Bytes,
    bufToHex,
    hmacBytesToBase64,
    hmacSign,
} = require('../../js/security/hmac.js');

describe('bufToHex / hmacBytesToBase64', () => {
    test('bufToHex 已知值', () => {
        expect(bufToHex(new Uint8Array([0, 255, 16]))).toBe('00ff10');
    });

    test('hmacBytesToBase64 已知值', () => {
        // "Hi" → SGk=
        expect(hmacBytesToBase64(new Uint8Array([72, 105]))).toBe('SGk=');
    });
});

describe('HMAC-MD5（RFC 2202 向量）', () => {
    test('case 1: key=0x0b*16, data="Hi There"', async () => {
        const key = new Uint8Array(16).fill(0x0b);
        const data = new TextEncoder().encode('Hi There');
        expect(bufToHex(hmacMd5Bytes(key, data))).toBe('9294727a3638bb1c13f48ef8158bfc9d');
    });

    test('case 2: key="Jefe", data="what do ya want for nothing?"', async () => {
        const key = new TextEncoder().encode('Jefe');
        const data = new TextEncoder().encode('what do ya want for nothing?');
        expect(bufToHex(hmacMd5Bytes(key, data))).toBe('750c783e6ab0b503eaa86e310a5db738');
    });

    test('case 3: key=0xaa*16, data=0xdd*50', () => {
        const key = new Uint8Array(16).fill(0xaa);
        const data = new Uint8Array(50).fill(0xdd);
        expect(bufToHex(hmacMd5Bytes(key, data))).toBe('56be34521d144c88dbb8c733f0e8b3f6');
    });
});

describe('hmacSign 边界与 SHA 系列', () => {
    test('HMAC-MD5 空 data 有确定性输出', async () => {
        const hex = await hmacSign('key', '', 'MD5', 'hex');
        expect(hex).toMatch(/^[0-9a-f]{32}$/);
        expect(hex).toBe(await hmacSign('key', '', 'MD5', 'hex'));
    });

    test('HMAC-MD5 空 key + 非空 data', async () => {
        const hex = await hmacSign('', 'data', 'MD5', 'hex');
        expect(hex).toMatch(/^[0-9a-f]{32}$/);
    });

    test('HMAC-SHA256 空 data 确定性', async () => {
        // HMAC-SHA256("", key="key") 已知值
        const hex = await hmacSign('key', '', 'SHA256', 'hex');
        expect(hex).toBe('5d5d139563c95b5967b9bd9a8c9b233a9dedb45072794cd232dc1b74832607d0');
    });

    test('HMAC-SHA1 RFC 2202 case 2', async () => {
        // key="Jefe", data="what do ya want for nothing?"
        const hex = await hmacSign('Jefe', 'what do ya want for nothing?', 'SHA1', 'hex');
        expect(hex).toBe('effcdf6ae5eb2fa2d27416d5f184df9c259a7c79');
    });

    test('base64 输出非空', async () => {
        const b64 = await hmacSign('k', 'm', 'SHA256', 'base64');
        expect(b64.length).toBeGreaterThan(0);
        expect(b64).not.toMatch(/[^A-Za-z0-9+/=]/);
    });

    test('不支持算法抛错', async () => {
        await expect(hmacSign('k', 'm', 'SHA3', 'hex')).rejects.toThrow('不支持的算法');
    });
});
