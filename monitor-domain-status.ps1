Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "AWS Amplify Domain Status Monitor" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Checking domain verification status every 30 seconds..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop monitoring" -ForegroundColor Gray
Write-Host ""

$maxAttempts = 20
$attempt = 0

while ($attempt -lt $maxAttempts) {
    $attempt++
    $timestamp = Get-Date -Format "HH:mm:ss"

    Write-Host "[$timestamp] Check $attempt/$maxAttempts..." -ForegroundColor Cyan

    try {
        $result = aws amplify get-domain-association --app-id d2hef9d7y3mss4 --domain-name sabalist.com --region us-east-1 | ConvertFrom-Json
        $status = $result.domainAssociation.domainStatus

        Write-Host "  Status: $status" -ForegroundColor $(if ($status -eq "AVAILABLE") { "Green" } elseif ($status -eq "FAILED") { "Red" } else { "Yellow" })

        # Check subdomain verification
        foreach ($sub in $result.domainAssociation.subDomains) {
            $prefix = if ($sub.subDomainSetting.prefix) { $sub.subDomainSetting.prefix } else { "@" }
            $verified = if ($sub.verified) { "✓ VERIFIED" } else { "✗ Not verified" }
            $color = if ($sub.verified) { "Green" } else { "Gray" }
            Write-Host "    $prefix : $verified" -ForegroundColor $color
        }

        if ($status -eq "AVAILABLE") {
            Write-Host ""
            Write-Host "==========================================" -ForegroundColor Green
            Write-Host "DOMAIN VERIFIED AND AVAILABLE!" -ForegroundColor Green
            Write-Host "==========================================" -ForegroundColor Green
            Write-Host ""
            Write-Host "Your site is now live at:" -ForegroundColor White
            Write-Host "  - https://sabalist.com" -ForegroundColor Cyan
            Write-Host "  - https://www.sabalist.com" -ForegroundColor Cyan
            Write-Host ""
            exit 0
        } elseif ($status -eq "FAILED") {
            Write-Host ""
            Write-Host "Domain verification failed!" -ForegroundColor Red
            Write-Host "Reason: $($result.domainAssociation.statusReason)" -ForegroundColor Red
            Write-Host ""
            exit 1
        }

        Write-Host ""
        if ($attempt -lt $maxAttempts) {
            Start-Sleep -Seconds 30
        }
    } catch {
        Write-Host "  Error checking status: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Start-Sleep -Seconds 30
    }
}

Write-Host "Reached maximum attempts. Domain is still being verified." -ForegroundColor Yellow
Write-Host "This can take up to 30 minutes total." -ForegroundColor Yellow
Write-Host "Run this script again to continue monitoring, or check AWS Console." -ForegroundColor Yellow
