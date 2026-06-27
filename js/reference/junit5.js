const JUNIT5_REFS = [
    {
        cat: '核心注解',
        items: [
            {
                cmd: '@Test',
                syntax: '@Test',
                desc: '标记测试方法',
                examples: ['@Test\nvoid testAdd() {\n    assertEquals(2, calculator.add(1, 1));\n}'],
                returns: '测试方法',
            },
            {
                cmd: '@TestFactory',
                syntax: '@TestFactory',
                desc: '标记动态测试工厂方法',
                examples: [
                    '@TestFactory\nStream<DynamicTest> dynamicTests() {\n    return Stream.of(\n        DynamicTest.dynamicTest("test1", () -> assertTrue(true))\n    );\n}',
                ],
                returns: '动态测试',
            },
            {
                cmd: '@ParameterizedTest',
                syntax: '@ParameterizedTest',
                desc: '参数化测试',
                examples: [
                    '@ParameterizedTest\n@ValueSource(ints = {1, 2, 3})\nvoid testWithValueSource(int number) {\n    assertTrue(number > 0);\n}',
                ],
                returns: '参数化测试',
            },
            {
                cmd: '@RepeatedTest(5)',
                syntax: '@RepeatedTest(<count>)',
                desc: '重复测试 N 次',
                examples: ['@RepeatedTest(5)\nvoid repeatedTest() {\n    assertTrue(true);\n}'],
                returns: '重复测试',
            },
            {
                cmd: '@BeforeEach',
                syntax: '@BeforeEach',
                desc: '每个测试方法前执行',
                examples: ['@BeforeEach\nvoid setUp() {\n    calculator = new Calculator();\n}'],
                returns: '前置方法',
            },
            {
                cmd: '@AfterEach',
                syntax: '@AfterEach',
                desc: '每个测试方法后执行',
                examples: ['@AfterEach\nvoid tearDown() {\n    calculator = null;\n}'],
                returns: '后置方法',
            },
            {
                cmd: '@BeforeAll',
                syntax: '@BeforeAll',
                desc: '所有测试前执行（静态方法）',
                examples: ['@BeforeAll\nstatic void initAll() {\n    // 初始化资源\n}'],
                returns: '全局前置',
            },
            {
                cmd: '@AfterAll',
                syntax: '@AfterAll',
                desc: '所有测试后执行（静态方法）',
                examples: ['@AfterAll\nstatic void tearDownAll() {\n    // 清理资源\n}'],
                returns: '全局后置',
            },
            {
                cmd: '@DisplayName("测试名称")',
                syntax: '@DisplayName("<name>")',
                desc: '自定义测试显示名称',
                examples: [
                    '@Test\n@DisplayName("加法测试")\nvoid testAdd() {\n    assertEquals(2, calculator.add(1, 1));\n}',
                ],
                returns: '显示名称',
            },
            {
                cmd: '@Tag("unit")',
                syntax: '@Tag("<tag>")',
                desc: '标记测试标签',
                examples: ['@Test\n@Tag("unit")\nvoid unitTest() {}'],
                returns: '测试标签',
            },
            {
                cmd: '@Disabled("原因")',
                syntax: '@Disabled("<reason>")',
                desc: '禁用测试',
                examples: ['@Test\n@Disabled("待修复")\nvoid disabledTest() {}'],
                returns: '禁用测试',
            },
            {
                cmd: '@Timeout(value = 5, unit = TimeUnit.SECONDS)',
                syntax: '@Timeout(value = <n>, unit = TimeUnit.<unit>)',
                desc: '超时限制',
                examples: [
                    '@Test\n@Timeout(value = 5, unit = TimeUnit.SECONDS)\nvoid timeoutTest() {\n    // 5秒超时\n}',
                ],
                returns: '超时限制',
            },
            {
                cmd: '@ExtendWith(MockitoExtension.class)',
                syntax: '@ExtendWith(<extension>.class)',
                desc: '扩展模型（替代 @RunWith）',
                examples: [
                    '@ExtendWith(MockitoExtension.class)\nclass UserServiceTest {\n    @Mock\n    UserRepository repository;\n}',
                ],
                returns: '扩展配置',
            },
        ],
    },
    {
        cat: '断言 (Assertions)',
        items: [
            {
                cmd: 'assertEquals(expected, actual)',
                syntax: 'assertEquals(<expected>, <actual>)',
                desc: '相等断言',
                examples: ['assertEquals(2, calculator.add(1, 1));\nassertEquals("hello", "hello", "消息");'],
                returns: '断言成功/失败',
            },
            {
                cmd: 'assertNotEquals(expected, actual)',
                syntax: 'assertNotEquals(<expected>, <actual>)',
                desc: '不相等断言',
                examples: ['assertNotEquals(0, calculator.add(1, 1));'],
                returns: '断言成功/失败',
            },
            {
                cmd: 'assertTrue(condition)',
                syntax: 'assertTrue(<condition>)',
                desc: 'True 断言',
                examples: ['assertTrue(list.isEmpty());\nassertTrue(list.isEmpty(), "列表应为空");'],
                returns: '断言成功/失败',
            },
            {
                cmd: 'assertFalse(condition)',
                syntax: 'assertFalse(<condition>)',
                desc: 'False 断言',
                examples: ['assertFalse(list.isEmpty());'],
                returns: '断言成功/失败',
            },
            {
                cmd: 'assertNull(actual)',
                syntax: 'assertNull(<actual>)',
                desc: 'Null 断言',
                examples: ['assertNull(user.getDeletedAt());'],
                returns: '断言成功/失败',
            },
            {
                cmd: 'assertNotNull(actual)',
                syntax: 'assertNotNull(<actual>)',
                desc: '非 Null 断言',
                examples: ['assertNotNull(user.getId());'],
                returns: '断言成功/失败',
            },
            {
                cmd: 'assertThrows(Exception.class, () -> {})',
                syntax: 'assertThrows(<type>, <executable>)',
                desc: '异常断言',
                examples: ['assertThrows(IllegalArgumentException.class, () -> {\n    calculator.divide(1, 0);\n});'],
                returns: '异常对象',
            },
            {
                cmd: 'assertDoesNotThrow(() -> {})',
                syntax: 'assertDoesNotThrow(<executable>)',
                desc: '无异常断言',
                examples: ['assertDoesNotThrow(() -> {\n    calculator.divide(1, 1);\n});'],
                returns: '断言成功/失败',
            },
            {
                cmd: 'assertTimeout(Duration.ofSeconds(1), () -> {})',
                syntax: 'assertTimeout(<duration>, <executable>)',
                desc: '超时断言',
                examples: ['assertTimeout(Duration.ofSeconds(1), () -> {\n    Thread.sleep(500);\n});'],
                returns: '断言成功/失败',
            },
            {
                cmd: 'assertAll("group", () -> {}, () -> {})',
                syntax: 'assertAll(<name>, <executables>...)',
                desc: '分组断言（全部执行）',
                examples: [
                    'assertAll("用户验证",\n    () -> assertNotNull(user.getId()),\n    () -> assertEquals("张三", user.getName()),\n    () -> assertTrue(user.isActive())\n);',
                ],
                returns: '所有断言结果',
            },
        ],
    },
    {
        cat: '参数化测试',
        items: [
            {
                cmd: '@ValueSource(ints = {1, 2, 3})',
                syntax: '@ValueSource(<type>s = {<values>})',
                desc: '简单值源',
                examples: [
                    '@ParameterizedTest\n@ValueSource(ints = {1, 2, 3})\nvoid testWithValueSource(int number) {\n    assertTrue(number > 0);\n}',
                ],
                returns: '参数值',
            },
            {
                cmd: '@NullSource',
                syntax: '@NullSource',
                desc: 'Null 参数',
                examples: [
                    '@ParameterizedTest\n@NullSource\nvoid testWithNullSource(String input) {\n    assertNull(input);\n}',
                ],
                returns: 'null 值',
            },
            {
                cmd: '@EmptySource',
                syntax: '@EmptySource',
                desc: '空参数（空字符串/空数组等）',
                examples: [
                    '@ParameterizedTest\n@EmptySource\nvoid testWithEmptySource(String input) {\n    assertTrue(input.isEmpty());\n}',
                ],
                returns: '空值',
            },
            {
                cmd: '@NullAndEmptySource',
                syntax: '@NullAndEmptySource',
                desc: 'Null + 空参数',
                examples: [
                    '@ParameterizedTest\n@NullAndEmptySource\nvoid testWithNullAndEmptySource(String input) {\n    assertTrue(input == null || input.isEmpty());\n}',
                ],
                returns: 'null 和空值',
            },
            {
                cmd: '@EnumSource(MyEnum.class)',
                syntax: '@EnumSource(<Enum>.class)',
                desc: '枚举值源',
                examples: [
                    '@ParameterizedTest\n@EnumSource(TimeUnit.class)\nvoid testWithEnumSource(TimeUnit unit) {\n    assertNotNull(unit);\n}',
                ],
                returns: '枚举值',
            },
            {
                cmd: '@MethodSource("providerMethod")',
                syntax: '@MethodSource("<methodName>")',
                desc: '方法提供参数',
                examples: [
                    'static Stream<Arguments> providerMethod() {\n    return Stream.of(\n        Arguments.of(1, 2, 3),\n        Arguments.of(4, 5, 9)\n    );\n}\n\n@ParameterizedTest\n@MethodSource("providerMethod")\nvoid testWithMethodSource(int a, int b, int expected) {\n    assertEquals(expected, calculator.add(a, b));\n}',
                ],
                returns: '参数流',
            },
            {
                cmd: '@CsvSource({"1, A", "2, B"})',
                syntax: '@CsvSource({"<csv>"})',
                desc: 'CSV 参数源',
                examples: [
                    '@ParameterizedTest\n@CsvSource({"1, 2, 3", "4, 5, 9"})\nvoid testWithCsvSource(int a, int b, int expected) {\n    assertEquals(expected, calculator.add(a, b));\n}',
                ],
                returns: 'CSV 参数',
            },
            {
                cmd: '@CsvFileSource(resources = "/data.csv")',
                syntax: '@CsvFileSource(resources = "<path>")',
                desc: 'CSV 文件参数源',
                examples: [
                    '@ParameterizedTest\n@CsvFileSource(resources = "/test-data.csv", numLinesToSkip = 1)\nvoid testWithCsvFileSource(int a, int b, int expected) {\n    assertEquals(expected, calculator.add(a, b));\n}',
                ],
                returns: '文件参数',
            },
        ],
    },
    {
        cat: 'Mockito 集成',
        items: [
            {
                cmd: '@Mock',
                syntax: '@Mock <Type> <name>',
                desc: '创建 Mock 对象',
                examples: ['@Mock\nUserRepository userRepository;'],
                returns: 'Mock 对象',
            },
            {
                cmd: '@Spy',
                syntax: '@Spy <Type> <name>',
                desc: '创建 Spy 对象（部分 Mock）',
                examples: ['@Spy\nList<String> spyList = new ArrayList<>();'],
                returns: 'Spy 对象',
            },
            {
                cmd: '@InjectMocks',
                syntax: '@InjectMocks <Type> <name>',
                desc: '自动注入 Mock 对象',
                examples: ['@InjectMocks\nUserService userService;'],
                returns: '注入实例',
            },
            {
                cmd: 'when(...).thenReturn(...)',
                syntax: 'when(<call>).thenReturn(<value>)',
                desc: 'Mock 方法返回值',
                examples: ['when(userRepository.findById(1L))\n    .thenReturn(Optional.of(user));'],
                returns: 'Mock 配置',
            },
            {
                cmd: 'when(...).thenThrow(...)',
                syntax: 'when(<call>).thenThrow(<exception>)',
                desc: 'Mock 方法抛异常',
                examples: ['when(userRepository.findById(99L))\n    .thenThrow(new UserNotFoundException());'],
                returns: 'Mock 配置',
            },
            {
                cmd: 'verify(...).method(...)',
                syntax: 'verify(<mock>).<method>(<args>)',
                desc: '验证方法调用',
                examples: [
                    'verify(userRepository, times(1)).save(any());\nverify(userRepository, never()).delete(any());',
                ],
                returns: '验证结果',
            },
            {
                cmd: 'doReturn(...).when(...)',
                syntax: 'doReturn(<value>).when(<mock>).<method>(<args>)',
                desc: 'Void 方法 Mock',
                examples: ['doNothing().when(userRepository).deleteById(any());'],
                returns: 'Mock 配置',
            },
            {
                cmd: 'ArgumentCaptor',
                syntax: 'ArgumentCaptor<<Type>> captor = ArgumentCaptor.forClass(<Type>.class)',
                desc: '捕获方法参数',
                examples: [
                    'ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);\nverify(userRepository).save(captor.capture());\nUser savedUser = captor.getValue();',
                ],
                returns: '参数捕获器',
            },
        ],
    },
    {
        cat: '测试模板',
        items: [
            {
                cmd: '@TestTemplate',
                syntax: '@TestTemplate',
                desc: '测试模板（需配合扩展）',
                examples: [
                    '@TestTemplate\n@ExtendWith(MyTestTemplateInvocationContextProvider.class)\nvoid testTemplate(TestInfo testInfo) {}',
                ],
                returns: '模板测试',
            },
            {
                cmd: 'TestInfo',
                syntax: 'TestInfo testInfo',
                desc: '测试信息参数注入',
                examples: [
                    '@Test\nvoid testWithTestInfo(TestInfo testInfo) {\n    assertEquals("test", testInfo.getDisplayName());\n}',
                ],
                returns: '测试信息',
            },
            {
                cmd: 'TestReporter',
                syntax: 'TestReporter testReporter',
                desc: '测试报告参数注入',
                examples: [
                    '@Test\nvoid testWithTestReporter(TestReporter testReporter) {\n    testReporter.publishEntry("key", "value");\n}',
                ],
                returns: '测试报告器',
            },
        ],
    },
    {
        cat: '依赖',
        items: [
            {
                cmd: 'junit-jupiter-api',
                syntax: "testImplementation 'org.junit.jupiter:junit-jupiter-api:<version>'",
                desc: 'JUnit 5 API',
                examples: ["// build.gradle\ntestImplementation 'org.junit.jupiter:junit-jupiter-api:5.10.0'"],
                returns: 'API 依赖',
            },
            {
                cmd: 'junit-jupiter-engine',
                syntax: "testRuntimeOnly 'org.junit.jupiter:junit-jupiter-engine:<version>'",
                desc: 'JUnit 5 引擎',
                examples: ["// build.gradle\ntestRuntimeOnly 'org.junit.jupiter:junit-jupiter-engine:5.10.0'"],
                returns: '引擎依赖',
            },
            {
                cmd: 'junit-jupiter-params',
                syntax: "testImplementation 'org.junit.jupiter:junit-jupiter-params:<version>'",
                desc: 'JUnit 5 参数化测试',
                examples: ["// build.gradle\ntestImplementation 'org.junit.jupiter:junit-jupiter-params:5.10.0'"],
                returns: '参数化依赖',
            },
            {
                cmd: 'mockito-core',
                syntax: "testImplementation 'org.mockito:mockito-core:<version>'",
                desc: 'Mockito 核心',
                examples: ["// build.gradle\ntestImplementation 'org.mockito:mockito-core:5.5.0'"],
                returns: 'Mockito 依赖',
            },
            {
                cmd: 'mockito-junit-jupiter',
                syntax: "testImplementation 'org.mockito:mockito-junit-jupiter:<version>'",
                desc: 'Mockito JUnit 5 集成',
                examples: ["// build.gradle\ntestImplementation 'org.mockito:mockito-junit-jupiter:5.5.0'"],
                returns: 'Mockito 集成依赖',
            },
        ],
    },
];

