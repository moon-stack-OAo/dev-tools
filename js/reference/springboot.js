const SPRINGBOOT_DATA = [
    {
        cat: '启动与配置',
        items: [
            {ann: '@SpringBootApplication', desc: '复合注解：@Configuration + @EnableAutoConfiguration + @ComponentScan'},
            {ann: '@SpringBootConfiguration', desc: '标识一个 Spring Boot 配置类'},
            {ann: '@EnableAutoConfiguration', desc: '开启 Spring Boot 自动配置机制'},
            {ann: '@ComponentScan(basePackages = "...")', desc: '组件扫描，默认扫描当前包及子包'},
            {ann: '@Configuration', desc: '声明配置类（相当于传统 xml <beans>）'},
            {ann: '@Bean', desc: '方法级别，标注返回值注册为 Spring 容器 Bean'},
            {ann: '@Import', desc: '导入其他配置类 / ImportSelector 实现'},
            {ann: '@PropertySource("classpath:app.properties")', desc: '加载 .properties 文件到 Environment'},
            {ann: '@Value("${key}")', desc: '注入单个配置值（支持 SpEL：#{...}）'},
            {ann: '@ConfigurationProperties(prefix = "app")', desc: '批量绑定配置到 POJO（需配合 @EnableConfigurationProperties）'},
            {ann: '@EnableConfigurationProperties(UserProps.class)', desc: '启用 @ConfigurationProperties Bean'},
        ]
    },
    {
        cat: 'Web (Spring MVC)',
        items: [
            {ann: '@RestController', desc: '@Controller + @ResponseBody，返回 JSON'},
            {ann: '@Controller', desc: '控制器，方法返回视图名（前后端不分离时用）'},
            {ann: '@RequestMapping("/path")', desc: '通用请求映射，可指定 method / params / headers'},
            {ann: '@GetMapping("/list")', desc: 'GET 请求映射'},
            {ann: '@PostMapping("/save")', desc: 'POST 请求映射'},
            {ann: '@PutMapping("/update")', desc: 'PUT 请求映射'},
            {ann: '@DeleteMapping("/{id}")', desc: 'DELETE 请求映射'},
            {ann: '@PatchMapping("/patch")', desc: 'PATCH 请求映射'},
            {ann: '@PathVariable("id") Long id', desc: '获取 URL 路径变量 /users/{id}'},
            {ann: '@RequestParam("name") String n', desc: '获取查询参数 ?name=xx'},
            {ann: '@RequestBody User user', desc: '获取 JSON / XML 请求体并反序列化'},
            {ann: '@RequestHeader("User-Agent")', desc: '获取请求头'},
            {ann: '@CookieValue("token")', desc: '获取 Cookie 值'},
            {ann: '@ResponseBody', desc: '直接返回数据，跳过视图解析'},
            {ann: '@CrossOrigin(origins = "*")', desc: '开启 CORS；也可通过 WebMvcConfigurer 全局配置'},
        ]
    },
    {
        cat: '依赖注入',
        items: [
            {ann: '@Autowired', desc: 'Spring 自动按类型注入（required = false 可允许为 null）'},
            {ann: '@Qualifier("userService")', desc: '指定 Bean 名称，解决同类型多 Bean'},
            {ann: '@Resource(name = "...")', desc: 'JSR-250 标准，按名称注入（不推荐 Spring 项目中混用）'},
            {ann: '@Primary', desc: '同类型多 Bean 时优先注入'},
            {ann: '@Service', desc: '业务层组件，Spring 自动扫描注册'},
            {ann: '@Repository', desc: '持久层组件，封装部分平台异常'},
            {ann: '@Component', desc: '通用组件，Spring 自动扫描注册'},
            {ann: '@Scope("prototype" / "singleton" / "request" / "session")', desc: 'Bean 作用域'},
        ]
    },
    {
        cat: 'AOP 切面',
        items: [
            {ann: '@Aspect', desc: '声明切面类，配合 @Component 使用'},
            {ann: '@Pointcut("execution(* com..*.*(..))")', desc: '定义切点表达式'},
            {ann: '@Before("pointcut()")', desc: '前置通知'},
            {ann: '@After("pointcut()")', desc: '后置通知（无论是否异常）'},
            {ann: '@Around("pointcut()")', desc: '环绕通知，可控制是否执行目标方法'},
            {ann: '@AfterReturning("pointcut()", returning = "ret")', desc: '返回通知'},
            {ann: '@AfterThrowing("pointcut()", throwing = "ex")', desc: '异常通知'},
        ]
    },
    {
        cat: '事务管理',
        items: [
            {ann: '@Transactional', desc: '声明事务（默认 REQUIRED 传播，RuntimeException 回滚）'},
            {ann: '@Transactional(propagation = Propagation.REQUIRES_NEW)', desc: '指定传播行为'},
            {ann: '@Transactional(isolation = Isolation.READ_COMMITTED)', desc: '指定隔离级别'},
            {ann: '@Transactional(rollbackFor = Exception.class)', desc: '指定触发回滚的异常类型'},
            {ann: '@Transactional(noRollbackFor = ...)', desc: '指定不回滚的异常'},
            {ann: '@Transactional(timeout = 30, readOnly = true)', desc: '事务超时 / 只读优化'},
            {ann: '@EnableTransactionManagement', desc: '启用注解事务（Spring Boot 自动开启）'},
        ]
    },
    {
        cat: '异步 / 调度 / 缓存',
        items: [
            {ann: '@Async', desc: '方法异步执行，需配合 @EnableAsync'},
            {ann: '@EnableAsync', desc: '开启 @Async 扫描'},
            {ann: '@Scheduled(cron = "0 0 * * * ?")', desc: '定时任务，配合 @EnableScheduling'},
            {ann: '@EnableScheduling', desc: '开启定时任务扫描'},
            {ann: '@Cacheable("userCache")', desc: '方法结果缓存（key 默认 SpEL 参数）'},
            {ann: '@CachePut("userCache")', desc: '更新缓存（不影响方法执行）'},
            {ann: '@CacheEvict("userCache")', desc: '清除缓存（allEntries=true 清空）'},
            {ann: '@EnableCaching', desc: '开启缓存注解扫描'},
        ]
    },
    {
        cat: '条件装配 (Spring Boot)',
        items: [
            {ann: '@ConditionalOnClass(RedisTemplate.class)', desc: '类路径存在某类时生效'},
            {ann: '@ConditionalOnBean(DataSource.class)', desc: '容器中存在某 Bean 时生效'},
            {ann: '@ConditionalOnMissingBean(UserService.class)', desc: '容器中不存在某 Bean 时生效（典型自实现替代默认实现）'},
            {ann: '@ConditionalOnProperty(name = "app.enable", havingValue = "true")', desc: '按配置项控制是否生效'},
            {ann: '@ConditionalOnWebApplication(type = SERVLET)', desc: 'Web 环境下生效'},
            {ann: '@ConditionalOnExpression("${app.feature.enabled:false}")', desc: 'SpEL 表达式条件'},
        ]
    },
    {
        cat: '测试',
        items: [
            {ann: '@SpringBootTest', desc: '加载完整 Spring 上下文（webEnvironment 指定 Web 环境）'},
            {ann: '@SpringBootTest(classes = App.class)', desc: '指定 Spring Boot 启动类'},
            {ann: '@MockBean', desc: '向容器注入 Mockito Mock（Spring Boot 2.2+）'},
            {ann: '@SpyBean', desc: '向容器注入 Mockito Spy'},
            {ann: '@AutoConfigureMockMvc', desc: '自动配置 MockMvc，配合 @Autowired MockMvc mvc 使用'},
            {ann: '@DataJpaTest / @WebMvcTest / @RestClientTest', desc: '切片测试：只加载部分上下文'},
            {ann: '@TestPropertySource("classpath:test.properties")', desc: '测试用 properties 覆盖'},
        ]
    },
    {
        cat: '异常处理 / 其他',
        items: [
            {ann: '@ControllerAdvice + @ExceptionHandler', desc: '全局异常处理'},
            {ann: '@RestControllerAdvice', desc: '@ControllerAdvice + @ResponseBody（直接返回 JSON）'},
            {ann: '@ResponseStatus(HttpStatus.NOT_FOUND)', desc: '指定 HTTP 响应状态码'},
            {ann: '@Validated', desc: '方法级别参数校验（@Valid 仅支持 Bean）'},
            {ann: '@RequestMapping(produces = MediaType.APPLICATION_JSON_VALUE)', desc: '指定返回内容类型'},
        ]
    },
];

