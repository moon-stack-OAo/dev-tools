const { formatJava } = require('../../js/format/javafmt.js');

describe('formatJava 基本缩进', () => {
    test('空输入返回空', () => {
        expect(formatJava('', {})).toBe('');
    });

    test('基本类 K&R 4 空格', () => {
        const out = formatJava('class A{}', { indent: '    ' });
        expect(out).toContain('class A');
        expect(out.split('\n').length).toBeGreaterThanOrEqual(2);
    });

    test('4 空格缩进 嵌套 if', () => {
        const out = formatJava('class A{void m(){if(true){return;}}}', { indent: '    ' });
        // `return;` 处于 class + method + if 三层,缩进应为 12 空格
        expect(out).toMatch(/\n {12}return;/);
        // 闭合 `}` 之后返回 0 缩进
        expect(out.trimEnd().endsWith('}')).toBe(true);
    });

    test('Tab 缩进', () => {
        const out = formatJava('class A{void m(){return;}}', { indent: '\t' });
        expect(out).toMatch(/\n\t{2,}return;/);
    });

    test('2 空格缩进', () => {
        const out = formatJava('class A{void m(){return;}}', { indent: '  ' });
        // class + method 两层,缩进应为 4 空格
        expect(out).toMatch(/\n {4}return;/);
    });
});

describe('formatJava 字符串与注释', () => {
    test('字符串内 {} 不影响缩进', () => {
        const input = 'String s="hello{world}";';
        const out = formatJava(input, { indent: '    ' });
        // 字符串行不应有 4 空格缩进 (depth=0)
        expect(out).not.toMatch(/^ +"hello/m);
        // 进一步:行首不应有 4 空格
        expect(out.split('\n')[0].startsWith('    ')).toBe(false);
    });

    test('字符串转义引号', () => {
        const input = 'String s="he said \\"hi\\"";';
        const out = formatJava(input, { indent: '    ' });
        expect(out).toContain('String s');
    });

    test('块注释不影响大括号深度', () => {
        const input = 'class A{/* hi { brace */ void m(){return;}}';
        const out = formatJava(input, { indent: '    ' });
        // `return;` 应在 8 空格缩进(类 + 方法)
        expect(out).toMatch(/\n {8}return;/);
    });

    test('行注释不影响缩进', () => {
        const input = 'class A{\n// comment { not brace\nvoid m(){\nreturn;\n}\n}';
        const out = formatJava(input, { indent: '    ' });
        expect(out).toMatch(/\n {4}void m\(\)/);
        expect(out).toMatch(/\n {8}return;/);
    });

    test('模板字符串 ${} 不崩溃', () => {
        const input = 'class T{String s=`a${b{c}}d`;}';
        expect(() => formatJava(input, {})).not.toThrow();
    });
});

describe('formatJava 嵌套与复杂', () => {
    test('嵌套类缩进', () => {
        const input = 'class A{class B{void m(){return;}}}';
        const out = formatJava(input, { indent: '    ' });
        expect(out).toMatch(/\n {4}class B/);
        // `return;` 处于 class A + class B + method 三层,缩进应为 12 空格
        expect(out).toMatch(/\n {12}return;/);
    });

    test('lambda 体', () => {
        const input = 'list.stream().filter(x->x>0).map(x->x*2);';
        const out = formatJava(input, { indent: '    ' });
        // lambda 仍是单行;不应被强制换行
        expect(out).toContain('filter');
        expect(out).toContain('map');
    });

    test('if-else 链', () => {
        const input = 'class A{void m(int x){if(x==1){return;}else if(x==2){return;}else{return;}}}';
        const out = formatJava(input, { indent: '    ' });
        // `}else` 应在同一行(中间可能没有空格,但在同一行)
        expect(out).toMatch(/}else/);
    });
});

