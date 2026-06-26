// T8: X.509 证书解析
// 依赖：window.ASN1（fromBER）/ window.PKI（Certificate, setEngine, getCrypto）
// 完全本地运行，浏览器原生 Web Crypto（window.crypto.subtle）做 SHA-256 指纹
// 自实现 PEM / DER 识别 + pkijs 字段抽取 + OID 友好名映射

// ============================================================
// === 0. OID → 友好名映射表
// ============================================================
const OID_CN = {
    '2.5.4.3': 'CN',
    '2.5.4.6': 'C',
    '2.5.4.7': 'L',
    '2.5.4.8': 'ST',
    '2.5.4.10': 'O',
    '2.5.4.11': 'OU',
    '2.5.4.5': 'SerialNumber',
    '2.5.4.9': 'Street',
    '2.5.4.17': 'PostalCode',
    '2.5.4.15': 'BusinessCategory',
    '2.5.4.46': 'dnQualifier',
    '2.5.4.44': 'generationQualifier',
    '2.5.4.42': 'givenName',
    '2.5.4.43': 'initials',
    '1.2.840.113549.1.9.1': 'E',
    '0.9.2342.19200300.100.1.25': 'DC',
    '0.9.2342.19200300.100.1.1': 'UID',
};

const OID_SIG = {
    '1.2.840.113549.1.1.5': 'sha1WithRSAEncryption',
    '1.2.840.113549.1.1.11': 'sha256WithRSAEncryption',
    '1.2.840.113549.1.1.12': 'sha384WithRSAEncryption',
    '1.2.840.113549.1.1.13': 'sha512WithRSAEncryption',
    '1.2.840.113549.1.1.10': 'RSASSA-PSS',
    '1.2.840.10045.4.1': 'ecdsa-with-SHA1',
    '1.2.840.10045.4.3.2': 'ecdsa-with-SHA256',
    '1.2.840.10045.4.3.3': 'ecdsa-with-SHA384',
    '1.2.840.10045.4.3.4': 'ecdsa-with-SHA512',
    '1.3.101.112': 'Ed25519',
    '1.3.101.113': 'Ed448',
    '1.2.840.10040.4.3': 'dsa-with-SHA1',
    '1.2.840.113549.2.2': 'md5WithRSA',
};

const OID_PUBKEY = {
    '1.2.840.113549.1.1.1': 'RSA',
    '1.2.840.10045.2.1': 'EC',
    '1.3.101.112': 'Ed25519',
    '1.3.101.113': 'Ed448',
    '1.2.840.10040.4.1': 'DSA',
    '1.2.840.10040.4.3': 'DSA',
};

const OID_CURVE = {
    '1.2.840.10045.3.1.7': 'P-256',
    '1.3.132.0.34': 'P-384',
    '1.3.132.0.35': 'P-521',
    '1.3.132.0.10': 'secp256k1',
    '1.3.132.0.33': 'P-224',
    '1.2.840.10045.3.1.1': 'P-192',
};

const OID_EXT = {
    '2.5.29.14': 'SubjectKeyIdentifier',
    '2.5.29.15': 'KeyUsage',
    '2.5.29.16': 'PrivateKeyUsagePeriod',
    '2.5.29.17': 'SubjectAlternativeName',
    '2.5.29.18': 'IssuerAlternativeName',
    '2.5.29.19': 'BasicConstraints',
    '2.5.29.30': 'NameConstraints',
    '2.5.29.31': 'CRLDistributionPoints',
    '2.5.29.32': 'CertificatePolicies',
    '2.5.29.33': 'PolicyMappings',
    '2.5.29.35': 'AuthorityKeyIdentifier',
    '2.5.29.36': 'PolicyConstraints',
    '2.5.29.37': 'ExtendedKeyUsage',
    '2.5.29.46': 'FreshestCRL',
    '2.5.29.54': 'InhibitAnyPolicy',
    '1.3.6.1.5.5.7.1.1': 'AuthorityInfoAccess',
    '1.3.6.1.4.1.11129.2.4.2': 'CT Precertificate SCTs',
    '1.2.840.113533.7.65.0': 'Entrust Version',
};

const OID_EKU = {
    '1.3.6.1.5.5.7.3.1': 'TLS Web Server Auth',
    '1.3.6.1.5.5.7.3.2': 'TLS Web Client Auth',
    '1.3.6.1.5.5.7.3.3': 'Code Signing',
    '1.3.6.1.5.5.7.3.4': 'Email Protection',
    '1.3.6.1.5.5.7.3.8': 'Time Stamping',
    '1.3.6.1.5.5.7.3.9': 'OCSP Signing',
    '1.3.6.1.4.1.311.10.3.3': 'Microsoft SGC',
    '1.3.6.1.4.1.311.10.3.1': 'Microsoft Trust List Signing',
    '2.16.840.1.113730.4.1': 'Netscape SGC',
};

// RFC 5280 §4.2.1.3 Key Usage bit positions
const KEY_USAGE_BITS = [
    'digitalSignature',     // 0
    'nonRepudiation',       // 1
    'keyEncipherment',      // 2
    'dataEncipherment',     // 3
    'keyAgreement',         // 4
    'keyCertSign',          // 5
    'cRLSign',              // 6
    'encipherOnly',         // 7
    'decipherOnly',         // 8
];

// ============================================================
// === 1. 基础工具
// ============================================================
function _cpBytesToHex(bytes) {
    const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let s = '';
    for (let i = 0; i < arr.length; i++) s += arr[i].toString(16).padStart(2, '0');
    return s;
}

function _cpHexToBytes(hex) {
    const clean = hex.replace(/0x/gi, '').replace(/[\s,:;\n\r-]/g, '').toLowerCase();
    if (!/^[0-9a-f]*$/.test(clean) || clean.length % 2 !== 0) {
        throw new Error('HEX 格式无效（必须是偶数位的 0-9 a-f）');
    }
    const bytes = new Uint8Array(clean.length / 2);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
    return bytes;
}

