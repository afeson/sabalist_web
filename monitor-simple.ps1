for ($i = 1; $i -le 20; $i++) {
    Write-Host "[Check $i/20] " -NoNewline -ForegroundColor Cyan
    $result = aws amplify get-domain-association --app-id d2hef9d7y3mss4 --domain-name sabalist.com --region us-east-1 | ConvertFrom-Json
    $status = $result.domainAssociation.domainStatus

    if ($status -eq "AVAILABLE") {
        Write-Host $status -ForegroundColor Green
        Write-Host ""
        Write-Host "SUCCESS! Domain is live at https://www.sabalist.com" -ForegroundColor Green
        exit 0
    } elseif ($status -like "*FAIL*") {
        Write-Host $status -ForegroundColor Red
        Write-Host "Reason: $($result.domainAssociation.statusReason)" -ForegroundColor Red
        exit 1
    } else {
        Write-Host $status -ForegroundColor Yellow
    }

    if ($i -lt 20) {
        Start-Sleep -Seconds 15
    }
}

Write-Host "Still pending after 5 minutes. Check AWS Console or run script again." -ForegroundColor Yellow
