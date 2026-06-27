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

# ===== 运行阶段 =====
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
