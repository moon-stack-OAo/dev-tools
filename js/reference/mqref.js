const KAFKA_REF = [
    {
        cat: '生产者',
        items: [
            {
                key: 'bootstrap.servers',
                type: '配置项',
                desc: 'Kafka 集群地址列表（多个用逗号分隔）',
                example: 'localhost:9092,localhost:9093,localhost:9094',
            },
            {
                key: 'acks',
                type: '配置项',
                desc: '生产者确认机制：0=不等待；1=leader 写入即返回；all/-1=全部 ISR 同步完成（推荐 all）',
                example: 'acks=all',
            },
            {
                key: 'retries',
                type: '配置项',
                desc: '发送失败重试次数（搭配 delivery.timeout.ms 控制总耗时）',
                example: 'retries=3',
            },
            {
                key: 'batch.size',
                type: '配置项',
                desc: '批量发送字节数阈值（ProducerBatch 满则立即发送）',
                example: '16384 (16KB)',
            },
            {
                key: 'linger.ms',
                type: '配置项',
                desc: '批量等待时间（毫秒），即使 batch 未满也最多等这么久',
                example: '5',
            },
            {
                key: 'compression.type',
                type: '配置项',
                desc: '压缩算法：none / gzip / snappy / lz4 / zstd（生产推荐 lz4 或 zstd）',
                example: 'lz4',
            },
            {
                key: 'enable.idempotence',
                type: '配置项',
                desc: '幂等性（生产不重），自动保证 exactly-once 语义。开启需 acks=all 且 retries>0',
                example: 'true',
            },
            {
                key: 'max.in.flight.requests.per.connection',
                type: '配置项',
                desc: '单连接最大未确认请求数（幂等模式下 ≤ 5 仍可保证顺序）',
                example: '5',
            },
            {
                key: 'buffer.memory',
                type: '配置项',
                desc: 'Producer 总缓冲区字节数（容纳所有分区的待发送消息）',
                example: '33554432 (32MB)',
            },
            {
                key: 'key.serializer',
                type: '配置项',
                desc: 'Key 序列化器（全限定类名）',
                example: 'org.apache.kafka.common.serialization.StringSerializer',
            },
            {
                key: 'value.serializer',
                type: '配置项',
                desc: 'Value 序列化器（全限定类名）',
                example: 'org.apache.kafka.common.serialization.StringSerializer',
            },
            {
                key: 'transactional.id',
                type: '配置项',
                desc: '事务 ID（开启事务必填，需全局唯一，用于故障恢复）',
                example: 'order-tx-producer-1',
            },
            {
                key: 'transaction.timeout.ms',
                type: '配置项',
                desc: '事务最大超时时间（毫秒），超过则被 Coordinator 中止',
                example: '60000',
            },
            {
                key: 'delivery.timeout.ms',
                type: '配置项',
                desc: '发送总超时（包含重试），默认 120000。retries 触发前提',
                example: '120000',
            },
            {
                key: 'partitioner.class',
                type: '配置项',
                desc: '自定义分区器（全限定类名），默认按 key 哈希',
                example: 'com.example.MyPartitioner',
            },
        ],
    },
    {
        cat: '消费者',
        items: [
            {
                key: 'group.id',
                type: '配置项',
                desc: '消费者组 ID（必填），决定 offset 提交归属',
                example: 'order-consumer-group',
            },
            {
                key: 'auto.offset.reset',
                type: '配置项',
                desc: '无 offset 时起点：earliest（最早）/ latest（最新）/ none（抛错）',
                example: 'earliest',
            },
            {
                key: 'enable.auto.commit',
                type: '配置项',
                desc: '是否自动提交 offset（生产推荐 false，手动控制）',
                example: 'false',
            },
            {
                key: 'auto.commit.interval.ms',
                type: '配置项',
                desc: '自动提交 offset 间隔（仅 enable.auto.commit=true 生效）',
                example: '5000',
            },
            {
                key: 'max.poll.records',
                type: '配置项',
                desc: '单次 poll 最大消息数（防止单次处理时间过长导致 rebalance）',
                example: '500',
            },
            {
                key: 'session.timeout.ms',
                type: '配置项',
                desc: '会话超时（毫秒），超时则被判定为死亡并触发 rebalance',
                example: '30000',
            },
            {
                key: 'heartbeat.interval.ms',
                type: '配置项',
                desc: '心跳间隔（毫秒），通常为 session.timeout.ms 的 1/3',
                example: '10000',
            },
            {
                key: 'max.poll.interval.ms',
                type: '配置项',
                desc: '两次 poll 最大间隔（毫秒），超过则被踢出 group',
                example: '300000',
            },
            {
                key: 'isolation.level',
                type: '配置项',
                desc: '事务隔离级别：read_uncommitted（默认）/ read_committed',
                example: 'read_committed',
            },
            {
                key: 'fetch.min.bytes',
                type: '配置项',
                desc: '单次 fetch 最小字节数（未达则等待，配合 fetch.max.wait.ms）',
                example: '1',
            },
            {
                key: 'fetch.max.bytes',
                type: '配置项',
                desc: '单次 fetch 最大字节数',
                example: '52428800 (50MB)',
            },
            {
                key: 'key.deserializer',
                type: '配置项',
                desc: 'Key 反序列化器（全限定类名）',
                example: 'org.apache.kafka.common.serialization.StringDeserializer',
            },
        ],
    },
    {
        cat: 'Topic',
        items: [
            {
                key: 'num.partitions',
                type: '配置项',
                desc: '分区数（影响并行度，生产推荐 2-3 倍 Broker 数）',
                example: '12',
            },
            {
                key: 'replication.factor',
                type: '配置项',
                desc: '副本数（生产环境 ≥ 3 保证可用性）',
                example: '3',
            },
            {
                key: 'retention.ms',
                type: '配置项',
                desc: '消息保留时间（毫秒），过期后清理（-1 表示永久）',
                example: '604800000 (7 天)',
            },
            {
                key: 'retention.bytes',
                type: '配置项',
                desc: '分区最大字节数（超出则从最旧 segment 开始删）',
                example: '1073741824 (1GB)',
            },
            {
                key: 'cleanup.policy',
                type: '配置项',
                desc: '清理策略：delete（按时间/大小）/ compact（按 key 压缩）',
                example: 'delete',
            },
            {
                key: 'segment.bytes',
                type: '配置项',
                desc: 'segment 文件大小（字节），超出则滚动新 segment',
                example: '1073741824 (1GB)',
            },
            {
                key: 'min.insync.replicas',
                type: '配置项',
                desc: '最小同步副本数（acks=all 时强制要求），影响数据可靠性',
                example: '2',
            },
            {
                key: 'compression.type (Topic)',
                type: '配置项',
                desc: 'Topic 级别的压缩算法（生产者 compression.type 默认继承）',
                example: 'producer (继承生产者)',
            },
        ],
    },
    {
        cat: 'Consumer Group',
        items: [
            {
                key: 'Consumer Group 概念',
                type: '概念',
                desc: '消费者组，多个 Consumer 分摊 Topic 分区（每分区只被同组一个 Consumer 消费）',
                example: 'Group A 包含 C1/C2/C3 三个 Consumer 共同消费 Topic-X 的 6 个分区',
            },
            {
                key: '再均衡 (Rebalance)',
                type: '概念',
                desc: '组成员变化（新增 / 退出 / 订阅变更）时重新分配分区，期间消费暂停',
                example: 'Consumer C3 加入 Group → 重新分配 6 个分区',
            },
            {
                key: 'Offset 提交',
                type: '概念',
                desc: '记录消费位置，默认存到内部 __consumer_offsets Topic',
                example: '__consumer_offsets 50 个分区，分区键 hash(groupId + topic + partition)',
            },
            {
                key: 'Group Coordinator',
                type: '概念',
                desc: '负责管理 Consumer Group 的 Broker 节点（由 groupId 哈希选定）',
                example: 'Coordinator 处理 JoinGroup / SyncGroup / Heartbeat',
            },
            {
                key: '位移重置',
                type: '概念',
                desc: 'auto.offset.reset 仅在无有效 offset 时生效；可使用 kafka-consumer-groups.sh 手动重置',
                example: 'kafka-consumer-groups.sh --reset-offsets --to-earliest',
            },
        ],
    },
    {
        cat: '概念',
        items: [
            {
                key: 'ISR',
                type: '概念',
                desc: 'In-Sync Replicas：与 Leader 保持同步的副本集合（含 Leader）',
                example: 'replica.lag.time.max.ms=30000 控制 ISR 进出',
            },
            {
                key: 'HW (High Watermark)',
                type: '概念',
                desc: '高水位，Consumer 可见的最大 offset（小于等于所有 ISR 中最小 LEO）',
                example: 'Consumer 只能拉取到 HW 之前的消息',
            },
            {
                key: 'LEO (Log End Offset)',
                type: '概念',
                desc: '日志末端 offset，下一条消息写入位置',
                example: '每个副本都有自己的 LEO',
            },
            {
                key: 'ZooKeeper / KRaft',
                type: '概念',
                desc: 'Kafka 集群元数据管理。3.3+ KRaft 已生产可用，逐步替代 ZK',
                example: 'process.roles=broker,controller 启用 KRaft 模式',
            },
            {
                key: 'Exactly Once 语义',
                type: '概念',
                desc: '幂等生产者 + 事务 + read_committed 消费者 = 端到端精确一次',
                example: 'producer.initTransactions() → beginTransaction() → commitTransaction()',
            },
        ],
    },
];

