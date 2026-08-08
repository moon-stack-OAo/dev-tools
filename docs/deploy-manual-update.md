# DevTools 一键更新部署说明

本文说明如何在自建环境中部署静态站点、Docker、更新 Agent、Nginx 反代与 systemd 服务，使运维可通过 `ops-update.html` 触发一键更新。

> 安全提示：Update Token 仅通过环境变量/密钥文件注入，**切勿写入仓库或 HTML**。

## 架构概览

```
浏览器
  │  GET  version.json          → 当前构建信息（静态文件）
  │  GET  /api/status           → Agent：本地/远程对比
  │  POST /api/update           → Agent：触发更新（Header: X-Update-Token）
  │  GET  /api/update/log       → Agent：更新日志
  ▼
Nginx（静态 + 反代 /api/*）
  ├─ /               → dist 静态目录
  └─ /api/           → 本机 Update Agent（默认 127.0.0.1:3930）
```

页面入口（构建后位于站点根目录）：

- `https://你的域名/ops-update.html`
- 返回首页：`index.html`
- 主站状态栏右侧有「更新」链接

该页已设置 `meta robots noindex`，请勿主动对外宣传。

## 1. 静态产物

```bash
npm ci
npm run build
# 产物在 dist/：含 ops-update.html、version.json（Vite 构建自动写入）
```

部署时确保：

| 文件 | 说明 |
|------|------|
| `dist/index.html` | 主站（内联 `__BUILD_INFO__`） |
| `dist/ops-update.html` | 更新管理页 |
| `dist/version.json` | 当前构建元信息（`npm run build` 自动生成） |

### version.json 字段（与 Vite `writeVersionPlugin` 一致）

```json
{
  "commit": "短 sha",
  "fullSha": "完整 commit hash",
  "branch": "main",
  "builtAt": "2026-08-08T12:00:00.000Z",
  "repo": "moon-stack-OAo/dev-tools"
}
```

## 2. Docker 静态托管

仓库已提供 `Dockerfile` + `nginx.conf`，默认将 `dist` 挂到 `/usr/share/nginx/html`。

```bash
docker build -t dev-tools:latest .
docker run -d --name dev-tools -p 8080:80 dev-tools:latest
```

一键更新需要 **宿主机/侧车** 运行 Update Agent，并由 Nginx 将 `/api/` 反代过去。容器内仅有静态站 + CORS 代理时，`ops-update.html` 会提示「Agent 未连接或未配置反代」。

推荐两种模式：

1. **宿主机 Agent + 容器 Nginx**：容器映射端口，宿主机 Agent 监听 `127.0.0.1`，通过额外 Nginx 或 compose 网络反代。
2. **compose 双服务**：`web`（静态）+ `update-agent`，共享网络，Nginx 反代到 agent 服务名。

## 3. Update Agent 约定

Agent 为独立进程（可用 Node/Go/Shell 包装），需实现：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/status` | 返回本地/远程版本对比 |
| POST | `/api/update` | 校验 `X-Update-Token` 后执行更新 |
| GET | `/api/update/log` | 返回最近一次更新日志（文本或 JSON） |

### 环境变量建议

| 变量 | 说明 |
|------|------|
| `UPDATE_TOKEN` | 与页面输入一致的密钥 |
| `UPDATE_REPO_DIR` | 代码/发布工作目录 |
| `UPDATE_BRANCH` | 默认跟踪分支，如 `main` |
| `UPDATE_DIST_DIR` | 静态站点目录，如 `/var/www/devtools` |
| `UPDATE_LISTEN` | 如 `127.0.0.1:3928` |
| `UPDATE_SCRIPT` | 实际更新脚本路径 |

### /api/status 响应示例

```json
{
  "status": "update_available",
  "branch": "main",
  "local": {
    "sha": "abc1234def",
    "shortSha": "abc1234",
    "message": "fix: xxx",
    "time": "2026-08-01T10:00:00+08:00"
  },
  "remote": {
    "sha": "deadbeef01",
    "shortSha": "deadbee",
    "message": "feat: yyy",
    "time": "2026-08-08T09:30:00+08:00"
  },
  "updating": false
}
```

`status` 推荐取值：`up_to_date` | `update_available` | `updating` | `failed` | `unknown`。

### POST /api/update

请求头：

```http
X-Update-Token: <与 UPDATE_TOKEN 一致>
```

成功示例：

```json
{ "ok": true, "message": "更新已触发" }
```

失败（Token 错误）应返回 `401`/`403`。

### GET /api/update/log

可返回纯文本，或：

```json
{ "log": "....多行日志...." }
```

也支持 `{ "lines": ["..."] }`。

### 更新脚本建议步骤

1. `git fetch` + 对比 `HEAD` 与 `origin/<branch>`
2. 拉取代码 / 下载 release 产物
3. `npm ci && npm run build`（或仅同步预构建 `dist`）
4. 原子替换站点目录（`rsync` / 临时目录 + `mv`）
5. 写入新的 `version.json`
6. 记录日志到固定文件供 `/api/update/log` 读取
7. 同一时刻只允许一个更新任务（文件锁）

## 4. Nginx 反代

在现有静态站点 server 中增加（按实际 Agent 端口修改）：

```nginx
# 更新管理页禁止索引缓存（可选）
location = /ops-update.html {
    add_header Cache-Control "no-cache, no-store, must-revalidate" always;
    add_header X-Robots-Tag "noindex, nofollow" always;
}

