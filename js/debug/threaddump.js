// Java 线程 Dump 分析（jstack / Thread.dumpStack 风格）

/**
 * 解析线程 dump 文本
 * @param {string} text
 * @returns {{ threads: Array, stats: Object, deadlocks: Array, summary: string }}
 */
function parseThreadDump(text) {
    const empty = {
        threads: [],
        stats: {},
        deadlocks: [],
        summary: '无输入',
    };
    if (text == null || String(text).trim() === '') {
        return empty;
    }

    const raw = String(text);
    const lines = raw.split(/\r?\n/);
    const threads = [];
    const deadlocks = [];

    // 死锁段落：Found one Java-level deadlock:
    let inDeadlock = false;
    let deadlockBuf = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/Found\s+one\s+Java-level\s+deadlock/i.test(line) || /Found\s+\d+\s+Java-level\s+deadlocks?/i.test(line)) {
            if (deadlockBuf.length) {
                deadlocks.push(deadlockBuf.join('\n').trim());
                deadlockBuf = [];
            }
            inDeadlock = true;
            deadlockBuf.push(line);
            continue;
        }
        if (inDeadlock) {
            // 空行后若出现非缩进的新段落则结束
            if (/^Found\s+/i.test(line) && /deadlock/i.test(line)) {
                deadlocks.push(deadlockBuf.join('\n').trim());
                deadlockBuf = [line];
                continue;
            }
            if (/^Java stack information for the threads listed above/i.test(line)) {
                deadlocks.push(deadlockBuf.join('\n').trim());
                deadlockBuf = [];
                inDeadlock = false;
                continue;
            }
            // 遇到新的线程头则结束死锁段
            if (/^"[^"]+"\s/.test(line) || /^"[^"]+"$/.test(line)) {
                deadlocks.push(deadlockBuf.join('\n').trim());
                deadlockBuf = [];
                inDeadlock = false;
                // 不 continue，让后续线程解析处理本行
            } else {
                deadlockBuf.push(line);
                continue;
            }
        }
    }
    if (deadlockBuf.length) {
        deadlocks.push(deadlockBuf.join('\n').trim());
    }

    // 线程块：以 "name" 开头
    // "main" #1 prio=5 os_prio=0 tid=0x00007f... nid=0x1234 runnable [0x...]
    // "Reference Handler" #2 daemon prio=10 ...
    const threadHeaderRe =
        /^"([^"]+)"\s*(?:#(\d+))?\s*(daemon)?\s*(?:prio=(\d+))?\s*(?:os_prio=(\d+))?\s*(?:cpu=[\d.]+ms)?\s*(?:elapsed=[\d.]+s)?\s*(?:tid=(\S+))?\s*(?:nid=(\S+))?\s*(.*)?$/i;

    let current = null;
    const lockWaiting = []; // { thread, lockId, line }
    const lockHeld = []; // { thread, lockId, line }

    function flushThread() {
        if (current) {
            threads.push(current);
            current = null;
        }
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // 线程头
        if (line.charAt(0) === '"' && line.indexOf('"', 1) > 0) {
            const m = line.match(threadHeaderRe);
            if (m) {
                flushThread();
                const rest = (m[8] || '').trim();
                let state = normalizeThreadState(rest);
                // 有时状态在下一行 java.lang.Thread.State
                current = {
                    name: m[1],
                    id: m[2] ? parseInt(m[2], 10) : null,
                    daemon: !!m[3],
                    prio: m[4] != null ? parseInt(m[4], 10) : null,
                    osPrio: m[5] != null ? parseInt(m[5], 10) : null,
                    tid: m[6] || null,
                    nid: m[7] || null,
                    state: state,
                    stateRaw: rest,
                    stack: [],
                    locks: [],
                };
                continue;
            }
        }

        if (!current) {
            continue;
        }

        // java.lang.Thread.State: WAITING (on object monitor)
        const stateMatch = trimmed.match(/^java\.lang\.Thread\.State:\s*(\w+)(?:\s*\(([^)]*)\))?/i);
        if (stateMatch) {
            current.state = stateMatch[1].toUpperCase();
            if (stateMatch[2]) {
                current.stateDetail = stateMatch[2];
            }
            continue;
        }

        // locked / waiting to lock
        const waitLock = trimmed.match(/- waiting to lock <(0x[0-9a-fA-F]+)>/);
        if (waitLock) {
            current.locks.push({ type: 'waiting', id: waitLock[1], line: trimmed });
            lockWaiting.push({ thread: current.name, lockId: waitLock[1], line: trimmed });
            current.stack.push(trimmed);
            continue;
        }
        const parking = trimmed.match(/- parking to wait for\s*<(0x[0-9a-fA-F]+)>/);
        if (parking) {
            current.locks.push({ type: 'parking', id: parking[1], line: trimmed });
            lockWaiting.push({ thread: current.name, lockId: parking[1], line: trimmed });
            current.stack.push(trimmed);
            continue;
        }
        const locked = trimmed.match(/- locked <(0x[0-9a-fA-F]+)>/);
        if (locked) {
            current.locks.push({ type: 'locked', id: locked[1], line: trimmed });
            lockHeld.push({ thread: current.name, lockId: locked[1], line: trimmed });
            current.stack.push(trimmed);
            continue;
        }

        // 栈帧或其它
        if (trimmed.startsWith('at ') || trimmed.startsWith('- ') || trimmed.startsWith('...')) {
            current.stack.push(trimmed);
            continue;
        }

        // 空行：线程块可能结束，但 jstack 有时在栈中间有空行，仅在后续是新线程头时 flush
        if (trimmed === '') {
            // peek next non-empty
            let j = i + 1;
            while (j < lines.length && lines[j].trim() === '') j++;
            if (j < lines.length && lines[j].charAt(0) === '"' && lines[j].indexOf('"', 1) > 0) {
                flushThread();
            }
            continue;
        }
    }
    flushThread();

    // 交叉锁启发式死锁（无官方 deadlock 段时）
    if (deadlocks.length === 0 && lockWaiting.length && lockHeld.length) {
        const heldBy = Object.create(null);
        lockHeld.forEach(function (h) {
            if (!heldBy[h.lockId]) heldBy[h.lockId] = [];
            heldBy[h.lockId].push(h.thread);
        });
        const waitingFor = Object.create(null);
        lockWaiting.forEach(function (w) {
            waitingFor[w.thread] = w.lockId;
        });
        // 简单两线程交叉：A wait X held by B, B wait Y held by A
        const names = Object.keys(waitingFor);
        for (let a = 0; a < names.length; a++) {
            for (let b = a + 1; b < names.length; b++) {
                const tA = names[a];
                const tB = names[b];
                const lockA = waitingFor[tA];
                const lockB = waitingFor[tB];
                const holdersA = heldBy[lockA] || [];
                const holdersB = heldBy[lockB] || [];
                if (holdersA.indexOf(tB) >= 0 && holdersB.indexOf(tA) >= 0) {
                    deadlocks.push(
                        '[启发式] 可能死锁: "' +
                            tA +
                            '" waiting ' +
                            lockA +
                            ' (held by "' +
                            tB +
                            '"), "' +
                            tB +
                            '" waiting ' +
                            lockB +
                            ' (held by "' +
                            tA +
                            '")',
                    );
                }
            }
        }
    }

    const stats = {};
    threads.forEach(function (t) {
        const s = t.state || 'UNKNOWN';
        stats[s] = (stats[s] || 0) + 1;
    });

    const summary = buildThreadDumpSummary(threads, stats, deadlocks);
    return { threads: threads, stats: stats, deadlocks: deadlocks, summary: summary };
}

