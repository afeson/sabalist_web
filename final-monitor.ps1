$timestamp = Get-Date -Format "HH:mm:ss"
Write-Host "[$timestamp] Certificate is being issued by AWS..." -ForegroundColor Yellow
Write-Host "Checking status every 20 seconds..." -ForegroundColor Cyan
Write-Host ""

for ($i = 1; $i -le 60; $i++) {
    $ts = Get-Date -Format "HH:mm:ss"
    Write-Host "[$ts Check $i] " -NoNewline -ForegroundColor Cyan

    try {
        $r = aws amplify get-domain-association --app-id d2hef9d7y3mss4 --domain-name www.sabalist.com --region us-east-1 | ConvertFrom-Json
        $s = $r.domainAssociation.domainStatus

        if ($s -eq "AVAILABLE") {
            Write-Host $s -ForegroundColor Green
            Write-Host ""
            Write-Host "========================================" -ForegroundColor Green
            Write-Host "SUCCESS! DOMAIN IS LIVE!" -ForegroundColor Green
            Write-Host "========================================" -ForegroundColor Green
            Write-Host ""
            Write-Host "Your site: https://www.sabalist.com" -ForegroundColor Cyan
            Write-Host ""
            exit 0
        } elseif ($s -like "*FAIL*") {
            Write-Host $s -ForegroundColor Red
            Write-Host "Error: $($r.domainAssociation.statusReason)" -ForegroundColor Red
            exit 1
        } elseif ($s -eq "PENDING_VERIFICATION") {
            Write-Host "$s (Certificate validating...)" -ForegroundColor Yellow
        } elseif ($s -eq "PENDING_DEPLOYMENT") {
            Write-Host "$s (Deploying to CloudFront...)" -ForegroundColor Yellow
        } else {
            Write-Host $s -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Error checking status" -ForegroundColor Red
    }

    Start-Sleep -Seconds 20
}

Write-Host ""
Write-Host "Monitoring completed after 20 minutes" -ForegroundColor Yellow
