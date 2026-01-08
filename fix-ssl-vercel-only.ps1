$token = "J470GE8DaHtBQkOwJiXzKLMharJLWUJzUCZB2rgb5193e574"
$domain = "sabalist.com"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
$baseUrl = "https://developers.hostinger.com/api/dns/v1"

Write-Host "Configuring DNS for Vercel ONLY (removing CloudFront)" -ForegroundColor Cyan
Write-Host ""

# Simple configuration - only Vercel records
$newZone = @(
    # Root domain A record pointing to Vercel
    @{
        name = "@"
        type = "A"
        ttl = 3600
        records = @(
            @{
                content = "76.76.21.21"
                is_disabled = $false
            }
        )
    },
    # WWW subdomain CNAME pointing to Vercel
    @{
        name = "www"
        type = "CNAME"
        ttl = 3600
        records = @(
            @{
                content = "cname.vercel-dns.com."
                is_disabled = $false
            }
        )
    }
)

$requestPayload = @{
    zone = $newZone
}
$updateBody = $requestPayload | ConvertTo-Json -Depth 10

Write-Host "Updating DNS zone to Vercel only..." -ForegroundColor Yellow

try {
    Invoke-RestMethod -Uri "$baseUrl/zones/$domain" -Headers $headers -Method Put -Body $updateBody -ContentType "application/json" | Out-Null

    Write-Host ""
    Write-Host "DNS UPDATED TO VERCEL ONLY!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Current DNS configuration:" -ForegroundColor Cyan
    Write-Host "  sabalist.com (A) -> 76.76.21.21" -ForegroundColor White
    Write-Host "  www.sabalist.com (CNAME) -> cname.vercel-dns.com" -ForegroundColor White
    Write-Host ""
    Write-Host "Removed:" -ForegroundColor Yellow
    Write-Host "  - CloudFront ALIAS record"
    Write-Host "  - AWS SSL validation CNAMEs"
    Write-Host "  - AWS CAA records"
    Write-Host ""
    Write-Host "Next: Vercel will issue SSL certificate for sabalist.com (5-30 mins)" -ForegroundColor Green
    Write-Host ""

} catch {
    Write-Host "Error occurred" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
