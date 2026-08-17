const {
    cubicbezierSerialize,
    cubicbezierPresets,
    cubicbezierClamp,
    cubicbezierCss,
} = require('../../js/generate/cubicbezier.js');

describe('cubicbezierSerialize', () => {
    test('serialize 格式', () => {
        const s = cubicbezierSerialize({ x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 });
        expect(s).toBe('cubic-bezier(0.25, 0.1, 0.25, 1)');
    });

    test('整数与小数', () => {
        expect(cubicbezierSerialize({ x1: 0, y1: 0, x2: 1, y2: 1 })).toBe('cubic-bezier(0, 0, 1, 1)');
    });
});

describe('cubicbezierPresets', () => {
    test('preset 值', () => {
        expect(cubicbezierPresets.ease).toEqual({ x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 });
        expect(cubicbezierPresets['ease-in']).toEqual({ x1: 0.42, y1: 0, x2: 1, y2: 1 });
        expect(cubicbezierPresets['ease-out']).toEqual({ x1: 0, y1: 0, x2: 0.58, y2: 1 });
        expect(cubicbezierPresets['ease-in-out']).toEqual({ x1: 0.42, y1: 0, x2: 0.58, y2: 1 });
        expect(cubicbezierPresets.linear).toEqual({ x1: 0, y1: 0, x2: 1, y2: 1 });
    });

    test('preset serialize', () => {
        expect(cubicbezierSerialize(cubicbezierPresets.linear)).toBe('cubic-bezier(0, 0, 1, 1)');
        expect(cubicbezierSerialize(cubicbezierPresets.ease)).toBe('cubic-bezier(0.25, 0.1, 0.25, 1)');
    });
});

describe('cubicbezierClamp', () => {
    test('clamp x 到 0~1', () => {
        const c = cubicbezierClamp({ x1: -0.5, y1: -1, x2: 1.5, y2: 2 });
        expect(c.x1).toBe(0);
        expect(c.x2).toBe(1);
        expect(c.y1).toBe(-1);
        expect(c.y2).toBe(2);
    });

    test('缺省回退', () => {
        const c = cubicbezierClamp({});
        expect(c.x1).toBe(0.25);
        expect(c.y1).toBe(0.1);
        expect(c.x2).toBe(0.25);
        expect(c.y2).toBe(1);
    });
});

describe('cubicbezierCss', () => {
    test('transition 示例', () => {
        const css = cubicbezierCss(cubicbezierPresets.ease, '0.3s');
        expect(css).toBe('transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);');
    });
});
