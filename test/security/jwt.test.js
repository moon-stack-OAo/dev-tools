const { jwtPadBase64Url, jwtDecodeSegment } = require('../../js/security/jwt.js');

describe('jwtPadBase64Url', () => {
    test('长度已整除 4 时不改动', () => {
        expect(jwtPadBase64Url('YWJj')).toBe('YWJj');
    });

    test('缺 1 个 padding 时补 =', () => {
        expect(jwtPadBase64Url('YWI')).toBe('YWI=');
    });

    test('缺 2 个 padding 时补 ==', () => {
        expect(jwtPadBase64Url('YQ')).toBe('YQ==');
    });
});

describe('jwtDecodeSegment', () => {
    test('标准 Base64URL 无 padding 可解码', () => {
        // "eyJhbGciOiJIUzI1NiJ9" = {"alg":"HS256"}
        const json = jwtDecodeSegment('eyJhbGciOiJIUzI1NiJ9');
        expect(JSON.parse(json)).toEqual({ alg: 'HS256' });
    });

    test('payload 无 padding 可解码', () => {
        // {"sub":"1"} → eyJzdWIiOiIxIn0
        const json = jwtDecodeSegment('eyJzdWIiOiIxIn0');
        expect(JSON.parse(json)).toEqual({ sub: '1' });
    });

    test('空段解码为空串', () => {
        expect(jwtDecodeSegment('')).toBe('');
    });

    test('畸形 Base64 抛错', () => {
        expect(() => jwtDecodeSegment('!!!')).toThrow();
    });
});

