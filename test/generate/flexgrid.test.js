const {
    flexgridDefaultFlex,
    flexgridDefaultGrid,
    flexgridBuildFlexCss,
    flexgridBuildGridCss,
    flexgridNormalizeFlex,
    flexgridNormalizeGrid,
} = require('../../js/generate/flexgrid.js');

describe('flexgridDefaultFlex', () => {
    test('默认 flex 配置', () => {
        const d = flexgridDefaultFlex();
        expect(d.flexDirection).toBe('row');
        expect(d.flexWrap).toBe('nowrap');
        expect(d.justifyContent).toBe('flex-start');
        expect(d.alignItems).toBe('stretch');
        expect(d.gap).toBe('8px');
        expect(d.itemCount).toBe(4);
    });
});

describe('flexgridBuildFlexCss', () => {
    test('默认 flex 序列化', () => {
        const css = flexgridBuildFlexCss(flexgridDefaultFlex());
        expect(css).toContain('display: flex;');
        expect(css).toContain('flex-direction: row;');
        expect(css).toContain('flex-wrap: nowrap;');
        expect(css).toContain('justify-content: flex-start;');
        expect(css).toContain('align-items: stretch;');
        expect(css).toContain('align-content: stretch;');
        expect(css).toContain('gap: 8px;');
        expect(css).toMatch(/\.container\s*\{/);
    });

    test('自定义 justify / wrap', () => {
        const css = flexgridBuildFlexCss({
            flexDirection: 'column',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            alignContent: 'space-between',
            gap: '12px',
        });
        expect(css).toContain('flex-direction: column;');
        expect(css).toContain('flex-wrap: wrap;');
        expect(css).toContain('justify-content: center;');
        expect(css).toContain('gap: 12px;');
    });
});

describe('flexgridBuildGridCss', () => {
    test('默认 grid columns', () => {
        const css = flexgridBuildGridCss(flexgridDefaultGrid());
        expect(css).toContain('display: grid;');
        expect(css).toContain('grid-template-columns: repeat(3, 1fr);');
        expect(css).toContain('grid-template-rows: auto;');
        expect(css).toContain('gap: 8px;');
        expect(css).toContain('justify-items: stretch;');
        expect(css).toContain('align-items: stretch;');
    });

    test('自定义 columns', () => {
        const css = flexgridBuildGridCss({
            columns: '1fr 2fr 1fr',
            rows: 'repeat(2, 80px)',
            gap: '16px',
            justifyItems: 'center',
            alignItems: 'start',
        });
        expect(css).toContain('grid-template-columns: 1fr 2fr 1fr;');
        expect(css).toContain('grid-template-rows: repeat(2, 80px);');
        expect(css).toContain('justify-items: center;');
        expect(css).toContain('align-items: start;');
    });
});

describe('flexgridNormalize', () => {
    test('非法 direction 回退', () => {
        const o = flexgridNormalizeFlex({ flexDirection: 'bogus', itemCount: 99 });
        expect(o.flexDirection).toBe('row');
        expect(o.itemCount).toBe(24);
    });

    test('grid itemCount 下限', () => {
        const o = flexgridNormalizeGrid({ itemCount: 0, columns: '' });
        expect(o.itemCount).toBe(1);
        expect(o.columns).toBe('repeat(3, 1fr)');
    });
});
