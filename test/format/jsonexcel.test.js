const {
    flattenObject,
    unflattenObject,
    jsonToCsv,
    csvToJson,
    _parsePath,
    _joinPath,
    _parseCsv,
    _csvEscape,
} = require('../../js/format/jsonexcel.js');

describe('flattenObject', () => {
    test('基本嵌套', () => {
        const out = flattenObject({ a: { b: 1, c: 2 } }, '.', 'index');
        expect(out).toEqual({ 'a.b': 1, 'a.c': 2 });
    });

    test('数组索引风格 a[0].b', () => {
        const out = flattenObject({ a: [{ b: 1 }, { b: 2 }] }, '.', 'index');
        expect(out).toEqual({ 'a[0].b': 1, 'a[1].b': 2 });
    });

    test('点路径风格 a.0.b', () => {
        const out = flattenObject({ a: [{ b: 1 }, { b: 2 }] }, '.', 'dot');
        expect(out).toEqual({ 'a.0.b': 1, 'a.1.b': 2 });
    });

    test('数组内联(inline)风格', () => {
        const out = flattenObject({ a: [1, 2, 3] }, '.', 'inline');
        expect(out).toEqual({ a: '[1,2,3]' });
    });

    test('多层级混合', () => {
        const input = {
            user: {
                name: 'A',
                contacts: [
                    { type: 'email', value: 'a@x' },
                    { type: 'sms', value: '123' },
                ],
            },
            active: true,
        };
        const out = flattenObject(input, '.', 'index');
        expect(out).toEqual({
            'user.name': 'A',
            'user.contacts[0].type': 'email',
            'user.contacts[0].value': 'a@x',
            'user.contacts[1].type': 'sms',
            'user.contacts[1].value': '123',
            active: true,
        });
    });

    test('空对象 / 空数组', () => {
        expect(flattenObject({}, '.', 'index')).toEqual({});
        expect(flattenObject([], '.', 'index')).toEqual({});
    });

    test('null/undefined 顶层保留为值', () => {
        expect(flattenObject(null, '.', 'index')).toEqual({});
        expect(flattenObject(undefined, '.', 'index')).toEqual({});
        expect(flattenObject({ a: null, b: undefined }, '.', 'index')).toEqual({ a: null, b: undefined });
    });

    test('自定义分隔符', () => {
        const out = flattenObject({ a: { b: { c: 1 } } }, '/', 'index');
        expect(out).toEqual({ 'a/b/c': 1 });
    });
});

describe('unflattenObject', () => {
    test('反向基本(点路径)', () => {
        const out = unflattenObject({ 'a.b': 1, 'a.c': 2 }, '.', 'index');
        expect(out).toEqual({ a: { b: 1, c: 2 } });
    });

    test('数组索引还原为数组', () => {
        const out = unflattenObject({ 'a[0].b': 1, 'a[1].b': 2 }, '.', 'index');
        expect(out).toEqual({ a: [{ b: 1 }, { b: 2 }] });
    });

    test('点路径风格还原', () => {
        const out = unflattenObject({ 'a.0.b': 1, 'a.1.b': 2 }, '.', 'dot');
        expect(out).toEqual({ a: [{ b: 1 }, { b: 2 }] });
    });

    test('嵌套数组内的对象', () => {
        const out = unflattenObject(
            {
                'users[0].name': 'A',
                'users[0].tags[0]': 'x',
                'users[1].name': 'B',
            },
            '.',
            'index'
        );
        expect(out).toEqual({
            users: [{ name: 'A', tags: ['x'] }, { name: 'B' }],
        });
    });

    test('空对象', () => {
        expect(unflattenObject({}, '.', 'index')).toEqual({});
    });
});

describe('jsonToCsv', () => {
    test('简单数组默认展平', () => {
        const csv = jsonToCsv('[{"a":1,"b":"x"},{"a":2,"b":"y"}]');
        const lines = csv.split('\n');
        expect(lines[0]).toBe('a,b');
        expect(lines[1]).toBe('1,x');
        expect(lines[2]).toBe('2,y');
    });

    test('嵌套对象展平为点分隔键', () => {
        const csv = jsonToCsv('[{"user":{"name":"A","age":1}}]');
        const lines = csv.split('\n');
        expect(lines[0]).toBe('user.name,user.age');
        expect(lines[1]).toBe('A,1');
    });

    test('自定义分隔符 ;', () => {
        const csv = jsonToCsv('[{"a":1,"b":2}]', { separator: ';' });
        expect(csv.split('\n')[0]).toBe('a;b');
        expect(csv.split('\n')[1]).toBe('1;2');
    });

    test('制表符分隔', () => {
        const csv = jsonToCsv('[{"a":1,"b":2}]', { separator: '\t' });
        expect(csv.split('\n')[0]).toBe('a\tb');
    });

    test('无表头选项', () => {
        const csv = jsonToCsv('[{"a":1,"b":2}]', { header: false });
        expect(csv).toBe('1,2');
    });

    test('数组索引风格 key', () => {
        const csv = jsonToCsv('[{"items":[{"x":1}]}]', { arrayStyle: 'index' });
        const lines = csv.split('\n');
        expect(lines[0]).toBe('items[0].x');
        expect(lines[1]).toBe('1');
    });

    test('空数组返回空字符串', () => {
        expect(jsonToCsv('[]')).toBe('');
    });

    test('非数组抛错', () => {
        expect(() => jsonToCsv('{"a":1}')).toThrow('数组');
    });

    test('接受对象数组输入', () => {
        const csv = jsonToCsv([{ a: 1, b: 'x' }], { header: false });
        expect(csv).toBe('1,x');
    });

    test('数组 inline 风格输出 JSON 字符串(CSV 转义后)', () => {
        const csv = jsonToCsv('[{"tags":["a","b"]}]', { arrayStyle: 'inline' });
        const lines = csv.split('\n');
        expect(lines[0]).toBe('tags');
        // JSON 字符串含逗号与双引号,CSV 必须加引号包裹并双写 "
        expect(lines[1]).toBe('"[""a"",""b""]"');
        // round-trip:CSV 反解析后仍是 JSON 字符串(由调用方按需 JSON.parse)
        const json = JSON.parse(csvToJson(csv));
        expect(json[0].tags).toBe('["a","b"]');
        // 调用方可自行 JSON.parse 还原为数组
        expect(JSON.parse(json[0].tags)).toEqual(['a', 'b']);
    });
});

