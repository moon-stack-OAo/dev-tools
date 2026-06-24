// === GitHub Link (动态注入，生产模式才有) ===
// 仅当 Vite 注入的 window.__DEVTOOLS__.withGithub === true 时，才创建 GitHub 链接。
// dev 模式下该值为 undefined，自然跳过——同时配合 removeGithubPlugin 在构建时清理硬编码链接。
(function injectGithubLink() {
    if (typeof window === 'undefined') return;
    const flag = window.__DEVTOOLS__;
    if (!flag || flag.withGithub !== true) return;
    const header = document.querySelector('.main-header');
    if (!header) return;
    const gh = document.createElement('a');
    gh.id = 'headerGithub';
    gh.className = 'header-github';
    gh.href = 'https://github.com/moon-stack-OAo/dev-tools';
    gh.rel = 'noopener noreferrer';
    gh.target = '_blank';
    gh.title = '查看 GitHub 仓库';
    gh.innerHTML = '<i class="bi bi-github"></i><span>GitHub</span>';
    header.appendChild(gh);
})();

// === Tools Data ===
const categories = [
    {id: 'format', name: '格式化', icon: 'bi-file-earmark-code'},
    {id: 'encode', name: '编解码', icon: 'bi-arrow-left-right'},
    {id: 'security', name: '安全', icon: 'bi-shield-lock'},
    {id: 'generate', name: '生成与转换', icon: 'bi-magic'},
    {id: 'text', name: '文本', icon: 'bi-fonts'},
    {id: 'debug', name: '调试', icon: 'bi-bug'},
    {id: 'reference', name: '参考', icon: 'bi-book'},
];
const tools = [
    {id: 'json', icon: 'bi-braces', name: 'JSON 格式化', desc: '格式化 / 压缩 / 验证 JSON', cat: 'format'},
    {id: 'xml', icon: 'bi-code', name: 'XML 格式化', desc: '格式化 / 压缩 / 验证 XML', cat: 'format'},
    {id: 'yaml', icon: 'bi-filetype-yml', name: 'YAML 格式化', desc: 'YAML 格式化 / JSON 互转', cat: 'format'},
    {
        id: 'propertiesfmt',
        icon: 'bi-file-earmark-text',
        name: 'Properties 格式化',
        desc: 'Properties ↔ YAML 互转',
        cat: 'format'
    },
    {id: 'sql', icon: 'bi-database', name: 'SQL 格式化', desc: 'SQL 美化 / 多方言支持', cat: 'format'},
    {
        id: 'jsonconvert',
        icon: 'bi-arrow-left-right',
        name: 'JSON/XML/YAML 互转',
        desc: 'JSON / XML / YAML 格式互相转换',
        cat: 'format'
    },
    {id: 'jsonpath', icon: 'bi-search', name: 'JSONPath 查询', desc: 'JSONPath 表达式查询 / 提取', cat: 'format'},
    {id: 'jsonschema', icon: 'bi-diagram-3', name: 'JSON Schema', desc: 'JSON Schema 生成 / 校验', cat: 'format'},
    {
        id: 'sqldialect',
        icon: 'bi-translate',
        name: 'SQL 方言转换',
        desc: 'MySQL/Oracle/PG/SQLServer 互转',
        cat: 'format'
    },
    {id: 'dbtype', icon: 'bi-table', name: '数据库类型映射', desc: 'MySQL/Oracle/PG/SQLServer 类型对照', cat: 'format'},
    {id: 'base64', icon: 'bi-lock', name: 'Base64', desc: 'Base64 编码解码 / 文件支持', cat: 'encode'},
    {id: 'url', icon: 'bi-link-45deg', name: 'URL 编码', desc: 'URL 编解码 / Component 模式', cat: 'encode'},
    {id: 'unicode', icon: 'bi-translate', name: 'Unicode', desc: '\\uXXXX 编码 / 解码', cat: 'encode'},
    {id: 'javaescape', icon: 'bi-slash-lg', name: 'Java 转义', desc: 'Java 字符串转义 / 反转义', cat: 'encode'},
    {id: 'charset', icon: 'bi-fonts', name: '编码转换', desc: '字符编码互转 / 检测', cat: 'encode'},
    {id: 'htmlescape', icon: 'bi-filetype-html', name: 'HTML 转义', desc: 'HTML 实体编码 / 解码', cat: 'encode'},
    {id: 'imgbase64', icon: 'bi-image', name: '图片 Base64', desc: '图片与 Base64 互转 / DataURL', cat: 'encode'},
    {id: 'hex', icon: 'bi-123', name: 'Hex 编码', desc: '字符串 ↔ Hex 互转（UTF-8）', cat: 'encode'},
    {id: 'jwt', icon: 'bi-key', name: 'JWT 解码', desc: '解析 JWT Header / Payload', cat: 'security'},
    {id: 'jwtgen', icon: 'bi-pen', name: 'JWT 生成', desc: 'HS256/384/512 + RS256/384/512 签名', cat: 'security'},
    {id: 'hash', icon: 'bi-hash', name: 'Hash 计算', desc: 'MD5 / SHA-1 / SHA-256 / SHA-512', cat: 'security'},
    {
        id: 'hmac', icon: 'bi-shield-lock', name: 'HMAC 计算',
        desc: 'HMAC-MD5 / SHA-1 / SHA-256 / SHA-384 / SHA-512', cat: 'security'
    },
    {id: 'hashext', icon: 'bi-hash', name: 'Hash 扩展', desc: 'CRC32 / Adler32 / SHA-3 / SM3', cat: 'security'},
    {id: 'random', icon: 'bi-dice-6', name: '随机生成器', desc: '密码 / Token / PIN 生成', cat: 'security'},
    {id: 'aes', icon: 'bi-shield-check', name: 'AES 加解密', desc: 'AES 对称加密 / 解密', cat: 'security'},
    {id: 'rsa', icon: 'bi-shield-exclamation', name: 'RSA 工具', desc: '密钥生成 / 加解密 / 签名', cat: 'security'},
    {id: 'bcrypt', icon: 'bi-asterisk', name: 'bcrypt 加密', desc: 'bcrypt 哈希 / 验证', cat: 'security'},
    {id: 'totp', icon: 'bi-stopwatch', name: 'TOTP 动态令牌', desc: 'TOTP/HOTP 本地生成 + URI 解析', cat: 'security'},
    {id: 'gmsm', icon: 'bi-flag', name: '国密 SM2/3/4', desc: '国密 SM2 公钥 / SM3 摘要 / SM4 对称', cat: 'security'},
    {
        id: 'pbkdf2',
        icon: 'bi-shield-shaded',
        name: 'PBKDF2 哈希',
        desc: 'PBKDF2-HMAC-SHA256/512 密码哈希（标准 PHC 格式）',
        cat: 'security'
    },
    {
        id: 'certparser',
        icon: 'bi-patch-check',
        name: 'X.509 证书',
        desc: 'X.509 证书 PEM/DER 解析',
        cat: 'security'
    },
    {id: 'uuid', icon: 'bi-fingerprint', name: 'UUID 生成', desc: 'UUID v4 / v7 / 批量生成', cat: 'generate'},
    {id: 'snowflake', icon: 'bi-snow', name: '雪花 ID', desc: 'Snowflake / Leaf / UID 三合一生成解析', cat: 'generate'},
    {id: 'ts', icon: 'bi-clock', name: '时间戳转换', desc: 'Unix 毫秒/秒 ↔ 日期', cat: 'generate'},
    {id: 'color', icon: 'bi-palette', name: '颜色转换', desc: 'HEX / RGB / HSL 互转预览', cat: 'generate'},
    {id: 'baseconvert', icon: 'bi-calculator', name: '进制转换', desc: '2~36 进制互转', cat: 'generate'},
    {id: 'case', icon: 'bi-type', name: 'Case 转换', desc: 'camelCase / snake_case 等', cat: 'generate'},
    {id: 'jsontopojo', icon: 'bi-arrow-repeat', name: 'JSON → Java', desc: 'JSON 生成 Java POJO 类', cat: 'generate'},
    {id: 'sqltopojo', icon: 'bi-arrow-repeat', name: 'SQL → Java', desc: 'DDL 生成 MyBatis Plus 实体', cat: 'generate'},
    {
        id: 'sql2mybatis',
        icon: 'bi-diagram-3',
        name: 'SQL → MyBatis',
        desc: 'DDL 生成 Mapper XML + Interface',
        cat: 'generate'
    },
    {id: 'datamock', icon: 'bi-people', name: '数据 Mock', desc: '生成姓名 / 手机号 / 邮箱等', cat: 'generate'},
    {id: 'datecalc', icon: 'bi-calendar', name: '日期计算器', desc: '日期加减 / 间隔 / 工作日', cat: 'generate'},
    {id: 'email', icon: 'bi-envelope', name: '邮件模板', desc: '邮件 HTML 模板生成 / 预览 / 内联 CSS', cat: 'generate'},
    {id: 'qrdecode', icon: 'bi-qr-code-scan', name: '二维码解析', desc: '图片 → URL / 文本 / WiFi', cat: 'generate'},
    {id: 'diff', icon: 'bi-file-earmark-diff', name: '文本对比', desc: '文本差异对比高亮', cat: 'text'},
    {id: 'regex', icon: 'bi-asterisk', name: '正则表达式', desc: '正则匹配测试 / 分组查看', cat: 'text'},
    {id: 'stats', icon: 'bi-bar-chart', name: '文本统计', desc: '字符 / 单词 / 行数 / 字节', cat: 'text'},
    {id: 'csv', icon: 'bi-table', name: 'CSV 格式化', desc: 'CSV 表格化查看 / 校对', cat: 'text'},
    {id: 'regexref', icon: 'bi-book', name: '正则速查表', desc: '常用正则表达式分类速查', cat: 'text'},
    {id: 'markdown', icon: 'bi-markdown', name: 'Markdown 预览', desc: 'Markdown 实时预览 / 导出 HTML', cat: 'text'},
    {id: 'webfmt', icon: 'bi-filetype-html', name: 'Web 格式化', desc: 'HTML / CSS / JS 格式化压缩', cat: 'text'},
    {id: 'qrcode', icon: 'bi-qr-code', name: '二维码生成', desc: '文本 / URL 生成二维码下载', cat: 'text'},
    {id: 'tplreplace', icon: 'bi-braces-asterisk', name: '模板替换', desc: '多种语法字符串变量替换', cat: 'text'},
    {id: 'cron', icon: 'bi-clock-history', name: 'Cron 表达式', desc: 'Cron 解析 / 下次执行时间', cat: 'debug'},
    {id: 'ws', icon: 'bi-plug', name: 'WebSocket', desc: 'WebSocket 连接调试', cat: 'debug'},
    {id: 'stomp', icon: 'bi-hdd-network', name: 'STOMP', desc: 'STOMP over WebSocket 调试', cat: 'debug'},
    {id: 'api', icon: 'bi-cloud-arrow-down', name: 'API 调用', desc: 'HTTP 请求 / 响应调试', cat: 'debug'},
    {id: 'ip', icon: 'bi-globe2', name: 'IP 工具', desc: 'IP 归属 / 子网计算', cat: 'debug'},
    {id: 'arthas', icon: 'bi-terminal', name: 'Arthas 命令', desc: 'Arthas 诊断命令速查', cat: 'reference'},
    {id: 'jmh', icon: 'bi-speedometer2', name: 'JMH 模板', desc: 'JMH 基准测试代码生成', cat: 'reference'},
    {id: 'testgen', icon: 'bi-check2-square', name: '测试模板', desc: 'JUnit 5 + Mockito 测试生成', cat: 'reference'},
    {id: 'linux', icon: 'bi-terminal-fill', name: 'Linux 命令', desc: '常用 Linux 命令速查', cat: 'reference'},
    {id: 'jvmargs', icon: 'bi-cpu', name: 'JVM 参数', desc: 'JVM 启动参数速查', cat: 'reference'},
    {id: 'redisref', icon: 'bi-database-fill-gear', name: 'Redis 命令', desc: 'Redis 常用命令速查', cat: 'reference'},
    {
        id: 'springcloud',
        icon: 'bi-cloud-fog2',
        name: 'Spring Cloud',
        desc: 'Spring Cloud Alibaba 组件速查',
        cat: 'reference'
    },
    {id: 'docker', icon: 'bi-box-seam', name: 'Docker 命令', desc: 'Docker / K8s 命令速查', cat: 'reference'},
    {id: 'gitref', icon: 'bi-git', name: 'Git 命令', desc: 'Git 常用操作速查', cat: 'reference'},
    {id: 'httpstatus', icon: 'bi-info-circle', name: 'HTTP 状态码', desc: 'HTTP 状态码 / 方法速查', cat: 'reference'},
    {id: 'ascii', icon: 'bi-keyboard', name: 'ASCII 表', desc: 'ASCII / 控制字符速查', cat: 'reference'},
    {id: 'curl', icon: 'bi-terminal', name: 'Curl 生成', desc: '生成 / 解析 curl 命令', cat: 'debug'},
    {
        id: 'grpc',
        icon: 'bi-hdd-network',
        name: 'gRPC 调试',
        desc: 'Metadata 构造 / Protobuf 解码 / 状态码',
        cat: 'debug'
    },
    {id: 'urlparser', icon: 'bi-link-45deg', name: 'URL 解析', desc: 'URL 拆解 / 编码解码', cat: 'debug'},
    {id: 'uaparser', icon: 'bi-browser-chrome', name: 'UA 解析', desc: 'User-Agent 解析', cat: 'debug'},
    {id: 'timezone', icon: 'bi-globe', name: '时区转换', desc: '跨时区时间换算', cat: 'generate'},
    {
        id: 'mybatisplus',
        icon: 'bi-database-gear',
        name: 'MyBatis Plus',
        desc: 'MyBatis Plus 常用方法速查',
        cat: 'reference'
    },
    {
        id: 'mybatissql',
        icon: 'bi-filetype-xml',
        name: 'MyBatis XML',
        desc: 'MyBatis 动态 SQL 标签速查',
        cat: 'reference'
    },
    {id: 'lombok', icon: 'bi-magic', name: 'Lombok 注解', desc: 'Lombok 常用注解速查', cat: 'reference'},
    {id: 'springboot', icon: 'bi-stars', name: 'Spring Boot 注解', desc: 'Spring Boot 常用注解速查', cat: 'reference'},
    {
        id: 'txpropagation',
        icon: 'bi-diagram-3',
        name: '事务传播',
        desc: 'Spring 事务传播行为速查',
        cat: 'reference'
    },
    {id: 'mavenref', icon: 'bi-box', name: 'Maven 命令', desc: 'Maven 常用命令速查', cat: 'reference'},
    {id: 'jdkfeatures', icon: 'bi-cup-hot', name: 'JDK 新特性', desc: 'JDK 8/11/17/21 新特性速查', cat: 'reference'},
    {
        id: 'httpheader',
        icon: 'bi-list-columns-reverse',
        name: 'HTTP Header',
        desc: 'HTTP 通用 / 请求 / 响应头速查',
        cat: 'reference'
    },
    {id: 'mqref', icon: 'bi-broadcast', name: '消息中间件', desc: 'Kafka / RabbitMQ / RocketMQ 速查', cat: 'reference'},
    {id: 'mimetype', icon: 'bi-file-earmark', name: 'MIME 类型', desc: '文件扩展名 / MIME 类型对照', cat: 'reference'},
    {id: 'portref', icon: 'bi-plug', name: '端口号速查', desc: '常用网络服务端口号对照', cat: 'reference'},
    {
        id: 'resratio',
        icon: 'bi-aspect-ratio',
        name: '分辨率计算',
        desc: '最简比例 / 总像素 / 标准比例匹配 / 反算',
        cat: 'generate'
    },
];

