const {
  httpIsSensitiveHeaderName,
  httpSanitizeHeaders,
  httpSanitizeBody,
  httpSanitizeHistoryItem,
} = require('../../js/debug/httpdebug.js');

describe('httpIsSensitiveHeaderName', () => {
  test('识别常见敏感头（大小写不敏感）', () => {
    expect(httpIsSensitiveHeaderName('Authorization')).toBe(true);
    expect(httpIsSensitiveHeaderName('authorization')).toBe(true);
    expect(httpIsSensitiveHeaderName('COOKIE')).toBe(true);
    expect(httpIsSensitiveHeaderName('Set-Cookie')).toBe(true);
    expect(httpIsSensitiveHeaderName('Proxy-Authorization')).toBe(true);
    expect(httpIsSensitiveHeaderName('X-Api-Key')).toBe(true);
    expect(httpIsSensitiveHeaderName('Api-Key')).toBe(true);
    expect(httpIsSensitiveHeaderName('X-Auth-Token')).toBe(true);
  });

  test('非敏感头返回 false', () => {
    expect(httpIsSensitiveHeaderName('Content-Type')).toBe(false);
    expect(httpIsSensitiveHeaderName('Accept')).toBe(false);
    expect(httpIsSensitiveHeaderName('')).toBe(false);
    expect(httpIsSensitiveHeaderName(null)).toBe(false);
  });
});

describe('httpSanitizeHeaders', () => {
  test('敏感头值替换为 ***，其余保留', () => {
    const input = [
      ['Content-Type', 'application/json'],
      ['Authorization', 'Bearer secret-token'],
      ['Cookie', 'sid=abc123'],
      ['X-Custom', 'ok'],
    ];
    expect(httpSanitizeHeaders(input)).toEqual([
      ['Content-Type', 'application/json'],
      ['Authorization', '***'],
      ['Cookie', '***'],
      ['X-Custom', 'ok'],
    ]);
  });

  test('空/非法输入安全返回', () => {
    expect(httpSanitizeHeaders(null)).toEqual([]);
    expect(httpSanitizeHeaders(undefined)).toEqual([]);
    expect(httpSanitizeHeaders([])).toEqual([]);
  });
});

describe('httpSanitizeBody', () => {
  test('JSON 敏感字段脱敏', () => {
    const body = JSON.stringify({
      username: 'alice',
      password: 'p@ss',
      token: 'tok-1',
      nested: { access_token: 'at', name: 'n' },
    });
    const out = JSON.parse(httpSanitizeBody(body, 'json'));
    expect(out.username).toBe('alice');
    expect(out.password).toBe('***');
    expect(out.token).toBe('***');
    expect(out.nested.access_token).toBe('***');
    expect(out.nested.name).toBe('n');
  });

  test('form-urlencoded 敏感键脱敏', () => {
    const body = 'user=alice&password=secret&token=abc&ok=1';
    expect(httpSanitizeBody(body, 'form')).toBe('user=alice&password=***&token=***&ok=1');
  });

  test('过长 body 截断', () => {
    const long = 'x'.repeat(3000);
    const out = httpSanitizeBody(long, 'text');
    expect(out.length).toBeLessThan(3000);
    expect(out).toContain('truncated');
  });

  test('空 body 原样', () => {
    expect(httpSanitizeBody('', 'json')).toBe('');
    expect(httpSanitizeBody(null, 'json')).toBe('');
  });
});

describe('httpSanitizeHistoryItem', () => {
  test('生成脱敏后的历史条目结构', () => {
    const cfg = {
      method: 'POST',
      url: 'https://api.example.com/login',
      headers: [
        ['Authorization', 'Bearer xxx'],
        ['Content-Type', 'application/json'],
      ],
      body: '{"password":"secret","name":"a"}',
      bodyType: 'json',
    };
    const item = httpSanitizeHistoryItem(cfg);
    expect(item.method).toBe('POST');
    expect(item.url).toBe('https://api.example.com/login');
    expect(item.bodyType).toBe('json');
    expect(item.headers).toEqual([
      ['Authorization', '***'],
      ['Content-Type', 'application/json'],
    ]);
    expect(JSON.parse(item.body)).toEqual({ password: '***', name: 'a' });
  });
});
