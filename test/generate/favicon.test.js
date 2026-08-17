const { faviconSizes, faviconBuildHtmlLinks } = require('../../js/generate/favicon.js');

describe('faviconSizes', () => {
    test('含常用尺寸', () => {
        expect(faviconSizes).toEqual(expect.arrayContaining([16, 32, 48, 180, 192, 512]));
        expect(faviconSizes.length).toBeGreaterThanOrEqual(6);
    });

    test('均为正整数且升序', () => {
        faviconSizes.forEach((n) => {
            expect(Number.isInteger(n)).toBe(true);
            expect(n).toBeGreaterThan(0);
        });
        const sorted = faviconSizes.slice().sort((a, b) => a - b);
        expect(faviconSizes).toEqual(sorted);
    });
});

describe('faviconBuildHtmlLinks', () => {
    test('生成 icon link', () => {
        const html = faviconBuildHtmlLinks({
            16: 'favicon-16x16.png',
            32: 'favicon-32x32.png',
            180: 'apple-touch-icon.png',
        });
        expect(html).toMatch(/rel="icon"/);
        expect(html).toMatch(/sizes="16x16"/);
        expect(html).toMatch(/sizes="32x32"/);
        expect(html).toMatch(/apple-touch-icon/);
        expect(html).toMatch(/favicon-16x16\.png/);
    });

    test('默认文件名', () => {
        const html = faviconBuildHtmlLinks({ 192: undefined });
        expect(html).toMatch(/favicon-192x192\.png/);
        expect(html).toMatch(/type="image\/png"/);
    });

    test('空 map 用默认尺寸列表', () => {
        const html = faviconBuildHtmlLinks({});
        expect(html).toMatch(/16x16/);
        expect(html.split('\n').length).toBeGreaterThanOrEqual(faviconSizes.length);
    });
});
