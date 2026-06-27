const {
    pbkdf2,
    bytesToBase64,
    base64ToBytes,
    bytesToHex,
    formatPBKDF2,
    parsePBKDF2,
    constantTimeEquals,
    randomSalt,
} = require('../../js/security/pbkdf2.js');

describe('bytesToBase64 / base64ToBytes 互逆', () => {
    test('往返一致', () => {
        const bytes = [0, 1, 2, 255, 128];
        const b64 = bytesToBase64(new Uint8Array(bytes));
        expect(Array.from(base64ToBytes(b64))).toEqual(bytes);
    });

    test('已知值', () => {
        expect(bytesToBase64(new Uint8Array([72, 105]))).toBe('SGk='); // "Hi"
    });
});

describe('bytesToHex', () => {
    test('两位补零', () => {
        expect(bytesToHex(new Uint8Array([0, 255, 16]))).toBe('00ff10');
    });
});

describe('PHC 格式编解码', () => {
    test('formatPBKDF2 SHA-256 标准格式', () => {
        const f = formatPBKDF2('SHA-256', 100000, new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6]));
        expect(f).toBe('$pbkdf2-sha256$100000$AQID$BAUG');
    });

    test('formatPBKDF2 SHA-512 标识', () => {
        const f = formatPBKDF2('SHA-512', 1000, new Uint8Array([1]), new Uint8Array([2]));
        expect(f.startsWith('$pbkdf2-sha512$')).toBe(true);
    });

    test('parsePBKDF2 往返一致', () => {
        const salt = new Uint8Array([1, 2, 3]);
        const hash = new Uint8Array([4, 5, 6]);
        const p = parsePBKDF2(formatPBKDF2('SHA-512', 5000, salt, hash));
        expect(p.algorithm).toBe('SHA-512');
        expect(p.iterations).toBe(5000);
        expect(Array.from(p.salt)).toEqual([1, 2, 3]);
        expect(Array.from(p.hash)).toEqual([4, 5, 6]);
    });

    test('parsePBKDF2 空值抛错', () => {
        expect(() => parsePBKDF2('')).toThrow();
    });

    test('parsePBKDF2 格式错误抛错', () => {
        expect(() => parsePBKDF2('nope')).toThrow();
    });

    test('parsePBKDF2 不支持的算法抛错', () => {
        expect(() => parsePBKDF2('$pbkdf2-md5$1000$AQID$BAUG')).toThrow();
    });

    test('parsePBKDF2 iterations 无效抛错', () => {
        expect(() => parsePBKDF2('$pbkdf2-sha256$0$AQID$BAUG')).toThrow();
    });
});

describe('constantTimeEquals 常时间比较', () => {
    test('相同相等', () => {
        expect(constantTimeEquals(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true);
    });

    test('不同不等', () => {
        expect(constantTimeEquals(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4]))).toBe(false);
    });

    test('长度不同不等', () => {
        expect(constantTimeEquals(new Uint8Array([1]), new Uint8Array([1, 2]))).toBe(false);
    });
});

describe('randomSalt 随机盐', () => {
    test('长度正确', () => {
        expect(randomSalt(16).length).toBe(16);
    });

    test('两次生成大概率不同', () => {
        const a = Array.from(randomSalt(16));
        const b = Array.from(randomSalt(16));
        expect(a).not.toEqual(b);
    });
});

describe('pbkdf2 派生（标准测试向量）', () => {
    // PBKDF2-HMAC-SHA256("password", "salt", 1, 32) 广泛引用的已知值
    const EXPECTED = '120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b';

    test('字符串 salt', async () => {
        const dk = await pbkdf2('password', 'salt', 1, 32);
        expect(bytesToHex(dk)).toBe(EXPECTED);
    });

    test('Uint8Array salt 结果一致', async () => {
        const saltBytes = new TextEncoder().encode('salt');
        const dk = await pbkdf2('password', saltBytes, 1, 32);
        expect(bytesToHex(dk)).toBe(EXPECTED);
    });

    test('默认算法为 SHA-256', async () => {
        const dk = await pbkdf2('password', 'salt', 1, 32);
        const dkExplicit = await pbkdf2('password', 'salt', 1, 32, 'SHA-256');
        expect(bytesToHex(dk)).toBe(bytesToHex(dkExplicit));
    });
});
