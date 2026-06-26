const TX_PROPAGATION = [
    {
        name: 'REQUIRED',
        isDefault: true,
        desc: '如果当前存在事务则加入；否则新建一个事务（默认值）',
        scenario: '绝大部分业务方法：单服务内多次写操作希望一并提交/回滚'
    },
    {
        name: 'SUPPORTS',
        isDefault: false,
        desc: '如果当前存在事务则加入；否则以非事务方式执行',
        scenario: '查询方法：外层有事务就跟着走，没有也没关系（提升非事务场景性能）'
    },
    {
        name: 'MANDATORY',
        isDefault: false,
        desc: '必须存在一个事务，否则抛 IllegalTransactionStateException',
        scenario: '核心写入方法强制要求外层开启事务，避免被误用为非事务调用'
    },
    {
        name: 'REQUIRES_NEW',
        isDefault: false,
        desc: '无论当前是否有事务，都新建一个事务；原事务被挂起',
        scenario: '记录操作日志 / 审计：无论主业务成功失败，日志都希望独立提交'
    },
    {
        name: 'NOT_SUPPORTED',
        isDefault: false,
        desc: '以非事务方式执行；若当前存在事务则挂起',
        scenario: '某些必须非事务执行的中间件调用（如发消息）'
    },
    {
        name: 'NEVER',
        isDefault: false,
        desc: '必须在非事务下执行；若当前存在事务则抛异常',
        scenario: '强约束：禁止在事务中调用的方法（如某些 DDL、远程接口）'
    },
    {
        name: 'NESTED',
        isDefault: false,
        desc: '若当前存在事务则创建嵌套事务（savepoint）；否则等价于 REQUIRED',
        scenario: '部分子操作可独立回滚而不影响外层（仅 JDBC DataSource 支持）'
    },
];

let txpropagationSearchTimer = null;

function txpropagationRender(filter) {
    const container = document.getElementById('txpropagationContent');
    if (!container) return;
    filter = (filter || '').trim().toLowerCase();
    container.innerHTML = '';
    const list = filter
        ? TX_PROPAGATION.filter(p =>
            p.name.toLowerCase().includes(filter) ||
            p.desc.toLowerCase().includes(filter) ||
            p.scenario.toLowerCase().includes(filter))
        : TX_PROPAGATION;
    if (!list.length) {
        container.innerHTML = '<div style="color:var(--text-muted);padding:20px;text-align:center">无匹配结果</div>';
        return;
    }

    list.forEach(p => {
        const card = document.createElement('div');
        card.className = 'ref-card';
        const tag = p.isDefault ? '<span style="font-size:10px;background:var(--accent);color:#fff;padding:1px 5px;border-radius:3px;margin-left:6px">默认</span>' : '';
        let html = `<div class="ref-cmd-head"><code class="ref-cmd-name">${p.name}</code>${tag}<button class="sm outline" onclick="safeCopy('Propagation.${p.name}')">复制</button></div>`;
        html += `<div style="font-size:12px;color:var(--text-dim);margin:4px 0">${p.desc}</div>`;
        html += `<div style="font-size:11px;color:var(--text-muted)">场景: ${p.scenario}</div>`;
        card.innerHTML = html;
        container.appendChild(card);
    });

    const usage = document.createElement('div');
    usage.className = 'ref-card';
    usage.innerHTML = `<div style="font-size:12px;font-weight:600;color:var(--accent);margin-bottom:6px">使用示例</div><div class="ref-copy-wrap"><pre class="ref-pre"><code>@Transactional(propagation = Propagation.REQUIRES_NEW)\npublic void logOperation(String msg) { ... }</code></pre><button class="ref-copy-btn" onclick="safeCopy(this.parentElement.querySelector('pre').innerText)">复制</button></div>`;
    container.appendChild(usage);
}

function txpropagationSearch() {
    clearTimeout(txpropagationSearchTimer);
    txpropagationSearchTimer = setTimeout(() => {
        txpropagationRender(document.getElementById('txpropagationSearch').value);
    }, 200);
}

registerInit('txpropagation', txpropagationRender);
