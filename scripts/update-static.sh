#!/usr/bin/env bash
set -euo pipefail
REPO_DIR=${REPO_DIR:-/opt/dev-tools/repo}
SITE_ROOT=${SITE_ROOT:-/var/www/dev-tools}
BRANCH=${GITHUB_BRANCH:-main}
cd "$REPO_DIR"
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"
npm ci
npm run build
mkdir -p "$SITE_ROOT"
rsync -a --delete dist/ "$SITE_ROOT/"
echo "OK static deploy to $SITE_ROOT"
