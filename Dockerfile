# ============================================
# Stage 1: Builder
# ============================================
FROM node:22-alpine AS builder
WORKDIR /app

# Build dependencies
RUN apk add --no-cache python3 make g++

# Cache deps layer
COPY package*.json ./
RUN npm ci --prefer-offline --no-audit --no-fund

# Source + build
COPY . .
RUN npm run build

# ============================================
# Stage 2: Runtime (nginx + envsubst)
# ============================================
FROM nginx:alpine AS runtime

WORKDIR /usr/share/nginx/html

# Instalar gettext para envsubst
RUN apk add --no-cache gettext

# Copiar build output
COPY --from=builder /app/dist ./

# Copiar nginx config template + entrypoint + templates
COPY nginx.conf.template /etc/nginx/conf.d/default.conf.template
COPY entrypoint.sh /entrypoint.sh
COPY public/config.template.js ./config.template.js
COPY public/health.json ./health.json

# Non-root user (nginx user already exists in nginx:alpine base image)
# Crear directorio /run/nginx con permisos correctos para el usuario nginx
RUN mkdir -p /run/nginx && chown -R nginx:nginx /run/nginx && \
    chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/conf.d && \
    chmod +x /entrypoint.sh

USER nginx

EXPOSE 5173

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
