const GRADLE_CMDS = [
    {
        cat: '基础命令',
        items: [
            {
                cmd: 'gradle build',
                syntax: 'gradle build',
                desc: '编译 + 测试 + 打包',
                examples: ['gradle build', 'gradle build -x test'],
                returns: '构建产物（JAR/WAR）'
            },
            {
                cmd: 'gradle clean',
                syntax: 'gradle clean',
                desc: '删除 build 目录',
                examples: ['gradle clean'],
                returns: '无'
            },
            {
                cmd: 'gradle clean build',
                syntax: 'gradle clean build',
                desc: '清理后重新构建',
                examples: ['gradle clean build'],
                returns: '构建产物'
            },
            {
                cmd: 'gradle tasks',
                syntax: 'gradle tasks [--all]',
                desc: '列出所有可用任务',
                examples: ['gradle tasks', 'gradle tasks --all'],
                returns: '任务列表'
            },
            {
                cmd: 'gradle properties',
                syntax: 'gradle properties',
                desc: '列出所有项目属性',
                examples: ['gradle properties'],
                returns: '属性列表'
            },
            {
                cmd: 'gradle dependencies',
                syntax: 'gradle dependencies [--configuration <config>]',
                desc: '列出依赖树',
                examples: ['gradle dependencies', 'gradle dependencies --configuration compileClasspath'],
                returns: '依赖树'
            },
            {
                cmd: 'gradle projects',
                syntax: 'gradle projects',
                desc: '列出多模块项目结构',
                examples: ['gradle projects'],
                returns: '项目结构'
            }
        ]
    },
    {
        cat: '编译与运行',
        items: [
            {
                cmd: 'gradle compileJava',
                syntax: 'gradle compileJava',
                desc: '编译 Java 源码',
                examples: ['gradle compileJava'],
                returns: '编译后的 class 文件'
            },
            {
                cmd: 'gradle compileTestJava',
                syntax: 'gradle compileTestJava',
                desc: '编译测试源码',
                examples: ['gradle compileTestJava'],
                returns: '编译后的测试 class 文件'
            },
            {
                cmd: 'gradle run',
                syntax: 'gradle run',
                desc: '运行应用（application 插件）',
                examples: ['gradle run'],
                returns: '应用输出'
            },
            {
                cmd: 'gradle bootRun',
                syntax: 'gradle bootRun [--args=<args>]',
                desc: '运行 Spring Boot 应用',
                examples: ['gradle bootRun', 'gradle bootRun --args=\'--server.port=9090\''],
                returns: '应用输出'
            },
            {
                cmd: 'gradle test',
                syntax: 'gradle test [--tests <pattern>]',
                desc: '运行单元测试',
                examples: ['gradle test', 'gradle test --tests "*.UserServiceTest"', 'gradle test --tests "*.UserServiceTest.testCreate"'],
                returns: '测试报告'
            },
            {
                cmd: 'gradle check',
                syntax: 'gradle check',
                desc: '运行所有检查（测试 + 静态分析）',
                examples: ['gradle check'],
                returns: '检查报告'
            }
        ]
    },
    {
        cat: '打包与发布',
        items: [
            {
                cmd: 'gradle jar',
                syntax: 'gradle jar',
                desc: '生成 JAR 文件',
                examples: ['gradle jar'],
                returns: 'build/libs/*.jar'
            },
            {
                cmd: 'gradle shadowJar',
                syntax: 'gradle shadowJar',
                desc: '生成 Fat/Uber JAR（包含所有依赖）',
                examples: ['gradle shadowJar'],
                returns: 'build/libs/*-all.jar'
            },
            {
                cmd: 'gradle bootJar',
                syntax: 'gradle bootJar',
                desc: '生成 Spring Boot 可执行 JAR',
                examples: ['gradle bootJar'],
                returns: 'build/libs/*.jar'
            },
            {
                cmd: 'gradle war',
                syntax: 'gradle war',
                desc: '生成 WAR 文件',
                examples: ['gradle war'],
                returns: 'build/libs/*.war'
            },
            {
                cmd: 'gradle publish',
                syntax: 'gradle publish',
                desc: '发布到 Maven 仓库',
                examples: ['gradle publish'],
                returns: '发布结果'
            },
            {
                cmd: 'gradle publishToMavenLocal',
                syntax: 'gradle publishToMavenLocal',
                desc: '发布到本地 Maven 仓库 (~/.m2)',
                examples: ['gradle publishToMavenLocal'],
                returns: '~/.m2/repository/...'
            }
        ]
    },
    {
        cat: '依赖管理',
        items: [
            {
                cmd: 'gradle dependencies',
                syntax: 'gradle dependencies [--configuration <config>]',
                desc: '查看完整依赖树',
                examples: ['gradle dependencies', 'gradle dependencies --configuration runtimeClasspath'],
                returns: '依赖树'
            },
            {
                cmd: 'gradle dependencyInsight',
                syntax: 'gradle dependencyInsight --dependency <lib> [--configuration <config>]',
                desc: '查看指定依赖来源',
                examples: ['gradle dependencyInsight --dependency spring-core', 'gradle dependencyInsight --dependency lombok --configuration compileClasspath'],
                returns: '依赖来源详情'
            },
            {
                cmd: 'gradle buildEnvironment',
                syntax: 'gradle buildEnvironment',
                desc: '查看构建脚本依赖',
                examples: ['gradle buildEnvironment'],
                returns: '构建依赖树'
            },
            {
                cmd: 'gradle --refresh-dependencies build',
                syntax: 'gradle --refresh-dependencies <task>',
                desc: '强制刷新依赖（忽略缓存）',
                examples: ['gradle --refresh-dependencies build'],
                returns: '构建结果'
            },
            {
                cmd: 'gradle dependencyUpdates',
                syntax: 'gradle dependencyUpdates',
                desc: '检查依赖更新（需 ben-manes 插件）',
                examples: ['gradle dependencyUpdates'],
                returns: '依赖更新报告'
            }
        ]
    },
    {
        cat: '缓存与构建',
        items: [
            {
                cmd: 'gradle --build-cache build',
                syntax: 'gradle --build-cache <task>',
                desc: '启用构建缓存',
                examples: ['gradle --build-cache build'],
                returns: '构建结果'
            },
            {
                cmd: 'gradle --no-build-cache build',
                syntax: 'gradle --no-build-cache <task>',
                desc: '禁用构建缓存',
                examples: ['gradle --no-build-cache build'],
                returns: '构建结果'
            },
            {
                cmd: 'gradle --offline build',
                syntax: 'gradle --offline <task>',
                desc: '离线模式（仅用本地缓存）',
                examples: ['gradle --offline build'],
                returns: '构建结果'
            },
            {
                cmd: 'gradle --parallel build',
                syntax: 'gradle --parallel <task>',
                desc: '并行构建多模块',
                examples: ['gradle --parallel build'],
                returns: '构建结果'
            },
            {
                cmd: 'gradle --continuous build',
                syntax: 'gradle --continuous <task>',
                desc: '持续构建（文件变更自动重建）',
                examples: ['gradle --continuous build'],
                returns: '持续构建输出'
            },
            {
                cmd: 'gradle --scan build',
                syntax: 'gradle --scan <task>',
                desc: '生成构建扫描报告（需联网）',
                examples: ['gradle --scan build'],
                returns: '扫描 URL'
            },
            {
                cmd: 'gradle --profile build',
                syntax: 'gradle --profile <task>',
                desc: '生成构建性能报告',
                examples: ['gradle --profile build'],
                returns: 'build/reports/profile/profile-*.html'
            }
        ]
    },
    {
        cat: 'Gradle Wrapper',
        items: [
            {
                cmd: 'gradle wrapper',
                syntax: 'gradle wrapper [--gradle-version <version>]',
                desc: '生成 Wrapper 文件',
                examples: ['gradle wrapper', 'gradle wrapper --gradle-version 8.5'],
                returns: 'gradlew / gradlew.bat / gradle/wrapper/*'
            },
            {
                cmd: './gradlew build',
                syntax: './gradlew <task> (Linux/Mac)',
                desc: '使用 Wrapper 构建',
                examples: ['./gradlew build', './gradlew clean test'],
                returns: '构建结果'
            },
            {
                cmd: 'gradlew.bat build',
                syntax: 'gradlew.bat <task> (Windows)',
                desc: '使用 Wrapper 构建',
                examples: ['gradlew.bat build', 'gradlew.bat clean test'],
                returns: '构建结果'
            },
            {
                cmd: './gradlew --version',
                syntax: './gradlew --version',
                desc: '查看 Gradle 版本',
                examples: ['./gradlew --version'],
                returns: '版本信息'
            },
            {
                cmd: './gradlew --gradle-version 8.5 wrapper',
                syntax: './gradlew --gradle-version <version> wrapper',
                desc: '升级 Wrapper 版本',
                examples: ['./gradlew --gradle-version 8.5 wrapper'],
                returns: '更新后的 Wrapper 文件'
            }
        ]
    },
    {
        cat: '代码质量',
        items: [
            {
                cmd: 'gradle checkstyleMain',
                syntax: 'gradle checkstyleMain',
                desc: '运行 Checkstyle 检查',
                examples: ['gradle checkstyleMain'],
                returns: 'build/reports/checkstyle/main.html'
            },
            {
                cmd: 'gradle pmdMain',
                syntax: 'gradle pmdMain',
                desc: '运行 PMD 静态分析',
                examples: ['gradle pmdMain'],
                returns: 'build/reports/pmd/main.html'
            },
            {
                cmd: 'gradle spotbugsMain',
                syntax: 'gradle spotbugsMain',
                desc: '运行 SpotBugs 分析',
                examples: ['gradle spotbugsMain'],
                returns: 'build/reports/spotbugs/main.html'
            },
            {
                cmd: 'gradle jacocoTestReport',
                syntax: 'gradle jacocoTestReport',
                desc: '生成测试覆盖率报告',
                examples: ['gradle jacocoTestReport'],
                returns: 'build/reports/jacoco/test/html/index.html'
            },
            {
                cmd: 'gradle sonarqube',
                syntax: 'gradle sonarqube',
                desc: '提交到 SonarQube 分析',
                examples: ['gradle sonarqube'],
                returns: 'SonarQube 分析结果'
            },
            {
                cmd: 'gradle spotlessApply',
                syntax: 'gradle spotlessApply',
                desc: '格式化代码（Spotless 插件）',
                examples: ['gradle spotlessApply'],
                returns: '格式化后的代码'
            },
            {
                cmd: 'gradle detekt',
                syntax: 'gradle detekt',
                desc: 'Kotlin 静态分析（Detekt 插件）',
                examples: ['gradle detekt'],
                returns: 'build/reports/detekt/detekt.html'
            }
        ]
    },
    {
        cat: '调试与日志',
        items: [
            {
                cmd: 'gradle build --info',
                syntax: 'gradle <task> --info',
                desc: '显示详细日志',
                examples: ['gradle build --info'],
                returns: '详细构建日志'
            },
            {
                cmd: 'gradle build --debug',
                syntax: 'gradle <task> --debug',
                desc: '显示调试日志',
                examples: ['gradle build --debug'],
                returns: '调试日志'
            },
            {
                cmd: 'gradle build --stacktrace',
                syntax: 'gradle <task> --stacktrace',
                desc: '显示完整堆栈',
                examples: ['gradle build --stacktrace'],
                returns: '完整错误堆栈'
            },
            {
                cmd: 'gradle --dry-run build',
                syntax: 'gradle --dry-run <task>',
                desc: '模拟构建（不实际执行）',
                examples: ['gradle --dry-run build'],
                returns: '任务执行计划'
            },
            {
                cmd: 'gradle build --console=plain',
                syntax: 'gradle <task> --console=plain',
                desc: '简化控制台输出',
                examples: ['gradle build --console=plain'],
                returns: '简化日志'
            }
        ]
    },
    {
        cat: '多模块项目',
        items: [
            {
                cmd: 'gradle :module:build',
                syntax: 'gradle :<module>:<task>',
                desc: '构建指定子模块',
                examples: ['gradle :service:build', 'gradle :api:compileJava'],
                returns: '模块构建结果'
            },
            {
                cmd: 'gradle :module:test',
                syntax: 'gradle :<module>:test',
                desc: '运行指定模块测试',
                examples: ['gradle :service:test'],
                returns: '模块测试报告'
            },
            {
                cmd: 'gradle buildNeeded',
                syntax: 'gradle buildNeeded',
                desc: '构建当前模块及依赖模块',
                examples: ['gradle buildNeeded'],
                returns: '构建结果'
            },
            {
                cmd: 'gradle buildDependents',
                syntax: 'gradle buildDependents',
                desc: '构建依赖当前模块的所有模块',
                examples: ['gradle buildDependents'],
                returns: '构建结果'
            }
        ]
    },
    {
        cat: '常用插件任务',
        items: [
            {
                cmd: 'gradle generateProto',
                syntax: 'gradle generateProto',
                desc: '生成 Protobuf 代码',
                examples: ['gradle generateProto'],
                returns: 'build/generated/source/proto/*'
            },
            {
                cmd: 'gradle openApiGenerate',
                syntax: 'gradle openApiGenerate',
                desc: '生成 OpenAPI 客户端',
                examples: ['gradle openApiGenerate'],
                returns: '生成的客户端代码'
            },
            {
                cmd: 'gradle jib',
                syntax: 'gradle jib [--image=<image>]',
                desc: '构建 Docker 镜像（Google Jib）',
                examples: ['gradle jib', 'gradle jib --image=myapp:latest'],
                returns: 'Docker 镜像'
            },
            {
                cmd: 'gradle dockerBuild',
                syntax: 'gradle dockerBuild',
                desc: '构建 Docker 镜像（Spring Boot）',
                examples: ['gradle dockerBuild'],
                returns: 'Docker 镜像'
            },
            {
                cmd: 'gradle flywayMigrate',
                syntax: 'gradle flywayMigrate',
                desc: '执行数据库迁移（Flyway）',
                examples: ['gradle flywayMigrate'],
                returns: '迁移结果'
            },
            {
                cmd: 'gradle liquibaseUpdate',
                syntax: 'gradle liquibaseUpdate',
                desc: '执行数据库迁移（Liquibase）',
                examples: ['gradle liquibaseUpdate'],
                returns: '迁移结果'
            }
        ]
    }
];

