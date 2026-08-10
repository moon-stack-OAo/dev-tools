# ADR / 重构 PR 指南

> 适用项目：`dev-tools` / **CodeCasket（码匣）**（纯前端开发者工具箱，Vite 6 + 原生 JS，无前端框架）  
> 版本基线：`1.1.0`（工具 155，2026-08 代码扫描）  
> 状态：**Accepted（指导文档）** · 按 PR 分批落地，不接受大爆炸重写  
> 读者：后续提交重构 / 新增工具的开发者与 Agent

---

## 1. 背景（Context）

### 1.1 项目约束（不可违背）

| 约束 | 说明 |
|------|------|
| 纯前端 | 业务逻辑在浏览器本地执行，不引入后端业务接口 |
| 无框架 | 不引入 React / Vue / Svelte 等 |
| 懒加载 | 工具面板 HTML、工具脚本、第三方库均按需加载 |
| 静态部署 | `base: './'`，支持 Nginx / Docker / GitHub Pages |
| 加载约定 | `js/**/*.js` 为浏览器全局脚本（非 ES Module）；测试用 `require` + 可选 `module.exports` |
| 风格 | 4 空格 / 单引号 / 分号 / 列宽 120；`js/app.js` 慎用全文件 Prettier |

### 1.2 扫描结论摘要（2026-08）

- 注册表 / `js/{cat}/{id}.js` / `html/panels/{cat}/{id}.html` **三方对齐，155 工具**。
- `js/app.js` **~2688 行**，集中了注册表、导航、懒加载、路由、UI。
- **security** 内 hex / base64 / base64url / bytes 转换 **多文件各自实现**。
- **reference** 29 个工具高度同构（搜索 + 数据数组 + `ref-card` 渲染）。
- 下载 / `formatBytes` 等 helper 散落在 10+ 文件。
- 可测导出：约 **85/155** 有 `module.exports`；reference 几乎全无。

### 1.3 问题（Problem）

1. 改注册表或导航容易产生巨大 diff，审查成本高。  
2. 加密相关编解码重复，边界行为不一致风险升高。  
3. 新增 reference 需复制粘贴 UI 逻辑，边际成本高。  
4. 公共下载与字节格式逻辑重复，难统一错误处理与内存释放。

---

## 2. 决策（Decision）

### 2.1 总体策略

**渐进式抽取公共能力 + 小 PR + 行为不变（behavior-preserving）**。

- **做**：拆数据、抽工具函数、模板化同构 UI、补测试。  
- **不做**：上框架、改成全量 ES Module、一次重写 155 工具、无测试的大范围替换。

### 2.2 目标架构（目标态，可分阶段）

```
js/
  app.js                 # 启动装配、全局生命周期（尽量变薄）
  tools-registry.js      # categories + tools[] 纯数据
  utils.js               # escapeHtml / safeCopy / download* / formatBytes / debounce 等
  crypto-utils.js        # bytes ↔ hex / base64 / base64url / utf8
  loader.js              # loadLib / loadToolPanel / loadToolScript / assetV
  router.js              # hash 路由 #/tool/{id}
  ui-home.js             # 首页网格 / 搜索 / 热力 / 虚拟分类
  ui-sidebar.js          # 侧边栏
  favorites.js           # 已有：收藏持久化
  reference/
    _ref-engine.js       # 可选：速查通用渲染 + 搜索
    *.js                 # 各速查：以数据为主
  {cat}/{toolId}.js      # 业务工具（保持现状目录约定）
```

加载顺序（生产 / 开发均须保证依赖在前）：

```html
<script src="js/utils.js"></script>
<script src="js/crypto-utils.js"></script>
<script src="js/tools-registry.js"></script>
<script src="js/favorites.js"></script>
<script src="js/loader.js"></script>
<script src="js/router.js"></script>
<script src="js/ui-home.js"></script>
<script src="js/ui-sidebar.js"></script>
<script src="js/app.js"></script>
```

> 说明：若短期仍单文件入口，允许 `app.js` 内 `// === section ===` 分区，但 **PR 拆分边界应与上表一致**，避免“只挪了几行却仍混职责”。

### 2.3 明确否决（Out of Scope）

