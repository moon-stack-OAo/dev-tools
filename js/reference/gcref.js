const GC_REFS = [
    {
        cat: 'GC 算法概览',
        items: [
            {
                cmd: 'Serial',
                syntax: '-XX:+UseSerialGC',
                desc: '单线程 GC，适合客户端/小堆（<100MB）',
                examples: ['java -XX:+UseSerialGC -Xmx100m MyApp'],
                returns: '单线程串行回收',
            },
            {
                cmd: 'Parallel',
                syntax: '-XX:+UseParallelGC',
                desc: '多线程 GC，注重吞吐量（JDK 8 默认）',
                examples: ['java -XX:+UseParallelGC -XX:ParallelGCThreads=4 MyApp'],
                returns: '多线程并行回收',
            },
            {
                cmd: 'CMS',
                syntax: '-XX:+UseConcMarkSweepGC',
                desc: '并发标记清除，注重低延迟（JDK 9 废弃）',
                examples: ['java -XX:+UseConcMarkSweepGC -XX:CMSInitiatingOccupancyFraction=70 MyApp'],
                returns: '并发标记清除',
            },
            {
                cmd: 'G1',
                syntax: '-XX:+UseG1GC',
                desc: '区域化分代 GC，兼顾吞吐与延迟（JDK 9+ 默认）',
                examples: ['java -XX:+UseG1GC -XX:MaxGCPauseMillis=200 MyApp'],
                returns: '区域化分代回收',
            },
            {
                cmd: 'ZGC',
                syntax: '-XX:+UseZGC',
                desc: '超低延迟 GC（<10ms），适合大堆（JDK 15+）',
                examples: ['java -XX:+UseZGC -Xmx16g MyApp'],
                returns: '超低延迟回收',
            },
            {
                cmd: 'Shenandoah',
                syntax: '-XX:+UseShenandoahGC',
                desc: '低延迟 GC，由 Red Hat 开发（JDK 15+）',
                examples: ['java -XX:+UseShenandoahGC -Xmx8g MyApp'],
                returns: '低延迟回收',
            },
        ],
    },
    {
        cat: 'G1 GC 参数',
        items: [
            {
                cmd: '-XX:+UseG1GC',
                syntax: '-XX:+UseG1GC',
                desc: '启用 G1 GC',
                examples: ['java -XX:+UseG1GC MyApp'],
                returns: '使用 G1 垃圾回收器',
            },
            {
                cmd: '-XX:MaxGCPauseMillis=200',
                syntax: '-XX:MaxGCPauseMillis=<ms>',
                desc: '目标最大 GC 停顿时间（毫秒）',
                examples: ['java -XX:+UseG1GC -XX:MaxGCPauseMillis=100 MyApp'],
                returns: 'GC 停顿时间目标',
            },
            {
                cmd: '-XX:G1HeapRegionSize=N',
                syntax: '-XX:G1HeapRegionSize=<size>',
                desc: 'Region 大小（1MB~32MB，2 的幂）',
                examples: ['java -XX:+UseG1GC -XX:G1HeapRegionSize=16m MyApp'],
                returns: 'Region 大小',
            },
            {
                cmd: '-XX:G1NewSizePercent=5',
                syntax: '-XX:G1NewSizePercent=<percent>',
                desc: '新生代最小比例（默认 5%）',
                examples: ['java -XX:+UseG1GC -XX:G1NewSizePercent=10 MyApp'],
                returns: '新生代最小比例',
            },
            {
                cmd: '-XX:G1MaxNewSizePercent=60',
                syntax: '-XX:G1MaxNewSizePercent=<percent>',
                desc: '新生代最大比例（默认 60%）',
                examples: ['java -XX:+UseG1GC -XX:G1MaxNewSizePercent=50 MyApp'],
                returns: '新生代最大比例',
            },
            {
                cmd: '-XX:G1MixedGCCountTarget=8',
                syntax: '-XX:G1MixedGCCountTarget=<count>',
                desc: '混合 GC 目标次数',
                examples: ['java -XX:+UseG1GC -XX:G1MixedGCCountTarget=16 MyApp'],
                returns: '混合 GC 次数',
            },
            {
                cmd: '-XX:InitiatingHeapOccupancyPercent=45',
                syntax: '-XX:InitiatingHeapOccupancyPercent=<percent>',
                desc: '触发并发标记的堆占用率',
                examples: ['java -XX:+UseG1GC -XX:InitiatingHeapOccupancyPercent=35 MyApp'],
                returns: '触发阈值',
            },
            {
                cmd: '-XX:G1ReservePercent=10',
                syntax: '-XX:G1ReservePercent=<percent>',
                desc: '预留内存比例（防止晋升失败）',
                examples: ['java -XX:+UseG1GC -XX:G1ReservePercent=15 MyApp'],
                returns: '预留比例',
            },
        ],
    },
    {
        cat: 'ZGC 参数',
        items: [
            {
                cmd: '-XX:+UseZGC',
                syntax: '-XX:+UseZGC',
                desc: '启用 ZGC（JDK 15+）',
                examples: ['java -XX:+UseZGC -Xmx16g MyApp'],
                returns: '使用 ZGC 回收器',
            },
            {
                cmd: '-XX:+UseZGC -XX:+ZGenerational',
                syntax: '-XX:+UseZGC -XX:+ZGenerational',
                desc: '启用分代 ZGC（JDK 21+）',
                examples: ['java -XX:+UseZGC -XX:+ZGenerational -Xmx32g MyApp'],
                returns: '使用分代 ZGC',
            },
            {
                cmd: '-XX:SoftMaxHeapSize=N',
                syntax: '-XX:SoftMaxHeapSize=<size>',
                desc: '软性堆上限（ZGC 特有）',
                examples: ['java -XX:+UseZGC -XX:SoftMaxHeapSize=8g MyApp'],
                returns: '软性堆上限',
            },
            {
                cmd: '-XX:ZAllocationSpikeTolerance=N',
                syntax: '-XX:ZAllocationSpikeTolerance=<factor>',
                desc: '分配尖峰容忍度',
                examples: ['java -XX:+UseZGC -XX:ZAllocationSpikeTolerance=2.0 MyApp'],
                returns: '容忍度因子',
            },
            {
                cmd: '-XX:ZCollectionInterval=N',
                syntax: '-XX:ZCollectionInterval=<seconds>',
                desc: '主动 GC 间隔（秒）',
                examples: ['java -XX:+UseZGC -XX:ZCollectionInterval=5 MyApp'],
                returns: 'GC 间隔',
            },
        ],
    },
    {
        cat: '通用 GC 参数',
        items: [
            {
                cmd: '-XX:+UseSerialGC',
                syntax: '-XX:+UseSerialGC',
                desc: '使用 Serial GC',
                examples: ['java -XX:+UseSerialGC MyApp'],
                returns: '使用 Serial 回收器',
            },
            {
                cmd: '-XX:+UseParallelGC',
                syntax: '-XX:+UseParallelGC',
                desc: '使用 Parallel GC',
                examples: ['java -XX:+UseParallelGC -XX:ParallelGCThreads=4 MyApp'],
                returns: '使用 Parallel 回收器',
            },
            {
                cmd: '-XX:+UseConcMarkSweepGC',
                syntax: '-XX:+UseConcMarkSweepGC',
                desc: '使用 CMS GC（JDK 9 废弃）',
                examples: ['java -XX:+UseConcMarkSweepGC MyApp'],
                returns: '使用 CMS 回收器',
            },
            {
                cmd: '-XX:+UseShenandoahGC',
                syntax: '-XX:+UseShenandoahGC',
                desc: '使用 Shenandoah GC',
                examples: ['java -XX:+UseShenandoahGC MyApp'],
                returns: '使用 Shenandoah 回收器',
            },
            {
                cmd: '-XX:ParallelGCThreads=N',
                syntax: '-XX:ParallelGCThreads=<count>',
                desc: '并行 GC 线程数',
                examples: ['java -XX:+UseG1GC -XX:ParallelGCThreads=8 MyApp'],
                returns: '并行线程数',
            },
            {
                cmd: '-XX:ConcGCThreads=N',
                syntax: '-XX:ConcGCThreads=<count>',
                desc: '并发 GC 线程数',
                examples: ['java -XX:+UseG1GC -XX:ConcGCThreads=4 MyApp'],
                returns: '并发线程数',
            },
            {
                cmd: '-XX:MaxGCPauseMillis=N',
                syntax: '-XX:MaxGCPauseMillis=<ms>',
                desc: '目标最大 GC 停顿时间',
                examples: ['java -XX:+UseG1GC -XX:MaxGCPauseMillis=200 MyApp'],
                returns: '停顿时间目标',
            },
            {
                cmd: '-XX:GCTimeRatio=N',
                syntax: '-XX:GCTimeRatio=<ratio>',
                desc: 'GC 时间占比目标（默认 99，即 1%）',
                examples: ['java -XX:+UseParallelGC -XX:GCTimeRatio=99 MyApp'],
                returns: 'GC 时间比例',
            },
            {
                cmd: '-XX:+DisableExplicitGC',
                syntax: '-XX:+DisableExplicitGC',
                desc: '禁用 System.gc() 调用',
                examples: ['java -XX:+DisableExplicitGC MyApp'],
                returns: '禁用显式 GC',
            },
        ],
    },
    {
        cat: 'GC 日志参数',
        items: [
            {
                cmd: '-Xlog:gc*',
                syntax: '-Xlog:gc*:file=<path>:time,level,tags',
                desc: 'JDK 9+ 统一日志格式输出 GC 日志',
                examples: ['java -Xlog:gc*:file=gc.log:time,level,tags MyApp'],
                returns: 'GC 日志文件',
            },
            {
                cmd: '-Xlog:gc',
                syntax: '-Xlog:gc:<output>',
                desc: '仅输出 GC 基本信息',
                examples: ['java -Xlog:gc:stdout MyApp', 'java -Xlog:gc:file=gc.log MyApp'],
                returns: 'GC 基本日志',
            },
            {
                cmd: '-Xlog:gc+heap=debug',
                syntax: '-Xlog:gc+heap=<level>:<output>',
                desc: '输出堆详细信息',
                examples: ['java -Xlog:gc+heap=debug:file=heap.log MyApp'],
                returns: '堆详情日志',
            },
            {
                cmd: '-Xlog:gc+phases=debug',
                syntax: '-Xlog:gc+phases=<level>:<output>',
                desc: '输出 GC 各阶段耗时',
                examples: ['java -Xlog:gc+phases=debug:file=phases.log MyApp'],
                returns: 'GC 阶段日志',
            },
            {
                cmd: '-XX:+PrintGCDetails',
                syntax: '-XX:+PrintGCDetails',
                desc: 'JDK 8 输出 GC 详细日志',
                examples: ['java -XX:+PrintGCDetails -XX:+PrintGCDateStamps -Xloggc:gc.log MyApp'],
                returns: 'GC 详细日志',
            },
            {
                cmd: '-XX:+PrintGCDateStamps',
                syntax: '-XX:+PrintGCDateStamps',
                desc: 'JDK 8 输出 GC 时间戳',
                examples: ['java -XX:+PrintGCDetails -XX:+PrintGCDateStamps MyApp'],
                returns: '带时间戳的日志',
            },
            {
                cmd: '-XX:+PrintHeapAtGC',
                syntax: '-XX:+PrintHeapAtGC',
                desc: 'GC 前后打印堆信息',
                examples: ['java -XX:+PrintHeapAtGC MyApp'],
                returns: '堆快照日志',
            },
            {
                cmd: '-XX:+PrintGCTimeStamps',
                syntax: '-XX:+PrintGCTimeStamps',
                desc: 'JDK 8 输出 GC 启动时间',
                examples: ['java -XX:+PrintGCDetails -XX:+PrintGCTimeStamps MyApp'],
                returns: '启动时间戳',
            },
        ],
    },
    {
        cat: 'GC 调优建议',
        items: [
            {
                cmd: '低延迟场景',
                syntax: '-XX:+UseG1GC -XX:MaxGCPauseMillis=50',
                desc: 'Web 应用、API 服务，要求响应时间 < 100ms',
                examples: ['java -XX:+UseG1GC -XX:MaxGCPauseMillis=50 -XX:G1NewSizePercent=30 web-app.jar'],
                returns: '低延迟 GC 配置',
            },
            {
                cmd: '高吞吐场景',
                syntax: '-XX:+UseParallelGC -XX:GCTimeRatio=99',
                desc: '批处理、后台任务，关注整体吞吐量',
                examples: ['java -XX:+UseParallelGC -XX:GCTimeRatio=99 -XX:ParallelGCThreads=8 batch.jar'],
                returns: '高吞吐 GC 配置',
            },
            {
                cmd: '大堆场景',
                syntax: '-XX:+UseZGC -Xmx32g',
                desc: '堆 > 8GB，要求低延迟',
                examples: ['java -XX:+UseZGC -Xmx32g -XX:SoftMaxHeapSize=28g big-heap.jar'],
                returns: '大堆 GC 配置',
            },
            {
                cmd: '内存敏感',
                syntax: '-XX:+UseG1GC -XX:G1HeapRegionSize=8m',
                desc: '堆内存有限，需要精细控制',
                examples: ['java -XX:+UseG1GC -XX:G1HeapRegionSize=8m -XX:G1ReservePercent=20 low-mem.jar'],
                returns: '内存优化配置',
            },
        ],
    },
    {
        cat: 'GC 分析工具',
        items: [
            {
                cmd: 'jstat -gcutil <pid>',
                syntax: 'jstat -gcutil <pid> [interval] [count]',
                desc: '查看 GC 统计信息（内存使用率）',
                examples: ['jstat -gcutil 12345 1000 10', 'jstat -gcutil 12345 5s'],
                returns: 'S0 S1 E O M CCS YGC YGCT FGC FGCT CGC CGCT GCT',
            },
            {
                cmd: 'jstat -gc <pid>',
                syntax: 'jstat -gc <pid> [interval] [count]',
                desc: '查看 GC 详细信息（内存大小）',
                examples: ['jstat -gc 12345 1000'],
                returns: '各内存区域容量与使用量',
            },
            {
                cmd: 'jmap -heap <pid>',
                syntax: 'jmap -heap <pid>',
                desc: '查看堆配置与使用情况',
                examples: ['jmap -heap 12345'],
                returns: '堆配置与使用详情',
            },
            {
                cmd: 'jmap -dump:format=b,file=<path> <pid>',
                syntax: 'jmap -dump:format=b,file=<path> <pid>',
                desc: '生成堆转储快照',
                examples: ['jmap -dump:format=b,file=heap.hprof 12345'],
                returns: '堆转储文件',
            },
            {
                cmd: 'jcmd <pid> GC.heap_info',
                syntax: 'jcmd <pid> GC.heap_info',
                desc: '查看堆信息（替代 jmap）',
                examples: ['jcmd 12345 GC.heap_info'],
                returns: '堆使用详情',
            },
            {
                cmd: 'jcmd <pid> GC.run',
                syntax: 'jcmd <pid> GC.run',
                desc: '触发 Full GC',
                examples: ['jcmd 12345 GC.run'],
                returns: 'GC 执行结果',
            },
            {
                cmd: 'GCViewer',
                syntax: 'java -jar gcviewer.jar <gc.log>',
                desc: '可视化分析 GC 日志',
                examples: ['java -jar gcviewer.jar gc.log gc-report.pdf'],
                returns: 'GC 分析报告',
            },
            {
                cmd: 'GCEasy',
                syntax: 'https://gceasy.io',
                desc: '在线 GC 日志分析工具',
                examples: ['上传 gc.log 到 gceasy.io'],
                returns: '在线分析报告',
            },
        ],
    },
];

