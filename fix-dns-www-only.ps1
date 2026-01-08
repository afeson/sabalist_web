$token = "J470GE8DaHtBQkOwJiXzKLMharJLWUJzUCZB2rgb5193e574"
$domain = "sabalist.com"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
$baseUrl = "https://developers.hostinger.com/api/dns/v1"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Configuring DNS for WWW Only" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Strategy: www.sabalist.com will work" -ForegroundColor White
Write-Host "Root domain will use Hostinger URL redirect" -ForegroundColor White
Write-Host ""

# Update DNS - www only + SSL verification + CAA records
$newZone = @(
    # WWW subdomain - points to AWS CloudFront
    @{
        name = "www"
        type = "CNAME"
        ttl = 300
        records = @(
            @{
                content = "d3ph0om6y4ro1z.cloudfront.net."
                is_disabled = $false
            }
        )
    },
    # SSL verification CNAME
    @{
        name = "_a39684f0933de309c0799b5602087b2b"
        type = "CNAME"
        ttl = 300
        records = @(
            @{
                content = "_82394b3d74094c1ec49bf7f3c55b791a.jkddzztszm.acm-validations.aws."
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
    Write-Host "  - www.sabalist.com -> d3ph0om6y4ro1z.cloudfront.net" -ForegroundColor White
    Write-Host "  - SSL verification CNAME preserved" -ForegroundColor White
    Write-Host "  - AWS CAA records preserved" -ForegroundColor White
    Write-Host "  - Root domain (@) removed (to avoid conflicts)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Wait 5-15 minutes for AWS to verify www.sabalist.com"
    Write-Host "  2. Set up Hostinger redirect: sabalist.com -> www.sabalist.com"
    Write-Host "  3. Your site will be live at https://www.sabalist.com"
    Write-Host ""
    Write-Host "To set up root domain redirect:" -ForegroundColor Yellow
    Write-Host "  1. Log into Hostinger hPanel"
    Write-Host "  2. Go to Domains -> sabalist.com -> Redirects"
    Write-Host "  3. Redirect sabalist.com to https://www.sabalist.com"
    Write-Host ""
} catch {
    Write-Host "Failed to update DNS" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
