// 首页分类懒展开：shouldForceExpandAllHomeCats
const {shouldForceExpandAllHomeCats} = require('../js/ui-home.js');

describe('shouldForceExpandAllHomeCats', () => {
    test('无筛选时不强制全展开', () => {
        expect(
            shouldForceExpandAllHomeCats({q: '', audience: 'all', catFilter: null}),
        ).toBe(false);
        expect(
            shouldForceExpandAllHomeCats({q: '  ', audience: 'all', catFilter: null}),
        ).toBe(false);
    });

    test('搜索关键词强制全展开', () => {
        expect(
            shouldForceExpandAllHomeCats({q: 'json', audience: 'all', catFilter: null}),
        ).toBe(true);
    });

    test('受众非 all 强制全展开', () => {
        expect(
            shouldForceExpandAllHomeCats({q: '', audience: 'frontend', catFilter: null}),
        ).toBe(true);
        expect(
            shouldForceExpandAllHomeCats({q: '', audience: 'java', catFilter: null}),
        ).toBe(true);
    });

    test('分类筛选强制全展开', () => {
        expect(
            shouldForceExpandAllHomeCats({q: '', audience: 'all', catFilter: 'format'}),
        ).toBe(true);
    });
});
