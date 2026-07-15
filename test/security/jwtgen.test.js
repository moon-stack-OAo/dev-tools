const {
    b64urlEncode,
    b64urlEncodeString,
    b64Pad,
    pemToArrayBuffer,
    isPem,
    buildJwtSigningInput,
    assembleJwt,
} = require('../../js/security/jwtgen.js');

describe('b64Pad', () => {
    test('长度已整除 4 时不改动', () => {
        expect(b64Pad('YWJj')).toBe('YWJj');
    });

    test('缺 1 个 padding 时补 =', () => {
        expect(b64Pad('YWI')).toBe('YWI=');
    });

    test('缺 2 个 padding 时补 ==', () => {
        expect(b64Pad('YQ')).toBe('YQ==');
    });

    test('缺 3 个 padding 时补 ===', () => {
        expect(b64Pad('Y')).toBe('Y===');
    });
});

describe('b64urlEncode / b64urlEncodeString', () => {
    test('字节编码为 URL-safe Base64 且无 padding', () => {
        // "Hi" → SGk= → SGk
        expect(b64urlEncode(new Uint8Array([72, 105]))).toBe('SGk');
    });

    test('替换 +/ 为 -_', () => {
        // 产生含 +/ 的原始 Base64：0xfb 0xff → +/8=
        const s = b64urlEncode(new Uint8Array([0xfb, 0xff]));
        expect(s).not.toMatch(/[+/=]/);
        expect(s).toBe('-_8');
    });

    test('字符串编码与 TextEncoder 一致', () => {
        const s = b64urlEncodeString('{"alg":"HS256"}');
        expect(s).toBe(b64urlEncode(new TextEncoder().encode('{"alg":"HS256"}')));
        expect(s).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    test('空字节数组编码为空字符串', () => {
        expect(b64urlEncode(new Uint8Array(0))).toBe('');
    });

    test('空字符串编码为空字符串', () => {
        expect(b64urlEncodeString('')).toBe('');
    });

    test('单字节编码', () => {
        // 65 = 'A' → btoa('A') = 'QQ==' → 'QQ'
        expect(b64urlEncode(new Uint8Array([65]))).toBe('QQ');
    });

    test('含特殊字符字符串编码', () => {
        const s = b64urlEncodeString('Hello, 世界!');
        expect(s).toMatch(/^[A-Za-z0-9_-]+$/);
        expect(s.length).toBeGreaterThan(0);
    });
});

describe('isPem', () => {
    test('识别 PRIVATE KEY PEM', () => {
        expect(isPem('-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----')).toBe(true);
    });

    test('识别 RSA PUBLIC KEY PEM', () => {
        expect(isPem('-----BEGIN RSA PUBLIC KEY-----')).toBe(true);
    });

    test('纯 Base64 非 PEM', () => {
        expect(isPem('MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgw')).toBe(false);
    });

    test('空/假值', () => {
        expect(isPem('')).toBe(false);
        expect(isPem(null)).toBe(false);
        expect(isPem(undefined)).toBe(false);
    });
});

describe('pemToArrayBuffer', () => {
    test('去掉头尾与换行后解码', () => {
        // "Hi" Base64 = SGk=
        const pem = '-----BEGIN PRIVATE KEY-----\nSGk=\n-----END PRIVATE KEY-----';
        const buf = pemToArrayBuffer(pem);
        expect(buf).toBeInstanceOf(ArrayBuffer);
        expect(Array.from(new Uint8Array(buf))).toEqual([72, 105]);
    });

    test('无 padding 的 Base64 行可解析', () => {
        const pem = '-----BEGIN PRIVATE KEY-----\nSGk\n-----END PRIVATE KEY-----';
        const bytes = new Uint8Array(pemToArrayBuffer(pem));
        expect(Array.from(bytes)).toEqual([72, 105]);
    });

    test('多行 Base64 可拼接解析', () => {
        // "Hello" Base64 = SGVsbG8=
        const pem = '-----BEGIN RSA PRIVATE KEY-----\nSGVs\nbG8=\n-----END RSA PRIVATE KEY-----';
        const bytes = new Uint8Array(pemToArrayBuffer(pem));
        expect(Array.from(bytes)).toEqual([72, 101, 108, 108, 111]);
    });

    test('带回车换行的 PEM 可解析', () => {
        const pem = '-----BEGIN PRIVATE KEY-----\r\nSGk=\r\n-----END PRIVATE KEY-----';
        const bytes = new Uint8Array(pemToArrayBuffer(pem));
        expect(Array.from(bytes)).toEqual([72, 105]);
    });
});

describe('buildJwtSigningInput / assembleJwt', () => {
    test('拼装 header.payload 两段', () => {
        const input = buildJwtSigningInput({ alg: 'HS256', typ: 'JWT' }, { sub: '1' });
        const parts = input.split('.');
        expect(parts).toHaveLength(2);
        expect(parts[0]).toMatch(/^[A-Za-z0-9_-]+$/);
        expect(parts[1]).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    test('header 段可解码为原对象', () => {
        const header = { alg: 'HS256', typ: 'JWT' };
        const input = buildJwtSigningInput(header, { sub: 'user' });
        const headerB64 = input.split('.')[0];
        const padded = headerB64 + '='.repeat((4 - (headerB64.length % 4)) % 4);
        const json = Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
        expect(JSON.parse(json)).toEqual(header);
    });

    test('assembleJwt 生成三段 token', () => {
        const signing = buildJwtSigningInput({ alg: 'HS256' }, { sub: 'x' });
        const token = assembleJwt(signing, 'sig');
        expect(token).toBe(signing + '.sig');
        expect(token.split('.')).toHaveLength(3);
    });

    test('payload 段可解码为原对象', () => {
        const payload = { sub: 'user123', iat: 1000000, exp: 10003600 };
        const input = buildJwtSigningInput({ alg: 'HS256' }, payload);
        const payloadB64 = input.split('.')[1];
        const padded = payloadB64 + '='.repeat((4 - (payloadB64.length % 4)) % 4);
        const json = Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
        expect(JSON.parse(json)).toEqual(payload);
    });

    test('空对象 header 和 payload', () => {
        const input = buildJwtSigningInput({}, {});
        const parts = input.split('.');
        expect(parts).toHaveLength(2);
        expect(parts[0]).toMatch(/^[A-Za-z0-9_-]+$/);
        expect(parts[1]).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    test('assembleJwt 空签名生成两段 token', () => {
        const signing = buildJwtSigningInput({ alg: 'HS256' }, { sub: 'x' });
        const token = assembleJwt(signing, '');
        expect(token).toBe(signing + '.');
        expect(token.split('.')).toHaveLength(3);
    });

    test('含特殊字符的 payload', () => {
        const payload = { name: '张三', email: 'test@example.com' };
        const input = buildJwtSigningInput({ alg: 'HS256' }, payload);
        const payloadB64 = input.split('.')[1];
        const padded = payloadB64 + '='.repeat((4 - (payloadB64.length % 4)) % 4);
        const json = Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
        expect(JSON.parse(json)).toEqual(payload);
    });
});
