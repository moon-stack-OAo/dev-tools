// 侧边栏纯逻辑：虚拟分类判定、展开分类选择、宽度钳制
const {
    isSidebarVirtualCat,
    resolveSidebarExpandCatId,
    clampSidebarWidth,
    SIDEBAR_KEY,
    SIDEBAR_WIDTH_DEFAULT,
    SIDEBAR_WIDTH_MIN,
    SIDEBAR_WIDTH_MAX,
} = require('../js/ui-sidebar.js');

describe('ui-sidebar 纯逻辑', () => {
    describe('isSidebarVirtualCat', () => {
        test('favorites / recent 为虚拟分类', () => {
            expect(isSidebarVirtualCat('favorites')).toBe(true);
            expect(isSidebarVirtualCat('recent')).toBe(true);
        });

        test('真实分类返回 false', () => {
            expect(isSidebarVirtualCat('format')).toBe(false);
            expect(isSidebarVirtualCat('encode')).toBe(false);
            expect(isSidebarVirtualCat('')).toBe(false);
        });
    });

    describe('resolveSidebarExpandCatId', () => {
        test('空列表返回 null', () => {
            expect(resolveSidebarExpandCatId([])).toBe(null);
            expect(resolveSidebarExpandCatId(null)).toBe(null);
            expect(resolveSidebarExpandCatId(undefined)).toBe(null);
        });

        test('仅虚拟分类时不强制展开（返回 null）', () => {
            expect(resolveSidebarExpandCatId(['favorites', 'recent'])).toBe(null);
            expect(resolveSidebarExpandCatId(['recent'])).toBe(null);
        });

        test('真实分类优先于收藏/最近', () => {
            expect(resolveSidebarExpandCatId(['favorites', 'format', 'recent'])).toBe(
                'format',
            );
            expect(resolveSidebarExpandCatId(['recent', 'encode'])).toBe('encode');
        });

        test('多个真实分类时取第一个真实分类', () => {
            expect(resolveSidebarExpandCatId(['favorites', 'format', 'encode'])).toBe(
                'format',
            );
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
});