const RABBITMQ_REF = [
    {
        cat: 'Exchange',
        items: [
            {
                key: 'direct',
                type: '类型',
                desc: '完全匹配 routing key（精确路由）',
                example: 'routing key = "order.created" 仅路由到绑定 key 的队列',
            },
            {
                key: 'topic',
                type: '类型',
                desc: '模式匹配 routing key：* 匹配一个词，# 匹配零或多个词',
                example: 'order.* 匹配 order.created；order.# 匹配 order.created.refund',
            },
            {
                key: 'fanout',
                type: '类型',
                desc: '广播到所有绑定队列（忽略 routing key）',
                example: '日志广播场景：所有订阅队列都能收到',
            },
            {
                key: 'headers',
                type: '类型',
                desc: '基于 headers 匹配（不依赖 routing key，性能较差）',
                example: '匹配 x-match=all + header1=value1',
            },
        ],
    },
    {
        cat: 'Queue',
        items: [
            {
                key: 'durable',
                type: '属性',
                desc: '队列持久化（Broker 重启不丢失，需配合消息持久化）',
                example: 'true',
            },
            {
                key: 'exclusive',
                type: '属性',
                desc: '排他队列（仅当前连接可用，连接关闭即删除）',
                example: 'false',
            },
            {
                key: 'auto-delete',
                type: '属性',
                desc: '最后一个消费者断开后自动删除',
                example: 'false',
            },
            {
                key: 'x-message-ttl',
                type: '属性',
                desc: '消息 TTL（毫秒），过期则被丢弃或转死信',
                example: '60000',
            },
            {
                key: 'x-max-length',
                type: '属性',
                desc: '最大消息数（超出后从头部丢弃最旧消息）',
                example: '10000',
            },
            {
                key: 'x-dead-letter-exchange',
                type: '属性',
                desc: '死信交换机（处理失败 / 过期 / 拒收消息）',
                example: 'dlx-exchange',
            },
        ],
    },
    {
        cat: '消息可靠性',
        items: [
            {
                key: 'Publisher Confirm',
                type: '机制',
                desc: '生产者确认（替代 AMQP 事务，性能更好）',
                example: 'channel.confirmSelect() 后 channel.waitForConfirms()',
            },
            {
                key: 'Consumer ACK',
                type: '机制',
                desc: '消费者手动确认（multiple=true 表示批量确认之前所有）',
                example: 'channel.basicAck(deliveryTag, false)\nchannel.basicNack(deliveryTag, false, requeue)',
            },
            {
                key: '死信队列 (DLX)',
                type: '机制',
                desc: '处理失败或过期消息（消费拒绝 + requeue=false 触发）',
                example: 'DLX + DLQ 实现延迟重试 + 失败兜底',
            },
            {
                key: '幂等性',
                type: '机制',
                desc: '业务层防重（消息可能重复投递：confirm 重发 + 消费重试）',
                example: '唯一 ID + 数据库唯一索引；或 Redis SETNX',
            },
        ],
    },
    {
        cat: '其他',
        items: [
            {
                key: 'Virtual Host',
                type: '概念',
                desc: '虚拟主机（逻辑隔离，不同 vhost 互不影响）',
                example: '每个应用独立 vhost：/order、/payment',
            },
            {
                key: 'Channel',
                type: '概念',
                desc: '信道（TCP 连接中的逻辑通道，复用连接提升性能）',
                example: '1 个 Connection 多 Channel，避免频繁建立 TCP',
            },
            {
                key: 'Routing Key',
                type: '概念',
                desc: '路由键（direct/topic 模式匹配依据）',
                example: 'routing key = "order.paid"',
            },
            {
                key: 'Binding',
                type: '概念',
                desc: 'Exchange 与 Queue 的绑定关系（含 routing key 或 headers）',
                example: 'exchange.bind(queue, "order.#")',
            },
            {
                key: 'Message TTL',
                type: '属性',
                desc: '单条消息 TTL（通过 expiration 属性或 x-message-ttl）',
                example: 'AMQP.BasicProperties.expiration = "60000"',
            },
            {
                key: 'Lazy Queue',
                type: '属性',
                desc: '惰性队列（消息直接落盘，消费时再加载，减少内存占用）',
                example: '队列声明参数 x-queue-mode=lazy',
            },
        ],
    },
];

