# Production Deployment Guide - SpellCheck AI

Guía completa para desplegar SpellCheck AI en producción.

## 📋 Tabla de Contenidos

1. [Requisitos](#requisitos)
2. [Preparación del Servidor](#preparación-del-servidor)
3. [Instalación de Docker](#instalación-de-docker)
4. [Configuración de SSL/TLS](#configuración-de-ssltls)
5. [Despliegue](#despliegue)
6. [Monitoreo](#monitoreo)
7. [Backups](#backups)
8. [Troubleshooting](#troubleshooting)

## Requisitos

- VPS o servidor cloud (AWS, DigitalOcean, Linode, etc.)
- Sistema operativo: Ubuntu 20.04 LTS o superior
- Dominio configurado
- 2GB RAM mínimo
- 10GB almacenamiento mínimo
- API Key de Google Generative AI

## Preparación del Servidor

### 1. Actualizar el sistema

```bash
sudo apt update
sudo apt upgrade -y
```

### 2. Crear usuario no-root

```bash
sudo adduser deploy
sudo usermod -aG sudo deploy
su - deploy
```

### 3. Configurar SSH (Opcional pero recomendado)

```bash
# En tu máquina local
ssh-copy-id -i ~/.ssh/id_rsa.pub deploy@tu_servidor_ip

# En el servidor
mkdir -p ~/.ssh
chmod 700 ~/.ssh
```

## Instalación de Docker

### 1. Desinstalar Docker viejo (si existe)

```bash
sudo apt remove docker docker-engine docker.io containerd runc -y
```

### 2. Instalar Docker Engine

```bash
# Configurar repositorio
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"

# Instalar
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io -y

# Iniciar servicio
sudo systemctl start docker
sudo systemctl enable docker

# Verificar instalación
sudo docker run hello-world
```

### 3. Instalar Docker Compose

```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verificar
docker-compose --version
```

### 4. Configurar permisos Docker (Opcional)

```bash
# Permitir usar docker sin sudo
sudo usermod -aG docker deploy

# Aplicar cambios
newgrp docker
```

## Configuración de SSL/TLS

### 1. Instalar Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Generar certificado Let's Encrypt

```bash
sudo certbot certonly --standalone -d tudominio.com -d www.tudominio.com
```

### 3. Configurar renovación automática

```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Verificar
sudo systemctl status certbot.timer
```

## Despliegue

### 1. Clonar el repositorio

```bash
cd ~
git clone https://github.com/usuario/spellcheck-ai.git
cd spellcheck-ai
```

### 2. Configurar variables de entorno

```bash
cp backend/.env.example backend/.env
nano backend/.env

# Edita y configura:
# - GOOGLE_API_KEY
# - NODE_ENV=production
# - FRONTEND_URL=https://tudominio.com
# - ALLOWED_ORIGINS=https://tudominio.com
```

### 3. Actualizar docker-compose.yml

```bash
# Para producción, cambiar puertos en docker-compose.yml
# Cambiar "80:80" a "3000:80" si usarás Nginx como proxy inverso
```

### 4. Crear nginx-prod.conf

```nginx
upstream backend {
    server backend:5000;
}

server {
    listen 80;
    server_name tudominio.com www.tudominio.com;
    
    # Redirigir HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name tudominio.com www.tudominio.com;

    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tudominio.com/privkey.pem;

    # Configuración SSL segura
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Headers de seguridad
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 5. Construir y iniciar

```bash
# Construir imágenes
docker-compose build

# Iniciar en background
docker-compose up -d

# Ver logs
docker-compose logs -f

# Verificar salud
curl http://localhost:5000/api/health
```

## Monitoreo

### 1. Ver logs

```bash
# Todos los logs
docker-compose logs

# Solo backend
docker-compose logs backend

# Logs en tiempo real
docker-compose logs -f

# Últimas 100 líneas
docker-compose logs --tail=100
```

### 2. Ver estado de contenedores

```bash
docker-compose ps

# Más detalle
docker ps -a

# Uso de recursos
docker stats
```

### 3. Ver métricas

```bash
# CPU y memoria
docker-compose stats

# Inspeccionar contenedor
docker inspect spellcheck-backend
```

## Backups

### 1. Backup de datos

```bash
# Backup de directorio uploads
tar -czf backup-uploads-$(date +%Y%m%d).tar.gz backend/uploads

# Guardar en servicio cloud
# Ej. S3, Google Cloud Storage, etc.
```

### 2. Backup de configuración

```bash
# Backup de variables de entorno
cp backend/.env backend/.env.backup-$(date +%Y%m%d)

# Guardar en lugar seguro (NO en Git)
```

### 3. Restaurar desde backup

```bash
# Restaurar uploads
tar -xzf backup-uploads-20240427.tar.gz

# Restaurar .env
cp backend/.env.backup-20240427 backend/.env
```

## Troubleshooting

### Error: "Port already in use"

```bash
# Ver qué proceso usa el puerto
sudo lsof -i :80
sudo lsof -i :5000

# Liberar puerto (matar proceso)
sudo kill -9 <PID>
```

### Error: "Connection refused"

```bash
# Verificar que los contenedores estén activos
docker-compose ps

# Reiniciar
docker-compose restart

# Revisar logs
docker-compose logs
```

### Error: "GOOGLE_API_KEY not found"

```bash
# Verificar .env existe
ls -la backend/.env

# Verificar contenido
grep GOOGLE_API_KEY backend/.env

# Recrear si es necesario
cp backend/.env.example backend/.env
# Editar con tu API Key
```

### Error: "SSL certificate not found"

```bash
# Generar certificado nuevamente
sudo certbot certonly --standalone -d tudominio.com

# Renovar forzadamente
sudo certbot renew --force-renewal
```

### Memoria agotada

```bash
# Ver uso de memoria
free -h

# Ver contenedores que usan más memoria
docker stats --no-stream

# Limpiar imágenes sin usar
docker image prune -a

# Limpiar volúmenes sin usar
docker volume prune
```

## Mantenimiento Regular

### Diario
- [ ] Monitorear logs: `docker-compose logs`
- [ ] Verificar salud: `curl https://tudominio.com/api/health`

### Semanal
- [ ] Revisar uso de disco: `df -h`
- [ ] Revisar uso de memoria: `free -h`

### Mensual
- [ ] Actualizar sistema: `sudo apt update && sudo apt upgrade`
- [ ] Hacer backup de datos
- [ ] Revisar certificados SSL

### Trimestral
- [ ] Actualizar dependencias: `npm update`
- [ ] Auditar seguridad: `npm audit`
- [ ] Revisar logs de acceso

## Escalabilidad Futura

Para mayor carga, considera:

1. **Load Balancing**: Usar Nginx como proxy inverso
2. **Múltiples instancias**: Escalar horizontalmente
3. **Cache**: Implementar Redis para cacheo
4. **Base de datos**: Agregar MongoDB/PostgreSQL si es necesario
5. **CDN**: Usar Cloudflare para distribución de contenido

---

**Última actualización:** 2024
**Versión:** 1.0.0
