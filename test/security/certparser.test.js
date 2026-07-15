const crypto = require('crypto');
// 补充 Web Crypto 垫片供 sha256Fingerprint（async）使用
if (typeof globalThis.crypto === 'undefined') {
    globalThis.crypto = crypto.webcrypto;
}

const {
    parseCertInput,
    parseAllCertificates,
    expiryStatus,
    sha256Fingerprint,
    sha256FingerprintSync,
    _cpBytesToHex,
    _cpHexToBytes,
    _cpExtractKeyUsage,
    _cpExtractExtKeyUsage,
    _cpExtractSAN,
    _cpExtractCRL,
    OID_SIG,
    OID_PUBKEY,
    OID_CURVE,
    OID_EKU,
} = require('../../js/security/certparser.js');

describe('_cpBytesToHex / _cpHexToBytes 互逆', () => {
    test('空', () => {
        expect(_cpBytesToHex(new Uint8Array(0))).toBe('');
        expect(Array.from(_cpHexToBytes(''))).toEqual([]);
    });

    test('已知值', () => {
        expect(_cpBytesToHex(new Uint8Array([0, 255, 16]))).toBe('00ff10');
        expect(Array.from(_cpHexToBytes('00ff10'))).toEqual([0, 255, 16]);
    });

    test('忽略分隔符与 0x 前缀', () => {
        expect(Array.from(_cpHexToBytes('0x00:ff-10'))).toEqual([0, 255, 16]);
        expect(Array.from(_cpHexToBytes('00 FF 10'))).toEqual([0, 255, 16]);
    });

    test('奇数长度 / 非法字符抛错', () => {
        expect(() => _cpHexToBytes('abc')).toThrow('HEX 格式无效');
        expect(() => _cpHexToBytes('zz')).toThrow('HEX 格式无效');
    });
});

describe('parseCertInput', () => {
    test('空输入抛错', () => {
        expect(() => parseCertInput('')).toThrow('输入不能为空');
        expect(() => parseCertInput(null)).toThrow('输入不能为空');
        expect(() => parseCertInput('   ')).toThrow('输入不能为空');
    });

    test('解析单块 PEM', () => {
        // 最小假 PEM：Base64 为 "Hi" → SGk=，仅测分块/解码，不要求合法证书
        const pem =
            '-----BEGIN CERTIFICATE-----\nSGk=\n-----END CERTIFICATE-----';
        const r = parseCertInput(pem);
        expect(r.format).toBe('pem');
        expect(r.blocks).toHaveLength(1);
        expect(Array.from(r.blocks[0].der)).toEqual([72, 105]);
        expect(r.blocks[0].pem).toContain('BEGIN CERTIFICATE');
    });

    test('解析多块 PEM', () => {
        const pem =
            '-----BEGIN CERTIFICATE-----\nSGk=\n-----END CERTIFICATE-----\n' +
            '-----BEGIN CERTIFICATE-----\nQQ==\n-----END CERTIFICATE-----';
        const r = parseCertInput(pem);
        expect(r.format).toBe('pem');
        expect(r.blocks).toHaveLength(2);
        expect(Array.from(r.blocks[0].der)).toEqual([72, 105]);
        expect(Array.from(r.blocks[1].der)).toEqual([65]);
    });

    test('DER HEX 头为 0x30 时识别为 der', () => {
        // 至少 16B 且头字节 0x30 SEQUENCE
        const hex = '30' + '0102030405060708090a0b0c0d0e0f';
        const r = parseCertInput(hex);
        expect(r.format).toBe('der');
        expect(r.blocks).toHaveLength(1);
        expect(r.blocks[0].der[0]).toBe(0x30);
        expect(r.blocks[0].der.length).toBe(16);
        expect(r.blocks[0].pem).toContain('BEGIN CERTIFICATE');
    });

    test('DER 过短抛错', () => {
        // 0x30 开头但 < 16B
        expect(() => parseCertInput('300102')).toThrow('DER 长度过短');
    });

    test('DER 头字节错误抛错', () => {
        // 16 字节但非 0x30
        expect(() => parseCertInput('110102030405060708090a0b0c0d0e0f10')).toThrow(
            'DER 头字节错误',
        );
    });
});

