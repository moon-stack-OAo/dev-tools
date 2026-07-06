const LINUX_CMDS = [
  {
    cat: "文件操作",
    items: [
      {
        cmd: "ls",
        syntax: "ls [选项] [文件...]",
        desc: "列出目录内容",
        examples: ["ls -la", "ls -lh /var/log", "ls -lt --color=auto"],
        returns: "文件列表",
      },
      {
        cmd: "cd",
        syntax: "cd [目录]",
        desc: "切换工作目录",
        examples: ["cd /home/user", "cd ..", "cd ~", "cd -"],
        returns: "无输出",
      },
      {
        cmd: "pwd",
        syntax: "pwd",
        desc: "显示当前工作目录",
        examples: ["pwd"],
        returns: "当前路径",
      },
      {
        cmd: "mkdir",
        syntax: "mkdir [选项] 目录...",
        desc: "创建目录",
        examples: ["mkdir -p a/b/c", "mkdir -m 755 mydir"],
        returns: "无输出",
      },
      {
        cmd: "rm",
        syntax: "rm [选项] 文件...",
        desc: "删除文件或目录",
        examples: ["rm file.txt", "rm -rf directory", "rm -i *.log"],
        returns: "无输出",
      },
      {
        cmd: "cp",
        syntax: "cp [选项] 源... 目标",
        desc: "复制文件或目录",
        examples: ["cp file.txt backup/", "cp -r src/ dst/", "cp -p file dst"],
        returns: "无输出",
      },
      {
        cmd: "mv",
        syntax: "mv [选项] 源... 目标",
        desc: "移动/重命名文件或目录",
        examples: ["mv old.txt new.txt", "mv file /tmp/", "mv -i src dst"],
        returns: "无输出",
      },
      {
        cmd: "touch",
        syntax: "touch [选项] 文件...",
        desc: "创建空文件或更新时间戳",
        examples: ["touch newfile.txt", "touch -t 202601011200 file"],
        returns: "无输出",
      },
      {
        cmd: "cat",
        syntax: "cat [选项] [文件...]",
        desc: "连接文件并打印到标准输出",
        examples: [
          "cat file.txt",
          "cat -n file.txt",
          "cat file1 file2 > combined",
        ],
        returns: "文件内容",
      },
      {
        cmd: "less",
        syntax: "less [选项] 文件",
        desc: "分页查看文件",
        examples: ["less /var/log/syslog", "less +F log.txt"],
        returns: "交互式分页",
      },
      {
        cmd: "head",
        syntax: "head [选项] [文件...]",
        desc: "输出文件开头部分",
        examples: ["head -n 20 file.txt", "head -c 100 file.txt"],
        returns: "文件开头内容",
      },
      {
        cmd: "tail",
        syntax: "tail [选项] [文件...]",
        desc: "输出文件末尾部分",
        examples: ["tail -f /var/log/syslog", "tail -n 50 file.txt"],
        returns: "文件末尾内容",
      },
      {
        cmd: "find",
        syntax: "find [路径] [选项] [表达式]",
        desc: "查找文件和目录",
        examples: [
          'find . -name "*.java"',
          "find /tmp -mtime +7 -delete",
          "find . -type f -size +100M",
        ],
        returns: "匹配的文件路径",
      },
      {
        cmd: "grep",
        syntax: "grep [选项] 模式 [文件...]",
        desc: "搜索文本模式",
        examples: [
          'grep -r "error" /var/log',
          'grep -i "hello" file.txt',
          "ps aux | grep nginx",
        ],
        returns: "匹配的行",
      },
      {
        cmd: "wc",
        syntax: "wc [选项] [文件...]",
        desc: "统计行数、单词数、字节数",
        examples: ["wc -l file.txt", "wc -c file.txt", "ls | wc -l"],
        returns: "统计结果",
      },
    ],
  },
  {
    cat: "权限与用户",
    items: [
      {
        cmd: "chmod",
        syntax: "chmod [选项] 模式 文件...",
        desc: "修改文件权限",
        examples: ["chmod 755 script.sh", "chmod +x file", "chmod u+w file"],
        returns: "无输出",
      },
      {
        cmd: "chown",
        syntax: "chown [选项] [所有者][:[组]] 文件...",
        desc: "修改文件所有者",
        examples: [
          "chown user:group file",
          "chown -R www-data:www-data /var/www",
        ],
        returns: "无输出",
      },
      {
        cmd: "whoami",
        syntax: "whoami",
        desc: "显示当前用户名",
        examples: ["whoami"],
        returns: "用户名",
      },
      {
        cmd: "id",
        syntax: "id [用户]",
        desc: "显示用户 ID 信息",
        examples: ["id", "id username"],
        returns: "uid=1000(user) gid=1000(user)...",
      },
      {
        cmd: "sudo",
        syntax: "sudo [选项] 命令",
        desc: "以 root 权限执行命令",
        examples: ["sudo apt update", "sudo -u www-data command"],
        returns: "命令输出",
      },
      {
        cmd: "useradd",
        syntax: "useradd [选项] 用户名",
        desc: "创建新用户",
        examples: [
          "useradd -m newuser",
          "useradd -m -s /bin/bash -G sudo user",
        ],
        returns: "无输出",
      },
      {
        cmd: "passwd",
        syntax: "passwd [选项] [用户]",
        desc: "修改用户密码",
        examples: ["passwd", "passwd username"],
        returns: "密码修改提示",
      },
      {
        cmd: "su",
        syntax: "su [选项] [-] [用户 [参数...]]",
        desc: "切换用户",
        examples: ["su - username", "su -"],
        returns: "切换到目标用户 shell",
      },
    ],
  },
  {
    cat: "进程与系统",
    items: [
      {
        cmd: "ps",
        syntax: "ps [选项]",
        desc: "显示进程状态",
        examples: ["ps aux", "ps -ef | grep java", "ps -p 1234 -o pid,cmd"],
        returns: "进程列表",
      },
      {
        cmd: "top",
        syntax: "top [选项]",
        desc: "实时系统监控",
        examples: ["top", "top -u username", "top -p 1234"],
        returns: "交互式监控界面",
      },
      {
        cmd: "htop",
        syntax: "htop [选项]",
        desc: "增强版系统监控",
        examples: ["htop", "htop -u username"],
        returns: "交互式监控界面",
      },
      {
        cmd: "kill",
        syntax: "kill [选项] PID...",
        desc: "终止进程",
        examples: ["kill 1234", "kill -9 1234", "kill -TERM 1234"],
        returns: "无输出",
      },
      {
        cmd: "df",
        syntax: "df [选项] [文件...]",
        desc: "报告磁盘空间使用情况",
        examples: ["df -h", "df -h /home", "df -T"],
        returns: "磁盘使用表格",
      },
      {
        cmd: "du",
        syntax: "du [选项] [文件...]",
        desc: "估算文件空间使用",
        examples: ["du -sh *", "du -sh /var/log", "du -h --max-depth=1"],
        returns: "空间使用大小",
      },
      {
        cmd: "free",
        syntax: "free [选项]",
        desc: "显示内存使用情况",
        examples: ["free -h", "free -m", "free -g"],
        returns: "内存使用表格",
      },
      {
        cmd: "uname",
        syntax: "uname [选项]",
        desc: "显示系统信息",
        examples: ["uname -a", "uname -r", "uname -m"],
        returns: "系统信息",
      },
      {
        cmd: "lscpu",
        syntax: "lscpu [选项]",
        desc: "显示 CPU 架构信息",
        examples: ["lscpu", "lscpu | grep ^CPU"],
        returns: "CPU 信息",
      },
      {
        cmd: "pgrep",
        syntax: "pgrep [选项] 模式",
        desc: "按名称查找进程",
        examples: ["pgrep -f java", "pgrep -l nginx", "pgrep -u www-data"],
        returns: "进程 ID",
      },
      {
        cmd: "pkill",
        syntax: "pkill [选项] 模式",
        desc: "按名称批量杀进程",
        examples: ["pkill -f java", "pkill -9 nginx"],
        returns: "无输出",
      },
      {
        cmd: "lsof",
        syntax: "lsof [选项]",
        desc: "列出打开的文件",
        examples: ["lsof -i:8080", "lsof -u username", "lsof /var/log/syslog"],
        returns: "打开文件列表",
      },
      {
        cmd: "nice",
        syntax: "nice [选项] 命令 [参数...]",
        desc: "以指定优先级运行命令",
        examples: ["nice -n 19 ./script.sh", "nice -n -20 command"],
        returns: "命令输出",
      },
    ],
  },
  {
    cat: "网络",
    items: [
      {
        cmd: "ping",
        syntax: "ping [选项] 目标",
        desc: "测试网络连通性",
        examples: ["ping google.com", "ping -c 4 192.168.1.1"],
        returns: "ICMP 响应",
      },
      {
        cmd: "curl",
        syntax: "curl [选项] [URL...]",
        desc: "传输 URL 数据",
        examples: [
          "curl -v https://api.example.com",
          'curl -X POST -d \'{"key":"value"}\' url',
          "curl -O https://example.com/file.zip",
        ],
        returns: "响应内容",
      },
      {
        cmd: "wget",
        syntax: "wget [选项] [URL...]",
        desc: "非交互式下载",
        examples: [
          "wget https://example.com/file.zip",
          "wget -c url",
          "wget -r -np url",
        ],
        returns: "下载文件",
      },
      {
        cmd: "netstat",
        syntax: "netstat [选项]",
        desc: "显示网络连接、路由表、接口统计",
        examples: ["netstat -tlnp", "netstat -an | grep ESTABLISHED"],
        returns: "网络信息",
      },
      {
        cmd: "ss",
        syntax: "ss [选项] [过滤器]",
        desc: "显示套接字统计（新版 netstat）",
        examples: ["ss -tlnp", "ss -s", "ss state established"],
        returns: "套接字信息",
      },
      {
        cmd: "ifconfig",
        syntax: "ifconfig [接口]",
        desc: "配置网络接口",
        examples: ["ifconfig", "ifconfig eth0"],
        returns: "网络接口信息",
      },
      {
        cmd: "ip",
        syntax: "ip [选项] 对象 [命令]",
        desc: "显示/操作路由、设备、策略路由和隧道",
        examples: ["ip addr", "ip route", "ip link show"],
        returns: "网络信息",
      },
      {
        cmd: "ssh",
        syntax: "ssh [选项] [用户@]主机 [命令]",
        desc: "安全远程登录",
        examples: [
          "ssh user@host",
          "ssh -p 2222 user@host",
          "ssh user@host 'command'",
        ],
        returns: "远程 shell",
      },
      {
        cmd: "scp",
        syntax: "scp [选项] 源 目标",
        desc: "安全远程复制",
        examples: [
          "scp file user@host:/path",
          "scp user@host:/file local",
          "scp -r dir user@host:/path",
        ],
        returns: "传输进度",
      },
      {
        cmd: "traceroute",
        syntax: "traceroute [选项] 主机",
        desc: "追踪数据包路由路径",
        examples: ["traceroute google.com", "traceroute -n 192.168.1.1"],
        returns: "路由路径",
      },
      {
        cmd: "dig",
        syntax: "dig [选项] [名称] [类型]",
        desc: "DNS 查询工具",
        examples: [
          "dig +short example.com",
          "dig example.com MX",
          "dig @8.8.8.8 example.com",
        ],
        returns: "DNS 记录",
      },
      {
        cmd: "nslookup",
        syntax: "nslookup [选项] [名称] [服务器]",
        desc: "查询 DNS 域名",
        examples: ["nslookup example.com", "nslookup example.com 8.8.8.8"],
        returns: "DNS 记录",
      },
      {
        cmd: "rsync",
        syntax: "rsync [选项] 源... 目标",
        desc: "远程文件同步",
        examples: [
          "rsync -avz src/ user@host:/dst/",
          "rsync -avz --delete src/ dst/",
          "rsync -avz -e ssh src/ user@host:/dst/",
        ],
        returns: "同步详情",
      },
    ],
  },
  {
    cat: "压缩与打包",
    items: [
      {
        cmd: "tar",
        syntax: "tar [选项] [文件...]",
        desc: "打包/解包文件",
        examples: [
          "tar -czf archive.tar.gz dir/",
          "tar -xzf archive.tar.gz",
          "tar -xjf archive.tar.bz2",
        ],
        returns: "无输出（创建/解包）",
      },
      {
        cmd: "zip",
        syntax: "zip [选项] 压缩文件 [文件...]",
        desc: "创建 zip 压缩文件",
        examples: ["zip -r archive.zip dir/", "zip archive.zip file1 file2"],
        returns: "压缩详情",
      },
      {
        cmd: "unzip",
        syntax: "unzip [选项] 压缩文件",
        desc: "解压 zip 文件",
        examples: [
          "unzip archive.zip",
          "unzip archive.zip -d /tmp",
          "unzip -l archive.zip",
        ],
        returns: "解压详情",
      },
    ],
  },
  {
    cat: "Java 相关",
    items: [
      {
        cmd: "java",
        syntax: "java [选项] 类 [参数...]",
        desc: "运行 Java 应用程序",
        examples: [
          "java -jar app.jar",
          "java -Xms512m -Xmx2g -jar app.jar",
          "java -cp .:lib/* MainClass",
        ],
        returns: "应用输出",
      },
      {
        cmd: "jps",
        syntax: "jps [选项]",
        desc: "列出 Java 进程",
        examples: ["jps", "jps -lv"],
        returns: "Java 进程列表",
      },
      {
        cmd: "jstack",
        syntax: "jstack [选项] PID",
        desc: "打印 Java 线程堆栈",
        examples: ["jstack 1234", "jstack -l 1234"],
        returns: "线程堆栈信息",
      },
      {
        cmd: "jstat",
        syntax: "jstat [选项] PID [间隔] [次数]",
        desc: "JVM 统计监控",
        examples: ["jstat -gc 1234", "jstat -gcutil 1234 1000 5"],
        returns: "GC 统计信息",
      },
      {
        cmd: "jmap",
        syntax: "jmap [选项] PID",
        desc: "打印 Java 内存映射",
        examples: [
          "jmap -heap 1234",
          "jmap -dump:format=b,file=heap.hprof 1234",
        ],
        returns: "堆内存信息",
      },
      {
        cmd: "jcmd",
        syntax: "jcmd PID [选项]",
        desc: "发送诊断命令到 JVM",
        examples: [
          "jcmd 1234 help",
          "jcmd 1234 GC.heap_info",
          "jcmd 1234 VM.flags",
        ],
        returns: "诊断结果",
      },
      {
        cmd: "jinfo",
        syntax: "jinfo [选项] PID",
        desc: "打印 Java 配置信息",
        examples: ["jinfo 1234", "jinfo -flags 1234"],
        returns: "JVM 配置",
      },
    ],
  },
  {
    cat: "systemd 服务管理",
    items: [
      {
        cmd: "systemctl start",
        syntax: "systemctl start 服务名",
        desc: "启动服务",
        examples: ["systemctl start nginx", "systemctl start docker"],
        returns: "无输出（成功）",
      },
      {
        cmd: "systemctl stop",
        syntax: "systemctl stop 服务名",
        desc: "停止服务",
        examples: ["systemctl stop nginx", "systemctl stop docker"],
        returns: "无输出（成功）",
      },
      {
        cmd: "systemctl restart",
        syntax: "systemctl restart 服务名",
        desc: "重启服务",
        examples: ["systemctl restart nginx", "systemctl restart docker"],
        returns: "无输出（成功）",
      },
      {
        cmd: "systemctl status",
        syntax: "systemctl status 服务名",
        desc: "查看服务状态",
        examples: ["systemctl status nginx", "systemctl status sshd"],
        returns: "服务状态信息",
      },
      {
        cmd: "systemctl enable",
        syntax: "systemctl enable 服务名",
        desc: "设置服务开机自启",
        examples: ["systemctl enable nginx", "systemctl enable docker"],
        returns: "创建符号链接",
      },
      {
        cmd: "systemctl disable",
        syntax: "systemctl disable 服务名",
        desc: "取消服务开机自启",
        examples: ["systemctl disable nginx", "systemctl disable docker"],
        returns: "删除符号链接",
      },
      {
        cmd: "systemctl list-units",
        syntax: "systemctl list-units [选项]",
        desc: "列出系统单元",
        examples: [
          "systemctl list-units --type=service",
          "systemctl list-units --state=running",
        ],
        returns: "单元列表",
      },
      {
        cmd: "systemctl daemon-reload",
        syntax: "systemctl daemon-reload",
        desc: "重新加载 systemd 配置",
        examples: ["systemctl daemon-reload"],
        returns: "无输出",
      },
      {
        cmd: "journalctl",
        syntax: "journalctl [选项]",
        desc: "查看系统日志",
        examples: [
          "journalctl -u nginx -f",
          'journalctl --since "1 hour ago"',
          "journalctl -u docker --no-pager",
        ],
        returns: "日志内容",
      },
    ],
  },
  {
    cat: "文本处理",
    items: [
      {
        cmd: "sed",
        syntax: "sed [选项] '脚本' [文件...]",
        desc: "流编辑器",
        examples: [
          "sed -i 's/old/new/g' file",
          "sed -n '10,20p' file",
          "sed '/pattern/d' file",
        ],
        returns: "处理后的文本",
      },
      {
        cmd: "awk",
        syntax: "awk [选项] '程序' [文件...]",
        desc: "文本处理语言",
        examples: [
          "awk -F: '{print $1}' /etc/passwd",
          "awk '$3 > 100' file",
          "awk '{sum += $1} END {print sum}' file",
        ],
        returns: "处理后的文本",
      },
      {
        cmd: "sort",
        syntax: "sort [选项] [文件...]",
        desc: "排序文本行",
        examples: ["sort file.txt", "sort -k3 -n -r file", "sort -u file"],
        returns: "排序后的文本",
      },
      {
        cmd: "uniq",
        syntax: "uniq [选项] [输入 [输出]]",
        desc: "报告或忽略重复行",
        examples: ["sort file | uniq -c", "sort file | uniq -d"],
        returns: "去重后的文本",
      },
      {
        cmd: "cut",
        syntax: "cut [选项] [文件...]",
        desc: "删除文件每行指定部分",
        examples: ["cut -d, -f1,3 file.csv", "cut -c1-10 file"],
        returns: "提取的文本",
      },
      {
        cmd: "xargs",
        syntax: "xargs [选项] [命令 [初始参数]]",
        desc: "从标准输入构建并执行命令",
        examples: [
          "find . -name '*.log' | xargs rm",
          "ls | xargs -I {} mv {} {}.bak",
        ],
        returns: "命令输出",
      },
      {
        cmd: "tr",
        syntax: "tr [选项] 集合1 [集合2]",
        desc: "替换或删除字符",
        examples: ["tr 'a-z' 'A-Z' < file", "echo $PATH | tr ':' '\\n'"],
        returns: "转换后的文本",
      },
    ],
  },
  {
    cat: "文件查找与系统信息",
    items: [
      {
        cmd: "which",
        syntax: "which [选项] 程序...",
        desc: "显示命令的完整路径",
        examples: ["which python", "which java", "which -a python"],
        returns: "命令路径",
      },
      {
        cmd: "whereis",
        syntax: "whereis [选项] 名称...",
        desc: "查找二进制、源码和手册页",
        examples: ["whereis nginx", "whereis python"],
        returns: "文件路径",
      },
      {
        cmd: "stat",
        syntax: "stat [选项] 文件...",
        desc: "显示文件详细状态信息",
        examples: ["stat file.txt", "stat -c '%s %y' file"],
        returns: "文件属性",
      },
      {
        cmd: "file",
        syntax: "file [选项] 文件...",
        desc: "确定文件类型",
        examples: ["file document.pdf", "file -b image.jpg"],
        returns: "文件类型描述",
      },
      {
        cmd: "ln",
        syntax: "ln [选项] 源文件 [目标]",
        desc: "创建链接",
        examples: [
          "ln -s /opt/app /usr/local/bin/app",
          "ln -sf new_target link_name",
        ],
        returns: "无输出",
      },
      {
        cmd: "uptime",
        syntax: "uptime [选项]",
        desc: "显示系统运行时间和负载",
        examples: ["uptime"],
        returns: "系统运行信息",
      },
      {
        cmd: "date",
        syntax: "date [选项] [+格式]",
        desc: "显示或设置系统日期和时间",
        examples: ['date "+%Y-%m-%d %H:%M:%S"', "date -d '2 days ago'"],
        returns: "日期时间",
      },
      {
        cmd: "hostname",
        syntax: "hostname [选项]",
        desc: "显示或设置主机名",
        examples: ["hostname", "hostname -I", "hostname -f"],
        returns: "主机名/IP",
      },
    ],
  },
  {
    cat: "包管理与定时任务",
    items: [
      {
        cmd: "apt update",
        syntax: "apt update",
        desc: "更新包列表（Debian/Ubuntu）",
        examples: ["apt update", "sudo apt update"],
        returns: "更新详情",
      },
      {
        cmd: "apt upgrade",
        syntax: "apt upgrade [-y]",
        desc: "升级所有包（Debian/Ubuntu）",
        examples: ["apt upgrade -y", "sudo apt upgrade"],
        returns: "升级详情",
      },
      {
        cmd: "apt install",
        syntax: "apt install [-y] 包名...",
        desc: "安装软件包（Debian/Ubuntu）",
        examples: ["apt install -y nginx", "apt install vim git"],
        returns: "安装详情",
      },
      {
        cmd: "apt remove",
        syntax: "apt remove 包名...",
        desc: "卸载软件包（Debian/Ubuntu）",
        examples: ["apt remove nginx", "apt remove --purge nginx"],
        returns: "卸载详情",
      },
      {
        cmd: "yum install",
        syntax: "yum install [-y] 包名...",
        desc: "安装软件包（CentOS/RHEL 7）",
        examples: ["yum install -y nginx", "yum install vim git"],
        returns: "安装详情",
      },
      {
        cmd: "dnf install",
        syntax: "dnf install [-y] 包名...",
        desc: "安装软件包（CentOS/RHEL 8+）",
        examples: ["dnf install -y nginx", "dnf install vim git"],
        returns: "安装详情",
      },
      {
        cmd: "apk add",
        syntax: "apk add [--no-cache] 包名...",
        desc: "安装软件包（Alpine）",
        examples: ["apk add --no-cache nginx", "apk add vim git"],
        returns: "安装详情",
      },
      {
        cmd: "crontab",
        syntax: "crontab [选项]",
        desc: "管理定时任务",
        examples: ["crontab -e", "crontab -l", "crontab -r"],
        returns: "任务列表/编辑",
      },
      {
        cmd: "cron 格式",
        syntax: "* * * * * 命令",
        desc: "cron 表达式：分 时 日 月 周",
        examples: [
          "* * * * * /path/script.sh",
          "0 2 * * * /backup.sh",
          "*/5 * * * * /check.sh",
        ],
        returns: "定时执行",
      },
    ],
  },
];

