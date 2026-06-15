# Java 开发工具箱

一个开箱即用的 Web 应用，集成了 **41 个工具**（格式化、编解码、安全、生成与转换、文本、调试、参考）。代码按类型拆分，支持 Vite
构建、Docker
部署，所有功能在浏览器本地运行，数据不上传任何服务器。

## 快速开始

### 方式一：直接打开

```bash
start index.html
```

### 方式二：本地开发

```bash
npm install
npm run dev       # http://localhost:3000
```

### 方式三：Docker 部署

```bash
docker build -t dev-tools .
docker run -d -p 8080:80 dev-tools
# http://localhost:8080
```

## 项目结构

```
├── index.html                  # 首页入口
├── css/
│   └── style.css               # 样式
├── js/
│   ├── app.js                  # 核心逻辑：导航 / 工具数据 / 通用工具函数
│   ├── format/                 # 格式化：json / xml / yaml / sql
│   ├── encode/                 # 编解码：base64 / url / unicode / javaescape / charset / htmlescape
│   ├── security/               # 安全：jwt / hash / random / aes / rsa
│   ├── generate/               # 生成与转换：uuid / timestamp / color / baseconvert / case / jsontopojo / sqltopojo / datamock / datecalc
│   ├── text/                   # 文本：diff / regex / stats / csv / regexref
│   ├── debug/                  # 调试：cron / websocket / api / ip
│   └── reference/              # 参考：arthas / jmh / testgen / linux / docker / gitref / httpstatus / ascii
├── scripts/
│   └── copy-libs.js            # 将 CDN 依赖下载到本地
├── public/lib/                 # 本地化的 CDN 依赖
├── package.json                # Vite + 依赖管理
├── vite.config.js              # Vite 构建配置
├── Dockerfile                  # 多阶段 Docker 构建
├── nginx.conf                  # Nginx 部署配置
└── .dockerignore
```

## 工具列表

### 格式化

| 工具       | 功能                                                            |
|----------|---------------------------------------------------------------|
| JSON 格式化 | 格式化 / 压缩 / 校验 JSON                                            |
| XML 格式化  | 格式化 / 压缩 / 校验 XML                                             |
| YAML 格式化 | YAML 格式化 / YAML↔JSON 互转                                       |
| SQL 格式化  | SQL 美化，支持 MySQL / PostgreSQL / Oracle / SQL Server / BigQuery |

### 编解码

| 工具      | 功能                                            |
|---------|-----------------------------------------------|
| Base64  | 文本 / 文件 Base64 编码解码，支持 URL 安全模式               |
| URL 编码  | URL 编解码，支持 `encodeURI` / `encodeURIComponent` |
| Unicode | `\uXXXX` 编码与解码互转                              |
| Java 转义 | Java 字符串转义与反转义（`\n` `\t` `\"` 等）              |
| 编码转换    | 字符编码互转与检测（UTF-8 / GBK / Shift-JIS 等）          |
| HTML 转义 | HTML 实体编码与解码                                  |

### 安全

| 工具      | 功能                              |
|---------|---------------------------------|
| JWT 解码  | 解析 JWT Header、Payload、签名、过期时间   |
| Hash 计算 | MD5 / SHA-1 / SHA-256 / SHA-512 |
| 随机生成器   | 随机密码（可选字符集）、Hex Token、PIN       |
| AES 加解密 | AES-CBC / GCM 加密解密，PBKDF2 密钥派生  |
| RSA 工具  | RSA 密钥对生成（1024/2048/4096）、加密解密  |

### 生成与转换

| 工具        | 功能                                                            |
|-----------|---------------------------------------------------------------|
| UUID 生成   | UUID v4 / v7 / 批量生成                                           |
| 时间戳转换     | Unix 秒 / 毫秒 ↔ 日期字符串互转                                         |
| 颜色转换      | HEX / RGB / HSL 互转 + 颜色预览                                     |
| 进制转换      | 2~36 进制互转，Dec→Hex/Bin/Oct 快捷按钮                                |
| Case 转换   | camelCase / PascalCase / snake_case / kebab-case / UPPER_CASE |
| JSON→Java | JSON 生成 Java POJO 类（支持 Lombok @Data）                          |
| SQL→Java  | DDL 建表语句生成 MyBatis Plus 实体                                    |
| 数据 Mock   | 生成姓名 / 手机号 / 邮箱 / 身份证 / 地址等模拟数据                               |
| 日期计算器     | 日期加减 / 日期间隔 / 工作日统计                                           |

### 文本

| 工具      | 功能                               |
|---------|----------------------------------|
| 文本对比    | 行级差异对比，高亮显示增删，支持忽略大小写            |
| 正则表达式   | 正则匹配测试，显示匹配位置、内容和分组              |
| 文本统计    | 实时统计字符数 / 单词数 / 行数 / 字节数 / 中文字符数 |
| CSV 格式化 | CSV 表格化预览，支持逗号 / Tab / 分号分隔符     |
| 正则速查表   | 常用正则表达式分类展示，点击一键复制               |

### 调试

| 工具        | 功能                                                   |
|-----------|------------------------------------------------------|
| Cron 表达式  | 可视化 Cron 构建器，支持 5~7 段表达式（秒 分 时 日 月 周 年），计算未来 N 次执行时间 |
| WebSocket | WebSocket 连接 / 收发消息调试                                |
| API 调用    | HTTP 请求调试，支持 Headers / Authorization / Body          |
| IP 工具     | IP 信息查询（类别/私有/回环）、子网计算（网络地址/广播地址/可用 IP 范围）           |

### 参考（新增）

| 工具          | 功能                                                        |
|-------------|-----------------------------------------------------------|
| Arthas 命令   | 22 条常用 Arthas 命令分类速查，支持搜索筛选                               |
| JMH 模板      | JMH 基准测试代码生成器，可配置 Mode / Fork / 预热 / 测量                   |
| 测试模板        | JUnit 5 + Mockito 测试代码生成，支持 Service / Controller / Mapper |
| Linux 命令速查  | 常用 Linux 命令分类速查（文件 / 权限 / 进程 / 网络 / Java），点击复制            |
| Docker 命令速查 | Docker / Compose / K8s 命令速查，点击复制                          |
| Git 命令速查    | Git 常用操作速查（配置 / 分支 / 提交 / 查看），点击复制                        |
| HTTP 状态码速查  | HTTP 方法（GET/POST/PUT/DELETE…）+ 状态码分类速查                    |
| ASCII 表     | 完整 ASCII 码表（DEC / HEX / OCT / 字符 / 说明）                    |

## 构建部署

### 生产构建

```bash
npm run build     # 输出到 dist/
npm run preview   # 预览构建产物
```

### Docker 构建

```bash
docker build -t dev-tools .
docker run -d -p 8080:80 --name dev-tools dev-tools
```

### Nginx 直接部署

将 `dist/` 目录上传到服务器，使用提供的 `nginx.conf` 配置。

## 技术说明

- 纯静态 HTML + CSS + JavaScript，无后端依赖
- 构建工具：Vite 6
- 依赖库：js-yaml、diff、blueimp-md5、sql-formatter（已本地化，支持离线使用）
- 主题：深色模式，支持响应式布局
- 浏览器：Chrome / Firefox / Edge / Safari
