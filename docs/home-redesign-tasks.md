# 首页工作台化 · 分阶段任务拆分

> 产品目标：把首页从「161 工具百科全书」升级为「开发者工作台」。  
> 技术约束：纯前端、无框架；数据只来自 `tools-registry.js`；尽量不改 `openTool` / loader / router 契约；样式落 `layout.css` /
`base.css`。  
> 生成日期：2026-08-13

---

## 总览

| 阶段      | 主题       | 核心交付                    | 预估            |
|---------|----------|-------------------------|---------------|
| **MVP** | 可用性 + 回访 | 移动 Drawer、收藏独立区、Hero 记忆 | 2–3 人日        |
| **v2**  | 找工具效率    | 命令面板搜索、分类真筛选、冷启动/场景     | 按切片 A/B/C     |
| **v3**  | 体验与性能    | 密度、图标体积、a11y、可选底栏/懒展开   | 先 3.0a 再 3.0b |

```
MVP（导航 + 收藏 + Hero）
  └─► v2（命令面板 + 真筛选 + 场景）
        └─► v3.0a（密度 + a11y）
              └─► v3.0b（图标子集）
                    └─► v3.1 可选（懒展开 / 底栏）
```

---

## 阶段一 · MVP

### 目标与验收

| 目标      | 验收要点                                        |
|---------|---------------------------------------------|
| 移动侧栏    | ≤1024 汉堡 + Drawer + 遮罩；Esc/遮罩/开工具后关闭；桌面行为不变 |
| 我的收藏    | 首页独立区块；有数据列表、无数据空态；与侧栏星标同步；网格不重复展示          |
| Hero 记忆 | `devtools.hero.dismissed` 跨会话；可「重新显示介绍」     |

### 任务列表

