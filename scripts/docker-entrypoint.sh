#!/bin/sh
set -e

# 后台启动同源 CORS 代理（仅监听 loopback，由 nginx 反代）
export CORS_PROXY_HOST=127.0.0.1
export CORS_PROXY_PORT=3927
node /app/scripts/cors-proxy-server.js &
PROXY_PID=$!

# 等待代理就绪（用 node 探测，避免依赖 wget）
i=0
while [ $i -lt 50 ]; do
  if node -e "require('http').get('http://127.0.0.1:3927/healthz',function(r){process.exit(r.statusCode===200?0:1)}).on('error',function(){process.exit(1)})" 2>/dev/null; then
    break
  fi
  i=$((i + 1))
  sleep 0.1
done

# nginx 前台运行；退出时带走代理
trap 'kill $PROXY_PID 2>/dev/null || true' EXIT INT TERM
exec nginx -g "daemon off;"
