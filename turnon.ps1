# Script para levantar todo el sistema de Software Contabilidad
# Uso: .\turnon.ps1

Write-Host "🚀 Iniciando Software Contabilidad..." -ForegroundColor Green

# Verificar si Docker está ejecutándose
$dockerStatus = docker info 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker no está ejecutándose. Por favor inicia Docker Desktop." -ForegroundColor Red
    exit 1
}

# Agregar Go al PATH temporalmente
$env:PATH += ";C:\Program Files\Go\bin"

# 1. Levantar base de datos PostgreSQL
Write-Host "📊 Iniciando base de datos PostgreSQL..." -ForegroundColor Yellow
docker-compose -f docker-compose.db.yml up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al iniciar la base de datos." -ForegroundColor Red
    exit 1
}

# Esperar a que la base de datos esté lista
Write-Host "⏳ Esperando que la base de datos esté lista..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Verificar que la base de datos esté funcionando
$dbCheck = docker exec software-contabilidad-db pg_isready -U postgres 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ La base de datos no está respondiendo." -ForegroundColor Red
    exit 1
}

# 2. Iniciar backend Go
Write-Host "🔧 Iniciando backend Go..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; `$env:PATH += ';C:\Program Files\Go\bin'; go run cmd/main.go"

# Esperar a que el backend esté listo
Write-Host "⏳ Esperando que el backend esté listo..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Verificar que el backend esté funcionando
$backendCheck = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/precios-envases" -Method GET -TimeoutSec 10 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  El backend puede no estar completamente listo aún." -ForegroundColor Yellow
}

# 3. Iniciar frontend React
Write-Host "Iniciando frontend React..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\web'; npm start"

# Esperar a que el frontend esté listo
Write-Host "Esperando que el frontend esté listo..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Abrir la aplicación en el navegador
Write-Host "Abriendo aplicación en el navegador..." -ForegroundColor Yellow
Start-Process "http://localhost:3000"

Write-Host "Sistema iniciado correctamente!" -ForegroundColor Green
Write-Host "Base de datos: http://localhost:5432" -ForegroundColor Cyan
Write-Host "Backend API: http://localhost:8080" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para apagar el sistema, ejecuta: .\turnoff.ps1" -ForegroundColor Magenta
Write-Host "Para reiniciar todo, ejecuta: .\reboot.ps1" -ForegroundColor Magenta
