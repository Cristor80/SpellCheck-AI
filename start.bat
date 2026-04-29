@echo off
REM SpellCheck AI - Quick Start Script para Windows

echo.
echo ================================================
echo   SpellCheck AI - Setup Rapido
echo ================================================
echo.

REM Verificar Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo Error: Docker no esta instalado
    echo Descargalo de https://docker.com
    pause
    exit /b 1
)

REM Verificar Docker Compose
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo Error: Docker Compose no esta instalado
    pause
    exit /b 1
)

echo + Docker esta instalado
echo.

REM Verificar .env
if not exist backend\.env (
    echo Creando archivo .env...
    copy backend\.env.example backend\.env
    echo.
    echo Advertencia: Edita backend\.env y agrega tu GOOGLE_API_KEY
    echo Obtén tu API Key en: https://makersuite.google.com/app/apikey
    echo.
    pause
)

echo Construyendo imagenes Docker...
docker-compose build

echo.
echo Iniciando servicios...
docker-compose up -d

echo.
echo ================================================
echo   + SpellCheck AI esta en linea
echo ================================================
echo.
echo Frontend: http://localhost
echo Backend:  http://localhost:5000/api
echo.
echo Ver logs:  docker-compose logs -f
echo Detener:   docker-compose down
echo.
pause