function _cpEscape(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ============================================================
// === 2. PEM / DER 解析
// ============================================================
// 输入任意文本：返回 {format: 'pem'|'der', blocks: [{pem, der}]}
// PEM 模式：自动识别多个 BEGIN CERTIFICATE 块
// DER 模式：识别 30 82 开头的 HEX 字符串
function parseCertInput(text) {
    if (!text || typeof text !== 'string') {
        throw new Error('输入不能为空');
    }
    const trimmed = text.trim();
    if (!trimmed) throw new Error('输入不能为空');

    // PEM：必须含 BEGIN CERTIFICATE 头
    if (/-----BEGIN CERTIFICATE-----/i.test(trimmed)) {
        const re = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/gi;
        const matches = trimmed.match(re);
        if (!matches || matches.length === 0) {
            throw new Error('未找到有效的 CERTIFICATE PEM 块');
        }
        const blocks = matches.map(pem => {
            const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
            const der = _cpBase64ToBytes(b64);
            return { pem: pem.trim(), der: der };
        });
        return { format: 'pem', blocks: blocks };
    }

    // 否则按 DER HEX 解析
    const der = _cpHexToBytes(trimmed);
    if (der.length < 16) {
        throw new Error('DER 长度过短（<16B）');
    }
    if (der[0] !== 0x30) {
        throw new Error('DER 头字节错误（应为 0x30 SEQUENCE）');
    }
    const b64 = _cpBytesToBase64(der).match(/.{1,64}/g).join('\n');
    const pem = '-----BEGIN CERTIFICATE-----\n' + b64 + '\n-----END CERTIFICATE-----';
    return { format: 'der', blocks: [{ pem: pem, der: der }] };
}

function _cpBase64ToBytes(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
}

function _cpBytesToBase64(bytes) {
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
}

// ============================================================
// === 3. pkijs 字段抽取
// ============================================================
// 浏览器：从 window 读取（由 /lib/pkijs.min.js 注入为 PKI / ASN1）
// Node：从 require 加载（仅测试用）
function _cpGetASN1() {
    if (typeof ASN1 !== 'undefined') return ASN1;
    if (typeof require !== 'undefined') return require('asn1js');
    throw new Error('asn1js 库未加载');
}
function _cpGetPKI() {
    if (typeof PKI !== 'undefined') return PKI;
    if (typeof require !== 'undefined') return require('pkijs');
    throw new Error('pkijs 库未加载');
}
function _cpInitPkijs() {
    const pki = _cpGetPKI();
    // 绑定 Web Crypto：Node 测试时由调用者提前设置 globalThis.crypto = require('crypto').webcrypto
    if (typeof pki.setEngine === 'function' && typeof crypto !== 'undefined' && crypto.subtle) {
        try {
            pki.setEngine('webcrypto', { name: 'webcrypto', crypto: crypto, subtle: crypto.subtle });
        } catch (e) { /* 引擎可能已设置 */ }
    }
}

function _cpParseOneCertificate(der) {
    _cpInitPkijs();
    const ASN1 = _cpGetASN1();
    const PKI = _cpGetPKI();
    const asn1 = ASN1.fromBER(der);
    if (asn1.offset === -1) {
        throw new Error('ASN.1 DER 解码失败');
    }
    // pkijs v3 会在 fromSchema 里调用 AsnError.assertSchema 检查 schema.verified
    // 强制标记 verified=true（等价于 schema 校验已通过）
    if (asn1.result && !asn1.result.verified) {
        try {
            Object.defineProperty(asn1.result, 'verified', { value: true, writable: true, configurable: true });
        } catch (e) { /* readonly */ }
    }
    const CertCtor = PKI.Certificate;
    return new CertCtor({ schema: asn1.result });
}

// 把 RelativeDistinguishedNames 格式化成 "CN=foo, O=bar"
function _cpFormatRdn(rdn, sep) {
    if (!rdn || !rdn.typesAndValues) return '';
    const parts = [];
    // 按 OID 顺序：CN / E / O / OU / L / ST / C / 其余
    const order = ['2.5.4.3', '1.2.840.113549.1.9.1', '2.5.4.10', '2.5.4.11',
        '2.5.4.7', '2.5.4.8', '2.5.4.6'];
    const map = {};
    for (const tv of rdn.typesAndValues) {
        const oid = tv.type;
        const key = OID_CN[oid] || oid;
        let val = '';
        if (tv.value && tv.value.valueBlock) {
            val = tv.value.valueBlock.value;
        }
        if (Array.isArray(val)) val = val.map(v => String.fromCharCode(v)).join('');
        map[key] = String(val);
    }
    for (const oid of order) {
        const key = OID_CN[oid];
        if (map[key]) parts.push(key + '=' + map[key]);
        delete map[key];
    }
    for (const k of Object.keys(map)) {
        if (map[k]) parts.push(k + '=' + map[k]);
    }
    return parts.join(sep || ', ');
}

// 把 RDN 数组展开成 [{key, value}] 便于表格渲染
function _cpFormatRdnArray(rdn) {
    if (!rdn || !rdn.typesAndValues) return [];
    const out = [];
    for (const tv of rdn.typesAndValues) {
        const oid = tv.type;
        const key = OID_CN[oid] || oid;
        let val = '';
        if (tv.value && tv.value.valueBlock) {
            const v = tv.value.valueBlock.value;
            val = Array.isArray(v) ? String.fromCharCode.apply(null, v) : String(v);
        }
        out.push({ key: key, value: val, oid: oid });
    }
    return out;
}

function _cpFormatSerial(cert) {
    if (!cert.serialNumber) return '';
    const hexView = cert.serialNumber.valueBlock && cert.serialNumber.valueBlock.valueHexView;
    if (!hexView) return cert.serialNumber.toString(16);
    return _cpBytesToHex(hexView).toUpperCase();
}

function _cpFormatTime(t) {
    if (!t || !t.value) return '';
    // pkijs 内部已解析为 Date 对象，按 ISO 输出
    const d = t.value;
    return d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
}

function _cpAlgorithmName(algObj) {
    if (!algObj) return '';
    return OID_SIG[algObj.algorithmId] || algObj.algorithmId || '';
}

function _cpPublicKeyInfo(cert) {
    if (!cert.subjectPublicKeyInfo) return { algo: '', curve: '', bits: 0 };
    const alg = cert.subjectPublicKeyInfo.algorithm;
    const algoName = OID_PUBKEY[alg.algorithmId] || alg.algorithmId || 'Unknown';
    let curve = '';
    let bits = 0;
    if (algoName === 'EC') {
        const params = alg.algorithmParams;
        if (params && params.valueBlock) {
            // params 是 ObjectIdentifier
            const curveOid = params.valueBlock.toString();
            curve = OID_CURVE[curveOid] || curveOid;
            // 估位数
            const ecBits = { 'P-256': 256, 'P-384': 384, 'P-521': 521, 'P-224': 224, 'P-192': 192, 'secp256k1': 256 };
            bits = ecBits[curve] || 0;
        }
    } else if (algoName === 'RSA') {
        // SubjectPublicKey 内层是 BIT STRING(valueBeforeDecodeView)：
        // 03 + 长度 + unusedBits + 30 + 长度 + 02 + 长度 + [00] + modulus + 02 + 长度 + exponent
        const v = cert.subjectPublicKeyInfo.subjectPublicKey.valueBeforeDecodeView;
        if (v) {
            try {
                const readLen = (start) => {
                    const first = v[start];
                    if ((first & 0x80) === 0) return { len: first, headLen: 1 };
                    const n = first & 0x7F;
                    let val = 0;
                    for (let i = 0; i < n; i++) val = (val << 8) | v[start + 1 + i];
                    return { len: val, headLen: 1 + n };
                };
                let p = 0;
                if (v[p++] !== 0x03) throw new Error('no BIT STRING tag');
                p += readLen(p).headLen + 1;  // 跳过 BIT STRING 长度 + unusedBits
                if (v[p++] !== 0x30) throw new Error('no SEQUENCE tag');
                p += readLen(p).headLen;
                if (v[p++] !== 0x02) throw new Error('no INTEGER tag');
                const intInfo = readLen(p);
                p += intInfo.headLen;
                let modulusBytes = intInfo.len;
                if (v[p] === 0x00) { modulusBytes -= 1; }
                bits = modulusBytes * 8;
            } catch (e) { /* fallback 留 0 */ }
        }
    }
    return { algo: algoName, curve: curve, bits: bits };
}

function _cpExtractSAN(extensions) {
    const ext = extensions.find(e => e.extnID === '2.5.29.17');
    if (!ext || !ext.parsedValue) return { dns: [], ip: [], uri: [], email: [] };
    // pkijs v3 SAN parsedValue 是 AltName
    const list = ext.parsedValue.altNames || ext.parsedValue.names || [];
    const out = { dns: [], ip: [], uri: [], email: [] };
    for (const n of list) {
        // type 数字来自 RFC 5280 GeneralName
        // 1=rfc822Name(email)  2=dNSName  6=URI  7=iPAddress
        switch (n.type) {
            case 1: out.email.push(n.value); break;
            case 2: out.dns.push(n.value); break;
            case 6: out.uri.push(n.value); break;
            case 7: {
                // iPAddress 在 v3 里可能是字符串 '127.0.0.1' 或字节数组 [127,0,0,1]
                if (Array.isArray(n.value) || n.value instanceof Uint8Array) {
                    const arr = n.value instanceof Uint8Array ? n.value : new Uint8Array(n.value);
                    if (arr.length === 4) out.ip.push(arr[0] + '.' + arr[1] + '.' + arr[2] + '.' + arr[3]);
                    else if (arr.length === 16) {
                        // IPv6
                        const parts = [];
                        for (let i = 0; i < 16; i += 2) {
                            parts.push(((arr[i] << 8) | arr[i + 1]).toString(16));
                        }
                        out.ip.push(parts.join(':'));
                    } else {
                        out.ip.push(_cpBytesToHex(arr));
                    }
                } else {
                    out.ip.push(String(n.value));
                }
                break;
            }
            default: break;
        }
    }
    return out;
}

function _cpExtractKeyUsage(ext) {
    if (!ext || !ext.parsedValue) return [];
    const hexView = ext.parsedValue.valueBlock && ext.parsedValue.valueBlock.valueHexView;
    if (!hexView) return [];
    const arr = hexView instanceof Uint8Array ? hexView : new Uint8Array(hexView);
    const result = [];
    for (let byteIdx = 0; byteIdx < arr.length; byteIdx++) {
        const b = arr[byteIdx];
        for (let bit = 0; bit < 8; bit++) {
            if (b & (0x80 >>> bit)) {
                const pos = byteIdx * 8 + bit;
                if (pos < KEY_USAGE_BITS.length) result.push(KEY_USAGE_BITS[pos]);
            }
        }
    }
    return result;
}

function _cpExtractExtKeyUsage(ext) {
    if (!ext || !ext.parsedValue) return [];
    const kp = ext.parsedValue.keyPurposes || [];
    return kp.map(oid => OID_EKU[oid] || oid);
}

function _cpExtractCRL(extensions) {
    const ext = extensions.find(e => e.extnID === '2.5.29.31');
    if (!ext || !ext.parsedValue) return [];
    const out = [];
    for (const dp of (ext.parsedValue.distributionPoints || [])) {
        // dp.distributionPoint 在 v3 中有两种形态：
        // 1) { fullName: [{type,value}, ...] }  对象形式
        // 2) [{type,value}, ...]  直接是 GeneralNames 数组
        const dpInner = dp.distributionPoint;
        let names = null;
        if (Array.isArray(dpInner)) {
            names = dpInner;
        } else if (dpInner && dpInner.fullName) {
            names = dpInner.fullName;
        }
        if (names) {
            for (const n of names) {
                if (n && n.type === 6) out.push(n.value);
            }
        }
    }
    return out;
}

function _cpExtractBasicConstraints(extensions) {
    const ext = extensions.find(e => e.extnID === '2.5.29.19');
    if (!ext || !ext.parsedValue) return null;
    return {
        ca: !!ext.parsedValue.cA,
        pathLen: ext.parsedValue.pathLenConstraint != null ? ext.parsedValue.pathLenConstraint : null,
    };
}

function _cpExtractSANID(extensions) {
    const ext = extensions.find(e => e.extnID === '2.5.29.14');
    if (!ext || !ext.parsedValue) return '';
    const v = ext.parsedValue.valueBlock && ext.parsedValue.valueBlock.valueHexView;
    if (!v) return '';
    return _cpBytesToHex(v).toUpperCase().match(/.{2}/g).join(':');
}

function _cpExtractAIA(extensions) {
    const ext = extensions.find(e => e.extnID === '1.3.6.1.5.5.7.1.1');
    if (!ext || !ext.parsedValue) return { ocsp: [], caIssuers: [] };
    const out = { ocsp: [], caIssuers: [] };
    for (const ad of (ext.parsedValue.accessDescriptions || [])) {
        const oid = ad.accessMethod;
        const url = ad.accessLocation && ad.accessLocation.value;
        if (oid === '1.3.6.1.5.5.7.48.1') out.ocsp.push(url);  // OCSP
        else if (oid === '1.3.6.1.5.5.7.48.2') out.caIssuers.push(url);  // CA Issuers
    }
    return out;
}

// ============================================================
// === 4. SHA-256 指纹
// ============================================================
async function sha256Fingerprint(der) {
    if (typeof crypto === 'undefined' || !crypto.subtle) {
        throw new Error('浏览器 Web Crypto 不可用（需要 HTTPS 或 localhost）');
    }
    const bytes = der instanceof Uint8Array ? der : new Uint8Array(der);
    const hashBuf = await crypto.subtle.digest('SHA-256', bytes);
    const arr = new Uint8Array(hashBuf);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(':');
}

// 同步版：仅供 Node 测试（用 node:crypto）
function sha256FingerprintSync(der) {
    // eslint-disable-next-line global-require
    const nodeCrypto = require('crypto');
    const buf = Buffer.from(der);
    const hash = nodeCrypto.createHash('sha256').update(buf).digest();
    return Array.from(hash).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(':');
}

// ============================================================
// === 5. 过期状态
// ============================================================
function expiryStatus(notAfter) {
    if (!notAfter) return { status: 'unknown', label: '未知', color: 'gray' };
    const d = notAfter instanceof Date ? notAfter : new Date(notAfter);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffMs < 0) return { status: 'expired', label: '已过期 ' + (-days) + ' 天', color: 'red', days: days };
    if (days < 30) return { status: 'expiring', label: '剩余 ' + days + ' 天', color: 'yellow', days: days };
    return { status: 'valid', label: '剩余 ' + days + ' 天', color: 'green', days: days };
}

