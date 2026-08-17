const { specificityCalculate } = require('../../js/debug/specificity.js');

describe('specificityCalculate', () => {
    test('空输入', () => {
        const r = specificityCalculate('');
        expect(r.ok).toBe(false);
        expect(r.msg).toMatch(/选择器/);
    });

    test('#app → 1,0,0', () => {
        const r = specificityCalculate('#app');
        expect(r.ok).toBe(true);
        expect(r.a).toBe(1);
        expect(r.b).toBe(0);
        expect(r.c).toBe(0);
        expect(r.tuple).toBe('1,0,0');
    });

    test('.btn.primary → 0,2,0', () => {
        const r = specificityCalculate('.btn.primary');
        expect(r.ok).toBe(true);
        expect(r.tuple).toBe('0,2,0');
    });

    test('div > p → 0,0,2', () => {
        const r = specificityCalculate('div > p');
        expect(r.ok).toBe(true);
        expect(r.tuple).toBe('0,0,2');
    });

    test('ul#nav li.active → 1,1,2', () => {
        const r = specificityCalculate('ul#nav li.active');
        expect(r.ok).toBe(true);
        expect(r.a).toBe(1);
        expect(r.b).toBe(1);
        expect(r.c).toBe(2);
        expect(r.tuple).toBe('1,1,2');
    });

    test('属性与伪类', () => {
        const r = specificityCalculate('a[href]:hover');
        expect(r.ok).toBe(true);
        expect(r.tuple).toBe('0,2,1');
    });

    test('伪元素 ::before', () => {
        const r = specificityCalculate('p::before');
        expect(r.ok).toBe(true);
        expect(r.tuple).toBe('0,0,2');
    });

    test('* 不计', () => {
        const r = specificityCalculate('* .box');
        expect(r.ok).toBe(true);
        expect(r.tuple).toBe('0,1,0');
    });

    test(':where 不计', () => {
        const r = specificityCalculate(':where(#app) .x');
        expect(r.ok).toBe(true);
        expect(r.tuple).toBe('0,1,0');
    });

    test(':is 取最高', () => {
        const r = specificityCalculate(':is(#a, .b) span');
        expect(r.ok).toBe(true);
        expect(r.tuple).toBe('1,0,1');
    });

    test(':not 计入参数', () => {
        const r = specificityCalculate('div:not(.hidden)');
        expect(r.ok).toBe(true);
        expect(r.tuple).toBe('0,1,1');
    });

    test('多选择器取最高', () => {
        const r = specificityCalculate('.a, #b');
        expect(r.ok).toBe(true);
        expect(r.tuple).toBe('1,0,0');
    });

    test('score 计算', () => {
        const r = specificityCalculate('#id .cls div');
        expect(r.ok).toBe(true);
        expect(r.score).toBe(1 * 10000 + 1 * 100 + 1);
    });
});
