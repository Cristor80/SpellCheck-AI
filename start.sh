#!/bin/bash
# Quick Start Script para SpellCheck AI

set -e

echo "╔════════════════════════════════════════════════╗"
echo "║  SpellCheck AI - Setup Rápido                 ║"
echo "╚════════════════════════════════════════════════╝"

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado. Descárgalo de https://docker.com"
    exit 1
fi

# Verificar Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose no está instalado"
    exit 1
fi

echo "✅ Docker y Docker Compose están instalados"

# Verificar .env
if [ ! -f backend/.env ]; then
    echo "📝 Creando archivo .env..."
    cp backend/.env.example backend/.env
    echo "⚠️  Edita backend/.env y agrega tu GOOGLE_API_KEY"
    echo "📖 Obtén tu API Key en: https://makersuite.google.com/app/apikey"
    echo ""
    read -p "Presiona Enter cuando hayas configurado tu API Key..."
fi

# Validar API Key
if grep -q "tu_google_api_key_aqui" backend/.env; then
    echo "❌ Error: GOOGLE_API_KEY no está configurada en backend/.env"
    exit 1
fi

echo "🏗️  Construyendo imágenes Docker..."
docker-compose build

echo "🚀 Iniciando servicios..."
docker-compose up -d

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║  ✅ SpellCheck AI está en línea               ║"
echo "╠════════════════════════════════════════════════╣"
echo "║  🌐 Frontend: http://localhost                ║"
echo "║  🔌 Backend:  http://localhost:5000/api       ║"
echo "║  🏥 Health:   http://localhost:5000/api/health║"
echo "╠════════════════════════════════════════════════╣"
echo "║  Ver logs:    docker-compose logs -f          ║"
echo "║  Detener:     docker-compose down             ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
