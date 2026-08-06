// crypto-utils.js — 二进制编解码公共 API（ADR §4.1）
// 浏览器全局脚本；亦可在 Node 测试中 require。
// 全部操作 Uint8Array / string，禁止静默吞错。

/**
 * @param {ArrayBuffer|Uint8Array|ArrayLike<number>} bytes
 * @returns {Uint8Array}
 */
function _toUint8Array(bytes) {
    if (bytes instanceof Uint8Array) return bytes;
    if (bytes instanceof ArrayBuffer) return new Uint8Array(bytes);
    if (bytes && typeof bytes.byteLength === 'number' && typeof bytes.buffer !== 'undefined') {
        return new Uint8Array(bytes.buffer, bytes.byteOffset || 0, bytes.byteLength);
    }
    return new Uint8Array(bytes);
}

/**
 * lowercase hex，无 0x 前缀
 * @param {ArrayBuffer|Uint8Array} bytes
 * @returns {string}
 */
function bytesToHex(bytes) {
    const arr = _toUint8Array(bytes);
    var out = '';
    for (var i = 0; i < arr.length; i++) {
        var h = arr[i].toString(16);
        out += h.length === 1 ? '0' + h : h;
    }
    return out;
}

/**
 * 忽略空白；非法字符 throw
 * @param {string} hex
 * @returns {Uint8Array}
 */
function hexToBytes(hex) {
    if (hex == null) throw new Error('hex 不能为空');
    var s = String(hex).replace(/\s+/g, '');
    if (s.length % 2 !== 0) throw new Error('hex 长度必须为偶数');
    if (s.length > 0 && !/^[0-9a-fA-F]+$/.test(s)) throw new Error('非法 hex 字符');
    var out = new Uint8Array(s.length / 2);
    for (var i = 0; i < out.length; i++) {
        out[i] = parseInt(s.substr(i * 2, 2), 16);
    }
    return out;
}

/**
 * 标准 Base64；分块避免大数组 apply 栈溢出
 * @param {ArrayBuffer|Uint8Array} bytes
 * @returns {string}
 */
function bytesToBase64(bytes) {
    var arr = _toUint8Array(bytes);
    var bin = '';
    var chunk = 0x8000;
    for (var i = 0; i < arr.length; i += chunk) {
        bin += String.fromCharCode.apply(null, arr.subarray(i, i + chunk));
    }
    if (typeof btoa === 'function') return btoa(bin);
    if (typeof Buffer !== 'undefined') return Buffer.from(arr).toString('base64');
    throw new Error('当前环境不支持 Base64 编码');
}

/**
 * 允许空白；非法 throw
 * @param {string} b64
 * @returns {Uint8Array}
 */
function base64ToBytes(b64) {
    if (b64 == null) throw new Error('base64 不能为空');
    var s = String(b64).replace(/\s+/g, '');
    var bin;
    try {
        if (typeof atob === 'function') bin = atob(s);
        else if (typeof Buffer !== 'undefined') {
            return new Uint8Array(Buffer.from(s, 'base64'));
        } else {
            throw new Error('当前环境不支持 Base64 解码');
        }
    } catch (e) {
        throw new Error('非法 Base64: ' + (e && e.message ? e.message : e));
    }
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
}

/**
 * Base64URL，无 padding
 * @param {ArrayBuffer|Uint8Array} bytes
 * @returns {string}
 */
function bytesToBase64Url(bytes) {
    return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

/**
 * Base64URL → 字节；自动补 padding
 * @param {string} s
 * @returns {Uint8Array}
 */
function base64UrlToBytes(s) {
    if (s == null) throw new Error('base64url 不能为空');
    var t = String(s).replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
    var pad = t.length % 4;
    if (pad === 2) t += '==';
    else if (pad === 3) t += '=';
    else if (pad === 1) throw new Error('非法 base64url 长度');
    return base64ToBytes(t);
}

/**
 * UTF-8 字符串 → 字节
 * @param {string} str
 * @returns {Uint8Array}
 */
function strToBytes(str) {
    return new TextEncoder().encode(str == null ? '' : String(str));
}

/**
 * 字节 → UTF-8 字符串
 * @param {ArrayBuffer|Uint8Array} bytes
 * @returns {string}
 */
function bytesToStr(bytes) {
    return new TextDecoder().decode(_toUint8Array(bytes));
}

// 浏览器 / 测试环境全局挂载（避免工具内重复声明同名函数）
(function attachCryptoUtils(g) {
    if (!g) return;
    g.bytesToHex = bytesToHex;
    g.hexToBytes = hexToBytes;
    g.bytesToBase64 = bytesToBase64;
    g.base64ToBytes = base64ToBytes;
    g.bytesToBase64Url = bytesToBase64Url;
    g.base64UrlToBytes = base64UrlToBytes;
    g.strToBytes = strToBytes;
    g.bytesToStr = bytesToStr;
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : null);

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        bytesToHex: bytesToHex,
        hexToBytes: hexToBytes,
        bytesToBase64: bytesToBase64,
        base64ToBytes: base64ToBytes,
        bytesToBase64Url: bytesToBase64Url,
        base64UrlToBytes: base64UrlToBytes,
        strToBytes: strToBytes,
        bytesToStr: bytesToStr,
    };
}
