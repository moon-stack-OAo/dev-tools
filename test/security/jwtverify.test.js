const {
    jwtVerifyParse,
    jwtVerifyHmac,
    jwtVerifyClaims,
    jwtvHmacSha256,
    jwtvBytesToB64Url,
} = require('../../js/security/jwtverify.js');

// 经典 jwt.io 样例：header/payload 固定，secret = "secret"
const SAMPLE =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.XbPfbIHMI6arZ3Y922BhjWgQzWXcXNrz0ogtVhfEd2o';

function makeHs256(payload, secret) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const enc = (obj) => {
        const json = JSON.stringify(obj);
        return Buffer.from(json, 'utf8')
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/g, '');
    };
    const h = enc(header);
    const p = enc(payload);
    const input = h + '.' + p;
    const mac = jwtvHmacSha256(
        new TextEncoder().encode(secret),
        new TextEncoder().encode(input),
    );
    return input + '.' + jwtvBytesToB64Url(mac);
}

describe('jwtVerifyParse', () => {
    test('空 token', () => {
        const r = jwtVerifyParse('');
        expect(r.ok).toBe(false);
    });

    test('段数错误', () => {
        const r = jwtVerifyParse('a.b');
        expect(r.ok).toBe(false);
        expect(r.msg).toMatch(/3 段/);
    });

    test('解析样例 header/payload', () => {
        const r = jwtVerifyParse(SAMPLE);
        expect(r.ok).toBe(true);
        expect(r.header.alg).toBe('HS256');
        expect(r.payload.sub).toBe('1234567890');
        expect(r.payload.name).toBe('John Doe');
    });
});

describe('jwtVerifyHmac HS256', () => {
    test('正确密钥验签通过', () => {
        const r = jwtVerifyHmac(SAMPLE, 'secret', { now: 1516239022 });
        expect(r.ok).toBe(true);
        expect(r.valid).toBe(true);
        expect(r.errors).toEqual([]);
        expect(r.payload.sub).toBe('1234567890');
    });

    test('错误密钥签名失败', () => {
        const r = jwtVerifyHmac(SAMPLE, 'wrong-secret', { now: 1516239022 });
        expect(r.ok).toBe(true);
        expect(r.valid).toBe(false);
        expect(r.errors.some((e) => /签名无效/.test(e))).toBe(true);
    });

    test('无效 token', () => {
        const r = jwtVerifyHmac('not-a-jwt', 'secret');
        expect(r.ok).toBe(false);
        expect(r.valid).toBe(false);
    });

    test('过期 exp 失败', () => {
        const token = makeHs256({ sub: 'u1', exp: 1000 }, 'secret');
        const r = jwtVerifyHmac(token, 'secret', { now: 2000, clockSkew: 0 });
        expect(r.valid).toBe(false);
        expect(r.errors.some((e) => /过期/.test(e))).toBe(true);
    });

    test('未过期 exp 通过', () => {
        const token = makeHs256({ sub: 'u1', exp: 3000 }, 'secret');
        const r = jwtVerifyHmac(token, 'secret', { now: 2000, clockSkew: 0 });
        expect(r.valid).toBe(true);
    });

    test('clockSkew 容忍过期', () => {
        const token = makeHs256({ sub: 'u1', exp: 1000 }, 'secret');
        const r = jwtVerifyHmac(token, 'secret', { now: 1050, clockSkew: 60 });
        expect(r.valid).toBe(true);
    });

    test('nbf 未生效', () => {
        const token = makeHs256({ sub: 'u1', nbf: 5000 }, 'secret');
        const r = jwtVerifyHmac(token, 'secret', { now: 1000, clockSkew: 0 });
        expect(r.valid).toBe(false);
        expect(r.errors.some((e) => /尚未生效/.test(e))).toBe(true);
    });
});

describe('jwtVerifyClaims', () => {
    test('iat 在未来报错', () => {
        const errs = jwtVerifyClaims({ iat: 9999 }, { now: 1000, clockSkew: 0 });
        expect(errs.some((e) => /签发时间/.test(e))).toBe(true);
    });

    test('无时间字段无错误', () => {
        expect(jwtVerifyClaims({ sub: 'x' }, { now: 1 })).toEqual([]);
    });
});

describe('jwtvHmacSha256 与 jwt.io 一致', () => {
    test('样例签名匹配', () => {
        const input =
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ';
        const mac = jwtvHmacSha256(new TextEncoder().encode('secret'), new TextEncoder().encode(input));
        expect(jwtvBytesToB64Url(mac)).toBe('XbPfbIHMI6arZ3Y922BhjWgQzWXcXNrz0ogtVhfEd2o');
    });
});
