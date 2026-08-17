const { svgoptOptimize, svgoptToDataUri, svgoptDefaultOpts, svgoptByteLen } = require('../../js/generate/svgopt.js');

describe('svgoptDefaultOpts', () => {
    test('默认开启注释/空白/inkscape', () => {
        const o = svgoptDefaultOpts();
        expect(o.stripComments).toBe(true);
        expect(o.collapseWhitespace).toBe(true);
        expect(o.stripInkscape).toBe(true);
        expect(o.stripWidthHeight).toBe(false);
    });
});

describe('svgoptOptimize', () => {
    test('去掉注释', () => {
        const svg = '<svg xmlns="http://www.w3.org/2000/svg"><!-- hi --><rect/></svg>';
        const r = svgoptOptimize(svg);
        expect(r.ok).toBe(true);
        expect(r.svg).not.toMatch(/<!--/);
        expect(r.svg).toMatch(/<rect/);
    });

    test('压缩空白', () => {
        const svg = '<svg xmlns="http://www.w3.org/2000/svg">\n  <circle cx="1" cy="1" r="1" />\n</svg>';
        const r = svgoptOptimize(svg, { collapseWhitespace: true });
        expect(r.ok).toBe(true);
        expect(r.svg).not.toMatch(/>\s+</);
        expect(r.after).toBeLessThan(r.before);
    });

    test('去掉 inkscape 属性', () => {
        const svg =
            '<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" inkscape:version="1.0" xml:space="preserve"><path d="M0 0"/></svg>';
        const r = svgoptOptimize(svg);
        expect(r.ok).toBe(true);
        expect(r.svg).not.toMatch(/inkscape/);
        expect(r.svg).not.toMatch(/xml:space/);
    });

    test('可选去掉 width/height', () => {
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50" viewBox="0 0 100 50"></svg>';
        const r = svgoptOptimize(svg, { stripWidthHeight: true });
        expect(r.ok).toBe(true);
        expect(r.svg).not.toMatch(/\bwidth=/);
        expect(r.svg).not.toMatch(/\bheight=/);
        expect(r.svg).toMatch(/viewBox=/);
    });

    test('空输入失败', () => {
        const r = svgoptOptimize('  ');
        expect(r.ok).toBe(false);
        expect(r.msg).toMatch(/粘贴/);
    });

    test('无 svg 根失败', () => {
        const r = svgoptOptimize('<div></div>');
        expect(r.ok).toBe(false);
    });
});

describe('svgoptToDataUri', () => {
    test('前缀 data:image/svg+xml', () => {
        const uri = svgoptToDataUri('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
        expect(uri.startsWith('data:image/svg+xml,')).toBe(true);
        expect(uri).toMatch(/svg/);
    });

    test('空串返回空', () => {
        expect(svgoptToDataUri('')).toBe('');
    });
});

describe('svgoptByteLen', () => {
    test('中文多字节', () => {
        expect(svgoptByteLen('测')).toBeGreaterThan(1);
    });
});
