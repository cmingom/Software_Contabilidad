# Script para probar subida multipart correcta
Write-Host "Probando subida multipart..."

# Crear el contenido multipart manualmente
$boundary = [System.Guid]::NewGuid().ToString()
$filePath = "test_debug.xlsx"
$fileBytes = [System.IO.File]::ReadAllBytes($filePath)
$fileContent = [System.Text.Encoding]::GetEncoding("ISO-8859-1").GetString($fileBytes)

$body = @"
--$boundary
Content-Disposition: form-data; name="file"; filename="test_debug.xlsx"
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet

$fileContent
--$boundary--
"@

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/entregas/upload" -Method POST -Body $body -ContentType "multipart/form-data; boundary=$boundary"
    Write-Host "Respuesta exitosa:"
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody"
    }
}
