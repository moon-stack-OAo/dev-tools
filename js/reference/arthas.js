const arthasCommands = [
    {
        cat: '基础诊断',
        items: [
            {
                cmd: 'dashboard',
                desc: '仪表盘，查看线程/内存/GC/系统信息',
                scenario: '排查卡顿时先看整体 CPU/线程/内存/GC 概览。',
                examples: ['dashboard', 'dashboard -n 2 -i 5000'],
                outputs: [
                    'ID        NAME                          GROUP           PRIORI STATE    %CPU    TIME   INTER DAEMON\n17        DestroyJavaVM                 main            5      RUNNABLE 99.4    1:0.23 false false\n47        arthas-NettyHttpTelnetBoot    system          5      RUNNABLE 1.5     0:0.08 false true',
                    'Memory                    used    total    max    usage    GC\nheap                      236M    400M    3641M  6.48%    gc.ps_mark_sweep_count   5\nnon-heap                  175M    178M    -1     98.31%   gc.ps_scavenge_count    8\nps_eden_space             84M     128M    1216M  6.91%\n...\nRunning profiler: none\nRefresh: 5s, Interval: 5s',
                ],
            },
            {
                cmd: 'thread',
                desc: '查看线程信息，支持 thread -b 查找死锁',
                scenario: '定位高 CPU 线程、阻塞线程、死锁。',
                examples: ['thread', 'thread -n 3', 'thread -b'],
                outputs: [
                    'Threads Total: 27, NEW: 0, RUNNABLE: 9, BLOCKED: 0, WAITING: 5, TIMED_WAITING: 9, TERMINATED: 0\nID    NAME                          GROUP           PRIORI STATE    %CPU    TIME\n17    DestroyJavaVM                 main            5      RUNNABLE 99.4    1:0.23\n47    arthas-NettyHttpTelnetBoot    system          5      RUNNABLE 1.5     0:0.08',
                    '"arthas-NettyHttpTelnetBoot-3-1" Id=47 cpuUsage=1.5% deltaTime=12ms time=4020ms RUNNABLE\n    at sun.management.ThreadImpl.dumpThreads0(Native Method)\n    at sun.management.ThreadImpl.getThreadInfo(ThreadImpl.java:172)\n    ...',
                    '"main" Id=1 BLOCKED on java.lang.Object@3f2c2e held by "worker-1"\n    at demo.DeadLock.transfer(DeadLock.java:42)\n    at demo.DeadLock.run(DeadLock.java:24)\n    ...\nAffect(row-cnt:1) cost in 18 ms',
                ],
            },
            {
                cmd: 'jvm',
                desc: 'JVM 信息概览（启动参数、版本、类加载等）',
                scenario: '排查 OOM / 类加载 / GC 时确认运行时 JVM 参数。',
                examples: ['jvm'],
                outputs: [
                    'RUNTIME\nMACHINE-NAME:                         47@host\nJVM-START-TIME:                       2024-01-01 10:00:00\nVM-ARGUMENTS:                          [-Xms256m, -Xmx4g, -XX:+UseG1GC]\nMANAGEMENT-SPEC-VERSION:              1.2\nCLASS-PATH:                            /opt/app.jar\nBOOT-CLASS-PATH:                       /opt/jdk-17/jre/lib/rt.jar\n\nCLASS-LOADING\nLOADED-CLASS-COUNT:    8932\nTOTAL-LOADED-CLASS-COUNT: 9037\nUNLOADED-CLASS-COUNT:  105',
                ],
            },
            {
                cmd: 'sysprop',
                desc: '查看/修改系统属性 System.getProperties()',
                scenario: '查看运行环境、临时调整某个 Property（如时区、编码）。',
                examples: ['sysprop', 'sysprop java.version', 'sysprop user.country CN'],
                outputs: [
                    'KEY                       VALUE\njava.runtime.name         Java(TM) SE Runtime Environment\njava.runtime.version      17.0.8+9-LTS\njava.vendor               Oracle Corporation\nfile.encoding              UTF-8\nuser.country              CN',
                    'java.version              17.0.8',
                    'Successfully update the system property.\nNAME      OLD_VALUE    NEW_VALUE\nuser.country\n                       CN',
                ],
            },
            {
                cmd: 'sysenv',
                desc: '查看系统环境变量',
                scenario: '排查环境变量、容器/宿主机配置问题。',
                examples: ['sysenv', 'sysenv PATH'],
                outputs: [
                    'KEY                       VALUE\nPATH                      /usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin\nJAVA_HOME                 /opt/jdk-17\nLANG                      en_US.UTF-8',
                    'PATH                      /usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin',
                ],
            },
            {
                cmd: 'vmoption',
                desc: '查看/修改 JVM 选项（如 -Xmx）',
                scenario: '排查 GC/堆/诊断参数时查看/动态修改 JVM flag。',
                examples: ['vmoption', 'vmoption HeapDumpOnOutOfMemoryError', 'vmoption PrintGCDetails true'],
                outputs: [
                    'KEY                       VALUE\nHeapDumpOnOutOfMemoryError false\nPrintGCDetails            true\nUseG1GC                   true\nMaxHeapSize               4294967296',
                    'KEY                       VALUE\nHeapDumpOnOutOfMemoryError false',
                    'Successfully updated the vm option.\nNAME             OLD_VALUE    NEW_VALUE\nPrintGCDetails\n                 true         true',
                ],
            },
            {
                cmd: 'logger',
                desc: '查看/修改 Logger 级别',
                scenario: '排查日志问题时动态调整 logger 级别（无需重启）。',
                examples: ['logger', 'logger --name org.springframework.web --level debug'],
                outputs: [
                    'NAME                                CLASS                                   LEVEL\nroot                                org.slf4j.LoggerFactory                    INFO\ncom.example                         org.slf4j.Logger                            DEBUG\norg.springframework.web            jdk.internal.reflect.GeneratedMethod...  INFO',
                    'update logger level succeed.',
                ],
            },
            {
                cmd: 'heapdump',
                desc: '生成 Heap Dump 到文件',
                scenario: 'OOM/内存泄漏排查时导出 hprof 文件离线分析（MAT、VisualVM）。',
                examples: ['heapdump /tmp/dump.hprof', 'heapdump --live /tmp/live.hprof'],
                outputs: [
                    'Heap dump file created: /tmp/dump.hprof',
                    'Heap dump file created: /tmp/live.hprof\nDumping live objects: only live objects, no references will be preserved.\nHeap dump done.',
                ],
            },
        ],
    },
    {
        cat: '类与方法',
        items: [
            {
                cmd: 'sc',
                desc: '查看 JVM 已加载的类信息（支持正则）',
                scenario: '确认类是否被加载、查看 ClassLoader 来源。',
                examples: [
                    'sc demo.MathGame',
                    'sc -d demo.MathGame',
                    'sc -E org\\.springframework\\.web\\..*Controller',
                ],
                outputs: [
                    'demo.MathGame\nAffect(row-cnt:1) cost in 8 ms',
                    'class-info        demo.MathGame\ncode-source       /Users/demo/MathGame.class\nname              demo.MathGame\nisInterface       false\nisAnnotation      false\nisEnum            false\nisAnonymousClass  false\nisArray           false\nisLocalClass      false\nisMemberClass     false\nisPrimitive       false\nisSynthetic       false\nsimple-name       MathGame\nmodifier          public\nannotation\ninterfaces\nsuper-class       +-java.lang.Object\nclass-loader      +-sun.misc.Launcher$AppClassLoader@18b4aac2\n                    +-sun.misc.Launcher$ExtClassLoader@7e774d7a\nclassLoaderHash   3be2cf6b',
                    'org.springframework.web.servlet.DispatcherServlet$HttpServletRequestPathMatcher\norg.springframework.web.servlet.DispatcherServlet$WebAsyncManagerWaiter\n...\nAffect(row-cnt:18) cost in 12 ms',
                ],
            },
            {
                cmd: 'sm',
                desc: '查看已加载类的方法签名',
                scenario: '查看类的方法列表、签名（入参/返回/异常）。',
                examples: ['sm demo.MathGame', 'sm demo.MathGame primeFactors', 'sm -d demo.MathGame'],
                outputs: [
                    'void demo.MathGame.run()\nvoid demo.MathGame.print()\nint demo.MathGame.primeFactors(int)\nAffect(row-cnt:3) cost in 6 ms',
                    'int demo.MathGame.primeFactors(int)\nAffect(row-cnt:1) cost in 4 ms',
                    'declaring-class    demo.MathGame\nmethod-name        primeFactors\nmodifier           public\nannotation\nreturn             int\nthrows             java.lang.Throwable\nparameters         int\nAffect(row-cnt:1) cost in 5 ms',
                ],
            },
            {
                cmd: 'jad',
                desc: '反编译已加载类的源码',
                scenario: '确认线上类实际生效的字节码（确认是否被改过、版本是否一致）。',
                examples: [
                    'jad demo.MathGame',
                    'jad demo.MathGame primeFactors',
                    'jad --source-only demo.MathGame > /tmp/MathGame.java',
                ],
                outputs: [
                    'ClassLoader:\n+-sun.misc.Launcher$AppClassLoader@18b4aac2\n  +-sun.misc.Launcher$ExtClassLoader@7e774d7a\n\nLocation:\n/Users/demo/MathGame.class\n\npublic class MathGame {\n    public static void main(String[] args) throws Exception {\n        MathGame game = new MathGame();\n        ...\n    }\n}',
                    'public int primeFactors(int number) {\n    ...\n}\nAffect(row-cnt:1) cost in 142 ms',
                    'Affect(row-cnt:1) cost in 188 ms',
                ],
            },
            {
                cmd: 'mc',
                desc: '在线编译 Java 源文件为 .class',
                scenario: '与 jad 配合，修改源码后编译得到新的 .class 用于 redefine。',
                examples: [
                    'mc /tmp/MathGame.java',
                    'mc -c 3be2cf6b /tmp/MathGame.java',
                    'mc -d /tmp/output /tmp/MathGame.java',
                ],
                outputs: [
                    'Memory compiler output:\n/tmp/MathGame.class\nAffect(row-cnt:1) cost in 286 ms',
                    'Memory compiler output:\n/tmp/MathGame.class\nAffect(row-cnt:1) cost in 274 ms',
                    'Memory compiler output:\n/tmp/output/demo/MathGame.class\nAffect(row-cnt:1) cost in 302 ms',
                ],
            },
            {
                cmd: 'redefine',
                desc: '热替换已加载类的字节码',
                scenario: '配合 jad → 编辑源文件 → mc → redefine 完成线上热修复。',
                examples: [
                    'redefine /tmp/MathGame.class',
                    'redefine -c 3be2cf6b /tmp/MathGame.class',
                    'redefine /tmp/A.class /tmp/B.class',
                ],
                outputs: ['redefine success, size: 1', 'redefine success, size: 1', 'redefine success, size: 2'],
            },
            {
                cmd: 'retransform',
                desc: '增强版 redefine，支持撤销',
                scenario: '需要可撤销的热更新（对比 redefine），结合 Java Agent 切面。',
                examples: ['retransform /tmp/MathGame.class', 'retransform --list', 'retransform --deleteAll'],
                outputs: [
                    'retransform success, size: 1',
                    'Id              ClassName             TransformCount  LoaderHash      LoaderClassName\n1               demo.MathGame         1               3be2cf6b        sun.misc.Launcher$AppClassLoader',
                    'delete retransform size: 1',
                ],
            },
            {
                cmd: 'dump',
                desc: '将已加载类字节码 dump 到指定目录',
                scenario: '把线上已加载的 class 导出到本地，离线反编译/归档。',
                examples: ['dump demo.MathGame', 'dump -d /tmp/dump demo.MathGame', 'dump demo.MathGame -c 3be2cf6b'],
                outputs: [
                    ' Hashed code: 3be2cf6b56f37cf04d4a59d8c5d2dc66\n          /Users/arthas/output/demo/MathGame.class\n Affect(row-cnt:1) cost in 188 ms',
                    ' Hashed code: 3be2cf6b56f37cf04d4a59d8c5d2dc66\n          /tmp/dump/demo/MathGame.class\n Affect(row-cnt:1) cost in 174 ms',
                    ' Hashed code: 3be2cf6b56f37cf04d4a59d8c5d2dc66\n          /Users/arthas/output/demo/MathGame.class\n Affect(row-cnt:1) cost in 192 ms',
                ],
            },
        ],
    },
    {
        cat: '方法监控',
        items: [
            {
                cmd: 'monitor',
                desc: '统计方法调用次数、耗时、异常率',
                scenario: '周期内统计方法调用次数、成功率、平均 RT、失败率。',
                examples: ['monitor demo.MathGame primeFactors -n 10', 'monitor demo.MathGame primeFactors -c 5'],
                outputs: [
                    'Affect(row-cnt:1) cost in 26 ms.\n2024-01-01 12:00:00  demo.MathGame  primeFactors  total=5  success=5  fail=0  avg-rt(ms)=2.30  fail-rate=0.00%',
                    'timestamp              class              method          total  success  fail  avg-rt(ms)  fail-rate\n2024-01-01 12:00:00    demo.MathGame      primeFactors    5      5        0     2.30       0.00%\n2024-01-01 12:00:05    demo.MathGame      primeFactors    4      4        0     1.95       0.00%\n...\nmonitor stop.',
                ],
            },
            {
                cmd: 'watch',
                desc: '观察方法入参/返回值/异常，支持条件过滤',
                scenario: '排查方法是否被正确调用、返回值/异常是否符合预期。',
                examples: [
                    'watch demo.MathGame primeFactors "{params,returnObj}" -x 2',
                    'watch demo.MathGame primeFactors "{params,returnObj}" -b -s -n 5',
                    'watch demo.MathGame primeFactors "{params[0],throwExp}" -e -x 2',
                ],
                outputs: [
                    'ts=2024-01-01 12:00:00; [cost=1.23ms] result=@ArrayList[\n    @Integer[1708991],\n    @ArrayList[\n        @Integer[3],\n        @Integer[7],\n        @Integer[11],\n    ],\n]',
                    'ts=2024-01-01 12:00:00; [cost=0.78ms] result=@ArrayList[\n    @Object[][  # 入参\n        @Integer[1708991],\n    ],\n    @ArrayList[        # 返回\n        @Integer[3],\n        @Integer[7],\n        @Integer[11],\n    ],\n]',
                    'ts=2024-01-01 12:00:01; [cost=0.42ms] result=@ArrayList[\n    @Integer[1708991],\n    @RuntimeException[IllegalArgumentException: number must be positive],\n]',
                ],
            },
            {
                cmd: 'trace',
                desc: '追踪方法调用链及耗时分布',
                scenario: '定位慢调用、统计方法链路中各节点耗时占比。',
                examples: [
                    'trace demo.MathGame run -n 3 --skipJDKMethod true',
                    "trace demo.MathGame primeFactors '#cost > 5' -n 3",
                ],
                outputs: [
                    '`---ts=2024-01-01 12:00:00;thread_name=main;id=1;is_daemon=false;priority=5;TCCL=...\n    `---[1.23ms] demo.MathGame:run()\n        +---[0.12ms] demo.MathGame:print()\n        `---[0.85ms] demo.MathGame:primeFactors()\n            +---[0.03ms] java.lang.Math:random()\n            `---[0.55ms] demo.MathGame:primeFactors(1708991)\n',
                    'Affect(row-cnt:1) cost in 12 ms.\nts=2024-01-01 12:00:02; thread_name=main; ...\n`---[8.42ms] demo.MathGame:primeFactors(1708991)\n    +---[6.10ms] java.util.ArrayList:add\n    `---[2.21ms] java.util.ArrayList:grow',
                ],
            },
            {
                cmd: 'stack',
                desc: '输出方法调用栈信息',
                scenario: '输出当前正在执行的方法调用栈，排查阻塞/死锁/挂起。',
                examples: [
                    'stack demo.MathGame primeFactors -n 3',
                    "stack demo.MathGame primeFactors '#cost > 5' -n 3",
                ],
                outputs: [
                    'ts=2024-01-01 12:00:00 thread_name=main; ...\n@demo.MathGame.run()\n    at demo.MathGame.main(MathGame.java:25)\n\n@demo.MathGame.print()\n    at demo.MathGame.run(MathGame.java:18)\n    at demo.MathGame.main(MathGame.java:25)',
                    'Affect(row-cnt:1) cost in 8 ms.\nts=2024-01-01 12:00:02 thread_name=main; ...\n@demo.MathGame.primeFactors()\n    at demo.MathGame.run(MathGame.java:18)\n    at demo.MathGame.main(MathGame.java:25)',
                ],
            },
            {
                cmd: 'tt',
                desc: '时空隧道，记录方法调用数据供回放',
                scenario: '把方法调用现场（入参/返回/异常）记录下来，便于回放调试。',
                examples: ['tt -t demo.MathGame primeFactors -n 3', 'tt -l', 'tt -i 1000 -p'],
                outputs: [
                    'Affect(row-cnt:3) cost in 18 ms.\n INDEX        TIMESTAMP                   COST(ms)  IS-RET  IS-EXP   OBJECT       CLASS         METHOD\n 1000         2024-01-01 12:00:00         1.23      true    false    0x4f3d       MathGame      primeFactors\n 1001         2024-01-01 12:00:01         1.05      true    false    0x4f3d       MathGame      primeFactors\n 1002         2024-01-01 12:00:02         0.92      true    false    0x4f3d       MathGame      primeFactors',
                    ' INDEX        TIMESTAMP                   COST(ms)  IS-RET  IS-EXP   OBJECT       CLASS         METHOD\n 1000         2024-01-01 12:00:00         1.23      true    false    0x4f3d       MathGame      primeFactors\n ...\n 1012         2024-01-01 12:00:12         1.10      true    false    0x4f3d       MathGame      primeFactors',
                    ' RE-INDEX      TIMESTAMP                   COST(ms)  IS-RET  IS-EXP   OBJECT       CLASS         METHOD\n 1000          2024-01-01 12:00:00         1.23      true    false    0x4f3d       MathGame      primeFactors\n                     @Object[][\n                         @Integer[1708991],\n                     ]\n                     @ArrayList[\n                         @Integer[3],\n                         @Integer[7],\n                         @Integer[11],\n                     ]',
                ],
            },
        ],
    },
    {
        cat: '高级工具',
        items: [
            {
                cmd: 'ognl',
                desc: '执行 OGNL 表达式，动态获取/修改对象值',
                scenario: '动态读取/修改静态变量、调用静态方法、注入表达式调试。',
                examples: [
                    'ognl \'@java.lang.System@getProperty("user.dir")\'',
                    "ognl '@java.lang.Math@max(2,3)'",
                    "ognl '@demo.MathGame@random' -x 2",
                ],
                outputs: [
                    '@String[/usr/local/app]',
                    '@Integer[3]',
                    '@Random[\n    serialVersionUID=@Long[3905348978240129619],\n    seed=@Long[123456789],\n    nextNextGaussian=@Double[0.0],\n    haveNextNextGaussian=@Boolean[false],\n]',
                ],
            },
            {
                cmd: 'vmtool',
                desc: '强制 GC、获取 Spring Context 等高级操作',
                scenario: '在线触发 GC、获取 Spring 容器、查看 IOC 里的 Bean。',
                examples: [
                    'vmtool --action forceGc',
                    'vmtool --action getInstances --className demo.MathGame --limit 5',
                    'vmtool --action getInstances --className org.springframework.context.ApplicationContext --express \'instances[0].getBean("dataSource")\'',
                ],
                outputs: [
                    'Successfully forced GC.',
                    'instances=[\n    @MathGame[MathGame@5b4647e],\n    @MathGame[MathGame@5b46480],\n];\ntotal=2',
                    '@HikariDataSource[HikariDataSource (HikariPool-1)]\nBean: dataSource',
                ],
            },
            {
                cmd: 'perfcounter',
                desc: '查看/修改性能计数器',
                scenario: '查看 JVM 内部性能指标（线程数、类加载、CPU 等）。',
                examples: ['perfcounter', 'perfcounter -d -c 5'],
                outputs: [
                    'name                                                            value\njava.threads.live                                              47\njava.threads.daemon                                           11\njava.cpu                                                      0.05\njava.uptime                                                   3600\njava.class.loaded.classes                                      8932\nsun.cpu.threads                                                16',
                    'name                                value\njava.threads.live                    48\njava.threads.daemon                 11\njava.cpu                            0.08\njava.class.loaded.classes            8933\n...\n^C',
                ],
            },
            {
                cmd: 'profiler',
                desc: '生成 CPU/内存火焰图',
                scenario: '通过 async-profiler 采集 CPU/内存采样，浏览器查看火焰图。',
                examples: [
                    'profiler start',
                    'profiler stop --format html --file /tmp/result.html',
                    'profiler getSamples',
                ],
                outputs: [
                    'Profiling started, sampling interval is 10 ms, target event is CPU.',
                    'Profiling stopped.\nProfiling data written to /tmp/result.html\nView it with: http://localhost:3658/arthas-output/...',
                    'samples=5234\ncost=52340ms\nthreshold=5ms\ntop10:\n    demo.MathGame:primeFactors  1845\n    java.util.ArrayList:add    1203\n    java.lang.Math:random       890',
                ],
            },
            {
                cmd: 'mbean',
                desc: '查看/调用 MBean 属性和方法',
                scenario: '查看 JMX 暴露的 MBean（如 JVM、Tomcat、ActiveMQ）。',
                examples: ['mbean', 'mbean -m java.lang:type=Memory', 'mbean -m java.lang:type=Memory HeapMemoryUsage'],
                outputs: [
                    'java.lang:type=ClassLoading\njava.lang:type=Compilation\njava.lang:type=Memory\njava.lang:type=OperatingSystem\njava.lang:type=Runtime\n...',
                    'MBean           Name                                                        Value\njava.lang:type=Memory HeapMemoryUsage                                         {committed=4294967296, init=268435456, max=4294967296, used=268435456}\njava.lang:type=Memory NonHeapMemoryUsage                                      {committed=183500800, init=2555904, max=-1, used=175112192}\njava.lang:type=Memory ObjectPendingFinalizationCount                         0\njava.lang:type=Memory Verbose                                                 false',
                    '@CompositeData[com.sun.management.UnixOperatingSystemMXBean:{\n    committedVirtualMemorySize=@Long[53248],\n    freePhysicalMemorySize=@Long[12345],\n    ...\n}]',
                ],
            },
            {
                cmd: 'memory',
                desc: '内存模型信息及使用情况',
                scenario: '排查 OOM 时查看各分区使用情况（heap/metaspace/code cache）。',
                examples: ['memory'],
                outputs: [
                    'Memory                   used       total      max        usage\nheap                     236M       400M       3641M      6.48%\nnon-heap                 175M       178M       -1         98.31%\nps_eden_space            84M        128M       1216M      6.91%\nps_survivor_space        12M        16M        16M        75.00%\nps_old_gen               140M       256M       2409M      5.81%\ncode_cache               50M        51M        240M       20.94%\nmetaspace                86M        89M        -1         96.63%\ncompressed_class_space   9M         10M        1024M      0.88%\ndirect                   16M        16M       -1         100.00%\nmapped                   0K         0K        -1         0.00%',
                ],
            },
        ],
    },
];

