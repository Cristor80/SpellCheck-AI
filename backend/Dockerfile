# SpellCheck AI Backend - Dockerfile
# Imagen base de Node.js LTS
FROM node:18-alpine

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./

# Instalar dependencias en producción
RUN npm ci --only=production && npm cache clean --force

# Copiar código de aplicación
COPY . .

# Crear directorio de uploads con permisos seguros
RUN mkdir -p uploads && chmod 755 uploads

# Exponer puerto
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Usuario no-root por seguridad
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# Iniciar aplicación
CMD ["node", "server.js"]
