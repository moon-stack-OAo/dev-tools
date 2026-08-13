// 命令面板纯函数：空查询 / 匹配 / 受众 / 限流 / 无效 shortcut
const {buildCommandPaletteResults, HOME_SCENE_SHORTCUTS} = require('../js/ui-home.js');

function makeTool(id, name, cat, tags, desc) {
    return {
        id: id,
        name: name,
        cat: cat || 'format',
        tags: tags || ['common'],
        desc: desc || name + ' 描述',
        icon: 'bi-box',
    };
}

const sampleTools = [
    makeTool('json', 'JSON 格式化', 'format', ['common', 'frontend', 'backend']),
    makeTool('jwt', 'JWT 解码', 'security', ['common', 'backend']),
    makeTool('ts', '时间戳', 'generate', ['common']),
    makeTool('base64', 'Base64', 'encode', ['common']),
    makeTool('cron', 'Cron 表达式', 'debug', ['common', 'backend']),
    makeTool('uuid', 'UUID', 'generate', ['common']),
    makeTool('jparef', 'JPA 速查', 'reference', ['java']),
    makeTool('xml', 'XML 格式化', 'format', ['common']),
];

const sampleCats = [
    {id: 'favorites', name: '收藏', icon: 'bi-star', virtual: true},
    {id: 'recent', name: '最近使用', icon: 'bi-clock', virtual: true},
    {id: 'format', name: '格式化', icon: 'bi-code', virtual: false},
    {id: 'encode', name: '编解码', icon: 'bi-arrow', virtual: false},
    {id: 'security', name: '安全', icon: 'bi-shield', virtual: false},
];

// 与 registry 一致的简化受众匹配（ui-home 在浏览器里用全局 toolMatchesAudience）
global.toolMatchesAudience = function (tool, audience) {
    if (!audience || audience === 'all') return true;
    const tags = (tool && tool.tags) || [];
    if (!tags.length) return audience === 'common';
    if (audience === 'java') return tags.indexOf('java') !== -1;
    if (audience === 'frontend') return tags.indexOf('frontend') !== -1;
    if (audience === 'backend') return tags.indexOf('backend') !== -1;
    if (audience === 'common') return tags.indexOf('common') !== -1;
    return true;
};

describe('buildCommandPaletteResults', () => {
    test('HOME_SCENE_SHORTCUTS 常量包含 6 个场景', () => {
        expect(HOME_SCENE_SHORTCUTS).toHaveLength(6);
        expect(HOME_SCENE_SHORTCUTS.map((s) => s.toolId)).toEqual([
            'json',
            'jwt',
            'ts',
            'base64',
            'cron',
            'uuid',
        ]);
    });

    test('空 query：最近 → 常用 → 场景', () => {
        const result = buildCommandPaletteResults({
            q: '',
            tools: sampleTools,
            categories: sampleCats,
            recent: [
                {id: 'jwt', tool: sampleTools.find((t) => t.id === 'jwt')},
                {id: 'json', tool: sampleTools.find((t) => t.id === 'json')},
            ],
            usageStats: {jwt: 5, xml: 10, uuid: 3},
            audience: 'all',
            shortcuts: HOME_SCENE_SHORTCUTS,
        });
        expect(result.groups.map((g) => g.type)).toEqual(['recent', 'usage', 'scene']);
        expect(result.groups[0].items.map((i) => i.id)).toEqual(['jwt', 'json']);
        // 常用排除已在 recent 的 jwt
        expect(result.groups[1].items.map((i) => i.id)).toEqual(['xml', 'uuid']);
        expect(result.groups[2].items.every((i) => i.kind === 'shortcut')).toBe(true);
        expect(result.flat.length).toBeGreaterThan(0);
    });

    test('有 query：工具 + 分类匹配', () => {
        const result = buildCommandPaletteResults({
            q: 'json',
            tools: sampleTools,
            categories: sampleCats,
            recent: [],
            usageStats: {},
            audience: 'all',
        });
        const toolGroup = result.groups.find((g) => g.type === 'tools');
        expect(toolGroup).toBeTruthy();
        expect(toolGroup.items.some((i) => i.id === 'json')).toBe(true);
        expect(toolGroup.items.every((i) => i.kind === 'tool')).toBe(true);
    });

    test('分类名匹配（排除 virtual）', () => {
        const result = buildCommandPaletteResults({
            q: '格式',
            tools: sampleTools,
            categories: sampleCats,
            recent: [],
            usageStats: {},
            audience: 'all',
        });
        const catGroup = result.groups.find((g) => g.type === 'categories');
        expect(catGroup).toBeTruthy();
        expect(catGroup.items.map((i) => i.id)).toEqual(['format']);
        expect(catGroup.items[0].kind).toBe('category');
    });

    test('受众筛选过滤工具', () => {
        const result = buildCommandPaletteResults({
            q: '',
            tools: sampleTools,
            categories: sampleCats,
            recent: [
                {id: 'jparef', tool: sampleTools.find((t) => t.id === 'jparef')},
                {id: 'json', tool: sampleTools.find((t) => t.id === 'json')},
            ],
            usageStats: {},
            audience: 'java',
            shortcuts: HOME_SCENE_SHORTCUTS,
        });
        const recentGroup = result.groups.find((g) => g.type === 'recent');
        expect(recentGroup.items.map((i) => i.id)).toEqual(['jparef']);
    });

    test('限流：每组不超过 limits', () => {
        const manyTools = [];
        for (let i = 0; i < 20; i++) {
            manyTools.push(makeTool('t' + i, 'Tool ' + i, 'format', ['common']));
        }
        const result = buildCommandPaletteResults({
            q: 'tool',
            tools: manyTools,
            categories: sampleCats,
            recent: [],
            usageStats: {},
            audience: 'all',
            limits: {tools: 5},
        });
        const toolGroup = result.groups.find((g) => g.type === 'tools');
        expect(toolGroup.items).toHaveLength(5);
    });

    test('无效 shortcut toolId 跳过', () => {
        const result = buildCommandPaletteResults({
            q: '',
            tools: sampleTools,
            categories: sampleCats,
            recent: [],
            usageStats: {},
            audience: 'all',
            shortcuts: [
                {id: 'ok', label: 'JSON', toolId: 'json'},
                {id: 'bad', label: '不存在', toolId: 'not-exist-tool'},
            ],
        });
        const scene = result.groups.find((g) => g.type === 'scene');
        expect(scene.items).toHaveLength(1);
        expect(scene.items[0].id).toBe('json');
    });

    test('id 匹配 query', () => {
        const result = buildCommandPaletteResults({
            q: 'jwt',
            tools: sampleTools,
            categories: sampleCats,
            recent: [],
            usageStats: {},
            audience: 'all',
        });
        const toolsGroup = result.groups.find((g) => g.type === 'tools');
        expect(toolsGroup.items.some((i) => i.id === 'jwt')).toBe(true);
    });
});
