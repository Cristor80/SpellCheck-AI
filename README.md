# 📝 SpellCheck AI - Corrector Ortográfico Inteligente

Una aplicación web moderna y segura que utiliza inteligencia artificial de Google Generative AI para verificar y corregir errores ortográficos, mejorar la redacción y optimizar textos de forma inteligente.

## 🎯 Características

- ✅ **Corrección de ortografía** - Detecta y corrige errores automáticamente
- 📝 **Mejora de redacción** - Optimiza el texto manteniendo el significado original
- 📁 **Carga de documentos** - Soporta archivos .txt, .docx y .pdf
- 💾 **Descarga en múltiples formatos** - Exporta como .txt o .docx
- 🚀 **Respuesta instantánea** - Análisis rápido con IA avanzada
- 🎨 **Interfaz moderna** - Diseño limpio y responsivo
- 🔒 **Seguridad robusta** - Validaciones, sanitización y rate limiting
- 🐳 **Docker ready** - Despliega en cualquier servidor
- ⚡ **Fácil de usar** - Solo necesitas copiar y ejecutar
- 📢 **Anuncios integrados** - Monetización con banners durante el análisis

## 🛠️ Requisitos Previos

### Opción 1: Con Docker (Recomendado)
- **Docker** (v20.10+)
- **Docker Compose** (v1.29+)
- **API Key de Google Generative AI**

### Opción 2: Sin Docker (Desarrollo Local)
- **Node.js** (v14 o superior)
- **npm** (v6 o superior)
- **API Key de Google Generative AI**

## 🚀 Instalación y Configuración

### Paso 1: Obtener API Key de Google

