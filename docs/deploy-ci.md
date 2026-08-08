# 使用 GitHub CI 构建 + 服务器只发布

适用于：**服务器上不 clone 业务源码、不装 Node**，只部署 `dist` 或 Docker 镜像。

## 流程

```
git push main
    ↓
GitHub Actions（ci-release.yml）
    ├─ npm test / lint / build
    ├─ 上传 Artifact
    ├─ 发布/更新 Release 标签 latest-dist（dev-tools-dist.tar.gz）
    └─ 推送镜像 ghcr.io/<owner>/dev-tools:main
    ↓
你打开 /ops-update.html → 检查更新 → 输入 Token → 立即更新
    ↓
Agent 执行：
  static → 下载 tar.gz → 解压到 Nginx 目录
  docker → docker pull && 重启容器
```

**不会**在 push 时自动改你的服务器；仍由你在管理页手动点更新。

## CI 产出

| 产出 | 用途 |
|------|------|
| Actions Artifact `dev-tools-dist` | 临时下载、调试 |
| Release `latest-dist` 资产 `dev-tools-dist.tar.gz` | 服务器 static 一键更新 |
| `ghcr.io/<owner>/dev-tools:main` | 服务器 docker 一键更新 |
| `ghcr.io/<owner>/dev-tools:sha-xxxxxxx` | 按 commit 固定版本 |

首次需要在仓库 **Settings → Actions → General** 允许读写 packages；公开仓库的 GHCR 包可能还需在 Package 设置里设为 Public 才能匿名 pull。

## 服务器：静态 dist

1. 安装 Nginx，root 指向例如 `/var/www/dev-tools`
2. 安装 Node 仅用于跑 **update-agent**（或用 nvm 装一个 Node，不必装项目依赖）
3. 配置环境（参考 `.env.deploy.example`）：

```bash
DEPLOY_MODE=static
SITE_ROOT=/var/www/dev-tools
GITHUB_REPO=moon-stack-OAo/dev-tools
UPDATE_TOKEN=你的长随机串
```

4. 放置脚本与 agent（可从 Release 解压，或只拷贝 `scripts/`）：

```bash
# 示例：只拉脚本
mkdir -p /opt/dev-tools
curl -fsSL -o /tmp/d.tgz \
  "https://github.com/moon-stack-OAo/dev-tools/releases/download/latest-dist/dev-tools-dist.tar.gz"
# agent 在源码 scripts/，可单独 scp 或从 git sparse 下载
```

更简单：服务器保留一个**极简目录**只含：

- `scripts/update-agent.js`
- `scripts/update-static.sh`
- `.env`

5. systemd 启动 agent，Nginx 反代 `/api/`（见 `nginx-update-api.conf.example`）
6. 打开 `https://域名/ops-update.html` 点更新

首次也可手动：

```bash
export SITE_ROOT=/var/www/dev-tools GITHUB_REPO=moon-stack-OAo/dev-tools
bash scripts/update-static.sh
```

## 服务器：Docker

1. 安装 Docker
2. `.env`：

```bash
DEPLOY_MODE=docker
DOCKER_IMAGE=ghcr.io/moon-stack-OAo/dev-tools
DOCKER_TAG=main
UPDATE_TOKEN=你的长随机串
```

3. 若镜像为 private，先 `docker login ghcr.io`
4. 手动试跑：

```bash
bash scripts/update-docker.sh
# 浏览器 http://服务器:8080
```

5. Agent + ops 页同上

也可用仓库根目录 `docker-compose.yml`：

```bash
export IMAGE=ghcr.io/moon-stack-OAo/dev-tools:main
docker compose pull && docker compose up -d
```

## 与 GitHub Pages 的关系

| Workflow | 作用 |
|----------|------|
| `static.yml` | 部署到 **GitHub Pages** |
| `ci-release.yml` | 给 **自建服务器** 提供 dist 包 + GHCR 镜像 |

可同时启用；Pages 与自建机互不影响。

## 状态对比原理

- 构建时写入 `version.json`（commit / fullSha）
- Agent `GET /api/status`：本地 fullSha vs GitHub `main` 最新 commit
- 你点更新后，新 dist/镜像带上新 version.json，状态变为「已是最新」

## 安全

- `UPDATE_TOKEN` 只放服务器 `.env`，不要提交仓库
- Agent 只监听 `127.0.0.1`
- 管理页 `ops-update.html` 已 noindex，勿公开传播 URL