let _gcrefSearchTimer = null;

function gcrefCopyPre(btn, ev) {
    if (ev) ev.stopPropagation();
    const pre = btn.parentElement.querySelector('pre');
    if (!pre) return;
    safeCopy(pre.innerText);
}

function gcrefRender(filter) {
    if (filter === undefined) {
        const el = document.getElementById('gcrefSearch');
        filter = el ? el.value : '';
    }
    filter = (filter || '').toLowerCase();
    const container = document.getElementById('gcrefContent');
    if (!container) return;
    container.innerHTML = '';
    let hasResult = false;
    GC_REFS.forEach((group) => {
        const matched = filter
            ? group.items.filter(
                (it) =>
                    it.cmd.toLowerCase().includes(filter) ||
                    it.desc.toLowerCase().includes(filter) ||
                    (it.syntax && it.syntax.toLowerCase().includes(filter)) ||
                    (it.examples && it.examples.some((ex) => ex.toLowerCase().includes(filter)))
            )
            : group.items;
        if (matched.length === 0) return;
        hasResult = true;
        const section = document.createElement('div');
        section.style.cssText = 'margin-bottom:16px';
        section.innerHTML = `<div style="font-size:12px;font-weight:600;color:var(--accent);padding:6px 0;border-bottom:1px solid var(--border);margin-bottom:8px">${escapeHtml(group.cat)}</div>`;
        matched.forEach((item) => {
            const card = document.createElement('div');
            card.className = 'ref-card';
            let html = `<div class="ref-cmd-head"><code class="ref-cmd-name">${escapeHtml(item.cmd)}</code><span class="ref-cmd-desc">${escapeHtml(item.desc)}</span><button class="sm outline" onclick="safeCopy('${escapeHtml(item.cmd).replace(/'/g, "\\'")}')">复制</button></div>`;
            if (item.syntax && item.syntax !== item.cmd) {
                html += `<div class="ref-syntax">${escapeHtml(item.syntax)}</div>`;
            }
            if (item.examples && item.examples.length) {
                html += `<div class="ref-section-title">示例</div>`;
                item.examples.forEach((ex) => {
                    html += `<div class="ref-copy-wrap"><pre class="ref-pre"><code>${escapeHtml(ex)}</code></pre><button class="ref-copy-btn" onclick="gcrefCopyPre(this, event)">复制</button></div>`;
                });
            }
            if (item.returns) {
                html += `<div style="font-size:11px;color:var(--text-muted);margin-top:6px"><strong>输出:</strong> ${escapeHtml(item.returns)}</div>`;
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

function gcrefSearch() {
    clearTimeout(_gcrefSearchTimer);
    _gcrefSearchTimer = setTimeout(function () {
        const el = document.getElementById('gcrefSearch');
        gcrefRender(el ? el.value : '');
    }, 200);
}

registerInit('gcref', gcrefRender);
