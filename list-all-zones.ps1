$token = "J470GE8DaHtBQkOwJiXzKLMharJLWUJzUCZB2rgb5193e574"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
$baseUrl = "https://developers.hostinger.com/api/dns/v1"

Write-Host "Listing all DNS zones..." -ForegroundColor Cyan

try {
    $zones = Invoke-RestMethod -Uri "$baseUrl/zones" -Headers $headers -Method Get

    Write-Host "Available zones:" -ForegroundColor Green
    $zones | ConvertTo-Json -Depth 5

} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