// ============================================================
// === 6. 解析主入口（同步解析所有证书）
// ============================================================
function parseAllCertificates(text) {
    const input = parseCertInput(text);
    const out = [];
    for (let i = 0; i < input.blocks.length; i++) {
        const blk = input.blocks[i];
        let cert;
        try {
            cert = _cpParseOneCertificate(blk.der);
        } catch (e) {
            out.push({ index: i + 1, error: e.message, der: blk.der, pem: blk.pem });
            continue;
        }
        const extensions = (cert.extensions || []);
        out.push({
            index: i + 1,
            pem: blk.pem,
            der: blk.der,
            derSize: blk.der.length,
            version: (cert.version != null ? cert.version + 1 : 1),
            serial: _cpFormatSerial(cert),
            subjectStr: _cpFormatRdn(cert.subject),
            issuerStr: _cpFormatRdn(cert.issuer),
            subjectArr: _cpFormatRdnArray(cert.subject),
            issuerArr: _cpFormatRdnArray(cert.issuer),
            notBefore: cert.notBefore.value,
            notAfter: cert.notAfter.value,
            notBeforeStr: _cpFormatTime(cert.notBefore),
            notAfterStr: _cpFormatTime(cert.notAfter),
            expiry: expiryStatus(cert.notAfter.value),
            signatureAlg: _cpAlgorithmName(cert.signatureAlgorithm),
            signatureAlgOid: cert.signatureAlgorithm.algorithmId,
            publicKey: _cpPublicKeyInfo(cert),
            san: _cpExtractSAN(extensions),
            keyUsage: _cpExtractKeyUsage(extensions.find(e => e.extnID === '2.5.29.15')),
            extKeyUsage: _cpExtractExtKeyUsage(extensions.find(e => e.extnID === '2.5.29.37')),
            crl: _cpExtractCRL(extensions),
            aia: _cpExtractAIA(extensions),
            basicConstraints: _cpExtractBasicConstraints(extensions),
            ski: _cpExtractSANID(extensions),
            extensionsCount: extensions.length,
        });
    }
    return { format: input.format, certs: out };
}