| 否决项 | 原因 |
|--------|------|
| React / Vue 等 SPA 框架 | 与零框架、简单静态托管目标冲突 |
| 全量 ESM + bundler 打业务工具 | 破坏按 `js/{cat}/{id}.js` 动态注入与 vitest `require` 约定 |
| reference 一次全量数据 JSON 化 | 体积与路径约定变更大；先引擎后数据 |
| 合并 JWT 三入口（同 PR 大改 UI） | 产品决策与行为变更混在重构 PR 中会难审 |
| 改 `package.json` 引入新依赖做“顺手重构” | 依赖变更单独 PR |

---

## 3. 分阶段路线图（Roadmap）

### Phase 0 — 文档与护栏（本文件）

- [x] 输出 ADR / PR 指南  
- [x] 后续 PR 模板勾选「行为不变 / 测试命令 / 回滚方式」（见 §5.2 模板默认勾选约定与下方落地清单）

**验收：** 贡献者能按本文写 PR 描述，无需再口头对齐原则。

**Phase 0 落地清单（已完成）：**

每个 refactor PR 的描述 **必须** 包含 §5.2 模板，且合并前将下列项勾选为完成态：

- [x] 类型为 `refactor（行为不变）`（若否，不得按本 ADR 的 refactor 合并）
- [x] 已填写「行为不变声明」三项
- [x] 已记录 `npm test` / `npm run lint` 执行命令与结果
- [x] 已写明风险与回滚方式（默认 `git revert`）
- [x] 已关联 `docs/ADR-refactor-guide.md` 的 Phase / PR 编号

---

### Phase 1 — P0 公共基础（优先落地）

#### PR-1.1：`tools-registry` 拆分

| 项 | 内容 |
|----|------|
| **目标** | 将 `categories`、`tools[]` 从 `app.js` 抽到 `js/tools-registry.js` |
| **行为** | 首页卡片、侧边栏、路由、懒加载路径 **零变化** |
| **改动面** | `index.html` 增加脚本顺序；`app.js` 删除数据表；可选 README 结构一句 |
| **禁止** | 改工具 id/name/cat；改 `toolLibs` 映射语义 |
| **测试** | `npm test`；手动：首页数量仍为 155、打开任意 3 工具成功 |
| **回滚** | 还原 `app.js` 数据块 + 去掉新 script |

#### PR-1.2：`crypto-utils` + 首批安全工具替换

| 项 | 内容 |
|----|------|
| **目标** | 新增 `js/crypto-utils.js`（全局函数），替换 **3～5 个** security 文件中的重复 helper |
| **建议首批** | `pbkdf2.js`、`hmac.js`、`aes.js`、`webhooksig.js`、`rsa.js`（任选 ≥3） |
| **API 冻结名（推荐）** | 见 §4.1 |
| **行为** | 同一输入输出 hex/base64 **必须与替换前单测一致** |
| **测试** | 相关 `test/security/*.test.js` 全绿；新增 `test/crypto-utils.test.js` |
| **禁止** | 顺手改 UI 文案、算法默认参数、token 格式 |

#### PR-1.3：`download*` / `formatBytes` 入库 `utils`

| 项 | 内容 |
|----|------|
| **目标** | 统一 `downloadText` / `downloadBlob` / `formatBytes` /（可选）`readFileAsText` |
| **首批消费方** | `email.js`、`pdfmerge.js`，以及 1～2 个 Blob 下载工具 |
| **行为** | 文件名、MIME、下载内容不变；`URL.revokeObjectURL` 策略统一 |
| **测试** | 有纯函数的测纯函数；下载交互手工点一次 |

**Phase 1 完成定义（DoD）：**

1. 注册表文件独立，打开工具与构建不受影响。  
2. 至少 3 个 security 工具走公共编解码，旧本地 helper 删除。  
3. 至少 2 处重复 `formatBytes` 或下载逻辑收敛。  
4. `npm test` && `npm run lint` 通过（允许既有 unused-vars warning）。

---

### Phase 2 — P1 加载 / 路由 / reference 试点

#### PR-2.1：loader / router 拆分

- [x] 迁出 `loadLib`、`loadToolPanel`、`loadToolScript`、`assetV`、`openTool` 中加载相关逻辑 → `js/loader.js`  
- [x] 迁出 hash 路由 `setRouteTool` / `setRouteHome` / `popstate` → `js/router.js`（`bootRoute()` 由 `app.js` 在 `initDomCache` 后调用）  
- **行为不变**：并发 `openTool` generation token、失败可重试、`initedTools` 去重逻辑必须保留。

