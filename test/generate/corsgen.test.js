const { corsBuildHeaders } = require('../../js/generate/corsgen.js');

describe('corsBuildHeaders', () => {
    test('credentials + * 返回 ok:false', () => {
        const r = corsBuildHeaders({
            originMode: 'star',
            credentials: true,
            methods: ['GET', 'POST'],
        });
        expect(r.ok).toBe(false);
        expect(r.msg).toMatch(/Origin|credentials|\*/i);
    });

    test('默认 methods 含 GET/POST', () => {
        const r = corsBuildHeaders({ originMode: 'star' });
        expect(r.ok).toBe(true);
        expect(r.text).toMatch(/Access-Control-Allow-Methods:.*GET/);
        expect(r.text).toMatch(/Access-Control-Allow-Methods:.*POST/);
    });

    test('text 含 Allow-Origin', () => {
        const r = corsBuildHeaders({
            originMode: 'star',
            methods: ['GET', 'POST', 'OPTIONS'],
        });
        expect(r.ok).toBe(true);
        expect(r.text).toContain('Access-Control-Allow-Origin: *');
        expect(r.headers.some((h) => h.indexOf('Access-Control-Allow-Origin') === 0)).toBe(true);
    });

    test('自定义 origin + credentials', () => {
        const r = corsBuildHeaders({
            originMode: 'custom',
            origin: 'https://app.example.com\nhttps://other.example.com',
            credentials: true,
            methods: ['GET', 'POST'],
            allowHeaders: ['Content-Type', 'Authorization'],
            maxAge: 3600,
        });
        expect(r.ok).toBe(true);
        expect(r.text).toContain('Access-Control-Allow-Origin: https://app.example.com');
        expect(r.text).toContain('Access-Control-Allow-Credentials: true');
        expect(r.text).toContain('Access-Control-Max-Age: 3600');
        expect(r.nginx).toContain('add_header');
        expect(r.express).toContain('res.set');
    });

    test('空自定义 origin 失败', () => {
        const r = corsBuildHeaders({ originMode: 'custom', origin: '  ' });
        expect(r.ok).toBe(false);
    });
});
