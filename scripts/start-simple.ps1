# Script simple para iniciar el proyecto
Write-Host "Iniciando Software de Contabilidad..." -ForegroundColor Green

# Agregar Go al PATH temporalmente
$env:PATH += ";C:\Program Files\Go\bin"

# Verificar Go
try {
    go version | Out-Null
    Write-Host "Go disponible" -ForegroundColor Green
} catch {
    Write-Host "Go no disponible" -ForegroundColor Red
    exit 1
}

# Verificar Docker
try {
    docker --version | Out-Null
    Write-Host "Docker disponible" -ForegroundColor Green
} catch {
    Write-Host "Docker no disponible" -ForegroundColor Red
    exit 1
}

# Iniciar base de datos
Write-Host "Iniciando base de datos..." -ForegroundColor Cyan
docker-compose -f docker-compose.db.yml up -d

# Esperar
Start-Sleep -Seconds 3

# Configurar base de datos
Write-Host "Configurando base de datos..." -ForegroundColor Cyan
Get-Content scripts/setup-db.sql | docker exec -i software-contabilidad-db psql -U postgres -d software_contabilidad

# Iniciar backend
Write-Host "Iniciando backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; `$env:PATH += ';C:\Program Files\Go\bin'; go run cmd/main.go"

# Esperar
Start-Sleep -Seconds 5

# Iniciar frontend
Write-Host "Iniciando frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\web'; npm start"

Write-Host "Proyecto iniciado!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "Backend: http://localhost:8080" -ForegroundColor White
