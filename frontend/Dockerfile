# SpellCheck AI Frontend - Dockerfile
# Stage 1: Build simple static files
FROM node:18-alpine as builder

WORKDIR /app

# Copiar archivos del frontend
COPY . .

# Validar que los archivos existan
RUN test -f index.html || (echo "Error: index.html no encontrado" && exit 1)
RUN test -f app.js || (echo "Error: app.js no encontrado" && exit 1)
RUN test -f styles.css || (echo "Error: styles.css no encontrado" && exit 1)

# Stage 2: Servir con un servidor web ligero
FROM nginx:alpine

# Copiar configuración nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Copiar archivos del frontend
COPY --from=builder /app /usr/share/nginx/html

# Crear usuarios no-root
RUN addgroup -g 101 -S nginx && adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx || true

# Permisos seguros
RUN chmod -R 755 /usr/share/nginx/html
RUN chown -R nginx:nginx /usr/share/nginx/html

# Exponer puerto
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

# Iniciar nginx
CMD ["nginx", "-g", "daemon off;"]