let arthasSearchTimer = null;

function arthasItemMatches(item, filter) {
    if (!filter) return true;
    if ((item.cmd || '').includes(filter)) return true;
    if ((item.desc || '').includes(filter)) return true;
    if ((item.scenario || '').includes(filter)) return true;
    if (item.examples && item.examples.some((e) => e.toLowerCase().includes(filter))) return true;
    if (item.outputs && item.outputs.some((o) => o.toLowerCase().includes(filter))) return true;
    return false;
}

function arthasBuildExampleBlock(label, content, kind) {
    const safe = escapeHtml(content);
    const cls = kind === 'output' ? 'arthas-pre arthas-pre-output' : 'arthas-pre';
    return `
        <div class="arthas-copy-wrap">
            <pre class="${cls}"><code>${safe}</code></pre>
            <button class="arthas-copy-btn" onclick="arthasCopyPre(this, event)">复制</button>
        </div>
    `;
}

function arthasCopyPre(btn, ev) {
    if (ev) ev.stopPropagation();
    const pre = btn.parentElement.querySelector('pre');
    if (!pre) return;
    safeCopy(pre.innerText);
}

function arthasRender(filter) {
    const container = document.getElementById('arthasContent');
    filter = (filter || '').trim().toLowerCase();
    container.innerHTML = '';
    let hasResult = false;
    arthasCommands.forEach((group) => {
        const matched = filter ? group.items.filter((i) => arthasItemMatches(i, filter)) : group.items;
        if (!matched.length) return;
        hasResult = true;
        const section = document.createElement('div');
        section.className = 'ref-group';
        section.innerHTML = `<div class="ref-group-title">${escapeHtml(group.cat)}</div>`;
        matched.forEach((item) => {
            const card = document.createElement('div');
            card.className = 'arthas-card';

            let html = `
                <div class="arthas-cmd-head">
                    <code class="arthas-cmd-name">${escapeHtml(item.cmd)}</code>
                    <span class="arthas-cmd-desc">${escapeHtml(item.desc)}</span>
                    <button class="sm outline" onclick="arthasCopyCmd('${escapeHtml(item.cmd).replace(/'/g, "\\'")}')">复制命令</button>
                </div>
            `;

            if (item.scenario) {
                html += `<div class="arthas-scenario">${escapeHtml(item.scenario)}</div>`;
            }

            if (item.examples && item.examples.length) {
                html += `<div class="arthas-section-title">示例</div>`;
                item.examples.forEach((ex) => {
                    html += arthasBuildExampleBlock('example', ex, 'example');
                });
            }

            if (item.outputs && item.outputs.length) {
                html += `<div class="arthas-section-title">模拟输出</div>`;
                item.outputs.forEach((out) => {
                    html += arthasBuildExampleBlock('output', out, 'output');
                });
            }

            card.innerHTML = html;
            section.appendChild(card);
        });
        container.appendChild(section);
    });
    if (!hasResult) {
        container.innerHTML = '<div style="color:var(--text-muted);padding:20px;text-align:center">无匹配结果</div>';
    }
}

function arthasCopyCmd(cmd) {
    safeCopy(cmd);
}

function arthasSearch() {
    clearTimeout(arthasSearchTimer);
    arthasSearchTimer = setTimeout(() => {
        arthasRender(document.getElementById('arthasSearch').value);
    }, 200);
}

// 由 app.js 的 renderMap 触发 arthasRender()

registerInit('arthas', arthasRender);
