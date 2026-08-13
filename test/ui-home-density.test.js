// 首页密度模式：normalizeHomeDensity
const {normalizeHomeDensity} = require('../js/ui-home.js');

describe('normalizeHomeDensity', () => {
    test('合法 comfortable / compact 原样返回', () => {
        expect(normalizeHomeDensity('comfortable')).toBe('comfortable');
        expect(normalizeHomeDensity('compact')).toBe('compact');
    });

    test('空 / 非法回落 comfortable', () => {
        expect(normalizeHomeDensity(null)).toBe('comfortable');
        expect(normalizeHomeDensity(undefined)).toBe('comfortable');
        expect(normalizeHomeDensity('')).toBe('comfortable');
        expect(normalizeHomeDensity('dense')).toBe('comfortable');
        expect(normalizeHomeDensity('COMPACT')).toBe('comfortable');
        expect(normalizeHomeDensity(1)).toBe('comfortable');
    });
});
