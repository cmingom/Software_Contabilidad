# Script para instalar Make en Windows
# Requiere Chocolatey o puede usar winget

Write-Host "Instalando Make en Windows..." -ForegroundColor Green

# Verificar si Chocolatey está instalado
if (Get-Command choco -ErrorAction SilentlyContinue) {
    Write-Host "Usando Chocolatey para instalar Make..." -ForegroundColor Yellow
    choco install make -y
} elseif (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Host "Usando winget para instalar Make..." -ForegroundColor Yellow
    winget install GnuWin32.Make
} else {
    Write-Host "Instalando Chocolatey primero..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    
    Write-Host "Instalando Make con Chocolatey..." -ForegroundColor Yellow
    choco install make -y
}

# Verificar instalación
if (Get-Command make -ErrorAction SilentlyContinue) {
    Write-Host "Make instalado correctamente!" -ForegroundColor Green
    make --version
} else {
    Write-Host "Error: Make no se pudo instalar. Intenta manualmente:" -ForegroundColor Red
    Write-Host "1. Instalar Chocolatey: https://chocolatey.org/install" -ForegroundColor Yellow
    Write-Host "2. Ejecutar: choco install make" -ForegroundColor Yellow
    Write-Host "3. O usar winget: winget install GnuWin32.Make" -ForegroundColor Yellow
}

