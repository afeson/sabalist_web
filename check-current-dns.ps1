$token = "J470GE8DaHtBQkOwJiXzKLMharJLWUJzUCZB2rgb5193e574"
$domain = "sabalist.com"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
$baseUrl = "https://developers.hostinger.com/api/dns/v1"

Write-Host "Fetching current DNS records for $domain..." -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/zones/$domain" -Headers $headers -Method Get

    Write-Host "Current DNS Zone:" -ForegroundColor Green
    Write-Host "=================" -ForegroundColor Green
    Write-Host ""

    foreach ($record in $response.zone) {
        Write-Host "Type: $($record.type)" -ForegroundColor Yellow
        Write-Host "Name: $($record.name)" -ForegroundColor Cyan
        Write-Host "TTL: $($record.ttl)" -ForegroundColor Gray
        if ($record.records) {
            foreach ($r in $record.records) {
                Write-Host "Content: $($r.content)" -ForegroundColor White
                Write-Host "Disabled: $($r.is_disabled)" -ForegroundColor Gray
            }
        }
        Write-Host "---" -ForegroundColor DarkGray
    }

    Write-Host ""
    Write-Host "Full JSON response:" -ForegroundColor Magenta
    $response | ConvertTo-Json -Depth 10

} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
