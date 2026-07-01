const {
    parseBatch,
    toTSV,
    toJSON,
    tsFormat: tsbFormat,
    tsFormatInZone: tsbFormatInZone,
} = require('../../js/generate/ts.js');

// 2023-11-14 22:13:20 UTC 对应 1700000000 秒 / 1700000000000 毫秒
const TS_SEC = '1700000000';
const TS_MS = '1700000000000';

describe('parseBatch - ts2date Unix 秒(10 位)解析', () => {
    test('1700000000 → 2023-11-14 22:13:20 UTC', () => {
        const r = parseBatch(TS_SEC, {
            direction: 'ts2date',
            outputFormat: 'yyyy-MM-dd HH:mm:ss',
            timezone: 'UTC',
        });
        expect(r.err).toEqual([]);
        expect(r.ok).toHaveLength(1);
        expect(r.ok[0].line).toBe(1);
        expect(r.ok[0].input).toBe(TS_SEC);
        expect(r.ok[0].output).toBe('2023-11-14 22:13:20');
        expect(r.ok[0].kind).toBe('sec');
    });
});

describe('parseBatch - ts2date Unix 毫秒(13 位)解析', () => {
    test('1700000000000 → 2023-11-14 22:13:20 UTC', () => {
        const r = parseBatch(TS_MS, {
            direction: 'ts2date',
            outputFormat: 'yyyy-MM-dd HH:mm:ss',
            timezone: 'UTC',
        });
        expect(r.ok[0].output).toBe('2023-11-14 22:13:20');
        expect(r.ok[0].kind).toBe('ms');
    });
});

describe('parseBatch - date2ts ISO 8601 字符串', () => {
    test('2024-01-01T00:00:00Z → Date.UTC(2024,0,1,0,0,0)', () => {
        const r = parseBatch('2024-01-01T00:00:00Z', {
            direction: 'date2ts',
            outputFormat: 'ms',
            timezone: 'UTC',
        });
        expect(r.err).toEqual([]);
        expect(parseInt(r.ok[0].output, 10)).toBe(Date.UTC(2024, 0, 1, 0, 0, 0));
    });
});

describe('parseBatch - date2ts yyyy-MM-dd HH:mm:ss 字符串', () => {
    test('2024-01-01 00:00:00(本地时)→ Unix 秒', () => {
        const s = '2024-01-01 00:00:00';
        const r = parseBatch(s, { direction: 'date2ts', outputFormat: 's', timezone: 'UTC' });
        // 用同一字符串 + new Date 解析,保证时区无关(本地解释)
        const expected = Math.floor(new Date(s).getTime() / 1000);
        expect(parseInt(r.ok[0].output, 10)).toBe(expected);
    });
});

describe('parseBatch - 混合输入', () => {
    test('5 行,3 成功 2 失败', () => {
        const text = [TS_SEC, 'abc', TS_MS, TS_SEC.replace(/0$/, '1'), 'xyz'].join('\n');
        const r = parseBatch(text, {
            direction: 'ts2date',
            outputFormat: 'yyyy-MM-dd HH:mm:ss',
            timezone: 'UTC',
        });
        expect(r.ok).toHaveLength(3);
        expect(r.err).toHaveLength(2);
    });
});

describe('parseBatch - 空行跳过', () => {
    test('多个空行不计入结果', () => {
        const text = '\n\n' + TS_SEC + '\n   \n\n' + TS_MS + '\n';
        const r = parseBatch(text, {
            direction: 'ts2date',
            outputFormat: 'yyyy-MM-dd HH:mm:ss',
            timezone: 'UTC',
        });
        expect(r.ok).toHaveLength(2);
        expect(r.err).toHaveLength(0);
    });

    test('连续空行 + 全部空字符串输入', () => {
        const r = parseBatch('\n\n\n', {
            direction: 'ts2date',
            outputFormat: 'yyyy-MM-dd HH:mm:ss',
            timezone: 'UTC',
        });
        expect(r.ok).toEqual([]);
        expect(r.err).toEqual([]);
    });
});

describe('parseBatch - 反向: date → ts(秒和毫秒)', () => {
    test('date → Unix 秒', () => {
        const s = '2024-06-15 12:30:45';
        const r = parseBatch(s, { direction: 'date2ts', outputFormat: 's', timezone: 'UTC' });
        expect(r.ok[0].output).toBe(String(Math.floor(new Date(s).getTime() / 1000)));
    });

    test('date → Unix 毫秒', () => {
        const s = '2024-06-15 12:30:45';
        const r = parseBatch(s, { direction: 'date2ts', outputFormat: 'ms', timezone: 'UTC' });
        expect(r.ok[0].output).toBe(String(new Date(s).getTime()));
    });
});

