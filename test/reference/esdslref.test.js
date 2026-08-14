const { ESDSLREF_DATA, esdslrefToGroups } = require('../../js/reference/esdslref.js');

describe('esdslref', () => {
    test('toGroups 返回非空分组', () => {
        const groups = esdslrefToGroups();
        expect(groups.length).toBeGreaterThanOrEqual(5);
        groups.forEach((g) => {
            expect(g.cat).toBeTruthy();
            expect(g.items.length).toBeGreaterThanOrEqual(5);
        });
    });

    test('条目 name/desc 非空且 name 在组内唯一', () => {
        ESDSLREF_DATA.forEach((g) => {
            const names = g.items.map((i) => i.name);
            expect(new Set(names).size).toBe(names.length);
            g.items.forEach((i) => {
                expect(i.name).toBeTruthy();
                expect(i.desc).toBeTruthy();
            });
        });
    });
});
