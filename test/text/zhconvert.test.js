const { s2t, t2s, convertZh, ZHC_S2T, ZHC_T2S } = require('../../js/text/zhconvert.js');

describe('zhconvert 字表', () => {
    test('字表非空且双向基本一致', () => {
        expect(Object.keys(ZHC_S2T).length).toBeGreaterThan(500);
        expect(Object.keys(ZHC_T2S).length).toBeGreaterThan(500);
    });
});

describe('s2t / t2s', () => {
    test('空与 null', () => {
        expect(s2t('')).toBe('');
        expect(s2t(null)).toBe('');
        expect(t2s('')).toBe('');
    });

    test('中国 / 台湾 等', () => {
        expect(s2t('中国')).toBe('中國');
        expect(t2s('中國')).toBe('中国');
        expect(s2t('台湾')).toBe('台灣');
        expect(t2s('台灣')).toBe('台湾');
        expect(s2t('网络')).toBe('網絡');
    });

    test('发 / 門 / 门', () => {
        expect(s2t('发')).toBe('發');
        expect(t2s('發')).toBe('发');
        expect(s2t('门')).toBe('門');
        expect(t2s('門')).toBe('门');
    });

    test('混合英文数字不变', () => {
        const src = 'Hello 世界 123';
        const trad = s2t(src);
        expect(trad).toContain('Hello');
        expect(trad).toContain('123');
        expect(trad).toContain('界');
        expect(t2s(trad)).toBe(src);
    });

    test('convertZh 分发', () => {
        expect(convertZh('网络', 's2t')).toBe('網絡');
        expect(convertZh('網絡', 't2s')).toBe('网络');
    });
});
