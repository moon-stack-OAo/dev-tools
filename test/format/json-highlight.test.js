const { highlightJson } = require('../../js/format/json.js');

function stripTags(html) {
    return String(html)
        .replace(/<[^>]+>/g, '')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
}

describe('highlightJson', () => {
    test('简单对象：键与值类型 class', () => {
        const src = JSON.stringify({ name: 'test', version: 1 }, null, 2);
        const html = highlightJson(src);
        expect(html).toContain('class="json-key"');
        expect(html).toContain('class="json-string"');
        expect(html).toContain('class="json-number"');
        expect(html).toContain('class="json-punct"');
        expect(stripTags(html)).toBe(src);
    });

    test('嵌套对象与数组', () => {
        const src = JSON.stringify({ a: { b: [1, 2] }, c: 'x' }, null, 2);
        const html = highlightJson(src);
        expect(html).toContain('class="json-key"');
        expect(html).toContain('class="json-number"');
        expect(html).toContain('class="json-string"');
        expect(stripTags(html)).toBe(src);
    });

    test('转义字符串', () => {
        const src = JSON.stringify({ path: 'a\\"b\\n\\t' });
        const html = highlightJson(src);
        expect(html).toContain('class="json-string"');
        expect(stripTags(html)).toBe(src);
    });

    test('true / false / null', () => {
        const src = JSON.stringify({ ok: true, no: false, empty: null });
        const html = highlightJson(src);
        expect(html).toContain('class="json-boolean"');
        expect(html).toContain('class="json-null"');
        expect(html).toMatch(/class="json-boolean">true</);
        expect(html).toMatch(/class="json-boolean">false</);
        expect(html).toMatch(/class="json-null">null</);
        expect(stripTags(html)).toBe(src);
    });

    test('数字（含小数、负数、科学计数）', () => {
        const src = JSON.stringify({ a: -1.5, b: 1e10, c: 0 });
        const html = highlightJson(src);
        expect(html).toContain('class="json-number"');
        expect(stripTags(html)).toBe(src);
    });

    test('XSS：字符串中的 <script> 被转义', () => {
        const src = JSON.stringify({ html: '<script>alert(1)</script>' });
        const html = highlightJson(src);
        expect(html).not.toMatch(/<script>/i);
        expect(html).toContain('&lt;script&gt;');
        expect(html).toContain('&lt;/script&gt;');
        expect(stripTags(html)).toBe(src);
    });

    test('压缩 JSON 也能高亮', () => {
        const src = '{"k":"v","n":2}';
        const html = highlightJson(src);
        expect(html).toContain('class="json-key"');
        expect(html).toContain('class="json-string"');
        expect(html).toContain('class="json-number"');
        expect(stripTags(html)).toBe(src);
    });

    test('空字符串', () => {
        expect(highlightJson('')).toBe('');
        expect(highlightJson(null)).toBe('');
    });

    test('顶层数组', () => {
        const src = JSON.stringify([true, 's', null, 3], null, 2);
        const html = highlightJson(src);
        expect(html).toContain('class="json-boolean"');
        expect(html).toContain('class="json-string"');
        expect(html).toContain('class="json-null"');
        expect(html).toContain('class="json-number"');
        expect(html).not.toContain('class="json-key"');
        expect(stripTags(html)).toBe(src);
    });
});
