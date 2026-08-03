const {
    regexJavaEscape,
    regexToJava,
    rjParseFlags,
} = require('../../js/text/regexjava.js');

describe('regexJavaEscape', () => {
    test('反斜杠转义为双反斜杠', () => {
        expect(regexJavaEscape('\\d+')).toBe('\\\\d+');
    });

    test('双引号转义', () => {
        expect(regexJavaEscape('a"b')).toBe('a\\"b');
    });

    test('同时处理反斜杠与引号', () => {
        expect(regexJavaEscape('say "\\w+"')).toBe('say \\"\\\\w+\\"');
    });

    test('空与 null', () => {
        expect(regexJavaEscape('')).toBe('');
        expect(regexJavaEscape(null)).toBe('');
    });
});

describe('rjParseFlags', () => {
    test('映射 i/m/s', () => {
        expect(rjParseFlags('ims')).toEqual([
            'Pattern.CASE_INSENSITIVE',
            'Pattern.MULTILINE',
            'Pattern.DOTALL',
        ]);
    });

    test('COMMENTS 与 x', () => {
        expect(rjParseFlags(['COMMENTS'])).toEqual(['Pattern.COMMENTS']);
        expect(rjParseFlags('x')).toEqual(['Pattern.COMMENTS']);
    });

    test('去重', () => {
        expect(rjParseFlags('ii')).toEqual(['Pattern.CASE_INSENSITIVE']);
    });
});

describe('regexToJava', () => {
    test('空 pattern 失败', () => {
        const r = regexToJava('');
        expect(r.ok).toBe(false);
        expect(r.msg).toMatch(/请输入/);
    });

    test('无 flags 生成基础片段', () => {
        const r = regexToJava('\\d+');
        expect(r.ok).toBe(true);
        expect(r.escaped).toBe('\\\\d+');
        expect(r.code).toContain('import java.util.regex.Pattern;');
        expect(r.code).toContain('import java.util.regex.Matcher;');
        expect(r.code).toContain('Pattern.compile("\\\\d+")');
        expect(r.code).toContain('pattern.matcher(input)');
    });

    test('单 flag', () => {
        const r = regexToJava('abc', { flags: 'i' });
        expect(r.ok).toBe(true);
        expect(r.code).toContain('Pattern.compile("abc", Pattern.CASE_INSENSITIVE)');
    });

    test('多 flags 用 | 连接', () => {
        const r = regexToJava('x', { flags: 'im' });
        expect(r.code).toContain('Pattern.CASE_INSENSITIVE | Pattern.MULTILINE');
    });

    test('含引号 pattern', () => {
        const r = regexToJava('a"b');
        expect(r.code).toContain('Pattern.compile("a\\"b")');
    });
});
