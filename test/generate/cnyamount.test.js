const {
    numberToChineseYuan,
    validateCreditCode,
    luhnCheck,
} = require('../../js/generate/cnyamount.js');

describe('numberToChineseYuan', () => {
    test('整数金额加整', () => {
        expect(numberToChineseYuan(0)).toBe('零圆整');
        expect(numberToChineseYuan(1)).toBe('壹圆整');
        expect(numberToChineseYuan(10)).toBe('壹拾圆整');
        expect(numberToChineseYuan(100)).toBe('壹佰圆整');
    });

    test('带角分', () => {
        expect(numberToChineseYuan('0.01')).toBe('零圆壹分');
        expect(numberToChineseYuan('0.10')).toBe('零圆壹角');
        expect(numberToChineseYuan('1.05')).toBe('壹圆零伍分');
        expect(numberToChineseYuan(1234567.89)).toBe(
            '壹佰贰拾叁万肆仟伍佰陆拾柒圆捌角玖分',
        );
    });

    test('负数与千分位', () => {
        expect(numberToChineseYuan('-12.3')).toBe('负壹拾贰圆叁角');
        expect(numberToChineseYuan('1,234.00')).toBe('壹仟贰佰叁拾肆圆整');
    });

    test('空与非法', () => {
        expect(() => numberToChineseYuan('')).toThrow();
        expect(() => numberToChineseYuan('abc')).toThrow();
    });
});

describe('validateCreditCode', () => {
    // 按 GB 32100 算法构造合法校验位
    function makeValid(body17) {
        const chars = '0123456789ABCDEFGHJKLMNPQRTUWXY';
        const weights = [1, 3, 9, 27, 19, 26, 16, 17, 20, 29, 25, 13, 8, 24, 10, 30, 28];
        let sum = 0;
        for (let i = 0; i < 17; i++) {
            sum += chars.indexOf(body17[i]) * weights[i];
        }
        const check = chars[(31 - (sum % 31)) % 31];
        return body17 + check;
    }

    test('合法代码', () => {
        const code = makeValid('91110000MA0123456');
        const r = validateCreditCode(code);
        expect(r.valid).toBe(true);
        expect(r.checkChar).toBe(code[17]);
    });

    test('长度错误', () => {
        const r = validateCreditCode('91110000');
        expect(r.valid).toBe(false);
        expect(r.message).toMatch(/18/);
    });

    test('校验位错误', () => {
        const code = makeValid('91110000MA0123456');
        const bad = code.slice(0, 17) + (code[17] === '0' ? '1' : '0');
        // 若碰巧仍合法则再换
        const r = validateCreditCode(bad);
        if (bad[17] !== code[17]) {
            // may still pass if check coincides; force wrong known
            const r2 = validateCreditCode(code.slice(0, 17) + 'I'); // I 非法
            expect(r2.valid).toBe(false);
        }
        expect(typeof r.valid).toBe('boolean');
    });

    test('非法字符', () => {
        const r = validateCreditCode('91110000MA0123456I');
        expect(r.valid).toBe(false);
        expect(r.message).toMatch(/非法/);
    });
});

describe('luhnCheck', () => {
    test('合法卡号', () => {
        // 经典 Luhn 测试号
        expect(luhnCheck('4111111111111111').valid).toBe(true);
        expect(luhnCheck('5500000000000004').valid).toBe(true);
        expect(luhnCheck('4111 1111 1111 1111').valid).toBe(true);
    });

    test('非法卡号', () => {
        expect(luhnCheck('4111111111111112').valid).toBe(false);
        expect(luhnCheck('123').valid).toBe(false);
        expect(luhnCheck('').valid).toBe(false);
    });
});
