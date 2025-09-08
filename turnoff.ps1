# Script para apagar completamente el sistema de Software Contabilidad
# Uso: .\turnoff.ps1

Write-Host "Apagando Software Contabilidad..." -ForegroundColor Red

# 1. Detener procesos de Go
Write-Host "Deteniendo backend Go..." -ForegroundColor Yellow
Get-Process -Name "main" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "go" -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. Detener procesos de Node.js
Write-Host "Deteniendo frontend React..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

# 3. Detener contenedores Docker
Write-Host "Deteniendo contenedores Docker..." -ForegroundColor Yellow
docker-compose -f docker-compose.db.yml down

# 4. Verificar que todo esté detenido
Write-Host "Verificando que todo esté detenido..." -ForegroundColor Yellow

# Verificar puertos
$port8080 = netstat -an | findstr ":8080"
$port3000 = netstat -an | findstr ":3000"
$port5432 = netstat -an | findstr ":5432"

if ($port8080) {
    Write-Host "Puerto 8080 aún está en uso" -ForegroundColor Yellow
} else {
    Write-Host "Puerto 8080 liberado" -ForegroundColor Green
}

if ($port3000) {
    Write-Host "Puerto 3000 aún está en uso" -ForegroundColor Yellow
} else {
    Write-Host "Puerto 3000 liberado" -ForegroundColor Green
}

if ($port5432) {
    Write-Host "Puerto 5432 aún está en uso" -ForegroundColor Yellow
} else {
    Write-Host "Puerto 5432 liberado" -ForegroundColor Green
}

# 5. Verificar procesos restantes
$goProcesses = Get-Process -Name "go" -ErrorAction SilentlyContinue
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
$mainProcesses = Get-Process -Name "main" -ErrorAction SilentlyContinue

if ($goProcesses) {
    Write-Host "Aún hay procesos de Go ejecutándose" -ForegroundColor Yellow
    $goProcesses | ForEach-Object { Write-Host "   - PID: $($_.Id) - $($_.ProcessName)" -ForegroundColor Gray }
} else {
    Write-Host "No hay procesos de Go ejecutándose" -ForegroundColor Green
}

if ($nodeProcesses) {
    Write-Host "Aún hay procesos de Node.js ejecutándose" -ForegroundColor Yellow
    $nodeProcesses | ForEach-Object { Write-Host "   - PID: $($_.Id) - $($_.ProcessName)" -ForegroundColor Gray }
} else {
    Write-Host "No hay procesos de Node.js ejecutándose" -ForegroundColor Green
}

if ($mainProcesses) {
    Write-Host "Aún hay procesos main ejecutándose" -ForegroundColor Yellow
    $mainProcesses | ForEach-Object { Write-Host "   - PID: $($_.Id) - $($_.ProcessName)" -ForegroundColor Gray }
} else {
    Write-Host "No hay procesos main ejecutándose" -ForegroundColor Green
}

Write-Host ""
Write-Host "Sistema apagado completamente!" -ForegroundColor Green
Write-Host ""
Write-Host "Para levantar el sistema, ejecuta: .\turnon.ps1" -ForegroundColor Magenta
Write-Host "Para reiniciar todo, ejecuta: .\reboot.ps1" -ForegroundColor Magenta
