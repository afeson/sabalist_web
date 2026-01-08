$token = "J470GE8DaHtBQkOwJiXzKLMharJLWUJzUCZB2rgb5193e574"
$domain = "sabalist.com"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
$baseUrl = "https://developers.hostinger.com/api/dns/v1"

Write-Host "Fetching current DNS zone structure..." -ForegroundColor Yellow

try {
    $zone = Invoke-RestMethod -Uri "$baseUrl/zones/$domain" -Headers $headers -Method Get

    Write-Host "`nFull API Response:" -ForegroundColor Cyan
    $zone | ConvertTo-Json -Depth 10

    Write-Host "`n`nCurrent Records:" -ForegroundColor Cyan
    foreach ($rec in $zone.records) {
        Write-Host "  Type: $($rec.type), Name: $($rec.name), Content: $($rec.content), TTL: $($rec.ttl)" -ForegroundColor White
        if ($rec.id) {
            Write-Host "    ID: $($rec.id)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Red
    }
}