1. Accede a [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Haz clic en "Create API Key"
3. Copia tu API Key

### Paso 2: Configurar Variables de Entorno

Copia el archivo de ejemplo:

```bash
cp backend/.env.example backend/.env
```

Edita `backend/.env` y añade tu API Key:

```env
GOOGLE_API_KEY=tu_api_key_aqui
```

### Opción A: Con Docker (Recomendado para Producción)

```bash
# Construir las imágenes
docker-compose build

# Iniciar los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f
```

La aplicación estará disponible en:
- **Frontend**: http://localhost
- **Backend API**: http://localhost:5000/api

### Opción B: Sin Docker (Desarrollo Local)

#### Backend

```bash
cd backend
npm install
npm run dev
```

#### Frontend

En otra terminal:

```bash
cd frontend
python3 -m http.server 3000
```

Luego abre `http://localhost:3000` en tu navegador.
2. Selecciona un archivo (.txt, .docx o .pdf)
3. Haz clic en "⬆️ Subir y Analizar"
4. Espera a que se procese
5. Descarga el archivo corregido

## 📦 Estructura del Proyecto

```
spellcheck-ai/
├── backend/
│   ├── node_modules/          # Dependencias instaladas
│   ├── uploads/               # Archivos temporales
│   ├── .env                   # Variables de entorno (NO COMPARTIR)
│   ├── .gitignore             # Archivos a ignorar
│   ├── package.json           # Dependencias del backend
│   ├── package-lock.json      # Versiones exactas de dependencias
│   └── server.js              # Servidor principal
├── frontend/
│   ├── index.html             # Interfaz HTML
│   ├── styles.css             # Estilos CSS
│   └── app.js                 # Lógica de interfaz
└── README.md                  # Este archivo
```

## 🔌 API Endpoints

### POST `/api/spellcheck`

Corrige y mejora un texto.

**Request:**
```json
{
  "text": "Tu texto aqui con errores ortograficos"
}
```

**Response:**
```json
{
  "original": "Tu texto aqui con errores ortograficos",
  "corrected": "Tu texto aquí con errores ortográficos",
  "timestamp": "2026-04-26T12:00:00.000Z"
}
```

### POST `/api/upload`

Procesa un archivo y lo corrige.

**Request:** Multipart form-data con archivo
- Soporta: `.txt`, `.docx`, `.pdf`
- Máximo: 5 MB

**Response:**
```json
{
  "message": "Archivo procesado exitosamente",
  "filename": "documento.docx",
  "original": "...",
  "corrected": "...",
  "originalCharCount": 1234,
  "correctedCharCount": 1250,
  "timestamp": "2026-04-26T12:00:00.000Z"
}
```

### POST `/api/export-docx`

Genera un archivo DOCX con el texto corregido.

**Request:**
```json
{
  "text": "Texto corregido",
  "filename": "documento_original.docx"
}
```

**Response:** Archivo binario .docx descargable

### POST `/api/export-txt`

Genera un archivo TXT con el texto corregido.

**Request:**
```json
{
  "text": "Texto corregido",
  "filename": "documento_original.txt"
}
```

**Response:** Archivo texto descargable

### GET `/api/health`

Verifica que el servidor esté funcionando.

**Response:**
```json
{
  "status": "OK",
  "message": "Servidor SpellCheck AI activo",
  "timestamp": "2026-04-26T12:00:00.000Z"
}
```

## 🛠️ Tecnologías Utilizadas

### Backend
- **Node.js** - Runtime de JavaScript del lado del servidor
- **Express.js** - Framework web ligero y rápido
- **Multer** - Middleware para carga de archivos
- **Mammoth.js** - Lectura de archivos Word (.docx)
- **pdf-parse** - Extracción de texto de PDF
- **docx** - Generación de documentos Word
- **Anthropic SDK** - Integración con Claude IA
- **CORS** - Control de acceso entre dominios
- **dotenv** - Gestión de variables de entorno

### Frontend
- **HTML5** - Estructura semántica
- **CSS3** - Estilos modernos con gradientes y animaciones
- **JavaScript Vanilla** - Lógica e interactividad
- **Fetch API** - Peticiones HTTP asincrónicas

## 🔒 Seguridad

- 🔐 Las API keys se almacenan en `.env` (nunca en el repositorio)
- 🛡️ CORS configurado para proteger la API
- ✅ Validación de tipos de archivo en servidor y cliente
- 📏 Límite de tamaño de archivo: 5 MB
- 🧹 Archivos temporales se limpian automáticamente
- 🚫 `.env` incluido en `.gitignore` para seguridad

## ⚠️ Troubleshooting

### Error: "No se pudo conectar con el servidor"
```bash
# Asegúrate de que el servidor esté corriendo
npm start
# Verifica que esté en http://localhost:5000
```

### Error: "OPENAI_API_KEY no configurada"
```bash
# Edita backend/.env y agrega tu API Key
OPENAI_API_KEY=sk-ant-YOUR_API_KEY_HERE
```

### Error: "Archivo demasiado grande"
- El límite está en 5 MB
- Comprime o divide archivos más grandes

### La IA tarda mucho en responder
- La primera llamada puede tardar más
- Conexiones lentas de internet afectan la velocidad
- Los modelos de IA tienen latencia inherente

## 📊 Casos de Uso

- 📚 Estudiantes corrigiendo trabajos académicos
- 📰 Redactores y periodistas optimizando artículos
- 📝 Profesionales mejorando propuestas y reportes
- 📧 Corrección rápida de emails importantes
- 🌐 Traducción y mejora de textos en español
- 📋 Auditoría de documentos administrativos

## 🚀 Optimizaciones Futuras

- [ ] Soporte para más idiomas
- [ ] Historial de correcciones
- [ ] Comparativa lado a lado mejorada
- [ ] Sugerencias alternativas
- [ ] Análisis de tono y estilo
- [ ] Integración con Google Drive
- [ ] Validación de referencias y citas

## 📄 Licencia

Este proyecto está bajo la Licencia ISC.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Para cambios importantes:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📧 Contacto

Para preguntas o sugerencias:
- 📧 Email: soporte@spellcheck-ai.com
- 🐛 Issues: Reporta problemas en GitHub

## 🙏 Agradecimientos

- Anthropic por Claude IA
- Comunidad de Node.js
- Inspiración en herramientas modernas de corrección

---

**Última actualización:** 26 de abril de 2026

¡Disfruta usando SpellCheck Pro AI! 🎉
