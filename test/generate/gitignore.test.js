const {
    gitignoreTemplates,
    gitignoreGetTemplate,
    gitignoreMerge,
} = require('../../js/generate/gitignore.js');

describe('gitignoreTemplates', () => {
    test('id 唯一', () => {
        const ids = gitignoreTemplates.map((t) => t.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    test('至少覆盖 Node / Java / VSCode', () => {
        expect(gitignoreGetTemplate('node')).toBeTruthy();
        expect(gitignoreGetTemplate('java')).toBeTruthy();
        expect(gitignoreGetTemplate('vscode')).toBeTruthy();
        expect(gitignoreGetTemplate('node').rules.length).toBeGreaterThan(0);
    });
});

describe('gitignoreGetTemplate', () => {
    test('未知 id 返回 null', () => {
        expect(gitignoreGetTemplate('nope')).toBeNull();
        expect(gitignoreGetTemplate('')).toBeNull();
    });
});

describe('gitignoreMerge', () => {
    test('空选择返回提示', () => {
        const t = gitignoreMerge([]);
        expect(t).toMatch(/请勾选|模板/);
    });

    test('注释头', () => {
        const t = gitignoreMerge(['node']);
        expect(t).toContain('# === Node ===');
        expect(t).toContain('node_modules/');
    });

    test('去重相同规则行，保留首次', () => {
        const t = gitignoreMerge(['node', 'vue']);
        const lines = t.split('\n').filter((l) => l && !l.startsWith('#'));
        const counts = {};
        lines.forEach((l) => {
            counts[l] = (counts[l] || 0) + 1;
        });
        expect(counts['node_modules/']).toBe(1);
        expect(counts['dist/']).toBe(1);
        // Node 段在前
        const nodeIdx = t.indexOf('# === Node ===');
        const vueIdx = t.indexOf('# === Vue/Vite ===');
        expect(nodeIdx).toBeGreaterThanOrEqual(0);
        expect(vueIdx).toBeGreaterThan(nodeIdx);
    });

    test('多模板顺序拼接', () => {
        const t = gitignoreMerge(['java', 'vscode']);
        expect(t).toContain('# === Java ===');
        expect(t).toContain('# === VS Code ===');
        expect(t).toContain('target/');
        expect(t).toContain('.vscode/*');
    });
});
