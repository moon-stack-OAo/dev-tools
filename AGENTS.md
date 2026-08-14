# AGENTS.md

## 项目简介

本项目是 **ToolPkg（码包）** —— 纯前端开发者工具箱（Vite 6 + 原生 JS，无框架）。

- 工具元数据单一来源：`js/tools-registry.js`（`categories` + `tools[]`）
- 懒加载：`js/loader.js`（`toolLibs` / `loadToolPanel` / `loadToolScript` / `openTool` / `registerInit`）
- 通用函数：`js/utils.js`（`escapeHtml` / `formatBytes` / `downloadBlob` / `debounce` 等）
- 样式按分类：`css/{base,layout,format,encode,security,generate,codegen,text,debug,reference}.css`

## 开发命令

```bash
npm install          # 安装依赖（postinstall 自动同步库到 public/lib/）
npm run dev          # 开发服务器 http://localhost:3000
npm run build        # 生产构建 → dist/
npm test             # 运行单元测试（Vitest）
npm run lint         # ESLint 检查（0 errors，warnings 多为 unused-vars）
npm run lint:fix     # ESLint 自动修复
npm run format       # Prettier 格式化
```

## 中文回复指令

## 语言要求

- 请始终使用中文（简体中文）回复我，除非我明确要求使用其他语言。
- 代码中的关键字、标准库名称、变量名、函数名、类名等保持英文。
- 代码注释优先使用中文。
- 在解释技术概念时，可在中文术语后附带英文原文，例如：依赖注入（Dependency Injection）、控制反转（Inversion of Control）。
- 生成的错误分析、排查步骤、优化建议均使用中文描述。

## 沟通风格

- 回复应清晰、简洁、有条理。
- 优先给出结论，再说明原因和解决方案。
- 对于复杂问题，请按“问题分析 → 原因说明 → 解决方案 → 注意事项”的结构回答。
- 在解释复杂概念时，尽量使用类比和示例帮助理解。
- 当存在多种方案时，请给出推荐方案，并说明适用场景及优缺点。
- 不确定用户需求时，应主动提出澄清问题，而不是自行假设。

## 文档规范

- 生成的技术文档优先使用中文。
- 生成的 Markdown 文档应具有清晰的标题层级结构。
- 涉及架构设计时，应同时说明设计目标、实现方案及优缺点。
- 涉及数据库设计时，应包含字段说明、索引建议和注意事项。

## 交互原则

- 如果需求描述存在歧义，请主动提问确认。
- 如果发现用户方案存在潜在风险，请明确指出风险及替代方案。
- 对于可能影响生产环境的操作，应提醒用户做好备份和验证。
- 当存在最佳实践时，请优先推荐最佳实践，而非仅满足最低实现要求。

## 代码规范

- **缩进**：4 空格 / **引号**：单引号 / **分号**：是 / **列宽**：120
- `js/**/*.js`：浏览器脚本（sourceType script），用全局函数 + onclick 调用，非 ES Module
- `vite.config.js`、`eslint.config.mjs`、`vitest.config.js`：ESM（import/export）
- `scripts/copy-libs.js`：CommonJS（require/module.exports）
- 全局工具函数：
    - `escapeHtml` / `formatBytes` / `downloadBlob` / `debounce` → **`js/utils.js`**（勿在工具内重复定义）
    - `toast` / `safeCopy` / `copyText` / `setStatus` → **`js/app.js`**
- 第三方库全局变量已在 `eslint.config.mjs` 声明（jsyaml/Diff/md5/sqlFormatter 等）
- 生成的代码应具备生产环境可用性，避免仅提供演示级别代码。
- 优先考虑代码的可读性、可维护性和扩展性。
- 示例代码应包含必要的异常处理和边界条件判断。
- 提供完整、可直接运行的示例，而非仅展示核心片段。
- 修改已有代码时，应尽量保持原有代码风格一致。

## 修改原则

- 最小化修改范围，保持 Git Diff 干净。
- 不修改无关代码。
- 保持原有代码风格一致。

## 输出要求

- 返回可直接运行的完整代码。
- 不省略关键代码。
- 修改较大时说明修改点。

## Agent 协作

- 当运行环境支持 Subagent，且任务涉及多个独立职责或多个文件时，应优先将任务拆分为多个子任务并并行处理。
- 对于简单任务，应直接完成，不必拆分。
- 最终输出前，应由主 Agent 对所有修改进行统一审查，确保代码风格、功能实现和文档保持一致。

## 新增工具

1. 创建 `js/{cat}/{toolId}.js` 和 `html/panels/{cat}/{toolId}.html`（目录须与注册表 `cat` 一致）
2. 面板根节点：`<div class="tool-panel" id="panel-{toolId}">`（**不要**手写 tool-header，由 `openTool` 注入）
3. 在 **`js/tools-registry.js`** 的 `tools[]` 注册元信息（`id` / `name` / `cat` / `icon` / `desc` / `tags`）
4. 若依赖第三方库：库文件放入 `public/lib/`（或经 `scripts/copy-libs.js` 同步），并在 **`js/loader.js`** 的 `toolLibs` 中登记：
   `toolId: ['xxx.min.js']`
5. 需初始化的工具在 JS 末尾调用 `registerInit(toolId, fn)`（定义于 `loader.js`，每个工具只执行一次）
6. 样式写在对应分类 CSS（如 debug → `css/debug.css`），类名用工具短前缀（如 `.vd-`），**不要**新建单工具 CSS 文件
7. 纯逻辑用 `module.exports` 导出，并补充 `test/{cat}/{toolId}.test.js`
8. **不要**在代码/测试里写死工具总数或分类数：顶栏文案由 `formatHomeSubtitle()`（`tools-registry.js`）在 `buildHomeGrid` 时填充；单测校验结构与唯一性即可
9. 文档（README 工具列表、分类小节）可按需更新描述，**数量以注册表为准**，勿把「N 个工具」当作必须手改的硬编码

### 路径约定

| 资源     | 路径                            |
|--------|-------------------------------|
| 脚本     | `js/{cat}/{id}.js`            |
| 面板     | `html/panels/{cat}/{id}.html` |
| 注册     | `js/tools-registry.js`        |
| 懒加载/依赖 | `js/loader.js`                |
| 单测     | `test/{cat}/{id}.test.js`     |

### tags 约定

- 受众标签：`common` | `frontend` | `backend` | `java`（可多选）
- 非 `java` 专用工具应包含 `common`（与 `toolMatchesAudience` / 首页筛选一致）

## 注意事项

- **不要**在 `js/app.js` 再维护 `tools[]` / `toolLibs`（已拆到 registry / loader）
- 改 `js/app.js` 时，`prettier --write` 会全文件重格式化（大量噪音），建议手动编辑保持 diff 干净
- 单元测试用 `require()` 加载工具 JS，工具需通过 `module.exports` 导出纯函数才能测试
- `test/setup.js` 提供 `registerInit` / `escapeHtml` 等浏览器全局的 Node 垫片
- 面板 HTML **不**写入 `index.html`，由 `openTool` → `fetch('html/panels/...')` 动态插入
- Object URL / 大文件：离开工具或重置时务必 `URL.revokeObjectURL`
- 动态拼 DOM 必须用 `escapeHtml`

## 禁止事项

除非明确要求，否则不要：

- 修改项目结构。
- 引入新的依赖。
- 修改构建配置。
- 修改 package.json。
