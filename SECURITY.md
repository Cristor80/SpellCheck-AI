# 🔒 Guía de Seguridad - SpellCheck AI

Este documento describe las medidas de seguridad implementadas en SpellCheck AI para proteger tu aplicación y datos.

## 📋 Tabla de Contenidos

1. [Headers de Seguridad HTTP](#headers-de-seguridad-http)
2. [Rate Limiting](#rate-limiting)
3. [Validación de Entrada](#validación-de-entrada)
4. [Gestión de Archivos](#gestión-de-archivos)
5. [Variables de Entorno](#variables-de-entorno)
6. [CORS](#cors)
7. [Contenedores](#contenedores)
8. [Checklist de Seguridad](#checklist-de-seguridad)

## Headers de Seguridad HTTP

Se utilizan headers HTTP seguros mediante **Helmet.js**:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

**Protección contra:**
- HSTS: Ataques man-in-the-middle
- MIME sniffing: Ejecución no autorizada de scripts
- Clickjacking: Clics emboscados en iframes
- XSS: Inyección de scripts

## Rate Limiting

Se implementa rate limiting para evitar abuso:

```javascript
// Límites por defecto:
- Solicitudes generales: 100 requests/15 minutos
- Uploads: 20 uploads/15 minutos
- Respuesta: Error 429 "Too Many Requests"
```

**Ubicaciones protegidas:**
- `POST /api/spellcheck`
- `POST /api/upload`
- `POST /api/export-docx`
- `POST /api/export-txt`

## Validación de Entrada

Todas las entradas se validan antes de procesarse:

```javascript
// Validaciones:
- Tipo de dato (string, number, etc.)
- Longitud (máximo 10,000 caracteres)
- Formato de archivo (.txt, .docx, .pdf)
- Tamaño de archivo (máximo 5 MB)
- Caracteres válidos
```

## Gestión de Archivos

Los archivos subidos se protegen mediante:

```javascript
// Medidas:
- Sanitización de nombres (previene path traversal)
- Validación de extensión y MIME type
- Almacenamiento en directorio aislado
- Eliminación automática tras 5 segundos
- Permisos de archivo restrictivos (755)
```

**Ejemplo de sanitización:**
```javascript
// Antes: ../../../etc/passwd.txt
// Después: _____etc_passwd.txt
```

## Variables de Entorno

**NUNCA** incluyas en el código:
- API Keys
- Contraseñas
- Tokens
- URLs internas

**Usa .env:**
```bash
cp backend/.env.example backend/.env
# Edita backend/.env con tus valores
```

**Protege .env:**
```bash
# Asegúrate de que .env NO esté en Git
echo ".env" >> .gitignore
```

## CORS

Se implementa CORS restrictivo:

```javascript
// Solo se permiten:
- Desarrollo: localhost:3000, localhost:5000
- Producción: Tu dominio específico (configure en .env)

// Métodos permitidos: GET, POST, OPTIONS
// Headers permitidos: Content-Type
// Credenciales: Habilitadas solo si es necesario
```

**Configuración en producción:**
```env
# .env
FRONTEND_URL=https://tudominio.com
ALLOWED_ORIGINS=https://tudominio.com
```

## Contenedores

Se ejecutan sin permisos elevados:

```dockerfile
# Usuario no-root
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# Sin privilegios nuevos
security_opt:
  - no-new-privileges:true
```

## Sanitización XSS

Se previene XSS mediante:

```javascript
// - express-mongo-sanitize: Elimina $ y puntos
// - xss-clean: Limpia HTML peligroso
// - Validación de entrada en cliente
// - Content-Security-Policy headers
```

## Logging Seguro

Se registran eventos importantes sin revelar detalles sensibles:

```javascript
// ✅ Se registra:
- Solicitudes de API
- Errores generales

// ❌ NO se registra:
- API Keys
- Contraseñas
- Datos personales sensibles
```

## Checklist de Seguridad

- [ ] API Key de Google configurada en `.env`
- [ ] `.env` NO está en control de versiones (`.gitignore`)
- [ ] FRONTEND_URL configurada para producción
- [ ] ALLOWED_ORIGINS actualizado con tu dominio
- [ ] SSL/TLS habilitado en producción (https://)
- [ ] Nginx configurado con headers seguros
- [ ] Rate limiting ajustado según necesidad
- [ ] Logs monitoreados regularmente
- [ ] Actualizaciones de dependencias aplicadas
- [ ] Copias de seguridad de datos configuradas

## Actualizar Dependencias Seguramente

```bash
# Verificar vulnerabilidades
npm audit

# Actualizar a versiones parcheadas
npm audit fix

# Actualizar dependencias menores
npm update

# Actualizar a nuevas versiones mayores
npm upgrade package-name@latest
```

## Reportar Vulnerabilidades

Si encuentras una vulnerabilidad de seguridad:
1. **NO** la publiques públicamente
2. **NO** la incluyas en un issue de GitHub
3. Contacta directamente al desarrollador
4. Espera confirmación antes de divulgar

## Referencias

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express.js Security](https://expressjs.com/en/advanced/best-practice-security.html)
- [Docker Security](https://docs.docker.com/engine/security/)

---

**Última actualización:** 2024
**Versión:** 1.0.0