// === Navigation ===
let panels = [];
const homeBtn = document.getElementById('homeBtn');
const breadcrumb = document.getElementById('breadcrumb');

function loadPanels() {
    const container = document.getElementById('panels-container');
    const loading = document.getElementById('panels-loading');
    return Promise.all(tools.map(tool =>
        fetch(`html/panels/${tool.cat}/${tool.id}.html`, {cache: 'no-cache'})
            .then(r => r.ok ? r.text() : '')
            .catch(() => '')
    )).then(htmls => {
        const existingHome = container.innerHTML;
        container.innerHTML = existingHome + '\n' + htmls.join('\n');
        panels = document.querySelectorAll('.tool-panel');
        if (loading) loading.style.display = 'none';
        container.style.display = '';
    });
}

function buildHomeGrid() {
    const grid = document.getElementById('homeGrid');
    grid.innerHTML = '';
    const anchors = document.getElementById('homeCatAnchors');
    anchors.innerHTML = '';
    categories.forEach(cat => {
        const toolsInCat = tools.filter(t => t.cat === cat.id);
        if (!toolsInCat.length) return;
        const divider = document.createElement('div');
        divider.className = 'home-cat-divider';
        divider.id = 'cat-' + cat.id;
        divider.innerHTML = `<span class="hcd-icon"><i class="bi ${cat.icon}"></i></span><span>${cat.name}</span>`;
        grid.appendChild(divider);
        toolsInCat.forEach(t => {
            const card = document.createElement('div');
            card.className = 'home-card';
            card.innerHTML = `<div class="hc-icon"><i class="bi ${t.icon}"></i></div><div class="hc-name">${t.name}</div><div class="hc-desc">${t.desc}</div>`;
            card.addEventListener('click', () => openTool(t.id));
            grid.appendChild(card);
        });
        const anchor = document.createElement('a');
        anchor.className = 'cat-anchor';
        anchor.href = '#cat-' + cat.id;
        anchor.innerHTML = '<span class="cat-icon"><i class="bi ' + cat.icon + '"></i></span>' + cat.name;
        anchors.appendChild(anchor);
    });

    // 滚动高亮当前分类
    const homePanel = document.getElementById('panel-home');
    homePanel.addEventListener('scroll', highlightAnchor);
}

