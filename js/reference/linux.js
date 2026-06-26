const LINUX_CMDS = [
    {
        cat: '文件操作', items: [
            {cmd: 'ls -la', desc: '列出文件 (含隐藏文件)'},
            {cmd: 'cd /path', desc: '切换目录'},
            {cmd: 'pwd', desc: '当前路径'},
            {cmd: 'mkdir -p a/b/c', desc: '递归创建目录'},
            {cmd: 'rm -rf dir', desc: '删除目录及内容'},
            {cmd: 'cp -r src dst', desc: '复制目录'},
            {cmd: 'mv src dst', desc: '移动/重命名'},
            {cmd: 'touch file', desc: '创建空文件'},
            {cmd: 'cat file', desc: '查看文件内容'},
            {cmd: 'less file', desc: '分页查看'},
            {cmd: 'head -n 20 file', desc: '查看前 20 行'},
            {cmd: 'tail -f file', desc: '实时跟踪日志'},
            {cmd: 'find . -name "*.java"', desc: '查找文件'},
            {cmd: 'grep -r "pattern" .', desc: '递归搜索文本'},
            {cmd: 'wc -l file', desc: '统计行数'},
        ]
    },
    {
        cat: '权限与用户', items: [
            {cmd: 'chmod 755 file', desc: '设置权限 rwxr-xr-x'},
            {cmd: 'chown user:group file', desc: '修改所有者'},
            {cmd: 'whoami', desc: '当前用户'},
            {cmd: 'id', desc: '用户 ID 信息'},
            {cmd: 'sudo command', desc: '以 root 执行'},
            {cmd: 'useradd -m user', desc: '创建新用户（含 home）'},
            {cmd: 'passwd user', desc: '修改用户密码'},
            {cmd: 'su - user', desc: '切换用户'},
        ]
    },
    {
        cat: '进程与系统', items: [
            {cmd: 'ps aux', desc: '查看所有进程'},
            {cmd: 'top', desc: '系统监控'},
            {cmd: 'htop', desc: '增强版系统监控'},
            {cmd: 'kill -9 PID', desc: '强制终止进程'},
            {cmd: 'df -h', desc: '磁盘使用情况'},
            {cmd: 'du -sh *', desc: '目录占用空间'},
            {cmd: 'free -h', desc: '内存使用情况'},
            {cmd: 'uname -a', desc: '系统内核信息'},
            {cmd: 'lscpu', desc: 'CPU 信息'},
            {cmd: 'pgrep -f java', desc: '按名称查找进程'},
            {cmd: 'pkill -f xxx', desc: '按名称批量杀进程'},
            {cmd: 'lsof -i:8080', desc: '查看端口占用进程'},
            {cmd: 'nice -n 19 cmd', desc: '低优先级运行命令'},
        ]
    },
    {
        cat: '网络', items: [
            {cmd: 'ping host', desc: '测试网络连通'},
            {cmd: 'curl -v http://...', desc: 'HTTP 请求'},
            {cmd: 'wget url', desc: '下载文件'},
            {cmd: 'netstat -tlnp', desc: '查看监听端口'},
            {cmd: 'ss -tlnp', desc: '查看监听端口(新版)'},
            {cmd: 'ifconfig', desc: '网络接口信息'},
            {cmd: 'ip addr', desc: 'IP 地址信息'},
            {cmd: 'ssh user@host', desc: 'SSH 连接'},
            {cmd: 'scp file user@host:/path', desc: '远程复制'},
            {cmd: 'traceroute host', desc: '路由追踪'},
            {cmd: 'dig +short xxx.com', desc: 'DNS 查询（精简输出）'},
            {cmd: 'nslookup xxx.com', desc: 'DNS 反向解析'},
            {cmd: 'rsync -avz src/ user@host:/dst/', desc: '远程同步文件'},
        ]
    },
    {
        cat: '压缩与打包', items: [
            {cmd: 'tar -czf a.tar.gz dir/', desc: '打包并压缩 gzip'},
            {cmd: 'tar -xzf a.tar.gz', desc: '解压 tar.gz'},
            {cmd: 'zip -r a.zip dir/', desc: '压缩为 zip'},
            {cmd: 'unzip a.zip', desc: '解压 zip'},
        ]
    },
    {
        cat: 'Java 相关', items: [
            {cmd: 'java -jar app.jar', desc: '运行 JAR'},
            {cmd: 'java -Xms512m -Xmx2g -jar app.jar', desc: '指定堆内存运行'},
            {cmd: 'jps', desc: '查看 Java 进程'},
            {cmd: 'jstack PID', desc: '线程堆栈'},
            {cmd: 'jstat -gc PID', desc: 'GC 统计'},
            {cmd: 'jmap -heap PID', desc: '堆内存信息'},
            {cmd: 'jcmd PID help', desc: '查看进程支持的 jcmd 命令'},
            {cmd: 'jinfo PID', desc: '查看 JVM 配置参数'},
        ]
    },
    {
        cat: 'systemd 服务管理', items: [
            {cmd: 'systemctl start nginx', desc: '启动服务'},
            {cmd: 'systemctl stop nginx', desc: '停止服务'},
            {cmd: 'systemctl restart nginx', desc: '重启服务'},
            {cmd: 'systemctl status nginx', desc: '查看服务状态'},
            {cmd: 'systemctl enable nginx', desc: '设置开机自启'},
            {cmd: 'systemctl disable nginx', desc: '取消开机自启'},
            {cmd: 'systemctl list-units --type=service', desc: '查看所有服务状态'},
            {cmd: 'systemctl daemon-reload', desc: '重载服务配置（修改 unit 后）'},
            {cmd: 'journalctl -u nginx -f', desc: '跟踪服务日志'},
            {cmd: 'journalctl --since "1 hour ago"', desc: '查看最近 1 小时日志'},
        ]
    },
    {
        cat: '文本处理', items: [
            {cmd: "sed -i 's/old/new/g' file", desc: '替换文件中的字符串'},
            {cmd: "sed -n '10,20p' file", desc: '查看 10-20 行'},
            {cmd: "awk -F: '{print $1}' /etc/passwd", desc: '按分隔符取列'},
            {cmd: "awk '$3 > 100' file", desc: '按条件过滤行'},
            {cmd: 'sort file | uniq -c', desc: '统计重复行次数'},
            {cmd: 'sort -k3 -n -r file', desc: '按第 3 列数值倒序'},
            {cmd: 'cut -d, -f1,3 file.csv', desc: '按分隔符取指定列'},
            {cmd: "find . -name '*.log' | xargs rm", desc: '批量删除日志文件'},
            {cmd: "tr 'a-z' 'A-Z' < file", desc: '小写转大写'},
            {cmd: "echo $PATH | tr ':' '\\n'", desc: '分隔符转换'},
        ]
    },
    {
        cat: '文件查找与系统信息', items: [
            {cmd: 'which python', desc: '查找可执行文件路径'},
            {cmd: 'whereis nginx', desc: '查找二进制/源码/手册路径'},
            {cmd: 'stat file', desc: '查看文件详细属性（大小/权限/时间）'},
            {cmd: 'file xxx', desc: '查看文件类型'},
            {cmd: 'ln -s /opt/a /usr/local/bin/a', desc: '创建软链接'},
            {cmd: 'uptime', desc: '系统运行时间与负载'},
            {cmd: 'date "+%Y-%m-%d %H:%M:%S"', desc: '格式化时间输出'},
            {cmd: 'hostname -I', desc: '查看本机 IP 地址'},
        ]
    },
    {
        cat: '包管理与定时任务', items: [
            {cmd: 'apt update && apt upgrade -y', desc: 'Debian/Ubuntu 更新'},
            {cmd: 'apt install -y nginx', desc: 'Debian/Ubuntu 安装软件'},
            {cmd: 'apt remove nginx', desc: 'Debian/Ubuntu 卸载软件'},
            {cmd: 'yum install -y nginx', desc: 'CentOS/RHEL 7 安装软件'},
            {cmd: 'dnf install -y nginx', desc: 'CentOS/RHEL 8+ 安装软件'},
            {cmd: 'apk add --no-cache nginx', desc: 'Alpine 安装软件'},
            {cmd: 'crontab -e', desc: '编辑当前用户的定时任务'},
            {cmd: 'crontab -l', desc: '查看当前用户的定时任务'},
            {cmd: '* * * * * /path/script.sh', desc: 'crontab 格式：分 时 日 月 周 命令'},
            {cmd: 'crontab -r', desc: '删除当前用户的所有定时任务'},
        ]
    },
];

