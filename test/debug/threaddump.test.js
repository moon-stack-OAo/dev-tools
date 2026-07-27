const { parseThreadDump, normalizeThreadState } = require('../../js/debug/threaddump.js');

const SAMPLE = `"main" #1 prio=5 os_prio=0 tid=0x00007f8a1000 nid=0x1b2e runnable [0x00007f8a2fffe000]
   java.lang.Thread.State: RUNNABLE
        at com.example.App.main(App.java:10)

"pool-1-thread-1" #12 daemon prio=5 os_prio=0 tid=0x00007f8a2000 nid=0x2a01 waiting on condition [0x00007f8a3fffe000]
   java.lang.Thread.State: WAITING (parking)
        at sun.misc.Unsafe.park(Native Method)
        - parking to wait for  <0x00000000d8001000> (a java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject)

"worker-A" #20 prio=5 os_prio=0 tid=0x00007f8a3000 nid=0x3b01 waiting for monitor entry [0x00007f8a4fffe000]
   java.lang.Thread.State: BLOCKED (on object monitor)
        at com.example.Deadlock.task(Deadlock.java:20)
        - waiting to lock <0x00000000d8002000> (a java.lang.Object)
        - locked <0x00000000d8003000> (a java.lang.Object)

"worker-B" #21 prio=5 os_prio=0 tid=0x00007f8a4000 nid=0x3b02 waiting for monitor entry [0x00007f8a5fffe000]
   java.lang.Thread.State: BLOCKED (on object monitor)
        at com.example.Deadlock.task(Deadlock.java:30)
        - waiting to lock <0x00000000d8003000> (a java.lang.Object)
        - locked <0x00000000d8002000> (a java.lang.Object)

Found one Java-level deadlock:
=============================
"worker-A":
  waiting to lock monitor 0x... (object 0x00000000d8002000, a java.lang.Object),
  which is held by "worker-B"
"worker-B":
  waiting to lock monitor 0x... (object 0x00000000d8003000, a java.lang.Object),
  which is held by "worker-A"

Java stack information for the threads listed above:
===================================================
"worker-A":
        at com.example.Deadlock.task(Deadlock.java:20)
`;

describe('parseThreadDump - 空输入', () => {
    test('空字符串返回空结构', () => {
        const r = parseThreadDump('');
        expect(r.threads).toEqual([]);
        expect(r.stats).toEqual({});
        expect(r.deadlocks).toEqual([]);
        expect(r.summary).toBeTruthy();
    });
    test('null / 空白', () => {
        expect(parseThreadDump(null).threads).toEqual([]);
        expect(parseThreadDump('   ').threads).toEqual([]);
    });
});

describe('parseThreadDump - 线程解析', () => {
    test('解析线程名 / 状态 / tid / nid / daemon / prio', () => {
        const r = parseThreadDump(SAMPLE);
        expect(r.threads.length).toBeGreaterThanOrEqual(4);
        const main = r.threads.find((t) => t.name === 'main');
        expect(main).toBeTruthy();
        expect(main.state).toBe('RUNNABLE');
        expect(main.tid).toBe('0x00007f8a1000');
        expect(main.nid).toBe('0x1b2e');
        expect(main.daemon).toBe(false);
        expect(main.prio).toBe(5);

        const pool = r.threads.find((t) => t.name === 'pool-1-thread-1');
        expect(pool.daemon).toBe(true);
        expect(pool.state).toBe('WAITING');

        const wa = r.threads.find((t) => t.name === 'worker-A');
        expect(wa.state).toBe('BLOCKED');
        expect(wa.locks.some((l) => l.type === 'waiting')).toBe(true);
        expect(wa.locks.some((l) => l.type === 'locked')).toBe(true);
    });

    test('状态统计', () => {
        const r = parseThreadDump(SAMPLE);
        expect(r.stats.RUNNABLE).toBeGreaterThanOrEqual(1);
        expect(r.stats.WAITING).toBeGreaterThanOrEqual(1);
        expect(r.stats.BLOCKED).toBeGreaterThanOrEqual(2);
    });

    test('summary 包含统计与线程列表', () => {
        const r = parseThreadDump(SAMPLE);
        expect(r.summary).toContain('线程总数');
        expect(r.summary).toContain('状态统计');
        expect(r.summary).toContain('"main"');
    });
});

describe('parseThreadDump - 死锁', () => {
    test('识别 Found one Java-level deadlock 段落', () => {
        const r = parseThreadDump(SAMPLE);
        expect(r.deadlocks.length).toBeGreaterThanOrEqual(1);
        expect(r.deadlocks[0]).toMatch(/deadlock/i);
        expect(r.summary).toMatch(/死锁/);
    });

    test('无官方段时启发式交叉锁', () => {
        const text = `
"A" #1 prio=5 tid=0x1 nid=0x1 waiting for monitor entry
   java.lang.Thread.State: BLOCKED
        - waiting to lock <0xAAA>
        - locked <0xBBB>

"B" #2 prio=5 tid=0x2 nid=0x2 waiting for monitor entry
   java.lang.Thread.State: BLOCKED
        - waiting to lock <0xBBB>
        - locked <0xAAA>
`;
        const r = parseThreadDump(text);
        expect(r.deadlocks.length).toBeGreaterThanOrEqual(1);
        expect(r.deadlocks.some((d) => /启发式|deadlock/i.test(d))).toBe(true);
    });
});

describe('normalizeThreadState', () => {
    test('runnable / waiting / sleeping', () => {
        expect(normalizeThreadState('runnable [0x1]')).toBe('RUNNABLE');
        expect(normalizeThreadState('waiting on condition')).toBe('WAITING');
        expect(normalizeThreadState('sleeping')).toBe('TIMED_WAITING');
    });
});
