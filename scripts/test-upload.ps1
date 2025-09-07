# Script para probar la subida de archivos Excel
param(
    [Parameter(Mandatory=$true)]
    [string]$FilePath
)

if (-not (Test-Path $FilePath)) {
    Write-Host "Error: El archivo no existe: $FilePath" -ForegroundColor Red
    exit 1
}

Write-Host "Probando subida de archivo: $FilePath" -ForegroundColor Green

# Verificar que el backend esté corriendo
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/entregas/envases" -Method GET
    Write-Host "Backend está corriendo" -ForegroundColor Green
} catch {
    Write-Host "Error: Backend no está corriendo en http://localhost:8080" -ForegroundColor Red
    exit 1
}

# Crear formulario multipart
$boundary = [System.Guid]::NewGuid().ToString()
$LF = "`r`n"

$bodyLines = (
    "--$boundary",
    "Content-Disposition: form-data; name=`"file`"; filename=`"$(Split-Path $FilePath -Leaf)`"",
    "Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "",
    [System.IO.File]::ReadAllText($FilePath),
    "--$boundary--",
    ""
) -join $LF

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/entregas/upload" -Method POST -Body $bodyLines -ContentType "multipart/form-data; boundary=$boundary"
    Write-Host "Archivo subido exitosamente!" -ForegroundColor Green
    Write-Host "Respuesta: $($response.Content)" -ForegroundColor White
} catch {
    Write-Host "Error subiendo archivo:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Respuesta del servidor: $responseBody" -ForegroundColor Red
    }
}
