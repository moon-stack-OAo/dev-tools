const {
    jsonFlatten,
    jsonUnflatten,
    jfParsePath,
    jfMaybeToArray,
} = require('../../js/format/jsonflat.js');

describe('jsonFlatten', () => {
    test('嵌套对象扁平化（bracket）', () => {
        const r = jsonFlatten({ a: { b: 1 }, c: [2, 3] });
        expect(r.ok).toBe(true);
        const obj = JSON.parse(r.result);
        expect(obj['a.b']).toBe(1);
        expect(obj['c[0]']).toBe(2);
        expect(obj['c[1]']).toBe(3);
    });

    test('数组 dot 风格', () => {
        const r = jsonFlatten({ tags: ['x', 'y'] }, { arrayStyle: 'dot' });
        expect(r.ok).toBe(true);
        const obj = JSON.parse(r.result);
        expect(obj['tags.0']).toBe('x');
        expect(obj['tags.1']).toBe('y');
    });

    test('空对象作为叶子', () => {
        const r = jsonFlatten({ empty: {} });
        expect(r.ok).toBe(true);
        const obj = JSON.parse(r.result);
        expect(obj.empty).toEqual({});
    });

    test('空数组作为叶子', () => {
        const r = jsonFlatten({ arr: [] });
        expect(r.ok).toBe(true);
        const obj = JSON.parse(r.result);
        expect(obj.arr).toEqual([]);
    });

    test('原始值', () => {
        const r = jsonFlatten(42);
        expect(r.ok).toBe(true);
        expect(JSON.parse(r.result)).toEqual({ '': 42 });
    });

    test('非法 JSON', () => {
        const r = jsonFlatten('{bad');
        expect(r.ok).toBe(false);
        expect(r.result).toBeNull();
        expect(r.msg).toMatch(/解析失败|不能为空/);
    });

    test('空输入', () => {
        expect(jsonFlatten('').ok).toBe(false);
        expect(jsonFlatten(null).ok).toBe(false);
    });

    test('自定义分隔符', () => {
        const r = jsonFlatten({ a: { b: 1 } }, { separator: '/' });
        expect(r.ok).toBe(true);
        expect(JSON.parse(r.result)['a/b']).toBe(1);
    });
});

describe('jsonUnflatten', () => {
    test('bracket 路径反扁平化', () => {
        const flat = { 'a.b': 1, 'c[0]': 2, 'c[1]': 3 };
        const r = jsonUnflatten(flat);
        expect(r.ok).toBe(true);
        expect(JSON.parse(r.result)).toEqual({ a: { b: 1 }, c: [2, 3] });
    });

    test('dot 数组风格反扁平化', () => {
        const flat = { 'tags.0': 'x', 'tags.1': 'y' };
        const r = jsonUnflatten(flat, { arrayStyle: 'dot' });
        expect(r.ok).toBe(true);
        expect(JSON.parse(r.result)).toEqual({ tags: ['x', 'y'] });
    });

    test('非对象输入失败', () => {
        const r = jsonUnflatten([1, 2]);
        expect(r.ok).toBe(false);
        expect(r.msg).toMatch(/扁平对象/);
    });

    test('非法 JSON', () => {
        const r = jsonUnflatten('not-json');
        expect(r.ok).toBe(false);
    });
});

describe('flatten / unflatten 往返', () => {
    test('对象 + bracket 数组', () => {
        const src = {
            user: { name: 'alice', age: 30, tags: ['admin', 'dev'] },
            active: true,
            scores: [95, 88],
        };
        const flat = jsonFlatten(src, { arrayStyle: 'bracket' });
        expect(flat.ok).toBe(true);
        const nested = jsonUnflatten(flat.result, { arrayStyle: 'bracket' });
        expect(nested.ok).toBe(true);
        expect(JSON.parse(nested.result)).toEqual(src);
    });

    test('对象 + dot 数组', () => {
        const src = { items: [{ id: 1 }, { id: 2 }], meta: { ok: true } };
        const flat = jsonFlatten(src, { arrayStyle: 'dot' });
        expect(flat.ok).toBe(true);
        const nested = jsonUnflatten(flat.result, { arrayStyle: 'dot' });
        expect(nested.ok).toBe(true);
        expect(JSON.parse(nested.result)).toEqual(src);
    });
});

describe('jfParsePath', () => {
    test('bracket 路径', () => {
        const t = jfParsePath('a.b[0].c', '.', 'bracket');
        expect(t).toEqual([
            { type: 'key', value: 'a' },
            { type: 'key', value: 'b' },
            { type: 'index', value: 0 },
            { type: 'key', value: 'c' },
        ]);
    });

    test('dot 路径数字下标', () => {
        const t = jfParsePath('a.0.b', '.', 'dot');
        expect(t).toEqual([
            { type: 'key', value: 'a' },
            { type: 'index', value: 0 },
            { type: 'key', value: 'b' },
        ]);
    });
});

describe('jfMaybeToArray', () => {
    test('连续数字键转数组', () => {
        expect(jfMaybeToArray({ 0: 'a', 1: 'b' })).toEqual(['a', 'b']);
    });

    test('非连续键保持对象', () => {
        expect(jfMaybeToArray({ 0: 'a', 2: 'c' })).toEqual({ 0: 'a', 2: 'c' });
    });
});