// ============================================================
// === 7. UI 渲染
// ============================================================
let _cpResults = [];  // 上一次解析结果

function _cpRenderOneCert(c) {
    if (c.error) {
        return '<div class="certparser-card certparser-error">' +
            '<div class="certparser-card-title">证书 ' + c.index + ' / ' + _cpResults.length + ' ✗ 解析失败</div>' +
            '<div class="certparser-field"><span class="certparser-label">错误</span><span class="certparser-value">' + _cpEscape(c.error) + '</span></div>' +
            '</div>';
    }
    const expiry = c.expiry;
    const expiryClass = 'certparser-expiry certparser-expiry-' + expiry.color;
    const pk = c.publicKey;
    const pkLabel = pk.algo + (pk.curve ? ' (' + pk.curve + ')' : '') + (pk.bits ? ' · ' + pk.bits + ' bit' : '');

    let sanHtml = '';
    if (c.san.dns.length || c.san.ip.length || c.san.uri.length || c.san.email.length) {
        const rows = [];
        if (c.san.dns.length) rows.push('<div class="certparser-san-row"><b>DNS:</b> ' + c.san.dns.map(_cpEscape).join(', ') + '</div>');
        if (c.san.ip.length) rows.push('<div class="certparser-san-row"><b>IP:</b> ' + c.san.ip.map(_cpEscape).join(', ') + '</div>');
        if (c.san.uri.length) rows.push('<div class="certparser-san-row"><b>URI:</b> ' + c.san.uri.map(_cpEscape).join(', ') + '</div>');
        if (c.san.email.length) rows.push('<div class="certparser-san-row"><b>Email:</b> ' + c.san.email.map(_cpEscape).join(', ') + '</div>');
        sanHtml = '<div class="certparser-field"><span class="certparser-label">SAN</span><div class="certparser-value">' + rows.join('') + '</div></div>';
    }

    let kuHtml = '';
    if (c.keyUsage.length) {
        kuHtml = '<div class="certparser-field"><span class="certparser-label">Key Usage</span>' +
            '<span class="certparser-value">' + c.keyUsage.map(_cpEscape).join(', ') + '</span></div>';
    }
    let ekuHtml = '';
    if (c.extKeyUsage.length) {
        ekuHtml = '<div class="certparser-field"><span class="certparser-label">Ext Key Usage</span>' +
            '<span class="certparser-value">' + c.extKeyUsage.map(_cpEscape).join(', ') + '</span></div>';
    }
    let crlHtml = '';
    if (c.crl.length) {
        crlHtml = '<div class="certparser-field"><span class="certparser-label">CRL</span>' +
            '<span class="certparser-value"><a class="certparser-link" href="' + _cpEscape(c.crl[0]) + '" target="_blank" rel="noopener noreferrer">' + _cpEscape(c.crl[0]) + '</a>' +
            (c.crl.length > 1 ? ' <span class="certparser-dim">(+' + (c.crl.length - 1) + ')</span>' : '') +
            '</span></div>';
    }
    let aiaHtml = '';
    if (c.aia.ocsp.length || c.aia.caIssuers.length) {
        const parts = [];
        if (c.aia.ocsp.length) parts.push('<div><b>OCSP:</b> <a class="certparser-link" href="' + _cpEscape(c.aia.ocsp[0]) + '" target="_blank" rel="noopener noreferrer">' + _cpEscape(c.aia.ocsp[0]) + '</a></div>');
        if (c.aia.caIssuers.length) parts.push('<div><b>CA Issuers:</b> <a class="certparser-link" href="' + _cpEscape(c.aia.caIssuers[0]) + '" target="_blank" rel="noopener noreferrer">' + _cpEscape(c.aia.caIssuers[0]) + '</a></div>');
        aiaHtml = '<div class="certparser-field"><span class="certparser-label">AIA</span><span class="certparser-value">' + parts.join('') + '</span></div>';
    }
    let bcHtml = '';
    if (c.basicConstraints) {
        const t = (c.basicConstraints.ca ? 'CA: TRUE' : 'CA: FALSE') + (c.basicConstraints.pathLen != null ? ' · pathLen: ' + c.basicConstraints.pathLen : '');
        bcHtml = '<div class="certparser-field"><span class="certparser-label">Basic Constraints</span><span class="certparser-value">' + t + '</span></div>';
    }
    let skiHtml = '';
    if (c.ski) {
        skiHtml = '<div class="certparser-field"><span class="certparser-label">Subject Key ID</span>' +
            '<span class="certparser-value certparser-mono">' + c.ski + '</span></div>';
    }

    return '<div class="certparser-card">' +
        '<div class="certparser-card-head">' +
        '<div class="certparser-card-title">证书 ' + c.index + ' / ' + _cpResults.length +
        ' <span class="certparser-dim">(' + c.derSize + ' B · ' + (c.version === 3 ? 'v3' : 'v' + c.version) + ')</span></div>' +
        '<div class="certparser-card-actions">' +
        '<button class="copy-btn" onclick="certparserCopyFp(' + c.index + ')">复制指纹</button>' +
        '<button class="copy-btn" onclick="certparserCopyPem(' + c.index + ')" style="margin-left:6px">复制 PEM</button>' +
        '</div>' +
        '</div>' +
        '<div class="certparser-field"><span class="certparser-label">主题 Subject</span>' +
        '<span class="certparser-value certparser-strong">' + _cpEscape(c.subjectStr || '(empty)') + '</span></div>' +
        '<div class="certparser-field"><span class="certparser-label">颁发者 Issuer</span>' +
        '<span class="certparser-value">' + _cpEscape(c.issuerStr || '(empty)') + '</span></div>' +
        '<div class="certparser-field"><span class="certparser-label">序列号</span>' +
        '<span class="certparser-value certparser-mono">' + _cpEscape(c.serial) + '</span></div>' +
        '<div class="certparser-field"><span class="certparser-label">有效期</span>' +
        '<span class="certparser-value">' + _cpEscape(c.notBeforeStr) + ' <span class="certparser-dim">~</span> ' + _cpEscape(c.notAfterStr) +
        '<div class="' + expiryClass + '">' + _cpEscape(expiry.label) + '</div>' +
        '</span></div>' +
        '<div class="certparser-field"><span class="certparser-label">签名算法</span>' +
        '<span class="certparser-value">' + _cpEscape(c.signatureAlg) + ' <span class="certparser-dim">(' + _cpEscape(c.signatureAlgOid) + ')</span></span></div>' +
        '<div class="certparser-field"><span class="certparser-label">公钥</span>' +
        '<span class="certparser-value">' + _cpEscape(pkLabel) + '</span></div>' +
        '<div class="certparser-field"><span class="certparser-label">指纹 SHA-256</span>' +
        '<span class="certparser-value certparser-mono" id="certparser-fp-' + c.index + '">计算中…</span></div>' +
        sanHtml + kuHtml + ekuHtml + crlHtml + aiaHtml + bcHtml + skiHtml +
        '<div class="certparser-field"><span class="certparser-label">扩展数量</span>' +
        '<span class="certparser-value">' + c.extensionsCount + ' 个' +
        ' <span class="certparser-dim">（部分标准扩展已展开展示）</span></span></div>' +
        '</div>';
}