describe('csvToJson', () => {
    test('标准 CSV 含类型推断', () => {
        const out = JSON.parse(csvToJson('a,b,c\n1,2,true'));
        expect(out).toEqual([{ a: 1, b: 2, c: true }]);
    });

    test('带引号转义(字段含逗号)', () => {
        const out = JSON.parse(csvToJson('name\n"a,b"'));
        expect(out).toEqual([{ name: 'a,b' }]);
    });

    test('反展平:点路径 → 嵌套对象', () => {
        const out = JSON.parse(csvToJson('user.name,user.age\nA,1\nB,2', { unflatten: true }));
        expect(out).toEqual([{ user: { name: 'A', age: 1 } }, { user: { name: 'B', age: 2 } }]);
    });

    test('反展平:数组索引还原为数组', () => {
        const out = JSON.parse(csvToJson('items[0],items[1]\na,b', { unflatten: true }));
        expect(out).toEqual([{ items: ['a', 'b'] }]);
    });

    test('自定义分隔符 ;', () => {
        const out = JSON.parse(csvToJson('a;b\n1;2', { separator: ';' }));
        expect(out).toEqual([{ a: 1, b: 2 }]);
    });

    test('空输入返回空数组', () => {
        expect(csvToJson('')).toBe('[]');
    });

    test('CRLF 行尾', () => {
        const out = JSON.parse(csvToJson('a\r\n1\r\n2'));
        expect(out).toEqual([{ a: 1 }, { a: 2 }]);
    });

    test('字段内换行(引号包裹)', () => {
        const out = JSON.parse(csvToJson('note\n"line1\nline2"'));
        expect(out[0].note).toBe('line1\nline2');
    });
});

describe('_parsePath', () => {
    test('点路径', () => {
        expect(_parsePath('a.b.c', 'index')).toEqual([
            { key: 'a', isIndex: false },
            { key: 'b', isIndex: false },
            { key: 'c', isIndex: false },
        ]);
    });

    test('数组下标', () => {
        expect(_parsePath('a[0].b[2]', 'index')).toEqual([
            { key: 'a', isIndex: false },
            { key: '0', isIndex: true },
            { key: 'b', isIndex: false },
            { key: '2', isIndex: true },
        ]);
    });

    test('dot 风格整数段识别为 index', () => {
        const parts = _parsePath('a.0.b', 'dot');
        expect(parts).toEqual([
            { key: 'a', isIndex: false },
            { key: '0', isIndex: true },
            { key: 'b', isIndex: false },
        ]);
    });
});

describe('_joinPath', () => {
    test('数组 index 风格拼接', () => {
        const parts = [
            { key: 'a', isIndex: false },
            { key: '0', isIndex: true },
            { key: 'b', isIndex: false },
        ];
        expect(_joinPath(parts, '.', 'index')).toBe('a[0].b');
    });

    test('dot 风格拼接', () => {
        const parts = [
            { key: 'a', isIndex: false },
            { key: '0', isIndex: true },
            { key: 'b', isIndex: false },
        ];
        expect(_joinPath(parts, '.', 'dot')).toBe('a.0.b');
    });

    test('特殊 key 自动引号', () => {
        const parts = [
            { key: 'a.b', isIndex: false },
            { key: 'c', isIndex: false },
        ];
        expect(_joinPath(parts, '.', 'index')).toBe('["a.b"].c');
    });
});

describe('_parseCsv', () => {
    test('基本行', () => {
        expect(_parseCsv('a,b,c\n1,2,3', ',')).toEqual([
            ['a', 'b', 'c'],
            ['1', '2', '3'],
        ]);
    });

    test('引号转义', () => {
        expect(_parseCsv('"a,b","c""d"', ',')).toEqual([['a,b', 'c"d']]);
    });

    test('自定义分隔符', () => {
        expect(_parseCsv('a;b\n1;2', ';')).toEqual([
            ['a', 'b'],
            ['1', '2'],
        ]);
    });
});

describe('_csvEscape', () => {
    test('普通字段不加引号', () => {
        expect(_csvEscape('abc', ',')).toBe('abc');
    });

    test('含分隔符加引号', () => {
        expect(_csvEscape('a,b', ',')).toBe('"a,b"');
    });

    test('含引号双重转义', () => {
        expect(_csvEscape('he said "hi"', ',')).toBe('"he said ""hi"""');
    });
});