describe('expiryStatus', () => {
    test('空值 unknown', () => {
        expect(expiryStatus(null).status).toBe('unknown');
        expect(expiryStatus(undefined).label).toBe('未知');
    });

    test('已过期', () => {
        const past = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
        const r = expiryStatus(past);
        expect(r.status).toBe('expired');
        expect(r.color).toBe('red');
        expect(r.days).toBeLessThan(0);
    });

    test('即将过期（<30 天）', () => {
        const soon = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
        const r = expiryStatus(soon);
        expect(r.status).toBe('expiring');
        expect(r.color).toBe('yellow');
        expect(r.days).toBeGreaterThanOrEqual(9);
        expect(r.days).toBeLessThan(30);
    });

    test('有效（>=30 天）', () => {
        const future = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
        const r = expiryStatus(future);
        expect(r.status).toBe('valid');
        expect(r.color).toBe('green');
        expect(r.days).toBeGreaterThanOrEqual(89);
    });
});

describe('sha256FingerprintSync', () => {
    test('已知空 DER 指纹格式', () => {
        const fp = sha256FingerprintSync(new Uint8Array([0x30, 0x00]));
        expect(fp).toMatch(/^[0-9A-F]{2}(:[0-9A-F]{2})+$/);
        // SHA-256(0x30 0x00)
        expect(fp.replace(/:/g, '').length).toBe(64);
    });
});

describe('OID 映射表', () => {
    test('常见签名算法', () => {
        expect(OID_SIG['1.2.840.113549.1.1.11']).toBe('sha256WithRSAEncryption');
    });

    test('公钥算法与曲线', () => {
        expect(OID_PUBKEY['1.2.840.113549.1.1.1']).toBe('RSA');
        expect(OID_CURVE['1.2.840.10045.3.1.7']).toBe('P-256');
    });

    test('扩展密钥用途', () => {
        expect(OID_EKU['1.3.6.1.5.5.7.3.1']).toBe('TLS Web Server Auth');
    });
});

describe('sha256Fingerprint（async WebCrypto）', () => {
    test('与 sync 版本结果一致', async () => {
        const der = new Uint8Array([0x30, 0x03, 0x01, 0x02, 0x03]);
        const asyncFp = await sha256Fingerprint(der);
        const syncFp = sha256FingerprintSync(der);
        expect(asyncFp).toBe(syncFp);
    });

    test('空 DER 仍产生 32 字节指纹', async () => {
        const fp = await sha256Fingerprint(new Uint8Array([0x30, 0x00]));
        expect(fp).toMatch(/^[0-9A-F]{2}(:[0-9A-F]{2}){31}$/);
    });
});

describe('_cpExtractKeyUsage', () => {
    function makeKuExt(byte0, byte1) {
        const arr = new Uint8Array([byte0, byte1 || 0]);
        return { extnID: '2.5.29.15', parsedValue: { valueBlock: { valueHexView: arr } } };
    }

    test('digitalSignature（bit 0）', () => {
        expect(_cpExtractKeyUsage(makeKuExt(0x80))).toEqual(['digitalSignature']);
    });

    test('keyEncipherment + digitalSignature（0xa0）', () => {
        expect(_cpExtractKeyUsage(makeKuExt(0xa0))).toEqual(
            expect.arrayContaining(['digitalSignature', 'keyEncipherment']),
        );
        expect(_cpExtractKeyUsage(makeKuExt(0xa0))).toHaveLength(2);
    });

    test('keyCertSign（byte0 bit5 = 0x04）', () => {
        expect(_cpExtractKeyUsage(makeKuExt(0x04))).toEqual(['keyCertSign']);
    });

    test('无 parsedValue 返回空数组', () => {
        expect(_cpExtractKeyUsage({ extnID: '2.5.29.15' })).toEqual([]);
    });

    test('多字节第二段 bit 正确', () => {
        // byte1=0x80 → decOnly (pos 8)
        expect(_cpExtractKeyUsage(makeKuExt(0x00, 0x80))).toEqual(['decipherOnly']);
    });
});

describe('_cpExtractExtKeyUsage', () => {
    test('识别 ServerAuth + ClientAuth', () => {
        const ext = {
            parsedValue: {
                keyPurposes: ['1.3.6.1.5.5.7.3.1', '1.3.6.1.5.5.7.3.2'],
            },
        };
        expect(_cpExtractExtKeyUsage(ext)).toEqual([
            'TLS Web Server Auth',
            'TLS Web Client Auth',
        ]);
    });

    test('未知 OID 原样保留', () => {
        const ext = { parsedValue: { keyPurposes: ['1.2.3.4.5'] } };
        expect(_cpExtractExtKeyUsage(ext)).toEqual(['1.2.3.4.5']);
    });

    test('无 parsedValue 返回空', () => {
        expect(_cpExtractExtKeyUsage(null)).toEqual([]);
    });
});

