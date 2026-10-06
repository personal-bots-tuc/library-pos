#!/bin/sh
set -e

# Procesar nginx.conf template (puerto)
envsubst '\$PORT' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Generar config.js desde template con variables de entorno
envsubst '\$VITE_API_BASE_URL \$VITE_APP_NAME \$VITE_POS_BASE_URL' \
  < /usr/share/nginx/html/config.template.js \
  > /usr/share/nginx/html/config.js

# Debug: mostrar config generada
echo "=== Generated config.js ==="
cat /usr/share/nginx/html/config.js
echo "============================"

exec nginx -g "daemon off;"