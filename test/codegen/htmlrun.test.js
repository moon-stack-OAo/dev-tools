const {
    htmlrunIsFullDocument,
    htmlrunBuildDocument,
    htmlrunDefaultSample,
} = require('../../js/codegen/htmlrun.js');

describe('htmlrunIsFullDocument', () => {
    test('空与片段为 false', () => {
        expect(htmlrunIsFullDocument('')).toBe(false);
        expect(htmlrunIsFullDocument(null)).toBe(false);
        expect(htmlrunIsFullDocument('<div>hi</div>')).toBe(false);
        expect(htmlrunIsFullDocument('<body>x</body>')).toBe(false);
    });

    test('DOCTYPE 或 html 标签为 true', () => {
        expect(htmlrunIsFullDocument('<!DOCTYPE html><html></html>')).toBe(true);
        expect(htmlrunIsFullDocument('<!doctype html>')).toBe(true);
        expect(htmlrunIsFullDocument('<html lang="zh">')).toBe(true);
        expect(htmlrunIsFullDocument('  <HTML>')).toBe(true);
    });
});

describe('htmlrunBuildDocument 片段包装', () => {
    test('包装含 style 与 script', () => {
        const doc = htmlrunBuildDocument({
            html: '<p id="t">hi</p>',
            css: 'p { color: red; }',
            js: 'document.getElementById("t").textContent = "ok";',
            title: 'Test',
        });
        expect(doc).toMatch(/<!DOCTYPE html>/i);
        expect(doc).toContain('<meta charset="utf-8">');
        expect(doc).toContain('<title>Test</title>');
        expect(doc).toContain('<style>\np { color: red; }\n</style>');
        expect(doc).toContain('<p id="t">hi</p>');
        expect(doc).toContain('<script>\ndocument.getElementById("t").textContent = "ok";\n</script>');
        expect(doc).toMatch(/<\/body>/i);
    });

    test('无 css/js 时不插入空标签', () => {
        const doc = htmlrunBuildDocument({ html: '<span>a</span>' });
        expect(doc).toContain('<span>a</span>');
        expect(doc).not.toMatch(/<style>/);
        expect(doc).not.toMatch(/<script>/);
    });
});

describe('htmlrunBuildDocument 完整文档注入', () => {
    test('注入 CSS 到 head、JS 到 body 前', () => {
        const full =
            '<!DOCTYPE html><html><head><title>X</title></head><body><div>body</div></body></html>';
        const doc = htmlrunBuildDocument({
            html: full,
            css: '.x{color:blue}',
            js: 'console.log(1)',
        });
        expect(doc).toContain('<style>\n.x{color:blue}\n</style>\n</head>');
        expect(doc).toContain('<script>\nconsole.log(1)\n</script>\n</body>');
        expect(doc).toContain('<div>body</div>');
    });

    test('无 head 时 CSS 插在 body 前', () => {
        const full = '<html><body>ok</body></html>';
        const doc = htmlrunBuildDocument({ html: full, css: 'a{}' });
        expect(doc).toContain('<style>\na{}\n</style>\n<body>');
    });
});

describe('htmlrunDefaultSample', () => {
    test('示例非空且可组装', () => {
        const s = htmlrunDefaultSample();
        expect(s.html && s.html.trim().length).toBeGreaterThan(0);
        expect(s.css && s.css.trim().length).toBeGreaterThan(0);
        expect(s.js && s.js.trim().length).toBeGreaterThan(0);
        const doc = htmlrunBuildDocument(s);
        expect(doc).toMatch(/<!DOCTYPE html>/i);
        expect(doc).toContain('Hello HTML');
    });
});
