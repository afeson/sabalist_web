Write-Host "DNS is propagated. Continuing to monitor..." -ForegroundColor Green
Write-Host ""

for ($i = 1; $i -le 40; $i++) {
    $ts = Get-Date -Format "HH:mm:ss"
    Write-Host "[$ts Check $i/40] " -NoNewline -ForegroundColor Cyan

    $r = aws amplify get-domain-association --app-id d2hef9d7y3mss4 --domain-name www.sabalist.com --region us-east-1 | ConvertFrom-Json
    $s = $r.domainAssociation.domainStatus

    if ($s -eq "AVAILABLE") {
        Write-Host $s -ForegroundColor Green
        Write-Host ""
        Write-Host "==========================================" -ForegroundColor Green
        Write-Host "SUCCESS! DOMAIN IS LIVE!" -ForegroundColor Green
        Write-Host "==========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "https://www.sabalist.com" -ForegroundColor Cyan
        Write-Host ""
        exit 0
    } elseif ($s -like "*FAIL*") {
        Write-Host $s -ForegroundColor Red
        Write-Host "Error: $($r.domainAssociation.statusReason)" -ForegroundColor Red
        exit 1
    } else {
        Write-Host $s -ForegroundColor Yellow
    }

    Start-Sleep -Seconds 30
}

Write-Host ""
Write-Host "Still awaiting verification. Check manually:" -ForegroundColor Yellow
Write-Host "aws amplify get-domain-association --app-id d2hef9d7y3mss4 --domain-name www.sabalist.com --region us-east-1" -ForegroundColor Gray
