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
    {id: 'jwt', icon: 'JWT', name: 'JWT 解码', desc: '解析 JWT Header / Payload', cat: 'security'},
    {id: 'hash', icon: '#', name: 'Hash 计算', desc: 'MD5 / SHA-1 / SHA-256 / SHA-512', cat: 'security'},
    {id: 'random', icon: 'R', name: '随机生成器', desc: '密码 / Token / PIN 生成', cat: 'security'},
    {id: 'uuid', icon: 'U', name: 'UUID 生成', desc: 'UUID v4 / v7 / 批量生成', cat: 'generate'},
    {id: 'ts', icon: 'T', name: '时间戳转换', desc: 'Unix 毫秒/秒 ↔ 日期', cat: 'generate'},
    {id: 'color', icon: '■', name: '颜色转换', desc: 'HEX / RGB / HSL 互转预览', cat: 'generate'},
    {id: 'baseconvert', icon: '0x', name: '进制转换', desc: '2~36 进制互转', cat: 'generate'},
    {id: 'case', icon: 'Aa', name: 'Case 转换', desc: 'camelCase / snake_case 等', cat: 'generate'},
    {id: 'diff', icon: '!=', name: '文本对比', desc: '文本差异对比高亮', cat: 'text'},
    {id: 'regex', icon: '.*', name: '正则表达式', desc: '正则匹配测试 / 分组查看', cat: 'text'},
    {id: 'stats', icon: 'Σ', name: '文本统计', desc: '字符 / 单词 / 行数 / 字节', cat: 'text'},
    {id: 'cron', icon: '*', name: 'Cron 表达式', desc: 'Cron 解析 / 下次执行时间', cat: 'debug'},
    {id: 'ws', icon: 'WS', name: 'WebSocket', desc: 'WebSocket 连接调试', cat: 'debug'},
    {id: 'api', icon: '▶', name: 'API 调用', desc: 'HTTP 请求 / 响应调试', cat: 'debug'},
    {id: 'arthas', icon: 'A', name: 'Arthas 命令', desc: 'Arthas 诊断命令速查', cat: 'reference'},
    {id: 'jmh', icon: 'JMH', name: 'JMH 模板', desc: 'JMH 基准测试代码生成', cat: 'reference'},
    {id: 'testgen', icon: 'J5', name: '测试模板', desc: 'JUnit 5 + Mockito 测试生成', cat: 'reference'},
];

// === Navigation ===
const sidebar = document.getElementById('sidebar');
const sidebarNav = document.getElementById('sidebarNav');
const panels = document.querySelectorAll('.tool-panel');
const title = document.getElementById('toolTitle');
const homeBtn = document.getElementById('homeBtn');

function buildSidebar() {
    sidebarNav.innerHTML = '';
    categories.forEach(cat => {
        const toolsInCat = tools.filter(t => t.cat === cat.id);
        if (!toolsInCat.length) return;
        const header = document.createElement('div');
        header.style.cssText = 'font-size:11px;color:var(--text-muted);padding:12px 10px 4px;text-transform:uppercase;letter-spacing:.5px;font-weight:500';
        header.textContent = cat.name;
        sidebarNav.appendChild(header);
        toolsInCat.forEach(t => {
            const item = document.createElement('div');
            item.className = 'nav-item';
            item.dataset.tool = t.id;
            item.innerHTML = `<span class="icon">${t.icon}</span><span>${t.name}</span>`;
            item.addEventListener('click', () => openTool(t.id));
            sidebarNav.appendChild(item);
        });
    });
}

function buildHomeGrid() {
    const grid = document.getElementById('homeGrid');
    grid.innerHTML = '';
    categories.forEach(cat => {
        const toolsInCat = tools.filter(t => t.cat === cat.id);
        if (!toolsInCat.length) return;
        const divider = document.createElement('div');
        divider.className = 'home-cat-divider';
        divider.innerHTML = `<span class="hcd-icon">${cat.icon}</span><span>${cat.name}</span>`;
        grid.appendChild(divider);
        toolsInCat.forEach(t => {
            const card = document.createElement('div');
            card.className = 'home-card';
            card.innerHTML = `<div class="hc-icon">${t.icon}</div><div class="hc-name">${t.name}</div><div class="hc-desc">${t.desc}</div>`;
            card.addEventListener('click', () => openTool(t.id));
            grid.appendChild(card);
        });
    });
}

function openTool(id) {
    panels.forEach(p => p.classList.remove('active'));
    document.getElementById('panel-home').classList.remove('active');
    document.getElementById('panel-' + id).classList.add('active');
    title.textContent = tools.find(t => t.id === id).name;
    homeBtn.style.display = 'flex';
    sidebar.classList.add('visible');
    document.querySelectorAll('#sidebarNav .nav-item').forEach(n => n.classList.remove('active'));
    const activeNav = document.querySelector(`#sidebarNav .nav-item[data-tool="${id}"]`);
    if (activeNav) activeNav.classList.add('active');
    setStatus('就绪');
}

function goHome() {
    panels.forEach(p => p.classList.remove('active'));
    document.getElementById('panel-home').classList.add('active');
    title.textContent = 'DevTools';
    homeBtn.style.display = 'none';
    sidebar.classList.remove('visible');
    clearHomeSearch();
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
            if (el.style.display !== 'none') { visibleAfter = true; break; }
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

// 打开工具时清空搜索
const origOpen = openTool;
openTool = function(id) {
    clearHomeSearch();
    origOpen(id);
};

buildSidebar();
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
