const SPRING_CLOUD = [
    {
        cat: 'Nacos',
        items: [
            {
                key: '@EnableDiscoveryClient',
                type: '注解',
                desc: '启用服务发现客户端（推荐替代旧版 @EnableEurekaClient）',
                example:
                    '@SpringBootApplication\n@EnableDiscoveryClient\npublic class OrderApp {\n    public static void main(String[] args) {\n        SpringApplication.run(OrderApp.class, args);\n    }\n}',
            },
            {
                key: '@NacosValue',
                type: '注解',
                desc: '注入 Nacos 配置中心属性（类似 @Value，支持热更新）',
                example: '@NacosValue(value = "${app.timeout:5000}", autoRefreshed = true)\nprivate int timeout;',
            },
            {
                key: '@NacosInjected',
                type: '注解',
                desc: '注入 Nacos NamingService 用于服务注册 / 发现',
                example:
                    '@NacosInjected\nprivate NamingService namingService;\n\nnamingService.registerInstance("order-service", "192.168.1.10", 8080);',
            },
            {
                key: '@NacosConfigurationProperties',
                type: '注解',
                desc: '批量绑定 Nacos 配置到 POJO（推荐替代 @Value）',
                example:
                    '@NacosConfigurationProperties(dataId = "user-service.yaml", prefix = "user")\npublic class UserProperties {\n    private int timeout;\n    private String region;\n}',
            },
            {
                key: '@NacosPropertySource',
                type: '注解',
                desc: '声明从 Nacos 加载的配置源（自动监听变更）',
                example:
                    '@NacosPropertySource(dataId = "common.yaml", groupId = "DEFAULT_GROUP", autoRefreshed = true)',
            },
            {
                key: 'spring.cloud.nacos.discovery.server-addr',
                type: '配置项',
                desc: 'Nacos 注册中心地址（必填）',
                example: '127.0.0.1:8848',
            },
            {
                key: 'spring.cloud.nacos.config.server-addr',
                type: '配置项',
                desc: 'Nacos 配置中心地址',
                example: '127.0.0.1:8848',
            },
            {
                key: 'spring.cloud.nacos.config.file-extension',
                type: '配置项',
                desc: '配置文件后缀（推荐 yaml / properties）',
                example: 'yaml',
            },
            {
                key: 'spring.cloud.nacos.discovery.namespace',
                type: '配置项',
                desc: '注册中心命名空间 ID（用于环境隔离）',
                example: 'public',
            },
            {
                key: 'spring.cloud.nacos.config.namespace',
                type: '配置项',
                desc: '配置中心命名空间 ID（常用 dev / test / prod 隔离）',
                example: 'dev-namespace-uuid',
            },
            {
                key: 'spring.cloud.nacos.discovery.group',
                type: '配置项',
                desc: '服务分组（默认 DEFAULT_GROUP）',
                example: 'DEFAULT_GROUP',
            },
            {
                key: 'spring.cloud.nacos.discovery.weight',
                type: '配置项',
                desc: '服务实例权重（范围 1~100，配合负载均衡）',
                example: '1.0',
            },
        ],
    },
    {
        cat: 'Sentinel',
        items: [
            {
                key: '@SentinelResource',
                type: '注解',
                desc: '标记受保护资源，支持 fallback / blockHandler 自定义处理',
                example:
                    '@SentinelResource(\n    value = "getOrder",\n    fallback = "fallbackMethod",\n    blockHandler = "blockHandlerMethod"\n)\npublic Order getOrder(Long id) { ... }',
            },
            {
                key: '@SentinelDataSource',
                type: '注解',
                desc: '声明 Sentinel 规则数据源（Nacos / Apollo / 文件）',
                example:
                    '@SentinelDataSource(\n    ruleType = RuleType.FLOW,\n    dataSource = @NacosDataSource(\n        serverAddr = "127.0.0.1:8848",\n        dataId = "flow-rules"\n    )\n)',
            },
            {
                key: '@SentinelRestTemplate',
                type: '注解',
                desc: '为 RestTemplate Bean 注入 Sentinel 拦截器（限流 / 熔断）',
                example:
                    '@Bean\n@SentinelRestTemplate(blockHandler = "handleBlock", fallback = "handleFallback")\npublic RestTemplate restTemplate() {\n    return new RestTemplate();\n}',
            },
            {
                key: 'spring.cloud.sentinel.transport.dashboard',
                type: '配置项',
                desc: 'Sentinel Dashboard 控制台地址',
                example: 'localhost:8080',
            },
            {
                key: 'spring.cloud.sentinel.transport.port',
                type: '配置项',
                desc: '应用与 Dashboard 通信端口（默认 8719）',
                example: '8719',
            },
            {
                key: 'spring.cloud.sentinel.transport.heartbeatIntervalMs',
                type: '配置项',
                desc: '心跳间隔（毫秒），用于 Dashboard 检测应用存活',
                example: '5000',
            },
            {
                key: 'spring.cloud.sentinel.eager',
                type: '配置项',
                desc: '是否提前初始化（默认 false，推荐 true 加快首次请求）',
                example: 'true',
            },
            {
                key: 'spring.cloud.sentinel.flow.rules',
                type: '配置项',
                desc: '流控规则（QPS / 并发线程数模式）',
                example: 'flow-rules',
            },
            {
                key: 'spring.cloud.sentinel.degrade.rules',
                type: '配置项',
                desc: '熔断降级规则（慢调用 / 异常比 / 异常数）',
                example: 'degrade-rules',
            },
            {
                key: 'BlockException',
                type: '概念',
                desc: '触发限流 / 降级时抛出的异常（含 FlowException / DegradeException 子类）',
                example: 'try {\n    // 业务\n} catch (BlockException e) {\n    return "被限流了";\n}',
            },
            {
                key: 'Sentinel Dashboard',
                type: '组件',
                desc: 'Sentinel 可视化控制台（规则配置 + 实时监控）',
                example: 'java -jar sentinel-dashboard-1.8.6.jar',
            },
            {
                key: 'SentinelRuleConstant',
                type: '概念',
                desc: '流控效果常量：FAIL_FAST（快速失败） / WARM_UP（冷启动） / QUEUEING（排队等待）',
                example:
                    'FlowRule rule = new FlowRule("getOrder");\nrule.setControlBehavior(RuleConstant.CONTROL_BEHAVIOR_WARM_UP);',
            },
        ],
    },
    {
        cat: 'Seata',
        items: [
            {
                key: '@GlobalTransactional',
                type: '注解',
                desc: '开启全局事务（AT 模式默认），name 必须唯一',
                example:
                    '@GlobalTransactional(\n    name = "create-order-tx",\n    rollbackFor = Exception.class,\n    timeoutMills = 30000\n)\npublic void createOrder(OrderDTO dto) { ... }',
            },
            {
                key: '@GlobalLock',
                type: '注解',
                desc: '全局锁（用于 SELECT ... FOR UPDATE 等需要 SELECT 锁的场景）',
                example: '@GlobalLock\npublic Order findById(Long id) {\n    return orderMapper.selectById(id);\n}',
            },
            {
                key: '@Transactional',
                type: '注解',
                desc: '本地事务注解（Seata 分支事务自动注册到全局事务）',
                example:
                    '@Transactional(rollbackFor = Exception.class)\npublic void updateStock(Long id) {\n    stockMapper.update(id);\n}',
            },
            {
                key: '@TwoPCBusinessAction',
                type: '概念',
                desc: 'TCC 模式下的 Try 阶段注解（需指定 commitMethod / rollbackMethod）',
                example:
                    '@TwoPCBusinessAction(name = "deductStock", commitMethod = "commit", rollbackMethod = "rollback")\npublic boolean prepare(BusinessActionContext ctx, Long productId, Integer count) { ... }',
            },
            {
                key: 'seata.tx-service-group',
                type: '配置项',
                desc: '事务服务分组（客户端与服务端必须一致）',
                example: 'my_test_tx_group',
            },
            {
                key: 'seata.service.vgroup-mapping',
                type: '配置项',
                desc: '事务分组与集群映射',
                example: 'my_test_tx_group: default',
            },
            {
                key: 'seata.registry.type',
                type: '配置项',
                desc: '注册中心类型（nacos / eureka / redis / file）',
                example: 'nacos',
            },
            {
                key: 'AT 模式',
                type: '概念',
                desc: 'Auto Transaction，基于 undo_log 自动补偿，零侵入（推荐）',
                example: 'AT 模式 = 自动生成前镜像 + 后镜像 + 异常回滚 SQL',
            },
            {
                key: 'TCC 模式',
                type: '概念',
                desc: 'Try / Confirm / Cancel 三阶段手动实现，性能高但侵入性强',
                example: 'TCC = Try 预留资源 → Confirm 确认 → Cancel 取消',
            },
            {
                key: 'TC / TM / RM',
                type: '概念',
                desc: 'TC 事务协调者 / TM 事务管理器 / RM 资源管理器',
                example: 'TM 发起全局事务 → RM 注册分支 → TC 协调回滚',
            },
        ],
    },
    {
        cat: 'Gateway',
        items: [
            {
                key: 'spring.cloud.gateway.routes[].id',
                type: '配置项',
                desc: '路由唯一标识',
                example: 'order-service-route',
            },
            {
                key: 'spring.cloud.gateway.routes[].uri',
                type: '配置项',
                desc: '目标服务 URI（支持 lb:// 服务发现 或 http(s):// 固定地址）',
                example: 'lb://order-service',
            },
            {
                key: 'spring.cloud.gateway.routes[].predicates',
                type: '配置项',
                desc: '路由断言（满足条件才匹配），支持 Path / Method / Header / Query 等',
                example: '- Path=/order/**\n- Method=GET,POST',
            },
            {
                key: 'spring.cloud.gateway.routes[].filters',
                type: '配置项',
                desc: '路由过滤器（StripPrefix / AddRequestHeader / RewritePath 等）',
                example: '- StripPrefix=1\n- AddRequestHeader=X-Request-Id,${uuid}',
            },
            {
                key: 'spring.cloud.gateway.discovery.locator.enabled',
                type: '配置项',
                desc: '根据服务注册中心自动创建路由（开发用，生产建议 false）',
                example: 'true',
            },
            {
                key: 'spring.cloud.gateway.globalcors.cors-configurations',
                type: '配置项',
                desc: '全局 CORS 配置（按需放开跨域）',
                example: 'allowedOriginPatterns: "*"\nallowedMethods: "*"\nallowedHeaders: "*"',
            },
            {
                key: 'GlobalFilter 自定义',
                type: '组件',
                desc: '实现 GlobalFilter 接口添加全局过滤器（如鉴权 / 日志）',
                example:
                    '@Component\npublic class AuthFilter implements GlobalFilter, Ordered {\n    @Override\n    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {\n        // 鉴权逻辑\n        return chain.filter(exchange);\n    }\n    @Override public int getOrder() { return -100; }\n}',
            },
            {
                key: 'GatewayFilterFactory',
                type: '概念',
                desc: '局部过滤器工厂（按路由生效），自定义需继承 AbstractGatewayFilterFactory',
                example:
                    '@Component\npublic class CacheGatewayFilterFactory extends AbstractGatewayFilterFactory<Config> { ... }',
            },
            {
                key: 'PredicateFactory',
                type: '概念',
                desc: '断言工厂，用于判断请求是否匹配路由（Path / Host / Method 等）',
                example: '- Path=/api/**  →  PathRoutePredicateFactory',
            },
            {
                key: '@Order',
                type: '注解',
                desc: '过滤器执行顺序（数值越小越靠前），全局过滤器必实现 Ordered',
                example:
                    '@Component\npublic class LogFilter implements GlobalFilter, Ordered {\n    @Override public int getOrder() { return Ordered.HIGHEST_PRECEDENCE; }\n}',
            },
        ],
    },
    {
        cat: 'OpenFeign',
        items: [
            {
                key: '@EnableFeignClients',
                type: '注解',
                desc: '启用 Feign 客户端扫描（通常放主类或配置类）',
                example:
                    '@SpringBootApplication\n@EnableFeignClients(basePackages = "com.example.api")\npublic class OrderApp { }',
            },
            {
                key: '@FeignClient',
                type: '注解',
                desc: '声明 Feign 客户端接口，name 为服务名',
                example:
                    '@FeignClient(\n    name = "order-service",\n    path = "/api/order",\n    fallbackFactory = OrderFallbackFactory.class\n)\npublic interface OrderClient {\n    @GetMapping("/{id}")\n    Order getById(@PathVariable Long id);\n}',
            },
            {
                key: '@RequestLine / @Param',
                type: '注解',
                desc: 'Feign 自定义注解（用于非 Spring MVC 风格接口）',
                example:
                    'public interface GitHubClient {\n    @RequestLine("GET /repos/{owner}/{repo}")\n    Repo getRepo(@Param("owner") String owner, @Param("repo") String repo);\n}',
            },
            {
                key: 'feign.client.config.default.connectTimeout',
                type: '配置项',
                desc: '连接超时（毫秒，默认 10s）',
                example: '5000',
            },
            {
                key: 'feign.client.config.default.readTimeout',
                type: '配置项',
                desc: '读取超时（毫秒，默认 60s）',
                example: '10000',
            },
            {
                key: 'feign.sentinel.enabled',
                type: '配置项',
                desc: '启用 Sentinel 集成（熔断降级，替代 Hystrix）',
                example: 'true',
            },
            {
                key: 'feign.compression.request.enabled',
                type: '配置项',
                desc: '启用请求压缩（GZIP）',
                example: 'true',
            },
            {
                key: 'feign.compression.response.enabled',
                type: '配置项',
                desc: '启用响应压缩（GZIP）',
                example: 'true',
            },
            {
                key: 'feign.logger.level',
                type: '配置项',
                desc: '日志级别：NONE / BASIC / HEADERS / FULL',
                example: 'FULL',
            },
            {
                key: 'RequestInterceptor',
                type: '概念',
                desc: 'Feign 请求拦截器（统一添加 Header / Token / TraceId）',
                example:
                    '@Component\npublic class FeignAuthInterceptor implements RequestInterceptor {\n    @Override\n    public void apply(RequestTemplate template) {\n        template.header("Authorization", "Bearer " + token);\n    }\n}',
            },
        ],
    },
    {
        cat: 'Sleuth',
        items: [
            {
                key: 'Trace ID',
                type: '概念',
                desc: '完整请求链的唯一标识（跨服务透传，用于日志串联）',
                example: 'traceId=abc123def456',
            },
            {
                key: 'Span ID',
                type: '概念',
                desc: '单个服务内某个操作的标识（同一 Trace 下多个 Span 串联）',
                example: 'spanId=def456',
            },
            {
                key: 'Parent Span ID',
                type: '概念',
                desc: '父级 Span ID，构成调用树形结构',
                example: 'parentId=789abc',
            },
            {
                key: 'spring.sleuth.sampler.probability',
                type: '配置项',
                desc: '采样率（1.0 = 100%，生产环境建议 0.1）',
                example: '0.1',
            },
            {
                key: 'spring.zipkin.base-url',
                type: '配置项',
                desc: 'Zipkin 服务端地址（用于链路追踪可视化）',
                example: 'http://localhost:9411',
            },
            {
                key: 'spring.zipkin.discovery-client-enabled',
                type: '配置项',
                desc: '从注册中心自动发现 Zipkin 地址',
                example: 'true',
            },
            {
                key: 'MDC 集成',
                type: '概念',
                desc: 'Sleuth 自动将 traceId / spanId 写入 MDC，可在日志格式中输出',
                example: 'logging.pattern.level: "%5p [${spring.application.name:},%X{traceId:-},%X{spanId:-}]"',
            },
            {
                key: 'spring.sleuth.async.enabled',
                type: '配置项',
                desc: '启用异步任务埋点（@Async / CompletableFuture）',
                example: 'true',
            },
        ],
    },
];

