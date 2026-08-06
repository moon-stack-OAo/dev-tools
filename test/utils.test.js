const { formatBytes, escapeHtml, debounce } = require('../js/utils.js');

describe('formatBytes', () => {
    test('字节', () => {
        expect(formatBytes(0)).toBe('0 B');
        expect(formatBytes(512)).toBe('512 B');
    });

    test('KB / MB', () => {
        expect(formatBytes(1536)).toBe('1.5 KB');
        expect(formatBytes(1024 * 1024)).toBe('1.00 MB');
    });

    test('非法值安全', () => {
        expect(formatBytes(NaN)).toBe('0 B');
        expect(formatBytes(-1)).toBe('0 B');
        expect(formatBytes(undefined)).toBe('0 B');
    });
});

describe('escapeHtml', () => {
    test('转义关键字符', () => {
        expect(escapeHtml('<script>"x"&\'')).toBe(
            '&lt;script&gt;&quot;x&quot;&amp;&#39;'
        );
    });

    test('空值安全', () => {
        expect(escapeHtml(null)).toBe('');
        expect(escapeHtml(undefined)).toBe('');
    });
});

describe('debounce', () => {
    test('延迟合并调用', async () => {
        let n = 0;
        const fn = debounce(() => {
            n += 1;
        }, 20);
        fn();
        fn();
        fn();
        expect(n).toBe(0);
        await new Promise((r) => setTimeout(r, 40));
        expect(n).toBe(1);
    });
});
