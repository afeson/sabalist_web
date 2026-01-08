Write-Host "Monitoring SSL Certificate Issuance for sabalist.com" -ForegroundColor Cyan
Write-Host "This will check every 60 seconds for up to 30 minutes" -ForegroundColor Yellow
Write-Host ""

$maxAttempts = 30  # 30 minutes (30 checks at 60 seconds each)
$attempt = 0

while ($attempt -lt $maxAttempts) {
    $attempt++
    $elapsed = $attempt * 1  # minutes

    Write-Host "[$elapsed min] Checking certificate status..." -ForegroundColor Gray

    # Check via Vercel CLI
    $certs = npx vercel certs ls --json 2>$null | ConvertFrom-Json

    $sabalistCert = $certs | Where-Object { $_.cns -contains "sabalist.com" }

    if ($sabalistCert) {
        Write-Host ""
        Write-Host "✅ SSL CERTIFICATE ISSUED!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Certificate Details:" -ForegroundColor Cyan
        Write-Host "  ID: $($sabalistCert.id)" -ForegroundColor White
        Write-Host "  Domain: sabalist.com" -ForegroundColor White
        Write-Host "  Expires: $($sabalistCert.expiration)" -ForegroundColor White
        Write-Host ""
        Write-Host "✅ You can now access:" -ForegroundColor Green
        Write-Host "  https://sabalist.com" -ForegroundColor Cyan
        Write-Host "  https://www.sabalist.com" -ForegroundColor Cyan
        Write-Host ""

        # Test HTTPS access
        Write-Host "Testing HTTPS access..." -ForegroundColor Yellow
        try {
            $response = Invoke-WebRequest -Uri "https://sabalist.com" -Method Head -TimeoutSec 10 -UseBasicParsing
            Write-Host "✅ HTTPS works! Status: $($response.StatusCode)" -ForegroundColor Green
        } catch {
            Write-Host "⚠️ HTTPS test failed (may need a few more minutes): $($_.Exception.Message)" -ForegroundColor Yellow
        }

        break
    }

    if ($attempt -lt $maxAttempts) {
        Write-Host "  Not issued yet... waiting 60 seconds" -ForegroundColor DarkGray
        Start-Sleep -Seconds 60
    }
}

if ($attempt -ge $maxAttempts) {
    Write-Host ""
    Write-Host "⏰ Timeout reached (30 minutes)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "The certificate may still be issuing. Check manually:" -ForegroundColor Yellow
    Write-Host "  npx vercel certs ls" -ForegroundColor White
    Write-Host ""
    Write-Host "Or visit Vercel dashboard:" -ForegroundColor Yellow
    Write-Host "  https://vercel.com/afesons-projects/afrilist-mvp/settings/domains" -ForegroundColor Cyan
}
