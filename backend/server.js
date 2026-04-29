/**
 * SpellCheck AI Backend
 * Servidor Node.js + Express para procesar documentos y corregir ortografía con IA
 */

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const { Document, Packer, Paragraph, TextRun } = require('docx');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

// ==========================================
// CONFIGURACIÓN INICIAL
// ==========================================
dotenv.config();

// Validar variables de entorno requeridas
if (!process.env.GOOGLE_API_KEY) {
  console.error('ERROR: GOOGLE_API_KEY no está configurada en .env');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '5242880'); // 5MB default
const MAX_TEXT_LENGTH = parseInt(process.env.MAX_TEXT_LENGTH || '10000');
const UPLOAD_DIR = path.join(__dirname, process.env.UPLOAD_DIR || 'uploads');

// Inicializar cliente de Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const AI_MODEL = process.env.GOOGLE_MODEL || 'gemini-2.0-flash';

// ==========================================
// MIDDLEWARE DE SEGURIDAD
// ==========================================

// Helmet: establece headers HTTP seguros
app.use(helmet());

// CORS: permitir solo dominios autorizados
app.use(cors({
  origin: NODE_ENV === 'production' 
    ? FRONTEND_URL.split(',').map(url => url.trim())
    : ['http://localhost:3000', 'http://localhost:5000', 'http://127.0.0.1:3000', 'http://127.0.0.1:5000'],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

// Rate limiting: evitar abuso
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite de 100 requests por ventana
  message: 'Demasiadas solicitudes, intenta de nuevo más tarde',
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // menos para uploads
  message: 'Demasiados uploads, intenta de nuevo más tarde'
});

app.use(limiter);

// Body parser con límites seguros
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Sanitización de datos
app.use(mongoSanitize()); // Previene NoSQL injection
app.use(xss()); // Previene XSS

// Servir archivos estáticos solo si existen
const frontendPath = path.join(__dirname, '../frontend');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
}

// ==========================================
// CONFIGURAR MULTER PARA CARGA DE ARCHIVOS
// ==========================================

// Crear directorio de uploads si no existe
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Función para sanitizar nombre de archivo
function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Reemplazar caracteres especiales
    .replace(/\.\./g, '') // Prevenir path traversal
    .substring(0, 100); // Limitar longitud
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const safeName = sanitizeFilename(file.originalname);
    cb(null, uniqueSuffix + '_' + safeName);
  }
});

// Validación de archivo
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const allowedExtensions = ['.txt', '.pdf', '.docx'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (!allowedExtensions.includes(ext) || !allowedMimes.includes(file.mimetype)) {
    cb(new Error(`Formato no permitido: ${ext}. Permitidos: ${allowedExtensions.join(', ')}`));
  } else {
    cb(null, true);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { 
    fileSize: MAX_FILE_SIZE,
    files: 1
  }
});

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

/**
 * Extraer texto de archivos DOCX
 */
async function extractTextFromDocx(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || '';
  } catch (error) {
    console.error('Error extrayendo DOCX:', error);
    throw new Error('Error al procesar archivo DOCX');
  }
}

/**
 * Extraer texto de archivos PDF
 */
async function extractTextFromPdf(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text || '';
  } catch (error) {
    console.error('Error extrayendo PDF:', error);
    throw new Error('Error al procesar archivo PDF');
  }
}

/**
 * Extraer texto del archivo según su tipo
 */
async function readFileText(filePath, mimetype, originalName) {
  if (mimetype === 'text/plain' || originalName.endsWith('.txt')) {
    return fs.promises.readFile(filePath, 'utf8');
  }

  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    originalName.endsWith('.docx')
  ) {
    return extractTextFromDocx(filePath);
  }

  if (mimetype === 'application/pdf' || originalName.endsWith('.pdf')) {
    return extractTextFromPdf(filePath);
  }

  throw new Error('Formato de archivo no soportado. Use .txt, .docx o .pdf');
}

/**
 * Llamar a Google Generative AI para corregir y mejorar el texto
 */
async function correctTextWithAI(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Texto inválido para procesar');
  }

  const textLength = text.trim().length;
  if (textLength === 0 || textLength > MAX_TEXT_LENGTH) {
    throw new Error(`El texto debe tener entre 1 y ${MAX_TEXT_LENGTH} caracteres`);
  }

  try {
    const prompt = `Corrige la ortografía y mejora la redacción del siguiente texto sin cambiar su significado original. Mantén el tono y el contexto.

Texto original:
"${text}"

Responde SOLO con el texto corregido, sin explicaciones adicionales.`;

    const model = genAI.getGenerativeModel({ model: AI_MODEL });
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ]
    });

    if (!result.response) {
      throw new Error('No se recibió respuesta de la IA');
    }

    const corrected = typeof result.response.text === 'function'
      ? result.response.text()
      : result.response.text;

    return (corrected || text).trim();
  } catch (error) {
    console.error('Error en Google Generative AI:', error.message);
    
    // No revelar detalles internos al cliente
    if (error.message.includes('API_KEY') || error.message.includes('authentication')) {
      throw new Error('Error de configuración del servicio');
    }
    
    throw new Error('Error al procesar el texto con IA');
  }
}