let _gradleSearchTimer = null;

function gradleEscapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function gradleCopyPre(btn, ev) {
    if (ev) ev.stopPropagation();
    const pre = btn.parentElement.querySelector('pre');
    if (!pre) return;
    safeCopy(pre.innerText);
}

function gradleRender(filter) {
    if (filter === undefined) {
        const el = document.getElementById('gradleSearch');
        filter = el ? el.value : '';
    }
    filter = (filter || '').toLowerCase();
    const container = document.getElementById('gradleContent');
    if (!container) return;
    container.innerHTML = '';
    let hasResult = false;
    GRADLE_CMDS.forEach(group => {
        const matched = filter
            ? group.items.filter(it =>
                it.cmd.toLowerCase().includes(filter) ||
                it.desc.toLowerCase().includes(filter) ||
                (it.syntax && it.syntax.toLowerCase().includes(filter)) ||
                (it.examples && it.examples.some(ex => ex.toLowerCase().includes(filter))))
            : group.items;
        if (matched.length === 0) return;
        hasResult = true;
        const section = document.createElement('div');
        section.style.cssText = 'margin-bottom:16px';
        section.innerHTML = `<div style="font-size:12px;font-weight:600;color:var(--accent);padding:6px 0;border-bottom:1px solid var(--border);margin-bottom:8px">${gradleEscapeHtml(group.cat)}</div>`;
        matched.forEach(item => {
            const card = document.createElement('div');
            card.className = 'ref-card';
            let html = `<div class="ref-cmd-head"><code class="ref-cmd-name">${gradleEscapeHtml(item.cmd)}</code><span class="ref-cmd-desc">${gradleEscapeHtml(item.desc)}</span><button class="sm outline" onclick="safeCopy('${gradleEscapeHtml(item.cmd).replace(/'/g, "\\'")}')">复制</button></div>`;
            if (item.syntax && item.syntax !== item.cmd) {
                html += `<div class="ref-syntax">${gradleEscapeHtml(item.syntax)}</div>`;
            }
            if (item.examples && item.examples.length) {
                html += `<div class="ref-section-title">示例</div>`;
                item.examples.forEach(ex => {
                    html += `<div class="ref-copy-wrap"><pre class="ref-pre"><code>${gradleEscapeHtml(ex)}</code></pre><button class="ref-copy-btn" onclick="gradleCopyPre(this, event)">复制</button></div>`;
                });
            }
            if (item.returns) {
                html += `<div style="font-size:11px;color:var(--text-muted);margin-top:6px"><strong>输出:</strong> ${gradleEscapeHtml(item.returns)}</div>`;
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

function gradleSearch() {
    clearTimeout(_gradleSearchTimer);
    _gradleSearchTimer = setTimeout(function () {
        const el = document.getElementById('gradleSearch');
        gradleRender(el ? el.value : '');
    }, 200);
}

registerInit('gradle', gradleRender);
