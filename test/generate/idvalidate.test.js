const {
    idValidateIdCard,
    idValidateMobile,
    idValidateBankCard,
    idValidateAll,
    idvCalcCheckCode,
} = require('../../js/generate/idvalidate.js');

function makeId18(body17) {
    return body17 + idvCalcCheckCode(body17);
}

describe('idvCalcCheckCode / idValidateIdCard', () => {
    test('合法 18 位', () => {
        // 北京 110101 + 19900307 + 顺序 851
        const id = makeId18('11010119900307851');
        const r = idValidateIdCard(id);
        expect(r.ok).toBe(true);
        expect(r.valid).toBe(true);
        expect(r.info.region).toBe('北京');
        expect(r.info.birth).toBe('1990-03-07');
        expect(r.info.gender).toBe('男'); // 倒数第二位 1 奇数
        expect(r.info.checkCode).toBe(id.charAt(17));
    });

    test('校验位错误', () => {
        const id = makeId18('11010119900307851');
        const bad = id.slice(0, 17) + (id.charAt(17) === '0' ? '1' : '0');
        // 若巧合仍对则强制 X 以外错误
        const r = idValidateIdCard(bad);
        if (bad.charAt(17) !== id.charAt(17)) {
            expect(r.valid).toBe(false);
            expect(r.msg).toMatch(/校验位/);
        }
    });

    test('出生日期无效', () => {
        const id = makeId18('11010119901307851'); // 13 月
        const r = idValidateIdCard(id);
        expect(r.valid).toBe(false);
        expect(r.msg).toMatch(/出生日期|校验位/);
    });

    test('15 位旧证', () => {
        const r = idValidateIdCard('110101900307851');
        expect(r.ok).toBe(true);
        expect(r.valid).toBe(true);
        expect(r.info.length).toBe(15);
        expect(r.info.birth).toBe('1990-03-07');
    });

    test('空与格式错误', () => {
        expect(idValidateIdCard('').ok).toBe(false);
        expect(idValidateIdCard('123').valid).toBe(false);
        expect(idValidateIdCard('abcdefghijklmnopqr').valid).toBe(false);
    });

    test('女性顺序码', () => {
        const id = makeId18('11010119900307852'); // 2 偶
        const r = idValidateIdCard(id);
        expect(r.valid).toBe(true);
        expect(r.info.gender).toBe('女');
    });
});

describe('idValidateMobile', () => {
    test('移动号段', () => {
        const r = idValidateMobile('13800138000');
        expect(r.valid).toBe(true);
        expect(r.carrier).toBe('移动');
    });

    test('联通 / 电信', () => {
        expect(idValidateMobile('13012345678').carrier).toBe('联通');
        expect(idValidateMobile('13312345678').carrier).toBe('电信');
    });

    test('+86 与空格', () => {
        expect(idValidateMobile('+86 138-0013-8000').valid).toBe(true);
    });

    test('非法', () => {
        expect(idValidateMobile('').ok).toBe(false);
        expect(idValidateMobile('12345').valid).toBe(false);
        expect(idValidateMobile('23800138000').valid).toBe(false);
    });
});

describe('idValidateBankCard', () => {
    test('Luhn 合法', () => {
        expect(idValidateBankCard('4111111111111111').valid).toBe(true);
        expect(idValidateBankCard('5500000000000004').valid).toBe(true);
        expect(idValidateBankCard('4111 1111 1111 1111').valid).toBe(true);
    });

    test('Luhn 非法', () => {
        expect(idValidateBankCard('4111111111111112').valid).toBe(false);
        expect(idValidateBankCard('123').valid).toBe(false);
        expect(idValidateBankCard('').ok).toBe(false);
    });
});

describe('idValidateAll', () => {
    test('auto 身份证', () => {
        const id = makeId18('11010119900307851');
        const r = idValidateAll(id, 'auto');
        expect(r.type).toBe('idcard');
        expect(r.valid).toBe(true);
    });

    test('auto 手机', () => {
        const r = idValidateAll('13800138000', 'auto');
        expect(r.type).toBe('mobile');
        expect(r.valid).toBe(true);
    });

    test('auto 银行卡', () => {
        const r = idValidateAll('4111111111111111', 'auto');
        expect(r.type).toBe('bank');
        expect(r.valid).toBe(true);
    });

    test('指定 type', () => {
        const r = idValidateAll('13800138000', 'mobile');
        expect(r.type).toBe('mobile');
        expect(r.carrier).toBe('移动');
    });

    test('空与未知', () => {
        expect(idValidateAll('').ok).toBe(false);
        expect(idValidateAll('abc', 'auto').valid).toBe(false);
    });
});
