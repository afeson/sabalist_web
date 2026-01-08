# Test Hostinger API Token
param(
    [Parameter(Mandatory=$true)]
    [string]$ApiToken
)

$domain = "sabalist.com"
$headers = @{
    "Authorization" = "Bearer $ApiToken"
    "Content-Type" = "application/json"
}

Write-Host "Testing Hostinger API token..." -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "https://api.hostinger.com/dns/v1/domains/$domain/records" -Headers $headers -Method Get

    Write-Host "✓ API Token is VALID!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Current DNS Records for $domain" ":" -ForegroundColor Yellow
    Write-Host "================================" -ForegroundColor Yellow

    $caaRecords = $response.records | Where-Object { $_.type -eq "CAA" }
    $cnameRecords = $response.records | Where-Object { $_.type -eq "CNAME" }

    Write-Host ""
    Write-Host "CAA Records ($($caaRecords.Count)):" -ForegroundColor White
    foreach ($record in $caaRecords) {
        Write-Host "  - $($record.name) : $($record.content)" -ForegroundColor Gray
    }

    Write-Host ""
    Write-Host "CNAME Records ($($cnameRecords.Count)):" -ForegroundColor White
    foreach ($record in $cnameRecords) {
        Write-Host "  - $($record.name) -> $($record.content)" -ForegroundColor Gray
    }

    Write-Host ""
    Write-Host "Total Records: $($response.records.Count)" -ForegroundColor White
    Write-Host ""
    Write-Host "You can now run fix-dns.bat with this token!" -ForegroundColor Green

} catch {
    Write-Host "✗ API Token is INVALID!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  1. Token has 'DNS' permissions"
    Write-Host "  2. Token is for the correct Hostinger account"
    Write-Host "  3. Token hasn't expired"
    Write-Host ""
    Write-Host "Create a new token at:" -ForegroundColor Yellow
    Write-Host "https://hpanel.hostinger.com/api-tokens"
    exit 1
}
