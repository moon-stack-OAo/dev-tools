const { generatePkce, buildAuthorizeUrl, buildTokenRequestHint } = require('../../js/security/oauth2pkce.js');

// RFC 7636 Appendix B
const RFC_VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const RFC_CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

describe('generatePkce', () => {
    test('固定 verifier → RFC challenge', async () => {
        const r = await generatePkce({ verifier: RFC_VERIFIER });
        expect(r.code_verifier).toBe(RFC_VERIFIER);
        expect(r.code_challenge).toBe(RFC_CHALLENGE);
        expect(r.code_challenge_method).toBe('S256');
    });

    test('随机 verifier 长度 43–128', async () => {
        const r = await generatePkce({ verifierLength: 64 });
        expect(r.code_verifier.length).toBe(64);
        expect(r.code_verifier).toMatch(/^[A-Za-z0-9\-._~]+$/);
        expect(r.code_challenge).toMatch(/^[A-Za-z0-9\-_]+$/);
        expect(r.code_challenge.length).toBeGreaterThan(40);
    });

    test('长度边界夹紧', async () => {
        const short = await generatePkce({ verifierLength: 10 });
        expect(short.code_verifier.length).toBe(43);
        const long = await generatePkce({ verifierLength: 200 });
        expect(long.code_verifier.length).toBe(128);
    });

    test('非法 verifier 字符抛错', async () => {
        await expect(generatePkce({ verifier: 'a'.repeat(43) + '!' })).rejects.toThrow();
    });
});

describe('buildAuthorizeUrl', () => {
    test('构造完整 URL', () => {
        const url = buildAuthorizeUrl({
            authorizeUrl: 'https://auth.example.com/oauth/authorize',
            clientId: 'cid',
            redirectUri: 'https://app.example.com/cb',
            scope: 'openid profile',
            state: 'xyz',
            codeChallenge: RFC_CHALLENGE,
        });
        expect(url).toContain('https://auth.example.com/oauth/authorize?');
        expect(url).toContain('response_type=code');
        expect(url).toContain('client_id=cid');
        expect(url).toContain(encodeURIComponent('https://app.example.com/cb'));
        expect(url).toContain(encodeURIComponent('openid profile'));
        expect(url).toContain('state=xyz');
        expect(url).toContain('code_challenge=' + encodeURIComponent(RFC_CHALLENGE));
        expect(url).toContain('code_challenge_method=S256');
    });

    test('已有 query 用 &', () => {
        const url = buildAuthorizeUrl({
            authorizeUrl: 'https://x.com/auth?foo=1',
            clientId: 'c',
            redirectUri: 'https://r',
            codeChallenge: 'ch',
        });
        expect(url).toMatch(/\?foo=1&/);
    });

    test('缺参抛错', () => {
        expect(() => buildAuthorizeUrl({})).toThrow(/authorizeUrl/);
        expect(() =>
            buildAuthorizeUrl({ authorizeUrl: 'https://a', clientId: 'c' }),
        ).toThrow(/redirect_uri/);
    });
});

describe('buildTokenRequestHint', () => {
    test('表单字段', () => {
        const h = buildTokenRequestHint({
            tokenUrl: 'https://t',
            clientId: 'c',
            redirectUri: 'https://r',
            codeVerifier: 'v',
            code: 'code123',
        });
        expect(h.method).toBe('POST');
        expect(h.form.grant_type).toBe('authorization_code');
        expect(h.form.code).toBe('code123');
        expect(h.form.code_verifier).toBe('v');
        expect(h.body).toContain('code_verifier=v');
    });
});