let springbootSearchTimer = null;

function springbootRender(filter) {
    const container = document.getElementById('springbootContent');
    if (!container) return;
    filter = (filter || '').trim().toLowerCase();
    container.innerHTML = '';
    let hasResult = false;
    SPRINGBOOT_DATA.forEach(group => {
        const matched = filter
            ? group.items.filter(i =>
                i.ann.toLowerCase().includes(filter) ||
                i.desc.toLowerCase().includes(filter))
            : group.items;
        if (!matched.length) return;
        hasResult = true;
        const section = document.createElement('div');
        section.style.cssText = 'margin-bottom:14px';
        section.innerHTML = `<div style="font-size:12px;font-weight:600;color:var(--accent);padding:6px 0;border-bottom:1px solid var(--border);margin-bottom:6px">${group.cat}</div>`;
        matched.forEach(item => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:baseline;gap:8px;padding:6px 8px;border-radius:4px;transition:background .12s;cursor:pointer';
            row.onmouseenter = () => row.style.background = 'var(--glass)';
            row.onmouseleave = () => row.style.background = '';
            row.innerHTML = `<code style="background:var(--bg-input);padding:2px 8px;border-radius:4px;font-size:12px;white-space:nowrap;flex-shrink:0;color:var(--accent2);max-width:340px;overflow:hidden;text-overflow:ellipsis">${item.ann.replace(/</g, '&lt;')}</code><span style="font-size:12px;color:var(--text-dim);flex:1">${item.desc}</span>`;
            row.addEventListener('click', () => safeCopy(item.ann));
            section.appendChild(row);
        });
        container.appendChild(section);
    });
    if (!hasResult) {
        container.innerHTML = '<div style="color:var(--text-muted);padding:20px;text-align:center">无匹配结果</div>';
    }
}

function springbootSearch() {
    clearTimeout(springbootSearchTimer);
    springbootSearchTimer = setTimeout(() => {
        springbootRender(document.getElementById('springbootSearch').value);
    }, 200);
}
