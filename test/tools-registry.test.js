/**
 * tools-registry 为浏览器全局脚本；此处用 vm 执行后校验 tags 与 toolMatchesAudience。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadRegistry() {
    const code =
        fs.readFileSync(path.join(__dirname, '../js/tools-registry.js'), 'utf8') +
        '\n;globalThis.__REG__ = { tools: tools, categories: categories, toolsById: toolsById, toolMatchesAudience: toolMatchesAudience };';
    const sandbox = { Map, console, globalThis: {} };
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox);
    return sandbox.__REG__;
}

describe('tools-registry audience tags', () => {
    const reg = loadRegistry();

    test('共 156 个工具且均有 tags', () => {
        expect(reg.tools).toHaveLength(156);
        reg.tools.forEach((t) => {
            expect(Array.isArray(t.tags)).toBe(true);
            expect(t.tags.length).toBeGreaterThan(0);
        });
    });

    test('java 38 / common 118', () => {
        const java = reg.tools.filter((t) => t.tags.includes('java'));
        const common = reg.tools.filter((t) => t.tags.includes('common'));
        expect(java).toHaveLength(38);
        expect(common).toHaveLength(118);
    });

    test('toolMatchesAudience', () => {
        const javaTool = reg.tools.find((t) => t.id === 'jsontopojo');
        const commonTool = reg.tools.find((t) => t.id === 'json');
        expect(reg.toolMatchesAudience(javaTool, 'all')).toBe(true);
        expect(reg.toolMatchesAudience(javaTool, 'java')).toBe(true);
        expect(reg.toolMatchesAudience(javaTool, 'common')).toBe(false);
        expect(reg.toolMatchesAudience(commonTool, 'common')).toBe(true);
        expect(reg.toolMatchesAudience(commonTool, 'java')).toBe(false);
        expect(reg.toolMatchesAudience(commonTool, 'all')).toBe(true);
    });

    test('通用工具不误标 java', () => {
        ['httpdebug', 'plantuml', 'json2code', 'morse'].forEach((id) => {
            const t = reg.toolsById.get(id);
            expect(t.tags).toContain('common');
            expect(t.tags).not.toContain('java');
        });
    });
});
