# Script de configuración inicial para Software de Contabilidad (PowerShell)

Write-Host "🚀 Configurando Software de Contabilidad..." -ForegroundColor Green

# Verificar dependencias
Write-Host "📋 Verificando dependencias..." -ForegroundColor Yellow

# Verificar Go
try {
    $goVersion = go version
    Write-Host "✅ Go encontrado: $goVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Go no está instalado. Por favor instala Go 1.21+" -ForegroundColor Red
    exit 1
}

# Verificar Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js encontrado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js no está instalado. Por favor instala Node.js 18+" -ForegroundColor Red
    exit 1
}

# Verificar PostgreSQL
try {
    $psqlVersion = psql --version
    Write-Host "✅ PostgreSQL encontrado: $psqlVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ PostgreSQL no está instalado. Por favor instala PostgreSQL 13+" -ForegroundColor Red
    exit 1
}

# Crear archivo .env si no existe
if (-not (Test-Path ".env")) {
    Write-Host "📝 Creando archivo .env..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ Archivo .env creado. Por favor revisa la configuración." -ForegroundColor Green
} else {
    Write-Host "✅ Archivo .env ya existe" -ForegroundColor Green
}

# Instalar dependencias de Go
Write-Host "📦 Instalando dependencias de Go..." -ForegroundColor Yellow
go mod download
go mod tidy

# Instalar dependencias de Node.js
Write-Host "📦 Instalando dependencias de Node.js..." -ForegroundColor Yellow
Set-Location "web"
npm install
Set-Location ".."

# Crear base de datos
Write-Host "🗄️ Configurando base de datos..." -ForegroundColor Yellow
$DB_NAME = "software_contabilidad"
$DB_USER = "postgres"

# Intentar crear la base de datos
try {
    createdb -h localhost -U $DB_USER $DB_NAME
    Write-Host "✅ Base de datos '$DB_NAME' creada" -ForegroundColor Green
} catch {
    Write-Host "ℹ️ Base de datos '$DB_NAME' ya existe o no se pudo crear" -ForegroundColor Blue
}

Write-Host ""
Write-Host "🎉 ¡Configuración completada!" -ForegroundColor Green
Write-Host ""
Write-Host "Para iniciar el proyecto:" -ForegroundColor Cyan
Write-Host "  make dev          # Modo desarrollo (backend + frontend)" -ForegroundColor White
Write-Host "  make run-backend  # Solo backend" -ForegroundColor White
Write-Host "  make run-frontend # Solo frontend" -ForegroundColor White
Write-Host ""
Write-Host "Para compilar para producción:" -ForegroundColor Cyan
Write-Host "  make build" -ForegroundColor White
Write-Host ""
Write-Host "Para usar Docker:" -ForegroundColor Cyan
Write-Host "  docker-compose up -d" -ForegroundColor White
Write-Host ""
Write-Host "¡Disfruta desarrollando! 🚀" -ForegroundColor Green