let _linuxSearchTimer = null;

function linuxRender(filter) {
  if (filter === undefined) {
    const el = document.getElementById("linuxSearch");
    filter = el ? el.value : "";
  }
  filter = (filter || "").toLowerCase();
  const container = document.getElementById("linuxContent");
  if (!container) return;
  container.innerHTML = "";
  let hasResult = false;
  LINUX_CMDS.forEach((group) => {
    const matched = filter
      ? group.items.filter(
          (it) =>
            it.cmd.toLowerCase().includes(filter) ||
            it.desc.toLowerCase().includes(filter) ||
            (it.syntax && it.syntax.toLowerCase().includes(filter)) ||
            (it.examples &&
              it.examples.some((ex) => ex.toLowerCase().includes(filter))),
        )
      : group.items;
    if (matched.length === 0) return;
    hasResult = true;
    const section = document.createElement("div");
    section.className = "ref-group";
    section.innerHTML = `<div class="ref-group-title">${group.cat}</div>`;
    matched.forEach((item) => {
      const card = document.createElement("div");
      card.className = "ref-card";
      card.innerHTML = linuxBuildCard(item);
      section.appendChild(card);
    });
    container.appendChild(section);
  });
  if (!hasResult) {
    container.innerHTML =
      '<div style="color:var(--text-muted);padding:20px;text-align:center">无匹配结果</div>';
  }
}

