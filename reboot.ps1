# Script para reiniciar completamente el sistema de Software Contabilidad
# Uso: .\reboot.ps1

Write-Host "🔄 Reiniciando Software Contabilidad..." -ForegroundColor Green

# Verificar si Docker está ejecutándose
$dockerStatus = docker info 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker no está ejecutándose. Por favor inicia Docker Desktop." -ForegroundColor Red
    exit 1
}

# Agregar Go al PATH temporalmente
$env:PATH += ";C:\Program Files\Go\bin"

# 1. Detener todos los procesos
Write-Host "🛑 Deteniendo todos los procesos..." -ForegroundColor Yellow

# Detener procesos de Go
Get-Process -Name "main" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "go" -ErrorAction SilentlyContinue | Stop-Process -Force

# Detener procesos de Node.js
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

# Detener contenedores Docker
Write-Host "🐳 Deteniendo contenedores Docker..." -ForegroundColor Yellow
docker-compose -f docker-compose.db.yml down -v

# 2. Limpiar base de datos completamente
Write-Host "🗑️  Limpiando base de datos..." -ForegroundColor Yellow
docker-compose -f docker-compose.db.yml up -d

# Esperar a que la base de datos esté lista
Start-Sleep -Seconds 10

# Eliminar todas las tablas y recrear la base de datos
Write-Host "Recreando esquema de base de datos..." -ForegroundColor Yellow
docker exec -i software-contabilidad-db psql -U postgres -c "DROP DATABASE IF EXISTS software_contabilidad;"
docker exec -i software-contabilidad-db psql -U postgres -c "CREATE DATABASE software_contabilidad;"
Get-Content scripts/setup-db.sql | docker exec -i software-contabilidad-db psql -U postgres -d software_contabilidad

# 3. Iniciar backend Go (esto creará las tablas automáticamente)
Write-Host "Iniciando backend Go..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; `$env:PATH += ';C:\Program Files\Go\bin'; go run cmd/main.go"

# Esperar a que el backend esté listo
Write-Host "Esperando que el backend esté listo..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# Verificar que el backend esté funcionando
$backendCheck = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/precios-envases" -Method GET -TimeoutSec 10 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "El backend puede no estar completamente listo aún." -ForegroundColor Yellow
}

# 4. Iniciar frontend React
Write-Host "Iniciando frontend React..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\web'; npm start"

# Esperar a que el frontend esté listo
Write-Host "Esperando que el frontend esté listo..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Abrir la aplicación en el navegador
Write-Host "Abriendo aplicación en el navegador..." -ForegroundColor Yellow
Start-Process "http://localhost:3000"

Write-Host "Sistema reiniciado completamente!" -ForegroundColor Green
Write-Host "Base de datos: Limpia y recreada" -ForegroundColor Cyan
Write-Host "Backend API: http://localhost:8080" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para apagar el sistema, ejecuta: .\turnoff.ps1" -ForegroundColor Magenta
Write-Host "Para solo levantar, ejecuta: .\turnon.ps1" -ForegroundColor Magenta