#### PR-2.2：reference 引擎试点

| 项 | 内容 |
|----|------|
| **试点工具** | 优先结构清晰者：`httpstatus`、`jparef`（已有较规整数据） |
| **引擎职责** | 渲染 `ref-group` / `ref-card`、搜索过滤、复制 code、空态 |
| **工具文件职责** | 只声明 `DATA` + `registerInit(() => RefEngine.mount(...))` |
| **禁止** | 同 PR 改造全部 29 个 reference |

**试点验收（已完成）：**

- [x] `js/reference/_ref-engine.js` + `test/reference/ref-engine.test.js`  
- [x] `jparef` / `httpstatus` 委托 `RefEngine`  
- XSS：动态内容继续 `escapeHtml`。

#### PR-2.3：扩展 reference 引擎到 5～10 个

- [x] 本批 5 个：`mavenref`、`gitref`、`lombok`、`docker`、`gradle`  
- 引擎扩展：过滤 `syntax` / `examples` / `returns`；渲染 syntax / 示例 / 输出  
- 大体量数据文件（`flowableref` / `linux` / `redisref`）仍单独 PR，未纳入本批。

---

### Phase 3 — P2 变薄 app.js 与产品增强

- [x] `ui-home.js` / `ui-sidebar.js` 迁出；`index.html` 脚本顺序已更新。  
- [x] `app.js` 体量约 **474 行**（目标 **< 800** 已达成）；`escapeHtml` / `debounce` 归入 `utils.js`。  
- [ ] **产品向（非纯重构，单独 PR）：** JWT 工作台合并、httpdebug 导入 cURL、`curl2java` 等新工具。  
- [x] 补 `module.exports`：核心 `format` / `encode` / `generate` / 试点 reference 已有可测导出；剩余 reference 与产品 feat 不在本 ADR 强制范围。

---

## 4. 公共 API 约定

### 4.1 `crypto-utils.js`（建议冻结）

```js
// 全部操作 Uint8Array / string，禁止静默吞错
function bytesToHex(bytes) { /* lowercase, no 0x prefix */ }
function hexToBytes(hex) { /* 忽略空白；非法字符 throw */ }
function bytesToBase64(bytes) { /* 标准 Base64 */ }
function base64ToBytes(b64) { /* 允许空白；非法 throw */ }
function bytesToBase64Url(bytes) { /* 无 padding */ }
function base64UrlToBytes(s) { /* 自动补 padding */ }
function strToBytes(str) { /* TextEncoder UTF-8 */ }
function bytesToStr(bytes) { /* TextDecoder UTF-8 */ }
```

**规则：**

1. 工具内 **禁止** 再声明 `bytesToHex` 等同名全局函数（避免覆盖）。  
2. 前缀式私有函数（如 `aesBytesToBase64`）改为调用公共 API 或本地 **非全局** 包装。  
3. Node 测试：`require` 后对函数做断言；不依赖 `window`。  
4. 变更公共 API 签名 = **BREAKING**，须升版本说明并全仓替换。

### 4.2 下载与字节

```js
function formatBytes(n) { /* 空值/非数安全；B/KB/MB/GB */ }
function downloadText(filename, text, mime) { /* 默认 text/plain;charset=utf-8 */ }
function downloadBlob(filename, blob) { /* createObjectURL + revoke */ }
```

### 4.3 已有全局（不要重复定义）

| 符号 | 位置 | 说明 |
|------|------|------|
| `escapeHtml` | `utils.js` | 全仓唯一实现 |
| `toast` / `setStatus` / `safeCopy` / `copyText` | `app.js` | UI 反馈 |
| `registerInit` | `app.js` / loader | 工具初始化 |
| `tools` / `categories` / `toolsById` | registry | 注册数据 |
| `loadLib` / `toolLibs` | loader | 第三方库 |

ESLint `globals`（`eslint.config.mjs`）在拆文件后 **同步声明** 新全局，避免误报。

---

## 5. 重构 PR 规范

### 5.1 标题格式

