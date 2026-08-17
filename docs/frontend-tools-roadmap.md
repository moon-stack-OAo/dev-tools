# 前端工具扩展清单

> 状态：规划中 · 未实现  
> 背景：当前带 `frontend` 标签的工具数量尚可，但 **CSS / 布局 / 视觉** 类专用工具偏少；后端与 Java 向工具密度更高。  
> 目标：在保持「纯前端、本地处理、无重依赖」前提下，补齐高频前端开发工具。

---

## 1. 现状摘要

### 1.1 已有前端相关能力

| 工具 ID            | 名称              | 能力类型                 |
|------------------|-----------------|----------------------|
| `cssfmt`         | CSS 格式化         | 格式化 / 压缩             |
| `webfmt`         | Web 格式化         | HTML / CSS / JS 格式化  |
| `color`          | 颜色转换            | HEX / RGB / HSL 互转预览 |
| `cssref`         | CSS 属性速查        | 参考                   |
| `htmlmd`         | HTML ↔ Markdown | 互转                   |
| `htmlescape`     | HTML 转义         | 编解码                  |
| `image-compress` | 图片压缩            | 生成与转换                |
| `imgbase64`      | 图片 Base64       | 编解码                  |
| `resratio`       | 分辨率比例           | 生成与转换                |
| `vuereactref`    | Vue / React 速查  | 参考                   |
| `esref`          | ES/JS 特性速查      | 参考                   |
| `jsrun`          | JS/TS 运行        | 代码执行                 |

### 1.2 缺口

- 缺少「可交互」的 CSS 生成（阴影、渐变、布局可视化等）
- 缺少单位 / clamp / 媒体查询等日常换算
- 缺少无障碍对比度、选择器调试等前端调试向工具
- 视觉类能力目前几乎只有 `color`

---

## 2. 推荐工具清单

### 2.1 P0 — 强烈推荐（优先实现）

实现成本低、使用频次高、与现有 `color` / `cssfmt` 形成闭环。

| 建议 ID       | 名称       | 分类 `cat`   | 建议 tags              | 功能要点                                               | 实现备注                                 |
|-------------|----------|------------|----------------------|----------------------------------------------------|--------------------------------------|
| `cssunit`   | CSS 单位换算 | `generate` | `common`, `frontend` | px ↔ rem/em、vw/vh、%（可配根字号 / 视口）                    | 纯逻辑，无依赖；可参考 `bytesize` 交互            |
| `boxshadow` | 阴影生成器    | `generate` | `common`, `frontend` | 可视化调 `box-shadow`（多阴影、inset、spread）+ 实时预览 + 复制 CSS | 原生 DOM + CSS；样式写在 `css/generate.css` |
| `gradient`  | 渐变生成器    | `generate` | `common`, `frontend` | 线性 / 径向、多色标、角度；输出 CSS（可选 SVG）                      | 原生；色标可复用 `color` 思路                  |

### 2.2 P1 — 次优先（差异化明显）

| 建议 ID         | 名称              | 分类 `cat`   | 建议 tags              | 功能要点                                       | 实现备注                       |
|---------------|-----------------|------------|----------------------|--------------------------------------------|----------------------------|
| `flexgrid`    | Flex / Grid 可视化 | `generate` | `common`, `frontend` | 点选主轴 / 交叉轴 / gap / 列定义，生成对应 CSS            | 交互稍复杂，建议分 Tab（Flex / Grid） |
| `cubicbezier` | 贝塞尔曲线           | `generate` | `common`, `frontend` | 拖拽控制点调 `cubic-bezier`，预览动画曲线               | Canvas 或 SVG 绘制曲线          |
| `contrast`    | 对比度 / 无障碍       | `generate` | `common`, `frontend` | 前景 / 背景色 WCAG AA / AAA；可扩展为独立或挂在 `color` 旁 | WCAG 相对亮度公式纯 JS 即可         |

### 2.3 P2 — 增强完整度

| 建议 ID         | 名称            | 分类 `cat`              | 建议 tags              | 功能要点                                               | 实现备注                               |
|---------------|---------------|-----------------------|----------------------|----------------------------------------------------|------------------------------------|
| `svgopt`      | SVG 优化 / 预览   | `generate`            | `common`, `frontend` | 压缩 path、去冗余属性、预览、转 data URI                        | 可自研轻量规则；慎引 SVGO 全量                 |
| `favicon`     | Favicon 多尺寸   | `generate`            | `common`, `frontend` | 一张图导出 16 / 32 / 180 / ico 等                        | Canvas 缩放 + 下载；ico 可用简单多尺寸 PNG 包替代 |
| `cssclamp`    | CSS Clamp 计算器 | `generate`            | `common`, `frontend` | fluid typography：`clamp(min, preferred, max)` 参数反算 | 纯计算 + 预览字号                         |
| `mediaquery`  | 媒体查询生成        | `generate`            | `common`, `frontend` | 常见断点预设 + 自定义 `@media`                              | 模板生成即可                             |
| `csselector`  | CSS 选择器测试     | `debug` 或 `text`      | `common`, `frontend` | 输入 HTML + selector，高亮匹配节点                          | 类似 `regex` 交互；`DOMParser` 即可       |
| `specificity` | 特异性计算器        | `reference` 或 `debug` | `common`, `frontend` | 计算 selector specificity (a,b,c)                    | 纯解析逻辑，适合单测                         |
| `lorem`       | Lorem / 占位图   | `generate`            | `common`, `frontend` | 中英文假文 + 纯色 / 渐变占位图 data URL                        | 轻量；占位图用 Canvas                     |
| `fontpreview` | 字体预览          | `generate`            | `common`, `frontend` | 本地字体文件预览、字重字号样张                                    | `FontFace` API                     |

