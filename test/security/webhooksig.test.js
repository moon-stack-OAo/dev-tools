const {
    generateWebhookSignature,
    verifyWebhookSignature,
    whsBuildSignedPayload,
} = require('../../js/security/webhooksig.js');
const crypto = require('crypto');

function nodeHmacHex(secret, payload) {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

describe('whsBuildSignedPayload', () => {
    test('无 timestamp 即 body', () => {
        expect(whsBuildSignedPayload('abc')).toBe('abc');
    });
    test('有 timestamp 拼接', () => {
        expect(whsBuildSignedPayload('{"a":1}', { timestamp: 123 })).toBe('123.{"a":1}');
    });
});

describe('generateWebhookSignature', () => {
    test('hex 与 Node crypto 一致', async () => {
        const secret = 'secret';
        const body = 'hello';
        const r = await generateWebhookSignature(secret, body, { style: 'hex' });
        expect(r.hex).toBe(nodeHmacHex(secret, body));
        expect(r.signature).toBe(r.hex);
    });

    test('github 风格 sha256=', async () => {
        const r = await generateWebhookSignature('k', 'm', { style: 'github' });
        expect(r.signature).toBe('sha256=' + r.hex);
        expect(r.hex).toMatch(/^[0-9a-f]{64}$/);
    });

    test('base64 输出', async () => {
        const r = await generateWebhookSignature('k', 'm', { style: 'base64' });
        expect(r.signature).toBe(r.base64);
        expect(r.base64.length).toBeGreaterThan(0);
    });

    test('stripe 风格 t=,v1=', async () => {
        const body = '{"id":1}';
        const ts = '1609459200';
        const r = await generateWebhookSignature('whsec', body, { style: 'stripe', timestamp: ts });
        const expected = nodeHmacHex('whsec', ts + '.' + body);
        expect(r.signature).toBe('t=' + ts + ',v1=' + expected);
        expect(r.hex).toBe(expected);
    });

    test('stripe 缺 timestamp 抛错', async () => {
        await expect(generateWebhookSignature('s', 'b', { style: 'stripe' })).rejects.toThrow(/timestamp/);
    });
});

describe('verifyWebhookSignature', () => {
    test('hex 校验通过', async () => {
        const secret = 's';
        const body = 'payload';
        const gen = await generateWebhookSignature(secret, body, { style: 'hex' });
        const v = await verifyWebhookSignature(secret, body, gen.hex, { style: 'hex' });
        expect(v.valid).toBe(true);
    });

    test('github 校验通过', async () => {
        const gen = await generateWebhookSignature('sec', 'body', { style: 'github' });
        const v = await verifyWebhookSignature('sec', 'body', gen.signature, { style: 'github' });
        expect(v.valid).toBe(true);
    });

    test('错误签名失败', async () => {
        const v = await verifyWebhookSignature('sec', 'body', '0'.repeat(64), { style: 'hex' });
        expect(v.valid).toBe(false);
    });

    test('stripe 从头解析 t', async () => {
        const body = 'x';
        const ts = '100';
        const gen = await generateWebhookSignature('k', body, { style: 'stripe', timestamp: ts });
        const v = await verifyWebhookSignature('k', body, gen.signature, { style: 'stripe' });
        expect(v.valid).toBe(true);
        expect(v.signedPayload).toBe('100.x');
    });

    test('auto 识别 github', async () => {
        const gen = await generateWebhookSignature('a', 'b', { style: 'github' });
        const v = await verifyWebhookSignature('a', 'b', gen.signature, { style: 'auto' });
        expect(v.valid).toBe(true);
    });
});
