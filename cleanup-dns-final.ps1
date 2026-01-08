$token = "J470GE8DaHtBQkOwJiXzKLMharJLWUJzUCZB2rgb5193e574"
$domain = "sabalist.com"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
$baseUrl = "https://developers.hostinger.com/api/dns/v1"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Cleaning Up DNS - WWW Only" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Removing old/conflicting DNS records..." -ForegroundColor Yellow
Write-Host ""

# ONLY keep the records needed for www.sabalist.com
$newZone = @(
    # WWW subdomain - current CloudFront
    @{
        name = "www"
        type = "CNAME"
        ttl = 300
        records = @(
            @{
                content = "dfzranws7uxdc.cloudfront.net."
                is_disabled = $false
            }
        )
    },
    # SSL verification CNAME for www.sabalist.com
    @{
        name = "_55fb929d28f12bc18903fcc1d5baac73.www"
        type = "CNAME"
        ttl = 300
        records = @(
            @{
                content = "_1e0f82cbac46ebb235ee5c6c4ec6adcf.jkddzztszm.acm-validations.aws."
                is_disabled = $false
            }
        )
    },
    # AWS CAA records
    @{
        name = "@"
        type = "CAA"
        ttl = 3600
        records = @(
            @{
                content = '0 issue "amazon.com"'
                is_disabled = $false
            },
            @{
                content = '0 issue "amazontrust.com"'
                is_disabled = $false
            }
        )
    }
)

$requestPayload = @{
    zone = $newZone
}
$updateBody = $requestPayload | ConvertTo-Json -Depth 10

try {
    Invoke-RestMethod -Uri "$baseUrl/zones/$domain" -Headers $headers -Method Put -Body $updateBody -ContentType "application/json" | Out-Null
    Write-Host "DNS cleaned up successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Removed:" -ForegroundColor Yellow
    Write-Host "  - Old root domain (@) ALIAS to dw7vwsazooevk.cloudfront.net" -ForegroundColor Gray
    Write-Host "  - Old SSL verification CNAME _a39684f0..." -ForegroundColor Gray
    Write-Host ""
    Write-Host "Kept only:" -ForegroundColor Green
    Write-Host "  - www.sabalist.com -> dfzranws7uxdc.cloudfront.net" -ForegroundColor White
    Write-Host "  - SSL verification for www subdomain" -ForegroundColor White
    Write-Host "  - AWS CAA records" -ForegroundColor White
    Write-Host ""
    Write-Host "AWS should now detect the clean configuration..." -ForegroundColor Cyan
    Write-Host ""
} catch {
    Write-Host "Failed to update DNS" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
