const {
    detectLineEndings,
    convertLineEndings,
    stripBom,
    addBom,
    hasBom,
    findInvisibleChars,
    stripInvisibleChars,
    visualizeInvisibleChars,
    LE_BOM,
} = require('../../js/text/lineending.js');

describe('detectLineEndings', () => {
    test('纯 LF', () => {
        const r = detectLineEndings('a\nb\nc');
        expect(r.lf).toBe(2);
        expect(r.crlf).toBe(0);
        expect(r.cr).toBe(0);
        expect(r.mixed).toBe(false);
        expect(r.dominant).toBe('LF');
    });

    test('纯 CRLF', () => {
        const r = detectLineEndings('a\r\nb\r\n');
        expect(r.crlf).toBe(2);
        expect(r.lf).toBe(0);
        expect(r.cr).toBe(0);
        expect(r.dominant).toBe('CRLF');
    });

    test('纯 CR', () => {
        const r = detectLineEndings('a\rb\r');
        expect(r.cr).toBe(2);
        expect(r.lf).toBe(0);
        expect(r.crlf).toBe(0);
        expect(r.dominant).toBe('CR');
    });

    test('混用', () => {
        const r = detectLineEndings('a\r\nb\nc\r');
        expect(r.crlf).toBe(1);
        expect(r.lf).toBe(1);
        expect(r.cr).toBe(1);
        expect(r.mixed).toBe(true);
    });

    test('空文本', () => {
        const r = detectLineEndings('');
        expect(r.crlf + r.lf + r.cr).toBe(0);
        expect(r.dominant).toBe('none');
    });
});

describe('convertLineEndings', () => {
    test('统一为 LF', () => {
        expect(convertLineEndings('a\r\nb\rc\n', 'LF')).toBe('a\nb\nc\n');
    });
    test('统一为 CRLF', () => {
        expect(convertLineEndings('a\nb\n', 'CRLF')).toBe('a\r\nb\r\n');
    });
    test('统一为 CR', () => {
        expect(convertLineEndings('a\r\nb\n', 'CR')).toBe('a\rb\r');
    });
});

describe('BOM', () => {
    test('hasBom / addBom / stripBom', () => {
        expect(hasBom('hello')).toBe(false);
        const withBom = addBom('hello');
        expect(hasBom(withBom)).toBe(true);
        expect(withBom.charCodeAt(0)).toBe(0xfeff);
        expect(stripBom(withBom)).toBe('hello');
        expect(stripBom('hello')).toBe('hello');
        expect(addBom(withBom)).toBe(withBom);
    });
    test('LE_BOM 常量', () => {
        expect(LE_BOM).toBe('\uFEFF');
    });
});

describe('findInvisibleChars / stripInvisibleChars', () => {
    test('检测 ZWSP NBSP TAB', () => {
        const s = 'a\u200Bb\u00A0c\td';
        const r = findInvisibleChars(s);
        expect(r.count).toBe(3);
        const labels = r.items.map((i) => i.label).sort();
        expect(labels).toEqual(['NBSP', 'TAB', 'ZWSP']);
    });

    test('移除不可见字符，可保留 TAB', () => {
        const s = 'a\u200Bb\u00A0c\td';
        expect(stripInvisibleChars(s)).toBe('abcd');
        expect(stripInvisibleChars(s, { keepTab: true })).toBe('abc\td');
        expect(stripInvisibleChars(s, { keepNbsp: true })).toBe('ab\u00A0cd');
    });

    test('可视化', () => {
        const v = visualizeInvisibleChars('a\u200Bb');
        expect(v).toContain('⟦ZWSP⟧');
        expect(v).toContain('a');
        expect(v).toContain('b');
    });
});
