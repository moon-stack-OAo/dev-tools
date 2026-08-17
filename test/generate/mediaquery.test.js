const { mediaqueryPresets, mediaqueryBuild } = require('../../js/generate/mediaquery.js');

describe('mediaqueryPresets', () => {
    test('含常见断点', () => {
        const widths = mediaqueryPresets.map((p) => p.width);
        expect(widths).toEqual(expect.arrayContaining([640, 768, 1024, 1280, 1536]));
        expect(mediaqueryPresets.find((p) => p.id === 'lg').width).toBe(1024);
    });
});

describe('mediaqueryBuild', () => {
    test('min-width 1024', () => {
        const css = mediaqueryBuild({ direction: 'min-width', width: 1024 });
        expect(css).toMatch(/@media\s+\(min-width:\s*1024px\)/);
        expect(css).toMatch(/\{\s*\/\* styles \*\//);
        expect(css.trim().endsWith('}')).toBe(true);
    });

    test('max-width', () => {
        const css = mediaqueryBuild({ direction: 'max-width', width: 767 });
        expect(css).toMatch(/@media\s+\(max-width:\s*767px\)/);
    });

    test('带 orientation', () => {
        const css = mediaqueryBuild({
            direction: 'min-width',
            width: 768,
            orientation: 'landscape',
        });
        expect(css).toMatch(/\(min-width:\s*768px\)/);
        expect(css).toMatch(/\(orientation:\s*landscape\)/);
        expect(css).toMatch(/and/);
    });

    test('自定义 body', () => {
        const css = mediaqueryBuild({
            direction: 'min-width',
            width: 640,
            body: '  .box { display: none; }',
        });
        expect(css).toMatch(/\.box\s*\{\s*display:\s*none/);
    });

    test('默认 min-width 与宽度', () => {
        const css = mediaqueryBuild({});
        expect(css).toMatch(/min-width:\s*768px/);
    });
});
