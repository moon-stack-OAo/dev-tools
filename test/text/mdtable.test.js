const {
    csvToMdTable,
    mdTableToCsv,
    textToTree,
} = require('../../js/text/mdtable.js');

describe('csvToMdTable', () => {
    test('CSV 转 Markdown 左对齐', () => {
        const md = csvToMdTable('name,age\nAlice,28\nBob,31', { align: 'left' });
        expect(md).toContain('| name | age |');
        expect(md).toContain('| :--- | :--- |');
        expect(md).toContain('| Alice | 28 |');
        expect(md).toContain('| Bob | 31 |');
    });

    test('居中与右对齐', () => {
        const c = csvToMdTable('a,b\n1,2', { align: 'center' });
        expect(c).toContain('| :---: | :---: |');
        const r = csvToMdTable('a,b\n1,2', { align: 'right' });
        expect(r).toContain('| ---: | ---: |');
    });

    test('TSV', () => {
        const md = csvToMdTable('a\tb\n1\t2', { delimiter: '\t' });
        expect(md).toContain('| a | b |');
        expect(md).toContain('| 1 | 2 |');
    });

    test('管道分隔', () => {
        const md = csvToMdTable('| a | b |\n| 1 | 2 |', { delimiter: '|' });
        expect(md).toContain('| a | b |');
    });

    test('空输入抛错', () => {
        expect(() => csvToMdTable('')).toThrow();
    });
});

describe('mdTableToCsv', () => {
    test('Markdown 转 CSV', () => {
        const md = '| name | age |\n| :--- | ---: |\n| Alice | 28 |\n| Bob | 31 |';
        const csv = mdTableToCsv(md);
        expect(csv).toBe('name,age\nAlice,28\nBob,31');
    });

    test('Tab 分隔', () => {
        const md = '| a | b |\n| --- | --- |\n| 1 | 2 |';
        expect(mdTableToCsv(md, { delimiter: '\t' })).toBe('a\tb\n1\t2');
    });

    test('含逗号单元格加引号', () => {
        const md = '| name | note |\n| --- | --- |\n| A | hello, world |';
        const csv = mdTableToCsv(md);
        expect(csv).toContain('"hello, world"');
    });
});

describe('textToTree', () => {
    test('路径列表', () => {
        const tree = textToTree(
            ['src/main/App.java', 'src/main/util/Helper.java', 'src/test/AppTest.java', 'README.md'].join(
                '\n',
            ),
            { mode: 'path' },
        );
        expect(tree).toContain('├─ ');
        expect(tree).toContain('└─ ');
        expect(tree).toContain('src');
        expect(tree).toContain('App.java');
        expect(tree).toContain('README.md');
    });

    test('缩进文本', () => {
        const tree = textToTree('root\n  child1\n  child2\n    leaf', { mode: 'indent', indent: 2 });
        expect(tree).toContain('root');
        expect(tree).toContain('child1');
        expect(tree).toContain('leaf');
        expect(tree).toMatch(/├─|└─/);
    });

    test('空输入', () => {
        expect(() => textToTree('')).toThrow();
    });
});