let _linuxSearchTimer = null;

function linuxRender(filter) {
    if (filter === undefined) {
        const el = document.getElementById('linuxSearch');
        filter = el ? el.value : '';
    }
    filter = (filter || '').toLowerCase();
    const container = document.getElementById('linuxContent');
    if (!container) return;
    container.innerHTML = '';
    let hasResult = false;
    LINUX_CMDS.forEach(group => {
        const matched = filter
            ? group.items.filter(it =>
                it.cmd.toLowerCase().includes(filter) ||
                it.desc.toLowerCase().includes(filter))
            : group.items;
        if (matched.length === 0) return;
        hasResult = true;
        const h = document.createElement('div');
        h.style.cssText = 'font-size:13px;font-weight:600;color:var(--accent);padding:10px 0 6px;border-bottom:1px solid var(--border);margin-bottom:4px';
        h.textContent = group.cat;
        container.appendChild(h);
        matched.forEach(item => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:4px 8px;border-radius:4px;font-size:12px;cursor:pointer;transition:background .12s';
            const safeCmd = item.cmd.replace(/</g, '&lt;');
            const safeDesc = item.desc.replace(/</g, '&lt;');
            row.innerHTML = '<code style="background:var(--bg-input);padding:2px 8px;border-radius:3px;color:var(--accent2);white-space:pre;font-family:var(--font)">' + safeCmd + '</code><span style="color:var(--text-dim)">' + safeDesc + '</span>';
            row.addEventListener('mouseenter', function () {
                this.style.background = 'var(--glass-hover)';
            });
            row.addEventListener('mouseleave', function () {
                this.style.background = '';
            });
            row.addEventListener('click', function () {
                safeCopy(item.cmd);
            });
            container.appendChild(row);
        });
    });
    if (!hasResult) {
        container.innerHTML = '<div style="color:var(--text-dim);padding:20px;text-align:center">无匹配结果</div>';
    }
}

function linuxSearch() {
    clearTimeout(_linuxSearchTimer);
    _linuxSearchTimer = setTimeout(function () {
        const el = document.getElementById('linuxSearch');
        linuxRender(el ? el.value : '');
    }, 200);
}

registerInit('linux', linuxRender);
