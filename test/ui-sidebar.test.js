// 侧边栏纯逻辑：虚拟分类判定与展开分类选择
const {
    isSidebarVirtualCat,
    resolveSidebarExpandCatId,
    SIDEBAR_KEY,
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

    describe('SIDEBAR_KEY', () => {
        test('存储键名稳定', () => {
            expect(SIDEBAR_KEY).toBe('devtools_sidebar');
        });
    });
});
