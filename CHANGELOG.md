# Changelog

本项目所有重要变更均记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本管理遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

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
  RFC 6238 标准向量验证

### 安全

- **XSS 审计修复**：
    - 二维码解析 WiFi / vCard 字段补充 `escapeHtml` 转义
    - Markdown 渲染新增 `_mdSanitize()` 清理 `<script>` / `on*` 事件属性 / `javascript:` 协议
- **nginx 安全响应头**：补充 `X-Frame-Options` / `X-Content-Type-Options` / `Referrer-Policy`

### 视觉美化

- **favicon 重新设计**：从保险箱/锁造型改为 `</>` 代码括号，保留蓝紫渐变背景
- **首页卡片增强**：hover 分类色边框 + 顶部光带 + 入场动画（JS 动态 delay）
- **工具面板标题注入**：打开工具时动态注入图标 / 名称 / 描述（分类色着色），无需修改 97 个面板 HTML
- **header 标题渐变**："DevTools" 文字从纯白改为 `text → accent` 渐变填充

### 其他

- `vitest.config.js` 从 CommonJS 统一为 ESM 风格
- `.gitignore` 自忽略问题确认已不存在
