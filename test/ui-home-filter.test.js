// 首页卡片可见性：受众与最近/收藏虚拟筛选互斥
const {homeCardShouldShow} = require('../js/ui-home.js');

describe('homeCardShouldShow', () => {
    test('默认首页：业务卡片跟受众，虚拟卡片隐藏', () => {
        expect(
            homeCardShouldShow({
                textMatch: true,
                audienceMatch: true,
                cardCat: 'format',
            }),
        ).toBe(true);
        expect(
            homeCardShouldShow({
                textMatch: true,
                audienceMatch: false,
                cardCat: 'format',
            }),
        ).toBe(false);
        expect(
            homeCardShouldShow({
                textMatch: true,
                audienceMatch: true,
                cardCat: 'recent',
            }),
        ).toBe(false);
        expect(
            homeCardShouldShow({
                textMatch: true,
                audienceMatch: true,
                cardCat: 'favorites',
            }),
        ).toBe(false);
    });

    test('最近使用：忽略受众，只显示 recent 卡片', () => {
        expect(
            homeCardShouldShow({
                textMatch: true,
                audienceMatch: false,
                cardCat: 'recent',
                homeVirtualFilter: 'recent',
            }),
        ).toBe(true);
        expect(
            homeCardShouldShow({
                textMatch: true,
                audienceMatch: true,
                cardCat: 'format',
                homeVirtualFilter: 'recent',
            }),
        ).toBe(false);
        expect(
            homeCardShouldShow({
                textMatch: true,
                audienceMatch: false,
                cardCat: 'favorites',
                homeVirtualFilter: 'recent',
            }),
        ).toBe(false);
    });

    test('收藏：忽略受众，只显示 favorites 卡片', () => {
        expect(
            homeCardShouldShow({
                textMatch: true,
                audienceMatch: false,
                cardCat: 'favorites',
                homeVirtualFilter: 'favorites',
            }),
        ).toBe(true);
        expect(
            homeCardShouldShow({
                textMatch: true,
                audienceMatch: true,
                cardCat: 'recent',
                homeVirtualFilter: 'favorites',
            }),
        ).toBe(false);
    });

    test('业务分类筛选：仅匹配分类', () => {
        expect(
            homeCardShouldShow({
                textMatch: true,
                audienceMatch: false,
                cardCat: 'format',
                homeCatFilter: 'format',
            }),
        ).toBe(false);
        expect(
            homeCardShouldShow({
                textMatch: true,
                audienceMatch: true,
                cardCat: 'format',
                homeCatFilter: 'format',
            }),
        ).toBe(true);
        expect(
            homeCardShouldShow({
                textMatch: true,
                audienceMatch: true,
                cardCat: 'encode',
                homeCatFilter: 'format',
            }),
        ).toBe(false);
    });

    test('搜索文本不匹配则隐藏', () => {
        expect(
            homeCardShouldShow({
                textMatch: false,
                audienceMatch: true,
                cardCat: 'recent',
                homeVirtualFilter: 'recent',
            }),
        ).toBe(false);
    });
});
