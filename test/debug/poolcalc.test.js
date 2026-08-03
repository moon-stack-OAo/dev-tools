const {
    poolCalcEstimate,
    poolCalcResultText,
    pcParseNumber,
} = require('../../js/debug/poolcalc.js');

describe('pcParseNumber', () => {
    test('正常', () => {
        expect(pcParseNumber('10', 'QPS').ok).toBe(true);
        expect(pcParseNumber('10', 'QPS').value).toBe(10);
    });

    test('空 / 非法', () => {
        expect(pcParseNumber('', 'QPS').ok).toBe(false);
        expect(pcParseNumber('abc', 'QPS').ok).toBe(false);
        expect(pcParseNumber('-1', 'QPS').ok).toBe(false);
    });
});

describe('poolCalcEstimate', () => {
    test('IO 密集正常估算', () => {
        const r = poolCalcEstimate({
            qps: 200,
            avgMs: 50,
            cpuCores: 8,
            blockingRatio: 5,
            targetUtil: 0.7,
            queueSeconds: 1.5,
        });
        expect(r.ok).toBe(true);
        expect(r.concurrency).toBe(10);
        expect(r.coreSize).toBeGreaterThanOrEqual(1);
        expect(r.maxSize).toBeGreaterThanOrEqual(r.coreSize);
        expect(r.queueCapacity).toBe(Math.ceil(200 * 1.5 * 1.2));
        expect(r.formula).toMatch(/Little/);
        expect(r.notes.length).toBeGreaterThan(0);
    });

    test('CPU 密集', () => {
        const r = poolCalcEstimate({
            qps: 100,
            avgMs: 10,
            cpuCores: 4,
            blockingRatio: 0,
            targetUtil: 0.8,
            queueSeconds: 1,
        });
        expect(r.ok).toBe(true);
        expect(r.concurrency).toBe(1);
        expect(r.coreSize).toBeGreaterThanOrEqual(1);
        expect(r.maxSize).toBeGreaterThanOrEqual(r.coreSize);
    });

    test('空输入', () => {
        const r = poolCalcEstimate({});
        expect(r.ok).toBe(false);
        expect(r.msg).toMatch(/QPS/);
    });

    test('非法利用率', () => {
        const r = poolCalcEstimate({
            qps: 10,
            avgMs: 20,
            targetUtil: 1.5,
        });
        expect(r.ok).toBe(false);
        expect(r.msg).toMatch(/利用率/);
    });

    test('边界：极低 QPS', () => {
        const r = poolCalcEstimate({
            qps: 0.1,
            avgMs: 5,
            cpuCores: 2,
            blockingRatio: 0,
            targetUtil: 0.5,
            queueSeconds: 1,
        });
        expect(r.ok).toBe(true);
        expect(r.coreSize).toBeGreaterThanOrEqual(1);
        expect(r.queueCapacity).toBeGreaterThanOrEqual(0);
    });
});

describe('poolCalcResultText', () => {
    test('成功含推荐参数', () => {
        const r = poolCalcEstimate({
            qps: 50,
            avgMs: 100,
            cpuCores: 4,
            blockingRatio: 2,
            targetUtil: 0.7,
            queueSeconds: 2,
        });
        const text = poolCalcResultText(r);
        expect(text).toMatch(/corePoolSize/);
        expect(text).toMatch(/queueCapacity/);
        expect(text).toMatch(/公式/);
    });

    test('失败输出 msg', () => {
        expect(poolCalcResultText({ ok: false, msg: '请输入QPS' })).toBe('请输入QPS');
    });
});
