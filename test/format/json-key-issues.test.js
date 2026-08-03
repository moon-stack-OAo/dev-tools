const {
    highlightJson,
    highlightJsonWithIssues,
    jsonScanKeyIssues,
} = require('../../js/format/json.js');

function stripTags(html) {
    return String(html)
        .replace(/<[^>]+>/g, '')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
}

describe('jsonScanKeyIssues', () => {
    test('合法无问题', () => {
        const r = jsonScanKeyIssues('{"a":1,"b":{"c":2}}');
        expect(r.ok).toBe(true);
        expect(r.issues).toHaveLength(0);
        expect(r.summary).toContain('未发现');
    });

    test('空 key', () => {
        const r = jsonScanKeyIssues('{"":1}');
        expect(r.ok).toBe(true);
        expect(r.issues.length).toBeGreaterThanOrEqual(1);
        expect(r.issues.some((i) => i.type === 'empty_key')).toBe(true);
        expect(r.issues[0].key).toBe('');
        expect(r.issues[0].path).toBe('$');
        expect(r.summary).toContain('空 key');
    });

    test('重复 key', () => {
        const r = jsonScanKeyIssues('{"a":1,"a":2}');
        expect(r.ok).toBe(true);
        const dups = r.issues.filter((i) => i.type === 'duplicate_key');
        expect(dups).toHaveLength(1);
        expect(dups[0].key).toBe('a');
        expect(dups[0].path).toBe('$');
        expect(r.summary).toContain('重复 key');
    });

    test('嵌套：仅同层算重复，不同层同名不算', () => {
        const r = jsonScanKeyIssues('{"a":1,"b":{"a":2}}');
        expect(r.ok).toBe(true);
        expect(r.issues.filter((i) => i.type === 'duplicate_key')).toHaveLength(0);
    });

    test('嵌套同层重复', () => {
        const r = jsonScanKeyIssues('{"b":{"a":1,"a":2}}');
        expect(r.ok).toBe(true);
        const dups = r.issues.filter((i) => i.type === 'duplicate_key');
        expect(dups).toHaveLength(1);
        expect(dups[0].key).toBe('a');
        expect(dups[0].path).toBe('$.b');
    });

    test('数组内对象独立计数', () => {
        const r = jsonScanKeyIssues('[{"a":1},{"a":2}]');
        expect(r.ok).toBe(true);
        expect(r.issues.filter((i) => i.type === 'duplicate_key')).toHaveLength(0);
    });

    test('数组内对象同层重复', () => {
        const r = jsonScanKeyIssues('[{"a":1,"a":9}]');
        expect(r.ok).toBe(true);
        const dups = r.issues.filter((i) => i.type === 'duplicate_key');
        expect(dups).toHaveLength(1);
        expect(dups[0].path).toBe('$[0]');
    });

    test('未引号 key 启发式', () => {
        const r = jsonScanKeyIssues('{a:1}');
        expect(r.ok).toBe(false);
        expect(r.issues.some((i) => i.type === 'unquoted_key' && i.key === 'a')).toBe(true);
        expect(r.summary).toContain('未加双引号');
    });

    test('单引号 key 启发式', () => {
        const r = jsonScanKeyIssues("{'a':1}");
        expect(r.ok).toBe(false);
        expect(r.issues.some((i) => i.type === 'single_quoted_key' && i.key === 'a')).toBe(true);
        expect(r.summary).toContain('单引号');
    });

    test('多次重复 key 检出多次', () => {
        const r = jsonScanKeyIssues('{"x":1,"x":2,"x":3}');
        expect(r.ok).toBe(true);
        expect(r.issues.filter((i) => i.type === 'duplicate_key')).toHaveLength(2);
    });

    test('空输入', () => {
        const r = jsonScanKeyIssues('   ');
        expect(r.ok).toBe(false);
        expect(r.issues).toHaveLength(0);
    });

    test('带空格 pretty JSON 空 key / 重复 key', () => {
        const src = '{\n  "": 1,\n  "a": 1,\n  "a": 2\n}';
        const r = jsonScanKeyIssues(src);
        expect(r.ok).toBe(true);
        expect(r.issues.some((i) => i.type === 'empty_key')).toBe(true);
        expect(r.issues.some((i) => i.type === 'duplicate_key' && i.key === 'a')).toBe(true);
        expect(r.issues.every((i) => i.line != null && i.column != null)).toBe(true);
    });
});

describe('highlightJsonWithIssues', () => {
    test('空 key 使用 json-key-warn', () => {
        const src = '{"":1}';
        const scan = jsonScanKeyIssues(src);
        const html = highlightJsonWithIssues(src, scan.issues);
        expect(html).toContain('class="json-key-warn"');
        expect(stripTags(html)).toBe(src);
    });

    test('重复 key 使用 json-key-warn', () => {
        const src = '{"a":1,"a":2}';
        const scan = jsonScanKeyIssues(src);
        const html = highlightJsonWithIssues(src, scan.issues);
        expect(html).toContain('class="json-key-warn"');
        expect(stripTags(html)).toBe(src);
    });

    test('无 issues 时与 highlightJson 一致', () => {
        const src = '{"a":1}';
        expect(highlightJsonWithIssues(src, [])).toBe(highlightJson(src));
    });
});