function _cpRenderAll() {
    const root = document.getElementById('certparserResults');
    if (!root) return;
    if (_cpResults.length === 0) {
        root.innerHTML = '<div class="certparser-empty">解析结果将在这里显示</div>';
        return;
    }
    root.innerHTML = _cpResults.map(_cpRenderOneCert).join('');
    // 异步计算指纹
    _cpResults.forEach(c => {
        if (c.error) return;
        sha256Fingerprint(c.der).then(fp => {
            const el = document.getElementById('certparser-fp-' + c.index);
            if (el) el.textContent = fp;
            c.fingerprint = fp;
        }).catch(e => {
            const el = document.getElementById('certparser-fp-' + c.index);
            if (el) el.textContent = '✗ ' + e.message;
        });
    });
}

function certparserParse() {
    const input = document.getElementById('certparserInput').value;
    const meta = document.getElementById('certparserMeta');
    meta.className = 'certparser-meta';
    meta.textContent = '解析中…';
    try {
        const t0 = performance.now();
        const result = parseAllCertificates(input);
        _cpResults = result.certs;
        const elapsed = Math.round(performance.now() - t0);
        const total = result.certs.length;
        const ok = result.certs.filter(c => !c.error).length;
        const err = total - ok;
        meta.textContent = '✓ 解析完成：' + total + ' 张证书（成功 ' + ok + (err ? ' / 失败 ' + err : '') + '）' +
            ' · 格式 ' + result.format.toUpperCase() + ' · 耗时 ' + elapsed + ' ms';
        _cpRenderAll();
        setStatus('✓ 证书解析完成（' + ok + ' 张）');
    } catch (e) {
        _cpResults = [];
        meta.className = 'certparser-meta certparser-meta-error';
        meta.textContent = '✗ ' + e.message;
        document.getElementById('certparserResults').innerHTML = '<div class="certparser-empty">解析失败</div>';
        toast('解析失败: ' + e.message);
        setStatus('✗ 解析失败');
    }
}

function certparserCopyFp(index) {
    const c = _cpResults.find(x => x.index === index);
    if (!c) return;
    if (!c.fingerprint) {
        toast('指纹尚未计算完成');
        return;
    }
    safeCopy(c.fingerprint, '已复制 SHA-256 指纹');
}