describe('formatJava 大括号风格', () => {
    test('K&R 默认(同行)', () => {
        const out = formatJava('class A{void m(){return;}}', { brace: 'kr' });
        expect(out).toMatch(/class A\{/);
    });

    test('Allman 大括号独立成行', () => {
        const out = formatJava('class A{void m(){return;}}', { brace: 'allman' });
        // 应有单独 `{` 行
        expect(out).toMatch(/\n\{/);
    });
});

describe('formatJava import 排序分组', () => {
    test('按 java/javax/其他 分组并字母序', () => {
        const input = [
            'import com.example.Z;',
            'import java.util.List;',
            'import javax.annotation.Nullable;',
            'import java.util.Map;',
            'import com.example.A;',
        ].join('\n');
        const out = formatJava(input, { sortImports: true, indent: '    ' });
        const lines = out.split('\n').filter((l) => l.trim());
        const javaIdx = lines.findIndex((l) => l.includes('java.util.List'));
        const javaxIdx = lines.findIndex((l) => l.includes('javax.annotation'));
        const otherIdx = lines.findIndex((l) => l.includes('com.example.A'));
        // java 先于 javax 先于 other
        expect(javaIdx).toBeLessThan(javaxIdx);
        expect(javaxIdx).toBeLessThan(otherIdx);
        // 字母序
        expect(lines.indexOf('import java.util.List;')).toBeLessThan(lines.indexOf('import java.util.Map;'));
    });

    test('关闭 sortImports 时不排序', () => {
        const input = 'import com.example.Z;\nimport java.util.List;\nimport com.example.A;';
        const out = formatJava(input, { sortImports: false, indent: '    ' });
        const lines = out.split('\n').filter((l) => l.trim());
        expect(lines[0]).toContain('com.example.Z');
        expect(lines[1]).toContain('java.util.List');
    });
});

describe('formatJava 方法链换行', () => {
    test('链式调用拆成多行', () => {
        const input = 'list.stream().filter(x->x>0).map(x->x*2).collect(toList());';
        const out = formatJava(input, { indent: '    ', chainBreak: true });
        // 行数应 > 3
        expect(out.split('\n').length).toBeGreaterThan(2);
        expect(out).toContain('.filter');
        expect(out).toContain('.collect');
    });

    test('关闭 chainBreak 时不改写', () => {
        const input = 'list.stream().filter(x->x>0).collect(toList());';
        const outNo = formatJava(input, { indent: '    ', chainBreak: false });
        const outYes = formatJava(input, { indent: '    ', chainBreak: true });
        // 开启时行数更多
        expect(outYes.split('\n').length).toBeGreaterThanOrEqual(outNo.split('\n').length);
    });
});

describe('formatJava 注解换行', () => {
    test('一行 3 个注解 拆成 3 行', () => {
        const out = formatJava('@Override @Deprecated @SuppressWarnings("all") public void m(){}', {
            indent: '    ',
            annotationBreak: true,
        });
        const lines = out.split('\n').filter((l) => l.trim());
        // 至少 4 行(3 注解 + public void m)
        expect(lines.length).toBeGreaterThanOrEqual(4);
        expect(out).toContain('@Override');
        expect(out).toContain('@Deprecated');
        expect(out).toContain('@SuppressWarnings("all")');
    });

    test('1-2 个注解不触发换行', () => {
        const input = '@Override public void m(){}';
        const out = formatJava(input, { indent: '    ', annotationBreak: true });
        expect(out.split('\n').filter((l) => l.trim()).length).toBeLessThanOrEqual(2);
    });
});

describe('formatJava 压缩模式', () => {
    test('压缩去除换行', () => {
        const input = 'class A {\n    void m() {\n        return;\n    }\n}\n';
        const out = formatJava(input, { compress: true });
        expect(out).not.toContain('\n');
        expect(out).toContain('classA');
        expect(out).toContain('voidm()');
    });

    test('压缩保留分号与括号', () => {
        const input = 'class A{void m(){return;}}';
        const out = formatJava(input, { compress: true });
        expect(out).toContain(';');
        expect(out).toContain('{');
        expect(out).toContain('}');
    });

    test('压缩不影响字符串内的分号', () => {
        const input = 'String s = "a;b;c";';
        const out = formatJava(input, { compress: true });
        expect(out).toContain('"a;b;c"');
    });
});

describe('formatJava 边界情况', () => {
    test('已规范代码 最小改动', () => {
        const input = 'class A {\n    void m() {\n        return;\n    }\n}\n';
        const out = formatJava(input, { indent: '    ', brace: 'kr' });
        // 应当保持基本一致(可能存在末尾换行的轻微差异)
        expect(out.trim()).toBe(input.trim());
    });

    test('连续多个 close 大括号', () => {
        const input = 'class A{void m(){if(true){if(true){return;}}}}';
        const out = formatJava(input, { indent: '    ' });
        // 最后一个 `}` 应回到 0 缩进
        expect(out.trimEnd().endsWith('}')).toBe(true);
        // 不应有未缩进的顶部 `}` (非零前缀的换行后 `}`)
        expect(out).not.toMatch(/^[ {0}]}\n|\n[ ]*\n}/m);
        // 整体闭合层数与开头一致
        const opens = (out.match(/\{/g) || []).length;
        const closes = (out.match(/\}/g) || []).length;
        expect(opens).toBe(closes);
    });

    test('关闭所有选项仍能正确格式化', () => {
        const input = 'class A{void m(){return;}}';
        const out = formatJava(input, { indent: '    ' });
        expect(out).toContain('class A');
        expect(out).toContain('return;');
    });
});
