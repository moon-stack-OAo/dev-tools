#!/usr/bin/env bash
set -euo pipefail
REPO_DIR=${REPO_DIR:-/opt/dev-tools/repo}
BRANCH=${GITHUB_BRANCH:-main}
cd "$REPO_DIR"
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"
if [ -f docker-compose.yml ]; then
  docker compose build
  docker compose up -d
else
  docker build -t dev-tools:latest .
  docker rm -f dev-tools 2>/dev/null || true
  docker run -d --name dev-tools -p 8080:80 --restart unless-stopped dev-tools:latest
fi
echo "OK docker deploy"
