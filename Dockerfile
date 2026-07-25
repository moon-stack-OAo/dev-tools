# ===== 构建阶段 =====
FROM node:20-alpine AS builder

WORKDIR /app

# 安装依赖（先复制 lock 文件以利用缓存 + 保证可复现构建）
COPY package.json package-lock.json ./
# postinstall 钩子会执行 copy-libs.js 将第三方库打包到 public/lib
RUN npm ci

# 复制源码并构建
COPY . .
RUN npm run build

# ===== 运行阶段：nginx 静态托管 + Node CORS 代理 =====
FROM node:20-alpine

# nginx 反代 /__cors_proxy → 本机 Node 代理，解决生产环境浏览器跨域
RUN apk add --no-cache nginx \
    && mkdir -p /run/nginx /usr/share/nginx/html \
    && rm -f /etc/nginx/http.d/default.conf /etc/nginx/conf.d/default.conf 2>/dev/null || true

WORKDIR /app

# 构建产物
COPY --from=builder /app/dist /usr/share/nginx/html
# CORS 代理脚本
COPY scripts/cors-proxy-server.js /app/scripts/cors-proxy-server.js
COPY scripts/docker-entrypoint.sh /app/scripts/docker-entrypoint.sh
RUN chmod +x /app/scripts/docker-entrypoint.sh

# nginx 站点配置（含 /__cors_proxy 反代）
COPY nginx.conf /etc/nginx/http.d/default.conf

EXPOSE 80

ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