function highlightAnchor() {
    const homePanel = document.getElementById('panel-home');
    const dividers = document.querySelectorAll('.home-cat-divider');
    const anchors = document.querySelectorAll('.cat-anchor');
    const scrollTop = homePanel.scrollTop;
    let activeIdx = 0;
    for (let i = dividers.length - 1; i >= 0; i--) {
        if (dividers[i].offsetTop <= scrollTop + 60) {
            activeIdx = i;
            break;
        }
    }
    anchors.forEach((a, i) => a.classList.toggle('active', i === activeIdx));
}

function openTool(id) {
    panels.forEach(p => p.classList.remove('active'));
    document.getElementById('panel-home').classList.remove('active');
    document.getElementById('panel-' + id).classList.add('active');
    const tool = tools.find(t => t.id === id);
    const homeTitle = document.getElementById('headerHomeTitle');
    if (homeTitle) homeTitle.style.display = 'none';
    const gh = document.getElementById('headerGithub');
    if (gh) gh.style.display = 'none';
    homeBtn.style.display = 'flex';
    const cat = categories.find(c => c.id === tool.cat);
    document.querySelector('.main-header').classList.add('tool-mode');
    breadcrumb.innerHTML = '<span class="bc-item" onclick="goHome()">首页</span><span class="bc-sep">›</span><span class="bc-item" onclick="goHome(\'' + (cat ? cat.id : '') + '\')">' + (cat ? cat.name : '') + '</span><span class="bc-sep">›</span><span class="bc-current">' + tool.name + '</span>';
    setStatus('就绪');
}

