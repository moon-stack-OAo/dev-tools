const LOMBOK_DATA = [
    {
        cat: '类级别注解',
        items: [
            {
                name: '@Data',
                desc: '@Getter + @Setter + @ToString + @EqualsAndHashCode + @RequiredArgsConstructor 的组合',
                code: '@Data\npublic class User {\n    private Long id;\n    private String name;\n    private Integer age;\n}'
            },
            {
                name: '@Value',
                desc: '不可变 @Data：所有字段 private final，类 final，只生成 getter',
                code: '@Value\npublic class User {\n    Long id;\n    String name;\n}'
            },
            {
                name: '@Builder',
                desc: '建造者模式：链式 setter 后调用 build() 创建对象',
                code: 'User u = User.builder().id(1L).name("Tom").age(20).build();'
            },
            {
                name: '@Builder.Default',
                desc: '@Builder 中给字段提供默认值（否则会被置为 null）',
                code: '@Builder.Default\nprivate Integer status = 1;'
            },
            {
                name: '@AllArgsConstructor',
                desc: '生成包含所有字段的构造器',
                code: 'public User(Long id, String name, Integer age) { ... }'
            },
            {
                name: '@NoArgsConstructor',
                desc: '生成无参构造器',
                code: 'public User() {}'
            },
            {
                name: '@RequiredArgsConstructor',
                desc: '生成包含 final / @NonNull 字段的构造器（Spring 注入推荐）',
                code: '@Service\n@RequiredArgsConstructor\npublic class UserService {\n    private final UserMapper mapper;\n}'
            },
            {
                name: '@UtilityClass',
                desc: '工具类：自动添加 final + private 无参构造器，所有成员 static',
                code: '@UtilityClass\npublic class StringUtils {\n    public static boolean isEmpty(String s) { return s == null || s.isEmpty(); }\n}'
            },
            {
                name: '@Accessors(chain = true)',
                desc: '链式 setter：setter 返回 this，可连续调用',
                code: 'new User().setId(1L).setName("Tom").setAge(20);'
            },
            {
                name: '@FieldDefaults(level = AccessLevel.PRIVATE)',
                desc: '类级别设置字段默认修饰符（public / private / protected / package）',
                code: '@FieldDefaults(level = AccessLevel.PRIVATE)\npublic class User {\n    Long id;\n    String name;\n}'
            },
        ]
    },
    {
        cat: '字段级别注解',
        items: [
            {
                name: '@Getter / @Setter',
                desc: '为单个字段生成 getter / setter；可加在类上为所有字段生成',
                code: '@Getter @Setter\nprivate String name;'
            },
            {
                name: '@ToString',
                desc: '生成 toString()；exclude 排除字段，include 限定字段，callSuper 调用父类',
                code: '@ToString(exclude = "password")\npublic class User { ... }'
            },
            {
                name: '@EqualsAndHashCode',
                desc: '生成 equals() / hashCode()；默认只比较本类字段',
                code: '@EqualsAndHashCode(callSuper = true)\npublic class User extends BaseEntity { ... }'
            },
            {
                name: '@NonNull',
                desc: '参数 / 字段非空检查（抛 NullPointerException）；setter 中加入 null 检查',
                code: 'public void setName(@NonNull String name) { this.name = name; }'
            },
            {
                name: '@Cleanup',
                desc: '自动释放资源（等价 try-with-resources），作用域结束自动 close()',
                code: '@Cleanup InputStream in = new FileInputStream("a.txt");'
            },
            {
                name: '@Singular',
                desc: '@Builder 中给集合字段添加 addXxx / clearXxx 单元素方法',
                code: '@Builder\npublic class Order {\n    @Singular\n    private List<Item> items;\n}\n\n// 使用：Order.builder().item(a).item(b).build();'
            },
        ]
    },
    {
        cat: '方法 / 特殊',
        items: [
            {
                name: '@SneakyThrows',
                desc: '偷抛受检异常，绕过编译器检查（不推荐滥用）',
                code: '@SneakyThrows(IOException.class)\npublic String read() { return Files.readString(Path.of("a.txt")); }'
            },
            {
                name: '@Synchronized',
                desc: '对象级 synchronized（静态方法相当于类锁）',
                code: '@Synchronized\npublic void increment() { count++; }'
            },
            {
                name: '@Locked',
                desc: '基于 java.util.concurrent.locks.Lock 的同步注解',
                code: '@Locked\npublic void update() { ... }'
            },
            {
                name: '@Log / @Slf4j',
                desc: '自动生成日志对象 log（按需选择 slf4j / log4j / log4j2 / commons / jboss）',
                code: '@Slf4j\n@Service\npublic class UserService {\n    public void save() { log.info("save user"); }\n}'
            },
            {
                name: '@Builder(toBuilder = true)',
                desc: '生成 toBuilder() 方法：基于现有对象快速构建新对象',
                code: 'User u2 = user1.toBuilder().name("Jerry").build();'
            },
            {
                name: '@Wither',
                desc: '生成 withXxx(newVal) 方法，返回修改后新对象（不可变对象用）',
                code: 'User u2 = user1.withName("Jerry");'
            },
        ]
    },
    {
        cat: '常用组合',
        items: [
            {
                name: '@Data + @Builder + @NoArgsConstructor + @AllArgsConstructor',
                desc: 'POJO 通用组合：兼具默认值、无参、全参、链式、Builder',
                code: '@Data\n@Builder\n@NoArgsConstructor\n@AllArgsConstructor\npublic class User {\n    private Long id;\n    private String name;\n}'
            },
            {
                name: '@Slf4j + @RequiredArgsConstructor',
                desc: 'Service / Component 层经典组合：日志 + 构造器注入',
                code: '@Slf4j\n@Service\n@RequiredArgsConstructor\npublic class UserService {\n    private final UserMapper mapper;\n}'
            },
        ]
    },
];

