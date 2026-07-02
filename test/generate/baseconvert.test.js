const { convertBase } = require('../../js/generate/baseconvert.js');

describe('convertBase - dec ↔ hex', () => {
    test('255 dec → FF hex', () => {
        const r = convertBase('255', 10, 16);
        expect(r.ok).toBe(true);
        expect(r.result).toBe('FF');
        expect(r.dec).toBe(255);
    });
    test('FF hex → 255 dec', () => {
        const r = convertBase('FF', 16, 10);
        expect(r.ok).toBe(true);
        expect(r.result).toBe('255');
        expect(r.dec).toBe(255);
    });
    test('小写 hex 也能解析 + 大写输出', () => {
        const r = convertBase('ff', 16, 16);
        expect(r.ok).toBe(true);
        expect(r.result).toBe('FF');
    });
});

describe('convertBase - dec ↔ bin / oct', () => {
    test('10 dec → 1010 bin', () => {
        const r = convertBase('10', 10, 2);
        expect(r.ok).toBe(true);
        expect(r.result).toBe('1010');
    });
    test('1010 bin → 10 dec', () => {
        const r = convertBase('1010', 2, 10);
        expect(r.ok).toBe(true);
        expect(r.result).toBe('10');
    });
    test('8 dec → 10 oct', () => {
        const r = convertBase('8', 10, 8);
        expect(r.ok).toBe(true);
        expect(r.result).toBe('10');
    });
    test('512 dec → 1000 hex (边界)', () => {
        const r = convertBase('512', 10, 16);
        expect(r.result).toBe('200');
    });
});

describe('convertBase - 自定义进制 (2-36)', () => {
    test('base 36: z → 35 dec', () => {
        const r = convertBase('z', 36, 10);
        expect(r.ok).toBe(true);
        expect(r.dec).toBe(35);
    });
    test('base 36: 35 dec → Z', () => {
        const r = convertBase('35', 10, 36);
        expect(r.result).toBe('Z');
    });
    test('base 7 进制 7 → 10', () => {
        const r = convertBase('7', 10, 7);
        expect(r.result).toBe('10');
    });
});

describe('convertBase - 边界值', () => {
    test('0 → 0 (所有进制)', () => {
        expect(convertBase('0', 10, 16).result).toBe('0');
        expect(convertBase('0', 10, 2).result).toBe('0');
        expect(convertBase('0', 16, 2).result).toBe('0');
    });
    test('极大数 (Number.MAX_SAFE_INTEGER)', () => {
        const big = Number.MAX_SAFE_INTEGER.toString();
        const r = convertBase(big, 10, 16);
        expect(r.ok).toBe(true);
        // parseInt 自身只支持到 MAX_SAFE_INTEGER，结果可逆
        expect(parseInt(r.result, 16)).toBe(Number.MAX_SAFE_INTEGER);
    });
    test('负数 -1 → "-1" (大写不影响负号)', () => {
        const r = convertBase('-1', 10, 16);
        expect(r.ok).toBe(true);
        expect(r.result).toBe('-1');
        expect(r.dec).toBe(-1);
    });
    test('前后空格自动 trim', () => {
        const r = convertBase('  ff  ', 16, 10);
        expect(r.ok).toBe(true);
        expect(r.result).toBe('255');
    });
});

describe('convertBase - 错误处理', () => {
    test('空输入', () => {
        const r = convertBase('', 10, 16);
        expect(r.ok).toBe(false);
        expect(r.msg).toMatch(/请输入/);
    });
    test('纯空格', () => {
        const r = convertBase('   ', 10, 16);
        expect(r.ok).toBe(false);
    });
    test('非数字字符', () => {
        const r = convertBase('xyz', 10, 16);
        expect(r.ok).toBe(false);
        expect(r.msg).toMatch(/无效/);
    });
    test('进制非法字符 (进制 2 下出现 "2")', () => {
        const r = convertBase('2', 2, 10);
        expect(r.ok).toBe(false);
        expect(r.msg).toMatch(/无效/);
    });
});

describe('convertBase - 多次调用一致性', () => {
    test('相同输入反复调用结果一致', () => {
        const inputs = ['ff', '1010', 'zz', '0', '255'];
        const first = inputs.map((v) => convertBase(v, v.length > 1 && /^[01]+$/.test(v) ? 2 : 10, 10));
        const second = inputs.map((v) => convertBase(v, v.length > 1 && /^[01]+$/.test(v) ? 2 : 10, 10));
        expect(second).toEqual(first);
    });
    test('可逆性 (任意 N 进制 → 10 → 原进制)', () => {
        const samples = [
            { val: '255', from: 10, to: 16 },
            { val: 'ff', from: 16, to: 10 },
            { val: '100', from: 10, to: 2 },
            { val: 'z', from: 36, to: 10 },
        ];
        samples.forEach((s) => {
            const dec = convertBase(s.val, s.from, 10);
            expect(dec.ok).toBe(true);
            const back = convertBase(dec.result, 10, s.from);
            expect(back.result.toUpperCase()).toBe(s.val.toUpperCase());
        });
    });
});
