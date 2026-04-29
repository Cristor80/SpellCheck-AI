/**
 * SpellCheck Pro AI - Frontend
 * Interfaz de usuario para corrección de documentos
 */

// ==========================================
// CONFIGURACIÓN GLOBAL
// ==========================================
const API_BASE_URL = 'http://localhost:5000/api';

// Referencias del DOM
const DOM = {
    // Elementos de entrada
    inputText: document.getElementById('inputText'),
    checkBtn: document.getElementById('checkBtn'),
    
    // Elementos de carga de archivo
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('fileInput'),
    uploadBtn: document.getElementById('uploadBtn'),
    filePreview: document.getElementById('filePreview'),
    fileName: document.getElementById('fileName'),
    removeFileBtn: document.getElementById('removeFileBtn'),
    btnText: document.getElementById('btnText'),
    btnSpinner: document.getElementById('btnSpinner'),
    
    // Elementos de carga
    loading: document.getElementById('loading'),
    loadingAd: document.getElementById('loadingAd'),
    
    // Elementos de resultados
    resultsSection: document.getElementById('resultsSection'),
    fileInfo: document.getElementById('fileInfo'),
    charCountOriginal: document.getElementById('charCountOriginal'),
    charCountCorrected: document.getElementById('charCountCorrected'),
    originalText: document.getElementById('originalText'),
    correctedText: document.getElementById('correctedText')
};

// Estado global
let currentData = {
    original: '',
    corrected: '',
    filename: null
};

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    checkServerHealth();
});

// ==========================================
// EVENT LISTENERS
// ==========================================
function initializeEventListeners() {
    // Botón de verificación de texto directo
    DOM.checkBtn.addEventListener('click', handleCheckText);
    
    // Gestión de archivos - Drag & Drop
    DOM.dropzone.addEventListener('click', () => DOM.fileInput.click());
    DOM.dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        DOM.dropzone.classList.add('dragover');
    });
    DOM.dropzone.addEventListener('dragleave', () => {
        DOM.dropzone.classList.remove('dragover');
    });
    DOM.dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        DOM.dropzone.classList.remove('dragover');
        handleFileSelection(e.dataTransfer.files);
    });
    
    // Selección de archivo por clic
    DOM.fileInput.addEventListener('change', (e) => handleFileSelection(e.target.files));
    
    // Botones de archivo
    DOM.removeFileBtn.addEventListener('click', clearFileSelection);
    DOM.uploadBtn.addEventListener('click', handleFileUpload);
    
    // Limpieza de resultados cuando se edita el texto
    DOM.inputText.addEventListener('input', () => {
        DOM.resultsSection.classList.add('hidden');
    });
}

// ==========================================
// MANEJADORES DE TEXTO
// ==========================================
async function handleCheckText() {
    const text = DOM.inputText.value.trim();
    
    if (!text) {
        alert('Por favor ingresa texto para verificar');
        return;
    }
    
    if (text.length > 10000) {
        alert('El texto es demasiado largo (máximo 10,000 caracteres)');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/spellcheck`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        
        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }
        
        const data = await response.json();
        
        currentData = {
            original: data.original,
            corrected: data.corrected,
            filename: null
        };
        
        displayResults();
    } catch (error) {
        console.error('Error:', error);
        alert(`Error al procesar el texto: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

// ==========================================
// MANEJADORES DE ARCHIVO
// ==========================================
function handleFileSelection(files) {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const allowedTypes = ['.txt', '.docx', '.pdf'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!allowedTypes.includes(fileExt)) {
        alert('Formato no soportado. Usa: .txt, .docx o .pdf');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        alert('El archivo excede 5 MB');
        return;
    }
    
    DOM.fileInput.files = files;
    DOM.fileName.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    DOM.filePreview.classList.remove('hidden');
    DOM.dropzone.classList.add('hidden');
    DOM.uploadBtn.disabled = false;
}

function clearFileSelection() {
    DOM.fileInput.value = '';
    DOM.filePreview.classList.add('hidden');
    DOM.dropzone.classList.remove('hidden');
    DOM.uploadBtn.disabled = true;
}

async function handleFileUpload() {
    const file = DOM.fileInput.files[0];
    if (!file) return;
    
    showLoading(true);
    showAdDuringAnalysis(true);
    setUploadButtonState(true);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }
        
        const data = await response.json();
        
        currentData = {
            original: data.original,
            corrected: data.corrected,
            filename: data.filename
        };
        
        // Mostrar nombre del archivo en resultados
        if (currentData.filename) {
            DOM.fileInfo.textContent = `📄 Archivo: ${currentData.filename}`;
            DOM.fileInfo.classList.remove('hidden');
        }
        
        displayResults();
    } catch (error) {
        console.error('Error:', error);
        alert(`Error al procesar archivo: ${error.message}`);
    } finally {
        showLoading(false);
        showAdDuringAnalysis(false);
        setUploadButtonState(false);
    }
}

// ==========================================
// VISUALIZACIÓN DE RESULTADOS
// ==========================================
function displayResults() {
    const charCountOrig = currentData.original.length;
    const charCountCorr = currentData.corrected.length;
    
    // Actualizar estadísticas
    DOM.charCountOriginal.textContent = charCountOrig.toLocaleString();
    DOM.charCountCorrected.textContent = charCountCorr.toLocaleString();
    
    // Mostrar textos
    DOM.originalText.textContent = currentData.original;
    DOM.correctedText.textContent = currentData.corrected;
    
    // Mostrar sección de resultados
    DOM.resultsSection.classList.remove('hidden');
    
    // Scroll suave hacia resultados
    setTimeout(() => {
        DOM.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

// ==========================================
// DESCARGAS
// ==========================================
async function downloadTxt() {
    if (!currentData.corrected) {
        alert('No hay texto para descargar');
        return;
    }
    
    const filename = currentData.filename 
        ? currentData.filename.replace(/\.[^/.]+$/, '') + '_corregido.txt'
        : 'documento_corregido.txt';
    
    const blob = new Blob([currentData.corrected], { type: 'text/plain; charset=utf-8' });
    downloadFile(blob, filename);
}

async function downloadDocx() {
    if (!currentData.corrected) {
        alert('No hay texto para descargar');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/export-docx`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: currentData.corrected,
                filename: currentData.filename
            })
        });
        
        if (!response.ok) {
            throw new Error('Error al generar documento');
        }
        
        const blob = await response.blob();
        const filename = currentData.filename
            ? currentData.filename.replace(/\.[^/.]+$/, '') + '_corregido.docx'
            : 'documento_corregido.docx';
        
        downloadFile(blob, filename);
    } catch (error) {
        console.error('Error:', error);
        alert('Error al descargar documento: ' + error.message);
    }
}

function downloadFile(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

// ==========================================
// UTILIDADES
// ==========================================
function showLoading(show) {
    DOM.loading.classList.toggle('hidden', !show);
    if (show) {
        DOM.resultsSection.classList.add('hidden');
    }
}

function showAdDuringAnalysis(show) {
    DOM.loadingAd.classList.toggle('hidden', !show);
}

function setUploadButtonState(loading) {
    DOM.uploadBtn.disabled = loading;
    DOM.btnText.textContent = loading ? '⏳ Procesando...' : '⬆️ Subir y Analizar';
    DOM.btnSpinner.classList.toggle('hidden', !loading);
}

async function checkServerHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        console.log('✅ Servidor conectado:', data.message);
    } catch (error) {
        console.warn('⚠️ No se pudo conectar con el servidor');
        alert('⚠️ Error de conexión con el servidor. Asegúrate de que esté corriendo en http://localhost:5000');
    }
}