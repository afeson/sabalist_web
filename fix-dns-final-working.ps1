$token = "J470GE8DaHtBQkOwJiXzKLMharJLWUJzUCZB2rgb5193e574"
$domain = "sabalist.com"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
$baseUrl = "https://developers.hostinger.com/api/dns/v1"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Final DNS Configuration for www.sabalist.com" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$newZone = @(
    # WWW subdomain - points to AWS CloudFront
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
    # NEW SSL verification CNAME for www.sabalist.com
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
    Write-Host "DNS updated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "DNS CONFIGURATION COMPLETE" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Changes made:" -ForegroundColor White
    Write-Host "  - www.sabalist.com -> dfzranws7uxdc.cloudfront.net" -ForegroundColor White
    Write-Host "  - SSL verification CNAME for www subdomain" -ForegroundColor White
    Write-Host "  - AWS CAA records" -ForegroundColor White
    Write-Host ""
    Write-Host "Waiting for AWS verification (5-15 minutes)..." -ForegroundColor Yellow
    Write-Host ""
} catch {
    Write-Host "Failed to update DNS" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
