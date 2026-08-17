const {
    gradientDefaultConfig,
    gradientNormalizeConfig,
    gradientSerialize,
    gradientCss,
} = require('../../js/generate/gradient.js');

describe('gradientDefaultConfig', () => {
    test('默认线性两色', () => {
        const c = gradientDefaultConfig();
        expect(c.type).toBe('linear');
        expect(c.angle).toBe(90);
        expect(c.stops).toHaveLength(2);
        expect(c.stops[0].position).toBe(0);
        expect(c.stops[1].position).toBe(100);
    });
});

describe('gradientSerialize', () => {
    test('linear 两色', () => {
        const s = gradientSerialize({
            type: 'linear',
            angle: 90,
            stops: [
                { color: '#ff0000', position: 0 },
                { color: '#0000ff', position: 100 },
            ],
        });
        expect(s).toBe('linear-gradient(90deg, #ff0000 0%, #0000ff 100%)');
    });

    test('角度', () => {
        const s = gradientSerialize({
            type: 'linear',
            angle: 135,
            stops: [
                { color: '#f00', position: 0 },
                { color: '#0f0', position: 100 },
            ],
        });
        expect(s).toMatch(/^linear-gradient\(135deg,/);
    });

    test('色标排序', () => {
        const s = gradientSerialize({
            type: 'linear',
            angle: 0,
            stops: [
                { color: '#00f', position: 100 },
                { color: '#f00', position: 0 },
                { color: '#0f0', position: 50 },
            ],
        });
        expect(s).toBe('linear-gradient(0deg, #f00 0%, #0f0 50%, #00f 100%)');
    });

    test('radial', () => {
        const s = gradientSerialize({
            type: 'radial',
            shape: 'circle',
            position: 'center',
            stops: [
                { color: '#fff', position: 0 },
                { color: '#000', position: 100 },
            ],
        });
        expect(s).toBe('radial-gradient(circle at center, #fff 0%, #000 100%)');
    });
});

describe('gradientCss', () => {
    test('background-image 声明', () => {
        const css = gradientCss({
            type: 'linear',
            angle: 45,
            stops: [
                { color: 'red', position: 0 },
                { color: 'blue', position: 100 },
            ],
        });
        expect(css).toBe('background-image: linear-gradient(45deg, red 0%, blue 100%);');
    });
});

describe('gradientNormalizeConfig', () => {
    test('不足两色补默认', () => {
        const c = gradientNormalizeConfig({ type: 'linear', stops: [{ color: '#000', position: 0 }] });
        expect(c.stops.length).toBeGreaterThanOrEqual(2);
    });

    test('角度归一化到 0-359', () => {
        const c = gradientNormalizeConfig({ type: 'linear', angle: 450, stops: gradientDefaultConfig().stops });
        expect(c.angle).toBe(90);
    });
});
