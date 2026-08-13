# 新增工具面板推荐清单

> 基于当前注册表（`js/tools-registry.js`，约 161 个工具，覆盖 format / encode / security / generate / codegen / text /
> debug / reference 8 大业务分类）整理的后续工具建设建议。
>
> 生成日期：2026-08-13

## 现状观察

| 观察点               | 说明                                              |
|-------------------|-------------------------------------------------|
| Java / 后端工具成熟     | reference 29 个、debug 24 个、security 19 个，覆盖已相当充分 |
| 前端（frontend）覆盖面弱  | 编解码、格式化、参考类中前端向工具明显不足                           |
| codegen 转换能力有扩展空间 | JSON → 多语言目前只支持 TypeScript / Kotlin / Go        |
| 文本类缺基础日常工具        | 排序 / 去重 / 繁简转换等高频操作缺失                           |

## 推荐清单

### P1 · 高价值，推荐优先做

| 工具                               | 分类      | 理由                                 |
|----------------------------------|---------|------------------------------------|
| 中文繁简转换                           | text    | 常用基础工具，纯前端轻松实现，贴近中文用户              |
| JSON → C# / Python / Rust        | codegen | 现有 json2code 缺这三大主流语言，扩展价值大        |
| DDL → JPA Entity / Prisma Schema | codegen | 呼应已有 jparef 参考工具，形成生成 ↔ 参考闭环       |
| OpenAPI → TypeScript Client      | codegen | openapiview 只做预览，可补「一键生成调用代码」      |
| 文本排序 / 去重 / 分割                   | text    | 高频基础操作，目前缺失                        |
| CSS 格式化（独立）                      | format  | webfmt 是 HTML/CSS/JS 混合，拆出独立工具体验更好 |

### P2 · 增强现有体系

| 工具                                               | 分类      | 理由                              |
|--------------------------------------------------|---------|---------------------------------|
| Entity ↔ DTO ↔ VO 转换器                            | codegen | Java 后端高频场景                     |
| Java Builder 生成 / 去 Lombok                       | codegen | 与 lombok 参考工具互补                 |
| DDL → MyBatis-Plus 完整 CRUD（含 Service/Controller） | codegen | 现有 sqltopojo 只生成实体              |
| Feign / 接口调用代码生成                                 | codegen | httpdebug 已有 Java 片段生成，可延伸      |
| JSON5 / JSONC 格式化                                | format  | 前端 tsconfig 等场景常用               |
| INI / Config 格式化                                 | format  | propertiesfmt 未覆盖 INI 方言        |
| Nginx access log 解析                              | debug   | 与已有 logfmt / logpattern 形成日志工具族 |

### P3 · 填补前端空缺

| 工具                   | 分类        | 理由                     |
|----------------------|-----------|------------------------|
| CSS 属性速查             | reference | 前端参考几乎空白               |
| Vue / React 速查       | reference | 同上，项目定位「全栈」却缺前端参考      |
| ES / JS 特性速查         | reference | 前端向                    |
| Kubernetes 命令（独立）    | reference | 现 docker 工具混装了 K8s，可拆分 |
| Elasticsearch DSL 速查 | reference | 后端参考缺口                 |

## 不建议新增的方向

| 方向          | 原因                                                      |
|-------------|---------------------------------------------------------|
| 安全类加密算法     | 已有 19 个工具，AES / RSA / SM / Jasypt / bcrypt / PBKDF2 全覆盖 |
| 更多编码类       | Base64 / Hex / URL / Base32 / Unicode 已覆盖全矩阵            |
| Argon2 等新哈希 | 浏览器端实现复杂，收益低，且已有 bcrypt / PBKDF2 可满足                    |
