const arthasCommands = [
    {
        cat: '基础诊断',
        items: [
            {cmd: 'dashboard', desc: '仪表盘，查看线程/内存/GC/系统信息'},
            {cmd: 'thread', desc: '查看线程信息，支持 thread -b 查找死锁'},
            {cmd: 'jvm', desc: 'JVM 信息概览（启动参数、版本、类加载等）'},
            {cmd: 'sysprop', desc: '查看/修改系统属性 System.getProperties()'},
            {cmd: 'sysenv', desc: '查看系统环境变量'},
            {cmd: 'vmoption', desc: '查看/修改 JVM 选项（如 -Xmx）'},
            {cmd: 'logger', desc: '查看/修改 Logger 级别'},
            {cmd: 'heapdump', desc: '生成 Heap Dump 到文件'},
        ]
    },
    {
        cat: '类与方法',
        items: [
            {cmd: 'sc', desc: '查看 JVM 已加载的类信息（支持正则）'},
            {cmd: 'sm', desc: '查看已加载类的方法签名'},
            {cmd: 'jad', desc: '反编译已加载类的源码'},
            {cmd: 'mc', desc: '在线编译 Java 源文件为 .class'},
            {cmd: 'redefine', desc: '热替换已加载类的字节码'},
            {cmd: 'retransform', desc: '增强版 redefine，支持撤销'},
            {cmd: 'dump', desc: '将已加载类字节码 dump 到指定目录'},
        ]
    },
    {
        cat: '方法监控',
        items: [
            {cmd: 'monitor', desc: '统计方法调用次数、耗时、异常率'},
            {cmd: 'watch', desc: '观察方法入参/返回值/异常，支持条件过滤'},
            {cmd: 'trace', desc: '追踪方法调用链及耗时分布'},
            {cmd: 'stack', desc: '输出方法调用栈信息'},
            {cmd: 'tt', desc: '时空隧道，记录方法调用数据供回放'},
        ]
    },
    {
        cat: '高级工具',
        items: [
            {cmd: 'ognl', desc: '执行 OGNL 表达式，动态获取/修改对象值'},
            {cmd: 'vmtool', desc: '强制 GC、获取 Spring Context 等高级操作'},
            {cmd: 'perfcounter', desc: '查看/修改性能计数器'},
            {cmd: 'profiler', desc: '生成 CPU/内存火焰图'},
            {cmd: 'mbean', desc: '查看/调用 MBean 属性和方法'},
            {cmd: 'memory', desc: '内存模型信息及使用情况'},
        ]
    }
];

let arthasSearchTimer = null;

function arthasRender(filter) {
    const container = document.getElementById('arthasContent');
    filter = (filter || '').trim().toLowerCase();
    container.innerHTML = '';
    let hasResult = false;
    arthasCommands.forEach(group => {
        let matched = group.items;
        if (filter) {
            matched = group.items.filter(i =>
                i.cmd.includes(filter) || i.desc.includes(filter)
            );
        }
        if (!matched.length) return;
        hasResult = true;
        const section = document.createElement('div');
        section.style.cssText = 'margin-bottom:16px';
        section.innerHTML = `<div style="font-size:12px;font-weight:600;color:var(--accent);padding:6px 0;border-bottom:1px solid var(--border);margin-bottom:8px">${group.cat}</div>`;
        matched.forEach(item => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:4px;transition:background .12s';
            row.onmouseenter = () => row.style.background = 'var(--glass)';
            row.onmouseleave = () => row.style.background = '';
            row.innerHTML = `<code style="background:var(--bg-input);padding:2px 8px;border-radius:4px;font-size:13px;white-space:nowrap;flex-shrink:0">${item.cmd}</code><span style="font-size:12px;color:var(--text-dim);flex:1">${item.desc}</span><button class="sm outline" onclick="copyText(this.previousElementSibling.previousElementSibling)">复制</button>`;
            section.appendChild(row);
        });
        container.appendChild(section);
    });
    if (!hasResult) {
        container.innerHTML = '<div style="color:var(--text-muted);padding:20px;text-align:center">无匹配结果</div>';
    }
}

function arthasSearch() {
    clearTimeout(arthasSearchTimer);
    arthasSearchTimer = setTimeout(() => {
        arthasRender(document.getElementById('arthasSearch').value);
    }, 200);
}

// 由 app.js 的 renderMap 触发 arthasRender()
