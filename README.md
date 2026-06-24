# Java 开发工具箱

> 一个面向 Java 开发者的**纯前端**在线工具集 —— **86 个工具、7 大分类**
> ，覆盖格式化、编解码、安全、生成与转换、文本、调试、参考速查。无需后端、无需联网、无需上传数据，所有计算均在浏览器本地完成。支持
> Vite 开发、Docker 一键部署、Nginx 静态托管，开箱即用。

## ✨ 核心特性

- 🚀 **零依赖开箱即用**：纯静态 HTML / CSS / JavaScript，无任何前端框架；业务代码无构建期编译，第三方库通过 Vite + esbuild
  打包为 IIFE
- 🔒 **数据 100% 本地处理**：所有计算在浏览器内完成，不会上传任何内容到服务器，支持离线使用
- 🧰 **86 个工具 / 7 大分类**：覆盖 Java 开发日常所需，工具持续扩充
- 🎨 **深色主题 + 响应式**：桌面 / 平板 / 手机均可使用
- 🐳 **多种部署方式**：Vite 开发、Docker 容器、Nginx 静态托管
- 📦 **依赖本地化**：19 个常用库全部内置到 `public/lib/`，断网仍可使用（图标字体 `bootstrap-icons` 随 `npm install` 注入到
  `node_modules` 后由 Vite 构建产物发布）

---

## 📑 目录

- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [工具列表](#工具列表)
- [技术说明](#技术说明)
- [本地化依赖列表](#本地化依赖列表)

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
`file://` 协议下会拦截跨源请求，页面会卡在"正在加载工具模块..."。请使用上述任一 HTTP 服务方式访问。

---

## 📁 项目结构

```
├── index.html                      # 入口（含首页，启动时按需拉取各工具面板）
├── html/panels/                    # 工具面板（86 个文件，每个工具一个 HTML）
│   ├── format/                     #  格式化：json / xml / yaml / sql / ...
│   ├── encode/                     #  编解码：base64 / url / unicode / ...
│   ├── security/                   #  安全：jwt / hash / aes / rsa / ...
│   ├── generate/                   #  生成与转换：uuid / ts / color / ...
│   ├── text/                       #  文本：regex / diff / markdown / ...
│   ├── debug/                      #  调试：cron / ws / stomp / api / ...
│   └── reference/                  #  参考：arthas / jmh / springboot / ...
├── css/                            # 样式（通用层 + 布局层 + 类别专属）
│   ├── base.css                    #  CSS 变量 / reset / 按钮 / 表单 / toast / 滚动条
│   ├── layout.css                  #  主框架 / header / 面包屑 / 首页卡片 / 锚点
│   ├── format.css                  #  格式化类别样式
│   ├── encode.css                  #  编解码类别样式
│   ├── security.css                #  安全类别样式
│   ├── generate.css                #  生成与转换类别样式
│   ├── text.css                    #  文本类别样式
│   ├── debug.css                   #  调试类别样式
│   └── reference.css               #  参考类别样式
├── js/
│   ├── app.js                      # 核心：导航 / 工具数据注册表 / loadPanels() / 通用工具函数
│   ├── format/                     #  格式化：json / xml / yaml / sql / ...
│   ├── encode/                     #  编解码：base64 / url / unicode / ...
│   ├── security/                   #  安全：jwt / hash / aes / rsa / ...
│   ├── generate/                   #  生成与转换：uuid / ts / color / ...
│   ├── text/                       #  文本：regex / diff / markdown / ...
│   ├── debug/                      #  调试：cron / ws / stomp / api / ...
│   └── reference/                  #  参考：arthas / jmh / springboot / ...
├── public/lib/                     # 本地化的第三方库（19 个，详见下方依赖列表）
├── scripts/
│   └── copy-libs.js                # 从 node_modules 复制依赖到 public/lib（构建前执行）
├── docs/                           # 开发文档（各 ticket 需求 / 设计 / 验收记录）
├── .github/workflows/static.yml    # GitHub Pages 自动部署
├── package.json                    # 依赖管理与 npm 脚本
├── vite.config.js                  # Vite 6 配置（cache-bust + copy-js-assets 自定义插件）
├── Dockerfile                      # 多阶段构建：node:20-alpine → nginx:alpine
├── nginx.conf                      # Nginx 配置（gzip + 30 天静态资源缓存 + SPA fallback）
└── .dockerignore
```

---

## 🧰 工具列表

### 一、格式化（10）

| 工具             | 功能                                                            |
|----------------|---------------------------------------------------------------|
| JSON 格式化       | 格式化 / 压缩 / 校验 JSON，支持树形预览                                     |
| XML 格式化        | 格式化 / 压缩 / 校验 XML                                             |
| YAML 格式化       | YAML 格式化 / YAML↔JSON 互转                                       |
| SQL 格式化        | SQL 美化，支持 MySQL / PostgreSQL / Oracle / SQL Server / BigQuery |
| JSONPath       | JSONPath 表达式测试，支持实时取值与链式导航                                    |
| JSON Schema    | JSON Schema 校验与生成                                             |
| JSON 转换        | JSON ↔ XML / YAML / CSV 互转                                    |
| SQL 方言转        | MySQL / PostgreSQL / Oracle / SQLServer 方言互转                  |
| DB 类型映射        | Java 数据库类型映射 + JDBC URL 生成                                    |
| Properties 格式化 | `.properties` 配置文件格式化、键值排序、转义                                 |

### 二、编解码（8）

| 工具        | 功能                                            |
|-----------|-----------------------------------------------|
| Base64    | 文本 / 文件 Base64 编码解码，支持 URL 安全模式               |
| URL 编码    | URL 编解码，支持 `encodeURI` / `encodeURIComponent` |
| Unicode   | `\uXXXX` 编码与解码互转                              |
| Java 转义   | Java 字符串转义与反转义（`\n` `\t` `\"` 等）              |
| 字符集转换     | UTF-8 / GBK / Shift-JIS 等编码互转与检测              |
| HTML 转义   | HTML 实体编码与解码                                  |
| 图片 Base64 | 图片 ↔ Base64 互转，支持预览与下载                        |
| Hex 编码    | 文本与十六进制互转，支持 UTF-8 / GBK 字符集                  |

### 三、安全（13）

| 工具        | 功能                                                                        |
|-----------|---------------------------------------------------------------------------|
| JWT 解码    | 解析 JWT Header、Payload、签名、过期时间                                             |
| Hash 计算   | MD5 / SHA-1 / SHA-256 / SHA-512                                           |
| 随机生成器     | 随机密码（可选字符集）、Hex Token、PIN                                                 |
| AES 加解密   | AES-CBC / GCM 加密解密，PBKDF2 密钥派生                                            |
| RSA 工具    | RSA 密钥对生成（1024/2048/4096）、加解密、签名验签                                        |
| HMAC      | HMAC-MD5 / SHA-1 / SHA-256 / SHA-384 / SHA-512 消息认证码计算                    |
| JWT 生成    | 自定义 Payload 一键生成 JWT，支持 HS256/HS384/HS512（HMAC）+ RS256/RS384/RS512（RSA）签名 |
| Bcrypt    | Bcrypt 哈希与校验（成本因子可调）                                                      |
| 国密 SM     | 国密 SM2 公钥密码 / SM3 摘要 / SM4 对称加密（含签名验签）                                    |
| Hash 扩展   | 支持更多哈希算法（CRC32 / CRC32C / Adler32 / SHA-3 系列（256/384/512）/ SM3）           |
| TOTP 动态令牌 | RFC 6238 TOTP / RFC 4226 HOTP 二维码生成与码值计算                                  |
| PBKDF2 哈希 | PBKDF2-HMAC-SHA1/SHA256/SHA512 密钥派生 + PHC 格式                              |
| X.509 证书  | 解析证书主体/签发者/SAN/指纹/有效期/链，DER↔PEM 互转                                        |

### 四、生成与转换（15）

| 工具          | 功能                                                        |
|-------------|-----------------------------------------------------------|
| UUID 生成     | UUID v4 / v7，批量生成                                         |
| 时间戳转换       | Unix 秒 / 毫秒 ↔ 日期字符串互转，含时区与格式化选项                           |
| Case 转换     | camelCase / PascalCase / snake_case / kebab-case          |
| 颜色转换        | HEX / RGB / HSL 互转 + 颜色预览                                 |
| 进制转换        | 2~36 进制互转，Dec→Hex/Bin/Oct 快捷按钮                            |
| JSON→POJO   | JSON 生成 Java POJO 类（支持 Lombok @Data）                      |
| SQL→POJO    | DDL 建表语句生成 MyBatis Plus 实体                                |
| 数据 Mock     | 姓名 / 手机号 / 邮箱 / 身份证 / 地址等模拟数据批量生成                         |
| 日期计算器       | 日期加减 / 日期间隔 / 工作日统计 + 时间戳互转                               |
| 邮件模板        | 5 套邮件 HTML 模板，填变量实时预览 + 一键内联 CSS                          |
| 时区转换        | 全球时区互转 + 夏令时感知                                            |
| 分辨率计算       | 屏幕分辨率 DPI / 物理尺寸 / 对角线换算                                  |
| 雪花 ID       | Twitter Snowflake / 百度 UID-Generator 分布式 ID 生成与解析         |
| SQL→MyBatis | DDL 建表语句生成 MyBatis @Select/@Insert/@Update/@Delete Mapper |
| 二维码解析       | 上传图片识别二维码内容（基于 jsQR）                                      |

### 五、文本（9）

| 工具       | 功能                               |
|----------|----------------------------------|
| 正则表达式    | 正则匹配测试，显示匹配位置、内容和分组              |
| 文本对比     | 行级差异对比，高亮增删，支持忽略大小写              |
| 文本统计     | 实时统计字符数 / 单词数 / 行数 / 字节数 / 中文字符数 |
| CSV 格式化  | CSV 表格化预览，支持逗号 / Tab / 分号分隔符     |
| 正则速查表    | 常用正则表达式分类展示，点击一键复制               |
| Markdown | Markdown 实时预览（GFM）               |
| 网页代码格式化  | HTML / CSS / JS 美化与压缩            |
| 二维码生成    | 文本 / URL 生成二维码，支持下载 PNG          |
| 模板替换     | 占位符 `{{key}}` 批量替换 + 预览          |

### 六、调试（9）

| 工具        | 功能                                                                   |
|-----------|----------------------------------------------------------------------|
| Cron 表达式  | 可视化 Cron 构建器，支持 5~7 段，计算未来 N 次执行时间                                   |
| WebSocket | WebSocket 连接 / 收发消息调试（ws/wss 协议）                                     |
| STOMP     | STOMP over WebSocket 调试：CONNECT/SUBSCRIBE/SEND/MESSAGE、ACK/NACK、心跳保活 |
| API 调用    | HTTP 请求调试，支持 Headers / Authorization / Body                          |
| IP 工具     | IP 信息查询（类别 / 私有 / 回环）、子网计算（网络地址 / 广播地址 / 可用 IP 范围）                   |
| cURL 生成   | 界面化生成 cURL 命令，一键复制到终端                                                |
| gRPC 调试   | gRPC 请求构造与响应解析（Unary 调用）                                             |
| URL 解析    | URL 各组成部分解析（协议 / 域名 / 端口 / 路径 / 参数）                                  |
| UA 解析     | User-Agent 解析：浏览器、操作系统、设备类型                                          |

### 七、参考（22）

| 工具           | 功能                                                        |
|--------------|-----------------------------------------------------------|
| Arthas 命令    | 22+ 条常用 Arthas 命令分类速查，支持搜索筛选                              |
| JMH 模板       | JMH 基准测试代码生成器，可配置 Mode / Fork / 预热 / 测量                   |
| 测试模板         | JUnit 5 + Mockito 测试代码生成，支持 Service / Controller / Mapper |
| Linux 命令速查   | 常用 Linux 命令分类速查（文件 / 权限 / 进程 / 网络 / Java），点击复制            |
| Docker 命令速查  | Docker / Compose / K8s 命令速查，点击复制                          |
| Git 命令速查     | Git 常用操作速查（配置 / 分支 / 提交 / 查看），点击复制                        |
| HTTP 状态码速查   | HTTP 方法 + 状态码分类速查                                         |
| ASCII 表      | 完整 ASCII 码表（DEC / HEX / OCT / 字符 / 说明）                    |
| MyBatis Plus | MyBatis Plus 常用注解与 Wrapper 用法速查                           |
| MyBatis SQL  | MyBatis 动态 SQL 标签与示例                                      |
| Lombok       | Lombok 注解速查与示例代码                                          |
| Spring Boot  | Spring Boot 常用注解与配置项速查                                    |
| 事务传播         | Spring 事务传播机制与隔离级别详解                                      |
| Maven 命令     | Maven 常用命令与 POM 速查                                        |
| JDK 新特性      | JDK 8 ~ 21 各版本新特性概览                                       |
| HTTP Header  | HTTP 常用请求头 / 响应头速查                                        |
| MIME Type    | 常见 MIME 类型对照表                                             |
| 端口速查         | 常用服务默认端口速查（HTTP / SSH / MySQL / Redis 等）                  |
| JVM 参数       | 常用 JVM 启动参数与 GC 调优速查                                      |
| Redis 命令     | Redis 常用命令分类速查（String/Hash/List/Set/ZSet 等）               |
| Spring Cloud | Spring Cloud Alibaba / Netflix 核心组件速查                     |
| 消息中间件        | Kafka / RabbitMQ / RocketMQ 命令与配置速查                       |

---

## 🛠️ 技术说明

### 架构总览

- **静态站点**：纯 HTML + CSS + JavaScript，无后端、无 SPA 框架
- **数据本地化**：所有计算在浏览器中执行，断网可正常使用（依赖已本地化）
- **主题与布局**：深色主题优先，CSS 变量驱动，支持响应式断点

### 模块加载机制

- **JS**：按类别目录拆分（`js/{cat}/{toolId}.js`），通过 `<script>` 同步加载
- **HTML 面板**：每个工具一个独立文件，位于 `html/panels/{cat}/{toolId}.html`，由 `app.js#loadPanels()` 并行 `fetch` 后注入
  `#panels-container`
- **工具注册表**：`app.js` 中集中维护所有工具的元信息（id、名称、分类、入口），便于扩展

### 样式分层

| 层        | 文件               | 职责                    |
|----------|------------------|-----------------------|
| 基础层      | `css/base.css`   | CSS 变量 / reset / 通用控件 |
| 布局层      | `css/layout.css` | 主框架 / 导航 / 面包屑 / 首页   |
| 类别层（7 个） | `css/{cat}.css`  | 各分类专属 UI 样式           |

### 构建工具

- **Vite 6**：仅作为开发服务器 + 静态资源打包
- **自定义插件**：
    - `cache-bust`：为 JS / CSS 自动追加 `?v=时间戳`，避免缓存
    - `copy-js-assets`：构建时将 `js/` 和 `html/` 目录同步到 `dist/`
    - `remove-github-link`：从生产构建产物中移除 GitHub 入口链接
    - `inject-devtools-flag`：注入 `__DEV__` 全局标识，便于工具按环境降级

### 部署方式

#### Docker（推荐生产环境）

- **多阶段构建**：`node:20-alpine` 构建 → `nginx:alpine` 运行
- 镜像体积小、构建可缓存，适合 CI/CD

#### Nginx（自有服务器）

- `nginx.conf` 已配置：
    - gzip 压缩
    - 静态资源 30 天浏览器缓存
    - SPA fallback（未匹配路由回退到 `index.html`）

### 浏览器兼容

Chrome / Firefox / Edge / Safari 现代浏览器（支持 ES2020+ 语法）。

---

## 📦 本地化依赖列表

所有第三方库已下载到 `public/lib/`，构建时随静态资源一起发布，**无需联网即可使用**。

| #  | 库               | 用途                 |
|----|-----------------|--------------------|
| 1  | ajv             | JSON Schema 校验     |
| 2  | asn1js          | X.509 证书 ASN.1 解码  |
| 3  | bcryptjs        | Bcrypt 哈希加盐        |
| 4  | blueimp-md5     | MD5 计算             |
| 5  | diff            | 文本差异对比             |
| 6  | fast-xml-parser | XML 解析与生成          |
| 7  | js-beautify     | HTML / CSS / JS 美化 |
| 8  | jsqr            | 二维码识别              |
| 9  | js-yaml         | YAML 解析与生成         |
| 10 | jszip           | ZIP 文件处理（辅助二维码识别）  |
| 11 | jsonpath-plus   | JSONPath 查询        |
| 12 | marked          | Markdown 渲染        |
| 13 | pkijs           | X.509 证书高级 API     |
| 14 | qrcode          | 二维码生成              |
| 15 | sm-crypto       | 国密 SM2 / SM3 / SM4 |
| 16 | sql-formatter   | SQL 美化与方言转换        |
| 17 | ua-parser-js    | User-Agent 解析      |
| 18 | 上述依赖的 .min 版    | 生产环境使用压缩版减小体积      |

> 💡 **依赖管理**：`npm install` 会自动触发 `postinstall` 钩子同步依赖到 `public/lib/`；新增依赖后也可手动执行
`npm run copy-libs`。

---

## 🤝 贡献

欢迎提交 Issue 与 PR 扩充工具或修复 Bug。新增工具时请遵循：

1. 在对应分类下创建 `html/panels/{cat}/{toolId}.html` 与 `js/{cat}/{toolId}.js`
2. 在 `app.js` 的工具注册表中登记元信息
3. 保持深色主题一致性与响应式适配