/**
 * Generar documento DOCX con el texto corregido
 */
async function generateDocxBuffer(text) {
  try {
    // Dividir el texto en párrafos
    const paragraphs = text.split('\n').map(line => {
      if (!line.trim()) {
        return new Paragraph({ text: '' });
      }
      return new Paragraph({
        children: [
          new TextRun({
            text: line,
            font: 'Calibri',
            size: 22 // 11pt
          })
        ]
      });
    });

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margins: {
                top: 720, // 0.5 pulgadas
                right: 720,
                bottom: 720,
                left: 720
              }
            }
          },
          children: paragraphs
        }
      ]
    });

    return await Packer.toBuffer(doc);
  } catch (error) {
    console.error('Error generando DOCX:', error);
    throw new Error('Error al generar documento Word');
  }
}

/**
 * Limpiar archivos temporales
 */
function deleteFileAfterDelay(filePath, delay = 5000) {
  setTimeout(() => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.warn(`No se pudo eliminar archivo temporal: ${filePath}`);
    }
  }, delay);
}

// ==========================================
// RUTAS / ENDPOINTS
// ==========================================

/**
 * GET /
 * Servir página principal
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

/**
 * GET /api/health
 * Verificar que el servidor esté funcionando
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Servidor SpellCheck AI activo',
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/spellcheck
 * Recibe texto y lo corrige con IA
 */
app.post('/api/spellcheck', limiter, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'El texto es requerido y debe ser válido'
      });
    }

    const trimmedText = text.trim();
    
    if (trimmedText.length === 0) {
      return res.status(400).json({
        error: 'El texto no puede estar vacío'
      });
    }

    if (trimmedText.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({
        error: `El texto es demasiado largo (máximo ${MAX_TEXT_LENGTH} caracteres). Actual: ${trimmedText.length}`
      });
    }

    console.log(`[${new Date().toISOString()}] Procesando texto (${trimmedText.length} caracteres)`);
    const correctedText = await correctTextWithAI(trimmedText);

    res.json({
      original: trimmedText,
      corrected: correctedText,
      originalLength: trimmedText.length,
      correctedLength: correctedText.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error en /api/spellcheck:`, error.message);
    res.status(500).json({
      error: error.message || 'Error al procesar el texto'
    });
  }
});

/**
 * POST /api/upload
 * Recibe un archivo, extrae el texto y lo corrige
 */
app.post('/api/upload', uploadLimiter, upload.single('file'), async (req, res) => {
  const filePath = req.file?.path;
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió archivo' });
    }

    const allowedExtensions = ['.txt', '.docx', '.pdf'];
    const fileExt = path.extname(req.file.originalname).toLowerCase();

    if (!allowedExtensions.includes(fileExt)) {
      deleteFileAfterDelay(filePath);
      return res.status(400).json({
        error: `Formato no soportado. Soportados: ${allowedExtensions.join(', ')}`
      });
    }

    // Validar tamaño del archivo
    if (req.file.size > MAX_FILE_SIZE) {
      deleteFileAfterDelay(filePath);
      return res.status(400).json({
        error: `Archivo demasiado grande. Máximo: ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`
      });
    }

    console.log(`[${new Date().toISOString()}] Procesando archivo: ${req.file.originalname} (${req.file.size} bytes)`);

    // Extraer texto del archivo
    let extractedText;
    try {
      extractedText = await readFileText(
        filePath,
        req.file.mimetype,
        req.file.originalname
      );
    } catch (error) {
      deleteFileAfterDelay(filePath);
      return res.status(400).json({
        error: `Error al leer archivo: ${error.message}`
      });
    }

    if (!extractedText || extractedText.trim().length === 0) {
      deleteFileAfterDelay(filePath);
      return res.status(400).json({
        error: 'El archivo no contiene texto válido'
      });
    }

    if (extractedText.length > MAX_TEXT_LENGTH) {
      deleteFileAfterDelay(filePath);
      return res.status(400).json({
        error: `El texto extraído es demasiado largo (máximo ${MAX_TEXT_LENGTH} caracteres)`
      });
    }

    // Corregir con IA
    console.log(`[${new Date().toISOString()}] Corrigiendo texto con IA...`);
    let correctedText;
    try {
      correctedText = await correctTextWithAI(extractedText);
    } catch (error) {
      deleteFileAfterDelay(filePath);
      return res.status(500).json({
        error: error.message || 'Error al procesar el texto con IA'
      });
    }

    // Preparar respuesta
    const response = {
      message: 'Archivo procesado exitosamente',
      filename: req.file.originalname,
      original: extractedText,
      corrected: correctedText,
      originalCharCount: extractedText.length,
      correctedCharCount: correctedText.length,
      timestamp: new Date().toISOString()
    };

    res.json(response);

    // Limpiar archivo temporal
    deleteFileAfterDelay(filePath, 5000);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error en /api/upload:`, error.message);
    
    if (filePath) {
      deleteFileAfterDelay(filePath);
    }
    
    // No revelar detalles internos
    const errorMessage = error.message.includes('Formato')
      ? error.message
      : 'Error al procesar el archivo. Verifica que sea un archivo válido (.txt, .docx, .pdf)';
    
    res.status(error.status || 500).json({
      error: errorMessage
    });
  }
});

    // Corregir con IA
    console.log('Corrigiendo texto con IA...');
    const correctedText = await correctTextWithAI(extractedText);

    // Preparar respuesta
    const response = {
      message: 'Archivo procesado exitosamente',
      filename: req.file.originalname,
      original: extractedText,
      corrected: correctedText,
      originalCharCount: extractedText.length,
      correctedCharCount: correctedText.length,
      timestamp: new Date().toISOString()
    };

    res.json(response);

    // Limpiar archivo temporal después de 5 segundos
    deleteFileAfterDelay(req.file.path);
  } catch (error) {
    console.error('Error en /api/upload:', error);
    if (req.file) {
      deleteFileAfterDelay(req.file.path);
    }
    res.status(500).json({
      error: 'Error al procesar archivo: ' + error.message
    });
  }
});

