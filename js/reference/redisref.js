const REDIS_CMDS = [
    {
        cat: 'String',
        items: [
            {
                cmd: 'SET',
                syntax: 'SET key value [EX seconds] [PX milliseconds] [NX|XX]',
                desc: '设置字符串值，支持过期与分布式锁',
                examples: ['SET user:1001 "alice" EX 3600', 'SET lock:order 1 NX EX 30'],
                returns: 'OK / nil',
                complexity: 'O(1)'
            },
            {
                cmd: 'GET',
                syntax: 'GET key',
                desc: '获取字符串值',
                examples: ['GET user:1001'],
                returns: '字符串值 / nil',
                complexity: 'O(1)'
            },
            {
                cmd: 'GETSET',
                syntax: 'GETSET key value',
                desc: '设置新值并返回旧值（6.2 起标记为废弃）',
                examples: ['GETSET counter 100'],
                returns: '旧值 / nil',
                complexity: 'O(1)'
            },
            {
                cmd: 'MSET',
                syntax: 'MSET key value [key value ...]',
                desc: '批量设置多个键值',
                examples: ['MSET user:1 "alice" user:2 "bob"'],
                returns: 'OK',
                complexity: 'O(N)'
            },
            {
                cmd: 'MGET',
                syntax: 'MGET key [key ...]',
                desc: '批量获取多个值',
                examples: ['MGET user:1 user:2 user:3'],
                returns: '值列表（含 nil）',
                complexity: 'O(N)'
            },
            {
                cmd: 'SETEX',
                syntax: 'SETEX key seconds value',
                desc: '设置字符串值并指定过期秒数',
                examples: ['SETEX session:abc 3600 "token-xyz"'],
                returns: 'OK',
                complexity: 'O(1)'
            },
            {
                cmd: 'PSETEX',
                syntax: 'PSETEX key milliseconds value',
                desc: '设置字符串值并指定过期毫秒数',
                examples: ['PSETEX cache:hot 5000 "data"'],
                returns: 'OK',
                complexity: 'O(1)'
            },
            {
                cmd: 'SETNX',
                syntax: 'SETNX key value',
                desc: 'key 不存在时才设置（分布式锁基础命令）',
                examples: ['SETNX lock:order 1'],
                returns: '1 / 0',
                complexity: 'O(1)'
            },
            {
                cmd: 'INCR',
                syntax: 'INCR key',
                desc: '原子自增 1（用于计数器）',
                examples: ['INCR article:1001:views'],
                returns: '递增后的整数值',
                complexity: 'O(1)'
            },
            {
                cmd: 'INCRBY',
                syntax: 'INCRBY key increment',
                desc: '原子自增指定步长',
                examples: ['INCRBY user:1001:score 50'],
                returns: '递增后的整数值',
                complexity: 'O(1)'
            },
            {
                cmd: 'DECR',
                syntax: 'DECR key',
                desc: '原子自减 1',
                examples: ['DECR stock:item:2001'],
                returns: '递减后的整数值',
                complexity: 'O(1)'
            },
            {
                cmd: 'DECRBY',
                syntax: 'DECRBY key decrement',
                desc: '原子自减指定步长',
                examples: ['DECRBY stock:item:2001 5'],
                returns: '递减后的整数值',
                complexity: 'O(1)'
            },
            {
                cmd: 'APPEND',
                syntax: 'APPEND key value',
                desc: '追加字符串到现有值末尾',
                examples: ['APPEND log:access "GET /api\\n"'],
                returns: '追加后的字符串长度',
                complexity: 'O(1)'
            }
        ]
    },
    {
        cat: 'Hash',
        items: [
            {
                cmd: 'HSET',
                syntax: 'HSET key field value [field value ...]',
                desc: '设置哈希字段（支持批量）',
                examples: ['HSET user:1001 name "alice" age 30'],
                returns: '新增字段数',
                complexity: 'O(1)'
            },
            {
                cmd: 'HMSET',
                syntax: 'HMSET key field value [field value ...]',
                desc: '批量设置（已废弃，推荐 HSET）',
                examples: [],
                returns: 'OK',
                complexity: 'O(N)'
            },
            {
                cmd: 'HGET',
                syntax: 'HGET key field',
                desc: '获取哈希字段值',
                examples: ['HGET user:1001 name'],
                returns: '字段值 / nil',
                complexity: 'O(1)'
            },
            {
                cmd: 'HMGET',
                syntax: 'HMGET key field [field ...]',
                desc: '批量获取多个字段值',
                examples: ['HMGET user:1001 name age email'],
                returns: '值列表（含 nil）',
                complexity: 'O(N)'
            },
            {
                cmd: 'HGETALL',
                syntax: 'HGETALL key',
                desc: '获取所有字段和值',
                examples: ['HGETALL user:1001'],
                returns: '字段-值映射 / 空',
                complexity: 'O(N)'
            },
            {
                cmd: 'HDEL',
                syntax: 'HDEL key field [field ...]',
                desc: '删除哈希字段',
                examples: ['HDEL user:1001 phone tempCode'],
                returns: '删除字段数',
                complexity: 'O(N)'
            },
            {
                cmd: 'HEXISTS',
                syntax: 'HEXISTS key field',
                desc: '判断字段是否存在',
                examples: ['HEXISTS user:1001 email'],
                returns: '1 / 0',
                complexity: 'O(1)'
            },
            {
                cmd: 'HKEYS',
                syntax: 'HKEYS key',
                desc: '获取所有字段名',
                examples: ['HKEYS user:1001'],
                returns: '字段名列表',
                complexity: 'O(N)'
            },
            {
                cmd: 'HVALS',
                syntax: 'HVALS key',
                desc: '获取所有字段值',
                examples: ['HVALS user:1001'],
                returns: '值列表',
                complexity: 'O(N)'
            },
            {
                cmd: 'HLEN',
                syntax: 'HLEN key',
                desc: '获取字段数量',
                examples: ['HLEN user:1001'],
                returns: '字段数',
                complexity: 'O(1)'
            },
            {
                cmd: 'HINCRBY',
                syntax: 'HINCRBY key field increment',
                desc: '对字段值原子自增',
                examples: ['HINCRBY user:1001:stat loginCount 1'],
                returns: '递增后的整数值',
                complexity: 'O(1)'
            },
            {
                cmd: 'HSETNX',
                syntax: 'HSETNX key field value',
                desc: '字段不存在时才设置',
                examples: ['HSETNX user:1001 firstLogin "2026-06-23"'],
                returns: '1 / 0',
                complexity: 'O(1)'
            }
        ]
    },
    {
        cat: 'List',
        items: [
            {
                cmd: 'LPUSH',
                syntax: 'LPUSH key element [element ...]',
                desc: '从左侧入队（批量按反向插入）',
                examples: ['LPUSH queue:order "order-001"'],
                returns: '列表长度',
                complexity: 'O(1)'
            },
            {
                cmd: 'RPUSH',
                syntax: 'RPUSH key element [element ...]',
                desc: '从右侧入队',
                examples: ['RPUSH queue:order "order-001"'],
                returns: '列表长度',
                complexity: 'O(1)'
            },
            {
                cmd: 'LPOP',
                syntax: 'LPOP key [count]',
                desc: '从左侧出队（Redis 6.2+ 支持 count）',
                examples: ['LPOP queue:order'],
                returns: '元素 / nil',
                complexity: 'O(1)'
            },
            {
                cmd: 'RPOP',
                syntax: 'RPOP key [count]',
                desc: '从右侧出队',
                examples: ['RPOP queue:order'],
                returns: '元素 / nil',
                complexity: 'O(1)'
            },
            {
                cmd: 'LRANGE',
                syntax: 'LRANGE key start stop',
                desc: '获取区间元素（0 -1 表示全部）',
                examples: ['LRANGE rank:top 0 9'],
                returns: '元素列表',
                complexity: 'O(S+N)'
            },
            {
                cmd: 'LINDEX',
                syntax: 'LINDEX key index',
                desc: '按下标获取元素',
                examples: ['LINDEX queue:order 0'],
                returns: '元素 / nil',
                complexity: 'O(N)'
            },
            {
                cmd: 'LSET',
                syntax: 'LSET key index element',
                desc: '按下标设置元素',
                examples: ['LSET queue:order 0 "order-999"'],
                returns: 'OK',
                complexity: 'O(N)'
            },
            {
                cmd: 'LREM',
                syntax: 'LREM key count element',
                desc: '删除指定元素（count>0 头删，<0 尾删）',
                examples: ['LREM queue:order 1 "order-001"'],
                returns: '删除数量',
                complexity: 'O(N)'
            },
            {
                cmd: 'LLEN',
                syntax: 'LLEN key',
                desc: '获取列表长度',
                examples: ['LLEN queue:order'],
                returns: '列表长度',
                complexity: 'O(1)'
            },
            {
                cmd: 'LINSERT',
                syntax: 'LINSERT key BEFORE|AFTER pivot element',
                desc: '在 pivot 元素前/后插入新元素',
                examples: ['LINSERT log:user BEFORE "login" "logout"'],
                returns: '列表长度 / -1 (pivot 不存在)',
                complexity: 'O(N)'
            },
            {
                cmd: 'RPOPLPUSH',
                syntax: 'RPOPLPUSH source destination',
                desc: '从 source 尾部弹出压入 destination 头部（已废弃，推荐 LMOVE）',
                examples: [],
                returns: '弹出元素 / nil',
                complexity: 'O(1)'
            },
            {
                cmd: 'LMOVE',
                syntax: 'LMOVE source destination LEFT|RIGHT LEFT|RIGHT',
                desc: '原子地从一端弹出并推入另一端',
                examples: ['LMOVE queue:wait queue:run RIGHT LEFT'],
                returns: '弹出元素 / nil',
                complexity: 'O(1)'
            },
            {
                cmd: 'BRPOP',
                syntax: 'BRPOP key [key ...] timeout',
                desc: '阻塞式右端出队（timeout 秒，0 永久阻塞）',
                examples: ['BRPOP queue:order 5'],
                returns: '[key, element] / nil',
                complexity: 'O(1)'
            }
        ]
    },
    {
        cat: 'Set',
        items: [
            {
                cmd: 'SADD',
                syntax: 'SADD key member [member ...]',
                desc: '添加集合元素（已存在则忽略）',
                examples: ['SADD tag:java "redis" "mysql"'],
                returns: '新增元素数',
                complexity: 'O(1)'
            },
            {
                cmd: 'SREM',
                syntax: 'SREM key member [member ...]',
                desc: '删除集合元素',
                examples: ['SREM tag:java "mysql"'],
                returns: '删除元素数',
                complexity: 'O(1)'
            },
            {
                cmd: 'SMEMBERS',
                syntax: 'SMEMBERS key',
                desc: '获取所有元素',
                examples: ['SMEMBERS tag:java'],
                returns: '元素列表',
                complexity: 'O(N)'
            },
            {
                cmd: 'SISMEMBER',
                syntax: 'SISMEMBER key member',
                desc: '判断元素是否存在',
                examples: ['SISMEMBER tag:java "redis"'],
                returns: '1 / 0',
                complexity: 'O(1)'
            },
            {
                cmd: 'SPOP',
                syntax: 'SPOP key [count]',
                desc: '随机弹出一个或多个元素',
                examples: ['SPOP lottery:users'],
                returns: '弹出元素 / nil',
                complexity: 'O(1)'
            },
            {
                cmd: 'SRANDMEMBER',
                syntax: 'SRANDMEMBER key [count]',
                desc: '随机返回一个或多个元素（不删除）',
                examples: ['SRANDMEMBER lottery:users 3'],
                returns: '元素 / 元素列表',
                complexity: 'O(N)'
            },
            {
                cmd: 'SCARD',
                syntax: 'SCARD key',
                desc: '获取集合元素数',
                examples: ['SCARD tag:java'],
                returns: '元素数量',
                complexity: 'O(1)'
            },
            {
                cmd: 'SINTER',
                syntax: 'SINTER key [key ...]',
                desc: '求多个集合的交集',
                examples: ['SINTER tag:java tag:backend'],
                returns: '交集元素列表',
                complexity: 'O(N*M)'
            },
            {
                cmd: 'SUNION',
                syntax: 'SUNION key [key ...]',
                desc: '求多个集合的并集',
                examples: ['SUNION tag:java tag:backend'],
                returns: '并集元素列表',
                complexity: 'O(N)'
            },
            {
                cmd: 'SDIFF',
                syntax: 'SDIFF key [key ...]',
                desc: '求多个集合的差集',
                examples: ['SDIFF tag:java tag:backend'],
                returns: '差集元素列表',
                complexity: 'O(N)'
            },
            {
                cmd: 'SINTERSTORE',
                syntax: 'SINTERSTORE destination key [key ...]',
                desc: '将交集结果保存到新集合',
                examples: ['SINTERSTORE tag:common tag:java tag:backend'],
                returns: '结果集元素数',
                complexity: 'O(N*M)'
            },
            {
                cmd: 'SMOVE',
                syntax: 'SMOVE source destination member',
                desc: '将元素从一个集合移到另一个',
                examples: ['SMOVE tag:java tag:backend "spring"'],
                returns: '1 / 0',
                complexity: 'O(1)'
            }
        ]
    },
    {
        cat: 'Sorted Set',
        items: [
            {
                cmd: 'ZADD',
                syntax: 'ZADD key [NX|XX] [GT|LT] [CH] [INCR] score member [score member ...]',
                desc: '添加有序集合元素（默认更新分数）',
                examples: ['ZADD rank:game 100 "alice" 200 "bob"'],
                returns: '新增元素数',
                complexity: 'O(log N)'
            },
            {
                cmd: 'ZRANGE',
                syntax: 'ZRANGE key start stop [BYSCORE|BYLEX] [REV] [LIMIT offset count] [WITHSCORES]',
                desc: '按排名或分数返回区间元素（6.2+ 增强）',
                examples: ['ZRANGE rank:game 0 9 WITHSCORES'],
                returns: '元素列表',
                complexity: 'O(log N + M)'
            },
            {
                cmd: 'ZREVRANGE',
                syntax: 'ZREVRANGE key start stop [WITHSCORES]',
                desc: '按排名倒序获取（已废弃，推荐 ZRANGE REV）',
                examples: [],
                returns: '元素列表',
                complexity: 'O(log N + M)'
            },
            {
                cmd: 'ZRANGEBYSCORE',
                syntax: 'ZRANGEBYSCORE key min max [WITHSCORES] [LIMIT offset count]',
                desc: '按分数区间获取元素',
                examples: ['ZRANGEBYSCORE rank:game 100 200 WITHSCORES'],
                returns: '元素列表',
                complexity: 'O(log N + M)'
            },
            {
                cmd: 'ZSCORE',
                syntax: 'ZSCORE key member',
                desc: '获取元素分数',
                examples: ['ZSCORE rank:game "alice"'],
                returns: '分数 / nil',
                complexity: 'O(1)'
            },
            {
                cmd: 'ZINCRBY',
                syntax: 'ZINCRBY key increment member',
                desc: '对元素分数原子自增',
                examples: ['ZINCRBY rank:game 50 "alice"'],
                returns: '递增后分数',
                complexity: 'O(log N)'
            },
            {
                cmd: 'ZREM',
                syntax: 'ZREM key member [member ...]',
                desc: '删除一个或多个元素',
                examples: ['ZREM rank:game "bob"'],
                returns: '删除元素数',
                complexity: 'O(log N)'
            },
            {
                cmd: 'ZCARD',
                syntax: 'ZCARD key',
                desc: '获取元素总数',
                examples: ['ZCARD rank:game'],
                returns: '元素数量',
                complexity: 'O(1)'
            },
            {
                cmd: 'ZRANK',
                syntax: 'ZRANK key member',
                desc: '获取元素升序排名（从 0 开始）',
                examples: ['ZRANK rank:game "alice"'],
                returns: '排名 / nil',
                complexity: 'O(log N)'
            },
            {
                cmd: 'ZCOUNT',
                syntax: 'ZCOUNT key min max',
                desc: '统计分数区间内的元素数',
                examples: ['ZCOUNT rank:game 100 200'],
                returns: '元素数量',
                complexity: 'O(log N)'
            }
        ]
    },
    {
        cat: '通用',
        items: [
            {
                cmd: 'EXPIRE',
                syntax: 'EXPIRE key seconds [NX|XX|GT|LT]',
                desc: '设置 key 过期时间（秒）',
                examples: ['EXPIRE session:abc 3600'],
                returns: '1 / 0',
                complexity: 'O(1)'
            },
            {
                cmd: 'TTL',
                syntax: 'TTL key',
                desc: '查看 key 剩余过期秒数',
                examples: ['TTL session:abc'],
                returns: '秒数 / -1 (无过期) / -2 (key 不存在)',
                complexity: 'O(1)'
            },
            {
                cmd: 'PERSIST',
                syntax: 'PERSIST key',
                desc: '移除 key 的过期时间',
                examples: ['PERSIST session:abc'],
                returns: '1 / 0',
                complexity: 'O(1)'
            },
            {
                cmd: 'KEYS',
                syntax: 'KEYS pattern',
                desc: '查找匹配 pattern 的所有 key（生产慎用，会阻塞）',
                examples: ['KEYS user:*', 'KEYS session:???:*'],
                returns: 'key 列表',
                complexity: 'O(N)'
            },
            {
                cmd: 'SCAN',
                syntax: 'SCAN cursor [MATCH pattern] [COUNT count] [TYPE type]',
                desc: '增量迭代 key（生产推荐替代 KEYS）',
                examples: ['SCAN 0 MATCH user:* COUNT 100'],
                returns: '[新游标, key 列表]',
                complexity: 'O(1)'
            },
            {
                cmd: 'TYPE',
                syntax: 'TYPE key',
                desc: '查看 key 的数据结构类型',
                examples: ['TYPE user:1001'],
                returns: 'string/list/hash/set/zset/... / none',
                complexity: 'O(1)'
            },
            {
                cmd: 'DEL',
                syntax: 'DEL key [key ...]',
                desc: '删除一个或多个 key',
                examples: ['DEL user:1001', 'DEL user:1001 user:1002'],
                returns: '删除数量',
                complexity: 'O(N)'
            },
            {
                cmd: 'EXISTS',
                syntax: 'EXISTS key [key ...]',
                desc: '判断 key 是否存在',
                examples: ['EXISTS user:1001'],
                returns: '存在数量',
                complexity: 'O(1)'
            },
            {
                cmd: 'RENAME',
                syntax: 'RENAME key newkey',
                desc: '重命名 key（newkey 已存在则覆盖）',
                examples: ['RENAME user:1001 user:2001'],
                returns: 'OK',
                complexity: 'O(1)'
            },
            {
                cmd: 'FLUSHDB',
                syntax: 'FLUSHDB [ASYNC]',
                desc: '清空当前数据库（生产慎用）',
                examples: ['FLUSHDB ASYNC'],
                returns: 'OK',
                complexity: 'O(N)'
            },
            {
                cmd: 'RANDOMKEY',
                syntax: 'RANDOMKEY',
                desc: '随机返回一个 key',
                examples: ['RANDOMKEY'],
                returns: '随机 key / nil',
                complexity: 'O(1)'
            },
            {
                cmd: 'OBJECT',
                syntax: 'OBJECT subcommand [arguments ...]',
                desc: '查看 key 内部信息（ENCODING/REFCOUNT/IDLETIME/FREQ/HELP）',
                examples: ['OBJECT ENCODING user:1001', 'OBJECT IDLETIME session:abc'],
                returns: '取决于子命令',
                complexity: 'O(1)'
            }
        ]
    },
    {
        cat: '集群',
        items: [
            {
                cmd: 'CLUSTER INFO',
                syntax: 'CLUSTER INFO',
                desc: '查看集群状态（节点数、槽位覆盖等）',
                examples: ['CLUSTER INFO'],
                returns: '集群状态文本',
                complexity: 'O(1)'
            },
            {
                cmd: 'CLUSTER NODES',
                syntax: 'CLUSTER NODES',
                desc: '列出集群所有节点及其角色',
                examples: ['CLUSTER NODES'],
                returns: '节点列表文本',
                complexity: 'O(N)'
            },
            {
                cmd: 'CLUSTER KEYSLOT',
                syntax: 'CLUSTER KEYSLOT key',
                desc: '计算 key 的哈希槽编号',
                examples: ['CLUSTER KEYSLOT user:1001'],
                returns: '槽位编号（0-16383）',
                complexity: 'O(1)'
            },
            {
                cmd: 'CLUSTER MEET',
                syntax: 'CLUSTER MEET ip port',
                desc: '将指定节点加入集群',
                examples: ['CLUSTER MEET 192.168.1.20 6379'],
                returns: 'OK',
                complexity: 'O(1)'
            },
            {
                cmd: 'CLUSTER REPLICATE',
                syntax: 'CLUSTER REPLICATE node-id',
                desc: '将当前节点设为指定主节点的从节点',
                examples: ['CLUSTER REPLICATE 07c37dfeb235213a872192d90877d0cd55635b91'],
                returns: 'OK',
                complexity: 'O(1)'
            },
            {
                cmd: 'CLUSTER FAILOVER',
                syntax: 'CLUSTER FAILOVER [FORCE|TAKEOVER]',
                desc: '手动触发从节点切换为主节点',
                examples: ['CLUSTER FAILOVER FORCE'],
                returns: 'OK',
                complexity: 'O(1)'
            },
            {
                cmd: 'SENTINEL masters',
                syntax: 'SENTINEL masters',
                desc: '查看 Sentinel 监控的所有主节点',
                examples: ['SENTINEL masters'],
                returns: '主节点列表',
                complexity: 'O(N)'
            },
            {
                cmd: 'SENTINEL get-master-addr-by-name',
                syntax: 'SENTINEL get-master-addr-by-name master-name',
                desc: '根据主节点名获取当前 IP 与端口',
                examples: ['SENTINEL get-master-addr-by-name mymaster'],
                returns: '[ip, port]',
                complexity: 'O(1)'
            }
        ]
    }
];