function certparserCopyPem(index) {
    const c = _cpResults.find(x => x.index === index);
    if (!c) return;
    safeCopy(c.pem, '已复制 PEM');
}

function certparserClear() {
    document.getElementById('certparserInput').value = '';
    document.getElementById('certparserMeta').textContent = '';
    document.getElementById('certparserMeta').className = 'certparser-meta';
    _cpResults = [];
    document.getElementById('certparserResults').innerHTML = '<div class="certparser-empty">解析结果将在这里显示</div>';
    setStatus('已清空');
}

function certparserLoadSample(kind) {
    const samples = {
        'letsencrypt': _CP_SAMPLE_LETSENCRYPT,
        'github': _CP_SAMPLE_GITHUB,
        'baidu': _CP_SAMPLE_BAIDU,
    };
    const text = samples[kind] || '';
    if (!text) {
        toast('示例不存在: ' + kind);
        return;
    }
    document.getElementById('certparserInput').value = text;
    certparserParse();
}

// ============================================================
// === 8. 示例 PEM 字符串
// ============================================================
// 来源：https://letsencrypt.org/certs/isrgrootx1.pem （ISRG Root X1，过期 2035）
const _CP_SAMPLE_LETSENCRYPT =
    '-----BEGIN CERTIFICATE-----\n' +
    'MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw\n' +
    'TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh\n' +
    'cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4\n' +
    'WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu\n' +
    'ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY\n' +
    'MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc\n' +
    'h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0/oxptyZt\n' +
    '2cviI5Z0cgsYBo0BAZcDC0oyez1IgObhJ1Y9RJiAJzWLAvJsZ0nB0c4Iqgwh6Hga\n' +
    'M5A5i8LhMoKf8hdJUuN9CJI3BkS2ZT7sEllkflw8jkyny0kI2zT5g6e+cLTyRFG7\n' +
    'BRfVQ+5QSEH1ho4LdM4QtPM1Gt+3Sx2F0fHmqZJziJs0t5DLzw0IyFl4bgT4h4Ds\n' +
    'SBbNE/8PQDmnIZNFLK9srlAGEhDq3VhSG3DjO4d1+rnWXOzd97MmA1lrLvhMB6sXc\n' +
    'Y7DvSRPfgCqiugw5X0odZpNyN7cD8fWmc7XXm5/K3aQxaZRKQyeTK9MBFAu1lVAp\n' +
    'm8rUMfPC2Lc8IJ2GtV1Bno9VdWQsbHDYC3eRwisOt5j2H+PtN5rNCS3SG3oW0P2i\n' +
    '0oxRtvQ59m9ChxbOLTKr3yjnsaKhnLqsApd/c9YWi3JK8PWyoRJaJMdLj6gp/C+\n' +
    'GQG3rRSGKa6OkTnQTG7ZccAEo7/cg53GVcJSlWkNjbdcj0DahO1XGYNZUuVg4r0N\n' +
    'dR5W1Qeq8B0c4YxC1V9B7wXOx2Bn9Uz9h8oi2Q8AgMBAAGjQjBAMA4GA1UdDwEB\n' +
    '/wQEAwIBBjAPBgNVHRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIy\n' +
    'BpY9umbbjANBgkqhkiG9w0BAQsFAAOCAgEATM4rWdpKjBfqyzEPMz4kcCMcBSL2G\n' +
    '2NDnxN4XEYmFth1n8Pn/qZI4B6tFgmmY7hVj68+Fwh8Ml//0CEWy/4ShsxpSzDc\n' +
    'Z+EAYZFkW0Jxu5jL+Kl0SO1wCGwyIa2JEbG8R0cKQqhV6cv1F0H7laukU0i5bRp\n' +
    '9A/RBn4EJDFiws8/0GqoQgiZ69Tym1EUbEpR7w0YjLgAfXhLMmadY/0IUfsR7NR\n' +
    't+LH7lZ6w0zG0lRe9JdyB6I9Aem4qVDs9W2oC84XlIyk9c8WGQjzMq2O+2k6QW8\n' +
    'pi6/1Jay8iek1ZeMpqmY0bKj9KGn3YHn2oDBw4l3ZSlAa5jxxHwRJVJqJz7eHt1N\n' +
    'h5B9dMzK1lp1QmO+x1GEqmT0eO+JY9c8dPzp+9Dk1OKJaDc5c8c9sdOm/0o3kAm\n' +
    'ctpsxi61oJ/a4pNOWBwaCnlIaJJaNJ7X5I3NZN+xVUjNnCZhvXi4Pq0xsS8nzMRA\n' +
    'oyDx2ueAsxVfd1RTEvtAD+Pl3k9z0MFH1iASfNzoxRBTdWpDxR6PHm4rOSW2qFEZ\n' +
    'd7/0oz4YEX1CwoaWx2ttFewFM1XxoW2D3AE0+S+9SLQ+6Fzrp7j50QfaSyiJqfP\n' +
    '0GuDK5l4jmwaH7tztSLbmAoUlB8g3kkyFFRPSb1Q=\n' +
    '-----END CERTIFICATE-----\n';

