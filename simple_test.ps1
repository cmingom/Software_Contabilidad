# Script simple para probar la subida
Write-Host "Probando subida simple..."

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/entregas/upload" -Method POST -InFile "test_debug.xlsx" -ContentType "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    Write-Host "Status: $($response.StatusCode)"
    Write-Host "Response: $($response.Content)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody"
    }
}
