const MAVEN_CMDS = [
    {
        cat: '生命周期（mvn phase）',
        items: [
            {cmd: 'mvn validate', desc: '验证项目：必要信息是否完整'},
            {cmd: 'mvn compile', desc: '编译主代码（src/main/java）'},
            {cmd: 'mvn test-compile', desc: '编译测试代码（src/test/java）'},
            {cmd: 'mvn test', desc: '运行单元测试'},
            {cmd: 'mvn package', desc: '打包：jar / war（不安装到本地仓库）'},
            {cmd: 'mvn verify', desc: '运行集成测试 / 校验包可用'},
            {cmd: 'mvn install', desc: '打包并安装到本地仓库 ~/.m2'},
            {cmd: 'mvn deploy', desc: '部署包到远程仓库（需 distributionManagement）'},
            {cmd: 'mvn clean', desc: '清理 target 目录'},
            {cmd: 'mvn clean package', desc: '清理后打包（最常用组合）'},
            {cmd: 'mvn clean install -DskipTests', desc: '清理 + 安装到本地仓库，跳过测试'},
        ]
    },
    {
        cat: '依赖管理',
        items: [
            {cmd: 'mvn dependency:tree', desc: '查看依赖树'},
            {cmd: 'mvn dependency:tree -Dverbose', desc: '依赖树（显示冲突 / omitted / version）'},
            {cmd: 'mvn dependency:list', desc: '列出所有依赖'},
            {cmd: 'mvn dependency:resolve', desc: '解析并下载依赖到本地仓库'},
            {cmd: 'mvn dependency:analyze', desc: '分析依赖：未声明使用 / 缺失声明'},
            {cmd: 'mvn dependency:analyze-duplicate', desc: '检测重复声明的依赖'},
            {cmd: 'mvn dependency:copy-dependencies -DoutputDirectory=lib', desc: '拷贝所有依赖到指定目录'},
            {cmd: 'mvn dependency:purge-local-repository', desc: '清空本地仓库依赖后重新下载'},
            {cmd: 'mvn versions:display-dependency-updates', desc: '检查依赖最新版本'},
        ]
    },
    {
        cat: '常用参数',
        items: [
            {cmd: '-DskipTests', desc: '跳过测试运行（仍编译）'},
            {cmd: '-Dmaven.test.skip=true', desc: '跳过测试编译 + 运行'},
            {cmd: '-U', desc: '强制更新 SNAPSHOT 依赖'},
            {cmd: '-e', desc: '出错时输出完整异常堆栈'},
            {cmd: '-X', desc: 'Debug 日志（最详细）'},
            {cmd: '-q', desc: '安静模式（仅 ERROR）'},
            {cmd: '-o', desc: 'offline 离线模式（不联网）'},
            {cmd: '-P <profile>', desc: '激活指定 profile（逗号分隔可多个）'},
            {cmd: '-pl <module>', desc: '指定子模块（逗号分隔多模块）'},
            {cmd: '-am', desc: '同时构建依赖的模块（与 -pl 搭配）'},
            {cmd: '-Dmaven.javadoc.skip=true', desc: '跳过 javadoc 生成'},
            {cmd: '-T 4', desc: '4 线程并行构建（提高多模块速度）'},
            {cmd: '-Dmaven.compiler.source=17 -Dmaven.compiler.target=17', desc: '指定 Java 编译版本'},
            {cmd: '-f pom.xml', desc: '指定 pom 文件'},
        ]
    },
    {
        cat: '插件调用',
        items: [
            {cmd: 'mvn spring-boot:run', desc: '本地启动 Spring Boot 应用'},
            {cmd: 'mvn spring-boot:repackage', desc: '将 jar 重新打包为可执行 fat jar'},
            {cmd: 'mvn spring-boot:build-image', desc: '使用 buildpacks 构建 Docker 镜像（Spring Boot 2.3+）'},
            {cmd: 'mvn mybatis-generator:generate', desc: '运行 MyBatis Generator'},
            {cmd: 'mvn jib:build', desc: '使用 Jib 直接构建 Docker 镜像（无需 docker daemon）'},
            {cmd: 'mvn jib:dockerBuild', desc: 'Jib 构建镜像到本地 Docker'},
            {cmd: 'mvn compile exec:java -Dexec.mainClass=com.example.Main', desc: '运行 main 方法（exec-maven-plugin）'},
            {cmd: 'mvn jar:jar', desc: '仅打包 jar（不经过 package 阶段）'},
        ]
    },
    {
        cat: '仓库 / 配置查询',
        items: [
            {cmd: 'mvn help:system', desc: '查看 Java / Maven / 系统环境信息'},
            {cmd: 'mvn help:effective-pom', desc: '合并后的 effective POM（含继承 / profile 合并）'},
            {cmd: 'mvn help:effective-settings', desc: '合并后的 effective settings.xml'},
            {cmd: 'mvn help:active-profiles', desc: '当前激活的 profile'},
            {cmd: 'mvn help:describe -Dplugin=compiler', desc: '查看插件信息'},
            {cmd: 'mvn help:evaluate -Dexpression=project.basedir', desc: '求值 Maven 表达式'},
            {cmd: 'mvn archetype:generate', desc: '从 archetype 生成项目骨架'},
            {cmd: 'mvn archetype:create-from-project', desc: '从现有项目生成 archetype'},
        ]
    },
    {
        cat: '发布 / 部署',
        items: [
            {cmd: 'mvn release:clean', desc: '清理 release 过程文件'},
            {cmd: 'mvn release:prepare', desc: '准备 release：升级版本号、tag、提交'},
            {cmd: 'mvn release:perform', desc: '执行 release：检出 tag → deploy'},
            {cmd: 'mvn release:rollback', desc: '回滚 release 准备'},
            {cmd: 'mvn deploy -DrepositoryId=releases', desc: '指定仓库 id 部署'},
        ]
    },
];

let mavenrefSearchTimer = null;

function mavenrefRender(filter) {
    const container = document.getElementById('mavenrefContent');
    if (!container) return;
    filter = (filter || '').trim().toLowerCase();
    container.innerHTML = '';
    let hasResult = false;
    MAVEN_CMDS.forEach(group => {
        const matched = filter
            ? group.items.filter(i =>
                i.cmd.toLowerCase().includes(filter) ||
                i.desc.toLowerCase().includes(filter))
            : group.items;
        if (!matched.length) return;
        hasResult = true;
        const section = document.createElement('div');
        section.style.cssText = 'margin-bottom:16px';
        section.innerHTML = `<div style="font-size:12px;font-weight:600;color:var(--accent);padding:6px 0;border-bottom:1px solid var(--border);margin-bottom:8px">${group.cat}</div>`;
        matched.forEach(item => {
            const card = document.createElement('div');
            card.className = 'ref-card';
            card.innerHTML = `<div class="ref-cmd-head"><code class="ref-cmd-name">${item.cmd.replace(/</g, '&lt;')}</code><span class="ref-cmd-desc">${item.desc}</span><button class="sm outline" onclick="safeCopy('${item.cmd.replace(/'/g, "\\'")}')">复制</button></div>`;
            section.appendChild(card);
        });
        container.appendChild(section);
    });
    if (!hasResult) {
        container.innerHTML = '<div style="color:var(--text-muted);padding:20px;text-align:center">无匹配结果</div>';
    }
}

function mavenrefSearch() {
    clearTimeout(mavenrefSearchTimer);
    mavenrefSearchTimer = setTimeout(() => {
        mavenrefRender(document.getElementById('mavenrefSearch').value);
    }, 200);
}

registerInit('mavenref', mavenrefRender);