```text
refactor(<scope>): <一句话行为不变的改动>

示例：
refactor(registry): extract tools[] into tools-registry.js
refactor(crypto): add crypto-utils and migrate pbkdf2/hmac/aes
refactor(reference): introduce ref-engine and migrate jparef/httpstatus
```

### 5.2 PR 描述模板（请直接复制）

```markdown
## 类型
- [ ] refactor（行为不变）
- [ ] feat（新工具/产品行为）
- [ ] fix
- [ ] docs

## 动机
（为什么现在做）

## 改动摘要
- 
- 

## 行为不变声明
- [ ] 未改 tools id / 路由 / 懒加载路径语义
- [ ] 未改对外算法默认参数与输出格式
- [ ] 未引入新 npm 依赖（或已在单独 PR 说明）

## 测试
- [ ] `npm test`
- [ ] `npm run lint`
- [ ] 手工：打开受影响工具，主路径点通
- 关键测试 / 截图：（如有）

## 风险与回滚
- 风险：
- 回滚：git revert 本 PR 即可 / 其他步骤

## 关联
- ADR：docs/ADR-refactor-guide.md Phase X / PR-X.Y
```

### 5.3 体积与拆分硬限制

| 规则 | 限制 |
|------|------|
| 单 PR 建议 diff | 业务逻辑 **< 800 行** 净变更（数据搬家可略放宽） |
| 单 PR 迁移 security 文件 | **≤ 5** |
| 单 PR 迁移 reference | **≤ 5** |
| 禁止混杂 | 重构 PR 不夹带新工具；新工具 PR 不做顺手大拆 |
| `app.js` | 避免 `prettier --write js/app.js` 全文件；手改保 diff |

### 5.4 提交前检查清单

```bash
npm test
npm run lint
# 若改了公共 API 或工具导出：
# 确认 test/ 覆盖新增纯函数
# 确认 index.html 脚本顺序
# 确认 vite 构建仍复制 js/（copy-js-assets 递归整树，一般无需改配置）
```

手工冒烟（最少）：

1. 首页加载，工具数 / 分类正常。  
2. 打开 1 个 format + 1 个 security + 1 个 reference。  
3. 复制按钮、主题切换、收藏星标、浏览器后退回首页。  
4. 若动到 loader：断网或错误 URL 下失败 toast / 可重试仍符合预期。

### 5.5 回滚策略

- **默认：** 单 PR 可 `git revert`；不与数据迁移强耦合。  
- **crypto 替换中发现输出不一致：** 立即停扩展，保留双实现对比测试后再删旧函数。  
- **脚本顺序导致白屏：** 优先修 `index.html` 顺序，而非回退全部逻辑。

---

## 6. 新增工具 vs 重构的边界

| 场景 | 应开 PR 类型 |
|------|----------------|
| 只抽函数/拆文件，输出不变 | `refactor`，走本 ADR |
| 新工具（如 `curl2java`） | `feat`，遵循 AGENTS.md「新增工具」4 步 |
| 顺手抽公共函数供新工具用 | **允许** 小规模抽到 `utils` / `crypto-utils`，但 PR 描述必须写清 |
| JWT 三合一面板 | `feat` 产品 PR，勿标纯 refactor |

新增工具检查（摘自 AGENTS.md，须同时满足）：

1. `js/{cat}/{toolId}.js` + `html/panels/{cat}/{toolId}.html`  
2. `tools[]` 注册  
3. 第三方库 → `toolLibs`  
4. 需初始化 → `registerInit`  
5. 可测纯逻辑 → `module.exports` + `test/**`

---

## 7. 风险登记册

| ID | 风险 | 等级 | 缓解 |
|----|------|------|------|
| R1 | 全局函数名冲突导致运行时覆盖 | 高 | API 命名冻结；ESLint globals；禁止工具内再导同名全局 |
| R2 | 拆文件后 script 顺序错误白屏 | 高 | PR 必测首屏；checklist 含 index.html |
| R3 | crypto 替换 silent 结果不一致 | 高 | 单测锁结果；先双跑后删旧 |
| R4 | reference 引擎 DOM 结构差异破坏 CSS | 中 | 保留现有 class；试点再推广 |
| R5 | app.js 拆分触发巨大 prettier diff | 中 | 手改；registry 独立文件后主路径变稳 |
| R6 | ASSET_MAP 未扫到新 js | 低 | vite `injectAssetMapPlugin` 已 walk `js/`；确认新文件在 `js/` 下 |
| R7 | 测试 `require` 拿不到浏览器全局 | 中 | 纯函数放 utils 并导出；`test/setup.js` 按需垫片 |

