const {
    cacheControlBuild,
    cacheControlFormatDuration,
    cacheControlGetPreset,
    CACHE_CONTROL_PRESETS,
} = require('../../js/generate/cachecontrol.js');

describe('cacheControlBuild', () => {
    test('no-store 输出含 no-store', () => {
        const r = cacheControlBuild({ noStore: true, maxAge: 3600, scope: 'public' });
        expect(r.ok).toBe(true);
        expect(r.cacheControl).toContain('no-store');
        expect(r.cacheControl).not.toContain('max-age');
        expect(r.headersText).toContain('Cache-Control: no-store');
    });

    test('max-age=3600 含 max-age=3600', () => {
        const r = cacheControlBuild({ scope: 'public', maxAge: 3600 });
        expect(r.ok).toBe(true);
        expect(r.cacheControl).toContain('max-age=3600');
        expect(r.headersText).toContain('Cache-Control:');
    });

    test('public + immutable + max-age', () => {
        const r = cacheControlBuild({
            scope: 'public',
            immutable: true,
            maxAge: 31536000,
        });
        expect(r.ok).toBe(true);
        expect(r.cacheControl).toContain('public');
        expect(r.cacheControl).toContain('immutable');
        expect(r.cacheControl).toContain('max-age=31536000');
        expect(r.summary).toMatch(/不可变|immutable|1 年/);
    });

    test('Expires 基于 max-age', () => {
        const now = new Date('2020-01-01T00:00:00.000Z');
        const r = cacheControlBuild({
            scope: 'public',
            maxAge: 60,
            includeExpires: true,
            now: now,
        });
        expect(r.ok).toBe(true);
        expect(r.headersText).toContain('Expires:');
        expect(r.headersText).toContain('Wed, 01 Jan 2020 00:01:00 GMT');
    });

    test('Vary 附加', () => {
        const r = cacheControlBuild({
            scope: 'private',
            maxAge: 1800,
            vary: 'Accept-Encoding',
        });
        expect(r.headersText).toContain('Vary: Accept-Encoding');
    });
});

describe('cacheControlFormatDuration', () => {
    test('86400 → 1 天', () => {
        expect(cacheControlFormatDuration(86400)).toBe('1 天');
    });
    test('3600 → 1 小时', () => {
        expect(cacheControlFormatDuration(3600)).toBe('1 小时');
    });
});

describe('presets', () => {
    test('预设存在且可构建', () => {
        expect(CACHE_CONTROL_PRESETS.length).toBeGreaterThanOrEqual(4);
        const p = cacheControlGetPreset('long-1y');
        expect(p).toBeTruthy();
        const r = cacheControlBuild(p.opts);
        expect(r.ok).toBe(true);
        expect(r.cacheControl).toContain('immutable');
    });

    test('无缓存预设', () => {
        const p = cacheControlGetPreset('no-cache-store');
        const r = cacheControlBuild(p.opts);
        expect(r.cacheControl).toBe('no-store');
    });
});