const ROCKETMQ_REF = [
    {
        cat: 'Producer',
        items: [
            {
                key: 'NamesrvAddr',
                type: '配置项',
                desc: 'NameServer 地址（集群模式用 ; 分隔）',
                example: 'localhost:9876',
            },
            {
                key: 'ProducerGroup',
                type: '配置项',
                desc: '生产者组（必须设置，事务消息必填）',
                example: 'order-producer-group',
            },
            {
                key: 'SendMsgTimeout',
                type: '配置项',
                desc: '发送超时（毫秒）',
                example: '10000',
            },
            {
                key: 'RetryTimesWhenSendFailed',
                type: '配置项',
                desc: '同步发送失败重试次数（默认 2）',
                example: '3',
            },
            {
                key: 'CompressMsgBodyOverHowmuch',
                type: '配置项',
                desc: '消息体超过此字节数则压缩（默认 4096）',
                example: '4096',
            },
        ],
    },
    {
        cat: 'Consumer',
        items: [
            {
                key: 'ConsumerGroup',
                type: '配置项',
                desc: '消费者组（必须设置）',
                example: 'order-consumer-group',
            },
            {
                key: 'MessageModel',
                type: '配置项',
                desc: '消费模式：CLUSTERING（集群消费，负载均衡）/ BROADCASTING（广播）',
                example: 'CLUSTERING',
            },
            {
                key: 'ConsumeFromWhere',
                type: '配置项',
                desc: '起始消费位：CONSUME_FROM_FIRST_OFFSET / CONSUME_FROM_LAST_OFFSET / CONSUME_FROM_TIMESTAMP',
                example: 'CONSUME_FROM_FIRST_OFFSET',
            },
            {
                key: 'MaxReconsumeTimes',
                type: '配置项',
                desc: '最大重试次数（超过后入死信队列 %DLQ%ConsumerGroup）',
                example: '16',
            },
        ],
    },
    {
        cat: 'Broker',
        items: [
            {
                key: 'brokerClusterName',
                type: '配置项',
                desc: '集群名称（默认 DefaultCluster）',
                example: 'DefaultCluster',
            },
            {
                key: 'brokerName',
                type: '配置项',
                desc: 'Broker 名称（同集群内唯一）',
                example: 'broker-a',
            },
            {
                key: 'brokerId',
                type: '配置项',
                desc: 'Broker ID：0=Master，>0=Slave',
                example: '0',
            },
            {
                key: 'listenPort',
                type: '配置项',
                desc: 'Broker 监听端口（默认 10911）',
                example: '10911',
            },
            {
                key: 'storePathRootDir',
                type: '配置项',
                desc: '数据存储根目录（commitlog / consumequeue 等）',
                example: '/opt/rocketmq/store',
            },
        ],
    },
    {
        cat: '消息模型',
        items: [
            {
                key: 'Topic',
                type: '概念',
                desc: '消息主题（一类业务消息的分类）',
                example: 'OrderTopic、PaymentTopic',
            },
            {
                key: 'Tag',
                type: '概念',
                desc: '消息子分类（用于二级过滤，建议与业务子类型绑定）',
                example: 'TagA=order.created、TagB=order.paid',
            },
            {
                key: 'MessageQueue',
                type: '概念',
                desc: '消息队列（Topic 的物理分片，顺序消息按 Queue 保证顺序）',
                example: 'OrderTopic 有 4 个 MessageQueue',
            },
            {
                key: '顺序消息',
                type: '概念',
                desc: '全局顺序（单 Broker 单 Queue）/ 分区顺序（同一业务 Key 路由到同 Queue）',
                example: 'MessageQueueSelector 选 Queue 保证同一订单号顺序',
            },
            {
                key: '事务消息',
                type: '概念',
                desc: '两阶段提交：Half(预提交) → 本地事务 → Commit/Rollback，支持回查机制',
                example: '订单创建 + 库存扣减（本地事务）',
            },
            {
                key: 'NameServer',
                type: '概念',
                desc: '轻量级注册中心（管理 Broker 路由信息，无状态，可集群部署）',
                example: 'Broker 启动后向所有 NameServer 注册心跳',
            },
        ],
    },
];

