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

# Fetch current DNS records
Write-Host "Fetching current DNS zone..." -ForegroundColor Yellow
try {
    $currentZone = Invoke-RestMethod -Uri "$baseUrl/zones/$domain" -Headers $headers -Method Get
    Write-Host "Current zone fetched successfully!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "Failed to fetch current zone" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Build new zone - start with Vercel A records
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

# Keep only AWS validation CNAME records and CAA records (skip CloudFront records)
foreach ($record in $currentZone.zone) {
    $shouldKeep = $false

    # Keep AWS SSL validation CNAMEs (they start with _)
    if ($record.type -eq "CNAME" -and $record.name -like "_*") {
        $shouldKeep = $true
        Write-Host "Keeping AWS validation CNAME: $($record.name)" -ForegroundColor Gray
    }

    # Skip @ and www records (we're replacing them with Vercel)
    if ($record.name -eq "@" -or $record.name -eq "www") {
        Write-Host "Removing: $($record.type) record for $($record.name)" -ForegroundColor Yellow
        $shouldKeep = $false
    }

    if ($shouldKeep) {
        $newZone += $record
    }
}

$requestPayload = @{
    zone = $newZone
}
$updateBody = $requestPayload | ConvertTo-Json -Depth 10

Write-Host ""
Write-Host "Updating DNS zone..." -ForegroundColor Yellow

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
    Write-Host "Note: Previous AWS CloudFront records removed" -ForegroundColor Yellow
    Write-Host "Note: AWS SSL validation CNAMEs preserved" -ForegroundColor Gray
    Write-Host ""
    Write-Host "DNS propagation time: 5-10 minutes" -ForegroundColor Yellow
    Write-Host "Vercel will auto-detect and issue SSL certificate" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Check status with: vercel domains inspect sabalist.com" -ForegroundColor Cyan
    Write-Host ""
} catch {
    Write-Host "Failed to update DNS zone" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red

    # Try to get more details from the error
    if ($_.ErrorDetails) {
        Write-Host "Error Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    exit 1
}