let lombokSearchTimer = null;

function lombokRender(filter) {
    const container = document.getElementById('lombokContent');
    if (!container) return;
    filter = (filter || '').trim().toLowerCase();
    container.innerHTML = '';
    let hasResult = false;
    LOMBOK_DATA.forEach(group => {
        const matched = filter
            ? group.items.filter(i =>
                i.name.toLowerCase().includes(filter) ||
                i.desc.toLowerCase().includes(filter) ||
                (i.code || '').toLowerCase().includes(filter))
            : group.items;
        if (!matched.length) return;
        hasResult = true;
        const section = document.createElement('div');
        section.style.cssText = 'margin-bottom:18px';
        section.innerHTML = `<div style="font-size:12px;font-weight:600;color:var(--accent);padding:6px 0;border-bottom:1px solid var(--border);margin-bottom:6px">${group.cat}</div>`;
        matched.forEach(item => {
            const wrap = document.createElement('div');
            wrap.style.cssText = 'padding:6px 8px;border-radius:4px;margin-bottom:4px;transition:background .12s';
            wrap.onmouseenter = () => wrap.style.background = 'var(--glass)';
            wrap.onmouseleave = () => wrap.style.background = '';
            wrap.innerHTML = `
                <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">
                    <code style="color:var(--accent2);font-size:13px;font-weight:600;background:var(--bg-input);padding:2px 8px;border-radius:4px;cursor:pointer" title="点击复制注解">${item.name}</code>
                    <span style="font-size:12px;color:var(--text-dim);flex:1">${item.desc}</span>
                </div>
            `;
            const codeEl = wrap.querySelector('code');
            codeEl.addEventListener('click', () => safeCopy(item.name));
            if (item.code) {
                const pre = document.createElement('pre');
                pre.style.cssText = 'background:var(--bg-input);padding:8px 10px;border-radius:4px;font-size:12px;overflow:auto;cursor:pointer;margin:6px 0 0;border:1px solid var(--border);color:var(--text)';
                pre.textContent = item.code;
                pre.title = '点击复制代码';
                pre.addEventListener('click', () => safeCopy(item.code));
                wrap.appendChild(pre);
            }
            section.appendChild(wrap);
        });
        container.appendChild(section);
    });
    if (!hasResult) {
        container.innerHTML = '<div style="color:var(--text-muted);padding:20px;text-align:center">无匹配结果</div>';
    }
}

function lombokSearch() {
    clearTimeout(lombokSearchTimer);
    lombokSearchTimer = setTimeout(() => {
        lombokRender(document.getElementById('lombokSearch').value);
    }, 200);
}
