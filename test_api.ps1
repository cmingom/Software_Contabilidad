# Script para probar la API de carga de archivos
$filePath = "test_envases.xlsx"
$uri = "http://localhost:8080/api/v1/entregas/upload"

# Crear el formulario multipart
$boundary = [System.Guid]::NewGuid().ToString()
$LF = "`r`n"

$bodyLines = (
    "--$boundary",
    "Content-Disposition: form-data; name=`"file`"; filename=`"$filePath`"",
    "Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "",
    [System.IO.File]::ReadAllText($filePath),
    "--$boundary--",
    ""
) -join $LF

try {
    $response = Invoke-WebRequest -Uri $uri -Method POST -Body $bodyLines -ContentType "multipart/form-data; boundary=$boundary"
    Write-Host "Status: $($response.StatusCode)"
    Write-Host "Response: $($response.Content)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Response: $($_.Exception.Response)"
}
