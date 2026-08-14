const {
    stripJsonc,
    parseJson5ish,
    formatJson5,
    toStrictJson,
    j5StripTrailingCommas,
} = require('../../js/format/json5fmt.js');

describe('stripJsonc', () => {
    test('去掉行注释与块注释', () => {
        const s = stripJsonc('{\n  // a\n  "x": 1, /* b */\n  "y": 2\n}');
        expect(s).not.toMatch(/\/\//);
        expect(s).not.toMatch(/\/\*/);
        expect(s).toContain('"x"');
    });

    test('不破坏字符串内 //', () => {
        const s = stripJsonc('{"url":"http://a.com"}');
        expect(s).toContain('http://a.com');
    });
});

describe('j5StripTrailingCommas', () => {
    test('对象与数组尾逗号', () => {
        expect(j5StripTrailingCommas('{"a":1,}')).toBe('{"a":1}');
        expect(j5StripTrailingCommas('[1,2,]')).toBe('[1,2]');
    });
});

describe('parseJson5ish', () => {
    test('注释 + 尾逗号 + 无引号 key', () => {
        const v = parseJson5ish(`{
  // hi
  name: 'Tool',
  list: [1, 2,],
}`);
        expect(v).toEqual({ name: 'Tool', list: [1, 2] });
    });

    test('空内容抛错', () => {
        expect(() => parseJson5ish('')).toThrow(/空/);
    });

    test('非法 JSON 抛错', () => {
        expect(() => parseJson5ish('{a:}')).toThrow(/解析失败/);
    });
});

describe('formatJson5 / toStrictJson', () => {
    test('格式化缩进', () => {
        const out = formatJson5("{a:1,b:'x',}", 2);
        expect(out).toContain('"a": 1');
        expect(out).toContain('"b": "x"');
    });

    test('压缩标准 JSON', () => {
        expect(toStrictJson('{x:1,}', { pretty: false })).toBe('{"x":1}');
    });
});