describe('_cpExtractSAN', () => {
    test('提取 DNS + IP + Email + URI', () => {
        const exts = [
            {
                extnID: '2.5.29.17',
                parsedValue: {
                    altNames: [
                        { type: 2, value: 'example.com' },
                        { type: 2, value: '*.example.com' },
                        { type: 7, value: [192, 168, 1, 1] },
                        { type: 1, value: 'admin@example.com' },
                        { type: 6, value: 'https://example.com' },
                    ],
                },
            },
        ];
        const san = _cpExtractSAN(exts);
        expect(san.dns).toEqual(['example.com', '*.example.com']);
        expect(san.ip).toEqual(['192.168.1.1']);
        expect(san.email).toEqual(['admin@example.com']);
        expect(san.uri).toEqual(['https://example.com']);
    });

    test('IPv6 地址正确格式化', () => {
        const exts = [
            {
                extnID: '2.5.29.17',
                parsedValue: {
                    altNames: [
                        { type: 7, value: [0x20, 0x01, 0x0d, 0xb8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1] },
                    ],
                },
            },
        ];
        const san = _cpExtractSAN(exts);
        expect(san.ip[0]).toBe('2001:db8:0:0:0:0:0:1');
    });

    test('无 SAN 扩展返回空结构', () => {
        const san = _cpExtractSAN([]);
        expect(san).toEqual({ dns: [], ip: [], uri: [], email: [] });
    });

    test('IP 为字符串时直接使用', () => {
        const exts = [
            {
                extnID: '2.5.29.17',
                parsedValue: { altNames: [{ type: 7, value: '10.0.0.1' }] },
            },
        ];
        expect(_cpExtractSAN(exts).ip).toEqual(['10.0.0.1']);
    });
});

describe('_cpExtractCRL', () => {
    test('提取 URI 分发点', () => {
        const exts = [
            {
                extnID: '2.5.29.31',
                parsedValue: {
                    distributionPoints: [
                        { distributionPoint: { fullName: [{ type: 6, value: 'http://crl.example.com/ca.crl' }] } },
                    ],
                },
            },
        ];
        expect(_cpExtractCRL(exts)).toEqual(['http://crl.example.com/ca.crl']);
    });

    test('多个分发点', () => {
        const exts = [
            {
                extnID: '2.5.29.31',
                parsedValue: {
                    distributionPoints: [
                        { distributionPoint: { fullName: [{ type: 6, value: 'http://a.com/crl' }] } },
                        { distributionPoint: { fullName: [{ type: 6, value: 'http://b.com/crl' }] } },
                    ],
                },
            },
        ];
        expect(_cpExtractCRL(exts)).toEqual(['http://a.com/crl', 'http://b.com/crl']);
    });

    test('无 CRL 扩展返回空', () => {
        expect(_cpExtractCRL([])).toEqual([]);
    });

    test('分发点为数组形式（v3 兼容）', () => {
        const exts = [
            {
                extnID: '2.5.29.31',
                parsedValue: {
                    distributionPoints: [
                        { distributionPoint: [{ type: 6, value: 'http://x.com/crl' }] },
                    ],
                },
            },
        ];
        expect(_cpExtractCRL(exts)).toEqual(['http://x.com/crl']);
    });
});

describe('expiryStatus（扩展边界）', () => {
    test('恰好 30 天 → valid', () => {
        const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        expect(expiryStatus(d).status).toBe('valid');
    });

    test('恰好 29 天 → expiring', () => {
        const d = new Date(Date.now() + 29 * 24 * 60 * 60 * 1000);
        expect(expiryStatus(d).status).toBe('expiring');
    });

    test('字符串日期可解析', () => {
        const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        expect(expiryStatus(future.toISOString()).status).toBe('valid');
    });
});