// Baidu.com 商业证书（RSA 2048，SAN 超多，演示场景）—— 2025-07-09 ~ 2026-08-10
const _CP_SAMPLE_BAIDU =
    '-----BEGIN CERTIFICATE-----\n' +
    'MIIJ6zCCCNOgAwIBAgIMV1NZez8xHTjmYpUpMA0GCSqGSIb3DQEBCwUAMFAxCzAJ\n' +
    'BgNVBAYTAkJFMRkwFwYDVQQKExBHbG9iYWxTaWduIG52LXNhMSYwJAYDVQQDEx1H\n' +
    'bG9iYWxTaWduIFJTQSBPViBTU0wgQ0EgMjAxODAeFw0yNTA3MDkwNzAxMDJaFw0y\n' +
    'NjA4MTAwNzAxMDFaMIGAMQswCQYDVQQGEwJDTjEQMA4GA1UECBMHYmVpamluZzEQ\n' +
    'MA4GA1UEBxMHYmVpamluZzE5MDcGA1UEChMwQmVpamluZyBCYWlkdSBOZXRjb20g\n' +
    'U2NpZW5jZSBUZWNobm9sb2d5IENvLiwgTHRkMRIwEAYDVQQDEwliYWlkdS5jb20w\n' +
    'ggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDQlurOIH0TOCB8jDOxjHl+\n' +
    'c02wpKZ6l3wpnUfJN+D96Yw1zqGi4YlXOytecYJQYVNIXaz5AMpYCTBffcq9PHxD\n' +
    'iLJHqJ182pMBIp5l1OBLWW1JdSUfgMIOWo4ttdEmrTSQBKNV6Ux2jRhruVzTIaCM\n' +
    'cLCORblsX/k1hRaSfUYYPIWIB8RGTQlSL5m5w64WlrB8pZuFDmqytPVhYvfEKrOx\n' +
    '36GCQSkKjYz8XrXm2c/991kyGrH6orKeWHfA+nsrDqosF08li7a3vLpxVpjwa6C/\n' +
    'zvVHm1L+2/3WE5V2P6nExyd5wetmbZMPI22n8crsnnnX20j4rKwPrEbhQ7+A4LGL\n' +
    'AgMBAAGjggaSMIIGjjAOBgNVHQ8BAf8EBAMCBaAwDAYDVR0TAQH/BAIwADCBjgYI\n' +
    'KwYBBQUHAQEEgYEwfzBEBggrBgEFBQcwAoY4aHR0cDovL3NlY3VyZS5nbG9iYWxz\n' +
    'aWduLmNvbS9jYWNlcnQvZ3Nyc2FvdnNzbGNhMjAxOC5jcnQwNwYIKwYBBQUHMAGG\n' +
    'K2h0dHA6Ly9vY3NwLmdsb2JhbHNpZ24uY29tL2dzcnNhb3Zzc2xjYTIwMTgwVgYD\n' +
    'VR0gBE8wTTBBBgkrBgEEAaAyARQwNDAyBggrBgEFBQcCARYmaHR0cHM6Ly93d3cu\n' +
    'Z2xvYmFsc2lnbi5jb20vcmVwb3NpdG9yeS8wCAYGZ4EMAQICMD8GA1UdHwQ4MDYw\n' +
    'NKAyoDCGLmh0dHA6Ly9jcmwuZ2xvYmFsc2lnbi5jb20vZ3Nyc2FvdnNzbGNhMjAx\n' +
    'OC5jcmwwggNhBgNVHREEggNYMIIDVIIJYmFpZHUuY29tggxiYWlmdWJhby5jb22C\n' +
    'DHd3dy5iYWlkdS5jboIQd3d3LmJhaWR1LmNvbS5jboIPbWN0LnkubnVvbWkuY29t\n' +
    'ggthcG9sbG8uYXV0b4IGZHd6LmNuggsqLmJhaWR1LmNvbYIOKi5iYWlmdWJhby5j\n' +
    'b22CESouYmFpZHVzdGF0aWMuY29tgg4qLmJkc3RhdGljLmNvbYILKi5iZGltZy5j\n' +
    'b22CDCouaGFvMTIzLmNvbYILKi5udW9taS5jb22CDSouY2h1YW5rZS5jb22CDSou\n' +
    'dHJ1c3Rnby5jb22CDyouYmNlLmJhaWR1LmNvbYIQKi5leXVuLmJhaWR1LmNvbYIP\n' +
    'Ki5tYXAuYmFpZHUuY29tgg8qLm1iZC5iYWlkdS5jb22CESouZmFueWkuYmFpZHUu\n' +
    'Y29tgg4qLmJhaWR1YmNlLmNvbYIMKi5taXBjZG4uY29tghAqLm5ld3MuYmFpZHUu\n' +
    'Y29tgg4qLmJhaWR1cGNzLmNvbYIMKi5haXBhZ2UuY29tggsqLmFpcGFnZS5jboIN\n' +
    'Ki5iY2Vob3N0LmNvbYIQKi5zYWZlLmJhaWR1LmNvbYIOKi5pbS5iYWlkdS5jb22C\n' +
    'EiouYmFpZHVjb250ZW50LmNvbYILKi5kbG5lbC5jb22CCyouZGxuZWwub3JnghIq\n' +
    'LmR1ZXJvcy5iYWlkdS5jb22CDiouc3UuYmFpZHUuY29tgggqLjkxLmNvbYISKi5o\n' +
    'YW8xMjMuYmFpZHUuY29tgg0qLmFwb2xsby5hdXRvghIqLnh1ZXNodS5iYWlkdS5j\n' +
    'b22CESouYmouYmFpZHViY2UuY29tghEqLmd6LmJhaWR1YmNlLmNvbYIOKi5zbWFy\n' +
    'dGFwcHMuY26CDSouYmR0anJjdi5jb22CDCouaGFvMjIyLmNvbYIMKi5oYW9rYW4u\n' +
    'Y29tgg8qLnBhZS5iYWlkdS5jb22CESoudmQuYmRzdGF0aWMuY29tghEqLmNsb3Vk\n' +
    'LmJhaWR1LmNvbYISY2xpY2suaG0uYmFpZHUuY29tghBsb2cuaG0uYmFpZHUuY29t\n' +
    'ghBjbS5wb3MuYmFpZHUuY29tghB3bi5wb3MuYmFpZHUuY29tghR1cGRhdGUucGFu\n' +
    'LmJhaWR1LmNvbTAdBgNVHSUEFjAUBggrBgEFBQcDAQYIKwYBBQUHAwIwHwYDVR0j\n' +
    'BBgwFoAU+O9/8s14Z6jeb48kjYjxhwMCs+swHQYDVR0OBBYEFLqRfFWpjx+wAmAn\n' +
    'u9fTA68tq60dMIIBfgYKKwYBBAHWeQIEAgSCAW4EggFqAWgAdQCsqzBwbOvshDH0\n' +
    'E9L0kV8RHkIkQ7HypoxPPCs7px4CwwAAAZft/P19AAAEAwBGMEQCIDXbR3HGDjbU\n' +
    'nodGnY1cHRl/qVPAGo8WLcIDK3ELxh1TAiAiDpGoxYeTk9ZINfUke/b1/z1W853b\n' +
    'THKGLUqtd0VSzwB3AMs49xWJfIShRF9bwd37yW7ymlnNRwppBYWwyxTDFFjnAAAB\n' +
    'l+38/YgAAAQDAEgwRgIhALzJ+vgaGcsiz79toyL2pzZ7xTWhpfetI7hZLYuXCWjj\n' +
    'AiEAqxn0UqX7V4AsZPGpX+532nyXeDeFiw1BzIWAPC5xW4EAdgDXbX0Q0af1d8LH\n' +
    '6V/XAL/5gskzWmXh0LMBcxfAyMVpdwAAAZft/P1gAAAEAwBHMEUCIB5fJBkXed1m\n' +
    '2rEJtxGf2jxJpSF7EB7/fI/oEgtF/jiqAiEAt5epvaInoQh5QrUY3k52wR0NNaz1\n' +
    'MjsFfJ2MTId3qAwwDQYJKoZIhvcNAQELBQADggEBAAI8edsGz+gNlt+JRyk+itIv\n' +
    '06K0Ha7Jmq7oHbPWUd47cH5ViW0BrvjrinbwVf5yQ6PgOM6nBqyXjqu3r4fFI1GD\n' +
    'LB2kwkOt4O2ffZNeHSdRJjLG+mliu8+mX06JZ0VD5QXHr+xurCJbIGEpmxmtxg1P\n' +
    'x/Rfdy+5qCo2TbN1W7F9pXG2Za675Hr+h7AzD04rppiGXBXW9Qz+brEogDes9InO\n' +
    'Iak3YZB1t8bZZ0JTaUnObVWULgdUGFl1MLXMWVclW/z3r88e6+yC1VPQYMweervS\n' +
    'WXLwlMb+2OHBeF3H9IUlpGE0VzKx/PZMbN8bjQ0Lte8fjFjAYeP5xsLGB1vxwiA=\n' +
    '-----END CERTIFICATE-----\n';

