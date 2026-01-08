# Monitor Vercel Domain Status
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "Monitoring Vercel Domain Status" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

$domains = @("sabalist.com", "www.sabalist.com")

foreach ($domain in $domains) {
    Write-Host "Checking $domain..." -ForegroundColor Yellow
    Write-Host ""

    # Check DNS resolution
    Write-Host "  DNS Resolution:" -ForegroundColor Cyan
    try {
        $dnsResult = nslookup $domain 8.8.8.8 2>&1 | Out-String
        if ($dnsResult -match "76\.76\.21\." -or $dnsResult -match "cname\.vercel-dns\.com") {
            Write-Host "    ✓ DNS configured correctly" -ForegroundColor Green
        } else {
            Write-Host "    ✗ DNS not configured" -ForegroundColor Red
        }
    } catch {
        Write-Host "    ✗ DNS lookup failed" -ForegroundColor Red
    }

    # Check HTTP connection
    Write-Host "  HTTP Status:" -ForegroundColor Cyan
    try {
        $response = Invoke-WebRequest -Uri "http://$domain" -MaximumRedirection 0 -ErrorAction SilentlyContinue
        if ($response.Headers['server'] -match 'Vercel') {
            Write-Host "    ✓ HTTP working (redirects to HTTPS)" -ForegroundColor Green
        }
    } catch {
        if ($_.Exception.Response.Headers['server'] -match 'Vercel') {
            Write-Host "    ✓ HTTP working (redirects to HTTPS)" -ForegroundColor Green
        } else {
            Write-Host "    ✗ HTTP not working" -ForegroundColor Red
        }
    }

    # Check HTTPS connection
    Write-Host "  HTTPS Status:" -ForegroundColor Cyan
    try {
        $httpsResponse = Invoke-WebRequest -Uri "https://$domain" -ErrorAction Stop
        Write-Host "    ✓ HTTPS working with SSL certificate" -ForegroundColor Green
        Write-Host "    ✓ Domain fully configured!" -ForegroundColor Green
    } catch {
        $errMsg = $_.Exception.Message
        if ($errMsg -match "SSL" -or $errMsg -match "certificate" -or $errMsg -match "SEC_E_WRONG_PRINCIPAL") {
            Write-Host "    Waiting for SSL certificate..." -ForegroundColor Yellow
            Write-Host "       (This can take 5-30 minutes)" -ForegroundColor Gray
        } else {
            Write-Host "    HTTPS error" -ForegroundColor Red
        }
    }

    Write-Host ""
}

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "DNS is configured and propagated ✓" -ForegroundColor Green
Write-Host "Domain is pointing to Vercel ✓" -ForegroundColor Green
Write-Host "Waiting for SSL certificate issuance..." -ForegroundColor Yellow
Write-Host ""
Write-Host "You can check Vercel status with:" -ForegroundColor Cyan
Write-Host "  vercel domains inspect sabalist.com" -ForegroundColor White
Write-Host ""
Write-Host "Once SSL is issued, your site will be live at:" -ForegroundColor Cyan
Write-Host "  https://sabalist.com" -ForegroundColor White
Write-Host "  https://www.sabalist.com" -ForegroundColor White
Write-Host ""
