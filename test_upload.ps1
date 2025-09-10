# Script para probar la subida de archivos Excel
Write-Host "Probando subida de archivo Excel..."

# Crear el archivo multipart
$boundary = [System.Guid]::NewGuid().ToString()
$filePath = "test_debug.xlsx"
$fileContent = [System.IO.File]::ReadAllBytes($filePath)
$fileContentBase64 = [System.Convert]::ToBase64String($fileContent)

$body = @"
--$boundary
Content-Disposition: form-data; name="file"; filename="test_debug.xlsx"
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet

$([System.Text.Encoding]::UTF8.GetString($fileContent))
--$boundary--
"@

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/entregas/upload" -Method POST -Body $body -ContentType "multipart/form-data; boundary=$boundary"
    Write-Host "Respuesta del servidor:"
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Respuesta: $($_.Exception.Response)"
}

# Verificar envases
Write-Host "`nVerificando envases..."
try {
    $envases = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/entregas/envases" -Method GET
    Write-Host "Envases encontrados:"
    $envases | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Error obteniendo envases: $($_.Exception.Message)"
}