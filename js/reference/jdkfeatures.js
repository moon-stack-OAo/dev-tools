const JDK_FEATURES = [
    {
        cat: 'JDK 8 (2014)',
        items: [
            {
                name: 'Lambda 表达式',
                desc: '函数式编程语法糖，简化单方法接口实现',
                code: 'Runnable r = () -> System.out.println("hi");\nlist.forEach(s -> System.out.println(s));',
            },
            {
                name: 'Stream API',
                desc: '链式集合操作（filter / map / reduce / collect）',
                code: 'List<String> names = users.stream()\n    .filter(u -> u.getAge() > 18)\n    .map(User::getName)\n    .sorted()\n    .collect(Collectors.toList());',
            },
            {
                name: 'Optional',
                desc: '空值容器，避免 NPE',
                code: 'String name = Optional.ofNullable(user)\n    .map(User::getName)\n    .orElse("anonymous");',
            },
            {
                name: '新日期 API (java.time)',
                desc: '不可变、线程安全',
                code: 'LocalDate today = LocalDate.now();\nLocalDateTime dt = LocalDateTime.of(2025, 1, 1, 12, 0);\nZonedDateTime zdt = ZonedDateTime.now(ZoneId.of("Asia/Shanghai"));',
            },
            {
                name: '接口 default 方法',
                desc: '接口可提供默认实现',
                code: 'interface Vehicle {\n    default void honk() {\n        System.out.println("Beep!");\n    }\n}',
            },
            {
                name: '方法引用',
                desc: '`::` 简化 lambda',
                code: 'list.forEach(System.out::println);\nmap.computeIfAbsent(key, this::create);',
            },
            {
                name: '@FunctionalInterface',
                desc: '函数式接口标注（仅一个抽象方法）',
                code: '@FunctionalInterface\ninterface Converter<F, T> {\n    T convert(F from);\n}\nConverter<String, Integer> c = Integer::valueOf;',
            },
            {
                name: '类型注解',
                desc: '注解可用于任何类型使用处',
                code: 'List<@NonNull String> list;\nMap<@NonNull String, @NonNull Integer> map;',
            },
            {
                name: 'CompletableFuture',
                desc: '异步编程与组合',
                code: 'CompletableFuture.supplyAsync(this::findUser)\n    .thenApply(this::toDto)\n    .thenAccept(System.out::println);',
            },
            {
                name: '重复注解 @Repeatable',
                desc: '同一注解可多次使用',
                code: '@Repeatable(Filters.class)\n@interface Filter { String value(); }\n\n@Filter("a") @Filter("b")\nvoid doWork() {}',
            },
        ],
    },
    {
        cat: 'JDK 11 (2018, LTS)',
        items: [
            {
                name: 'var 局部变量',
                desc: '类型推断（仅限局部变量）',
                code: 'var list = new ArrayList<String>();\nvar stream = list.stream();\n// var x = null; // ❌ 不可用',
            },
            {
                name: 'HttpClient API',
                desc: '标准 HTTP 客户端（同步 / 异步）',
                code: 'HttpClient client = HttpClient.newHttpClient();\nHttpRequest req = HttpRequest.newBuilder()\n    .uri(URI.create("https://api.example.com"))\n    .build();\nHttpResponse<String> resp = client.send(req, HttpResponse.BodyHandlers.ofString());',
            },
            {
                name: 'String 新方法',
                desc: 'isBlank / strip / repeat / lines',
                code: '"  hi  ".strip();       // "hi"\n"hi".repeat(3);          // "hihihi"\n"a\\nb\\nc".lines().count(); // 3\n"".isBlank();            // true',
            },
            {
                name: 'Files 新方法',
                desc: 'readString / writeString',
                code: 'String s = Files.readString(Path.of("a.txt"));\nFiles.writeString(Path.of("b.txt"), "hello");',
            },
            {
                name: 'Collection 工厂',
                desc: 'List.of / Set.of / Map.of（不可变）',
                code: 'List<String> l = List.of("a", "b", "c");\nSet<Integer> s = Set.of(1, 2, 3);\nMap<String, Integer> m = Map.of("a", 1, "b", 2);',
            },
            {
                name: '单文件运行',
                desc: 'java HelloWorld.java 直接运行（启动类）',
                code: '$ java HelloWorld.java\nHello World',
            },
            {
                name: 'Optional 增强',
                desc: 'isEmpty()',
                code: 'opt.ifPresentOrElse(System.out::println, () -> log("empty"));\nboolean empty = opt.isEmpty();',
            },
            {
                name: 'Lambda 参数 var',
                desc: 'lambda 参数可标注 var（可加注解）',
                code: 'list.stream()\n    .map((@NonNull var s) -> s.toUpperCase())\n    .collect(toList());',
            },
        ],
    },
    {
        cat: 'JDK 17 (2021, LTS)',
        items: [
            {
                name: 'sealed class',
                desc: '受限继承：明确允许的子类',
                code: 'sealed class Shape permits Circle, Square {}\nfinal class Circle extends Shape {}\nfinal class Square extends Shape {}\n\n// 也可以 non-sealed 继续开放继承\nsealed class A permits B, C {}\nnon-sealed class B extends A {}',
            },
            {
                name: 'record',
                desc: '数据类：自动生成构造器 / getter / equals / toString',
                code: 'record Point(int x, int y) {}\n\nPoint p = new Point(1, 2);\np.x(); // 1\n// 紧凑构造器\nrecord Range(int lo, int hi) {\n    public Range {\n        if (lo > hi) throw new IllegalArgumentException();\n    }\n}',
            },
            {
                name: 'switch 表达式',
                desc: 'switch 可返回值',
                code: 'String s = switch (day) {\n    case MON, FRI, SUN -> "fun";\n    case TUE           -> "meh";\n    case THU, SAT      -> "ok";\n    case WED           -> "hump";\n};',
            },
            {
                name: '文本块',
                desc: '多行字符串（"""..."""）',
                code: 'String html = """\n        <html>\n            <body>Hello</body>\n        </html>\n        """;',
            },
            {
                name: 'instanceof 模式匹配',
                desc: 'instanceof 后直接绑定变量',
                code: 'if (obj instanceof String s) {\n    // 直接使用 s\n    System.out.println(s.length());\n}',
            },
            {
                name: '模式匹配 switch (preview)',
                desc: 'switch 可匹配类型',
                code: 'String s = switch (obj) {\n    case Integer i -> "int " + i;\n    case Long l    -> "long " + l;\n    case String s  -> "str " + s;\n    case null      -> "null";\n    default        -> obj.toString();\n};',
            },
            {
                name: '强封装 JDK 内部 API',
                desc: '--illegal-access=deny 默认',
                code: '$ java --illegal-access=deny Main',
            },
            {
                name: 'Stream.toList()',
                desc: 'collect(Collectors.toList()) 的简化',
                code: 'List<String> names = users.stream()\n    .map(User::getName)\n    .toList();',
            },
        ],
    },
    {
        cat: 'JDK 21 (2023, LTS)',
        items: [
            {
                name: '虚拟线程 (Virtual Thread)',
                desc: '轻量级线程，适合高并发 I/O 场景',
                code: 'Thread.startVirtualThread(() -> {\n    System.out.println("virtual " + Thread.currentThread());\n});\n\n// 池化使用\ntry (var executor = Executors.newVirtualThreadPerTaskExecutor()) {\n    executor.submit(() -> doWork());\n}',
            },
            {
                name: '序列集合',
                desc: 'SequencedCollection / Set / Map 提供反序视图',
                code: 'list.reversed();     // 反向视图\nlist.addFirst(e);\nlist.removeLast();\nmap.firstEntry();\nmap.pollFirstEntry();',
            },
            {
                name: '字符串模板 (Preview)',
                desc: 'STR."Hello \{name}"',
                code: 'String name = "Tom";\nString msg = STR."Hello, \{name}! You are \{age} years old.";\n\n// 自定义模板\nvar JSON = StringTemplate.Processor.of((StringTemplate st) -> ...);\nString json = JSON."\\{name}: \\{age}";',
            },
            {
                name: 'Record Patterns',
                desc: '解构 record',
                code: 'if (obj instanceof Point(int x, int y)) {\n    System.out.println(x + "," + y);\n}\n\n// switch + record pattern\nswitch (shape) {\n    case Circle(double r) -> 2 * Math.PI * r;\n    case Square(double s) -> 4 * s;\n}',
            },
            {
                name: '未命名变量 _',
                desc: '占位符：明确不使用的变量',
                code: 'try {\n    doWork();\n} catch (Exception _) {  // 不用 e\n    log("failed");\n}\n\nfor (var _ : items) count++;',
            },
            {
                name: 'switch 模式匹配（正式）',
                desc: 'JDK 21 正式发布',
                code: 'String s = switch (obj) {\n    case Integer i -> "int " + i;\n    case String s  -> "str " + s;\n    case null      -> "null";\n    default        -> "other";\n};',
            },
            {
                name: '外部函数 & 内存 API (Preview)',
                desc: '替代 JNI 的 native interop',
                code: '// 分配堆外内存\ntry (Arena arena = Arena.ofConfined()) {\n    MemorySegment seg = arena.allocate(100);\n    seg.set(ValueLayout.JAVA_INT, 0, 42);\n    int v = seg.get(ValueLayout.JAVA_INT, 0);\n}',
            },
            {
                name: 'Scoped Values',
                desc: '不可变线程局部变量（虚拟线程友好）',
                code: 'static final ScopedValue<User> CURRENT_USER = ScopedValue.newInstance();\n\nScopedValue.where(CURRENT_USER, user).run(() -> {\n    handle(); // 内层可读 CURRENT_USER.get()\n});',
            },
        ],
    },
];

