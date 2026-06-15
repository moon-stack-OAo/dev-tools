// === Tools Data ===
const categories = [
    {id: 'format', name: '格式化', icon: '≡'},
    {id: 'encode', name: '编解码', icon: '⇄'},
    {id: 'security', name: '安全', icon: '🔒'},
    {id: 'generate', name: '生成与转换', icon: '⚙'},
    {id: 'text', name: '文本', icon: 'T'},
    {id: 'debug', name: '调试', icon: '▶'},
    {id: 'reference', name: '参考', icon: '📖'},
];
const tools = [
    {id: 'json', icon: '{}', name: 'JSON 格式化', desc: '格式化 / 压缩 / 验证 JSON', cat: 'format'},
    {id: 'xml', icon: '&lt;/&gt;', name: 'XML 格式化', desc: '格式化 / 压缩 / 验证 XML', cat: 'format'},
    {id: 'yaml', icon: 'Y', name: 'YAML 格式化', desc: 'YAML 格式化 / JSON 互转', cat: 'format'},
    {id: 'sql', icon: 'SQL', name: 'SQL 格式化', desc: 'SQL 美化 / 多方言支持', cat: 'format'},
    {id: 'base64', icon: 'B64', name: 'Base64', desc: 'Base64 编码解码 / 文件支持', cat: 'encode'},
    {id: 'url', icon: 'URL', name: 'URL 编码', desc: 'URL 编解码 / Component 模式', cat: 'encode'},
    {id: 'unicode', icon: 'U+', name: 'Unicode', desc: '\\uXXXX 编码 / 解码', cat: 'encode'},
    {id: 'javaescape', icon: '\\n', name: 'Java 转义', desc: 'Java 字符串转义 / 反转义', cat: 'encode'},
    {id: 'charset', icon: '文', name: '编码转换', desc: '字符编码互转 / 检测', cat: 'encode'},
    {id: 'htmlescape', icon: '&lt;&gt;', name: 'HTML 转义', desc: 'HTML 实体编码 / 解码', cat: 'encode'},
    {id: 'jwt', icon: 'JWT', name: 'JWT 解码', desc: '解析 JWT Header / Payload', cat: 'security'},
    {id: 'hash', icon: '#', name: 'Hash 计算', desc: 'MD5 / SHA-1 / SHA-256 / SHA-512', cat: 'security'},
    {id: 'random', icon: 'R', name: '随机生成器', desc: '密码 / Token / PIN 生成', cat: 'security'},
    {id: 'aes', icon: '🔑', name: 'AES 加解密', desc: 'AES 对称加密 / 解密', cat: 'security'},
    {id: 'rsa', icon: '🔐', name: 'RSA 工具', desc: '密钥生成 / 加解密 / 签名', cat: 'security'},
    {id: 'uuid', icon: 'U', name: 'UUID 生成', desc: 'UUID v4 / v7 / 批量生成', cat: 'generate'},
    {id: 'ts', icon: 'T', name: '时间戳转换', desc: 'Unix 毫秒/秒 ↔ 日期', cat: 'generate'},
    {id: 'color', icon: '■', name: '颜色转换', desc: 'HEX / RGB / HSL 互转预览', cat: 'generate'},
    {id: 'baseconvert', icon: '0x', name: '进制转换', desc: '2~36 进制互转', cat: 'generate'},
    {id: 'case', icon: 'Aa', name: 'Case 转换', desc: 'camelCase / snake_case 等', cat: 'generate'},
    {id: 'jsontopojo', icon: 'J→P', name: 'JSON → Java', desc: 'JSON 生成 Java POJO 类', cat: 'generate'},
    {id: 'sqltopojo', icon: 'S→P', name: 'SQL → Java', desc: 'DDL 生成 MyBatis Plus 实体', cat: 'generate'},
    {id: 'datamock', icon: '🎲', name: '数据 Mock', desc: '生成姓名 / 手机号 / 邮箱等', cat: 'generate'},
    {id: 'datecalc', icon: '📅', name: '日期计算器', desc: '日期加减 / 间隔 / 工作日', cat: 'generate'},
    {id: 'diff', icon: '!=', name: '文本对比', desc: '文本差异对比高亮', cat: 'text'},
    {id: 'regex', icon: '.*', name: '正则表达式', desc: '正则匹配测试 / 分组查看', cat: 'text'},
    {id: 'stats', icon: 'Σ', name: '文本统计', desc: '字符 / 单词 / 行数 / 字节', cat: 'text'},
    {id: 'csv', icon: 'CSV', name: 'CSV 格式化', desc: 'CSV 表格化查看 / 校对', cat: 'text'},
    {id: 'regexref', icon: '📖', name: '正则速查表', desc: '常用正则表达式分类速查', cat: 'text'},
    {id: 'cron', icon: '*', name: 'Cron 表达式', desc: 'Cron 解析 / 下次执行时间', cat: 'debug'},
    {id: 'ws', icon: 'WS', name: 'WebSocket', desc: 'WebSocket 连接调试', cat: 'debug'},
    {id: 'api', icon: '▶', name: 'API 调用', desc: 'HTTP 请求 / 响应调试', cat: 'debug'},
    {id: 'ip', icon: '🌍', name: 'IP 工具', desc: 'IP 归属 / 子网计算', cat: 'debug'},
    {id: 'arthas', icon: 'A', name: 'Arthas 命令', desc: 'Arthas 诊断命令速查', cat: 'reference'},
    {id: 'jmh', icon: 'JMH', name: 'JMH 模板', desc: 'JMH 基准测试代码生成', cat: 'reference'},
    {id: 'testgen', icon: 'J5', name: '测试模板', desc: 'JUnit 5 + Mockito 测试生成', cat: 'reference'},
    {id: 'linux', icon: '🐧', name: 'Linux 命令', desc: '常用 Linux 命令速查', cat: 'reference'},
    {id: 'docker', icon: '🐳', name: 'Docker 命令', desc: 'Docker / K8s 命令速查', cat: 'reference'},
    {id: 'gitref', icon: 'G', name: 'Git 命令', desc: 'Git 常用操作速查', cat: 'reference'},
    {id: 'httpstatus', icon: '🌐', name: 'HTTP 状态码', desc: 'HTTP 状态码 / 方法速查', cat: 'reference'},
    {id: 'ascii', icon: '⌨', name: 'ASCII 表', desc: 'ASCII / 控制字符速查', cat: 'reference'},
];