function goHome(catId) {
    panels.forEach(p => p.classList.remove('active'));
    document.getElementById('panel-home').classList.add('active');
    const homeTitle = document.getElementById('headerHomeTitle');
    if (homeTitle) homeTitle.style.display = '';
    const gh = document.getElementById('headerGithub');
    if (gh) gh.style.display = '';
    homeBtn.style.display = 'none';
    document.querySelector('.main-header').classList.remove('tool-mode');
    breadcrumb.innerHTML = '';
    clearHomeSearch();
    setTimeout(() => {
        highlightAnchor();
        if (catId) {
            const el = document.getElementById('cat-' + catId);
            if (el) el.scrollIntoView({behavior: 'smooth', block: 'start'});
        }
    }, 50);
    setStatus('就绪');
}

function filterHomeTools() {
    const q = document.getElementById('homeSearch').value.toLowerCase().trim();

    // 如果当前不在首页，自动切回首页再搜索
    const homePanel = document.getElementById('panel-home');
    if (!homePanel.classList.contains('active')) {
        panels.forEach(p => p.classList.remove('active'));
        homePanel.classList.add('active');
        const homeTitle = document.getElementById('headerHomeTitle');
        if (homeTitle) homeTitle.style.display = '';
        const gh = document.getElementById('headerGithub');
        if (gh) gh.style.display = '';
        homeBtn.style.display = 'none';
        document.querySelector('.main-header').classList.remove('tool-mode');
        breadcrumb.innerHTML = '';
        setStatus('就绪');
        setTimeout(highlightAnchor, 50);
    }

    const cards = document.querySelectorAll('.home-card');
    const dividers = document.querySelectorAll('.home-cat-divider');
    let hasVisible = false;
    cards.forEach(card => {
        const name = card.querySelector('.hc-name').textContent.toLowerCase();
        const desc = card.querySelector('.hc-desc').textContent.toLowerCase();
        const match = !q || name.includes(q) || desc.includes(q);
        card.style.display = match ? '' : 'none';
        if (match) hasVisible = true;
    });
    dividers.forEach(d => {
        const cat = d.nextElementSibling;
        let visibleAfter = false;
        let el = cat;
        while (el && !el.classList.contains('home-cat-divider')) {
            if (el.style.display !== 'none') {
                visibleAfter = true;
                break;
            }
            el = el.nextElementSibling;
        }
        d.style.display = (!q || visibleAfter) ? '' : 'none';
    });
    const empty = document.querySelector('.home-search-empty');
    if (empty) empty.remove();
    if (q && !hasVisible) {
        const msg = document.createElement('div');
        msg.className = 'home-search-empty';
        msg.innerHTML = '<i class="bi bi-search"></i> 没有匹配的工具';
        document.getElementById('homeGrid').appendChild(msg);
    }
}

