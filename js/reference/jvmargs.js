const JVM_ARGS = [
    {
        cat: '堆内存',
        items: [
            {arg: '-Xms', desc: '初始堆大小', example: '-Xms512m', default: '物理内存 1/64'},
            {arg: '-Xmx', desc: '最大堆大小', example: '-Xmx2g', default: '物理内存 1/4'},
            {arg: '-Xmn', desc: '年轻代大小', example: '-Xmn1g', default: '-'},
            {arg: '-Xss', desc: '线程栈大小', example: '-Xss512k', default: '512K~1M（平台相关）'},
            {arg: '-XX:NewRatio', desc: '年轻代/老年代比例', example: '-XX:NewRatio=2', default: '2'},
            {arg: '-XX:SurvivorRatio', desc: 'Eden/Survivor 比例', example: '-XX:SurvivorRatio=8', default: '8'},
            {arg: '-XX:MaxTenuringThreshold', desc: '对象晋升老年代的年龄阈值', example: '-XX:MaxTenuringThreshold=15', default: '15'},
            {arg: '-XX:PretenureSizeThreshold', desc: '大对象直接进入老年代的阈值', example: '-XX:PretenureSizeThreshold=10485760', default: '0'},
            {arg: '-XX:MinHeapFreeRatio', desc: 'GC 后堆最小空闲比例', example: '-XX:MinHeapFreeRatio=40', default: '40'},
            {arg: '-XX:MaxHeapFreeRatio', desc: 'GC 后堆最大空闲比例', example: '-XX:MaxHeapFreeRatio=70', default: '70'},
            {arg: '-XX:+AlwaysPreTouch', desc: '启动时物理内存预分配（避免运行时延迟）', example: '-XX:+AlwaysPreTouch', default: '-'},
            {arg: '-XX:SoftRefLRUPolicyMSPerMB', desc: '软引用存活时间（毫秒/MB）', example: '-XX:SoftRefLRUPolicyMSPerMB=1000', default: '1000'},
        ]
    },
    {
        cat: 'GC',
        items: [
            {arg: '-XX:+UseG1GC', desc: '启用 G1 垃圾回收器', example: '-XX:+UseG1GC', default: 'JDK 9+ 默认'},
            {arg: '-XX:+UseZGC', desc: '启用 Z 垃圾回收器（JDK 11+）', example: '-XX:+UseZGC', default: '-'},
            {arg: '-XX:+UseParallelGC', desc: '启用并行 GC', example: '-XX:+UseParallelGC', default: '-'},
            {arg: '-XX:+UseSerialGC', desc: '启用串行 GC', example: '-XX:+UseSerialGC', default: '-'},
            {arg: '-XX:+UseShenandoahGC', desc: '启用 Shenandoah GC（JDK 12+）', example: '-XX:+UseShenandoahGC', default: '-'},
            {arg: '-XX:MaxGCPauseMillis', desc: '目标最大 GC 停顿时间（毫秒）', example: '-XX:MaxGCPauseMillis=200', default: '-'},
            {arg: '-XX:G1HeapRegionSize', desc: 'G1 Region 大小（1-32MB）', example: '-XX:G1HeapRegionSize=16m', default: '自动'},
            {arg: '-XX:InitiatingHeapOccupancyPercent', desc: 'G1 触发并发标记的堆占用阈值', example: '-XX:InitiatingHeapOccupancyPercent=45', default: '45'},
            {arg: '-XX:ParallelGCThreads', desc: '并行 GC 线程数', example: '-XX:ParallelGCThreads=4', default: 'CPU 核数'},
            {arg: '-XX:ConcGCThreads', desc: '并发 GC 线程数', example: '-XX:ConcGCThreads=2', default: 'CPU 核数 / 4'},
            {arg: '-XX:+UseStringDeduplication', desc: '启用字符串去重（G1）', example: '-XX:+UseStringDeduplication', default: '-'},
            {arg: '-XX:G1ReservePercent', desc: 'G1 预留堆比例', example: '-XX:G1ReservePercent=10', default: '10'},
            {arg: '-XX:G1MixedGCCountTarget', desc: 'G1 混合 GC 目标次数', example: '-XX:G1MixedGCCountTarget=8', default: '8'},
            {arg: '-XX:+ExplicitGCInvokesConcurrent', desc: '显式 GC 时使用并发收集', example: '-XX:+ExplicitGCInvokesConcurrent', default: '-'},
            {arg: '-XX:InitiatingHeapOccupancyOnly', desc: '仅按 IHOP 触发并发周期', example: '-XX:-InitiatingHeapOccupancyOnly', default: '-'},
        ]
    },
    {
        cat: '诊断',
        items: [
            {arg: '-XX:+HeapDumpOnOutOfMemoryError', desc: 'OOM 时自动 dump 堆', example: '-XX:+HeapDumpOnOutOfMemoryError', default: '-'},
            {arg: '-XX:HeapDumpPath', desc: '堆 dump 文件路径', example: '-XX:HeapDumpPath=/tmp/heap.hprof', default: '当前目录'},
            {arg: '-XX:+PrintGCDetails', desc: '打印 GC 详细信息', example: '-XX:+PrintGCDetails', default: '-'},
            {arg: '-XX:+PrintGCTimeStamps', desc: '打印 GC 时间戳', example: '-XX:+PrintGCTimeStamps', default: '-'},
            {arg: '-Xloggc', desc: 'GC 日志输出文件', example: '-Xloggc:/tmp/gc.log', default: '-'},
            {arg: '-XX:+PrintClassHistogram', desc: 'Ctrl+Break 时打印类直方图', example: '-XX:+PrintClassHistogram', default: '-'},
            {arg: '-XX:+UnlockDiagnosticVMOptions', desc: '解锁诊断选项', example: '-XX:+UnlockDiagnosticVMOptions', default: '-'},
            {arg: '-XX:NativeMemoryTracking', desc: '本地内存跟踪（off/summary/detail）', example: '-XX:NativeMemoryTracking=detail', default: 'off'},
            {arg: '-XX:+ExitOnOutOfMemoryError', desc: 'OOM 时直接退出 JVM', example: '-XX:+ExitOnOutOfMemoryError', default: '-'},
            {arg: '-XX:OnOutOfMemoryError', desc: 'OOM 时执行脚本', example: '-XX:OnOutOfMemoryError="sh /opt/oom.sh"', default: '-'},
            {arg: '-XX:+HeapDumpAfterFullGC', desc: 'Full GC 后 dump 堆', example: '-XX:+HeapDumpAfterFullGC', default: '-'},
            {arg: '-XX:ErrorReport', desc: '错误报告输出目录', example: '-XX:ErrorFile=/tmp/hs_err.log', default: '当前目录'},
        ]
    },
    {
        cat: '元空间',
        items: [
            {arg: '-XX:MetaspaceSize', desc: '元空间初始大小', example: '-XX:MetaspaceSize=128m', default: '约 20M'},
            {arg: '-XX:MaxMetaspaceSize', desc: '元空间最大大小', example: '-XX:MaxMetaspaceSize=512m', default: '无限制'},
            {arg: '-XX:CompressedClassSpaceSize', desc: '压缩类空间大小', example: '-XX:CompressedClassSpaceSize=256m', default: '1G'},
            {arg: '-XX:MinMetaspaceFreeRatio', desc: '元空间最小空闲比例', example: '-XX:MinMetaspaceFreeRatio=40', default: '40'},
            {arg: '-XX:MaxMetaspaceFreeRatio', desc: '元空间最大空闲比例', example: '-XX:MaxMetaspaceFreeRatio=70', default: '70'},
        ]
    },
    {
        cat: '其他',
        items: [
            {arg: '-Dfile.encoding', desc: '默认文件编码', example: '-Dfile.encoding=UTF-8', default: '-'},
            {arg: '-Duser.timezone', desc: '时区设置', example: '-Duser.timezone=Asia/Shanghai', default: '-'},
            {arg: '-server', desc: '启用服务器模式（64-bit 默认）', example: '-server', default: '-'},
            {arg: '-Djava.awt.headless', desc: '无头模式（Linux 服务端）', example: '-Djava.awt.headless=true', default: '-'},
            {arg: '-XX:CICompilerCount', desc: 'JIT 编译器线程数', example: '-XX:CICompilerCount=4', default: 'CPU 核数'},
            {arg: '-XX:ReservedCodeCacheSize', desc: 'JIT 代码缓存大小', example: '-XX:ReservedCodeCacheSize=240m', default: '240M'},
            {arg: '-XX:InitialCodeCacheSize', desc: 'JIT 代码缓存初始大小', example: '-XX:InitialCodeCacheSize=32m', default: '32M'},
            {arg: '-XX:+UseCompressedOops', desc: '启用压缩指针（堆 < 32G 时自动）', example: '-XX:+UseCompressedOops', default: '-'},
            {arg: '-Xshare', desc: '类数据共享（auto/on/off）', example: '-Xshare:auto', default: 'auto'},
            {arg: '-XX:ObjectAlignmentInBytes', desc: '对象对齐字节数（8/16）', example: '-XX:ObjectAlignmentInBytes=8', default: '8'},
        ]
    },
];

