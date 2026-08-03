const {
    parseQuartzCron,
    describeQuartzCron,
    toSpringScheduled,
    quartzVsUnixNotes,
} = require('../../js/debug/quartzcron.js');

describe('parseQuartzCron', () => {
    test('6 段标准', () => {
        const p = parseQuartzCron('0 0 12 * * ?');
        expect(p.valid).toBe(true);
        expect(p.length).toBe(6);
        expect(p.second).toBe('0');
        expect(p.hour).toBe('12');
        expect(p.dayOfWeek).toBe('?');
    });

    test('7 段含年', () => {
        const p = parseQuartzCron('0 0 0 1 1 ? 2026');
        expect(p.valid).toBe(true);
        expect(p.year).toBe('2026');
    });

    test('5 段 Unix 提示', () => {
        const p = parseQuartzCron('0 12 * * *');
        expect(p.valid).toBe(false);
        expect(p.errors.some((e) => /Unix|5 段/.test(e))).toBe(true);
    });

    test('日与周同时 * 报错', () => {
        const p = parseQuartzCron('0 0 12 * * *');
        expect(p.valid).toBe(false);
        expect(p.errors.length).toBeGreaterThan(0);
    });

    test('空表达式', () => {
        const p = parseQuartzCron('');
        expect(p.valid).toBe(false);
    });

    test('月名与周名', () => {
        const p = parseQuartzCron('0 0 9 ? * MON-FRI');
        expect(p.valid).toBe(true);
        expect(p.dayOfWeek).toMatch(/2-6|MON/i);
    });
});

describe('describeQuartzCron', () => {
    test('每天中午', () => {
        const d = describeQuartzCron('0 0 12 * * ?');
        expect(typeof d).toBe('string');
        expect(d.length).toBeGreaterThan(0);
        expect(d).toMatch(/12|时|中午|每/);
    });

    test('每5分钟', () => {
        const d = describeQuartzCron('0 0/5 * * * ?');
        expect(d).toMatch(/5/);
    });
});

describe('toSpringScheduled', () => {
    test('cron 片段', () => {
        const s = toSpringScheduled({ cron: '0 0 12 * * ?', zone: 'Asia/Shanghai', methodName: 'job' });
        expect(s.cron).toContain('@Scheduled(cron = "0 0 12 * * ?"');
        expect(s.cron).toContain('zone = "Asia/Shanghai"');
        expect(s.cron).toContain('public void job()');
        expect(s.all).toContain('@EnableScheduling');
    });

    test('zone 为空时不输出 zone 属性', () => {
        const s = toSpringScheduled({ cron: '0 0 12 * * ?', zone: '', methodName: 'job' });
        expect(s.cron).toContain('@Scheduled(cron = "0 0 12 * * ?"');
        expect(s.cron).not.toContain('zone =');
        expect(s.cron).toMatch(/@Scheduled\(cron = "0 0 12 \* \* \?"\)\n/);
    });

    test('zone 省略等同不指定', () => {
        const s = toSpringScheduled({ cron: '0 0 * * * ?', methodName: 'tick' });
        expect(s.cron).not.toContain('zone');
    });

    test('fixedRate / fixedDelay', () => {
        const s = toSpringScheduled({
            mode: 'fixedRate',
            fixedRate: 5000,
            fixedDelay: 3000,
            initialDelay: 1000,
            methodName: 'tick',
        });
        expect(s.fixedRate).toContain('fixedRate = 5000');
        expect(s.fixedRate).toContain('initialDelay = 1000');
        expect(s.fixedDelay).toContain('fixedDelay = 3000');
    });
});

describe('quartzVsUnixNotes', () => {
    test('包含差异说明', () => {
        const n = quartzVsUnixNotes();
        expect(n).toContain('Quartz');
        expect(n).toContain('Unix');
        expect(n).toContain('?');
    });
});
