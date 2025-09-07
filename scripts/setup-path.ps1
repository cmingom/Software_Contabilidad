# Script para configurar PATH permanente en Windows
# Ejecutar como Administrador

Write-Host "Configurando PATH permanente para Go y PostgreSQL..." -ForegroundColor Green

# Verificar si Go está instalado
$goPath = "C:\Program Files\Go\bin"
if (Test-Path $goPath) {
    Write-Host "Go encontrado en: $goPath" -ForegroundColor Green
    
    # Agregar Go al PATH del usuario
    $userPath = [Environment]::GetEnvironmentVariable("PATH", "User")
    if ($userPath -notlike "*$goPath*") {
        [Environment]::SetEnvironmentVariable("PATH", "$userPath;$goPath", "User")
        Write-Host "Go agregado al PATH del usuario" -ForegroundColor Green
    } else {
        Write-Host "Go ya esta en el PATH del usuario" -ForegroundColor Yellow
    }
} else {
    Write-Host "Go no encontrado en $goPath" -ForegroundColor Red
    Write-Host "Por favor instala Go desde: https://golang.org/dl/" -ForegroundColor Red
}

# Buscar PostgreSQL en ubicaciones comunes
$postgresPaths = @(
    "C:\Program Files\PostgreSQL\16\bin",
    "C:\Program Files\PostgreSQL\15\bin",
    "C:\Program Files\PostgreSQL\14\bin",
    "C:\Program Files\PostgreSQL\13\bin",
    "C:\Program Files (x86)\PostgreSQL\16\bin",
    "C:\Program Files (x86)\PostgreSQL\15\bin",
    "C:\Program Files (x86)\PostgreSQL\14\bin",
    "C:\Program Files (x86)\PostgreSQL\13\bin"
)

$postgresFound = $false
foreach ($path in $postgresPaths) {
    if (Test-Path $path) {
        Write-Host "PostgreSQL encontrado en: $path" -ForegroundColor Green
        
        # Agregar PostgreSQL al PATH del usuario
        $userPath = [Environment]::GetEnvironmentVariable("PATH", "User")
        if ($userPath -notlike "*$path*") {
            [Environment]::SetEnvironmentVariable("PATH", "$userPath;$path", "User")
            Write-Host "PostgreSQL agregado al PATH del usuario" -ForegroundColor Green
        } else {
            Write-Host "PostgreSQL ya esta en el PATH del usuario" -ForegroundColor Yellow
        }
        $postgresFound = $true
        break
    }
}

if (-not $postgresFound) {
    Write-Host "PostgreSQL no encontrado en las ubicaciones comunes" -ForegroundColor Red
    Write-Host "Por favor instala PostgreSQL desde: https://www.postgresql.org/download/windows/" -ForegroundColor Red
}

Write-Host "`nConfiguración completada!" -ForegroundColor Green
Write-Host "Reinicia PowerShell o abre una nueva ventana para que los cambios surtan efecto." -ForegroundColor Yellow
Write-Host "`nPara verificar, ejecuta:" -ForegroundColor Cyan
Write-Host "  go version" -ForegroundColor White
Write-Host "  psql --version" -ForegroundColor White
