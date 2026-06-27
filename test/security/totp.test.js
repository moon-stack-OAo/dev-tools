const {base32Decode, hotp, totp, formatOtp, parseOtpauthUri, verifyOtp} = require('../../js/security/totp.js');

// RFC 4226 / 6238 标准测试密钥 "12345678901234567890" 的 Base32 编码
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('base32Decode', () => {
    test('RFC 标准密钥解码', () => {
        const bytes = base32Decode(RFC_SECRET);
        expect(new TextDecoder().decode(bytes)).toBe('12345678901234567890');
    });

    test('忽略空格与填充符', () => {
        const bytes = base32Decode('JBSW Y3DP E===');
        expect(new TextDecoder().decode(bytes)).toBe('Hello');
    });

    test('小写自动转大写', () => {
        const bytes = base32Decode('jbswy3dp');
        expect(bytes.length).toBeGreaterThan(0);
    });

    test('非法字符抛错', () => {
        expect(() => base32Decode('!!!')).toThrow();
    });
});

describe('formatOtp 格式化显示', () => {
    test('6 位分两组', () => {
        expect(formatOtp('287082', 6)).toBe('287 082');
    });

    test('8 位分两组', () => {
        expect(formatOtp('94287082', 8)).toBe('9428 7082');
    });

    test('未知位数原样返回', () => {
        expect(formatOtp('123456789', 9)).toBe('123456789');
    });
});

describe('HOTP（RFC 4226 测试向量）', () => {
    const expected = [
        '755224',
        '287082',
        '359152',
        '969429',
        '338314',
        '254676',
        '287922',
        '162583',
        '399871',
        '520489',
    ];
    for (let c = 0; c < expected.length; c++) {
        test(`counter=${c} → ${expected[c]}`, async () => {
            expect(await hotp(RFC_SECRET, c, 6, 'SHA-1')).toBe(expected[c]);
        });
    }
});

describe('TOTP（RFC 6238 测试向量, SHA-1, 6 位）', () => {
    // 时间(毫秒) → 期望 6 位码（由 RFC 8 位向量取模得出）
    const cases = [
        [59000, '287082'],
        [1111111109000, '081804'],
        [1234567890000, '005924'],
        [2000000000000, '279037'],
    ];
    for (const [time, expected] of cases) {
        test(`time=${time} → ${expected}`, async () => {
            expect(await totp(RFC_SECRET, time, 30, 6, 'SHA-1')).toBe(expected);
        });
    }
});

describe('parseOtpauthUri', () => {
    test('解析标准 TOTP URI', () => {
        const r = parseOtpauthUri('otpauth://totp/ACME:bob%40test?secret=JBSWY3DPE&issuer=ACME&digits=6&period=30');
        expect(r.type).toBe('totp');
        expect(r.account).toBe('bob@test');
        expect(r.secret).toBe('JBSWY3DPE');
        expect(r.issuer).toBe('ACME');
        expect(r.digits).toBe(6);
        expect(r.period).toBe(30);
    });

    test('label 中带 issuer', () => {
        const r = parseOtpauthUri('otpauth://totp/Foo:bar?secret=AB');
        expect(r.issuer).toBe('Foo');
        expect(r.account).toBe('bar');
    });

    test('HOTP 含 counter', () => {
        const r = parseOtpauthUri('otpauth://hotp/x?secret=AB&counter=5');
        expect(r.type).toBe('hotp');
        expect(r.counter).toBe(5);
    });

    test('algorithm 参数归一化', () => {
        const r = parseOtpauthUri('otpauth://totp/x?secret=AB&algorithm=SHA256');
        expect(r.algorithm).toBe('SHA-256');
    });

    test('缺少 secret 抛错', () => {
        expect(() => parseOtpauthUri('otpauth://totp/x')).toThrow('secret');
    });

    test('非 otpauth 协议抛错', () => {
        expect(() => parseOtpauthUri('https://x.com')).toThrow();
    });
});

describe('verifyOtp 时间漂移容错', () => {
    test('当前令牌验证通过', async () => {
        const code = await totp(RFC_SECRET, Date.now(), 30, 6, 'SHA-1');
        const r = await verifyOtp(code, RFC_SECRET, 30, 6, 'SHA-1');
        expect(r.valid).toBe(true);
    });

    test('错误令牌不通过', async () => {
        const r = await verifyOtp('000000', 'JBSWY3DPE', 30, 6, 'SHA-1');
        expect(r.valid).toBe(false);
    });

    test('空输入不通过', async () => {
        const r = await verifyOtp('', RFC_SECRET, 30, 6, 'SHA-1');
        expect(r.valid).toBe(false);
    });
});
