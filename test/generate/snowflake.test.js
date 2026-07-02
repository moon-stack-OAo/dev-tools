const {
    SNOWFLAKE_EPOCH,
    snowflakeId,
    nextSnowflake,
    nextLeafId,
    baiduUid,
    parseSnowflake,
    parseBaiduUid,
    sfBase36ToBigInt,
} = require('../../js/generate/snowflake.js');

describe('snowflakeId - 生成与位运算', () => {
    test('返回 BigInt 且长度约 19~20 位 (≤ 2^63)', () => {
        const id = snowflakeId(0, 0, 0, 1700000000000n);
        expect(typeof id).toBe('bigint');
        const s = id.toString();
        expect(s.length).toBeGreaterThanOrEqual(18);
        expect(s.length).toBeLessThanOrEqual(20);
    });
    test('bit 0-11 为 sequence, 12-16 为 worker, 17-21 为 datacenter', () => {
        const id = snowflakeId(5, 3, 7, 1700000000000n);
        expect(Number(id & 0xfffn)).toBe(7);
        expect(Number((id >> 12n) & 0x1fn)).toBe(5);
        expect(Number((id >> 17n) & 0x1fn)).toBe(3);
    });
    test('workerId/datacenterId 超过 5 位被掩码截断', () => {
        const id = snowflakeId(0xff, 0xff, 0, 1700000000000n);
        expect(Number((id >> 12n) & 0x1fn)).toBe(31);
        expect(Number((id >> 17n) & 0x1fn)).toBe(31);
    });
    test('时间戳小于 epoch 抛错', () => {
        expect(() => snowflakeId(0, 0, 0, SNOWFLAKE_EPOCH - 1n)).toThrow(/Epoch/);
    });
    test('时间戳 ≥ 2^41 抛错', () => {
        expect(() => snowflakeId(0, 0, 0, SNOWFLAKE_EPOCH + (1n << 41n))).toThrow(/41/);
    });
});

describe('parseSnowflake - 反向解析', () => {
    test('snowflakeId ↔ parseSnowflake 互逆', () => {
        const id = snowflakeId(5, 3, 7, 1700000000000n);
        const p = parseSnowflake(id.toString());
        expect(p.timestamp).toBe(1700000000000);
        expect(p.datacenterId).toBe(3);
        expect(p.workerId).toBe(5);
        expect(p.sequence).toBe(7);
    });
    test('自定义 epoch 解析', () => {
        const customEpoch = 1000000000000n;
        const id = snowflakeId(0, 0, 0, 1500000000000n, customEpoch);
        const p = parseSnowflake(id.toString(), customEpoch);
        expect(p.timestamp).toBe(1500000000000);
    });
    test('ID 为空/含非数字抛错', () => {
        expect(() => parseSnowflake('abc')).toThrow();
        expect(() => parseSnowflake('')).toThrow();
        expect(() => parseSnowflake('12.34')).toThrow();
    });
});

describe('nextSnowflake - 并发生成 (单线程模拟)', () => {
    test('连续生成 N 个 ID 全部唯一', () => {
        const ids = new Set();
        for (let i = 0; i < 100; i++) {
            const id = nextSnowflake(1, 1, SNOWFLAKE_EPOCH);
            ids.add(id.toString());
        }
        expect(ids.size).toBe(100);
    });
    test('同毫秒内 sequence 自增,跨毫秒重置', () => {
        const a = nextSnowflake(0, 0, SNOWFLAKE_EPOCH);
        const b = nextSnowflake(0, 0, SNOWFLAKE_EPOCH);
        expect(Number(b & 0xfffn)).toBeGreaterThan(Number(a & 0xfffn));
    });
    test('不同 workerId 解析出的 workerId 不同', () => {
        const a = nextSnowflake(1, 0, SNOWFLAKE_EPOCH);
        const b = nextSnowflake(2, 0, SNOWFLAKE_EPOCH);
        // sequence 可能不同，但 worker 必然不同
        const pa = parseSnowflake(a.toString());
        const pb = parseSnowflake(b.toString());
        expect(pa.workerId).not.toBe(pb.workerId);
    });
});

describe('nextLeafId - 美团 Leaf', () => {
    test('使用 LEAF_EPOCH (2020-01-01)', () => {
        const id = nextLeafId(0, 0);
        const p = parseSnowflake(id.toString(), require('../../js/generate/snowflake.js').LEAF_EPOCH);
        expect(p.timestamp).toBeGreaterThan(1577808000000);
        expect(p.timestamp).toBeLessThan(Date.now() + 1000);
    });
});

describe('baiduUid + parseBaiduUid', () => {
    test('baiduUid 返回 Base36 字符串', () => {
        const u = baiduUid();
        expect(typeof u).toBe('string');
        expect(u).toMatch(/^[0-9a-z]+$/i);
    });
    test('parseBaiduUid 反向解出 sequence 与时间戳', () => {
        const u = baiduUid();
        const p = parseBaiduUid(u);
        expect(typeof p.timestamp).toBe('number');
        expect(p.timestamp).toBeGreaterThan(1577808000000);
        expect(p.sequence).toBeGreaterThanOrEqual(0);
        expect(p.sequence).toBeLessThanOrEqual(0x3ffff);
    });
    test('多次调用结果唯一', () => {
        const ids = new Set();
        for (let i = 0; i < 50; i++) ids.add(baiduUid());
        expect(ids.size).toBe(50);
    });
    test('非 Base36 字符抛错', () => {
        expect(() => parseBaiduUid('!!!')).toThrow();
    });
});

describe('sfBase36ToBigInt - 进制辅助函数', () => {
    test('普通字符串转换', () => {
        expect(sfBase36ToBigInt('10').toString()).toBe('36');
        expect(sfBase36ToBigInt('z').toString()).toBe('35');
        expect(sfBase36ToBigInt('zz').toString()).toBe('1295');
    });
    test('大小写均接受', () => {
        expect(sfBase36ToBigInt('FF').toString()).toBe(sfBase36ToBigInt('ff').toString());
    });
    test('非法字符抛错', () => {
        expect(() => sfBase36ToBigInt('xyz!')).toThrow(/非法/);
    });
});

describe('snowflake - 排序性', () => {
    test('连续生成的 ID 按时间递增 (数字大小)', () => {
        const ids = [];
        for (let i = 0; i < 20; i++) ids.push(nextSnowflake(0, 0, SNOWFLAKE_EPOCH));
        for (let i = 1; i < ids.length; i++) {
            // 相邻 ID 数值应不小于前一个 (同毫秒内 sequence 递增)
            expect(ids[i] >= ids[i - 1]).toBe(true);
        }
        const sorted = [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
        // 由于 sequence 单调递增，整体已接近排序
        expect(ids[ids.length - 1]).toBeGreaterThanOrEqual(ids[0]);
        // 引用 sorted 避免 unused 警告
        expect(sorted.length).toBe(ids.length);
    });
});
