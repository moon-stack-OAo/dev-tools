#!/usr/bin/env bash
# 从 GHCR 拉取镜像并重启容器（服务器无需 clone / npm build）
set -euo pipefail

GITHUB_REPO=${GITHUB_REPO:-moon-stack-OAo/dev-tools}
# 镜像：ghcr.io/owner/repo:tag
IMAGE_REPO=${DOCKER_IMAGE:-ghcr.io/${GITHUB_REPO}}
IMAGE_TAG=${DOCKER_TAG:-main}
IMAGE="${IMAGE_REPO}:${IMAGE_TAG}"
CONTAINER_NAME=${DOCKER_CONTAINER:-dev-tools}
HOST_PORT=${DOCKER_HOST_PORT:-8080}

echo "[update-docker] pull $IMAGE"

# 公开包可 anonymous pull；私有包需 docker login ghcr.io
if [ -n "${GITHUB_TOKEN:-}" ] && [ -n "${GITHUB_ACTOR:-}" ]; then
  echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin
elif [ -n "${GHCR_TOKEN:-}" ] && [ -n "${GHCR_USER:-}" ]; then
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
fi

docker pull "$IMAGE"

if [ -f "${REPO_DIR:-.}/docker-compose.yml" ]; then
  echo "[update-docker] compose up"
  export IMAGE
  export IMAGE_TAG
  (cd "${REPO_DIR:-.}" && docker compose pull && docker compose up -d)
else
  echo "[update-docker] recreate container $CONTAINER_NAME"
  docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
  docker run -d \
    --name "$CONTAINER_NAME" \
    -p "${HOST_PORT}:80" \
    --restart unless-stopped \
    "$IMAGE"
fi

echo "[update-docker] OK running $IMAGE"
docker ps --filter "name=$CONTAINER_NAME" --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
