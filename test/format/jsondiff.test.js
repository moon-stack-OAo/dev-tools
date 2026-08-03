const { jsonDiffCompare, jdDeepEqual, jdTypeOf } = require('../../js/format/jsondiff.js');

describe('jsonDiffCompare 相同', () => {
    test('完全相同对象', () => {
        const r = jsonDiffCompare({ a: 1, b: [2, 3] }, { a: 1, b: [2, 3] });
        expect(r.ok).toBe(true);
        expect(r.diffs).toHaveLength(0);
        expect(r.summary.total).toBe(0);
        expect(r.text).toMatch(/无差异|完全一致/);
    });

    test('相同 JSON 字符串', () => {
        const r = jsonDiffCompare('{"x":true}', '{"x":true}');
        expect(r.ok).toBe(true);
        expect(r.diffs).toHaveLength(0);
    });
});

describe('jsonDiffCompare 增删改', () => {
    test('新增字段', () => {
        const r = jsonDiffCompare({ a: 1 }, { a: 1, b: 2 });
        expect(r.ok).toBe(true);
        expect(r.diffs).toHaveLength(1);
        expect(r.diffs[0]).toMatchObject({ path: '$.b', type: 'added', right: 2 });
        expect(r.summary.added).toBe(1);
    });

    test('删除字段', () => {
        const r = jsonDiffCompare({ a: 1, b: 2 }, { a: 1 });
        expect(r.ok).toBe(true);
        expect(r.diffs).toHaveLength(1);
        expect(r.diffs[0]).toMatchObject({ path: '$.b', type: 'removed', left: 2 });
        expect(r.summary.removed).toBe(1);
    });

    test('修改值', () => {
        const r = jsonDiffCompare({ a: 1 }, { a: 2 });
        expect(r.ok).toBe(true);
        expect(r.diffs).toHaveLength(1);
        expect(r.diffs[0]).toMatchObject({
            path: '$.a',
            type: 'changed',
            left: 1,
            right: 2,
        });
        expect(r.summary.changed).toBe(1);
    });

    test('嵌套路径', () => {
        const r = jsonDiffCompare(
            { user: { name: 'alice', age: 30 } },
            { user: { name: 'bob', age: 30 } },
        );
        expect(r.ok).toBe(true);
        expect(r.diffs).toHaveLength(1);
        expect(r.diffs[0].path).toBe('$.user.name');
        expect(r.diffs[0].type).toBe('changed');
    });

    test('数组按索引对比', () => {
        const r = jsonDiffCompare({ tags: ['a', 'b'] }, { tags: ['a', 'c'] });
        expect(r.ok).toBe(true);
        expect(r.diffs.some((d) => d.path === '$.tags[1]' && d.type === 'changed')).toBe(true);
    });

    test('数组长度变化', () => {
        const r = jsonDiffCompare([1, 2], [1, 2, 3]);
        expect(r.ok).toBe(true);
        expect(r.diffs.some((d) => d.path === '$[2]' && d.type === 'added')).toBe(true);
    });
});

describe('jsonDiffCompare 类型变化', () => {
    test('number → string', () => {
        const r = jsonDiffCompare({ n: 1 }, { n: '1' });
        expect(r.ok).toBe(true);
        expect(r.diffs).toHaveLength(1);
        expect(r.diffs[0].type).toBe('type_changed');
        expect(r.diffs[0].path).toBe('$.n');
        expect(r.summary.type_changed).toBe(1);
    });

    test('object → array', () => {
        const r = jsonDiffCompare({ a: {} }, { a: [] });
        expect(r.ok).toBe(true);
        expect(r.diffs[0].type).toBe('type_changed');
    });

    test('boolean → string', () => {
        const r = jsonDiffCompare({ active: true }, { active: 'yes' });
        expect(r.ok).toBe(true);
        expect(r.diffs[0].type).toBe('type_changed');
    });
});

describe('jsonDiffCompare 非法 JSON', () => {
    test('左侧非法', () => {
        const r = jsonDiffCompare('{bad', '{}');
        expect(r.ok).toBe(false);
        expect(r.msg).toMatch(/左侧/);
        expect(r.diffs).toHaveLength(0);
    });

    test('右侧非法', () => {
        const r = jsonDiffCompare('{}', '{bad');
        expect(r.ok).toBe(false);
        expect(r.msg).toMatch(/右侧/);
    });

    test('空输入', () => {
        expect(jsonDiffCompare('', '{}').ok).toBe(false);
        expect(jsonDiffCompare('{}', null).ok).toBe(false);
    });
});

describe('ignoreArrayOrder', () => {
    test('顺序不同视为相同', () => {
        const r = jsonDiffCompare([1, 2, 3], [3, 1, 2], { ignoreArrayOrder: true });
        expect(r.ok).toBe(true);
        expect(r.diffs).toHaveLength(0);
    });

    test('多重集差异', () => {
        const r = jsonDiffCompare([1, 1, 2], [1, 2, 2], { ignoreArrayOrder: true });
        expect(r.ok).toBe(true);
        expect(r.summary.total).toBeGreaterThan(0);
    });
});

describe('报告文本', () => {
    test('中文标签', () => {
        const r = jsonDiffCompare({ a: 1 }, { a: 2, b: 3 });
        expect(r.ok).toBe(true);
        expect(r.text).toMatch(/修改|新增/);
        expect(r.text).toMatch(/\$\.a|\$\.b/);
    });
});

describe('辅助函数', () => {
    test('jdTypeOf', () => {
        expect(jdTypeOf(null)).toBe('null');
        expect(jdTypeOf([])).toBe('array');
        expect(jdTypeOf({})).toBe('object');
        expect(jdTypeOf(1)).toBe('number');
    });

    test('jdDeepEqual', () => {
        expect(jdDeepEqual({ a: [1] }, { a: [1] })).toBe(true);
        expect(jdDeepEqual({ a: 1 }, { a: 2 })).toBe(false);
    });
});
