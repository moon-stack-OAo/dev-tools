// utils.js — 通用工具（ADR PR-1.3 / Phase 3）
// 浏览器全局脚本；亦可在 Node 测试中 require 纯函数部分。
// 包含：escapeHtml / debounce / formatBytes / download* / readFile*

/**
 * HTML 转义（动态内容入 DOM 前统一使用）
 * @param {*} s
 * @returns {string}
 */
function escapeHtml(s) {
    if (s === undefined || s === null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * 简单防抖
 * @param {Function} fn
 * @param {number} ms
 * @returns {Function}
 */
function debounce(fn, ms) {
    var t;
    return function () {
        var args = arguments;
        var self = this;
        clearTimeout(t);
        t = setTimeout(function () {
            fn.apply(self, args);
        }, ms);
    };
}

/**
 * 人类可读字节数；空值/非数安全
 * @param {number} n
 * @returns {string}
 */
function formatBytes(n) {
    var num = Number(n);
    if (!isFinite(num) || num < 0) return '0 B';
    if (num < 1024) return Math.round(num) + ' B';
    if (num < 1024 * 1024) return (num / 1024).toFixed(1) + ' KB';
    if (num < 1024 * 1024 * 1024) return (num / 1024 / 1024).toFixed(2) + ' MB';
    return (num / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

/**
 * 触发 Blob 下载并 revokeObjectURL
 * @param {string} filename
 * @param {Blob} blob
 */
function downloadBlob(filename, blob) {
    if (typeof document === 'undefined' || typeof URL === 'undefined') {
        throw new Error('downloadBlob 仅可在浏览器环境使用');
    }
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename || 'download';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () {
        try {
            URL.revokeObjectURL(url);
        } catch (e) {}
    }, 1000);
}

/**
 * 下载文本文件
 * @param {string} filename
 * @param {string} text
 * @param {string} [mime]
 */
function downloadText(filename, text, mime) {
    var type = mime || 'text/plain;charset=utf-8';
    var blob = new Blob([text == null ? '' : String(text)], { type: type });
    downloadBlob(filename, blob);
}

/**
 * File/Blob → 文本
 * @param {Blob} file
 * @param {string} [encoding]
 * @returns {Promise<string>}
 */
function readFileAsText(file, encoding) {
    return new Promise(function (resolve, reject) {
        if (!(file instanceof Blob)) {
            reject(new Error('参数必须是 File 或 Blob'));
            return;
        }
        var reader = new FileReader();
        reader.onload = function () {
            resolve(String(reader.result || ''));
        };
        reader.onerror = function () {
            reject(new Error('文件读取失败'));
        };
        if (encoding) reader.readAsText(file, encoding);
        else reader.readAsText(file);
    });
}

/**
 * File/Blob → Uint8Array
 * @param {Blob} file
 * @returns {Promise<Uint8Array>}
 */
function readFileAsBytes(file) {
    return new Promise(function (resolve, reject) {
        if (!(file instanceof Blob)) {
            reject(new Error('参数必须是 File 或 Blob'));
            return;
        }
        var reader = new FileReader();
        reader.onload = function () {
            resolve(new Uint8Array(reader.result));
        };
        reader.onerror = function () {
            reject(new Error('文件读取失败'));
        };
        reader.readAsArrayBuffer(file);
    });
}

(function attachUtils(g) {
    if (!g) return;
    g.escapeHtml = escapeHtml;
    g.debounce = debounce;
    g.formatBytes = formatBytes;
    g.downloadBlob = downloadBlob;
    g.downloadText = downloadText;
    g.readFileAsText = readFileAsText;
    g.readFileAsBytes = readFileAsBytes;
})(
    typeof globalThis !== 'undefined'
        ? globalThis
        : typeof window !== 'undefined'
          ? window
          : typeof global !== 'undefined'
            ? global
            : null
);

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        escapeHtml: escapeHtml,
        debounce: debounce,
        formatBytes: formatBytes,
        downloadBlob: downloadBlob,
        downloadText: downloadText,
        readFileAsText: readFileAsText,
        readFileAsBytes: readFileAsBytes,
    };
}
