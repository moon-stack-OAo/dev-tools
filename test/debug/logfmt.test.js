const {parseLogLine, parseLog, _lfEscape} = require('../../js/debug/logfmt.js');

describe('parseLogLine 单行解析', () => {
    test('标准日志行', () => {
        const e = parseLogLine('2024-01-02 03:04:05.678 INFO  [main] com.example.Foo - hello world');
        expect(e).toMatchObject({
            timestamp: '2024-01-02 03:04:05.678',
            level: 'INFO',
            thread: 'main',
            logger: 'com.example.Foo',
            message: 'hello world',
        });
    });

    test('无毫秒时间戳', () => {
        const e = parseLogLine('2024-01-02 03:04:05 ERROR [t1] c.x.Bar - boom');
        expect(e.level).toBe('ERROR');
        expect(e.timestamp).toBe('2024-01-02 03:04:05');
    });

    test('逗号分隔毫秒', () => {
        const e = parseLogLine('2024-01-02 03:04:05,123 DEBUG [t] L - msg');
        expect(e).not.toBeNull();
        expect(e.level).toBe('DEBUG');
    });

    test('非法行返回 null', () => {
        expect(parseLogLine('not a log line')).toBeNull();
    });
});

describe('parseLog 多行分组', () => {
    test('单条日志无堆栈', () => {
        const g = parseLog('2024-01-02 03:04:05.000 INFO  [main] L - hi');
        expect(g).toHaveLength(1);
        expect(g[0].entry).not.toBeNull();
        expect(g[0].frames).toEqual([]);
    });

    test('堆栈跟踪归入同组', () => {
        const text = [
            '2024-01-02 03:04:05.000 ERROR [main] L - fail',
            'java.lang.NullPointerException: oops',
            '\tat com.example.Foo.bar(Foo.java:10)',
            '\tat com.example.Baz.run(Baz.java:5)',
        ].join('\n');
        const g = parseLog(text);
        expect(g).toHaveLength(1);
        expect(g[0].frames.length).toBe(3);
    });

    test('空行分隔多组', () => {
        const text = '2024-01-02 03:04:05.000 INFO  [m] L - a\n\n2024-01-02 03:04:06.000 WARN  [m] L - b';
        const g = parseLog(text);
        expect(g).toHaveLength(2);
    });

    test('Caused by 归入同组堆栈', () => {
        const text = [
            '2024-01-02 03:04:05.000 ERROR [m] L - fail',
            'java.lang.RuntimeException: outer',
            '\tat com.A.run(A.java:1)',
            'Caused by: java.io.IOException: inner',
            '\tat com.B.read(B.java:2)',
        ].join('\n');
        const g = parseLog(text);
        expect(g).toHaveLength(1);
        expect(g[0].frames.length).toBe(4);
    });
});

describe('_lfEscape HTML 转义', () => {
    test('转义特殊字符', () => {
        expect(_lfEscape('<script>&"\'')).toBe('&lt;script&gt;&amp;&quot;&#39;');
    });

    test('null 安全返回空串', () => {
        expect(_lfEscape(null)).toBe('');
    });
});