function linuxBuildCard(item) {
  let html = `<div class="ref-cmd-head"><code class="ref-cmd-name">${item.cmd.replace(/</g, "&lt;")}</code><span class="ref-cmd-desc">${item.desc.replace(/</g, "&lt;")}</span><button class="sm outline" onclick="safeCopy('${item.cmd.replace(/'/g, "\\'")}')">复制</button></div>`;

  if (item.syntax) {
    html += `<div class="ref-syntax">${item.syntax.replace(/</g, "&lt;")}</div>`;
  }

  if (item.examples && item.examples.length) {
    html += '<div class="ref-examples">';
    item.examples.forEach((ex) => {
      html += `<div class="ref-example" onclick="safeCopy('${ex.replace(/'/g, "\\'")}')">${ex.replace(/</g, "&lt;")}</div>`;
    });
    html += "</div>";
  }

  if (item.returns) {
    html += `<div class="ref-returns">返回: ${item.returns.replace(/</g, "&lt;")}</div>`;
  }

  return html;
}

function linuxSearch() {
  clearTimeout(_linuxSearchTimer);
  _linuxSearchTimer = setTimeout(function () {
    const el = document.getElementById("linuxSearch");
    linuxRender(el ? el.value : "");
  }, 200);
}

registerInit("linux", linuxRender);
