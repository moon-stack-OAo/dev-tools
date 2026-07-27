# Changelog

本项目所有重要变更均记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本管理遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

本轮体验与工程改进（未发布）；工具 **110+**，单元测试 **1093 passed**（53 files）。

### 新增

- **Flowable / BPMN 速查增强**：条目补充场景说明与 Java/BPMN/SQL 示例，渲染对齐 Arthas（`js/reference/flowableref.js`）
- **JSON 输出语法高亮**：格式化/压缩结果 token 着色（key/string/number/boolean/null），无新依赖（`js/format/json.js`）
- **分辨率比例（resratio）**：宽高比最简约分、消费级分辨率档位匹配、按比例反算

### 修复

- **XML 格式化缩进**：修复开闭标签同行导致的缩进错乱（`js/format/xml.js`）
- **SQL 格式化**：适配 sql-formatter v15（`keywordCase` / `tabWidth`），关键字大写生效（`js/format/sql.js`）
- **YAML 格式化**：默认保留键顺序，避免 `sortKeys` 静默打乱配置（`js/format/yaml.js`）
- **HTTP 调试生产 CORS**：Docker 内置 Node 同源代理 + nginx 反代 `/__cors_proxy`；前端探测代理可用性；AbortController 取消请求（`scripts/cors-proxy-server.js`、`Dockerfile`、`js/debug/httpdebug.js`）
- **解析错误定位**：JSON/XML/YAML 失败时展示行列上下文与 `^` 指针，并在输入框选中错误位置（`js/app.js`）
- **红测修复**：baseconvert / ip / snowflake / stacktrace 导出纯函数供单测；pdfmerge `jest` → `vi`；收藏逻辑抽至 `js/favorites.js`
- **loadToolPanel**：加载失败可重试，避免永久卡死
- **registerInit**：`try/catch/finally` 包裹初始化，异常不阻断工具打开
- **openTool 并发保护**：generation token 丢弃过期异步结果
- **alert → toast**：统一用户反馈，避免阻塞式弹窗

### 视觉 / UX

- **JSON/XML/YAML 左右布局**：输入与输出并排对照，窄屏（≤900px）回退上下（`.fmt-split`）
- **解析错误输入高亮**：错误行/token 选中 + 红色边框脉冲提示

### 安全

- **AES**：按 CBC/GCM 正确派生密钥；Base64 分块编解码，避免大密文栈溢出
- **HTTP 调试历史**：敏感 header / body 写入历史前脱敏（`js/debug/httpdebug.js`）
- **Markdown 消毒加强**：收紧 `_mdSanitize`，拦截危险标签与协议（`js/text/markdown.js`）
- **危险 onclick 移除**：STOMP / docker / gitref / linux 改为 `data-*` + 事件委托
- **CSP + Permissions-Policy**：`index.html` meta 与 `nginx.conf` 响应头双轨；静态资源 `immutable`，HTML `no-cache`
- **Base64 边界**：jwt / jwtgen 补齐 padding；rsa / hmac 分块 Base64
- **jsrun 风险提示**：面板增加可执行代码风险说明

### 工程

- **版本 1.1.0**；注册 **resratio**，工具总数 **110**
- **CI / Pages**：部署工作流优化（超时、产物校验、权限）；触发策略可按 tag / 分支配置
- **依赖**：`esbuild` 声明为正式依赖；`jsonexcel` 纳入 `toolLibs` 懒加载映射
- **`.dockerignore`** 收紧构建上下文
- **LICENSE**：版权声明更新

### 测试

- 新增 / 补强 aes、hash、hmac、jwt、httpdebug、markdown、xml、json 高亮等单测
- 全量 **1093 passed**（53 files）

### 文档

- README / CHANGELOG 与代码能力对齐（CORS 代理部署说明、工具清单等）

## [1.1.0] - 2026-06-27

### 性能

- **首屏体积降低 97%**：19 个第三方库（~1.6MB）从同步阻塞加载改为按需懒加载，首屏仅加载核心代码（~50KB）
- **修复内存泄漏**：`openTool` 事件监听器累积与 `toolInits` 重复执行问题，新增 `initedTools` 去重 + `dataset.scrollBound`
  防重复绑定

### 工程化

- **引入代码规范工具链**：新增 ESLint（flat config）+ Prettier，配置 `lint` / `lint:fix` / `format` 脚本
- **消除重复代码**：抽取 `escapeHtml` 为全局公共函数，统一 15 处重复定义（含 10 个别名变体）
- **Dockerfile 可复现构建**：`npm install` 改为 `npm ci`，补充 `package-lock.json` 复制

### 测试

- **单元测试覆盖率提升**：从 17 个测试增至 91 个（+74），新增 json2csv（16）、logfmt（10）、pbkdf2（18）、totp（30），包含 RFC 4226 /
  RFC 6238 标准向量验证（后续已扩展至 700+，见 Unreleased）

### 安全

- **XSS 审计修复**：
    - 二维码解析 WiFi / vCard 字段补充 `escapeHtml` 转义
    - Markdown 渲染新增 `_mdSanitize()` 清理 `<script>` / `on*` 事件属性 / `javascript:` 协议
- **nginx 安全响应头**：补充 `X-Frame-Options` / `X-Content-Type-Options` / `Referrer-Policy`

### 视觉美化

- **favicon 重新设计**：从保险箱/锁造型改为 `</>` 代码括号，保留蓝紫渐变背景
- **首页卡片增强**：hover 分类色边框 + 顶部光带 + 入场动画（JS 动态 delay）
- **工具面板标题注入**：打开工具时动态注入图标 / 名称 / 描述（分类色着色），无需为每个面板 HTML 手写标题
- **header 标题渐变**："DevTools" 文字从纯白改为 `text → accent` 渐变填充

### 其他

- `vitest.config.js` 从 CommonJS 统一为 ESM 风格
- `.gitignore` 自忽略问题确认已不存在