const MQ_TAB_DATA = {
    kafka: KAFKA_REF,
    rabbitmq: RABBITMQ_REF,
    rocketmq: ROCKETMQ_REF,
};

const MQ_TAB_LABELS = {
    kafka: 'Kafka',
    rabbitmq: 'RabbitMQ',
    rocketmq: 'RocketMQ',
};

let _mqrefCurrentTab = 'kafka';
let _mqrefCurrentCat = '全部';
let _mqrefSearchTimer = null;

function mqrefItemMatches(it, q) {
    if (!q) return true;
    if (it.key.toLowerCase().includes(q)) return true;
    if (it.type.toLowerCase().includes(q)) return true;
    if (it.desc.toLowerCase().includes(q)) return true;
    if (it.example && it.example.toLowerCase().includes(q)) return true;
    return false;
}

function mqrefBuildCard(item) {
    const card = document.createElement('div');
    card.className = 'mqref-card';

    const head = document.createElement('div');
    head.className = 'mqref-head';

    const key = document.createElement('code');
    key.className = 'mqref-key';
    key.textContent = item.key;
    head.appendChild(key);

    const type = document.createElement('span');
    type.className = 'mqref-type';
    type.textContent = item.type;
    head.appendChild(type);

    const copyBtn = document.createElement('button');
    copyBtn.className = 'mqref-copy-btn';
    copyBtn.textContent = '复制';
    copyBtn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        const text = item.example || item.key;
        const display = text.length > 30 ? text.slice(0, 30) + '...' : text;
        safeCopy(text, '已复制: ' + display);
    });
    head.appendChild(copyBtn);

    card.appendChild(head);

    const desc = document.createElement('div');
    desc.className = 'mqref-desc';
    desc.textContent = item.desc;
    card.appendChild(desc);

    if (item.example) {
        const ex = document.createElement('div');
        ex.className = 'mqref-example';
        ex.textContent = item.example;
        card.appendChild(ex);
    }

    return card;
}

