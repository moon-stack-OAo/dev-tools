const { formatNginx, minifyNginx, lintNginx, parseNginx, countBlocks } = require('../../js/format/nginxfmt.js');

// ============================================================
// formatNginx 测试
// ============================================================
describe('formatNginx 基本指令', () => {
    test('单个 directive 无参数', () => {
        expect(formatNginx('daemon off;', { indent: '    ' })).toBe('daemon off;');
    });

    test('单个 directive 含参数', () => {
        const out = formatNginx('worker_processes  auto;', { indent: '    ' });
        expect(out).toBe('worker_processes auto;');
    });

    test('多条 directive 平铺', () => {
        const out = formatNginx('a 1; b 2; c 3;', { indent: '    ' });
        expect(out).toBe('a 1;\nb 2;\nc 3;');
    });

    test('缩进控制 - 2 空格', () => {
        const out = formatNginx('http { server { listen 80; } }', { indent: '  ' });
        expect(out).toBe('http {\n  server {\n    listen 80;\n  }\n}');
    });

    test('缩进控制 - 4 空格（默认）', () => {
        const out = formatNginx('http { server { listen 80; } }', { indent: '    ' });
        expect(out).toBe('http {\n    server {\n        listen 80;\n    }\n}');
    });

    test('缩进控制 - Tab', () => {
        const out = formatNginx('http { server { listen 80; } }', { indent: '\t' });
        expect(out).toBe('http {\n\tserver {\n\t\tlisten 80;\n\t}\n}');
    });

    test('多参数 directive', () => {
        const out = formatNginx('  listen  80  default_server;', { indent: '    ' });
        expect(out).toBe('listen 80 default_server;');
    });

    test('空输入返回空字符串', () => {
        expect(formatNginx('', { indent: '    ' })).toBe('');
    });
});

describe('formatNginx 块嵌套', () => {
    test('http → server 一层嵌套', () => {
        const out = formatNginx('http{server{listen 80;}}', { indent: '    ' });
        expect(out).toBe('http {\n' + '    server {\n' + '        listen 80;\n' + '    }\n' + '}');
    });

    test('http → server → location 三层嵌套', () => {
        const src = 'http { server { location /api/ { proxy_pass http://x; } } }';
        const out = formatNginx(src, { indent: '    ' });
        expect(out).toBe(
            'http {\n' +
                '    server {\n' +
                '        location /api/ {\n' +
                '            proxy_pass http://x;\n' +
                '        }\n' +
                '    }\n' +
                '}'
        );
    });

    test('upstream 含多条 server', () => {
        const src = 'http { upstream b { server 127.0.0.1:80; server 127.0.0.1:81; } }';
        const out = formatNginx(src, { indent: '    ' });
        expect(out).toContain('upstream b {');
        expect(out).toContain('server 127.0.0.1:80;');
        expect(out).toContain('server 127.0.0.1:81;');
        expect(out.split('\n').length).toBe(6);
    });

    test('if block 保留', () => {
        const src = 'server { if ($x) { return 403; } }';
        const out = formatNginx(src, { indent: '    ' });
        expect(out).toContain('if ($x) {');
        expect(out).toContain('return 403;');
    });
});

describe('formatNginx 注释处理', () => {
    test('顶部独立注释行保留', () => {
        const src = '# top comment\ndaemon off;';
        const out = formatNginx(src, { indent: '    ' });
        expect(out).toBe('# top comment\ndaemon off;');
    });

    test('块内注释行保留并缩进', () => {
        const src = 'http {\n    # inner comment\n    listen 80;\n}';
        const out = formatNginx(src, { indent: '    ' });
        expect(out).toContain('    # inner comment');
        expect(out).toContain('    listen 80;');
    });

    test('行尾注释保留', () => {
        const src = 'listen 80; # default port';
        const out = formatNginx(src, { indent: '    ' });
        expect(out).toBe('listen 80; # default port');
    });

    test('字符串内的 # 视为内容不视为注释', () => {
        const src = 'set $x "abc#def";';
        const out = formatNginx(src, { indent: '    ' });
        expect(out).toBe('set $x "abc#def";');
    });
});

describe('formatNginx 字符串字面量', () => {
    test('双引号字符串保留', () => {
        const out = formatNginx('set $x "hello world";', { indent: '    ' });
        expect(out).toBe('set $x "hello world";');
    });

    test('单引号字符串保留', () => {
        const out = formatNginx("set $x 'hello';", { indent: '    ' });
        expect(out).toBe("set $x 'hello';");
    });

    test('含转义引号的字符串', () => {
        const out = formatNginx('set $x "he said \\"hi\\"";', { indent: '    ' });
        expect(out).toBe('set $x "he said \\"hi\\"";');
    });
});

