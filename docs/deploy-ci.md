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

| 产出                                               | 用途              |
|--------------------------------------------------|-----------------|
| Actions Artifact `dev-tools-dist`                | 临时下载、调试         |
| Release `latest-dist` 资产 `dev-tools-dist.tar.gz` | 服务器 static 一键更新 |
| `ghcr.io/<owner>/dev-tools:main`                 | 服务器 docker 一键更新 |
| `ghcr.io/<owner>/dev-tools:sha-xxxxxxx`          | 按 commit 固定版本   |

首次需要在仓库 **Settings → Actions → General** 允许读写 packages；公开仓库的 GHCR 包可能还需在 Package 设置里设为 Public
才能匿名 pull。

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

## 服务器：Docker（子路径 `/dev-tools/` 推荐）

与 static **共用** `ops-update.html` + `update-agent`；只改 `DEPLOY_MODE=docker`。

### 架构

```
浏览器 → Nginx
          ├─ /dev-tools/api/  → 127.0.0.1:3930   （systemd: update-agent，宿主机）
          └─ /dev-tools/      → 127.0.0.1:8080/  （docker 容器内 nginx :80）
```

- **Agent 必须在宿主机**（systemd），更新时会 `docker pull` 并重建业务容器
- 业务容器只提供静态站；**不要**把 Agent 放进同一容器

### 1. 目录与依赖

```bash
sudo mkdir -p /opt/jar/dev-tools/scripts
# 拷贝：update-agent.js / update-docker.sh / docker-compose.yml（可选）/ .env
# 安装：Docker、Node（仅跑 Agent）、Nginx
```

### 2. `.env`（`/opt/jar/dev-tools/.env`）

```bash
DEPLOY_MODE=docker
UPDATE_TOKEN=你的长随机串
GITHUB_REPO=moon-stack-OAo/dev-tools
GITHUB_BRANCH=main
# 检查更新防 API 限流（建议）
GITHUB_TOKEN=ghp_xxx

DOCKER_IMAGE=ghcr.io/moon-stack-OAo/dev-tools
DOCKER_TAG=main
DOCKER_CONTAINER=dev-tools
DOCKER_HOST_PORT=8080

LISTEN_HOST=127.0.0.1
LISTEN_PORT=3930
# 本地版本从容器内读取（Agent 已支持 docker exec cat）
# DOCKER_VERSION_PATH=/usr/share/nginx/html/version.json
```

私有 GHCR 时额外：

```bash
GHCR_USER=你的GitHub用户名
GHCR_TOKEN=ghp_xxx   # 需 read:packages
```

### 3. 首次拉起容器

```bash
cd /opt/jar/dev-tools
set -a; source .env; set +a
# 公开包可匿名；私有需先 docker login ghcr.io
bash scripts/update-docker.sh
# 或
export IMAGE=ghcr.io/moon-stack-OAo/dev-tools:main
docker compose pull && docker compose up -d
curl -sI http://127.0.0.1:8080/ | head
```

### 4. systemd Agent

使用 `scripts/dev-tools-update.service`（路径按机器改成 Node 绝对路径），然后：

```bash
sudo systemctl enable --now dev-tools-update
curl -s http://127.0.0.1:3930/healthz   # ok
```

运行 Agent 的用户需能执行 `docker`（加入 `docker` 组，或暂时用 root）。

### 5. Nginx 子路径

示例见仓库根目录 **`nginx-dev-tools-docker.conf.example`**：

- `/dev-tools/api/` → Agent
- `/dev-tools/` → `http://127.0.0.1:8080/`（去掉前缀）

```bash
sudo nginx -t && sudo systemctl reload nginx
```

访问：

- 站点：`http://服务器/dev-tools/`
- 更新页：`http://服务器/dev-tools/ops-update.html`

### 6. 一键更新

管理页填 `UPDATE_TOKEN` →「立即更新」→ Agent 执行 `update-docker.sh`（pull + 重建容器）。

### 从 static 切换到 docker

1. `.env` 设 `DEPLOY_MODE=docker` 与镜像变量
2. 改 Nginx：静态 `alias dist` 改为反代 `8080`（见上例）
3. `systemctl restart dev-tools-update`
4. 先手动 `bash scripts/update-docker.sh` 确认容器正常

static 与 docker **二选一**做主站即可，Agent 只按当前 `DEPLOY_MODE` 跑一种脚本。

## 与 GitHub Pages 的关系

| Workflow         | 作用                              |
|------------------|---------------------------------|
| `static.yml`     | 部署到 **GitHub Pages**            |
| `ci-release.yml` | 给 **自建服务器** 提供 dist 包 + GHCR 镜像 |

可同时启用；Pages 与自建机互不影响。

## 状态对比原理

- 构建时写入 `version.json`（commit / fullSha / builtAt）
- Agent `GET /api/status` 默认对比：
  1. **本地**已部署 `version.json`（static 目录或 docker 容器内）
  2. **远程** CI Release `latest-dist` 资产里的 **`version.json`**（与一键更新下载的产物一致）
- 若 Release 中没有 `version.json`（旧发布），`REMOTE_COMPARE=auto` 会回退到 GitHub 分支最新 commit
- 可选环境变量：`REMOTE_COMPARE=release|commit|auto`、`DIST_RELEASE_TAG`、`DIST_VERSION_ASSET`
- 你点更新后，新 dist/镜像带上新 version.json，状态变为「已是最新」

## 安全

- `UPDATE_TOKEN` 只放服务器 `.env`，不要提交仓库
- Agent 只监听 `127.0.0.1`
- 管理页 `ops-update.html` 已 noindex，勿公开传播 URL
