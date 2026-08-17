const {
    mermaidDefaultTheme,
    mermaidSampleByType,
    mermaidSampleTypes,
    mermaidIsEmptySource,
} = require('../../js/codegen/mermaid.js');

describe('mermaidDefaultTheme', () => {
    test('浅色主题返回 default', () => {
        expect(mermaidDefaultTheme(true)).toBe('default');
    });

    test('深色主题返回 dark', () => {
        expect(mermaidDefaultTheme(false)).toBe('dark');
    });
});

describe('mermaidSampleTypes', () => {
    test('包含全部示例类型', () => {
        expect(mermaidSampleTypes).toEqual([
            'flowchart',
            'sequence',
            'class',
            'er',
            'gantt',
            'pie',
        ]);
    });
});

describe('mermaidSampleByType', () => {
    test.each(mermaidSampleTypes)('%s 示例非空且含关键字', (type) => {
        const s = mermaidSampleByType(type);
        expect(typeof s).toBe('string');
        expect(s.trim().length).toBeGreaterThan(0);
    });

    test('flowchart 含 flowchart', () => {
        expect(mermaidSampleByType('flowchart')).toMatch(/flowchart/i);
    });

    test('sequence 含 sequenceDiagram', () => {
        expect(mermaidSampleByType('sequence')).toMatch(/sequenceDiagram/i);
    });

    test('class 含 classDiagram', () => {
        expect(mermaidSampleByType('class')).toMatch(/classDiagram/i);
    });

    test('er 含 erDiagram', () => {
        expect(mermaidSampleByType('er')).toMatch(/erDiagram/i);
    });

    test('gantt 含 gantt', () => {
        expect(mermaidSampleByType('gantt')).toMatch(/gantt/i);
    });

    test('pie 含 pie', () => {
        expect(mermaidSampleByType('pie')).toMatch(/pie/i);
    });

    test('未知类型回退 flowchart', () => {
        expect(mermaidSampleByType('unknown')).toBe(mermaidSampleByType('flowchart'));
        expect(mermaidSampleByType('')).toBe(mermaidSampleByType('flowchart'));
        expect(mermaidSampleByType(null)).toBe(mermaidSampleByType('flowchart'));
    });
});

describe('mermaidIsEmptySource', () => {
    test('空串 / 空白 / null / undefined 为 true', () => {
        expect(mermaidIsEmptySource('')).toBe(true);
        expect(mermaidIsEmptySource('   \n\t')).toBe(true);
        expect(mermaidIsEmptySource(null)).toBe(true);
        expect(mermaidIsEmptySource(undefined)).toBe(true);
    });

    test('有内容为 false', () => {
        expect(mermaidIsEmptySource('flowchart TD\nA-->B')).toBe(false);
    });
});