function normalizeThreadState(rest) {
    if (!rest) return 'UNKNOWN';
    const r = rest.trim().toLowerCase();
    // jstack 行尾：runnable / waiting on condition / sleeping / in Object.wait() / blocked 等
    if (/\brunnable\b/.test(r)) return 'RUNNABLE';
    if (/\bblocked\b/.test(r)) return 'BLOCKED';
    if (/timed.?waiting|sleeping|waiting on condition/.test(r) && /timed|sleeping/.test(r)) {
        // sleeping 多为 TIMED_WAITING
    }
    if (/\bsleeping\b/.test(r)) return 'TIMED_WAITING';
    if (/\btimed_?waiting\b/.test(r)) return 'TIMED_WAITING';
    if (/\bwaiting\b/.test(r) || /object\.wait|parking/.test(r)) return 'WAITING';
    if (/\bblocked\b/.test(r)) return 'BLOCKED';
    // 直接取首词大写
    const first = rest.trim().split(/\s+/)[0] || '';
    const upper = first.replace(/[^A-Za-z_]/g, '').toUpperCase();
    if (upper) return upper;
    return 'UNKNOWN';
}

function buildThreadDumpSummary(threads, stats, deadlocks) {
    const lines = [];
    lines.push('=== 线程 Dump 分析 ===');
    lines.push('线程总数: ' + threads.length);
    lines.push('');
    lines.push('--- 状态统计 ---');
    const order = ['RUNNABLE', 'WAITING', 'TIMED_WAITING', 'BLOCKED', 'NEW', 'TERMINATED', 'UNKNOWN'];
    const keys = Object.keys(stats).sort(function (a, b) {
        const ia = order.indexOf(a);
        const ib = order.indexOf(b);
        if (ia < 0 && ib < 0) return a.localeCompare(b);
        if (ia < 0) return 1;
        if (ib < 0) return -1;
        return ia - ib;
    });
    if (keys.length === 0) {
        lines.push('(无)');
    } else {
        keys.forEach(function (k) {
            lines.push(padRight(k, 16) + stats[k]);
        });
    }
    lines.push('');
    lines.push('--- 死锁 ---');
    if (deadlocks.length === 0) {
        lines.push('未检测到死锁段落');
    } else {
        lines.push('发现 ' + deadlocks.length + ' 处死锁/疑似死锁:');
        deadlocks.forEach(function (d, i) {
            lines.push('');
            lines.push('[' + (i + 1) + ']');
            lines.push(d);
        });
    }
    lines.push('');
    lines.push('--- 线程列表 ---');
    threads.forEach(function (t, i) {
        const flags = [];
        if (t.daemon) flags.push('daemon');
        if (t.prio != null) flags.push('prio=' + t.prio);
        if (t.tid) flags.push('tid=' + t.tid);
        if (t.nid) flags.push('nid=' + t.nid);
        lines.push(
            (i + 1) +
                '. "' +
                t.name +
                '" ' +
                (t.state || 'UNKNOWN') +
                (flags.length ? ' (' + flags.join(', ') + ')' : ''),
        );
    });
    return lines.join('\n');
}

