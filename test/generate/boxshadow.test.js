const {
    boxshadowDefaultLayer,
    boxshadowNormalizeLayer,
    boxshadowSerialize,
    boxshadowSerializeLayer,
    boxshadowCss,
    boxshadowParse,
} = require('../../js/generate/boxshadow.js');

describe('boxshadowDefaultLayer', () => {
    test('默认层字段', () => {
        const L = boxshadowDefaultLayer();
        expect(L.offsetX).toBe(0);
        expect(L.offsetY).toBe(4);
        expect(L.blur).toBe(12);
        expect(L.spread).toBe(0);
        expect(L.inset).toBe(false);
        expect(L.color).toBeTruthy();
    });
});

describe('boxshadowSerialize', () => {
    test('单层', () => {
        const s = boxshadowSerialize([
            {
                offsetX: 0,
                offsetY: 4,
                blur: 12,
                spread: 0,
                color: 'rgba(0, 0, 0, 0.15)',
                inset: false,
            },
        ]);
        expect(s).toBe('0px 4px 12px 0px rgba(0, 0, 0, 0.15)');
    });

    test('多层', () => {
        const s = boxshadowSerialize([
            { offsetX: 0, offsetY: 8, blur: 24, spread: -4, color: '#000', inset: false },
            { offsetX: 2, offsetY: 2, blur: 4, spread: 0, color: 'red', inset: false },
        ]);
        expect(s).toBe('0px 8px 24px -4px #000, 2px 2px 4px 0px red');
    });

    test('inset', () => {
        const s = boxshadowSerializeLayer({
            offsetX: 1,
            offsetY: 2,
            blur: 3,
            spread: 4,
            color: '#333',
            inset: true,
        });
        expect(s).toBe('inset 1px 2px 3px 4px #333');
    });

    test('空数组 → none', () => {
        expect(boxshadowSerialize([])).toBe('none');
    });
});

describe('boxshadowCss', () => {
    test('带声明', () => {
        const css = boxshadowCss([
            { offsetX: 0, offsetY: 4, blur: 8, spread: 0, color: 'black', inset: false },
        ]);
        expect(css).toBe('box-shadow: 0px 4px 8px 0px black;');
    });
});

describe('boxshadowParse', () => {
    test('解析单层', () => {
        const layers = boxshadowParse('0px 4px 12px 0px rgba(0, 0, 0, 0.15)');
        expect(layers).toHaveLength(1);
        expect(layers[0].offsetY).toBe(4);
        expect(layers[0].blur).toBe(12);
        expect(layers[0].inset).toBe(false);
        expect(layers[0].color).toMatch(/rgba/);
    });

    test('解析 inset 多层', () => {
        const layers = boxshadowParse(
            'box-shadow: inset 1px 2px 3px 0px #000, 0px 4px 8px 0px red;',
        );
        expect(layers).toHaveLength(2);
        expect(layers[0].inset).toBe(true);
        expect(layers[0].offsetX).toBe(1);
        expect(layers[1].inset).toBe(false);
        expect(layers[1].color).toBe('red');
    });

    test('none / 空', () => {
        expect(boxshadowParse('none')).toEqual([]);
        expect(boxshadowParse('')).toEqual([]);
    });
});

describe('boxshadowNormalizeLayer', () => {
    test('补全默认值', () => {
        const L = boxshadowNormalizeLayer({});
        expect(L.blur).toBe(12);
        expect(L.inset).toBe(false);
    });
});