let jdkfeaturesSearchTimer = null;

function jdkfeaturesRender(filter) {
    const container = document.getElementById('jdkfeaturesContent');
    if (!container) return;
    filter = (filter || '').trim().toLowerCase();
    container.innerHTML = '';
    let hasResult = false;
    JDK_FEATURES.forEach((group) => {
        const matched = filter
            ? group.items.filter(
                (i) =>
                    i.name.toLowerCase().includes(filter) ||
                    i.desc.toLowerCase().includes(filter) ||
                    (i.code || '').toLowerCase().includes(filter)
            )
            : group.items;
        if (!matched.length) return;
        hasResult = true;
        const section = document.createElement('div');
        section.style.cssText = 'margin-bottom:16px';
        section.innerHTML = `<div style="font-size:12px;font-weight:600;color:var(--accent);padding:6px 0;border-bottom:1px solid var(--border);margin-bottom:8px">${group.cat}</div>`;
        matched.forEach((item) => {
            const card = document.createElement('div');
            card.className = 'ref-card';
            let html = `<div class="ref-cmd-head"><code class="ref-cmd-name">${item.name}</code><span class="ref-cmd-desc">${item.desc}</span><button class="sm outline" onclick="safeCopy('${item.name.replace(/'/g, "\\'")}')">复制</button></div>`;
            if (item.code) {
                html += `<div class="ref-copy-wrap"><pre class="ref-pre"><code>${item.code.replace(/</g, '&lt;')}</code></pre><button class="ref-copy-btn" onclick="safeCopy(this.parentElement.querySelector('pre').innerText)">复制</button></div>`;
            }
            card.innerHTML = html;
            section.appendChild(card);
        });
        container.appendChild(section);
    });
    if (!hasResult) {
        container.innerHTML = '<div style="color:var(--text-muted);padding:20px;text-align:center">无匹配结果</div>';
    }
}

function jdkfeaturesSearch() {
    clearTimeout(jdkfeaturesSearchTimer);
    jdkfeaturesSearchTimer = setTimeout(() => {
        jdkfeaturesRender(document.getElementById('jdkfeaturesSearch').value);
    }, 200);
}

registerInit('jdkfeatures', jdkfeaturesRender);
