const {
    parseSemver,
    compareSemver,
    sortSemvers,
    satisfiesSemver,
} = require('../../js/generate/semver.js');

describe('parseSemver', () => {
    test('标准版本', () => {
        const p = parseSemver('1.2.3');
        expect(p).toMatchObject({ major: 1, minor: 2, patch: 3 });
        expect(p.prerelease).toEqual([]);
        expect(p.build).toEqual([]);
    });

    test('v 前缀 / pre-release / build', () => {
        const p = parseSemver('v1.2.3-beta.1+build.5');
        expect(p.major).toBe(1);
        expect(p.minor).toBe(2);
        expect(p.patch).toBe(3);
        expect(p.prerelease).toEqual(['beta', '1']);
        expect(p.build).toEqual(['build', '5']);
    });

    test('非法返回 null', () => {
        expect(parseSemver('')).toBeNull();
        expect(parseSemver('1.2')).toBeNull();
        expect(parseSemver('abc')).toBeNull();
        expect(parseSemver(null)).toBeNull();
    });
});

describe('compareSemver', () => {
    test('主次修订号', () => {
        expect(compareSemver('1.2.3', '1.2.3')).toBe(0);
        expect(compareSemver('1.2.3', '1.2.4')).toBe(-1);
        expect(compareSemver('1.10.0', '1.2.0')).toBe(1);
        expect(compareSemver('2.0.0', '1.9.9')).toBe(1);
    });

    test('prerelease 规则', () => {
        expect(compareSemver('1.0.0-alpha', '1.0.0')).toBe(-1);
        expect(compareSemver('1.0.0', '1.0.0-alpha')).toBe(1);
        expect(compareSemver('1.0.0-alpha', '1.0.0-beta')).toBe(-1);
        expect(compareSemver('1.0.0-alpha.1', '1.0.0-alpha.2')).toBe(-1);
        expect(compareSemver('1.0.0-alpha.beta', '1.0.0-beta')).toBe(-1);
    });
});

describe('sortSemvers', () => {
    test('升序', () => {
        const sorted = sortSemvers(['1.10.0', '1.2.3', '2.0.0', '1.0.0']);
        expect(sorted).toEqual(['1.0.0', '1.2.3', '1.10.0', '2.0.0']);
    });

    test('降序', () => {
        const sorted = sortSemvers(['1.0.0', '2.0.0', '1.5.0'], { desc: true });
        expect(sorted).toEqual(['2.0.0', '1.5.0', '1.0.0']);
    });

    test('多行文本', () => {
        const sorted = sortSemvers('2.0.0\n1.0.0\n1.5.0');
        expect(sorted).toEqual(['1.0.0', '1.5.0', '2.0.0']);
    });
});

describe('satisfiesSemver', () => {
    test('精确匹配', () => {
        expect(satisfiesSemver('1.2.3', '1.2.3')).toBe(true);
        expect(satisfiesSemver('1.2.3', '=1.2.3')).toBe(true);
        expect(satisfiesSemver('1.2.4', '1.2.3')).toBe(false);
    });

    test('比较操作符', () => {
        expect(satisfiesSemver('1.2.3', '>=1.0.0')).toBe(true);
        expect(satisfiesSemver('1.2.3', '>1.2.3')).toBe(false);
        expect(satisfiesSemver('1.2.3', '<=1.2.3')).toBe(true);
        expect(satisfiesSemver('1.2.3', '<2.0.0')).toBe(true);
        expect(satisfiesSemver('2.0.0', '<2.0.0')).toBe(false);
    });

    test('组合范围 >=1.0.0 <2.0.0', () => {
        expect(satisfiesSemver('1.5.0', '>=1.0.0 <2.0.0')).toBe(true);
        expect(satisfiesSemver('2.0.0', '>=1.0.0 <2.0.0')).toBe(false);
        expect(satisfiesSemver('0.9.0', '>=1.0.0 <2.0.0')).toBe(false);
    });

    test('^ caret', () => {
        expect(satisfiesSemver('1.2.5', '^1.2.3')).toBe(true);
        expect(satisfiesSemver('1.9.9', '^1.2.3')).toBe(true);
        expect(satisfiesSemver('2.0.0', '^1.2.3')).toBe(false);
        expect(satisfiesSemver('1.2.2', '^1.2.3')).toBe(false);
        expect(satisfiesSemver('0.2.5', '^0.2.3')).toBe(true);
        expect(satisfiesSemver('0.3.0', '^0.2.3')).toBe(false);
    });

    test('~ tilde', () => {
        expect(satisfiesSemver('1.2.5', '~1.2.3')).toBe(true);
        expect(satisfiesSemver('1.3.0', '~1.2.3')).toBe(false);
        expect(satisfiesSemver('1.2.2', '~1.2.3')).toBe(false);
    });

    test('x 通配', () => {
        expect(satisfiesSemver('1.2.0', '1.2.x')).toBe(true);
        expect(satisfiesSemver('1.2.9', '1.2.x')).toBe(true);
        expect(satisfiesSemver('1.3.0', '1.2.x')).toBe(false);
        expect(satisfiesSemver('1.5.0', '1.x')).toBe(true);
        expect(satisfiesSemver('2.0.0', '1.x')).toBe(false);
    });

    test('|| OR', () => {
        expect(satisfiesSemver('1.0.0', '^1.0.0 || ^2.0.0')).toBe(true);
        expect(satisfiesSemver('2.1.0', '^1.0.0 || ^2.0.0')).toBe(true);
        expect(satisfiesSemver('3.0.0', '^1.0.0 || ^2.0.0')).toBe(false);
    });
});
