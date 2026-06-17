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

    const header = document.createElement('div');
    header.style.cssText = 'display:grid;grid-template-columns:170px 1fr 1fr;background:var(--bg-input);font-weight:600;border-radius:4px;padding:6px 0;margin-bottom:6px;font-size:12px;position:sticky;top:0';
    header.innerHTML = `
        <span style="padding:4px 10px">传播行为</span>
        <span style="padding:4px 10px">行为描述</span>
        <span style="padding:4px 10px">典型场景</span>
    `;
    container.appendChild(header);

    list.forEach(p => {
        const row = document.createElement('div');
        row.style.cssText = 'display:grid;grid-template-columns:170px 1fr 1fr;padding:8px 0;border-bottom:1px solid var(--border);font-size:12px;cursor:pointer;transition:background .12s;border-radius:4px';
        row.onmouseenter = () => row.style.background = 'var(--glass)';
        row.onmouseleave = () => row.style.background = '';
        const tag = p.isDefault
            ? '<span style="font-size:10px;background:var(--accent);color:#fff;padding:1px 5px;border-radius:3px;margin-left:6px">默认</span>'
            : '';
        row.innerHTML = `
            <span style="padding:4px 10px"><code style="background:var(--bg-input);padding:2px 8px;border-radius:3px;color:var(--accent2);font-weight:600">${p.name}</code>${tag}</span>
            <span style="padding:4px 10px;color:var(--text-dim)">${p.desc}</span>
            <span style="padding:4px 10px;color:var(--text-muted)">${p.scenario}</span>
        `;
        row.addEventListener('click', () => safeCopy('Propagation.' + p.name));
        container.appendChild(row);
    });

    const usage = document.createElement('div');
    usage.style.cssText = 'margin-top:18px;padding:10px 12px;background:var(--bg-input);border-radius:4px;font-size:12px;color:var(--text-dim);line-height:1.7';
    usage.innerHTML = `
        <div style="color:var(--accent);font-weight:600;margin-bottom:6px">使用示例：</div>
        <code style="display:block;color:var(--accent2);white-space:pre">@Transactional(propagation = Propagation.REQUIRES_NEW)
public void logOperation(String msg) { ... }</code>
    `;
    container.appendChild(usage);
}

function txpropagationSearch() {
    clearTimeout(txpropagationSearchTimer);
    txpropagationSearchTimer = setTimeout(() => {
        txpropagationRender(document.getElementById('txpropagationSearch').value);
    }, 200);
}