| ID   | 标题                         | 文件                           | 依赖        | 体量  |
|------|----------------------------|------------------------------|-----------|-----|
| T-M0 | 窄屏/桌面状态机约定（1024 断点）        | ui-sidebar、layout.css        | —         | S   |
| T-M1 | 顶栏汉堡按钮 + domCache          | index.html、app.js、layout.css | T-M0      | S   |
| T-M2 | Drawer 布局 + backdrop 样式    | layout.css、index.html        | T-M0      | M   |
| T-M3 | open/close/toggle + resize | ui-sidebar.js                | T-M1、T-M2 | M   |
| T-M4 | a11y、选工具后关闭                | ui-sidebar.js                | T-M3      | S   |
| T-F1 | 收藏独立区块 DOM                 | index.html、ui-home.js        | —         | S   |
| T-F2 | 渲染 + 空态 + 星标联动             | ui-home.js、layout.css        | T-F1      | M   |
| T-F3 | 网格去重收藏块、侧栏保留               | ui-home.js、ui-sidebar.js     | T-F2      | S–M |
| T-H1 | Hero 恢复入口 + 记忆加固           | ui-home.js、index.html        | —         | S   |
| T-H2 | localStorage 异常降级（可选）      | ui-home.js                   | T-H1      | S   |
| T-X1 | 初始化接线 + 手测                 | app.js 等                     | M3、F3、H1  | S   |
| T-X2 | 单测（hero/纯函数）               | test/*                       | H1 等      | S–M |

### 实施顺序

```
轨 A 侧栏:  T-M0 → T-M1 → T-M2 → T-M3 → T-M4
轨 B 收藏:  T-F1 → T-F2 → T-F3          （可与 A 并行）
轨 C Hero:  T-H1（+T-H2）               （可与 A/B 并行）
收尾:       T-X1 → T-X2
```

**交付切片：** Slice1 移动导航 → Slice2 收藏区 → Slice3 Hero → 回归。

### MVP 不做

完整工作台大改、最近使用大区块改造、改 loader/router、改 localStorage key、新框架/新依赖。

### 手测矩阵（摘要）

- 桌面 >1024：无汉堡，折叠/拖宽正常
- 768 / 375：汉堡可点，Drawer 开闭，点工具关闭
- 收藏空/有/取消：独立区 + 侧栏同步，网格不双份
- Hero：首次显示 → 收起刷新仍隐 → 可恢复

```bash
npm test && npm run lint && npm run dev
```

---

## 阶段二 · v2

### 目标与验收

| ID      | 验收项                                        |
|---------|--------------------------------------------|
| A1–A4   | 命令面板：Ctrl+K/聚焦；分组结果；↑↓ Enter Esc；打开后清搜索关面板 |
| A5–A8   | 分类真筛选 + 清除；与受众正交；侧栏轻量同步（不破坏展开）             |
| A9–A10  | 冷启动场景入口；有数据时最近+常用优先                        |
| A11–A12 | escapeHtml / 基础 a11y；不改 openTool 契约        |

### 任务列表

| ID    | 标题                    | 文件                            | 依赖          | 体量  |
|-------|-----------------------|-------------------------------|-------------|-----|
| V2-01 | 搜索结果纯函数（分组/限流）        | ui-home.js、test               | —           | M   |
| V2-02 | heatmap → 命令面板 DOM    | index.html、layout.css、ui-home | V2-01       | M   |
| V2-03 | 键盘导航 ↑↓ Enter Esc     | ui-home.js                    | V2-02       | M   |
| V2-04 | `homeCatFilter` 真筛选   | ui-home.js、index.html         | —           | M   |
| V2-05 | 锚点语义：跳转→筛选            | ui-home、ui-sidebar            | V2-04       | M   |
| V2-06 | 高频场景快捷入口              | ui-home / 常量表、layout.css      | V2-01、02    | M   |
| V2-07 | 最近/常用/搜索心智统一          | ui-home.js                    | V2-01、02、06 | S–M |
| V2-08 | 侧栏 filter-active 同步   | ui-sidebar、ui-home            | V2-04、05    | S–M |
| V2-09 | `goHome(catId)` → 真筛选 | ui-home（loader 仅 onclick 语义）  | V2-04       | S   |
| V2-10 | 样式收尾                  | layout.css                    | 02、04、06    | S–M |
| V2-11 | 纯函数单测                 | test/ui-home-search.test.js   | V2-01       | S   |
| V2-12 | 手工回归清单                | 文档                            | 全部          | S   |

### 实施顺序

```
Slice A: V2-01 → V2-02 → V2-03 → V2-11   # 命令面板
Slice B: V2-04 → V2-05 → V2-09 → V2-08   # 真筛选
Slice C: V2-06 → V2-07 → V2-10 → V2-12   # 冷启动与统一
```

V2-01 与 V2-04 可并行，最终合并进 `filterHomeTools`。

### 与 MVP 接口约定

| 项                   | 约定                                         |
|---------------------|--------------------------------------------|
| `clearHomeSearch()` | 只清 query + 关面板，**不清** audience / catFilter |
| `goHome(catId)`     | 改为 `setHomeCatFilter(catId)`，无参则清筛选        |
| `openTool`          | **不改**；仍会 `clearHomeSearch`                |
| catFilter 持久化       | 默认 **不** 写 localStorage                    |
| 侧栏                  | 全量导航；主区才是过滤视图                              |

### v2 不做

URL 同步筛选、全局脱离顶栏的模态面板、拼音模糊搜、改 openTool/router、侧栏内第二套搜索。

---

## 阶段三 · v3

### 目标与验收

| ID     | 验收项                                   |
|--------|---------------------------------------|
| A1–A2  | 紧凑/舒适密度 + localStorage；响应式不错位         |
| A3–A4  | 图标体积相对 woff2≈134KB **≥−60%**；全站无缺图标   |
| A5–A6  | 受众 Tab WAI-ARIA；卡片 Tab/Enter/Space 可达 |
| A7–A8  | （可选）底栏；（可选）分类懒展开                      |
| A9–A10 | 测试回归；非必须不改 package/构建                 |

### 任务列表

#### 必做

| ID    | 标题                       | 文件                                   | 依赖          | 体量  |
|-------|--------------------------|--------------------------------------|-------------|-----|
| V3-05 | 全站 `bi-*` 盘点 → 子集清单      | scripts/ 或 docs                      | —           | S–M |
| V3-01 | 密度模式 comfortable/compact | layout.css、ui-home、index             | MVP/v2 网格稳定 | M   |
| V3-02 | 密度与 divider/星标协调         | layout.css                           | V3-01       | S   |
| V3-03 | 受众 Tab aria + 方向键        | index、ui-home、layout.css             | v2 受众逻辑     | M   |
| V3-04 | 卡片/锚点键盘 + focus-visible  | ui-home、layout.css                   | 可与 03 并行    | M   |
| V3-08 | 密度/受众纯函数单测               | test/*                               | V3-01、03    | S–M |
| V3-06 | 图标子集/sprite 落地           | base.css、scripts、**可能** package/vite | V3-05       | L   |
| V3-07 | 图标体积与视觉回归                | —                                    | V3-06       | S   |

#### 可选

| ID    | 标题                 | 体量 | 说明           |
|-------|--------------------|----|--------------|
| V3-09 | 移动底栏（首页/分类/搜索/收藏）  | L  | 断点对齐 ≤1024   |
| V3-10 | 分类懒展开              | L  | **优先于**真虚拟列表 |
| V3-11 | 网格 windowing 虚拟化   | L  | 默认不推荐 v3.0   |
| V3-12 | CHANGELOG / 子集重建文档 | S  | 合入后          |

### 实施顺序

```
v3.0a: V3-05 → V3-01 → V3-02 → V3-03 → V3-04 → V3-08   # 不碰构建
v3.0b: V3-06 → V3-07                                     # 独立 PR，图标
v3.1:  V3-10 和/或 V3-09                                 # 可选
v3.2:  V3-11                                             # 仅数据证明需要
```

### 图标方案建议

1. **优先 A**：子集 woff2，尽量保持 `bi bi-xxx` 类名零改业务
2. **备选 B**：SVG sprite（改 createHomeCard / 侧栏，面更大）
3. **慎改** `package.json` / `vite.config.js`：单独 PR + 评审

### v3 不做

引入框架、外链图标 CDN、v3.0 必做虚拟列表、同时大改密度+虚拟化+图标。

### 性能 / a11y 指标（建议）

| 指标            | 目标                             |
|---------------|--------------------------------|
| 图标资源          | ≤40–50KB 或相对 134KB −60%+       |
| 懒展开后首屏卡片      | ≤40–60 或业务类 ≤2–3 个展开           |
| 受众 Tab        | WAI-ARIA Tabs 完整               |
| 焦点            | 可交互控件 `:focus-visible` 清晰      |
| axe / LH a11y | 首页 0 serious/critical（已知第三方除外） |

---

## 关键文件速查

| 职责            | 路径                              |
|---------------|---------------------------------|
| 首页逻辑          | `js/ui-home.js`                 |
| 侧栏            | `js/ui-sidebar.js`              |
| 收藏纯逻辑         | `js/favorites.js`               |
| 注册表           | `js/tools-registry.js`          |
| 打开工具          | `js/loader.js`（尽量只调用）           |
| 壳与 Hero/受众    | `index.html`                    |
| 首页/侧栏样式       | `css/layout.css`、`css/base.css` |
| 启动 / domCache | `js/app.js`                     |

---

## 推荐开工顺序（一句话）

**先 MVP 三轨并行（移动导航优先）→ v2 先命令面板再真筛选 → v3 先密度+a11y，图标单独 PR。**

---

## 落地状态（2026-08-13）

| 阶段 | 状态 | 说明 |
|------|------|------|
| **MVP** | ✅ 已完成 | 移动 Drawer、收藏独立区、Hero 恢复 |
| **v2** | ✅ 已完成 | 命令面板、分类真筛选、场景快捷、单测 `test/ui-home-search.test.js` |
| **v3.0a** | ✅ 已完成 | 密度 comfortable/compact、受众 Tab a11y、卡片键盘、`test/ui-home-density.test.js` |
| **v3.0b** | ⏳ 未开始 | 图标子集（可能动构建，独立 PR） |
| **v3.1** | ✅ 已完成 | 分类懒展开 + 移动底栏；`test/ui-home-expand.test.js` |

### v2 关键 API（`js/ui-home.js`）

- `buildCommandPaletteResults(opts)` → `{ groups, flat }`
- `renderHomeCmdPanel` / `showHomeCmdPanel` / `hideHomeCmdPanel`（旧 heatmap 名仍为别名）
- `setHomeCatFilter` / `clearHomeCatFilter` / `homeCatFilter`
- `HOME_SCENE_SHORTCUTS` + 首页场景 chips
- `goHome(catId)`：真筛选 + 回顶；`clearHomeSearch` 只清 query，保留 audience / catFilter

### v3.0a 关键 API / Key

- `devtools.home.density`：`comfortable` | `compact`（`normalizeHomeDensity`）
- `#panel-home[data-home-density]` + CSS `--hc-*` 变量
- 受众 Tab：`role="tab"` / `aria-selected` / 方向键；卡片 Enter/Space 打开

### v3.1 关键 API / Key

- `devtools.home.expandedCats`：业务分类展开集合（JSON 数组；无 key = 仅首个业务类）
- `shouldForceExpandAllHomeCats({ q, audience, catFilter })`：搜索 / 受众 / 分类筛选时强制全展开
- `#homeBottomNav`：≤1024 底栏（首页 / 分类 Drawer / 搜索 / 收藏）
