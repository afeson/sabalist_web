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
Write-Host "WARNING: This will remove all existing DNS records" -ForegroundColor Yellow
Write-Host "and configure only Vercel A records." -ForegroundColor Yellow
Write-Host ""

# Minimal configuration - only Vercel A records
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
    }
)

$requestPayload = @{
    zone = $newZone
}
$updateBody = $requestPayload | ConvertTo-Json -Depth 10

Write-Host "Updating DNS zone..." -ForegroundColor Yellow

try {
    Invoke-RestMethod -Uri "$baseUrl/zones/$domain" -Headers $headers -Method Put -Body $updateBody -ContentType "application/json" | Out-Null
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "DNS CONFIGURATION COMPLETE!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Vercel DNS records configured:" -ForegroundColor White
    Write-Host "  ✓ sabalist.com (A) -> 76.76.21.21" -ForegroundColor Green
    Write-Host "  ✓ www.sabalist.com (A) -> 76.76.21.21" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. DNS propagation: 5-10 minutes" -ForegroundColor Yellow
    Write-Host "  2. Vercel will auto-detect the configuration" -ForegroundColor Yellow
    Write-Host "  3. SSL certificate will be issued automatically" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Check status: vercel domains inspect sabalist.com" -ForegroundColor Cyan
    Write-Host ""
} catch {
    Write-Host "Failed to update DNS zone" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red

    try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error Details: $errorBody" -ForegroundColor Red
    } catch {}

    exit 1
}