/**
 * POST /api/export-docx
 * Recibe texto corregido y lo retorna como archivo DOCX descargable
 */
app.post('/api/export-docx', limiter, async (req, res) => {
  try {
    const { text, filename } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        error: 'Texto válido requerido para exportar'
      });
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({
        error: `Texto demasiado largo para exportar (máximo ${MAX_TEXT_LENGTH} caracteres)`
      });
    }

    console.log(`[${new Date().toISOString()}] Generando documento DOCX...`);
    
    const buffer = await generateDocxBuffer(text);

    // Sanitizar nombre de archivo
    let finalFilename = 'documento_corregido.docx';
    if (filename && typeof filename === 'string') {
      finalFilename = sanitizeFilename(filename.replace(/\.[^/.]+$/, '')) + '_corregido.docx';
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${finalFilename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error en /api/export-docx:`, error.message);
    res.status(500).json({
      error: 'Error al generar documento'
    });
  }
});

/**
 * POST /api/export-txt
 * Recibe texto y lo retorna como archivo TXT descargable
 */
app.post('/api/export-txt', limiter, (req, res) => {
  try {
    const { text, filename } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        error: 'Texto válido requerido para exportar'
      });
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({
        error: `Texto demasiado largo para exportar (máximo ${MAX_TEXT_LENGTH} caracteres)`
      });
    }

    // Sanitizar nombre de archivo
    let finalFilename = 'documento_corregido.txt';
    if (filename && typeof filename === 'string') {
      finalFilename = sanitizeFilename(filename.replace(/\.[^/.]+$/, '')) + '_corregido.txt';
    }

    const buffer = Buffer.from(text, 'utf-8');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${finalFilename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error en /api/export-txt:`, error.message);
    res.status(500).json({
      error: 'Error al exportar archivo'
    });
  }
});

// ==========================================
// MANEJO DE ERRORES 404
// ==========================================
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.path,
    method: req.method
  });
});

// ==========================================
// MANEJO DE ERRORES GLOBAL
// ==========================================
app.use((error, req, res, next) => {
  console.error('Error global:', error);
  res.status(error.status || 500).json({
    error: error.message || 'Error interno del servidor'
  });
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   SpellCheck AI Backend                ║
║   Servidor ejecutándose en:            ║
║   http://localhost:${PORT}              ║
╚════════════════════════════════════════╝
  `);
});

// Manejo de proceso no capturado
process.on('unhandledRejection', (reason, promise) => {
  console.error('Promesa rechazada no manejada:', reason);
});