### 2.4 暂不推荐 / 后置

| 方向                                 | 原因                                |
|------------------------------------|-----------------------------------|
| 单独的 margin / padding / opacity 生成器 | 过碎，应合并进「视觉属性生成」类工具                |
| Tailwind 类名 ↔ CSS                  | 维护成本高，版本与插件面大，后置                  |
| SCSS / Less 完整编译                   | 依赖体积大，与「轻量纯前端」略冲突                 |
| 完整 CSS 在线 IDE                      | 超出工具箱定位，与 `webfmt` / `jsrun` 边界模糊 |

---

## 3. 建议落地顺序

| 阶段     | 工具                                           | 目标              |
|--------|----------------------------------------------|-----------------|
| **一期** | `cssunit`、`boxshadow`、`gradient`             | 快速补齐「换算 + 视觉生成」 |
| **二期** | `flexgrid`、`contrast`、`cubicbezier`          | 布局与动效、无障碍       |
| **三期** | `svgopt`、`favicon`、`cssclamp`、`csselector` 等 | 完整度与调试向         |

---

## 4. 实现约定（与 AGENTS.md 对齐）

新增每个工具时遵循：

1. 脚本：`js/{cat}/{toolId}.js`
2. 面板：`html/panels/{cat}/{toolId}.html`
    - 根节点：`<div class="tool-panel" id="panel-{toolId}">`
    - **不要**手写 tool-header
3. 注册：`js/tools-registry.js` 的 `tools[]`（`id` / `name` / `cat` / `icon` / `desc` / `tags`）
4. 第三方库：放入 `public/lib/`（或经 `scripts/copy-libs.js`），并在 `js/loader.js` 的 `toolLibs` 登记
5. 初始化：`registerInit(toolId, fn)`（每个工具只执行一次）
6. 样式：写在对应分类 CSS（如 `css/generate.css`），类名前缀短标识（如 `.cu-` / `.bs-` / `.gd-`），**不**新建单工具 CSS
7. 纯逻辑：`module.exports` 导出 + `test/{cat}/{toolId}.test.js`
8. 受众标签：非 java 专用应含 `common`；前端工具加 `frontend`
9. **不要**写死工具总数；文档数量以注册表为准

### 4.1 分类建议

| 能力类型                | 建议 `cat`                       |
|---------------------|--------------------------------|
| 单位换算、视觉生成、布局生成、占位资源 | `generate`                     |
| 选择器测试、特异性           | `debug` 或 `text`               |
| 纯对照表 / 公式说明         | `reference`                    |
| 格式化                 | 沿用已有 `cssfmt` / `webfmt`，不重复建设 |

### 4.2 技术约束

- 无后端；可完全浏览器实现
- 优先零依赖或已有 `public/lib` 内库
- 动态 DOM 必须用 `escapeHtml`
- Object URL 在离开工具 / 重置时 `URL.revokeObjectURL`

---

## 5. 一期详细规格（开工用）

### 5.1 `cssunit` — CSS 单位换算

- **输入**：数值 + 源单位 + 配置（根字号默认 16px、视口宽高可选）
- **输出**：px / rem / em / vw / vh / % 等对照表
- **交互**：改任一值实时联动（可参考 `bytesize`）
- **测试**：换算公式与边界（0、负数、极大值）

### 5.2 `boxshadow` — 阴影生成器

- **控件**：offset-x/y、blur、spread、color、inset；支持多条阴影
- **预览区**：可调预览块背景 / 圆角，实时看效果
- **输出**：完整 `box-shadow: ...` 字符串，一键复制
- **测试**：序列化多阴影、inset 开关

### 5.3 `gradient` — 渐变生成器

- **类型**：linear / radial（后续可加 conic）
- **色标**：至少 2 个，支持增删、位置 %、颜色
- **角度 / 形状**：linear 角度；radial 形状与位置
- **输出**：`background: linear-gradient(...)` 等，一键复制
- **测试**：色标排序、角度规范化

---

## 6. 实现状态

| 阶段 | 工具 ID | 状态 |
|------|---------|------|
| P0 | `cssunit` / `boxshadow` / `gradient` | 已实现 |
| P1 | `flexgrid` / `cubicbezier` / `contrast` | 已实现 |
| P2 | `svgopt` / `favicon` / `cssclamp` / `mediaquery` | 已实现 |
| P2 | `csselector` / `specificity` / `lorem` / `fontpreview` | 已实现 |

单测：14 个文件 / 124 项全部通过。

---

## 7. 后续决策记录

| 日期         | 决策 | 说明                      |
|------------|----|-------------------------|
| 2026-08-14 | 初稿 | 基于注册表现状整理 P0–P2 清单与一期规格 |
| 2026-08-14 | 全量落地 | 按 P0–P2 实现 14 个前端工具并完成注册与单测 |

---

## 8. 变更日志

| 日期         | 说明   |
|------------|------|
| 2026-08-14 | 创建文档 |
| 2026-08-14 | 标记 P0–P2 已实现 |
