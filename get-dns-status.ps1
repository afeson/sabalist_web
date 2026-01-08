$token = "J470GE8DaHtBQkOwJiXzKLMharJLWUJzUCZB2rgb5193e574"
$domain = "sabalist.com"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
$baseUrl = "https://developers.hostinger.com/api/dns/v1"

Write-Host "Fetching DNS zone for $domain..." -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/zones/$domain" -Headers $headers -Method Get

    Write-Host "Current DNS Records:" -ForegroundColor Green
    Write-Host ""

    foreach ($record in $response.zone) {
        Write-Host "Type: $($record.type)" -ForegroundColor Yellow
        Write-Host "  Name: $($record.name)" -ForegroundColor White
        Write-Host "  TTL: $($record.ttl)" -ForegroundColor White

        foreach ($rec in $record.records) {
            Write-Host "  Content: $($rec.content)" -ForegroundColor Cyan
            if ($rec.is_disabled) {
                Write-Host "  Status: DISABLED" -ForegroundColor Red
            } else {
                Write-Host "  Status: ACTIVE" -ForegroundColor Green
            }
        }
        Write-Host ""
    }

    Write-Host "JSON Output:" -ForegroundColor Magenta
    $response | ConvertTo-Json -Depth 10

} catch {
    Write-Host "Error fetching DNS records" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
