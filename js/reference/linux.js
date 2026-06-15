const LINUX_CMDS = [
    { cat: '文件操作', items: [
        { cmd: 'ls -la', desc: '列出文件 (含隐藏文件)' },
        { cmd: 'cd /path', desc: '切换目录' },
        { cmd: 'pwd', desc: '当前路径' },
        { cmd: 'mkdir -p a/b/c', desc: '递归创建目录' },
        { cmd: 'rm -rf dir', desc: '删除目录及内容' },
        { cmd: 'cp -r src dst', desc: '复制目录' },
        { cmd: 'mv src dst', desc: '移动/重命名' },
        { cmd: 'touch file', desc: '创建空文件' },
        { cmd: 'cat file', desc: '查看文件内容' },
        { cmd: 'less file', desc: '分页查看' },
        { cmd: 'head -n 20 file', desc: '查看前 20 行' },
        { cmd: 'tail -f file', desc: '实时跟踪日志' },
        { cmd: 'find . -name "*.java"', desc: '查找文件' },
        { cmd: 'grep -r "pattern" .', desc: '递归搜索文本' },
        { cmd: 'wc -l file', desc: '统计行数' },
    ]},
    { cat: '权限与用户', items: [
        { cmd: 'chmod 755 file', desc: '设置权限 rwxr-xr-x' },
        { cmd: 'chown user:group file', desc: '修改所有者' },
        { cmd: 'whoami', desc: '当前用户' },
        { cmd: 'id', desc: '用户 ID 信息' },
        { cmd: 'sudo command', desc: '以 root 执行' },
    ]},
    { cat: '进程与系统', items: [
        { cmd: 'ps aux', desc: '查看所有进程' },
        { cmd: 'top', desc: '系统监控' },
        { cmd: 'htop', desc: '增强版系统监控' },
        { cmd: 'kill -9 PID', desc: '强制终止进程' },
        { cmd: 'df -h', desc: '磁盘使用情况' },
        { cmd: 'du -sh *', desc: '目录占用空间' },
        { cmd: 'free -h', desc: '内存使用情况' },
        { cmd: 'uname -a', desc: '系统内核信息' },
        { cmd: 'lscpu', desc: 'CPU 信息' },
    ]},
    { cat: '网络', items: [
        { cmd: 'ping host', desc: '测试网络连通' },
        { cmd: 'curl -v http://...', desc: 'HTTP 请求' },
        { cmd: 'wget url', desc: '下载文件' },
        { cmd: 'netstat -tlnp', desc: '查看监听端口' },
        { cmd: 'ss -tlnp', desc: '查看监听端口(新版)' },
        { cmd: 'ifconfig', desc: '网络接口信息' },
        { cmd: 'ip addr', desc: 'IP 地址信息' },
        { cmd: 'ssh user@host', desc: 'SSH 连接' },
        { cmd: 'scp file user@host:/path', desc: '远程复制' },
    ]},
    { cat: '压缩与打包', items: [
        { cmd: 'tar -czf a.tar.gz dir/', desc: '打包并压缩 gzip' },
        { cmd: 'tar -xzf a.tar.gz', desc: '解压 tar.gz' },
        { cmd: 'zip -r a.zip dir/', desc: '压缩为 zip' },
        { cmd: 'unzip a.zip', desc: '解压 zip' },
    ]},
    { cat: 'Java 相关', items: [
        { cmd: 'java -jar app.jar', desc: '运行 JAR' },
        { cmd: 'java -Xms512m -Xmx2g -jar app.jar', desc: '指定堆内存运行' },
        { cmd: 'jps', desc: '查看 Java 进程' },
        { cmd: 'jstack PID', desc: '线程堆栈' },
        { cmd: 'jstat -gc PID', desc: 'GC 统计' },
        { cmd: 'jmap -heap PID', desc: '堆内存信息' },
    ]},
];

function linuxRender() {
    const container = document.getElementById('linuxContent');
    container.innerHTML = '';
    LINUX_CMDS.forEach(group => {
        const h = document.createElement('div');
        h.style.cssText = 'font-size:13px;font-weight:600;color:var(--accent);padding:10px 0 6px;border-bottom:1px solid var(--border);margin-bottom:4px';
        h.textContent = group.cat;
        container.appendChild(h);
        group.items.forEach(item => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:4px 8px;border-radius:4px;font-size:12px;cursor:pointer;transition:background .12s';
            row.innerHTML = '<code style="background:var(--bg-input);padding:2px 8px;border-radius:3px;color:var(--accent2);white-space:pre;font-family:var(--font)">' + item.cmd + '</code><span style="color:var(--text-dim)">' + item.desc + '</span>';
            row.addEventListener('mouseenter', function() { this.style.background = 'var(--glass-hover)'; });
            row.addEventListener('mouseleave', function() { this.style.background = ''; });
            row.addEventListener('click', function() { navigator.clipboard.writeText(item.cmd).then(() => toast('已复制')); });
            container.appendChild(row);
        });
    });
}