let _redisrefSearchTimer = null;
let _redisrefCurrentCat = 'all';

function redisrefRender() {
    const container = document.getElementById('redisrefContent');
    if (!container) return;
    container.innerHTML = '';
    const searchEl = document.getElementById('redisrefSearch');
    const filter = ((searchEl && searchEl.value) || '').toLowerCase().trim();
    let hasResult = false;
    REDIS_CMDS.forEach(group => {
        if (_redisrefCurrentCat !== 'all' && group.cat !== _redisrefCurrentCat) return;
        const matched = filter
            ? group.items.filter(it => redisrefItemMatches(it, filter))
            : group.items;
        if (matched.length === 0) return;
        hasResult = true;
        const h = document.createElement('div');
        h.style.cssText = 'font-size:13px;font-weight:600;color:var(--accent);padding:10px 0 6px;border-bottom:1px solid var(--border);margin-bottom:4px';
        h.textContent = group.cat;
        container.appendChild(h);
        matched.forEach(item => {
            container.appendChild(redisrefBuildCard(item));
        });
    });
    if (!hasResult) {
        container.innerHTML = '<div style="color:var(--text-dim);padding:20px;text-align:center">无匹配结果</div>';
    }
}

function redisrefItemMatches(it, q) {
    if (!q) return true;
    if (it.cmd.toLowerCase().includes(q)) return true;
    if (it.syntax.toLowerCase().includes(q)) return true;
    if (it.desc.toLowerCase().includes(q)) return true;
    if (it.returns.toLowerCase().includes(q)) return true;
    if (it.complexity.toLowerCase().includes(q)) return true;
    for (let i = 0; i < it.examples.length; i++) {
        if (it.examples[i].toLowerCase().includes(q)) return true;
    }
    return false;
}

