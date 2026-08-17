const {
    csselectorQuery,
    csselectorValidateSelector,
    csselectorSerializeMatches,
    csselectorGetSampleHtml,
} = require('../../js/debug/csselector.js');

describe('csselectorSerializeMatches', () => {
    test('空列表', () => {
        expect(csselectorSerializeMatches([])).toEqual([]);
        expect(csselectorSerializeMatches(null)).toEqual([]);
    });

    test('序列化 outerHTML', () => {
        const nodes = [{ outerHTML: '<div class="x">a</div>' }, { outerHTML: '<span>b</span>' }];
        expect(csselectorSerializeMatches(nodes)).toEqual(['<div class="x">a</div>', '<span>b</span>']);
    });

    test('max 限制', () => {
        const nodes = [{ outerHTML: '1' }, { outerHTML: '2' }, { outerHTML: '3' }];
        expect(csselectorSerializeMatches(nodes, 2)).toEqual(['1', '2']);
    });
});

describe('csselectorValidateSelector', () => {
    test('空选择器', () => {
        const r = csselectorValidateSelector('');
        expect(r.ok).toBe(false);
        expect(r.msg).toMatch(/选择器/);
    });

    test('无 DOM 环境', () => {
        const r = csselectorValidateSelector('.btn', null);
        expect(r.ok).toBe(false);
        expect(r.msg).toMatch(/DOM|不支持/);
    });
});

describe('csselectorQuery', () => {
    test('空选择器', () => {
        const r = csselectorQuery('<div></div>', '');
        expect(r.ok).toBe(false);
        expect(r.msg).toMatch(/选择器/);
    });

    test('无 DOM 时返回环境不支持', () => {
        const hasDom =
            typeof document !== 'undefined' &&
            document.implementation &&
            typeof DOMParser !== 'undefined';
        if (hasDom) {
            // 浏览器环境跳过该分支
            expect(true).toBe(true);
            return;
        }
        const r = csselectorQuery('<div class="a"></div>', '.a', null);
        expect(r.ok).toBe(false);
        expect(r.msg).toMatch(/DOM|不支持/);
    });

    test('有 DOMParser 时匹配 class', () => {
        if (typeof DOMParser === 'undefined') {
            expect(csselectorGetSampleHtml()).toContain('class=');
            return;
        }
        const html = '<div class="box"><span class="item">x</span><span class="item">y</span></div>';
        const r = csselectorQuery(html, '.item');
        expect(r.ok).toBe(true);
        expect(r.count).toBe(2);
        expect(r.matches.length).toBe(2);
        expect(r.matches[0]).toMatch(/item/);
    });

    test('无效选择器', () => {
        if (typeof DOMParser === 'undefined') {
            const r = csselectorQuery('<div></div>', '[[[', null);
            expect(r.ok).toBe(false);
            return;
        }
        const r = csselectorQuery('<div></div>', '[[[');
        expect(r.ok).toBe(false);
        expect(r.msg).toMatch(/选择器|无效/);
    });
});

describe('csselectorGetSampleHtml', () => {
    test('返回非空 HTML 片段', () => {
        const s = csselectorGetSampleHtml();
        expect(s).toContain('div');
        expect(s.length).toBeGreaterThan(20);
    });
});
