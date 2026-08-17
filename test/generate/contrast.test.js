const {
    contrastParseColor,
    contrastRelativeLuminance,
    contrastRatio,
    contrastWcag,
} = require('../../js/generate/contrast.js');

describe('contrastParseColor', () => {
    test('HEX 6 位', () => {
        expect(contrastParseColor('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
        expect(contrastParseColor('#000000')).toEqual({ r: 0, g: 0, b: 0 });
        expect(contrastParseColor('#777777')).toEqual({ r: 119, g: 119, b: 119 });
    });

    test('HEX 3 位', () => {
        expect(contrastParseColor('#fff')).toEqual({ r: 255, g: 255, b: 255 });
        expect(contrastParseColor('#f00')).toEqual({ r: 255, g: 0, b: 0 });
    });

    test('RGB', () => {
        expect(contrastParseColor('rgb(119, 119, 119)')).toEqual({ r: 119, g: 119, b: 119 });
        expect(contrastParseColor('rgba(0,0,0,0.5)')).toEqual({ r: 0, g: 0, b: 0 });
    });

    test('无效返回 null', () => {
        expect(contrastParseColor('')).toBeNull();
        expect(contrastParseColor('not-a-color')).toBeNull();
        expect(contrastParseColor('#gg0000')).toBeNull();
    });
});

describe('contrastRatio', () => {
    test('黑白对比约 21', () => {
        const r = contrastRatio('#000000', '#ffffff');
        expect(r).toBeCloseTo(21, 0);
        expect(r).toBeGreaterThan(20);
        expect(r).toBeLessThanOrEqual(21);
    });

    test('白底 #777', () => {
        const r = contrastRatio('#777777', '#ffffff');
        expect(r).toBeCloseTo(4.48, 1);
        const wcag = contrastWcag(r);
        expect(wcag.aaLarge).toBe(true);
        expect(wcag.aaNormal).toBe(false);
    });

    test('同色对比为 1', () => {
        expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    });
});

describe('contrastRelativeLuminance', () => {
    test('黑 0 白 1', () => {
        expect(contrastRelativeLuminance(0, 0, 0)).toBeCloseTo(0, 5);
        expect(contrastRelativeLuminance(255, 255, 255)).toBeCloseTo(1, 5);
    });
});

describe('contrastWcag', () => {
    test('阈值', () => {
        expect(contrastWcag(21)).toEqual({
            aaNormal: true,
            aaLarge: true,
            aaaNormal: true,
            aaaLarge: true,
        });
        expect(contrastWcag(4.5)).toEqual({
            aaNormal: true,
            aaLarge: true,
            aaaNormal: false,
            aaaLarge: true,
        });
        expect(contrastWcag(3)).toEqual({
            aaNormal: false,
            aaLarge: true,
            aaaNormal: false,
            aaaLarge: false,
        });
        expect(contrastWcag(2)).toEqual({
            aaNormal: false,
            aaLarge: false,
            aaaNormal: false,
            aaaLarge: false,
        });
    });
});
