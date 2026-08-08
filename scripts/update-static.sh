#!/usr/bin/env bash
# 从 GitHub Release（CI 发布的 latest-dist）下载 dist，解压到 SITE_ROOT
# 服务器无需 Node / 无需业务源码 clone
set -euo pipefail

SITE_ROOT=${SITE_ROOT:-/var/www/dev-tools}
GITHUB_REPO=${GITHUB_REPO:-moon-stack-OAo/dev-tools}
# 默认使用 CI 滚动标签 latest-dist 上的资产
DIST_TAG=${DIST_RELEASE_TAG:-latest-dist}
ASSET_NAME=${DIST_ASSET_NAME:-dev-tools-dist.tar.gz}
# 可选：完整 URL 覆盖（自定义对象存储等）
DIST_URL=${DIST_DOWNLOAD_URL:-}

if [ -z "$DIST_URL" ]; then
  DIST_URL="https://github.com/${GITHUB_REPO}/releases/download/${DIST_TAG}/${ASSET_NAME}"
fi

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo "[update-static] download: $DIST_URL"
# 公开 Release 无需 token；若仓库改私有可设 GITHUB_TOKEN
CURL_AUTH=()
if [ -n "${GITHUB_TOKEN:-}" ]; then
  CURL_AUTH=(-H "Authorization: Bearer ${GITHUB_TOKEN}")
fi

# GitHub Release 大文件经 CDN 时 HTTP/2 偶发 stream 中断（curl exit 18）
# 强制 HTTP/1.1 + 重试 + 断点续传，避免一直卡在 download
curl_download() {
  local url=$1
  local out=$2
  curl -fL --http1.1 \
    --retry 5 \
    --retry-delay 2 \
    --retry-all-errors \
    --connect-timeout 30 \
    --max-time 600 \
    -C - \
    "${CURL_AUTH[@]}" \
    -o "$out" \
    "$url"
}

curl_download "$DIST_URL" "$TMP/dist.tar.gz"

# 可选校验 sha256（同目录 .sha256 资产）
SHA_URL="${DIST_URL}.sha256"
if curl -fL --http1.1 --retry 3 --connect-timeout 15 --max-time 60 \
  "${CURL_AUTH[@]}" -o "$TMP/dist.tar.gz.sha256" "$SHA_URL" 2>/dev/null; then
  echo "[update-static] verify sha256"
  (cd "$TMP" && sha256sum -c dist.tar.gz.sha256)
else
  echo "[update-static] skip sha256 (asset missing)"
fi

STAGE="$TMP/extract"
mkdir -p "$STAGE"
tar -xzf "$TMP/dist.tar.gz" -C "$STAGE"

if [ ! -f "$STAGE/index.html" ]; then
  echo "[update-static] ERROR: archive missing index.html" >&2
  exit 1
fi

mkdir -p "$SITE_ROOT"
# 原子替换：先同步到临时目录再 rsync
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete "$STAGE"/ "$SITE_ROOT"/
else
  # 无 rsync 时降级
  find "$SITE_ROOT" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  cp -a "$STAGE"/. "$SITE_ROOT"/
fi

echo "[update-static] OK deployed to $SITE_ROOT"
if [ -f "$SITE_ROOT/version.json" ]; then
  echo "[update-static] version.json:"
  cat "$SITE_ROOT/version.json"
fi
