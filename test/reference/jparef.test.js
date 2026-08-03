const { JPAREF_DATA, jparefSearch } = require('../../js/reference/jparef.js');

describe('JPAREF_DATA', () => {
    test('包含多个分类与条目', () => {
        expect(JPAREF_DATA.length).toBeGreaterThanOrEqual(4);
        const total = JPAREF_DATA.reduce((n, g) => n + g.items.length, 0);
        expect(total).toBeGreaterThan(10);
    });

    test('条目具备 name/desc', () => {
        JPAREF_DATA.forEach((g) => {
            g.items.forEach((i) => {
                expect(i.name).toBeTruthy();
                expect(i.desc).toBeTruthy();
            });
        });
    });
});

describe('jparefSearch', () => {
    test('空关键词返回全部分组', () => {
        const r = jparefSearch(JPAREF_DATA, '');
        expect(r.length).toBe(JPAREF_DATA.length);
        expect(r[0].items.length).toBe(JPAREF_DATA[0].items.length);
    });

    test('命中注解名', () => {
        const r = jparefSearch(JPAREF_DATA, '@Entity');
        expect(r.length).toBeGreaterThan(0);
        const names = r.flatMap((g) => g.items.map((i) => i.name));
        expect(names.some((n) => n.includes('@Entity'))).toBe(true);
    });

    test('命中描述关键词', () => {
        const r = jparefSearch(JPAREF_DATA, '乐观锁');
        expect(r.some((g) => g.items.some((i) => /Version|乐观/.test(i.name + i.desc)))).toBe(
            true,
        );
    });

    test('无匹配返回空数组', () => {
        const r = jparefSearch(JPAREF_DATA, 'xyznotexist12345');
        expect(r).toEqual([]);
    });

    test('大小写不敏感', () => {
        const a = jparefSearch(JPAREF_DATA, 'jpql');
        const b = jparefSearch(JPAREF_DATA, 'JPQL');
        expect(a.length).toBe(b.length);
        expect(a.length).toBeGreaterThan(0);
    });
});
