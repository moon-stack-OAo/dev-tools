# Changelog

本项目所有重要变更均记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本管理遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 新增

- **摩斯电码**（`morse`）：ITU 国际摩斯码文本 ↔ 点划编解码，兼容 `.-` / `·−`，词间 `/` 分隔
- **摩斯电码支持中文**：经大陆「中文电码」汉字 → 四位数字 → 数字摩斯；电码表 `public/lib/ctc-cn.json`（~7k 字，按需加载）
- **摩斯电码中文标点**：`，。！？：；（）「」` 等自动映射为半角后再编码

### 变更

- **产品定位**：Java 开发工具箱 → 开发者工具箱；首页支持全部/通用/Java 受众筛选（工具 tags）

### 工程

- **架构重构（行为不变，见 `docs/ADR-refactor-guide.md`）**
    - Phase1：`tools-registry.js`、`crypto-utils.js`、`utils.js`
    - Phase2：`loader.js`、`router.js`；`reference/_ref-engine.js` 试点
    - Phase3：`ui-home.js` / `ui-sidebar.js` 迁出，`app.js` 降至 **~474 行**

## [1.1.0] - 2026-08-03

发布摘要：工具 **155**，单元测试 **1447 passed**（85 files）；首屏懒加载、工程化与大量 Java 开发者高频工具补齐。

### 新增

- **批量新工具（+22）**，工具总数 **122 → 144**：
    - 格式化：JSON→SQL INSERT、XPath、`.env` 环境变量
    - 安全：Webhook 签名、OAuth2/PKCE、CVSS 3.1
    - 生成：SemVer、chmod、金额大写/统一社会信用代码
    - 代码生成：Maven 坐标、MapStruct、DDL→Mermaid ER、Flyway/Liquibase 骨架
    - 文本：数据脱敏、行尾/BOM/不可见字符、Markdown 表格/文本树
    - 调试：Cookie/缓存头、Quartz 定时、SpEL 试算、线程 Dump、日志 Pattern、链路追踪头
- **第二批高频缺口工具（+12）**，工具总数 **143 → 155**（json2csv 并入后基数 143）：
    - 格式化：JSON 扁平化（`jsonflat`）、JSON 结构化对比（`jsondiff`）
    - 安全：JWT 验签（`jwtverify`，HS/RS + exp/nbf/iat）
    - 生成：Java 时间格式（`javatimefmt`）、Spring 配置键转换（`springbinding`）、证件号校验（`idvalidate`）
    - 文本：正则 → Java 代码（`regexjava`）
    - 调试：MyBatis SQL 还原（`mybatissqllog`）、SQL 参数绑定（`sqlbind`）、URL 参数构造器（`urlquery`）、线程池参数估算（
      `poolcalc`）
    - 参考：JPA / Hibernate 速查（`jparef`）
- **Flowable / BPMN 速查增强**：场景说明与 Java/BPMN/SQL 示例（`js/reference/flowableref.js`）
- **JSON 输出语法高亮**：token 着色，无新依赖（`js/format/json.js`）
- **分辨率比例（resratio）**：宽高比约分、档位匹配、按比例反算

### 变更

- **合并 json2csv → jsonexcel**：下线独立「JSON ↔ CSV」入口，CSV 能力统一由「JSON ↔ Excel/CSV」提供；`#/tool/json2csv` 路由别名重定向至
  `jsonexcel`，避免旧书签失效

### 修复

- **导航 hash 路由**：打开工具写入 `#/tool/{id}`，浏览器后退回到首页（`js/app.js`）
- **顶栏层级**：`.main-header` z-index 提高，避免工具 sticky 搜索栏遮挡首页搜索（`css/layout.css`）
- **工具图标**：修复无效 Bootstrap Icons 并优化语义匹配
- **XML / SQL / YAML 格式化**：缩进、sql-formatter v15、YAML 保序
- **HTTP 调试生产 CORS**：Docker 同源代理 + nginx `/__cors_proxy`；AbortController
- **解析错误定位**：JSON/XML/YAML 行列上下文与输入框高亮
- **loadToolPanel / registerInit / openTool**：失败可重试、初始化异常隔离、并发 generation token
- **内存泄漏**：`openTool` 事件监听器累积与 `toolInits` 重复执行；`initedTools` 去重 + `dataset.scrollBound` 防重复绑定

### 性能

- **首屏体积降低 97%**：19 个第三方库（~1.6MB）从同步阻塞加载改为按需懒加载，首屏仅加载核心代码（~50KB）

### 视觉 / UX

- **JSON/XML/YAML 左右布局**（`.fmt-split`，窄屏回退上下）
- **解析错误输入高亮**：选中 + 红色边框脉冲
- **favicon 重新设计**：从保险箱/锁造型改为 `</>` 代码括号，保留蓝紫渐变背景
- **首页卡片增强**：hover 分类色边框 + 顶部光带 + 入场动画（JS 动态 delay）
- **工具面板标题注入**：打开工具时动态注入图标 / 名称 / 描述（分类色着色），无需为每个面板 HTML 手写标题
- **header 标题渐变**："DevTools" 文字从纯白改为 `text → accent` 渐变填充

### 安全

- **XSS 审计修复**：
    - 二维码解析 WiFi / vCard 字段补充 `escapeHtml` 转义
    - Markdown 渲染新增 `_mdSanitize()` 清理 `<script>` / `on*` 事件属性 / `javascript:` 协议
- **nginx 安全响应头**：补充 `X-Frame-Options` / `X-Content-Type-Options` / `Referrer-Policy`
- **AES / HTTP 历史脱敏 / Markdown 消毒 / CSP**：既有加固保留
- **Webhook 签名 / OAuth2 PKCE / 数据脱敏**：本地处理，不上传
- **JWT 验签**：本地 HMAC/RSA 验签与时间声明校验，密钥不上传

### 工程

- **引入代码规范工具链**：ESLint（flat config）+ Prettier，`lint` / `lint:fix` / `format` 脚本
- **消除重复代码**：抽取 `escapeHtml` 为全局公共函数，统一 15 处重复定义
- **Dockerfile 可复现构建**：`npm install` 改为 `npm ci`，补充 `package-lock.json` 复制
- 工具注册表 **155**；首页 / meta / README 数量同步
- 无新增 npm 依赖（第二批 12 工具均为零依赖纯前端）
- `vitest.config.js` 从 CommonJS 统一为 ESM 风格
- **架构重构（行为不变，见 `docs/ADR-refactor-guide.md`）**
    - Phase1：`tools-registry.js`、`crypto-utils.js`、`utils.js`（download / formatBytes / escapeHtml / debounce）
    - Phase2：`loader.js`、`router.js`；`reference/_ref-engine.js` 试点 + 迁移 7 个速查（`jparef` / `httpstatus` /
      `mavenref` / `gitref` / `lombok` / `docker` / `gradle`）
    - Phase3：`ui-home.js` / `ui-sidebar.js` 迁出，`app.js` 由约 2688 行降至 **~474 行**
- 单测覆盖引擎过滤与 utils 公共 API；`npm test` / `npm run lint` 作为护栏

### 测试

- 单元测试由早期 17 扩展至全量 **1447 passed**（85 files），含 RFC 4226 / RFC 6238 等标准向量
- 第二批 12 工具新增单测约 +158

### 文档

- README 工具列表与数量同步为 155；CHANGELOG 合并发布为 1.1.0
