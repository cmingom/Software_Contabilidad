# Script para iniciar el proyecto de Software de Contabilidad
# Ejecutar desde el directorio raíz del proyecto

Write-Host "🚀 Iniciando Software de Contabilidad..." -ForegroundColor Green

# Verificar si estamos en el directorio correcto
if (-not (Test-Path "go.mod")) {
    Write-Host "✗ Error: No se encontró go.mod. Ejecuta este script desde el directorio raíz del proyecto." -ForegroundColor Red
    exit 1
}

# Agregar Go al PATH temporalmente si no está
$goPath = "C:\Program Files\Go\bin"
if (Test-Path $goPath) {
    $env:PATH += ";$goPath"
    Write-Host "✓ Go agregado al PATH temporal" -ForegroundColor Green
} else {
    Write-Host "✗ Go no encontrado. Por favor instala Go o ejecuta setup-path.ps1" -ForegroundColor Red
    exit 1
}

# Verificar que Docker esté corriendo
try {
    docker --version | Out-Null
    Write-Host "✓ Docker está disponible" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker no está disponible. Por favor inicia Docker Desktop" -ForegroundColor Red
    exit 1
}

# Iniciar base de datos
Write-Host "`n📊 Iniciando base de datos PostgreSQL..." -ForegroundColor Cyan
docker-compose -f docker-compose.db.yml up -d

# Esperar un momento para que la base de datos se inicie
Start-Sleep -Seconds 3

# Configurar extensiones de la base de datos
Write-Host "🔧 Configurando extensiones de la base de datos..." -ForegroundColor Cyan
Get-Content scripts/setup-db.sql | docker exec -i software-contabilidad-db psql -U postgres -d software_contabilidad

# Iniciar backend
Write-Host "`n🔧 Iniciando backend (Go)..." -ForegroundColor Cyan
Write-Host "Backend estará disponible en: http://localhost:8080" -ForegroundColor Yellow

# Iniciar backend en una nueva ventana
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; `$env:PATH += ';$goPath'; go run cmd/main.go"

# Esperar un momento para que el backend se inicie
Start-Sleep -Seconds 5

# Iniciar frontend
Write-Host "`n🎨 Iniciando frontend (React)..." -ForegroundColor Cyan
Write-Host "Frontend estará disponible en: http://localhost:3000" -ForegroundColor Yellow

# Iniciar frontend en una nueva ventana
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\web'; npm start"

Write-Host "`n✅ Proyecto iniciado exitosamente!" -ForegroundColor Green
Write-Host "`n📋 URLs disponibles:" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  Backend API: http://localhost:8080" -ForegroundColor White
Write-Host "`n💡 Para detener los servicios, cierra las ventanas de PowerShell o presiona Ctrl+C" -ForegroundColor Yellow
