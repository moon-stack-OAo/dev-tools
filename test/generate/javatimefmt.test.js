const {
    javaTimeFmtFormat,
    javaTimeFmtParse,
    javaTimeFmtPatternHelp,
    javaTimeFmtPresets,
    jtfParseDateInput,
} = require('../../js/generate/javatimefmt.js');

describe('jtfParseDateInput', () => {
    test('空用当前时间', () => {
        const r = jtfParseDateInput('');
        expect(r.ok).toBe(true);
        expect(r.date instanceof Date).toBe(true);
    });

    test('yyyy-MM-dd HH:mm:ss', () => {
        const r = jtfParseDateInput('2026-08-03 14:05:09');
        expect(r.ok).toBe(true);
        expect(r.date.getFullYear()).toBe(2026);
        expect(r.date.getMonth()).toBe(7);
        expect(r.date.getDate()).toBe(3);
        expect(r.date.getHours()).toBe(14);
        expect(r.date.getMinutes()).toBe(5);
        expect(r.date.getSeconds()).toBe(9);
    });

    test('非法', () => {
        const r = jtfParseDateInput('not-a-date');
        expect(r.ok).toBe(false);
    });
});

describe('javaTimeFmtFormat', () => {
    const fixed = '2026-08-03 14:05:09';

    test('常用日期时间', () => {
        const r = javaTimeFmtFormat('yyyy-MM-dd HH:mm:ss', fixed);
        expect(r.ok).toBe(true);
        expect(r.result).toBe('2026-08-03 14:05:09');
    });

    test('紧凑与两位年', () => {
        expect(javaTimeFmtFormat('yyyyMMddHHmmss', fixed).result).toBe('20260803140509');
        expect(javaTimeFmtFormat('yy/M/d', fixed).result).toBe('26/8/3');
    });

    test('12 小时与 AM/PM', () => {
        const r = javaTimeFmtFormat('hh:mm a', fixed);
        expect(r.ok).toBe(true);
        expect(r.result).toBe('02:05 PM');
    });

    test('ISO 字面量 T', () => {
        const r = javaTimeFmtFormat("yyyy-MM-dd'T'HH:mm:ss", fixed);
        expect(r.result).toBe('2026-08-03T14:05:09');
    });

    test('毫秒', () => {
        const r = javaTimeFmtFormat('yyyy-MM-dd HH:mm:ss.SSS', '2026-08-03 14:05:09.123');
        expect(r.ok).toBe(true);
        expect(r.result).toMatch(/\.123$/);
    });

    test('空 pattern', () => {
        expect(javaTimeFmtFormat('', fixed).ok).toBe(false);
    });

    test('固定偏移 Z/XXX', () => {
        const r = javaTimeFmtFormat('Z XXX', fixed, { timezoneOffsetMin: 480 });
        expect(r.ok).toBe(true);
        expect(r.result).toContain('+0800');
        expect(r.result).toContain('+08:00');
    });
});

describe('javaTimeFmtParse', () => {
    test('解析常用格式', () => {
        const r = javaTimeFmtParse('yyyy-MM-dd HH:mm:ss', '2026-08-03 14:05:09');
        expect(r.ok).toBe(true);
        expect(r.fields.year).toBe(2026);
        expect(r.fields.month).toBe(8);
        expect(r.fields.day).toBe(3);
        expect(r.fields.hour).toBe(14);
    });

    test('不匹配', () => {
        const r = javaTimeFmtParse('yyyy-MM-dd', '14:05:09');
        expect(r.ok).toBe(false);
    });

    test('空输入', () => {
        expect(javaTimeFmtParse('yyyy', '').ok).toBe(false);
        expect(javaTimeFmtParse('', '2026').ok).toBe(false);
    });
});

describe('javaTimeFmtPatternHelp / presets', () => {
    test('速查非空', () => {
        const h = javaTimeFmtPatternHelp();
        expect(h.length).toBeGreaterThan(5);
        expect(h[0]).toHaveProperty('letter');
    });

    test('预设含常用', () => {
        const p = javaTimeFmtPresets();
        const patterns = p.map((x) => x.pattern);
        expect(patterns).toContain('yyyy-MM-dd');
        expect(patterns).toContain('yyyy-MM-dd HH:mm:ss');
        expect(patterns).toContain('yyyyMMddHHmmss');
    });
});
