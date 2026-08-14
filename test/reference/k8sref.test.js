const { K8SREF_DATA, k8srefToGroups } = require('../../js/reference/k8sref.js');

describe('k8sref', () => {
    test('toGroups 返回非空分组', () => {
        const groups = k8srefToGroups();
        expect(groups.length).toBeGreaterThanOrEqual(6);
        groups.forEach((g) => {
            expect(g.cat).toBeTruthy();
            expect(g.items.length).toBeGreaterThanOrEqual(5);
        });
    });

    test('条目 cmd/desc 非空且 cmd 在组内唯一', () => {
        K8SREF_DATA.forEach((g) => {
            const cmds = g.items.map((i) => i.cmd);
            expect(new Set(cmds).size).toBe(cmds.length);
            g.items.forEach((i) => {
                expect(i.cmd).toBeTruthy();
                expect(i.desc).toBeTruthy();
            });
        });
    });
});
