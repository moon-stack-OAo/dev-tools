// Markdown 预览

const MD_SAMPLE = `# Hello DevTools

这是一段 **Markdown** 演示，包含 *斜体*、\`行内代码\` 和 [链接](https://github.com)。

## 代码块

\`\`\`javascript
function greet(name) {
    return \`Hello, \${name}!\`;
}
console.log(greet('World'));
\`\`\`

## 任务列表

- [x] 支持 GFM 表格
- [x] 支持任务列表
- [x] 支持删除线 ~~old~~
- [ ] 支持自定义扩展

## 表格

| 工具 | 用途 | 状态 |
| --- | --- | --- |
| JSON 格式化 | 美化 JSON | ✓ |
| Markdown | 实时预览 | ✓ |
| 二维码 | 内容编码 | ✓ |

> 提示：上方勾选/取消 **GFM** 开关可观察差异。`;

let mdDebounceTimer = null;
let mdInited = false;
let mdInputEl, mdPreviewEl, mdGfmEl, mdStatCharsEl, mdStatWordsEl, mdStatLinesEl;

// 面板首次打开时缓存 DOM 引用并绑定 scoped 监听器（替代原先挂在 document 上的全局 input 代理）
function mdInit() {
    if (mdInited) return;
    mdInputEl = document.getElementById('mdInput');
    mdPreviewEl = document.getElementById('mdPreview');
    mdGfmEl = document.getElementById('mdGfm');
    mdStatCharsEl = document.getElementById('mdStatChars');
    mdStatWordsEl = document.getElementById('mdStatWords');
    mdStatLinesEl = document.getElementById('mdStatLines');
    if (mdInputEl) mdInputEl.addEventListener('input', mdOnInput);
    if (mdGfmEl) mdGfmEl.addEventListener('change', mdRender);
    mdInited = true;
}

function mdRender() {
    const input = mdInputEl.value;
    if (typeof marked === 'undefined') {
        mdPreviewEl.textContent = 'marked 库未加载';
        mdPreviewEl.style.color = 'var(--danger)';
        mdUpdateStats(input);
        return;
    }
    try {
        const html = marked.parse(input, {gfm: mdGfmEl.checked, breaks: false});
        mdPreviewEl.innerHTML = html;
        mdPreviewEl.style.color = '';
        setStatus('Markdown 渲染完成');
    } catch (e) {
        mdPreviewEl.textContent = '渲染失败: ' + e.message;
        mdPreviewEl.style.color = 'var(--danger)';
    }
    mdUpdateStats(input);
}

function mdUpdateStats(v) {
    if (v === undefined) v = mdInputEl.value;
    mdStatCharsEl.textContent = v.length;
    mdStatWordsEl.textContent = (v.match(/[\w\u4e00-\u9fa5]+/g) || []).length;
    mdStatLinesEl.textContent = v ? v.split('\n').length : 0;
}

function mdOnInput() {
    clearTimeout(mdDebounceTimer);
    mdDebounceTimer = setTimeout(mdRender, 200);
}

function mdCopyHtml() {
    const html = mdPreviewEl.innerHTML;
    if (!html) {
        toast('暂无渲染内容');
        return;
    }
    safeCopy(html, 'HTML 已复制');
}

function mdCopyMd() {
    const md = mdInputEl.value;
    if (!md) {
        toast('暂无 Markdown 内容');
        return;
    }
    safeCopy(md, 'Markdown 已复制');
}

function mdExportHtml() {
    const body = mdPreviewEl.innerHTML;
    if (!body) {
        toast('请先输入 Markdown 并预览');
        return;
    }
    const style = `body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:860px;margin:40px auto;padding:0 20px;line-height:1.7;color:#1a1a1a}
h1,h2,h3,h4{line-height:1.3;margin:1.4em 0 .6em}
h1{font-size:1.8em;border-bottom:1px solid #e5e7eb;padding-bottom:.3em}
h2{font-size:1.4em;border-bottom:1px solid #e5e7eb;padding-bottom:.2em}
h3{font-size:1.2em}
code{background:#f3f4f6;padding:1px 5px;border-radius:3px;font-size:.9em}
pre{background:#1a1f33;color:#e8edf5;padding:14px 16px;border-radius:6px;overflow:auto}
pre code{background:transparent;color:inherit;padding:0}
blockquote{border-left:3px solid #00d4aa;background:#f0fdf4;margin:1em 0;padding:6px 12px;color:#475569}
table{border-collapse:collapse;margin:1em 0;width:100%}
th,td{border:1px solid #d1d5db;padding:6px 12px;text-align:left}
th{background:#f3f4f6;font-weight:600}
a{color:#2563eb;text-decoration:none}
a:hover{text-decoration:underline}
hr{border:0;border-top:1px solid #e5e7eb;margin:1.5em 0}`;
    const full = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Markdown 导出</title><style>${style}</style></head><body>${body}</body></html>`;
    const blob = new Blob([full], {type: 'text/html;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'output.html';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
    }, 100);
    toast('已导出 output.html');
}

function mdClear() {
    mdInputEl.value = '';
    mdPreviewEl.innerHTML = '';
    mdUpdateStats('');
    setStatus('已清空');
}

function mdLoadSample() {
    mdInputEl.value = MD_SAMPLE;
    mdRender();
    setStatus('已加载示例');
}

registerInit('markdown', mdInit);
