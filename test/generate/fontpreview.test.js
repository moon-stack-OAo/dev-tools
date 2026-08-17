const {
    fontpreviewIsSupportedExt,
    fontpreviewSampleTexts,
    FONTPREVIEW_SAMPLE_TEXTS,
    FONTPREVIEW_SUPPORTED_EXT,
} = require('../../js/generate/fontpreview.js');

describe('fontpreviewIsSupportedExt', () => {
    test('支持常见扩展名', () => {
        expect(fontpreviewIsSupportedExt('a.ttf')).toBe(true);
        expect(fontpreviewIsSupportedExt('B.OTF')).toBe(true);
        expect(fontpreviewIsSupportedExt('x.woff')).toBe(true);
        expect(fontpreviewIsSupportedExt('y.woff2')).toBe(true);
    });

    test('不支持', () => {
        expect(fontpreviewIsSupportedExt('a.png')).toBe(false);
        expect(fontpreviewIsSupportedExt('font')).toBe(false);
        expect(fontpreviewIsSupportedExt('')).toBe(false);
        expect(fontpreviewIsSupportedExt(null)).toBe(false);
    });
});

describe('fontpreviewSampleTexts', () => {
    test('常量对象', () => {
        expect(FONTPREVIEW_SAMPLE_TEXTS.zh).toBeTruthy();
        expect(FONTPREVIEW_SAMPLE_TEXTS.en).toBeTruthy();
        expect(FONTPREVIEW_SAMPLE_TEXTS.mix).toBeTruthy();
    });

    test('按 key 取文本', () => {
        expect(fontpreviewSampleTexts('en')).toContain('quick brown fox');
        expect(fontpreviewSampleTexts('zh').length).toBeGreaterThan(5);
        expect(fontpreviewSampleTexts()).toBe(FONTPREVIEW_SAMPLE_TEXTS);
    });

    test('未知 key 回退 mix', () => {
        expect(fontpreviewSampleTexts('nope')).toBe(FONTPREVIEW_SAMPLE_TEXTS.mix);
    });
});

describe('FONTPREVIEW_SUPPORTED_EXT', () => {
    test('包含四类扩展', () => {
        expect(FONTPREVIEW_SUPPORTED_EXT).toEqual(expect.arrayContaining(['.ttf', '.otf', '.woff', '.woff2']));
    });
});
