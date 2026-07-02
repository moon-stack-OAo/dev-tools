// 测试环境全局垫片：工具文件中 registerInit/escapeHtml 等由 app.js 在浏览器提供的全局，
// 在 Node 测试环境中 require 工具文件时会因顶层调用而报错，这里提供等价的空实现或简化实现。
if (typeof global.registerInit === 'undefined') global.registerInit = function () {};

if (typeof global.escapeHtml === 'undefined') {
    global.escapeHtml = function (s) {
        if (s === undefined || s === null) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };
}
