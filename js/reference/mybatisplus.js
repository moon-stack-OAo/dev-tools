const MYBATIS_PLUS_DATA = [
    {
        cat: 'BaseMapper<T>',
        items: [
            {method: 'insert(T entity)', desc: '插入一条记录（返回受影响行数）'},
            {method: 'deleteById(Serializable id)', desc: '根据 ID 删除一条记录'},
            {method: 'deleteByMap(Map<String, Object>)', desc: '根据 columnMap 条件删除'},
            {method: 'delete(Wrapper<T> wrapper)', desc: '根据条件构造器删除'},
            {method: 'deleteBatchIds(Collection<? extends Serializable>)', desc: '批量删除（按 ID 集合）'},
            {method: 'updateById(T entity)', desc: '根据 ID 更新（NULL 字段不更新）'},
            {method: 'update(T entity, Wrapper<T> wrapper)', desc: '根据条件更新'},
            {method: 'selectById(Serializable id)', desc: '根据 ID 查询一条记录'},
            {method: 'selectBatchIds(Collection)', desc: '批量查询（按 ID 集合）'},
            {method: 'selectList(Wrapper<T> wrapper)', desc: '查询列表（满足条件全部）'},
            {method: 'selectOne(Wrapper<T> wrapper)', desc: '查询单条（结果 >1 会抛异常）'},
            {method: 'selectCount(Wrapper<T> wrapper)', desc: '查询总数'},
            {method: 'selectMaps(Wrapper<T> wrapper)', desc: '返回 List<Map<String, Object>>'},
            {method: 'selectObjs(Wrapper<T> wrapper)', desc: '返回 List<Object>（只取第一列）'},
            {method: 'selectPage(IPage<T> page, Wrapper<T>)', desc: '分页查询，返回 IPage<T>'},
            {method: 'selectMapsPage(IPage, Wrapper)', desc: '分页查询，返回 IPage<Map>'},
        ]
    },
    {
        cat: 'IService<T> / ServiceImpl<M, T>',
        items: [
            {method: 'save(T entity)', desc: '插入一条记录'},
            {method: 'saveBatch(Collection<T> list)', desc: '批量保存（默认 1000/批）'},
            {method: 'saveBatch(Collection<T> list, int batchSize)', desc: '指定批次大小批量保存'},
            {method: 'saveOrUpdate(T entity)', desc: '存在则更新否则插入（按 ID）'},
            {method: 'saveOrUpdateBatch(Collection<T>)', desc: '批量 saveOrUpdate'},
            {method: 'removeById(Serializable id)', desc: '按 ID 删除'},
            {method: 'removeByIds(Collection<? extends Serializable>)', desc: '按 ID 集合批量删除'},
            {method: 'remove(Wrapper<T> wrapper)', desc: '按条件删除'},
            {method: 'updateById(T entity)', desc: '按 ID 更新'},
            {method: 'update(Wrapper<T> updateWrapper)', desc: '按条件更新（entity 不可为 null）'},
            {method: 'getById(Serializable id)', desc: '按 ID 查询'},
            {method: 'list()', desc: '查询全部'},
            {method: 'list(Wrapper<T> wrapper)', desc: '按条件查询列表'},
            {method: 'listByIds(Collection)', desc: '按 ID 集合查询'},
            {method: 'listByMap(Map<String, Object>)', desc: '按 columnMap 查询'},
            {method: 'one(Wrapper<T> wrapper)', desc: '查询单条（>=1）'},
            {method: 'count()', desc: '查询总数'},
            {method: 'count(Wrapper<T> wrapper)', desc: '按条件查询总数'},
            {method: 'page(IPage<T> page)', desc: '无条件分页'},
            {method: 'page(IPage<T> page, Wrapper<T> wrapper)', desc: '带条件分页'},
            {method: 'chain()', desc: '链式调用，返回 ChainQuery / LambdaQueryChainWrapper'},
        ]
    },
    {
        cat: 'LambdaQueryWrapper<T>',
        items: [
            {method: 'eq(SFunction<T,?>, Object val)', desc: '等值 ='},
            {method: 'ne(SFunction<T,?>, Object val)', desc: '不等于 <>'},
            {method: 'gt(SFunction, val)', desc: '大于 >'},
            {method: 'ge(SFunction, val)', desc: '大于等于 >='},
            {method: 'lt(SFunction, val)', desc: '小于 <'},
            {method: 'le(SFunction, val)', desc: '小于等于 <='},
            {method: 'between(SFunction, val1, val2)', desc: 'BETWEEN val1 AND val2'},
            {method: 'notBetween(SFunction, val1, val2)', desc: 'NOT BETWEEN'},
            {method: 'like(SFunction, val)', desc: '%val%'},
            {method: 'notLike(SFunction, val)', desc: 'NOT LIKE %val%'},
            {method: 'likeLeft(SFunction, val)', desc: '%val'},
            {method: 'likeRight(SFunction, val)', desc: 'val%'},
            {method: 'in(SFunction, Collection)', desc: 'IN 集合'},
            {method: 'in(SFunction, Object... values)', desc: 'IN 多值'},
            {method: 'notIn(SFunction, Collection)', desc: 'NOT IN'},
            {method: 'isNull(SFunction)', desc: 'IS NULL'},
            {method: 'isNotNull(SFunction)', desc: 'IS NOT NULL'},
            {method: 'orderByAsc(SFunction...)', desc: '升序 ORDER BY ASC'},
            {method: 'orderByDesc(SFunction...)', desc: '降序 ORDER BY DESC'},
            {method: 'orderBy(boolean, boolean, SFunction...)', desc: '条件排序'},
            {method: 'groupBy(SFunction...)', desc: 'GROUP BY'},
            {method: 'having(String sql, Object... params)', desc: 'HAVING'},
            {method: 'last(String sql)', desc: '末尾追加 SQL（无视转义风险）'},
            {method: 'select(SFunction<T,?>...)', desc: '指定查询字段'},
            {method: 'select(Class<T>, Predicate<TableFieldInfo>)', desc: '过滤字段查询'},
            {method: 'or() / or(Consumer<LambdaQueryWrapper>)', desc: 'OR 拼接'},
            {method: 'and(Consumer<LambdaQueryWrapper>)', desc: 'AND 嵌套'},
            {method: 'nested(Consumer<LambdaQueryWrapper>)', desc: '嵌套括号 ( ... )'},
            {method: 'apply(String applySql, Object... params)', desc: '拼接 SQL 片段（参数自动绑定）'},
            {method: 'exists(String existsSql)', desc: 'EXISTS 子查询'},
            {method: 'notExists(String notExistsSql)', desc: 'NOT EXISTS 子查询'},
        ]
    },
    {
        cat: 'LambdaUpdateWrapper<T>',
        items: [
            {method: 'set(SFunction, Object val)', desc: 'SET column = val'},
            {method: 'setSql(String sql)', desc: 'SET 原生 SQL 片段'},
            {method: 'set(boolean, SFunction, val)', desc: '条件 SET'},
            {method: 'incr(SFunction, long val)', desc: '原子自增（set field = field + val）'},
            {method: 'decr(SFunction, long val)', desc: '原子自减'},
            {method: 'eq / ne / gt / lt ...', desc: '同 LambdaQueryWrapper 的条件方法'},
        ]
    },
    {
        cat: '分页插件 PaginationInnerInterceptor',
        items: [
            {method: 'new Page<T>(long current, long size)', desc: '构造分页，current=1 起'},
            {method: 'new Page<T>(current, size, total)', desc: '已知总数时构造分页'},
            {method: 'new Page<T>(current, size, total, boolean searchCount)', desc: '可关闭 count 查询'},
            {method: 'IPage.setRecords(List<T>)', desc: '设置数据列表'},
            {method: 'IPage.setCurrent(long) / setSize(long)', desc: '修改当前页/页大小'},
            {method: 'IPage.setTotal(long) / getTotal()', desc: '总数'},
            {method: 'IPage.setSearchCount(boolean)', desc: '关闭 count SQL（已知总数时提速）'},
            {method: 'IPage.getPages()', desc: '总页数'},
        ]
    },
    {
        cat: '通用方法速记',
        items: [
            {method: 'Wrappers.lambdaQuery()', desc: '构造 LambdaQueryWrapper（链式起点）'},
            {method: 'Wrappers.lambdaUpdate()', desc: '构造 LambdaUpdateWrapper'},
            {method: 'Wrappers.query() / Wrappers.update()', desc: '非 Lambda 构造器'},
            {method: 'QueryWrapper<T>.lambda()', desc: 'QueryWrapper 转 LambdaQueryWrapper'},
        ]
    },
];