function clearHomeSearch() {
    document.getElementById('homeSearch').value = '';
    filterHomeTools();
}

// 打开工具时清空搜索 + 触发延迟渲染
const origOpen = openTool;
openTool = function (id) {
    clearHomeSearch();
    origOpen(id);
    const renderMap = {
        'regexref': 'regexRefRender',
        'linux': 'linuxRender',
        'docker': 'dockerRender',
        'gitref': 'gitRender',
        'httpstatus': 'httpStatusRender',
        'ascii': 'asciiRender',
        'arthas': 'arthasRender',
        'datecalc': 'dateCalcInit',
        'cron': 'cronBuildFields',
        'email': 'emailInit',
        'jwtgen': 'jwtGenInit',
        'dbtype': 'dbtypeInit',
        'curl': 'curlInit',
        'grpc': 'grpcInit',
        'timezone': 'tzInit',
        'tplreplace': 'tplInit',
        'imgbase64': 'imgbase64Init',
        'mybatisplus': 'mybatisplusRender',
        'mybatissql': 'mybatissqlRender',
        'lombok': 'lombokRender',
        'springboot': 'springbootRender',
        'txpropagation': 'txpropagationRender',
        'mavenref': 'mavenrefRender',
        'jdkfeatures': 'jdkfeaturesRender',
        'httpheader': 'httpheaderRender',
        'mqref': 'mqrefRender',
        'mimetype': 'mimetypeRender',
        'portref': 'portrefRender',
        'jvmargs': 'jvmargsRender',
        'redisref': 'redisrefRender',
        'springcloud': 'springcloudRender',
    };
    const fnName = renderMap[id];
    if (fnName && typeof window[fnName] === 'function') {
        window[fnName]();
    }
};