function redisrefBuildCard(item) {
    const card = document.createElement('div');
    card.className = 'redisref-card';

    const head = document.createElement('div');
    head.className = 'redisref-head';

    const cmd = document.createElement('code');
    cmd.className = 'redisref-cmd';
    cmd.textContent = item.cmd;
    head.appendChild(cmd);

    const cx = document.createElement('span');
    cx.className = 'redisref-complexity';
    cx.textContent = item.complexity;
    head.appendChild(cx);

    const copyBtn = document.createElement('button');
    copyBtn.className = 'redisref-copy-btn';
    copyBtn.textContent = '复制命令';
    copyBtn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        safeCopy(item.cmd, '已复制: ' + item.cmd);
    });
    head.appendChild(copyBtn);

    card.appendChild(head);

    const syntax = document.createElement('div');
    syntax.className = 'redisref-syntax';
    syntax.textContent = item.syntax;
    card.appendChild(syntax);

    const desc = document.createElement('div');
    desc.className = 'redisref-desc';
    desc.textContent = item.desc;
    card.appendChild(desc);

    if (item.examples && item.examples.length) {
        const exWrap = document.createElement('div');
        exWrap.className = 'redisref-examples';
        item.examples.forEach(ex => {
            const exEl = document.createElement('div');
            exEl.className = 'redisref-ex';
            exEl.textContent = ex;
            exWrap.appendChild(exEl);
        });
        card.appendChild(exWrap);
    }

    const ret = document.createElement('div');
    ret.className = 'redisref-returns';
    ret.textContent = '返回值: ' + item.returns;
    card.appendChild(ret);

    return card;
}

function redisrefSearch() {
    clearTimeout(_redisrefSearchTimer);
    _redisrefSearchTimer = setTimeout(function () {
        redisrefRender();
    }, 200);
}

function redisrefFilter(cat) {
    _redisrefCurrentCat = cat;
    const tabs = document.querySelectorAll('#redisrefTabs button');
    tabs.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.cat === cat);
    });
    redisrefRender();
}

registerInit('redisref', redisrefRender);