let _junit5SearchTimer = null;

function junit5CopyPre(btn, ev) {
    if (ev) ev.stopPropagation();
    const pre = btn.parentElement.querySelector('pre');
    if (!pre) return;
    safeCopy(pre.innerText);
}

function junit5Render(filter) {
    if (filter === undefined) {
        const el = document.getElementById('junit5Search');
        filter = el ? el.value : '';
    }
    filter = (filter || '').toLowerCase();
    const container = document.getElementById('junit5Content');
    if (!container) return;
    container.innerHTML = '';
    let hasResult = false;
    JUNIT5_REFS.forEach((group) => {
        const matched = filter
            ? group.items.filter(
                (it) =>
                    it.cmd.toLowerCase().includes(filter) ||
                    it.desc.toLowerCase().includes(filter) ||
                    (it.syntax && it.syntax.toLowerCase().includes(filter)) ||
                    (it.examples && it.examples.some((ex) => ex.toLowerCase().includes(filter)))
            )
            : group.items;
        if (matched.length === 0) return;
        hasResult = true;
        const section = document.createElement('div');
        section.style.cssText = 'margin-bottom:16px';
        section.innerHTML = `<div style="font-size:12px;font-weight:600;color:var(--accent);padding:6px 0;border-bottom:1px solid var(--border);margin-bottom:8px">${escapeHtml(group.cat)}</div>`;
        matched.forEach((item) => {
            const card = document.createElement('div');
            card.className = 'ref-card';
            let html = `<div class="ref-cmd-head"><code class="ref-cmd-name">${escapeHtml(item.cmd)}</code><span class="ref-cmd-desc">${escapeHtml(item.desc)}</span><button class="sm outline" onclick="safeCopy('${escapeHtml(item.cmd).replace(/'/g, "\\'")}')">复制</button></div>`;
            if (item.syntax && item.syntax !== item.cmd) {
                html += `<div class="ref-syntax">${escapeHtml(item.syntax)}</div>`;
            }
            if (item.examples && item.examples.length) {
                html += `<div class="ref-section-title">示例</div>`;
                item.examples.forEach((ex) => {
                    html += `<div class="ref-copy-wrap"><pre class="ref-pre"><code>${escapeHtml(ex)}</code></pre><button class="ref-copy-btn" onclick="junit5CopyPre(this, event)">复制</button></div>`;
                });
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

function junit5Search() {
    clearTimeout(_junit5SearchTimer);
    _junit5SearchTimer = setTimeout(function () {
        const el = document.getElementById('junit5Search');
        junit5Render(el ? el.value : '');
    }, 200);
}

registerInit('junit5', junit5Render);
