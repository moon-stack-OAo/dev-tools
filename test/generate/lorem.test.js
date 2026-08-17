const {
    loremGenerate,
    loremPickWords,
    loremParseHexColor,
    loremPlaceholderDataUrl,
    LOREM_EN_WORDS,
} = require('../../js/generate/lorem.js');

describe('loremPickWords', () => {
    test('取固定数量', () => {
        let i = 0;
        const rng = () => {
            i = (i + 0.1) % 1;
            return i;
        };
        const words = loremPickWords(LOREM_EN_WORDS, 5, rng);
        expect(words).toHaveLength(5);
        words.forEach((w) => expect(typeof w).toBe('string'));
    });

    test('count 0', () => {
        expect(loremPickWords(LOREM_EN_WORDS, 0)).toEqual([]);
    });
});

describe('loremGenerate', () => {
    test('英文非空段落', () => {
        const text = loremGenerate({ lang: 'en', paragraphs: 2, sentences: 3, rng: () => 0.3 });
        expect(text.trim().length).toBeGreaterThan(10);
        expect(text.split(/\n\n/).length).toBe(2);
    });

    test('中文非空', () => {
        const text = loremGenerate({ lang: 'zh', paragraphs: 1, sentences: 2, rng: () => 0.2 });
        expect(text.trim().length).toBeGreaterThan(5);
        expect(/[\u4e00-\u9fff]/.test(text)).toBe(true);
    });

    test('段落数限制', () => {
        const text = loremGenerate({ lang: 'en', paragraphs: 3, sentences: 1, rng: () => 0.5 });
        expect(text.split(/\n\n/).length).toBe(3);
    });
});

describe('loremParseHexColor', () => {
    test('#rgb / #rrggbb', () => {
        expect(loremParseHexColor('#abc')).toBe('#aabbcc');
        expect(loremParseHexColor('#AABBCC')).toBe('#aabbcc');
    });

    test('rgb()', () => {
        expect(loremParseHexColor('rgb(255, 0, 0)')).toBe('#ff0000');
    });

    test('无效', () => {
        expect(loremParseHexColor('')).toBeNull();
        expect(loremParseHexColor('red')).toBeNull();
    });
});

describe('loremPlaceholderDataUrl', () => {
    test('无效宽高', () => {
        const r = loremPlaceholderDataUrl({ width: 0, height: 10 });
        expect(r.ok).toBe(false);
    });

    test('无 canvas 环境', () => {
        if (typeof document !== 'undefined' && document.createElement) {
            // 有 document 时可能成功，跳过
            return;
        }
        const r = loremPlaceholderDataUrl({ width: 10, height: 10 });
        expect(r.ok).toBe(false);
        expect(r.msg).toMatch(/Canvas|环境/);
    });
});
