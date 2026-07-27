# Changelog

本项目所有重要变更均记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本管理遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

本轮体验与工程改进（未发布）；工具 **143**，单元测试 **1305 passed**（74 files，合并后减少 1 个测试文件）。

### 变更

- **合并 json2csv → jsonexcel**：下线独立「JSON ↔ CSV」入口，CSV 能力统一由「JSON ↔ Excel/CSV」提供；`#/tool/json2csv` 路由别名重定向至 `jsonexcel`，避免旧书签失效

### 新增

- **批量新工具（+22）**，工具总数 **122 → 144**：
    - 格式化：JSON→SQL INSERT、XPath、`.env` 环境变量
    - 安全：Webhook 签名、OAuth2/PKCE、CVSS 3.1
    - 生成：SemVer、chmod、金额大写/统一社会信用代码
    - 代码生成：Maven 坐标、MapStruct、DDL→Mermaid ER、Flyway/Liquibase 骨架
    - 文本：数据脱敏、行尾/BOM/不可见字符、Markdown 表格/文本树
    - 调试：Cookie/缓存头、Quartz 定时、SpEL 试算、线程 Dump、日志 Pattern、链路追踪头
- **Flowable / BPMN 速查增强**：场景说明与 Java/BPMN/SQL 示例（`js/reference/flowableref.js`）
- **JSON 输出语法高亮**：token 着色，无新依赖（`js/format/json.js`）
- **分辨率比例（resratio）**：宽高比约分、档位匹配、按比例反算

### 修复

- **导航 hash 路由**：打开工具写入 `#/tool/{id}`，浏览器后退回到首页（`js/app.js`）
- **顶栏层级**：`.main-header` z-index 提高，避免工具 sticky 搜索栏遮挡首页搜索（`css/layout.css`）
- **工具图标**：修复无效 Bootstrap Icons 并优化语义匹配
- **XML / SQL / YAML 格式化**：缩进、sql-formatter v15、YAML 保序
- **HTTP 调试生产 CORS**：Docker 同源代理 + nginx `/__cors_proxy`；AbortController
- **解析错误定位**：JSON/XML/YAML 行列上下文与输入框高亮
- **loadToolPanel / registerInit / openTool**：失败可重试、初始化异常隔离、并发 generation token

### 视觉 / UX

- **JSON/XML/YAML 左右布局**（`.fmt-split`，窄屏回退上下）
- **解析错误输入高亮**：选中 + 红色边框脉冲

### 安全

- **AES / HTTP 历史脱敏 / Markdown 消毒 / CSP**：既有加固保留
- **Webhook 签名 / OAuth2 PKCE / 数据脱敏**：本地处理，不上传

### 工程

- 工具注册表 **143**（json2csv 并入 jsonexcel）；首页 / meta / README 数量同步
- 无新增 npm 依赖（XPath 用浏览器原生 `document.evaluate`）

### 测试

- 新增 22 个工具相关单测文件；全量 **1305 passed**（74 files）

### 文档

- README 工具列表与数量同步为 143；CHANGELOG 记录本轮增量

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