function mqrefRender(filter) {
    if (filter === undefined) {
        const el = document.getElementById('mqrefSearch');
        filter = el ? el.value : '';
    }
    filter = (filter || '').toLowerCase().trim();

    const data = MQ_TAB_DATA[_mqrefCurrentTab] || [];
    const catsWrap = document.getElementById('mqrefCats');
    const container = document.getElementById('mqrefList');
    if (!container) return;

    if (catsWrap) {
        catsWrap.innerHTML = '';
        const cats = ['全部', ...data.map((g) => g.cat)];
        cats.forEach((c) => {
            const btn = document.createElement('button');
            btn.className = 'sm outline' + (c === _mqrefCurrentCat ? ' active' : '');
            btn.dataset.cat = c;
            btn.textContent = c;
            btn.addEventListener('click', function () {
                mqrefFilter(c);
            });
            catsWrap.appendChild(btn);
        });
    }

    container.innerHTML = '';
    let hasResult = false;
    data.forEach((group) => {
        if (_mqrefCurrentCat !== '全部' && group.cat !== _mqrefCurrentCat) return;
        const matched = filter ? group.items.filter((it) => mqrefItemMatches(it, filter)) : group.items;
        if (matched.length === 0) return;
        hasResult = true;
        const h = document.createElement('div');
        h.style.cssText =
            'font-size:13px;font-weight:600;color:var(--accent);padding:10px 0 6px;border-bottom:1px solid var(--border);margin-bottom:4px';
        h.textContent = group.cat;
        container.appendChild(h);
        matched.forEach((item) => {
            container.appendChild(mqrefBuildCard(item));
        });
    });
    if (!hasResult) {
        container.innerHTML = '<div style="color:var(--text-dim);padding:20px;text-align:center">无匹配结果</div>';
    }
}

function mqrefSwitchTab(tab) {
    if (!MQ_TAB_DATA[tab]) return;
    _mqrefCurrentTab = tab;
    _mqrefCurrentCat = '全部';
    const tabsEl = document.getElementById('mqrefTabs');
    if (tabsEl) {
        tabsEl.querySelectorAll('button').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
    }
    const searchEl = document.getElementById('mqrefSearch');
    if (searchEl) searchEl.value = '';
    mqrefRender();
    const _c = document.getElementById('mqrefList');
    if (_c) _c.scrollTop = 0;
}

function mqrefSearch() {
    clearTimeout(_mqrefSearchTimer);
    _mqrefSearchTimer = setTimeout(function () {
        mqrefRender();
    }, 200);
}

function mqrefFilter(cat) {
    _mqrefCurrentCat = cat;
    const tabs = document.querySelectorAll('#mqrefCats button');
    tabs.forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.cat === cat);
    });
    mqrefRender();
    const _c = document.getElementById('mqrefList');
    if (_c) _c.scrollTop = 0;
}

registerInit('mqref', mqrefRender);
