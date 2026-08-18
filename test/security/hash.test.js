// blueimp-md5：浏览器由 app.js 注入全局 md5，测试环境手动垫片
global.md5 = require('blueimp-md5');

const { hashBytesToHex, hashDigest } = require('../../js/security/hash.js');

describe('hashBytesToHex', () => {
    test('空缓冲为空串', () => {
        expect(hashBytesToHex(new Uint8Array(0))).toBe('');
    });

    test('已知字节', () => {
        expect(hashBytesToHex(new Uint8Array([0, 255, 16]))).toBe('00ff10');
    });
});

describe('hashDigest — 明确向量', () => {
    test('MD5 空串', async () => {
        // d41d8cd98f00b204e9800998ecf8427e
        expect(await hashDigest('md5', '')).toBe('d41d8cd98f00b204e9800998ecf8427e');
    });

    test('MD5 "hello"', async () => {
        expect(await hashDigest('md5', 'hello')).toBe('5d41402abc4b2a76b9719d911017c592');
    });

    test('MD5 中文', async () => {
        // md5("中文")
        expect(await hashDigest('md5', '中文')).toBe('a7bac2239fcdcb3a067903d8077c4a07');
    });

    test('SHA-1 空串', async () => {
        expect(await hashDigest('sha1', '')).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709');
    });

    test('SHA-1 "abc"', async () => {
        expect(await hashDigest('sha1', 'abc')).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
    });

    test('SHA-256 空串', async () => {
        expect(await hashDigest('sha256', '')).toBe(
            'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        );
    });

    test('SHA-256 "hello"', async () => {
        expect(await hashDigest('sha256', 'hello')).toBe(
            '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
        );
    });

    test('SHA-256 中文', async () => {
        expect(await hashDigest('sha256', '中文')).toBe(
            '72726d8818f693066ceb69afa364218b692e62ea92b385782363780f47529c21',
        );
    });

    test('SHA-512 空串', async () => {
        expect(await hashDigest('sha512', '')).toBe(
            'cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce' +
                '47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e',
        );
    });

    test('SHA-384 空串', async () => {
        expect(await hashDigest('sha384', '')).toBe(
            '38b060a751ac96384cd9327eb1b1e36a21fdb71114be07434c0cc7bf63f6e1da' +
                '274edebfe76f65fbd51ad2f14898b95b',
        );
    });

    test('不支持算法抛错', async () => {
        await expect(hashDigest('sha3', 'x')).rejects.toThrow('不支持的算法');
    });
});
