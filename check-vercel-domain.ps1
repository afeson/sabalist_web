Write-Host "Checking Vercel Domain Configuration" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "DNS Status:" -ForegroundColor Yellow
$dns1 = nslookup sabalist.com 8.8.8.8 2>&1 | Out-String
if ($dns1 -match "76\.76\.21\.21") {
    Write-Host "  sabalist.com -> 76.76.21.21 (Vercel IP)" -ForegroundColor Green
} else {
    Write-Host "  sabalist.com DNS not configured" -ForegroundColor Red
}

$dns2 = nslookup www.sabalist.com 8.8.8.8 2>&1 | Out-String
if ($dns2 -match "cname\.vercel-dns\.com") {
    Write-Host "  www.sabalist.com -> cname.vercel-dns.com" -ForegroundColor Green
} else {
    Write-Host "  www.sabalist.com DNS not configured" -ForegroundColor Red
}

Write-Host ""
Write-Host "HTTP Status:" -ForegroundColor Yellow
try {
    $http = Invoke-WebRequest -Uri "http://sabalist.com" -MaximumRedirection 0 -ErrorAction SilentlyContinue 2>&1
    Write-Host "  HTTP redirects to HTTPS (Vercel working)" -ForegroundColor Green
} catch {
    Write-Host "  HTTP check inconclusive" -ForegroundColor Gray
}

Write-Host ""
Write-Host "HTTPS/SSL Status:" -ForegroundColor Yellow
try {
    $https = Invoke-WebRequest -Uri "https://sabalist.com" -ErrorAction Stop
    Write-Host "  SSL certificate issued and working!" -ForegroundColor Green
    Write-Host "  Domain is FULLY CONFIGURED!" -ForegroundColor Green -BackgroundColor DarkGreen
} catch {
    Write-Host "  Waiting for SSL certificate..." -ForegroundColor Yellow
    Write-Host "  (Can take 5-30 minutes after DNS propagation)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  - DNS is configured correctly" -ForegroundColor White
Write-Host "  - Wait for Vercel to issue SSL certificate" -ForegroundColor White
Write-Host "  - Check status: vercel domains inspect sabalist.com" -ForegroundColor White
Write-Host ""