let _springcloudSearchTimer = null;
let _springcloudCurrentCat = 'all';

function springcloudRender(filter) {
    if (filter === undefined) {
        const el = document.getElementById('springcloudSearch');
        filter = el ? el.value : '';
    }
    filter = (filter || '').toLowerCase().trim();
    const container = document.getElementById('springcloudContent');
    if (!container) return;
    container.innerHTML = '';
    let hasResult = false;
    SPRING_CLOUD.forEach((group) => {
        if (_springcloudCurrentCat !== 'all' && group.cat !== _springcloudCurrentCat) return;
        const matched = filter ? group.items.filter((it) => springcloudItemMatches(it, filter)) : group.items;
        if (matched.length === 0) return;
        hasResult = true;
        const h = document.createElement('div');
        h.style.cssText =
            'font-size:13px;font-weight:600;color:var(--accent);padding:10px 0 6px;border-bottom:1px solid var(--border);margin-bottom:4px';
        h.textContent = group.cat;
        container.appendChild(h);
        matched.forEach((item) => {
            container.appendChild(springcloudBuildCard(item));
        });
    });
    if (!hasResult) {
        container.innerHTML = '<div style="color:var(--text-dim);padding:20px;text-align:center">无匹配结果</div>';
    }
}

function springcloudItemMatches(it, q) {
    if (!q) return true;
    if (it.key.toLowerCase().includes(q)) return true;
    if (it.type.toLowerCase().includes(q)) return true;
    if (it.desc.toLowerCase().includes(q)) return true;
    if (it.example && it.example.toLowerCase().includes(q)) return true;
    return false;
}