const JVM_TEMPLATES = [
    {
        name: '生产环境 4G 堆 + G1GC',
        cmd: 'java -Xms4g -Xmx4g -XX:+UseG1GC -XX:MaxGCPauseMillis=200 -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp/heap.hprof -jar app.jar'
    },
    {
        name: '开发环境 512M 堆',
        cmd: 'java -Xms512m -Xmx512m -XX:+UseG1GC -jar app.jar'
    },
    {
        name: '调优诊断模式',
        cmd: 'java -Xms2g -Xmx2g -XX:+UseG1GC -XX:+PrintGCDetails -XX:+PrintGCTimeStamps -Xloggc:gc.log -XX:+HeapDumpOnOutOfMemoryError -jar app.jar'
    },
    {
        name: '低延迟 ZGC（JDK 17+）',
        cmd: 'java -Xms4g -Xmx4g -XX:+UseZGC -jar app.jar'
    },
];

let _jvmargsSearchTimer = null;
let _jvmargsCurrentCat = '全部';

function jvmargsRender() {
    const container = document.getElementById('jvmargsContent');
    if (!container) return;
    container.innerHTML = '';
    const filter = (document.getElementById('jvmargsSearch') || {}).value || '';
    const q = filter.toLowerCase().trim();
    let hasResult = false;
    JVM_ARGS.forEach(group => {
        if (_jvmargsCurrentCat !== '全部' && group.cat !== _jvmargsCurrentCat) return;
        const matched = q
            ? group.items.filter(it =>
                it.arg.toLowerCase().includes(q) ||
                it.desc.toLowerCase().includes(q) ||
                (it.example || '').toLowerCase().includes(q) ||
                (it.default || '').toLowerCase().includes(q))
            : group.items;
        if (matched.length === 0) return;
        hasResult = true;
        const h = document.createElement('div');
        h.style.cssText = 'font-size:13px;font-weight:600;color:var(--accent);padding:10px 0 6px;border-bottom:1px solid var(--border);margin-bottom:4px';
        h.textContent = group.cat;
        container.appendChild(h);
        matched.forEach(item => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;flex-direction:column;gap:4px;padding:10px 12px;border:1px solid var(--border);border-radius:6px;margin-bottom:6px;background:var(--bg-card);transition:border-color .12s;cursor:pointer';
            const safeArg = item.arg.replace(/</g, '&lt;');
            const safeDesc = item.desc.replace(/</g, '&lt;');
            const safeExample = (item.example || '').replace(/</g, '&lt;');
            const safeDefault = (item.default || '').replace(/</g, '&lt;');
            const metaHtml = (item.example && item.example !== '-'
                ? '<span>示例: <code style="background:var(--bg-input);padding:1px 6px;border-radius:3px;color:var(--accent2);font-family:var(--font)">' + safeExample + '</code></span>'
                : '') +
                (item.default && item.default !== '-'
                    ? '<span style="color:var(--text-dim)">默认: ' + safeDefault + '</span>'
                    : '');
            row.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center">' +
                '<code style="color:var(--accent);font-family:var(--font);font-size:13px;font-weight:600">' + safeArg + '</code>' +
                '<button class="sm outline" onclick="event.stopPropagation();safeCopy(\'' + safeArg.replace(/'/g, "\\'") + '\',\'已复制参数名\')">复制参数名</button>' +
                '</div>' +
                '<div style="font-size:12px;color:var(--text-main)">' + safeDesc + '</div>' +
                (metaHtml ? '<div style="display:flex;gap:12px;font-size:11px;flex-wrap:wrap">' + metaHtml + '</div>' : '');
            row.addEventListener('mouseenter', function () {
                this.style.borderColor = 'var(--accent)';
            });
            row.addEventListener('mouseleave', function () {
                this.style.borderColor = 'var(--border)';
            });
            row.addEventListener('click', function () {
                safeCopy(item.arg, '已复制参数名');
            });
            container.appendChild(row);
        });
    });
    if (!hasResult) {
        container.innerHTML = '<div style="color:var(--text-dim);padding:20px;text-align:center">无匹配参数</div>';
    }
}

