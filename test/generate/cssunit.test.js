const {
    cssunitToPx,
    cssunitConvert,
    cssunitFormatNumber,
    cssunitDefaultOpts,
    cssunitResultText,
} = require('../../js/generate/cssunit.js');

describe('cssunitDefaultOpts', () => {
    test('默认值', () => {
        const o = cssunitDefaultOpts();
        expect(o.rootFontSize).toBe(16);
        expect(o.emFontSize).toBe(16);
        expect(o.viewportWidth).toBe(1920);
        expect(o.viewportHeight).toBe(1080);
        expect(o.percentRef).toBeNull();
    });
});

describe('cssunitToPx', () => {
    test('16px → 16', () => {
        const r = cssunitToPx(16, 'px');
        expect(r.ok).toBe(true);
        expect(r.px).toBe(16);
    });

    test('1rem (root 16) → 16px', () => {
        const r = cssunitToPx(1, 'rem', { rootFontSize: 16 });
        expect(r.ok).toBe(true);
        expect(r.px).toBe(16);
    });

    test('1em (em 16) → 16px', () => {
        const r = cssunitToPx(1, 'em', { emFontSize: 16 });
        expect(r.ok).toBe(true);
        expect(r.px).toBe(16);
    });

    test('50vw (1920) → 960px', () => {
        const r = cssunitToPx(50, 'vw', { viewportWidth: 1920 });
        expect(r.ok).toBe(true);
        expect(r.px).toBe(960);
    });

    test('50vh (1080) → 540px', () => {
        const r = cssunitToPx(50, 'vh', { viewportHeight: 1080 });
        expect(r.ok).toBe(true);
        expect(r.px).toBe(540);
    });

    test('50% 默认参照 viewportWidth', () => {
        const r = cssunitToPx(50, '%', { viewportWidth: 1920 });
        expect(r.ok).toBe(true);
        expect(r.px).toBe(960);
        expect(r.percentRef).toBe(1920);
    });

    test('空输入', () => {
        const r = cssunitToPx('', 'px');
        expect(r.ok).toBe(false);
        expect(r.msg).toMatch(/请输入/);
    });

    test('未知单位', () => {
        const r = cssunitToPx(1, 'pt');
        expect(r.ok).toBe(false);
        expect(r.msg).toMatch(/未知/);
    });
});

describe('cssunitConvert', () => {
    test('16px → 1rem (root 16)', () => {
        const r = cssunitConvert(16, 'px', { rootFontSize: 16 });
        expect(r.ok).toBe(true);
        expect(r.values.px).toBe(16);
        expect(r.values.rem).toBe(1);
        expect(r.rows.find((x) => x.unit === 'rem').text).toBe('1');
    });

    test('1rem → 16px', () => {
        const r = cssunitConvert(1, 'rem', { rootFontSize: 16 });
        expect(r.ok).toBe(true);
        expect(r.values.px).toBe(16);
        expect(r.rows.find((x) => x.unit === 'px').text).toBe('16');
    });

    test('50vw(1920) → 960px / 50vw', () => {
        const r = cssunitConvert(50, 'vw', { viewportWidth: 1920, viewportHeight: 1080 });
        expect(r.ok).toBe(true);
        expect(r.values.px).toBe(960);
        expect(r.values.vw).toBe(50);
        expect(r.values.vh).toBeCloseTo((960 / 1080) * 100, 10);
    });

    test('rows 含全部单位', () => {
        const r = cssunitConvert(16, 'px');
        expect(r.rows.map((x) => x.unit)).toEqual(['px', 'rem', 'em', 'vw', 'vh', '%']);
    });
});

describe('cssunitFormatNumber', () => {
    test('整数', () => {
        expect(cssunitFormatNumber(16)).toBe('16');
        expect(cssunitFormatNumber(0)).toBe('0');
    });

    test('小数', () => {
        expect(cssunitFormatNumber(1.5)).toBe('1.5');
    });
});

describe('cssunitResultText', () => {
    test('成功含单位行', () => {
        const r = cssunitConvert(16, 'px');
        const text = cssunitResultText(r);
        expect(text).toMatch(/16px/);
        expect(text).toMatch(/1rem/);
    });

    test('失败输出 msg', () => {
        expect(cssunitResultText({ ok: false, msg: '请输入数值' })).toBe('请输入数值');
    });
});