---

## 8. 成功指标（如何判断重构值回票价）

| 指标 | 基线（约） | 目标（Phase 1–2 后） |
|------|------------|----------------------|
| `app.js` 行数 | ~2688 | 重构后 **~474**（Phase3 目标 **< 800** 已达成） |
| security 内重复 hex/base64 实现 | 10+ 文件 | **≤ 2**（仅特殊算法残留） |
| reference 独立渲染逻辑份数 | ~29 | 引擎推广后 **≤ 5** 特例 |
| `module.exports` 覆盖 | 85/155 | 核心非 reference 工具 **≥ 80%** |
| 新增一个标准 reference | 复制整文件 | 只加数据 + 1 行 mount |
| 回归 | 测试全绿 | 每次 refactor PR 保持全绿 |

---

## 9. 决策记录（ADR 摘要）

### ADR-001：保持全局脚本，不引入业务 ESM

- **状态：** Accepted  
- **理由：** 现有懒加载与 vitest 加载路径依赖经典 script + 全局 + 可选 CJS 导出。  
- **后果：** 公共能力以「有序 script + 全局函数」共享；用约定与 ESLint 代替打包期依赖图。

### ADR-002：重构与新功能拆 PR

- **状态：** Accepted  
- **理由：** 行为不变重构应可快速 revert；功能 PR 单独验收产品。  
- **后果：** 审查标准清晰；禁止“重构顺便加工具”。

### ADR-003：公共 crypto 统一，工具禁止再造轮子

- **状态：** Accepted  
- **理由：** JWT/HMAC/证书链路对编解码一致性敏感。  
- **后果：** 新安全工具必须依赖 `crypto-utils`（或明确文档例外）。

### ADR-004：reference 先引擎后数据外置

- **状态：** Accepted  
- **理由：** 渲染重复是真问题；过早 JSON 外置增加路径与缓存复杂度。  
- **后果：** Phase2 只强制引擎试点；数据外置列为可选后续。

### ADR-005：不引入前端框架

- **状态：** Accepted  
- **理由：** 项目核心卖点是轻量、离线、静态、零构建业务代码。  
- **后果：** UI 复用靠 HTML class 约定与小引擎，不靠组件框架。

---

## 10. 推荐执行顺序（给 Agent / 开发者的「下一 PR」）

按序开 PR，不要并行改同一批 security 文件：

1. **PR-1.1** `tools-registry.js`  
2. **PR-1.2** `crypto-utils.js` + 3 个安全工具  
3. **PR-1.3** `download*` / `formatBytes`  
4. **PR-2.2** reference 引擎 + `jparef` / `httpstatus`  
5. 再考虑 loader/router 与新工具 `feat`

---

## 11. 附录

### A. 相关路径

| 路径 | 说明 |
|------|------|
| `js/app.js` | 核心入口（待变薄） |
| `js/favorites.js` | 收藏 |
| `html/panels/**` | 工具面板 |
| `test/setup.js` | 测试全局垫片 |
| `vite.config.js` | ASSET_MAP、复制 js/html、CORS 插件 |
| `AGENTS.md` | 新增工具与代码风格 |
| `CHANGELOG.md` | 发布说明 |

### B. 已知超大文件（拆业务时单独 PR）

| 行数约 | 文件 |
|--------|------|
| 2688 | `js/app.js` |
| 1938 | `js/debug/httpdebug.js` |
| 1146 | `js/format/jsonexcel.js` |
| 1115 | `js/reference/flowableref.js` |
| 1100 | `js/security/certparser.js` |
| 1024 | `js/codegen/jmhpro.js` |

### C. 变更历史

| 日期 | 说明 |
|------|------|
| 2026-08-06 | 首版：基于全仓扫描结论输出 ADR 与分阶段 PR 指南 |

---

**维护约定：** 若落地过程中修改公共 API 名或 Phase 边界，请同步更新本文并在 `CHANGELOG.md` `[Unreleased]` 记一笔 `### 工程`。
