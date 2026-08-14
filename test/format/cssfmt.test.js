const { cssMinifyPure } = require('../../js/format/cssfmt.js');

describe('cssMinifyPure', () => {
    test('空输入', () => {
        expect(cssMinifyPure('')).toBe('');
        expect(cssMinifyPure(null)).toBe('');
        expect(cssMinifyPure(undefined)).toBe('');
    });

    test('去除注释', () => {
        expect(cssMinifyPure('/* c */.a{color:red}')).toBe('.a{color:red}');
        expect(cssMinifyPure('.a{/*x*/color:red}')).toBe('.a{color:red}');
    });

    test('压缩选择器与声明空白', () => {
        const src = `
.card {
  color: #333;
  background: #fff;
  padding: 10px 20px;
}
`;
        expect(cssMinifyPure(src)).toBe('.card{color:#333;background:#fff;padding:10px 20px}');
    });

    test('去掉末尾分号前的 ;}', () => {
        expect(cssMinifyPure('.a{color:red;}')).toBe('.a{color:red}');
    });

    test('多规则与媒体查询', () => {
        const src = '.a{color:red}\n.b { margin : 0 ; }\n@media (max-width: 640px) { .a { padding: 8px; } }';
        const out = cssMinifyPure(src);
        expect(out).toContain('.a{color:red}');
        expect(out).toContain('.b{margin:0}');
        expect(out).toContain('@media (max-width:640px)');
        expect(out).not.toMatch(/\s{2,}/);
        expect(out).not.toContain('\n');
    });
});
