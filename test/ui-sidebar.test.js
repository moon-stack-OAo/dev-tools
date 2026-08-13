// 侧边栏纯逻辑：扁平分类计数、宽度钳制、快捷区
const {
    countSidebarCatTools,
    clampSidebarWidth,
    countSidebarQuickItem,
    resolveSidebarQuickFocusFromAudience,
    SIDEBAR_QUICK_ITEMS,
    SIDEBAR_KEY,
    SIDEBAR_WIDTH_DEFAULT,
    SIDEBAR_WIDTH_MIN,
    SIDEBAR_WIDTH_MAX,
} = require('../js/ui-sidebar.js');

describe('ui-sidebar 纯逻辑', () => {
    describe('countSidebarCatTools', () => {
        test('按 cat 统计工具数', () => {
            global.tools = [
                {id: 'a', cat: 'format'},
                {id: 'b', cat: 'format'},
                {id: 'c', cat: 'encode'},
            ];
            expect(countSidebarCatTools('format')).toBe(2);
            expect(countSidebarCatTools('encode')).toBe(1);
            expect(countSidebarCatTools('debug')).toBe(0);
            expect(countSidebarCatTools('')).toBe(0);
            global.tools = undefined;
        });
    });

    describe('clampSidebarWidth', () => {
        test('默认与边界常量稳定', () => {
            expect(SIDEBAR_WIDTH_DEFAULT).toBe(190);
            expect(SIDEBAR_WIDTH_MIN).toBe(140);
            expect(SIDEBAR_WIDTH_MAX).toBe(360);
        });

        test('合法值原样返回（四舍五入）', () => {
            expect(clampSidebarWidth(190)).toBe(190);
            expect(clampSidebarWidth(200.4)).toBe(200);
            expect(clampSidebarWidth(200.6)).toBe(201);
        });

        test('低于 min / 高于 max 时钳制', () => {
            expect(clampSidebarWidth(0)).toBe(SIDEBAR_WIDTH_MIN);
            expect(clampSidebarWidth(100)).toBe(SIDEBAR_WIDTH_MIN);
            expect(clampSidebarWidth(500)).toBe(SIDEBAR_WIDTH_MAX);
        });

        test('非法值回退默认宽度', () => {
            expect(clampSidebarWidth(NaN)).toBe(SIDEBAR_WIDTH_DEFAULT);
            expect(clampSidebarWidth(undefined)).toBe(SIDEBAR_WIDTH_DEFAULT);
            expect(clampSidebarWidth(null)).toBe(SIDEBAR_WIDTH_DEFAULT);
            expect(clampSidebarWidth('abc')).toBe(SIDEBAR_WIDTH_DEFAULT);
        });
    });

    describe('SIDEBAR_KEY', () => {
        test('存储键名稳定', () => {
            expect(SIDEBAR_KEY).toBe('devtools_sidebar');
        });
    });

    describe('快捷区', () => {
        test('SIDEBAR_QUICK_ITEMS 顺序与 id 稳定', () => {
            expect(SIDEBAR_QUICK_ITEMS.map((x) => x.id)).toEqual([
                'all',
                'recent',
                'favorites',
                'common',
                'frontend',
                'backend',
                'java',
            ]);
        });

        test('resolveSidebarQuickFocusFromAudience', () => {
            expect(resolveSidebarQuickFocusFromAudience('all')).toBe('all');
            expect(resolveSidebarQuickFocusFromAudience('java')).toBe('java');
            expect(resolveSidebarQuickFocusFromAudience('frontend')).toBe('frontend');
            expect(resolveSidebarQuickFocusFromAudience(undefined)).toBe('all');
            expect(resolveSidebarQuickFocusFromAudience('unknown')).toBe('all');
        });

        test('countSidebarQuickItem all 统计 tools 长度', () => {
            global.tools = [{id: 'a'}, {id: 'b'}, {id: 'c'}];
            expect(countSidebarQuickItem({kind: 'all'})).toBe(3);
            global.tools = undefined;
        });

        test('countSidebarQuickItem audience 走 toolMatchesAudience', () => {
            global.tools = [
                {id: '1', tags: ['java']},
                {id: '2', tags: ['common']},
                {id: '3', tags: ['java', 'backend']},
            ];
            global.toolMatchesAudience = (t, a) =>
                a === 'java' ? (t.tags || []).indexOf('java') !== -1 : true;
            expect(
                countSidebarQuickItem({kind: 'audience', audience: 'java'}),
            ).toBe(2);
            global.tools = undefined;
            global.toolMatchesAudience = undefined;
        });
    });
});