loadPanels().then(() => {
    buildHomeGrid();
    if (typeof cronInit === 'function') cronInit();
    if (typeof apiInit === 'function') apiInit();
    if (typeof tsInit === 'function') tsInit();
    if (typeof curlInit === 'function') curlInit();
    if (typeof grpcInit === 'function') grpcInit();
    if (typeof tzInit === 'function') tzInit();
    if (typeof tplInit === 'function') tplInit();
    if (typeof imgbase64Init === 'function') imgbase64Init();
    if (typeof renderJvmTemplates === 'function') renderJvmTemplates();
    if (typeof totpInit === 'function') totpInit();
    if (typeof qrdecodeInit === 'function') qrdecodeInit();
    if (typeof pbkdf2Init === 'function') pbkdf2Init();
    if (typeof certparserInit === 'function') certparserInit();
}).catch(err => {
    const loading = document.getElementById('panels-loading');
    if (loading) loading.textContent = '工具模块加载失败: ' + err.message;
    console.error('loadPanels failed', err);
});

// === Utils ===
function setStatus(msg) {
    document.getElementById('statusText').textContent = msg;
}

function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._hide);
    t._hide = setTimeout(() => t.classList.remove('show'), 2500);
}

function safeCopy(text, msg) {
    msg = msg || '已复制';
    const doFallback = () => {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            toast(msg);
        } catch (e) {
            toast('复制失败，请手动选择复制');
        }
        ta.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => toast(msg)).catch(doFallback);
    } else {
        doFallback();
    }
}

function copyText(id) {
    const el = typeof id === 'string' ? document.getElementById(id) : id;
    const text = el.textContent || el.innerText;
    if (!text) {
        toast('没有内容可复制');
        return;
    }
    safeCopy(text);
}

function safeJSON(s) {
    try {
        return JSON.parse(s);
    } catch (e) {
        return null;
    }
}

// Go home on initial load
goHome();