function renderJvmTemplates() {
    const container = document.getElementById('jvmargsTemplates');
    if (!container) return;
    container.innerHTML = '';
    JVM_TEMPLATES.forEach((tpl, idx) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid var(--border);border-radius:6px;background:var(--bg-card);cursor:pointer';
        const safeName = tpl.name.replace(/</g, '&lt;');
        const safeCmd = tpl.cmd.replace(/</g, '&lt;');
        row.innerHTML = '<span style="font-weight:600;color:var(--accent);min-width:160px">' + safeName + '</span>' +
            '<code style="flex:1;background:var(--bg-input);padding:4px 10px;border-radius:4px;color:var(--accent2);font-family:var(--font);font-size:12px;overflow-x:auto;white-space:nowrap">' + safeCmd + '</code>' +
            '<button class="sm outline" onclick="event.stopPropagation();safeCopy(\'' + safeCmd.replace(/'/g, "\\'") + '\',\'已复制模板\')">复制</button>';
        row.addEventListener('click', function () {
            safeCopy(tpl.cmd, '已复制模板');
        });
        container.appendChild(row);
    });
}

function jvmargsSearch() {
    clearTimeout(_jvmargsSearchTimer);
    _jvmargsSearchTimer = setTimeout(function () {
        jvmargsRender();
    }, 200);
}

function jvmargsFilter(cat) {
    _jvmargsCurrentCat = cat;
    document.querySelectorAll('#jvmargsTabs button').forEach(btn => {
        btn.classList.toggle('active', btn.textContent === cat);
    });
    jvmargsRender();
}
