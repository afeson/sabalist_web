$token = "J470GE8DaHtBQkOwJiXzKLMharJLWUJzUCZB2rgb5193e574"
$domain = "sabalist.com"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
$baseUrl = "https://developers.hostinger.com/api/dns/v1"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Configuring DNS for Vercel Deployment" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Simple configuration - just the bare minimum for Vercel
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
    # WWW subdomain A record pointing to Vercel
    @{
        name = "www"
        type = "A"
        ttl = 3600
        records = @(
            @{
                content = "76.76.21.21"
                is_disabled = $false
            }
        )
    },
    # Keep AWS validation CNAMEs
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
    }
)

$requestPayload = @{
    zone = $newZone
}
$updateBody = $requestPayload | ConvertTo-Json -Depth 10

Write-Host "Updating DNS zone..." -ForegroundColor Yellow
Write-Host "Sending payload:" -ForegroundColor Gray
Write-Host $updateBody -ForegroundColor DarkGray
Write-Host ""

try {
    Invoke-RestMethod -Uri "$baseUrl/zones/$domain" -Headers $headers -Method Put -Body $updateBody -ContentType "application/json" | Out-Null
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "DNS CONFIGURATION COMPLETE!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Vercel DNS records added:" -ForegroundColor White
    Write-Host "  ✓ sabalist.com (A) -> 76.76.21.21" -ForegroundColor Green
    Write-Host "  ✓ www.sabalist.com (A) -> 76.76.21.21" -ForegroundColor Green
    Write-Host ""
    Write-Host "DNS propagation time: 5-10 minutes" -ForegroundColor Yellow
    Write-Host "Vercel will auto-detect and issue SSL certificate" -ForegroundColor Yellow
    Write-Host ""
} catch {
    Write-Host "Failed to update DNS zone" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red

    try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error Body: $errorBody" -ForegroundColor Red
    } catch {}

    exit 1
}
