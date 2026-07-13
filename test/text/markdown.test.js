const { mdIsSafeUri } = require('../../js/text/markdown.js');

describe('mdIsSafeUri', () => {
  test('允许 http/https/mailto', () => {
    expect(mdIsSafeUri('https://example.com')).toBe(true);
    expect(mdIsSafeUri('http://example.com/a?b=1')).toBe(true);
    expect(mdIsSafeUri('mailto:a@b.com')).toBe(true);
  });

  test('允许锚点与路径', () => {
    expect(mdIsSafeUri('#section')).toBe(true);
    expect(mdIsSafeUri('/abs/path')).toBe(true);
    expect(mdIsSafeUri('./rel.md')).toBe(true);
    expect(mdIsSafeUri('../up.md')).toBe(true);
    expect(mdIsSafeUri('docs/readme.md')).toBe(true);
  });

  test('拒绝危险协议', () => {
    expect(mdIsSafeUri('javascript:alert(1)')).toBe(false);
    expect(mdIsSafeUri('JAVASCRIPT:alert(1)')).toBe(false);
    expect(mdIsSafeUri('vbscript:msgbox(1)')).toBe(false);
    expect(mdIsSafeUri('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(mdIsSafeUri('data:image/png;base64,aaa')).toBe(false);
  });

  test('拒绝其它 scheme 与空值', () => {
    expect(mdIsSafeUri('file:///etc/passwd')).toBe(false);
    expect(mdIsSafeUri('blob:https://x')).toBe(false);
    expect(mdIsSafeUri('')).toBe(false);
    expect(mdIsSafeUri(null)).toBe(false);
    expect(mdIsSafeUri(undefined)).toBe(false);
  });

  test('协议前空白控制字符仍应拦截', () => {
    expect(mdIsSafeUri('\u0000javascript:alert(1)')).toBe(false);
    expect(mdIsSafeUri('  javascript:alert(1)')).toBe(false);
  });
});