function springcloudBuildCard(item) {
    const card = document.createElement('div');
    card.className = 'springcloud-card';

    const head = document.createElement('div');
    head.className = 'springcloud-head';

    const key = document.createElement('code');
    key.className = 'springcloud-key';
    key.textContent = item.key;
    head.appendChild(key);

    const type = document.createElement('span');
    type.className = 'springcloud-type springcloud-type-' + item.type;
    type.textContent = item.type;
    head.appendChild(type);

    const copyBtn = document.createElement('button');
    copyBtn.className = 'springcloud-copy-btn';
    copyBtn.textContent = '复制示例';
    copyBtn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        const text = item.example || item.key;
        const msg = '已复制: ' + (text.length > 30 ? text.slice(0, 30) + '...' : text);
        safeCopy(text, msg);
    });
    head.appendChild(copyBtn);

    card.appendChild(head);

    const desc = document.createElement('div');
    desc.className = 'springcloud-desc';
    desc.textContent = item.desc;
    card.appendChild(desc);

    if (item.example) {
        const ex = document.createElement('div');
        ex.className = 'springcloud-example';
        ex.textContent = item.example;
        card.appendChild(ex);
    }

    return card;
}

function springcloudSearch() {
    clearTimeout(_springcloudSearchTimer);
    _springcloudSearchTimer = setTimeout(function () {
        springcloudRender();
    }, 200);
}

function springcloudFilter(cat) {
    _springcloudCurrentCat = cat;
    const tabs = document.querySelectorAll('#springcloudTabs button');
    tabs.forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.cat === cat);
    });
    springcloudRender();
    const _c = document.getElementById('springcloudContent');
    if (_c) _c.scrollTop = 0;
}

registerInit('springcloud', springcloudRender);
