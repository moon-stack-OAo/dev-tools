const RefEngine = require('../../js/reference/_ref-engine.js');

const sample = [
    {
        cat: 'A',
        items: [
            { name: '@Entity', desc: '实体类', code: '@Entity class X {}' },
            { name: '@Id', desc: '主键' },
        ],
    },
    {
        cat: 'B',
        items: [{ cmd: 'mvn test', desc: '运行测试' }],
    },
];

describe('RefEngine.filterGroups', () => {
    test('空关键词返回全部', () => {
        const r = RefEngine.filterGroups(sample, '');
        expect(r.length).toBe(2);
        expect(r[0].items.length).toBe(2);
    });

    test('按 name 过滤', () => {
        const r = RefEngine.filterGroups(sample, '@Entity');
        expect(r.length).toBe(1);
        expect(r[0].items[0].name).toBe('@Entity');
    });

    test('按 cmd 过滤', () => {
        const r = RefEngine.filterGroups(sample, 'mvn');
        expect(r.length).toBe(1);
        expect(r[0].items[0].cmd).toBe('mvn test');
    });

    test('无匹配为空', () => {
        expect(RefEngine.filterGroups(sample, 'zzz-no-hit')).toEqual([]);
    });

    test('按 examples / syntax 过滤（gradle 形态）', () => {
        const data = [
            {
                cat: 'Build',
                items: [
                    {
                        cmd: 'gradle build',
                        desc: '构建',
                        syntax: 'gradle build -x test',
                        examples: ['gradle build', 'gradle build -x test'],
                        returns: 'JAR',
                    },
                ],
            },
        ];
        expect(RefEngine.filterGroups(data, '-x test')[0].items[0].cmd).toBe('gradle build');
        expect(RefEngine.filterGroups(data, 'JAR')[0].items[0].cmd).toBe('gradle build');
    });
});