// === Navigation ===
const panels = document.querySelectorAll('.tool-panel');
const title = document.getElementById('toolTitle');
const homeBtn = document.getElementById('homeBtn');
const breadcrumb = document.getElementById('breadcrumb');

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
        divider.innerHTML = `<span class="hcd-icon">${cat.icon}</span><span>${cat.name}</span>`;
        grid.appendChild(divider);
        toolsInCat.forEach(t => {
            const card = document.createElement('div');
            card.className = 'home-card';
            card.innerHTML = `<div class="hc-icon">${t.icon}</div><div class="hc-name">${t.name}</div><div class="hc-desc">${t.desc}</div>`;
            card.addEventListener('click', () => openTool(t.id));
            grid.appendChild(card);
        });
        const anchor = document.createElement('a');
        anchor.className = 'cat-anchor';
        anchor.href = '#cat-' + cat.id;
        anchor.innerHTML = '<span class="cat-icon">' + cat.icon + '</span>' + cat.name;
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
    title.textContent = tool.name;
    homeBtn.style.display = 'flex';
    const cat = categories.find(c => c.id === tool.cat);
    breadcrumb.innerHTML = '<span class="bc-item" onclick="goHome()">首页</span><span class="bc-sep">›</span><span class="bc-item" onclick="goHome(\'' + (cat ? cat.id : '') + '\')">' + (cat ? cat.name : '') + '</span><span class="bc-sep">›</span><span class="bc-current">' + tool.name + '</span>';
    setStatus('就绪');
}

function goHome(catId) {
    panels.forEach(p => p.classList.remove('active'));
    document.getElementById('panel-home').classList.add('active');
    title.textContent = 'DevTools';
    homeBtn.style.display = 'none';
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
        msg.textContent = '没有匹配的工具';
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
        'datecalc': 'dateCalcNow',
        'cron': 'cronBuildFields',
    };
    const fnName = renderMap[id];
    if (fnName && typeof window[fnName] === 'function') {
        window[fnName]();
    }
};

buildHomeGrid();

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

function copyText(id) {
    const el = typeof id === 'string' ? document.getElementById(id) : id;
    const text = el.textContent || el.innerText;
    if (!text) {
        toast('没有内容可复制');
        return;
    }
    navigator.clipboard.writeText(text).then(() => toast('已复制')).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        toast('已复制');
    });
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