describe('parseAllCertificates（真实 PEM 解析）', () => {
    // ISRG Root X1（Let's Encrypt 根证书，RSA 4096，v3）
    const LE_PEM =
        '-----BEGIN CERTIFICATE-----\n' +
        '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\n' +
        '-----END CERTIFICATE-----\n';

    test('Let\'s Encrypt 根证书解析成功', () => {
        const r = parseAllCertificates(LE_PEM);
        expect(r.format).toBe('pem');
        expect(r.certs).toHaveLength(1);
        const c = r.certs[0];
        expect(c.error).toBeUndefined();
        expect(c.version).toBe(3);
        expect(c.signatureAlg).toContain('RSA');
        expect(c.publicKey.algo).toBe('RSA');
        expect(c.publicKey.bits).toBe(4096);
        expect(c.subjectStr).toContain('ISRG Root X1');
        expect(c.issuerStr).toContain('ISRG Root X1');
        expect(c.serial).toBeTruthy();
        expect(c.notBefore).toBeInstanceOf(Date);
        expect(c.notAfter).toBeInstanceOf(Date);
        expect(c.expiry.status).toBe('valid');
    });

    test('GitHub.com EC 证书解析公钥信息', () => {
        const GH_PEM =
            '-----BEGIN CERTIFICATE-----\n' +
            'MIID7jCCA5SgAwIBAgIQcgEOA/SgZ/5OeWJmQwcY9jAKBggqhkjOPQQDAjBgMQsw\n' +
            'CQYDVQQGEwJHQjEYMBYGA1UEChMPU2VjdGlnbyBMaW1pdGVkMTcwNQYDVQQDEy5T\n' +
            'ZWN0aWdvIFB1YmxpYyBTZXJ2ZXIgQXV0aGVudGljYXRpb24gQ0EgRFYgRTM2MB4X\n' +
            'DTI2MDcwMzAwMDAwMFoXDTI2MDkzMDIzNTk1OVowFTETMBEGA1UEAxMKZ2l0aHVi\n' +
            'LmNvbTBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABIWWMDSOi/1sMgquP4I/obBM\n' +
            '735wpzcIZi4fLeiBsToXVVSwjj4OPH+W6azHzxETM0gUP7raehddpJ8uwjqYsTij\n' +
            'ggJ5MIICdTAfBgNVHSMEGDAWgBQXmagEwW/kLXCoChA9A9PpGrgmYzAdBgNVHQ4E\n' +
            'FgQUEKU6Ytbv1gZWnty4gvzCe2hdPWkwDgYDVR0PAQH/BAQDAgeAMAwGA1UdEwEB\n' +
            '/wQCMAAwEwYDVR0lBAwwCgYIKwYBBQUHAwEwSQYDVR0gBEIwQDA0BgsrBgEEAbIx\n' +
            'AQICBzAlMCMGCCsGAQUFBwIBFhdodHRwczovL3NlY3RpZ28uY29tL0NQUzAIBgZn\n' +
            'gQwBAgEwgYQGCCsGAQUFBwEBBHgwdjBPBggrBgEFBQcwAoZDaHR0cDovL2NydC5z\n' +
            'ZWN0aWdvLmNvbS9TZWN0aWdvUHVibGljU2VydmVyQXV0aGVudGljYXRpb25DQURW\n' +
            'RTM2LmNydDAjBggrBgEFBQcwAYYXaHR0cDovL29jc3Auc2VjdGlnby5jb20wggEF\n' +
            'BgorBgEEAdZ5AgQCBIH2BIHzAPEAdgDXbX0Q0af1d8LH6V/XAL/5gskzWmXh0LMB\n' +
            'cxfAyMVpdwAAAZ8lTHVtAAAEAwBHMEUCIQCkpa0ZYNwsPiMRLHz+kk1QS/W9bg/8\n' +
            '4yNBVGkT289dNQIgMWLgxYp6vGJXJxyD3c1NI1aZsPA7GqyLSXaZLZHgKh0AdwDI\n' +
            'o8R/x7OtuTVrAT9qehJt4zpOQ6XGRvmXrTl1mR3PmgAAAZ8lTHVhAAAEAwBIMEYC\n' +
            'IQDsO+TR8EVfCiObBPoDLRKzKLQ/uorsebJ2aZDIejA9RgIhAJ6dp7FqCD93tQXX\n' +
            'AF24pDIms1fX4dZ+VPzXGuD8u8t1MCUGA1UdEQQeMByCCmdpdGh1Yi5jb22CDnd3\n' +
            'dy5naXRodWIuY29tMAoGCCqGSM49BAMCA0gAMEUCIB0PC2GRSurxu8gCkSNsYxmw\n' +
            'kAtCNfCvpXRiif8PhGkmAiEAzBH4AVYAtv1FsMrJabD9FYcAql0EteKafckH2exj\n' +
            'Uag=\n' +
            '-----END CERTIFICATE-----\n';
        const r = parseAllCertificates(GH_PEM);
        const c = r.certs[0];
        expect(c.error).toBeUndefined();
        expect(c.publicKey.algo).toBe('EC');
        expect(c.publicKey.curve).toBe('P-256');
        expect(c.publicKey.bits).toBe(256);
        expect(c.san.dns).toContain('github.com');
        expect(c.san.dns).toContain('www.github.com');
    });
});
