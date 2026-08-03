const {
    urlQueryParse,
    urlQueryBuild,
    urlQueryParseParamsText,
    urlQueryParamsToText,
} = require('../../js/debug/urlquery.js');

describe('urlQueryParse', () => {
    test('正常 URL', () => {
        const r = urlQueryParse('https://example.com/path?a=1&b=hello%20world#sec');
        expect(r.ok).toBe(true);
        expect(r.base).toBe('https://example.com/path');
        expect(r.hash).toBe('sec');
        expect(r.params).toEqual([
            { k: 'a', v: '1' },
            { k: 'b', v: 'hello world' },
        ]);
    });

    test('无 query', () => {
        const r = urlQueryParse('https://example.com/path');
        expect(r.ok).toBe(true);
        expect(r.params).toEqual([]);
        expect(r.hash).toBe('');
    });

    test('空输入', () => {
        const r = urlQueryParse('');
        expect(r.ok).toBe(false);
        expect(r.msg).toMatch(/请输入/);
    });

    test('仅 key 无 value', () => {
        const r = urlQueryParse('https://x.com/?flag&a=1');
        expect(r.ok).toBe(true);
        expect(r.params[0]).toEqual({ k: 'flag', v: '' });
        expect(r.params[1]).toEqual({ k: 'a', v: '1' });
    });
});

describe('urlQueryBuild', () => {
    test('正常生成并编码', () => {
        const r = urlQueryBuild('https://example.com/path', [
            { k: 'page', v: '1' },
            { k: 'keyword', v: '张三' },
        ], 'list');
        expect(r.ok).toBe(true);
        expect(r.url).toBe(
            'https://example.com/path?page=1&keyword=' + encodeURIComponent('张三') + '#list',
        );
    });

    test('params 文本', () => {
        const r = urlQueryBuild('https://a.com', 'x=1\ny=2', '');
        expect(r.ok).toBe(true);
        expect(r.url).toBe('https://a.com?x=1&y=2');
    });

    test('空 base', () => {
        const r = urlQueryBuild('', [{ k: 'a', v: '1' }]);
        expect(r.ok).toBe(false);
        expect(r.msg).toMatch(/Base URL/);
    });

    test('跳过空 key', () => {
        const r = urlQueryBuild('https://a.com', [
            { k: '', v: 'x' },
            { k: 'a', v: '1' },
        ]);
        expect(r.ok).toBe(true);
        expect(r.url).toBe('https://a.com?a=1');
    });
});

describe('urlQuery 往返', () => {
    test('build → parse', () => {
        const built = urlQueryBuild('https://api.example.com/v1', [
            { k: 'q', v: 'a b' },
            { k: 'n', v: '2' },
        ], 'top');
        const parsed = urlQueryParse(built.url);
        expect(parsed.ok).toBe(true);
        expect(parsed.base).toBe('https://api.example.com/v1');
        expect(parsed.params).toEqual([
            { k: 'q', v: 'a b' },
            { k: 'n', v: '2' },
        ]);
        expect(parsed.hash).toBe('top');
    });
});

describe('urlQueryParseParamsText / ToText', () => {
    test('文本互转', () => {
        const params = urlQueryParseParamsText('a=1\nb=2\n#comment\nc');
        expect(params).toEqual([
            { k: 'a', v: '1' },
            { k: 'b', v: '2' },
            { k: 'c', v: '' },
        ]);
        expect(urlQueryParamsToText(params)).toBe('a=1\nb=2\nc=');
    });
});
