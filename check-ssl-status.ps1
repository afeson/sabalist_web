Write-Host "Checking SSL Certificate Status for sabalist.com" -ForegroundColor Cyan
Write-Host ""

# Check Vercel certificates
Write-Host "Vercel Certificates:" -ForegroundColor Yellow
npx vercel certs ls

Write-Host ""
Write-Host "DNS Resolution:" -ForegroundColor Yellow
nslookup sabalist.com 8.8.8.8

Write-Host ""
Write-Host "Testing HTTPS Access:" -ForegroundColor Yellow

# Test sabalist.com
Write-Host "  Testing https://sabalist.com..." -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri "https://sabalist.com" -Method Head -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    Write-Host "  ✅ sabalist.com: HTTPS works! Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ sabalist.com: $($_.Exception.Message)" -ForegroundColor Red
}

# Test www.sabalist.com
Write-Host "  Testing https://www.sabalist.com..." -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri "https://www.sabalist.com" -Method Head -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    Write-Host "  ✅ www.sabalist.com: HTTPS works! Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ www.sabalist.com: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Current DNS Records (Hostinger):" -ForegroundColor Yellow
$token = "J470GE8DaHtBQkOwJiXzKLMharJLWUJzUCZB2rgb5193e574"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
$zone = Invoke-RestMethod -Uri "https://developers.hostinger.com/api/dns/v1/zones/sabalist.com" -Headers $headers -Method Get

foreach ($record in $zone.zone) {
    Write-Host "  $($record.type) $($record.name) -> $($record.records[0].content)" -ForegroundColor White
}
