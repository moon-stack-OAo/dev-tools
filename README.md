# CodeCasket · 码匣

> **CodeCasket（码匣）** —— 面向开发者 / 全栈的**纯前端**在线工具集（含丰富 Java 后端深度工具）—— **158 个工具、8 大分类**
> ，覆盖格式化、编解码、安全、生成与转换、代码生成、文本、调试、参考速查。无需后端、无需联网、无需上传数据，所有计算均在浏览器本地完成。支持
> Vite 开发、Docker 一键部署、Nginx 静态托管，开箱即用。

![纯前端](https://img.shields.io/badge/前端-原生%20JavaScript-yellow?logo=javascript)
![构建工具](https://img.shields.io/badge/构建-Vite%206-646CFF?logo=vite)
![测试](https://img.shields.io/badge/测试-Vitest-6E9F18?logo=vitest)
![依赖本地化](https://img.shields.io/badge/依赖-本地化-blue)
![离线可用](https://img.shields.io/badge/离线-可用-success)
![License](https://img.shields.io/badge/license-MIT-blue)

## ✨ 核心特性

- 🚀 **零依赖开箱即用**：纯静态 HTML / CSS / JavaScript，无任何前端框架；业务代码无构建期编译，第三方库通过 Vite + esbuild
  打包为 IIFE
- 🔒 **数据 100% 本地处理**：所有计算在浏览器内完成，不会上传任何内容到服务器，支持离线使用
- 🧰 **158 个工具 / 8 大分类**：覆盖全栈日常，Java 场景深度增强，工具持续扩充
- ⭐ **收藏与最近使用**：侧边栏 / 首页星标收藏（`localStorage`），虚拟分类「收藏」「最近使用」
- 🎨 **深色主题 + 响应式**：桌面 / 平板 / 手机均可使用
- 🐳 **多种部署方式**：Vite 开发、Docker 容器、Nginx 静态托管、GitHub Pages（`main` 推送触发）
- 📦 **依赖本地化**：20 个 npm 包本地化为 22 个 `.min.js` 文件 + 5 个 Pyodide 核心文件，全部内置到 `public/lib/`，**按需懒加载
  **
  （打开对应工具时才加载），断网仍可使用（图标字体
  `bootstrap-icons` 随 `npm install` 注入到
  `node_modules` 后由 Vite 构建产物发布）
- 🧪 **单元测试覆盖**：单元测试覆盖核心工具的纯逻辑

---

## 📑 目录

- [快速开始](#-快速开始)
- [项目结构](#-项目结构)
- [工具列表](#-工具列表)
- [技术说明](#-技术说明)
- [本地化依赖列表](#-本地化依赖列表)
- [贡献](#-贡献)

---

## 🚀 快速开始

### 方式一：本地开发（推荐）

```bash
npm install
npm run dev       # http://localhost:3000
```

### 方式二：Docker 部署

```bash
docker build -t dev-tools .
docker run -d -p 8080:80 --name dev-tools dev-tools
# http://localhost:8080
```

### 方式三：Nginx 静态托管

```bash
npm run build     # 输出到 dist/
```

将 `dist/` 目录上传到服务器，参考项目根目录的 `nginx.conf` 配置即可。

> ⚠️ **不要直接双击 `index.html` 打开**：工具面板拆分为 `html/panels/{cat}/{toolId}.html`，运行时通过 `fetch` 异步加载。浏览器在
> `file://` 协议下会拦截跨源请求，页面会卡在"正在加载工具模块..."。请使用上述任一 HTTP 服务方式访问。

---

## 📁 项目结构

```
├── index.html                      # 入口（首页；工具脚本/面板/依赖库均按需懒加载）
├── html/panels/                    # 工具面板（158 个文件，每个工具一个 HTML）
│   ├── format/                     #  格式化：json / yaml / toml / graphqlfmt / openapiview / ...
│   ├── encode/                     #  编解码：base64 / base32 / charset / protobuf / ...
│   ├── security/                   #  安全：jwt / jasypt / pwdstrength / hashext / gmsm / ...
│   ├── generate/                   #  生成：uuid / ulid / snowflake / bytesize / ...
│   ├── codegen/                    #  代码生成：jsontopojo / json2code / sql2mybatis / ...
│   ├── text/                       #  文本：regex / htmlmd / barcode / qrcode / ...
│   ├── debug/                      #  调试：httpdebug / ws / cron / sse / ...
│   └── reference/                  #  参考：arthas / flowableref / springboot / ...
├── css/                            # 样式（通用层 + 布局层 + 类别专属）
│   ├── base.css                    #  CSS 变量 / reset / 按钮 / 表单 / toast / 滚动条
│   ├── layout.css                  #  主框架 / header / 面包屑 / 首页卡片 / 收藏星标
│   ├── format.css                  #  格式化类别样式
│   ├── encode.css                  #  编解码类别样式
│   ├── security.css                #  安全类别样式
│   ├── generate.css                #  生成与转换类别样式
│   ├── codegen.css                 #  代码生成类别样式
│   ├── text.css                    #  文本类别样式
│   ├── debug.css                   #  调试类别样式
│   └── reference.css               #  参考类别样式
├── js/
│   ├── app.js                      # 启动装配：主题 / DOM 缓存 / toast / openTool 生命周期
│   ├── tools-registry.js           # 工具分类 + tools[] 注册表（纯数据，单一事实来源）
│   ├── loader.js                   # 懒加载：toolLibs / loadLib / loadTool* / registerInit
│   ├── router.js                   # hash 路由 #/tool/{id}
│   ├── ui-home.js                  # 首页网格 / 搜索 / 收藏星标
│   ├── ui-sidebar.js               # 侧边栏导航
│   ├── utils.js                    # escapeHtml / debounce / download / formatBytes 等
│   ├── crypto-utils.js             # 编解码公共：bytes ↔ hex / base64 等
│   ├── favorites.js                # 收藏持久化（localStorage）
│   ├── format/                     #  格式化工具脚本
│   ├── encode/                     #  编解码工具脚本
│   ├── security/                   #  安全工具脚本
│   ├── generate/                   #  生成与转换工具脚本
│   ├── codegen/                    #  代码生成工具脚本
│   ├── text/                       #  文本工具脚本
│   ├── debug/                      #  调试工具脚本
│   └── reference/                  #  参考工具脚本（含 _ref-engine.js 公共引擎）
├── public/lib/                     # 本地化的第三方库（22 个 .min.js，对应 20 个 npm 包）
├── scripts/
│   ├── copy-libs.js                # 从 node_modules 复制依赖到 public/lib
│   └── cors-proxy-server.js        # 生产环境 CORS 代理（Docker / Nginx）
├── docs/                           # 开发文档
├── test/                           # 单元测试（Vitest）
├── .github/workflows/static.yml    # GitHub Pages 自动部署（main / tag dev-tools / 手动）
├── package.json
├── vite.config.js
├── vitest.config.js
├── eslint.config.mjs
├── Dockerfile
├── nginx.conf
└── .dockerignore
```

---

## 🧰 工具列表

> 工具总数 **158 个**，分为 **8 大业务分类**（另有虚拟分类「收藏」「最近使用」）。下表功能描述与 `js/tools-registry.js` 中
`tools[]` 的 `desc` 保持一致。

### 一、格式化（25）

| 工具                | 功能                                    |
|-------------------|---------------------------------------|
| JSON 格式化          | 格式化 / 压缩 / 验证 JSON                    |
| XML 格式化           | 格式化 / 压缩 / 验证 XML                     |
| YAML 格式化          | YAML 格式化 / JSON 互转                    |
| TOML 格式化          | TOML 格式化 / JSON 互转 / 校验               |
| Properties 格式化    | Properties ↔ YAML 互转                  |
| SQL 格式化           | SQL 美化 / 多方言支持                        |
| JSON/XML/YAML 互转  | JSON / XML / YAML 格式互相转换              |
| JSONPath 查询       | JSONPath 表达式查询 / 提取                   |
| JSON Schema       | JSON Schema 生成 / 校验                   |
| SQL 方言转换          | MySQL/Oracle/PG/SQLServer 互转          |
| 数据库类型映射           | MySQL/Oracle/PG/SQLServer 类型对照        |
| JSON → SQL INSERT | JSON 对象/数组生成多方言 INSERT                |
| XPath 查询          | XPath 1.0 查询 / 提取 XML 节点              |
| SQL 执行计划          | MySQL/PostgreSQL EXPLAIN 格式化 / 可视化    |
| Nginx 格式化         | Nginx 配置格式化 / 压缩 / Lint               |
| Java 代码格式化        | Java 美化 / 缩进 / 大括号风格 / import 排序      |
| DDL Schema 对比     | 两个 DDL 字段粒度 diff / 跨方言                |
| JSON ↔ Excel/CSV  | JSON / CSV / Excel 互转 · 嵌套展平 · 多分隔符   |
| 图片转 PDF           | 多张图片合成 PDF / 页面尺寸与方向可配                |
| PDF 合并 / 拆分       | 多 PDF 合并 / 按页码范围拆分                    |
| GraphQL 格式化       | GraphQL 查询/mutation 美化 / 压缩 / 括号检查    |
| OpenAPI 预览        | OpenAPI 3 / Swagger 2 摘要预览 / paths 浏览 |
| .env / 环境变量       | .env 解析 / 格式化对齐 / JSON 互转 / 重复 key    |
| JSON 扁平化          | 嵌套 JSON ↔ 点号/括号路径扁平 Map               |
| JSON 结构化对比        | 两份 JSON 键路径级 diff / 增删改报告             |

### 二、编解码（11）

| 工具              | 功能                                       |
|-----------------|------------------------------------------|
| Base64          | Base64 编码解码 / 文件支持                       |
| URL 编码          | URL 编解码 / Component 模式                   |
| Unicode         | `\uXXXX` 编码 / 解码                         |
| Java 转义         | Java 字符串转义 / 反转义                         |
| 编码解码            | 字节按编码解码 / UTF-8 编码 / 乱码对照                |
| HTML 转义         | HTML 实体编码 / 解码                           |
| 图片 Base64       | 图片与 Base64 互转 / DataURL                  |
| Hex 编码          | 字符串 ↔ Hex 互转（UTF-8）                      |
| Base32 / Base58 | Base32 (RFC 4648) / Base58 (Bitcoin) 编解码 |
| Protobuf 解码     | Protobuf ↔ JSON / Base64 / Hex           |
| 摩斯电码            | 文本 ↔ 摩斯电码（ITU；可选中文电码汉字↔四位电报码）            |

### 三、安全（19）

| 工具            | 功能                                             |
|---------------|------------------------------------------------|
| JWT 解码        | 解析 JWT Header / Payload                        |
| JWT 生成        | HS256/384/512 + RS256/384/512 签名               |
| Hash 计算       | MD5 / SHA-1 / SHA-256 / SHA-512                |
| HMAC 计算       | HMAC-MD5 / SHA-1 / SHA-256 / SHA-384 / SHA-512 |
| Hash 扩展       | CRC32 / CRC32C / Adler32 / SM3                 |
| 随机生成器         | 密码 / Token / PIN 生成                            |
| 密码强度检测        | 本地检测密码强度 / 改进建议                                |
| AES 加解密       | AES 对称加密 / 解密                                  |
| Jasypt 加解密    | PBEWithMD5AndDES 配置加解密 / ENC(...)              |
| RSA 工具        | 密钥生成 / 加解密 / 签名                                |
| bcrypt 加密     | bcrypt 哈希 / 验证                                 |
| TOTP 动态令牌     | TOTP/HOTP 本地生成 + URI 解析                        |
| 国密 SM2/3/4    | 国密 SM2 公钥 / SM3 摘要 / SM4 对称                    |
| PBKDF2 哈希     | PBKDF2-HMAC-SHA256/512 密码哈希（标准 PHC 格式）         |
| X.509 证书      | X.509 证书 PEM/DER 解析                            |
| Webhook 签名    | HMAC-SHA256 生成/校验 / GitHub / Stripe            |
| OAuth2 / PKCE | code_verifier / challenge / Authorize URL      |
| CVSS 3.1 评分   | CVSS v3.1 Base Score / 向量字符串                   |
| JWT 验签        | HMAC/RSA 验签 / exp·nbf·iat 时间声明校验               |

### 四、生成与转换（20）

| 工具            | 功能                                     |
|---------------|----------------------------------------|
| UUID 生成       | UUID v4 / v7 / 批量生成                    |
| ULID / NanoID | ULID / NanoID 生成与 ULID 解析              |
| 雪花 ID         | Snowflake / Leaf / UID 三合一生成解析         |
| 时间戳转换         | Unix 毫秒/秒 ↔ 日期                         |
| 颜色转换          | HEX / RGB / HSL 互转预览                   |
| 进制转换          | 2~36 进制互转                              |
| 图片压缩          | JPEG/PNG/WebP 互转 / 质量调节 / 批量处理         |
| 图片混淆          | Gilbert 曲线像素混淆 / 解混淆（可逆 · 本地）          |
| Case 转换       | camelCase / snake_case 等               |
| 数据 Mock       | 生成姓名 / 手机号 / 邮箱等                       |
| 日期计算器         | 日期加减 / 间隔 / 工作日                        |
| 时区转换          | 跨时区时间换算                                |
| 分辨率比例         | 宽高比 / 档位匹配 / 按比例反算                     |
| 字节单位换算        | B/KB/MB/GB ↔ KiB/MiB/GiB，1000/1024 进制  |
| SemVer 版本     | 解析 / 比较 / 排序 / 范围满足                    |
| chmod 权限      | 八进制 ↔ rwx 符号 ↔ 权限说明                    |
| 金额大写 / 信用代码   | 人民币大写 / 统一社会信用代码 / 银行卡 Luhn            |
| Java 时间格式     | DateTimeFormatter 模式试算 / 字母速查 / 常见模板   |
| Spring 配置键转换  | relaxed binding：kebab / camel / env 互转 |
| 证件号校验         | 身份证校验位/地区 / 手机号段 / 银行卡 Luhn            |

### 五、代码生成（18）

| 工具                  | 功能                                             |
|---------------------|------------------------------------------------|
| JSON → Java         | JSON 生成 Java POJO 类                            |
| JSON → 多语言          | JSON 生成 TypeScript / Kotlin / Go               |
| JSON → Interface    | JSON / Object 生成 TypeScript interface / type   |
| SQL → Java          | DDL 生成 MyBatis Plus 实体                         |
| SQL → MyBatis       | DDL 生成 Mapper XML + Interface                  |
| Maven 坐标            | GAV → pom / Gradle / SBT 依赖片段                  |
| 邮件模板                | 邮件 HTML 模板生成 / 预览 / 内联 CSS                     |
| JMH 模板              | JMH 基准测试代码生成                                   |
| 测试模板                | JUnit 5 + Mockito 测试生成                         |
| Java Stream 生成      | 可视化组装 Stream API 链 / 自动 import                 |
| JMH 进阶              | JMH 完整注解 / Group / Compiler Control / Timeout  |
| Bean Validation     | javax.validation 注解自动推导 / DTO 生成               |
| PlantUML 类图         | Java/JSON 转 PlantUML 类图源码                      |
| MapStruct 骨架        | 两个 Java 类生成 MapStruct Mapper 接口                |
| DDL → Mermaid ER    | CREATE TABLE 生成 Mermaid erDiagram              |
| Flyway/Liquibase 骨架 | Flyway 文件名与 SQL / Liquibase YAML·XML changeset |
| JS/TS 运行            | 浏览器中执行 JS/TS 代码 / 捕获 console 输出                |
| Python 运行           | 基于 Pyodide 在浏览器中运行 Python 3 代码 / 捕获 stdout     |

### 六、文本（15）

| 工具                | 功能                          |
|-------------------|-----------------------------|
| 二维码解析             | 图片 → URL / 文本 / WiFi        |
| 文本对比              | 文本差异对比高亮                    |
| 正则表达式             | 正则匹配测试 / 分组查看               |
| 文本统计              | 字符 / 单词 / 行数 / 字节           |
| CSV 格式化           | CSV 表格化查看 / 校对              |
| Markdown 预览       | Markdown 实时预览 / 导出 HTML     |
| HTML ↔ Markdown   | HTML 与 Markdown 互转          |
| Web 格式化           | HTML / CSS / JS 格式化压缩       |
| 二维码生成             | 文本 / URL 生成二维码下载            |
| 条形码生成             | Code128 / Code39 条形码生成下载    |
| 模板替换              | 多种语法字符串变量替换                 |
| 数据脱敏              | 手机/身份证/银行卡/邮箱等本地脱敏          |
| 行尾 / BOM / 不可见字符  | CRLF/LF/CR、BOM、零宽字符检测与转换    |
| Markdown 表格 / 文本树 | CSV↔MD 表格 / 路径与缩进转树形字符画     |
| 正则 → Java 代码      | 生成 Pattern/Matcher 与正确转义字面量 |

### 七、调试（21）

| 工具             | 功能                                      |
|----------------|-----------------------------------------|
| Cron 表达式       | Cron 解析 / 下次执行时间                        |
| Quartz / 定时表达式 | Quartz cron 解析 / 与 Unix 差异 / @Scheduled |
| SpEL 速查 / 试算   | SpEL 语法速查 / 简易表达式求值                     |
| WebSocket      | WebSocket 连接调试                          |
| STOMP          | STOMP over WebSocket 调试                 |
| HTTP 调试        | 发送请求 / cURL 解析 / Fetch·Axios·Java 代码生成  |
| Cookie / 缓存头   | Cookie·Set-Cookie 解析构造 / Cache-Control  |
| IP 工具          | IP 归属 / 子网计算                            |
| gRPC 调试        | Metadata 构造 / Protobuf 解码 / 状态码         |
| URL 解析         | URL 拆解 / 编码解码                           |
| UA 解析          | User-Agent 解析                           |
| 日志高亮           | 日志格式化 + 级别着色 + 堆栈折叠                     |
| 日志 Pattern     | Logback/Log4j conversion word 解析与模板     |
| 链路追踪头          | W3C traceparent / B3 生成与解析              |
| 异常分析           | Java 堆栈跟踪解析 / 格式化                       |
| 线程 Dump 分析     | jstack 线程状态统计 / 死锁检测                    |
| SSE 调试         | Server-Sent Events 实时调试                 |
| MyBatis SQL 还原 | Preparing + Parameters 合成可执行 SQL        |
| SQL 参数绑定       | ? / :name 占位符 + 参数列表填充为完整 SQL           |
| URL 参数构造器      | 表格编辑 query，生成 URL / 解析回填                |
| 线程池参数估算        | 按 QPS/耗时估算 core/max/queue 与说明           |

### 八、参考（29）

| 工具              | 功能                                        |
|-----------------|-------------------------------------------|
| Arthas 命令       | Arthas 诊断命令速查                             |
| Linux 命令        | 常用 Linux 命令速查                             |
| JVM 参数          | JVM 启动参数速查                                |
| Redis 命令        | Redis 常用命令速查                              |
| Spring Cloud    | Spring Cloud Alibaba 组件速查                 |
| Docker 命令       | Docker / K8s 命令速查                         |
| 正则速查表           | 常用正则表达式分类速查                               |
| Git 命令          | Git 常用操作速查                                |
| HTTP 状态码        | HTTP 状态码 / 方法速查                           |
| ASCII 表         | ASCII / 控制字符速查                            |
| MyBatis Plus    | MyBatis Plus 常用方法速查                       |
| MyBatis XML     | MyBatis 动态 SQL 标签速查                       |
| Lombok 注解       | Lombok 常用注解速查                             |
| Spring Boot 注解  | Spring Boot 常用注解速查                        |
| 事务传播            | Spring 事务传播行为速查                           |
| Maven 命令        | Maven 常用命令速查                              |
| Gradle 命令       | Gradle 常用命令速查                             |
| JDK 新特性         | JDK 8/11/17/21 新特性速查                      |
| HTTP Header     | HTTP 通用 / 请求 / 响应头速查                      |
| 消息中间件           | Kafka / RabbitMQ / RocketMQ 速查            |
| MIME 类型         | 文件扩展名 / MIME 类型对照                         |
| 端口号速查           | 常用网络服务端口号对照                               |
| IDEA 快捷键        | IntelliJ IDEA 快捷键速查                       |
| 设计模式            | 23 种设计模式示例代码                              |
| GC 调优           | JVM 垃圾回收算法与参数速查                           |
| Spring Security | Spring Security 注解与配置速查                   |
| JUnit 5         | JUnit 5 注解与断言速查                           |
| Flowable / BPMN | Flowable API / BPMN / 监听器 / 表前缀速查（含场景与示例） |
| JPA / Hibernate | 注解、关系映射、JPQL / FetchType 速查               |

---

## 🛠️ 技术说明

### 架构总览

- **静态站点**：纯 HTML + CSS + JavaScript，无后端、无 SPA 框架
- **数据本地化**：所有计算在浏览器中执行，断网可正常使用（依赖已本地化）
- **主题与布局**：深色主题优先，CSS 变量驱动，支持响应式断点
- **收藏**：`js/favorites.js` 持久化到 `localStorage`（key：`devtools.favorites`），首页 / 侧边栏星标 UI 由 `ui-home.js` /
  `ui-sidebar.js` 负责

### 模块加载机制

- **首屏核心脚本**（`index.html` 顺序加载）：`utils` → `crypto-utils` → `tools-registry` → `favorites` →
  `_ref-engine` → `loader` → `router` → `ui-home` → `ui-sidebar` → `app`
- **懒加载（按需加载）**：首屏仅加载上述核心脚本，首页网格立即可用；打开某工具时才由 `loader.js` 动态加载该工具依赖的
  第三方库（`loadLib`）、工具 JS（`loadToolScript`）与 HTML 面板（`loadToolPanel`）
- **文件组织**：JS 按类别目录拆分 `js/{cat}/{toolId}.js`，HTML 面板 `html/panels/{cat}/{toolId}.html`（目录必须与注册表中的
  `cat` 一致）
- **工具注册表**：`js/tools-registry.js` 中 `categories` + `tools[]` 集中维护所有工具元信息（id、名称、分类、入口），是懒加载路径构造与首页网格的单一事实来源
- **第三方库映射**：`js/loader.js` 中 `toolLibs` 登记各工具依赖的本地化库
- **初始化入口**：需初始化的工具在自身 JS 末尾调用 `registerInit(id, fn)` 登记；`openTool` 打开工具后调用
  `toolInits[id]()` 完成渲染 / 绑定 / 启动定时器

### 样式分层

| 层        | 文件               | 职责                       |
|----------|------------------|--------------------------|
| 基础层      | `css/base.css`   | CSS 变量 / reset / 通用控件    |
| 布局层      | `css/layout.css` | 主框架 / 导航 / 面包屑 / 首页 / 收藏 |
| 类别层（8 个） | `css/{cat}.css`  | 各分类专属 UI 样式              |

### 构建工具

- **Vite 6**：仅作为开发服务器 + 静态资源打包
- **自定义插件**：
    - `cors-proxy`：提供 CORS 代理端点（`/__cors_proxy?target=<url>`），将前端跨域请求转发到目标 URL，避开浏览器 CORS 限制。
      **开发**：Vite 插件注入；**生产 Docker**：`scripts/cors-proxy-server.js` + nginx 反代（同源）。纯静态托管（如 GitHub
      Pages）无后端，无法绕过 CORS
    - `cache-bust`：为 index.html 中的 JS / CSS 引用按文件内容 md5 追加 `?v=<hash>`（前 8 位），内容变更自动失效
    - `copy-js-assets`：构建时将 `js/` 和 `html/` 目录同步到 `dist/`
    - `inject-asset-map`：扫描 `js/`、`html/` 所有资源生成 `window.__ASSET_MAP__`（逐文件 md5）内联进 `dist/index.html`
      ；动态懒加载的工具脚本 / 面板据此附加 `?v=<hash>`，实现强缓存与更新自动失效（生产与 `build:dev` 均注入）
    - `remove-github-link`：从 `dev` 构建产物中移除 GitHub 入口链接
    - `inject-devtools-flag`：生产构建注入 `window.__DEVTOOLS__ = { withGithub: true }`，由 app.js 据此动态创建 GitHub
      链接

### 代码规范

- **ESLint**（flat config）：`npm run lint` / `npm run lint:fix`
- **Prettier**：`npm run format`（4 空格缩进 / 单引号 / 分号 / 120 列宽）

### 测试

- 单元测试基于 **Vitest**，覆盖从工具中抽离的纯逻辑（无 DOM 耦合）
- 工具文件通过 `module.exports` 守卫导出纯函数，测试用 `require()` 直接加载真实生产代码（零重复）
- `test/setup.js` 提供 `registerInit` 等浏览器全局的 Node 环境垫片
- 已覆盖编解码、安全、格式化、代码生成、生成类、HTTP 调试、收藏等核心逻辑

```bash
npm test           # 运行一次
npm run test:watch # 监听模式
```

### 部署方式

#### GitHub Pages

- 工作流：`.github/workflows/static.yml`
- 触发：推送 `main`、推送 tag `dev-tools`、或 Actions 手动 Run workflow
- 注意：仓库 Settings → Environments → `github-pages` 的 Deployment branches and tags 需允许对应 ref（至少包含 `main`）

#### Docker（推荐生产环境）

- **多阶段构建**：`node:20-alpine` 构建 → 运行镜像内 **nginx 静态托管 + Node CORS 代理**
- HTTP 调试「通过本地代理」在生产可用：nginx 将 `/__cors_proxy` 反代到本机 `127.0.0.1:3927`
- 镜像可缓存，适合 CI/CD

#### Nginx（自有服务器）

- `nginx.conf` 已配置：
    - gzip 压缩
    - 静态资源长缓存
    - SPA fallback（未匹配路由回退到 `index.html`）
    - `/__cors_proxy` 反代到 `127.0.0.1:3927`（需另起代理进程）
    - 安全响应头（X-Frame-Options / X-Content-Type-Options / Referrer-Policy）
- 非 Docker 部署若要用 HTTP 调试绕过 CORS，请额外运行：

```bash
npm run cors-proxy   # 默认 127.0.0.1:3927
```

### 浏览器兼容

Chrome / Firefox / Edge / Safari 现代浏览器（支持 ES2020+ 语法）。

---

## 📦 本地化依赖列表

所有第三方库已下载到 `public/lib/`，构建时随静态资源一起发布，**无需联网即可使用**。共 **20 个 npm 包**本地化为
**22 个 `.min.js`** 文件（`sm-crypto` 拆分为 `sm2/sm3/sm4` 三个文件，`blueimp-md5` 简写为 `md5`），以及
**Python 运行沙箱**专用的 5 个 Pyodide 核心文件（~13MB，**需手动下载**）。

| #  | 来源              | 本地化文件                                                                                                        | 用途                                          |
|----|-----------------|--------------------------------------------------------------------------------------------------------------|---------------------------------------------|
| 1  | ajv             | `ajv.min.js`                                                                                                 | JSON Schema 校验                              |
| 2  | asn1js          | `asn1js.min.js`                                                                                              | X.509 证书 ASN.1 解码                           |
| 3  | bcryptjs        | `bcrypt.min.js`                                                                                              | bcrypt 哈希加盐                                 |
| 4  | blueimp-md5     | `md5.min.js`                                                                                                 | MD5 计算                                      |
| 5  | diff            | `diff.min.js`                                                                                                | 文本差异对比                                      |
| 6  | fast-xml-parser | `fxp.min.js`                                                                                                 | XML 解析与生成                                   |
| 7  | js-beautify     | `js-beautify.min.js`                                                                                         | HTML / CSS / JS 美化                          |
| 8  | js-yaml         | `js-yaml.min.js`                                                                                             | YAML / OpenAPI YAML 解析与生成                   |
| 9  | jsonpath-plus   | `jsonpath.min.js`                                                                                            | JSONPath 查询                                 |
| 10 | jsqr            | `jsqr.min.js`                                                                                                | 二维码识别                                       |
| 11 | jszip           | `jszip.min.js`                                                                                               | ZIP 文件处理（辅助二维码识别 / SQL→MyBatis）             |
| 12 | marked          | `marked.min.js`                                                                                              | Markdown 渲染 / HTML↔Markdown                 |
| 13 | pkijs           | `pkijs.min.js`                                                                                               | X.509 证书高级 API                              |
| 14 | qrcode          | `qrcode.min.js`                                                                                              | 二维码生成                                       |
| 15 | sm-crypto       | `sm2.min.js`<br>`sm3.min.js`<br>`sm4.min.js`                                                                 | 国密 SM2 公钥密码 / SM3 摘要 / SM4 对称加密             |
| 16 | jspdf           | `jspdf.min.js`                                                                                               | 客户端生成 PDF（图片转 PDF）                          |
| 17 | sql-formatter   | `sql-formatter.min.js`                                                                                       | SQL 美化与方言转换                                 |
| 18 | ua-parser-js    | `ua-parser.min.js`                                                                                           | User-Agent 解析                               |
| 19 | xlsx            | `xlsx.min.js`                                                                                                | SheetJS，Excel/CSV 读写（JSON ↔ Excel/CSV 工具专用） |
| 20 | pdf-lib         | `pdf-lib.min.js`                                                                                             | PDF 合并 / 拆分 / 页面抽取                          |
| 21 | sucrase         | `sucrase.min.js`                                                                                             | TypeScript 语法转译（JS/TS 运行沙箱专用）               |
| 22 | Pyodide（手动下载）   | `pyodide/pyodide.js`<br>`pyodide.asm.js`<br>`pyodide.asm.wasm`<br>`pyodide-lock.json`<br>`python_stdlib.zip` | Python 3.10+ WebAssembly 运行时（Python 运行沙箱专用） |

> 💡 **依赖管理**：`npm install` 会自动触发 `postinstall` 钩子同步依赖到 `public/lib/`；新增依赖后也可手动执行
> `npm run copy-libs`。
>
> ⚠️ **Pyodide 手动下载**：22 号依赖（Pyodide 完整发行版 ~13MB）**未通过 npm 安装**，首次使用
> 「Python 运行」工具前请执行：
>
> ```powershell
> powershell -ExecutionPolicy Bypass -File scripts/download-pyodide.ps1
> ```
>
> 脚本幂等可重复运行，从 `cdn.jsdelivr.net/pyodide/v0.26.4/full/` 下载 5 个核心文件到 `public/lib/pyodide/`。
> **离线/内网部署**请提前下载并放入该目录，否则会加载失败。

---

## 🤝 贡献

欢迎提交 Issue 与 PR 扩充工具或修复 Bug。新增工具时请遵循：

1. 在对应分类下创建 `html/panels/{cat}/{toolId}.html` 与 `js/{cat}/{toolId}.js`（*
   *注意：文件所在目录必须与注册表中的 `cat` 一致**，懒加载按 `js/{cat}/{id}.js` 构造路径，不一致会 404 打不开）
2. 在 `js/tools-registry.js` 的 `tools[]` 中登记元信息（id、名称、分类、图标、描述、`tags`：可写 `common` / `frontend` /
   `backend` / `java`）
3. 若依赖第三方库，在 `js/loader.js` 的 `toolLibs` 映射中登记
4. 若工具需要初始化（渲染数据、绑定事件、启动定时器等），在工具 JS 末尾调用 `registerInit(toolId, initFn)` 登记，`openTool`
   会自动调用
5. 同步更新本 README 工具列表与数量
6. 保持深色主题一致性与响应式适配；核心纯逻辑建议补充 Vitest 单测
