const { calcCvss31, parseCvss31Vector, cvssRoundUp1, cvss31Severity } = require('../../js/security/cvss.js');

describe('cvssRoundUp1', () => {
    test('已知舍入', () => {
        expect(cvssRoundUp1(8.22 * 0.85 * 0.77 * 0.85 * 0.85)).toBeCloseTo(3.9, 1);
    });
});

describe('calcCvss31 已知向量', () => {
    test('AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H → 9.8 Critical', () => {
        const r = calcCvss31({
            AV: 'N',
            AC: 'L',
            PR: 'N',
            UI: 'N',
            S: 'U',
            C: 'H',
            I: 'H',
            A: 'H',
        });
        expect(r.baseScore).toBe(9.8);
        expect(r.severity).toBe('Critical');
        expect(r.vector).toBe('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H');
    });

    test('从向量字符串解析并计算', () => {
        const r = calcCvss31('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H');
        expect(r.baseScore).toBe(9.8);
    });

    test('全 None → 0.0', () => {
        const r = calcCvss31({
            AV: 'N',
            AC: 'L',
            PR: 'N',
            UI: 'N',
            S: 'U',
            C: 'N',
            I: 'N',
            A: 'N',
        });
        expect(r.baseScore).toBe(0);
        expect(r.severity).toBe('None');
    });

    test('Scope Changed 示例', () => {
        // 常见：AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H → 10.0
        const r = calcCvss31({
            AV: 'N',
            AC: 'L',
            PR: 'N',
            UI: 'N',
            S: 'C',
            C: 'H',
            I: 'H',
            A: 'H',
        });
        expect(r.baseScore).toBe(10);
        expect(r.severity).toBe('Critical');
    });

    test('中等分数示例 AV:L/AC:L/PR:N/UI:R/S:U/C:H/I:N/A:N', () => {
        // 本地 + 需用户交互 + 仅机密性 High
        const r = calcCvss31({
            AV: 'L',
            AC: 'L',
            PR: 'N',
            UI: 'R',
            S: 'U',
            C: 'H',
            I: 'N',
            A: 'N',
        });
        expect(r.baseScore).toBe(5.5);
        expect(r.severity).toBe('Medium');
    });

    test('High 示例 AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H', () => {
        const r = calcCvss31({
            AV: 'N',
            AC: 'L',
            PR: 'L',
            UI: 'N',
            S: 'U',
            C: 'H',
            I: 'H',
            A: 'H',
        });
        expect(r.baseScore).toBe(8.8);
        expect(r.severity).toBe('High');
    });
});

describe('parseCvss31Vector / severity', () => {
    test('解析指标', () => {
        const m = parseCvss31Vector('CVSS:3.1/AV:A/AC:H/PR:H/UI:R/S:C/C:L/I:L/A:N');
        expect(m.AV).toBe('A');
        expect(m.S).toBe('C');
        expect(m.A).toBe('N');
    });

    test('severity 分档', () => {
        expect(cvss31Severity(0)).toBe('None');
        expect(cvss31Severity(2.1)).toBe('Low');
        expect(cvss31Severity(5)).toBe('Medium');
        expect(cvss31Severity(8)).toBe('High');
        expect(cvss31Severity(9.1)).toBe('Critical');
    });

    test('缺指标抛错', () => {
        expect(() => calcCvss31({ AV: 'N' })).toThrow(/缺少/);
    });
});
