const { parseStackTrace, formatStackTraceHtml, stacktraceFormatText } = require('../../js/debug/stacktrace.js');

const SIMPLE = `java.lang.NullPointerException: oops
	at com.example.Foo.bar(Foo.java:10)
	at com.example.Foo.baz(Foo.java:5)
Caused by: java.io.IOException: inner
	at com.example.IO.read(IO.java:99)
	... 3 more`;

describe('parseStackTrace - 基础解析', () => {
    test('返回 null 用于空输入', () => {
        expect(parseStackTrace('')).toBeNull();
        expect(parseStackTrace('   ')).toBeNull();
        expect(parseStackTrace(null)).toBeNull();
    });
    test('解析单条异常的 type/message', () => {
        const r = parseStackTrace('java.lang.RuntimeException: boom');
        expect(r.exceptions).toHaveLength(1);
        expect(r.exceptions[0].type).toBe('java.lang.RuntimeException');
        expect(r.exceptions[0].message).toBe('boom');
        expect(r.exceptions[0].frames).toEqual([]);
    });
    test('无消息异常的 message 为空串', () => {
        const r = parseStackTrace('java.lang.NullPointerException');
        expect(r.exceptions[0].type).toBe('java.lang.NullPointerException');
        expect(r.exceptions[0].message).toBe('');
    });
});

describe('parseStackTrace - 堆栈帧提取', () => {
    test('提取 class / method / file / line', () => {
        const r = parseStackTrace(SIMPLE);
        const frames = r.exceptions[0].frames;
        expect(frames.length).toBeGreaterThan(0);
        expect(frames[0]).toEqual({
            class: 'com.example.Foo',
            method: 'bar',
            file: 'Foo.java',
            line: 10,
        });
    });
    test('多帧按出现顺序保留', () => {
        const r = parseStackTrace(SIMPLE);
        const frames = r.exceptions[0].frames;
        expect(frames[0].method).toBe('bar');
        expect(frames[1].method).toBe('baz');
    });
    test('Native Method 帧 (line=-1, file=Native Method)', () => {
        const r = parseStackTrace(
            'java.lang.Exception\n\tat sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)'
        );
        const f = r.exceptions[0].frames[0];
        expect(f.class).toBe('sun.reflect.NativeMethodAccessorImpl');
        expect(f.file).toBe('Native Method');
        expect(f.line).toBe(-1);
    });
});

describe('parseStackTrace - Caused by 异常链', () => {
    test('嵌套 cause 链正确串联', () => {
        const r = parseStackTrace(SIMPLE);
        expect(r.exceptions).toHaveLength(2);
        expect(r.exceptions[0].type).toBe('java.lang.NullPointerException');
        expect(r.exceptions[0].causedBy).toBe(r.exceptions[1]);
        expect(r.exceptions[1].type).toBe('java.io.IOException');
        expect(r.exceptions[1].message).toBe('inner');
    });
    test('三层 cause 链 (Caused by → Caused by)', () => {
        const text = [
            'java.lang.OuterException: top',
            '\tat com.A.run(A.java:1)',
            'Caused by: java.lang.MidException: mid',
            '\tat com.B.run(B.java:2)',
            'Caused by: java.lang.InnerException: low',
            '\tat com.C.run(C.java:3)',
        ].join('\n');
        const r = parseStackTrace(text);
        expect(r.exceptions).toHaveLength(3);
        expect(r.exceptions[0].type).toBe('java.lang.OuterException');
        expect(r.exceptions[1].type).toBe('java.lang.MidException');
        expect(r.exceptions[2].type).toBe('java.lang.InnerException');
        expect(r.exceptions[0].causedBy).toBe(r.exceptions[1]);
        expect(r.exceptions[1].causedBy).toBe(r.exceptions[2]);
    });
});

describe('parseStackTrace - "... N more" 行', () => {
    test('解析为 omitted 帧 (不被合并到 frame)', () => {
        const r = parseStackTrace(SIMPLE);
        const lastFrame = r.exceptions[1].frames[r.exceptions[1].frames.length - 1];
        expect(lastFrame.omitted).toBe(3);
        expect(lastFrame.class).toBeUndefined();
    });
    test('顶层异常本身的 ... more 也归入正确位置', () => {
        const text = ['java.lang.RuntimeException: x', '\tat com.A.a(A.java:1)', '\t... 5 more'].join('\n');
        const r = parseStackTrace(text);
        const omitted = r.exceptions[0].frames.find((f) => f.omitted);
        expect(omitted).toBeDefined();
        expect(omitted.omitted).toBe(5);
    });
});

describe('parseStackTrace - currentException 指针', () => {
    test('指向首个异常', () => {
        const r = parseStackTrace(SIMPLE);
        expect(r.currentException).toBe(r.exceptions[0]);
    });
});

describe('formatStackTraceHtml - 输出', () => {
    test('空结果返回占位符', () => {
        expect(formatStackTraceHtml(null)).toMatch(/无法解析/);
        expect(formatStackTraceHtml({ exceptions: [], currentException: null })).toMatch(/无法解析/);
    });
    test('异常类型与消息出现在 HTML 中', () => {
        const html = formatStackTraceHtml(parseStackTrace('java.lang.RuntimeException: <boom>'));
        expect(html).toContain('java.lang.RuntimeException');
        expect(html).toContain('&lt;boom&gt;'); // HTML 转义生效
    });
    test('堆栈帧被转义为 HTML', () => {
        const html = formatStackTraceHtml(parseStackTrace(SIMPLE));
        expect(html).toContain('com.example.Foo');
        expect(html).toContain('bar');
        expect(html).toContain('Foo.java');
        expect(html).toContain('>10<'); // 行号 10 被 span 包裹
    });
    test('异常之间有分隔线 (border-top 仅出现在第二个及之后)', () => {
        const html = formatStackTraceHtml(parseStackTrace(SIMPLE));
        expect(html.match(/border-top:1px dashed/g)?.length).toBeGreaterThanOrEqual(1);
    });
});

describe('stacktraceFormatText - 纯文本格式化', () => {
    test('正常堆栈加入 at 行缩进', () => {
        const out = stacktraceFormatText(
            'java.lang.RuntimeException: msg\n\tat com.A.run(A.java:1)\nCaused by: java.io.IOException: y\n\tat com.B.b(B.java:2)'
        );
        expect(out).toContain('  at com.A.run(A.java:1)');
        expect(out).toContain('Caused by: java.io.IOException');
        expect(out).toContain('  at com.B.b(B.java:2)');
    });
    test('空输入返回空字符串', () => {
        const out = stacktraceFormatText('   ');
        // 空 input 经 .trim() 后为空, 函数内 .split() 返回 [''], 输出空串 trim 后 ''
        expect(out).toBe('');
    });
    test('... N more 行保持原缩进', () => {
        const out = stacktraceFormatText('... 5 more');
        expect(out).toContain('... 5 more');
    });
});