location = /version.json {
    add_header Cache-Control "no-cache, no-store, must-revalidate" always;
    try_files $uri =404;
}

# Update Agent（仅本机）
location /api/ {
    proxy_pass http://127.0.0.1:3928;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    # 透传更新 Token
    proxy_set_header X-Update-Token $http_x_update_token;
    proxy_read_timeout 300s;
    proxy_connect_timeout 10s;
    add_header Cache-Control "no-store" always;
}
```

建议：

- Agent **只监听 127.0.0.1**，不对外网暴露。
- 对 `/ops-update.html` 与 `/api/` 增加 IP 白名单或 Basic Auth（可选加固）。
- HTTPS 终端在 Nginx 完成。

校验配置：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 5. systemd 托管 Agent

示例单元 `/etc/systemd/system/devtools-update-agent.service`：

```ini
[Unit]
Description=DevTools Update Agent
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/devtools-agent
Environment=UPDATE_TOKEN_FILE=/etc/devtools/update.token
Environment=UPDATE_REPO_DIR=/opt/devtools
Environment=UPDATE_DIST_DIR=/var/www/devtools
Environment=UPDATE_BRANCH=main
Environment=UPDATE_LISTEN=127.0.0.1:3928
Environment=UPDATE_SCRIPT=/opt/devtools-agent/update.sh
ExecStart=/usr/bin/node /opt/devtools-agent/server.js
Restart=on-failure
RestartSec=3
# 收紧权限（按需调整）
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

Token 文件权限：

```bash
sudo install -d -m 750 /etc/devtools
sudo install -m 600 /dev/null /etc/devtools/update.token
# 将随机密钥写入该文件后：
sudo systemctl daemon-reload
sudo systemctl enable --now devtools-update-agent
sudo systemctl status devtools-update-agent
```

生成随机 Token：

```bash
openssl rand -hex 32
```

## 6. 使用更新管理页

1. 浏览器打开 `https://你的域名/ops-update.html`
2. 页面加载时自动：
   - 读取 `version.json` 显示本地构建
   - 请求 `/api/status` 对比远程（失败则提示 Agent 未连接）
   - 拉取 `/api/update/log`
3. 在 Token 框填入密钥；可选勾选「记住到 sessionStorage」（键名 `devtools.updateToken`，关标签即失）
4. **检查更新**：重新拉取状态
5. **立即更新**：`POST /api/update`，Header `X-Update-Token`
6. **刷新日志**：查看脚本输出

状态徽章：

| 徽章 | 含义 |
|------|------|
| 已是最新（绿） | 本地与远程一致 |
| 可更新（橙） | 远程有新提交 |
| 更新中（蓝） | 任务进行中 |
| 失败（红）/ 未知（灰） | 出错或 Agent 不可用 |

## 7. 验收清单

- [ ] `dist/ops-update.html` 可访问，标题为「DevTools 更新管理」
- [ ] `version.json` 字段完整且随发布更新
- [ ] `/api/status` 在 Agent 停掉时页面提示「Agent 未连接或未配置反代」
- [ ] 错误 Token 返回 401/403，正确 Token 可触发更新
- [ ] 更新过程写日志，`/api/update/log` 可读
- [ ] Token 未出现在仓库、镜像层或前端源码中
- [ ] Agent 仅本机监听，公网无法直连其端口

## 8. 故障排查

| 现象 | 排查 |
|------|------|
| 状态始终「未知」 | `curl -i http://127.0.0.1:3928/api/status`；检查 Nginx `proxy_pass` |
| 401/403 | Token 是否一致、是否经 Nginx 透传 `X-Update-Token` |
| 更新无效果 | 查看 Agent 日志与 `UPDATE_SCRIPT` 退出码；站点目录权限 |
| 页面旧内容 | `ops-update.html` / `index.html` / `version.json` 应 `no-cache` |
| sessionStorage 无 Token | 是否隐私模式或跨站；键名是否为 `devtools.updateToken` |

---

维护建议：将 Agent 与静态站发布流程写进运维 Runbook，定期轮换 `UPDATE_TOKEN`。