let mybatisplusSearchTimer = null;

function mybatisplusRender(filter) {
    const container = document.getElementById('mybatisplusContent');
    if (!container) return;
    filter = (filter || '').trim().toLowerCase();
    container.innerHTML = '';
    let hasResult = false;
    MYBATIS_PLUS_DATA.forEach(group => {
        const matched = filter
            ? group.items.filter(i =>
                i.method.toLowerCase().includes(filter) ||
                i.desc.toLowerCase().includes(filter))
            : group.items;
        if (!matched.length) return;
        hasResult = true;
        const section = document.createElement('div');
        section.style.cssText = 'margin-bottom:14px';
        section.innerHTML = `<div style="font-size:12px;font-weight:600;color:var(--accent);padding:6px 0;border-bottom:1px solid var(--border);margin-bottom:6px">${group.cat}</div>`;
        matched.forEach(item => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:4px;transition:background .12s;cursor:pointer';
            row.onmouseenter = () => row.style.background = 'var(--glass)';
            row.onmouseleave = () => row.style.background = '';
            row.innerHTML = `<code style="background:var(--bg-input);padding:2px 8px;border-radius:4px;font-size:12px;white-space:nowrap;flex-shrink:0;color:var(--accent2)">${item.method.replace(/</g, '&lt;')}</code><span style="font-size:12px;color:var(--text-dim);flex:1">${item.desc}</span>`;
            row.addEventListener('click', () => safeCopy(item.method));
            section.appendChild(row);
        });
        container.appendChild(section);
    });
    if (!hasResult) {
        container.innerHTML = '<div style="color:var(--text-muted);padding:20px;text-align:center">无匹配结果</div>';
    }
}

function mybatisplusSearch() {
    clearTimeout(mybatisplusSearchTimer);
    mybatisplusSearchTimer = setTimeout(() => {
        mybatisplusRender(document.getElementById('mybatisplusSearch').value);
    }, 200);
}

registerInit('mybatisplus', mybatisplusRender);
