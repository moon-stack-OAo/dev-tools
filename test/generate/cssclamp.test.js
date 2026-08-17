const { cssclampCompute, cssclampFormatNum, cssclampFontAt } = require('../../js/generate/cssclamp.js');

describe('cssclampCompute', () => {
    test('已知数值 slope 与 clamp', () => {
        // min 16 @ 320, max 32 @ 1280
        // slope = (32-16)/(1280-320) = 16/960 = 1/60
        // yIntercept = 16 - (1/60)*320 = 16 - 5.333... = 10.666...
        const r = cssclampCompute(16, 32, 320, 1280);
        expect(r.ok).toBe(true);
        expect(r.slope).toBeCloseTo(16 / 960, 10);
        expect(r.yIntercept).toBeCloseTo(16 - (16 / 960) * 320, 10);
        expect(r.preferred).toMatch(/^calc\(/);
        expect(r.preferred).toMatch(/vw\)/);
        expect(r.clamp).toMatch(/^font-size:\s*clamp\(/);
        expect(r.clamp).toMatch(/16px/);
        expect(r.clamp).toMatch(/32px/);
        expect(r.clamp).toMatch(/calc\(/);
    });

    test('端点字号', () => {
        const r = cssclampCompute(16, 32, 320, 1280);
        expect(cssclampFontAt(320, r)).toBeCloseTo(16, 6);
        expect(cssclampFontAt(1280, r)).toBeCloseTo(32, 6);
        expect(cssclampFontAt(0, r)).toBe(16);
        expect(cssclampFontAt(9999, r)).toBe(32);
    });

    test('相同字号', () => {
        const r = cssclampCompute(18, 18, 320, 1280);
        expect(r.ok).toBe(true);
        expect(r.slope).toBe(0);
        expect(r.clamp).toMatch(/18px/);
    });

    test('视口相同失败', () => {
        const r = cssclampCompute(16, 32, 800, 800);
        expect(r.ok).toBe(false);
        expect(r.msg).toMatch(/视口/);
    });

    test('非法数值', () => {
        expect(cssclampCompute('', 32, 320, 1280).ok).toBe(false);
        expect(cssclampCompute(0, 32, 320, 1280).ok).toBe(false);
    });
});

describe('cssclampFormatNum', () => {
    test('整数与小数', () => {
        expect(cssclampFormatNum(16)).toBe('16');
        expect(cssclampFormatNum(10.6666, 4)).toMatch(/^10\.66/);
    });
});
