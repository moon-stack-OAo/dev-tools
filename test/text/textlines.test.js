const {
    splitLines,
    joinLines,
    sortLines,
    uniqueLines,
    reverseLines,
    shuffleLines,
    processTextLines,
} = require('../../js/text/textlines.js');

describe('splitLines / joinLines', () => {
    test('CRLF / LF', () => {
        expect(splitLines('a\r\nb\nc')).toEqual(['a', 'b', 'c']);
    });

    test('trim + removeEmpty', () => {
        expect(splitLines(' a \n\n b \n', { trim: true, removeEmpty: true })).toEqual(['a', 'b']);
    });

    test('自定义分隔符', () => {
        expect(splitLines('a,b,c', { separator: ',' })).toEqual(['a', 'b', 'c']);
    });

    test('join', () => {
        expect(joinLines(['a', 'b'], '\n')).toBe('a\nb');
        expect(joinLines([], '\n')).toBe('');
    });
});

describe('sortLines', () => {
    test('升序 / 降序', () => {
        expect(sortLines(['b', 'a', 'c'], { order: 'asc' })).toEqual(['a', 'b', 'c']);
        expect(sortLines(['b', 'a', 'c'], { order: 'desc' })).toEqual(['c', 'b', 'a']);
    });

    test('忽略大小写', () => {
        expect(sortLines(['b', 'A', 'c'], { caseInsensitive: true })).toEqual(['A', 'b', 'c']);
    });

    test('数字排序', () => {
        expect(sortLines(['10', '2', '1'], { numeric: true })).toEqual(['1', '2', '10']);
    });
});

describe('uniqueLines / reverse / shuffle', () => {
    test('去重保序', () => {
        expect(uniqueLines(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
    });

    test('忽略大小写去重', () => {
        expect(uniqueLines(['Apple', 'apple', 'b'], { caseInsensitive: true })).toEqual(['Apple', 'b']);
    });

    test('反转', () => {
        expect(reverseLines(['a', 'b', 'c'])).toEqual(['c', 'b', 'a']);
    });

    test('打乱长度不变', () => {
        const src = ['a', 'b', 'c', 'd'];
        const out = shuffleLines(src);
        expect(out).toHaveLength(4);
        expect(src).toEqual(['a', 'b', 'c', 'd']);
        expect(out.slice().sort()).toEqual(src.slice().sort());
    });
});

describe('processTextLines', () => {
    test('综合：trim 去空 去重 排序', () => {
        const text = ' banana \n\napple\nbanana\nCherry\n';
        const r = processTextLines(text, {
            trim: true,
            removeEmpty: true,
            unique: true,
            sort: true,
            order: 'asc',
            caseInsensitive: true,
        });
        expect(r.split('\n')).toEqual(['apple', 'banana', 'Cherry']);
    });
});