describe('formatNginx location 正则', () => {
    test('location ~ 正则含点号转义', () => {
        const src = 'server { location ~ \\.php$ { fastcgi_pass unix:/tmp/php.sock; } }';
        const out = formatNginx(src, { indent: '    ' });
        expect(out).toContain('location ~ \\.php$ {');
        expect(out).toContain('fastcgi_pass unix:/tmp/php.sock;');
    });

    test('location ~* 大小写不敏感正则', () => {
        const src = 'server { location ~* \\.(gif|jpg|png)$ { expires 30d; } }';
        const out = formatNginx(src, { indent: '    ' });
        expect(out).toContain('location ~* \\.(gif|jpg|png)$ {');
    });

    test('location = 精确匹配', () => {
        const src = 'server { location = /login { return 200; } }';
        const out = formatNginx(src, { indent: '    ' });
        expect(out).toContain('location = /login {');
    });

    test('location / 前缀匹配', () => {
        const src = 'server { location /api/ { proxy_pass http://b; } }';
        const out = formatNginx(src, { indent: '    ' });
        expect(out).toContain('location /api/ {');
    });
});

// ============================================================
// minifyNginx 测试
// ============================================================
describe('minifyNginx', () => {
    test('删除多余空白与多余空行', () => {
        const src = 'http  {\n\n   server  {\n     listen   80 ;\n   }\n}';
        const out = minifyNginx(src);
        expect(out).toBe('http {\nserver {\nlisten 80;\n}\n}');
    });

    test('删除行内 # 注释', () => {
        const src = 'daemon off; # remove this\nlisten 80;';
        const out = minifyNginx(src);
        expect(out).not.toContain('# remove');
        expect(out).toBe('daemon off;\nlisten 80;');
    });

    test('保留字符串字面量', () => {
        const out = minifyNginx('set $x "a  b  c";');
        expect(out).toBe('set $x "a  b  c";');
    });

    test('保留块结构', () => {
        const src = 'http { server { listen 80; } }';
        const out = minifyNginx(src);
        expect(out).toBe('http {\nserver {\nlisten 80;\n}\n}');
    });

    test('空输入返回空字符串', () => {
        expect(minifyNginx('')).toBe('');
    });

    test('仅注释输入返回空', () => {
        expect(minifyNginx('# only comments\n# here')).toBe('');
    });
});

// ============================================================
// lintNginx 测试
// ============================================================
describe('lintNginx duplicate-directive', () => {
    test('同一 server 内两个 listen 报错', () => {
        const src = 'server {\n  listen 80;\n  listen 443;\n}';
        const issues = lintNginx(src);
        const dups = issues.filter((i) => i.rule === 'duplicate-directive');
        expect(dups.length).toBe(1);
        expect(dups[0].msg).toContain('listen');
        expect(dups[0].line).toBe(3);
    });

    test('三个同名 directive 报 2 条', () => {
        const src = 'server {\n  listen 80;\n  listen 81;\n  listen 82;\n}';
        const issues = lintNginx(src);
        const dups = issues.filter((i) => i.rule === 'duplicate-directive');
        expect(dups.length).toBe(2);
    });

    test('不同 block 内同名 listen 不报错', () => {
        const src = 'http {\n  server { listen 80; }\n  server { listen 81; }\n}';
        const issues = lintNginx(src);
        const dups = issues.filter((i) => i.rule === 'duplicate-directive');
        expect(dups.length).toBe(0);
    });

    test('include 重复被豁免', () => {
        const src = 'http {\n  include a.conf;\n  include b.conf;\n  include c.conf;\n}';
        const issues = lintNginx(src);
        const dups = issues.filter((i) => i.rule === 'duplicate-directive');
        expect(dups.length).toBe(0);
    });

    test('access_log 重复被豁免', () => {
        const src = 'server {\n  access_log /var/log/a;\n  access_log /var/log/b;\n}';
        const issues = lintNginx(src);
        const dups = issues.filter((i) => i.rule === 'duplicate-directive');
        expect(dups.length).toBe(0);
    });

    test('嵌套块内重复指令也能识别', () => {
        const src =
            'http {\n' +
            '  server {\n' +
            '    location /a { return 200; }\n' +
            '    location /b { return 200; }\n' +
            '  }\n' +
            '}';
        const issues = lintNginx(src);
        const dups = issues.filter((i) => i.rule === 'duplicate-directive');
        expect(dups.length).toBe(1);
        expect(dups[0].msg).toContain('location');
    });
});

