const {
    morseEncode,
    morseDecode,
    MORSE_TABLE,
    isCjkChar,
    setCtcTable,
    loadCtcTable,
} = require('../../js/encode/morse.js');

describe('morse 编解码', () => {
    test('morseEncode 编码 SOS', () => {
        expect(morseEncode('SOS')).toBe('... --- ...');
    });

    test('morseEncode 编码带空格的词', () => {
        expect(morseEncode('HELLO WORLD')).toBe(
            '.... . .-.. .-.. --- / .-- --- .-. .-.. -..',
        );
    });

    test('morseEncode 大小写不敏感', () => {
        expect(morseEncode('AbC')).toBe(morseEncode('abc'));
    });

    test('morseEncode 数字与标点', () => {
        expect(morseEncode('1+1=2')).toBe('.---- .-.-. .---- -...- ..---');
        expect(morseEncode('A.B')).toBe('.- .-.-.- -...');
    });

    test('morseEncode 空串返回空', () => {
        expect(morseEncode('')).toBe('');
        expect(morseEncode('   ')).toBe('');
    });

    test('morseEncode 自定义点划符号', () => {
        expect(morseEncode('E', { dot: '·', dash: '−' })).toBe('·');
        expect(morseEncode('T', { dot: '·', dash: '−' })).toBe('−');
        expect(morseEncode('A', { dot: '·', dash: '−' })).toBe('·−');
    });

    test('morseEncode 不支持字符抛错', () => {
        expect(() => morseEncode('你好')).toThrow(/中文电码|不支持/);
    });

    test('morseDecode 解码 SOS', () => {
        expect(morseDecode('... --- ...')).toBe('SOS');
    });

    test('morseDecode 词分隔 /', () => {
        expect(morseDecode('.... . .-.. .-.. --- / .-- --- .-. .-.. -..')).toBe('HELLO WORLD');
    });

    test('morseDecode 兼容 ·− 与多空格词分隔', () => {
        expect(morseDecode('···· ·  −−−')).toBe('HE O');
        expect(morseDecode('...    ---')).toBe('S O');
        expect(morseDecode('−')).toBe('T');
    });

    test('morseDecode 小写选项', () => {
        expect(morseDecode('... --- ...', { lowerCase: true })).toBe('sos');
    });

    test('morseDecode 未知码抛错', () => {
        expect(() => morseDecode('........')).toThrow(/未知摩斯码/);
    });

    test('morseEncode -> morseDecode 往返一致', () => {
        const samples = ['SOS', 'HELLO WORLD', 'TEST-123', 'A@B.C'];
        samples.forEach((s) => {
            expect(morseDecode(morseEncode(s))).toBe(s);
        });
    });

    test('MORSE_TABLE 含 26 字母与 0-9', () => {
        for (let i = 0; i < 26; i++) {
            const ch = String.fromCharCode(65 + i);
            expect(MORSE_TABLE[ch]).toBeTruthy();
        }
        for (let d = 0; d <= 9; d++) {
            expect(MORSE_TABLE[String(d)]).toBeTruthy();
        }
    });
});

describe('morse 中文电码', () => {
    beforeAll(async () => {
        await loadCtcTable();
    });

    test('isCjkChar 识别汉字', () => {
        expect(isCjkChar('中')).toBe(true);
        expect(isCjkChar('A')).toBe(false);
        expect(isCjkChar('1')).toBe(false);
    });

    test('中文电码：中=0022', () => {
        // 0=----- 2=..---
        expect(morseEncode('中', { chinese: true })).toBe('----- ----- ..--- ..---');
    });

    test('中文电码：中文 往返', () => {
        const code = morseEncode('中文', { chinese: true });
        expect(morseDecode(code, { chinese: true })).toBe('中文');
    });

    test('中英混合往返', () => {
        const s = 'Hello 中文';
        const code = morseEncode(s, { chinese: true });
        expect(morseDecode(code, { chinese: true })).toBe('HELLO 中文');
    });

    test('未开中文选项遇汉字抛错', () => {
        expect(() => morseEncode('汉', { chinese: false })).toThrow(/中文电码/);
    });

    test('setCtcTable 可注入小表', () => {
        setCtcTable({ 测: '1234', 试: '5678' });
        expect(morseEncode('测试', { chinese: true })).toBe(
            '.---- ..--- ...-- ....- ..... -.... --... ---..',
        );
        expect(morseDecode(morseEncode('测试', { chinese: true }), { chinese: true })).toBe('测试');
        // 恢复完整表供后续（若有）
        return loadCtcTable().then(() => {
            // loadCtcTable 在已加载时直接返回旧表；强制重载：
            setCtcTable(require('../../public/lib/ctc-cn.json'));
        });
    });
});
