# Java 开发工具箱

一个开箱即用的静态 Web 页面，集成了 Java 开发中常用的 22 个工具，无需安装任何依赖，浏览器打开即可使用。

## 快速开始

直接用浏览器打开 `dev-tools.html`：

```
start dev-tools.html
```

所有功能在浏览器本地运行，数据不会上传到任何服务器。

## 工具列表

### 格式化
| 工具 | 功能 |
|---|---|
| JSON 格式化 | 格式化 / 压缩 / 校验 JSON |
| XML 格式化 | 格式化 / 压缩 / 校验 XML |
| YAML 格式化 | YAML 格式化 / YAML↔JSON 互转 |
| SQL 格式化 | SQL 美化，支持 MySQL / PostgreSQL / Oracle / SQL Server / BigQuery 等方言 |

### 编解码
| 工具 | 功能 |
|---|---|
| Base64 | 文本 / 文件 Base64 编码解码，支持 URL 安全模式 |
| URL 编码 | URL 编解码，支持 `encodeURI` / `encodeURIComponent` |
| Unicode | `\uXXXX` 编码与解码互转 |
| Java 转义 | Java 字符串转义与反转义（`\n` `\t` `\"` 等） |

### 安全
| 工具 | 功能 |
|---|---|
| JWT 解码 | 解析 JWT Header、Payload、签名、过期时间 |
| Hash 计算 | MD5 / SHA-1 / SHA-256 / SHA-512 |
| 随机生成器 | 随机密码（可选字符集）、Hex Token、PIN |

### 生成与转换
| 工具 | 功能 |
|---|---|
| UUID 生成 | UUID v4 / v7 / 批量生成 |
| 时间戳转换 | Unix 秒 / 毫秒 ↔ 日期字符串互转 |
| 颜色转换 | HEX / RGB / HSL 互转 + 颜色预览 |
| 进制转换 | 2~36 进制互转，含 Dec→Hex/Bin/Oct 快捷按钮 |
| Case 转换 | camelCase / PascalCase / snake_case / kebab-case / UPPER_CASE 互转 |

### 文本
| 工具 | 功能 |
|---|---|
| 文本对比 | 行级差异对比，高亮显示增删，支持忽略大小写 |
| 正则表达式 | 正则匹配测试，显示匹配位置、内容和分组 |
| 文本统计 | 实时统计字符数 / 单词数 / 行数 / 字节数 / 中文字符数 |

### 调试
| 工具 | 功能 |
|---|---|
| Cron 表达式 | 解析 5 段 Cron 表达式，计算未来 N 次执行时间 |
| WebSocket | WebSocket 连接 / 收发消息调试 |
| API 调用 | HTTP 请求调试（GET/POST/PUT/DELETE 等），支持 Headers / Body / Authorization |

## 技术说明

- 纯静态 HTML + CSS + JavaScript，无后端依赖
- 使用 ES Modules CDN 加载依赖库：js-yaml、diff、blueimp-md5、sql-formatter
- 主题：深色模式，支持响应式布局
- 侧边栏：进入工具页面后自动展开，支持分类导航和快速切换
- 图标：Unicode 字符 / 文本图标，无外部图标依赖

## 浏览器兼容

支持所有现代浏览器（Chrome / Firefox / Edge / Safari）。
