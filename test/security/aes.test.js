const {
    aesEncryptData,
    aesDecryptData,
    aesBytesToBase64,
    aesBase64ToBytes,
    SALT_SIZE,
    IV_SIZE,
} = require('../../js/security/aes.js');

describe('aesBytesToBase64 / aesBase64ToBytes 互逆', () => {
    test('小数组往返一致', () => {
        const bytes = new Uint8Array([0, 1, 2, 255, 128]);
        expect(Array.from(aesBase64ToBytes(aesBytesToBase64(bytes)))).toEqual([0, 1, 2, 255, 128]);
    });

    test('大数组不抛栈溢出', () => {
        const large = new Uint8Array(100000);
        for (let i = 0; i < large.length; i++) large[i] = i & 0xff;
        const b64 = aesBytesToBase64(large);
        const back = aesBase64ToBytes(b64);
        expect(back.length).toBe(large.length);
        expect(back[0]).toBe(0);
        expect(back[255]).toBe(255);
        expect(back[99999]).toBe(99999 & 0xff);
    });
});

describe('AES-GCM 加解密往返', () => {
    test('明文往返一致', async () => {
        const plain = 'hello AES-GCM 中文';
        const cipher = await aesEncryptData(plain, 'secret-pwd', 'gcm');
        expect(typeof cipher).toBe('string');
        expect(cipher.length).toBeGreaterThan(0);
        const back = await aesDecryptData(cipher, 'secret-pwd', 'gcm');
        expect(back).toBe(plain);
    });

    test('错误密码解密失败', async () => {
        const cipher = await aesEncryptData('data', 'right-pwd', 'gcm');
        await expect(aesDecryptData(cipher, 'wrong-pwd', 'gcm')).rejects.toThrow();
    });
});

describe('AES-CBC 加解密往返', () => {
    test('明文往返一致', async () => {
        const plain = 'hello AES-CBC 中文';
        const cipher = await aesEncryptData(plain, 'secret-pwd', 'cbc');
        expect(typeof cipher).toBe('string');
        expect(cipher.length).toBeGreaterThan(0);
        const back = await aesDecryptData(cipher, 'secret-pwd', 'cbc');
        expect(back).toBe(plain);
    });

    test('错误密码解密失败', async () => {
        const cipher = await aesEncryptData('data', 'right-pwd', 'cbc');
        await expect(aesDecryptData(cipher, 'wrong-pwd', 'cbc')).rejects.toThrow();
    });
});

describe('空/错误输入基本处理', () => {
    test('加密空明文抛错', async () => {
        await expect(aesEncryptData('', 'pwd', 'gcm')).rejects.toThrow('请输入明文和密码');
    });

    test('加密空密码抛错', async () => {
        await expect(aesEncryptData('text', '', 'cbc')).rejects.toThrow('请输入明文和密码');
    });

    test('解密空密文抛错', async () => {
        await expect(aesDecryptData('', 'pwd', 'gcm')).rejects.toThrow('请输入密文和密码');
    });

    test('解密过短密文抛错', async () => {
        const short = aesBytesToBase64(new Uint8Array(SALT_SIZE + IV_SIZE - 1));
        await expect(aesDecryptData(short, 'pwd', 'gcm')).rejects.toThrow('密文数据太短');
    });

    test('解密非法 Base64 抛错', async () => {
        await expect(aesDecryptData('!!!not-base64!!!', 'pwd', 'gcm')).rejects.toThrow();
    });
});