// GitHub.com 商业证书（EC P-256，演示 ECC + EKU 场景）—— 2026-05-05 ~ 2026-08-02
const _CP_SAMPLE_GITHUB =
    '-----BEGIN CERTIFICATE-----\n' +
    'MIID7jCCA5SgAwIBAgIRAOfOzDsT+zt7ikbqjNCutxwwCgYIKoZIzj0EAwIwYDEL\n' +
    'MAkGA1UEBhMCR0IxGDAWBgNVBAoTD1NlY3RpZ28gTGltaXRlZDE3MDUGA1UEAxMu\n' +
    'U2VjdGlnbyBQdWJsaWMgU2VydmVyIEF1dGhlbnRpY2F0aW9uIENBIERWIEUzNjAe\n' +
    'Fw0yNjA1MDUwMDAwMDBaFw0yNjA4MDIyMzU5NTlaMBUxEzARBgNVBAMTCmdpdGh1\n' +
    'Yi5jb20wWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAAS903KkRykw1/HgZ58WoPcw\n' +
    'g9WxmpOnkheNDAYpjo8524nqwI8L3Gtt9ULUoBK6SB2vAE6JLHqezRF733pv3RH9\n' +
    'o4ICeDCCAnQwHwYDVR0jBBgwFoAUF5moBMFv5C1wqAoQPQPT6Rq4JmMwHQYDVR0O\n' +
    'BBYEFARFu0+KUIMQYUIXRXuAH/eW6mMNMA4GA1UdDwEB/wQEAwIHgDAMBgNVHRMB\n' +
    'Af8EAjAAMBMGA1UdJQQMMAoGCCsGAQUFBwMBMEkGA1UdIARCMEAwNAYLKwYBBAGy\n' +
    'MQECAgcwJTAjBggrBgEFBQcCARYXaHR0cHM6Ly9zZWN0aWdvLmNvbS9DUFMwCAYG\n' +
    'Z4EMAQIBMIGEBggrBgEFBQcBAQR4MHYwTwYIKwYBBQUHMAKGQ2h0dHA6Ly9jcnQu\n' +
    'c2VjdGlnby5jb20vU2VjdGlnb1B1YmxpY1NlcnZlckF1dGhlbnRpY2F0aW9uQ0FE\n' +
    'VkUzNi5jcnQwIwYIKwYBBQUHMAGGF2h0dHA6Ly9vY3NwLnNlY3RpZ28uY29tMIIB\n' +
    'AYKKwYBBAHWeQIEAgSB9QSB8gDwAHYA1219ENGn9XfCx+lf1wC/+YLJM1pl4dCz\n' +
    'AXMXwMjFaXcAAAGd9Xiz+gAABAMARzBFAiEA8gPAyY8ZF6+InuW94LBwo/kyMIal\n' +
    'ilBBXwO3SVGKppgCIHuzNLL+0THSi9l20/kYL+hhejDCMjPboA+AxAxxmUNEAHYA\n' +
    'yKPEf8ezrbk1awE/anoSbeM6TkOlxkb5l605dZkdz5oAAAGd9Xi0OAAABAMARzBF\n' +
    'AiEArnOaGOEKYqakGnfGIg8elU+gQi9b3A/kWB2GhRhWoT8CIB9xRHLTdXb2aC4j\n' +
    'FcpFI1QDodePpVAZaOvwI9Kl1qJ/MCUGA1UdEQQeMByCCmdpdGh1Yi5jb22CDnd3\n' +
    'dy5naXRodWIuY29tMAoGCCqGSM49BAMCA0gAMEUCIBF+pLxQJ4Dm4KwXz3JpBt/l\n' +
    'y8gxpxKyOhkbFLoRgkXaAiEAmjert1nzjf2HJHnwWcMlq5Y3o5ap6DvB1imeTYj1\n' +
    'fN8=\n' +
    '-----END CERTIFICATE-----\n';

// GitHub.com 真实证书（运行时由 Node tls 抓取后保存；浏览器侧 hardcode 同一份）

function certparserInit() {
    // init 钩子：留给未来扩展
}

// === Node 导出（仅用于 Node 测试；浏览器忽略）===
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseCertInput: parseCertInput,
        parseAllCertificates: parseAllCertificates,
        expiryStatus: expiryStatus,
        sha256Fingerprint: sha256Fingerprint,
        sha256FingerprintSync: sha256FingerprintSync,
        _cpBytesToHex: _cpBytesToHex,
        _cpHexToBytes: _cpHexToBytes,
        _cpFormatRdn: _cpFormatRdn,
        _cpFormatSerial: _cpFormatSerial,
        _cpPublicKeyInfo: _cpPublicKeyInfo,
        _cpExtractSAN: _cpExtractSAN,
        _cpExtractKeyUsage: _cpExtractKeyUsage,
        _cpExtractExtKeyUsage: _cpExtractExtKeyUsage,
        _cpExtractCRL: _cpExtractCRL,
        OID_SIG: OID_SIG,
        OID_PUBKEY: OID_PUBKEY,
        OID_CURVE: OID_CURVE,
        OID_EKU: OID_EKU,
    };
}

registerInit('certparser', certparserInit);
