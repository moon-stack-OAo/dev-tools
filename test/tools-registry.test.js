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

    test('工具均有 tags 且数量一致', () => {
        expect(reg.tools.length).toBe(158);
        reg.tools.forEach((t) => {
            expect(Array.isArray(t.tags)).toBe(true);
            expect(t.tags.length).toBeGreaterThan(0);
        });
        const java = reg.tools.filter((t) => t.tags.includes('java'));
        const common = reg.tools.filter((t) => t.tags.includes('common'));
        const frontend = reg.tools.filter((t) => t.tags.includes('frontend'));
        const backend = reg.tools.filter((t) => t.tags.includes('backend'));
        expect(java.length).toBeGreaterThanOrEqual(38);
        expect(java.length).toBeLessThanOrEqual(40);
        expect(common.length).toBeGreaterThan(100);
        expect(frontend.length).toBeGreaterThan(20);
        expect(backend.length).toBeGreaterThan(80);
        // 非 java 工具应带 common
        reg.tools
            .filter((t) => !t.tags.includes('java'))
            .forEach((t) => expect(t.tags).toContain('common'));
    });

    test('toolMatchesAudience', () => {
        const javaTool = reg.tools.find((t) => t.id === 'jsontopojo');
        const commonTool = reg.tools.find((t) => t.id === 'json');
        const feTool = reg.tools.find((t) => t.id === 'json2ts');
        const beTool = reg.tools.find((t) => t.id === 'sql');
        expect(reg.toolMatchesAudience(javaTool, 'all')).toBe(true);
        expect(reg.toolMatchesAudience(javaTool, 'java')).toBe(true);
        expect(reg.toolMatchesAudience(javaTool, 'common')).toBe(false);
        expect(reg.toolMatchesAudience(javaTool, 'frontend')).toBe(false);
        expect(reg.toolMatchesAudience(javaTool, 'backend')).toBe(true);
        expect(reg.toolMatchesAudience(commonTool, 'common')).toBe(true);
        expect(reg.toolMatchesAudience(commonTool, 'java')).toBe(false);
        expect(reg.toolMatchesAudience(commonTool, 'frontend')).toBe(true);
        expect(reg.toolMatchesAudience(commonTool, 'backend')).toBe(true);
        expect(reg.toolMatchesAudience(commonTool, 'all')).toBe(true);
        expect(reg.toolMatchesAudience(feTool, 'frontend')).toBe(true);
        expect(reg.toolMatchesAudience(feTool, 'common')).toBe(true);
        expect(reg.toolMatchesAudience(beTool, 'backend')).toBe(true);
        expect(reg.toolMatchesAudience(beTool, 'frontend')).toBe(false);
    });

    test('通用工具不误标 java；多标签样例', () => {
        ['httpdebug', 'plantuml', 'json2code', 'morse', 'json2ts', 'imgshuffle'].forEach((id) => {
            const t = reg.toolsById.get(id);
            expect(t).toBeTruthy();
            expect(t.tags).toContain('common');
            expect(t.tags).not.toContain('java');
        });
        expect(reg.toolsById.get('json2ts').tags).toContain('frontend');
        expect(reg.toolsById.get('imgshuffle').tags).toContain('frontend');
        const jsontopojo = reg.toolsById.get('jsontopojo');
        expect(jsontopojo.tags).toContain('java');
        expect(jsontopojo.tags).not.toContain('common');
        expect(reg.toolsById.get('lombok').tags).not.toContain('common');
    });
});
