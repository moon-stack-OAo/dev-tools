const {
  httpIsSensitiveHeaderName,
  httpSanitizeHeaders,
  httpSanitizeBody,
  httpSanitizeHistoryItem,
  httpParseCurl,
  httpBuildCurlFromConfig,
  httpBuildFetchCode,
  httpBuildAxiosCode,
  httpBuildJavaHttpClientCode,
  httpBuildCode,
  httpTokenize,
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

describe('httpTokenize', () => {
  test('解析引号与空格', () => {
    expect(httpTokenize(`-H 'Content-Type: application/json' -d '{"a":1}'`)).toEqual([
      '-H',
      'Content-Type: application/json',
      '-d',
      '{"a":1}',
    ]);
  });
});

describe('httpParseCurl', () => {
  test('空输入失败', () => {
    expect(httpParseCurl('').ok).toBe(false);
    expect(httpParseCurl('wget http://x').ok).toBe(false);
  });

  test('解析 -X -H -d --url', () => {
    const cmd = `curl -X POST --url 'https://api.example.com/users?page=1' \\
  -H 'Content-Type: application/json' \\
  -H 'Accept: application/json' \\
  --data-raw '{"name":"tom"}'`;
    const r = httpParseCurl(cmd);
    expect(r.ok).toBe(true);
    expect(r.method).toBe('POST');
    expect(r.url).toBe('https://api.example.com/users');
    expect(r.queries).toEqual([['page', '1']]);
    expect(r.headers).toEqual([
      ['Content-Type', 'application/json'],
      ['Accept', 'application/json'],
    ]);
    expect(r.body).toBe('{"name":"tom"}');
    expect(r.bodyType).toBe('json');
  });

  test('仅 -d 时默认 POST', () => {
    const r = httpParseCurl(`curl https://api.example.com/x -d 'a=1'`);
    expect(r.ok).toBe(true);
    expect(r.method).toBe('POST');
    expect(r.body).toBe('a=1');
  });

  test('Bearer Auth 与选项', () => {
    const r = httpParseCurl(
      `curl -X GET 'https://api.example.com/me' -H 'Authorization: Bearer tok123' -L -k --compressed --max-time 15 -A 'ua/1'`,
    );
    expect(r.ok).toBe(true);
    expect(r.auth.type).toBe('bearer');
    expect(r.auth.token).toBe('tok123');
    expect(r.opts.follow).toBe(true);
    expect(r.opts.insecure).toBe(true);
    expect(r.opts.compressed).toBe(true);
    expect(r.opts.timeout).toBe('15');
    expect(r.opts.ua).toBe('ua/1');
  });
});

describe('httpBuildCode', () => {
  const cfg = {
    method: 'POST',
    url: 'https://api.example.com/users',
    headers: [
      ['Content-Type', 'application/json'],
      ['Accept', 'application/json'],
    ],
    body: '{"name":"tom"}',
    bodyType: 'json',
  };

  test('生成 cURL', () => {
    const cmd = httpBuildCurlFromConfig(cfg, { follow: true });
    expect(cmd).toContain("curl -X POST");
    expect(cmd).toContain('https://api.example.com/users');
    expect(cmd).toContain('-H ');
    expect(cmd).toContain('--data-raw');
    expect(cmd).toContain('  -L');
  });

  test('生成 Fetch', () => {
    const code = httpBuildFetchCode(cfg);
    expect(code).toContain('await fetch(');
    expect(code).toContain("method: 'POST'");
    expect(code).toContain('Content-Type');
    expect(code).toContain('body:');
  });

  test('生成 Axios', () => {
    const code = httpBuildAxiosCode(cfg);
    expect(code).toContain('axios({');
    expect(code).toContain("method: 'post'");
    expect(code).toContain("url: 'https://api.example.com/users'");
    expect(code).toContain('data:');
  });

  test('生成 Java HttpClient', () => {
    const code = httpBuildJavaHttpClientCode(cfg);
    expect(code).toContain('HttpClient');
    expect(code).toContain('HttpRequest');
    expect(code).toContain('URI.create');
    expect(code).toContain('.method("POST"');
  });

  test('httpBuildCode 分发', () => {
    expect(httpBuildCode(cfg, 'fetch')).toContain('fetch(');
    expect(httpBuildCode(cfg, 'axios')).toContain('axios');
    expect(httpBuildCode(cfg, 'java')).toContain('HttpClient');
    expect(httpBuildCode(cfg, 'curl')).toContain('curl');
  });

  test('GET 不生成 body', () => {
    const getCfg = {
      method: 'GET',
      url: 'https://api.example.com/ping',
      headers: [],
      body: '',
      bodyType: 'none',
    };
    const curl = httpBuildCurlFromConfig(getCfg);
    expect(curl).toMatch(/^curl /);
    expect(curl).not.toContain('--data-raw');
    expect(httpBuildFetchCode(getCfg)).not.toContain('body:');
  });
});
