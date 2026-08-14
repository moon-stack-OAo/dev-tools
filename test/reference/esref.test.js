const { ESREF_DATA, esrefToGroups } = require('../../js/reference/esref.js');

describe('esref', () => {
    test('toGroups 返回非空分组', () => {
        const groups = esrefToGroups();
        expect(groups.length).toBeGreaterThanOrEqual(6);
        groups.forEach((g) => {
            expect(g.cat).toBeTruthy();
            expect(g.items.length).toBeGreaterThanOrEqual(5);
        });
    });

    test('条目 name/desc 非空且 name 在组内唯一', () => {
        ESREF_DATA.forEach((g) => {
            const names = g.items.map((i) => i.name);
            expect(new Set(names).size).toBe(names.length);
            g.items.forEach((i) => {
                expect(i.name).toBeTruthy();
                expect(i.desc).toBeTruthy();
            });
        });
    });
});