describe('parseBatch - 时区差异(UTC vs Asia/Shanghai)', () => {
    test('同一秒数在 Asia/Shanghai 晚 8 小时', () => {
        const r1 = parseBatch(TS_SEC, {
            direction: 'ts2date',
            outputFormat: 'yyyy-MM-dd HH:mm:ss',
            timezone: 'UTC',
        });
        const r2 = parseBatch(TS_SEC, {
            direction: 'ts2date',
            outputFormat: 'yyyy-MM-dd HH:mm:ss',
            timezone: 'Asia/Shanghai',
        });
        expect(r1.ok[0].output).toBe('2023-11-14 22:13:20');
        expect(r2.ok[0].output).toBe('2023-11-15 06:13:20');
    });
});

describe('parseBatch - 启发式数字识别', () => {
    test('7 位数字按秒解析(2009-02-13 范围)', () => {
        const r = parseBatch('1234567', {
            direction: 'ts2date',
            outputFormat: 's',
            timezone: 'UTC',
        });
        // 1234567 秒 → 1970-01-15 06:56:07 UTC
        expect(r.ok[0].output).toBe('1234567');
    });

    test('14 位数字按毫秒解析', () => {
        const r = parseBatch('12345678901234', {
            direction: 'ts2date',
            outputFormat: 'ms',
            timezone: 'UTC',
        });
        expect(r.ok[0].output).toBe('12345678901234');
    });
});

describe('toTSV - 格式化', () => {
    test('空数组返回空字符串', () => {
        expect(toTSV([])).toBe('');
    });

    test('有数据时含表头与制表符分隔', () => {
        const ok = [
            { line: 1, input: '1700000000', output: '2023-11-14 22:13:20' },
            { line: 2, input: '1700000000000', output: '2023-11-14 22:13:20' },
        ];
        const lines = toTSV(ok).split('\n');
        expect(lines).toHaveLength(3);
        expect(lines[0]).toBe('行号\t输入\t输出');
        expect(lines[1]).toBe('1\t1700000000\t2023-11-14 22:13:20');
        expect(lines[2]).toBe('2\t1700000000000\t2023-11-14 22:13:20');
    });
});

describe('toJSON - 格式化', () => {
    test('空数组返回 []', () => {
        expect(toJSON([])).toBe('[]');
    });

    test('序列化数据为合法 JSON 数组', () => {
        const ok = [{ line: 1, input: '1700000000', output: '2023-11-14 22:13:20' }];
        expect(JSON.parse(toJSON(ok))).toEqual(ok);
    });

    test('输出使用 2 空格缩进', () => {
        const ok = [{ line: 1, input: 'x', output: 'y' }];
        expect(toJSON(ok)).toContain('\n  ');
    });
});

describe('parseBatch - 错误信息含行号', () => {
    test('行号 1-indexed 且准确', () => {
        const text = [TS_SEC, 'bad', TS_MS, 'junk', '1700000001'].join('\n');
        const r = parseBatch(text, {
            direction: 'ts2date',
            outputFormat: 'yyyy-MM-dd HH:mm:ss',
            timezone: 'UTC',
        });
        expect(r.err).toHaveLength(2);
        expect(r.err[0].line).toBe(2);
        expect(r.err[0].input).toBe('bad');
        expect(r.err[0].msg).toBeTruthy();
        expect(r.err[1].line).toBe(4);
        expect(r.err[1].input).toBe('junk');
    });

    test('ts2date 模式下日期字符串被拒绝', () => {
        const r = parseBatch('2024-01-01 12:00:00', {
            direction: 'ts2date',
            outputFormat: 'yyyy-MM-dd HH:mm:ss',
            timezone: 'UTC',
        });
        expect(r.ok).toEqual([]);
        expect(r.err).toHaveLength(1);
        expect(r.err[0].msg).toMatch(/无法识别/);
    });
});

describe('tsbFormat - 三种输出格式', () => {
    const ms = Date.UTC(2023, 10, 14, 22, 13, 20); // 2023-11-14 22:13:20 UTC

    test('yyyy-MM-dd HH:mm:ss(UTC)', () => {
        expect(tsbFormat(ms, 'yyyy-MM-dd HH:mm:ss', 'UTC')).toBe('2023-11-14 22:13:20');
    });

    test('ISO 8601(总是 UTC + Z)', () => {
        expect(tsbFormat(ms, 'ISO', 'UTC')).toBe('2023-11-14T22:13:20.000Z');
    });

    test('Unix 毫秒', () => {
        expect(tsbFormat(ms, 'ms', 'UTC')).toBe(String(ms));
    });

    test('Unix 秒(向下取整)', () => {
        expect(tsbFormat(ms, 's', 'UTC')).toBe('1700000000');
    });

    test('未知 format 返回 null', () => {
        expect(tsbFormat(ms, 'nonsense', 'UTC')).toBeNull();
    });
});

describe('tsbFormatInZone - 时区格式化', () => {
    const ms = Date.UTC(2023, 10, 14, 22, 13, 20);

    test('UTC', () => {
        expect(tsbFormatInZone(new Date(ms), 'UTC')).toBe('2023-11-14 22:13:20');
    });

    test('Asia/Shanghai(UTC+8)', () => {
        expect(tsbFormatInZone(new Date(ms), 'Asia/Shanghai')).toBe('2023-11-15 06:13:20');
    });
});
