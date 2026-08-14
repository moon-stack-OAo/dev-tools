const {
    parseNginxLogLine,
    parseNginxLog,
    summarizeNginxLog,
} = require('../../js/debug/nginxlog.js');

const LINE =
    '192.168.1.10 - - [14/Aug/2026:10:00:01 +0800] "GET /api/users?page=1 HTTP/1.1" 200 1234 "https://ref" "Mozilla/5.0"';

describe('parseNginxLogLine', () => {
    test('combined 格式', () => {
        const e = parseNginxLogLine(LINE);
        expect(e).not.toBeNull();
        expect(e.ip).toBe('192.168.1.10');
        expect(e.method).toBe('GET');
        expect(e.path).toBe('/api/users?page=1');
        expect(e.urlPath).toBe('/api/users');
        expect(e.query).toBe('page=1');
        expect(e.status).toBe(200);
        expect(e.bytes).toBe(1234);
        expect(e.referer).toBe('https://ref');
        expect(e.userAgent).toContain('Mozilla');
    });

    test('空行与非法行', () => {
        expect(parseNginxLogLine('')).toBeNull();
        expect(parseNginxLogLine('not a log')).toBeNull();
    });

    test('POST 与 500', () => {
        const e = parseNginxLogLine(
            '10.0.0.1 - alice [01/Jan/2026:00:00:00 +0000] "POST /login HTTP/1.1" 500 32 "-" "curl"',
        );
        expect(e.method).toBe('POST');
        expect(e.status).toBe(500);
        expect(e.user).toBe('alice');
    });
});

describe('parseNginxLog', () => {
    const text = [
        LINE,
        '10.0.0.5 - - [14/Aug/2026:10:00:03 +0800] "POST /api/login HTTP/1.1" 401 89 "-" "curl"',
        'bad',
        '10.0.0.5 - - [14/Aug/2026:10:00:04 +0800] "GET /health HTTP/1.1" 200 2 "-" "curl"',
    ].join('\n');

    test('多行与 skip', () => {
        const r = parseNginxLog(text);
        expect(r.entries).toHaveLength(3);
        expect(r.skipped).toBe(1);
    });

    test('过滤 method / status', () => {
        const r = parseNginxLog(text, { method: 'POST', statusMin: 400 });
        expect(r.entries).toHaveLength(1);
        expect(r.entries[0].status).toBe(401);
    });

    test('path 过滤', () => {
        const r = parseNginxLog(text, { pathContains: '/health' });
        expect(r.entries).toHaveLength(1);
        expect(r.entries[0].urlPath).toBe('/health');
    });
});

describe('summarizeNginxLog', () => {
    test('状态分布与 Top', () => {
        const r = parseNginxLog(
            [
                LINE,
                LINE,
                '1.1.1.1 - - [t] "GET /a HTTP/1.1" 404 1 "-" "u"',
                '2.2.2.2 - - [t] "GET /b HTTP/1.1" 500 1 "-" "u"',
            ].join('\n'),
        );
        const s = summarizeNginxLog(r, { topN: 5 });
        expect(s.total).toBe(4);
        expect(s.statusGroups['2xx']).toBe(2);
        expect(s.statusGroups['4xx']).toBe(1);
        expect(s.statusGroups['5xx']).toBe(1);
        expect(s.topIps[0].key).toBe('192.168.1.10');
        expect(s.topIps[0].count).toBe(2);
        expect(s.topUrls[0].key).toBe('/api/users');
    });
});
