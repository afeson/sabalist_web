Write-Host "Monitoring www.sabalist.com verification..." -ForegroundColor Cyan
Write-Host ""

for ($i = 1; $i -le 30; $i++) {
    $timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "[$timestamp Check $i/30] " -NoNewline -ForegroundColor Cyan

    $result = aws amplify get-domain-association --app-id d2hef9d7y3mss4 --domain-name www.sabalist.com --region us-east-1 | ConvertFrom-Json
    $status = $result.domainAssociation.domainStatus
    $verified = $result.domainAssociation.subDomains[0].verified

    if ($status -eq "AVAILABLE") {
        Write-Host $status -ForegroundColor Green
        Write-Host ""
        Write-Host "==========================================" -ForegroundColor Green
        Write-Host "SUCCESS! DOMAIN IS LIVE!" -ForegroundColor Green
        Write-Host "==========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Your site is now available at:" -ForegroundColor White
        Write-Host "  https://www.sabalist.com" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "  1. Add www.sabalist.com to Firebase authorized domains"
        Write-Host "  2. Set up redirect from sabalist.com to www.sabalist.com in Hostinger"
        Write-Host ""
        exit 0
    } elseif ($status -like "*FAIL*") {
        Write-Host $status -ForegroundColor Red
        Write-Host "Reason: $($result.domainAssociation.statusReason)" -ForegroundColor Red
        Write-Host ""
        exit 1
    } else {
        Write-Host "$status (Verified: $verified)" -ForegroundColor Yellow
    }

    if ($i -lt 30) {
        Start-Sleep -Seconds 20
    }
}

Write-Host ""
Write-Host "Still pending after 10 minutes. Continue waiting or check AWS Console." -ForegroundColor Yellow
