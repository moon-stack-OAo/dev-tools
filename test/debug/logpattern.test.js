const {
    parseLogPattern,
    logpatternListWords,
    LOG_PATTERN_TEMPLATES,
} = require('../../js/debug/logpattern.js');

describe('parseLogPattern', () => {
    test('空输入', () => {
        expect(parseLogPattern('')).toEqual([]);
        expect(parseLogPattern(null)).toEqual([]);
    });

    test('解析默认 pattern', () => {
        const p = '%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n';
        const tokens = parseLogPattern(p);
        const words = tokens.filter((t) => t.type === 'conversion').map((t) => t.word);
        expect(words).toEqual(['d', 'thread', 'level', 'logger', 'msg', 'n']);
        const d = tokens.find((t) => t.word === 'd');
        expect(d.format).toBe('yyyy-MM-dd HH:mm:ss.SSS');
        expect(d.name).toMatch(/日期/);
        const level = tokens.find((t) => t.word === 'level');
        expect(level.options).toBe('-5');
        const logger = tokens.find((t) => t.word === 'logger');
        expect(logger.format).toBe('36');
    });

    test('字面量与 %%', () => {
        const tokens = parseLogPattern('hello %% world');
        expect(tokens.some((t) => t.type === 'literal' && t.literal === 'hello ')).toBe(true);
        expect(tokens.some((t) => t.type === 'literal' && t.literal === '%')).toBe(true);
    });

    test('MDC %X{key}', () => {
        const tokens = parseLogPattern('%X{traceId}');
        expect(tokens[0].word).toBe('X');
        expect(tokens[0].format).toBe('traceId');
        expect(tokens[0].name).toMatch(/MDC/);
    });

    test('复合转换 highlight', () => {
        const tokens = parseLogPattern('%highlight(%-5level)');
        expect(tokens[0].word).toBe('highlight');
        expect(tokens[0].nested).toBeDefined();
        expect(tokens[0].nested.some((n) => n.word === 'level')).toBe(true);
    });

    test('未知 word', () => {
        const tokens = parseLogPattern('%fooBar');
        expect(tokens[0].word).toBe('fooBar');
        expect(tokens[0].name).toMatch(/未知/);
    });
});

describe('templates & words', () => {
    test('模板可解析', () => {
        LOG_PATTERN_TEMPLATES.forEach((t) => {
            const tokens = parseLogPattern(t.pattern);
            expect(tokens.length).toBeGreaterThan(0);
            expect(tokens.some((x) => x.type === 'conversion')).toBe(true);
        });
    });

    test('速查列表非空', () => {
        const list = logpatternListWords();
        expect(list.length).toBeGreaterThan(10);
        expect(list[0]).toHaveProperty('word');
        expect(list[0]).toHaveProperty('name');
    });
});