function padRight(s, n) {
    s = String(s);
    while (s.length < n) s += ' ';
    return s;
}

// === UI ===

function threaddumpAnalyze() {
    const input = document.getElementById('threaddumpInput');
    const out = document.getElementById('threaddumpOutput');
    if (!input || !out) return;
    const text = input.value;
    if (!text || !text.trim()) {
        out.textContent = '请粘贴 jstack 线程 dump 文本';
        out.className = 'output-box error';
        return;
    }
    const result = parseThreadDump(text);
    out.textContent = result.summary;
    out.className = 'output-box';
    if (typeof setStatus === 'function') {
        setStatus('已分析 ' + result.threads.length + ' 个线程' + (result.deadlocks.length ? '，发现死锁提示' : ''));
    }
}

function threaddumpLoadSample() {
    const sample = [
        'Full thread dump Java HotSpot(TM) 64-Bit Server VM (25.312-b07 mixed mode):',
        '',
        '"main" #1 prio=5 os_prio=0 tid=0x00007f8a1000 nid=0x1b2e runnable [0x00007f8a2fffe000]',
        '   java.lang.Thread.State: RUNNABLE',
        '        at com.example.App.main(App.java:10)',
        '',
        '"pool-1-thread-1" #12 prio=5 os_prio=0 tid=0x00007f8a2000 nid=0x2a01 waiting on condition [0x00007f8a3fffe000]',
        '   java.lang.Thread.State: WAITING (parking)',
        '        at sun.misc.Unsafe.park(Native Method)',
        '        - parking to wait for  <0x00000000d8001000> (a java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject)',
        '        at java.util.concurrent.locks.LockSupport.park(LockSupport.java:175)',
        '',
        '"worker-A" #20 prio=5 os_prio=0 tid=0x00007f8a3000 nid=0x3b01 waiting for monitor entry [0x00007f8a4fffe000]',
        '   java.lang.Thread.State: BLOCKED (on object monitor)',
        '        at com.example.Deadlock.task(Deadlock.java:20)',
        '        - waiting to lock <0x00000000d8002000> (a java.lang.Object)',
        '        - locked <0x00000000d8003000> (a java.lang.Object)',
        '',
        '"worker-B" #21 prio=5 os_prio=0 tid=0x00007f8a4000 nid=0x3b02 waiting for monitor entry [0x00007f8a5fffe000]',
        '   java.lang.Thread.State: BLOCKED (on object monitor)',
        '        at com.example.Deadlock.task(Deadlock.java:30)',
        '        - waiting to lock <0x00000000d8003000> (a java.lang.Object)',
        '        - locked <0x00000000d8002000> (a java.lang.Object)',
        '',
        'Found one Java-level deadlock:',
        '=============================',
        '"worker-A":',
        '  waiting to lock monitor 0x... (object 0x00000000d8002000, a java.lang.Object),',
        '  which is held by "worker-B"',
        '"worker-B":',
        '  waiting to lock monitor 0x... (object 0x00000000d8003000, a java.lang.Object),',
        '  which is held by "worker-A"',
        '',
        'Java stack information for the threads listed above:',
        '===================================================',
        '"worker-A":',
        '        at com.example.Deadlock.task(Deadlock.java:20)',
        '"worker-B":',
        '        at com.example.Deadlock.task(Deadlock.java:30)',
    ].join('\n');
    const input = document.getElementById('threaddumpInput');
    if (input) input.value = sample;
    threaddumpAnalyze();
}

function threaddumpClear() {
    const input = document.getElementById('threaddumpInput');
    const out = document.getElementById('threaddumpOutput');
    if (input) input.value = '';
    if (out) {
        out.textContent = '';
        out.className = 'output-box';
    }
    if (typeof setStatus === 'function') setStatus('已清空');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseThreadDump: parseThreadDump,
        buildThreadDumpSummary: buildThreadDumpSummary,
        normalizeThreadState: normalizeThreadState,
    };
}