describe('lintNginx missing-semicolon', () => {
    test('指令结尾缺分号报错', () => {
        const issues = lintNginx('listen 80');
        const m = issues.filter((i) => i.rule === 'missing-semicolon');
        expect(m.length).toBe(1);
        expect(m[0].line).toBe(1);
    });

    test('带 ; 的正常指令不报', () => {
        const issues = lintNginx('listen 80;');
        const m = issues.filter((i) => i.rule === 'missing-semicolon');
        expect(m.length).toBe(0);
    });

    test('以 { 结尾的 block 起始不报缺分号', () => {
        const issues = lintNginx('http {');
        const m = issues.filter((i) => i.rule === 'missing-semicolon');
        expect(m.length).toBe(0);
    });

    test('纯 } 行不报缺分号', () => {
        const issues = lintNginx('http { listen 80; }');
        const m = issues.filter((i) => i.rule === 'missing-semicolon');
        expect(m.length).toBe(0);
    });

    test('注释行不报缺分号', () => {
        const issues = lintNginx('# just a comment');
        const m = issues.filter((i) => i.rule === 'missing-semicolon');
        expect(m.length).toBe(0);
    });

    test('字符串内 ; 不影响缺分号判断', () => {
        const issues = lintNginx('set $x "a;b"');
        const m = issues.filter((i) => i.rule === 'missing-semicolon');
        expect(m.length).toBe(1);
    });
});

describe('lintNginx unbalanced-brace', () => {
    test('{ 多于 } 报错', () => {
        const issues = lintNginx('http { server { listen 80;');
        const u = issues.filter((i) => i.rule === 'unbalanced-brace');
        expect(u.length).toBe(1);
        expect(u[0].severity).toBe('error');
    });

    test('} 多于 { 报错', () => {
        const issues = lintNginx('http { server { listen 80; } } }');
        const u = issues.filter((i) => i.rule === 'unbalanced-brace');
        expect(u.length).toBe(1);
    });

    test('平衡时不报', () => {
        const issues = lintNginx('http { server { listen 80; } }');
        const u = issues.filter((i) => i.rule === 'unbalanced-brace');
        expect(u.length).toBe(0);
    });

    test('字符串内 { 不计入', () => {
        // 字符串内的 { 在 masked 中被替换为空格，不计入大括号数
        // 该行尾有 ; 故 missing-semicolon 不触发
        const issues = lintNginx('set $x "{abc";');
        const u = issues.filter((i) => i.rule === 'unbalanced-brace');
        const m = issues.filter((i) => i.rule === 'missing-semicolon');
        expect(u.length).toBe(0);
        expect(m.length).toBe(0);
    });
});

// ============================================================
// parseNginx 测试
// ============================================================
describe('parseNginx AST 结构', () => {
    test('顶层 directive 结构正确', () => {
        const ast = parseNginx('daemon off;');
        expect(ast.length).toBe(1);
        expect(ast[0].directive).toBe('daemon');
        expect(ast[0].args).toEqual(['off']);
        expect(ast[0].isBlock).toBe(false);
        expect(ast[0].line).toBe(1);
        expect(ast[0].col).toBe(1);
    });

    test('block 含 children', () => {
        const ast = parseNginx('http { listen 80; }');
        expect(ast.length).toBe(1);
        expect(ast[0].directive).toBe('http');
        expect(ast[0].isBlock).toBe(true);
        expect(ast[0].blockKind).toBe('http');
        expect(ast[0].children.length).toBe(1);
        expect(ast[0].children[0].directive).toBe('listen');
    });

    test('嵌套结构正确', () => {
        const ast = parseNginx('http { server { location / { return 200; } } }');
        const http = ast[0];
        expect(http.directive).toBe('http');
        const server = http.children[0];
        expect(server.directive).toBe('server');
        expect(server.children[0].directive).toBe('location');
        const loc = server.children[0];
        expect(loc.children[0].directive).toBe('return');
    });

    test('空输入返回空数组', () => {
        expect(parseNginx('')).toEqual([]);
    });

    test('value 字段拼接 args', () => {
        const ast = parseNginx('listen 80 default_server;');
        expect(ast[0].value).toBe('80 default_server');
    });
});

// ============================================================
// countBlocks 测试
// ============================================================
describe('countBlocks', () => {
    test('统计 http/server/location/upstream', () => {
        const src =
            'http {\n' +
            '  server { location /a { return 200; } }\n' +
            '  server { location /b { return 200; } }\n' +
            '  upstream b { server 127.0.0.1:80; }\n' +
            '}';
        const c = countBlocks(src);
        expect(c.http).toBe(1);
        expect(c.server).toBe(2);
        expect(c.location).toBe(2);
        expect(c.upstream).toBe(1);
        expect(c.total).toBe(6);
    });

    test('空输入全 0', () => {
        const c = countBlocks('');
        expect(c.total).toBe(0);
        expect(c.http).toBe(0);
    });

    test('if block 计数', () => {
        const src = 'server {\n  if ($a) { return 403; }\n  if ($b) { return 404; }\n}';
        const c = countBlocks(src);
        expect(c.if).toBe(2);
    });
});
