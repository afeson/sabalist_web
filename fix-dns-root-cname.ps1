$token = "J470GE8DaHtBQkOwJiXzKLMharJLWUJzUCZB2rgb5193e574"
$domain = "sabalist.com"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
$baseUrl = "https://developers.hostinger.com/api/dns/v1"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Updating Root Domain to CNAME" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Fetch current DNS records
Write-Host "[1/2] Fetching current DNS records..." -ForegroundColor Yellow
try {
    $currentZone = Invoke-RestMethod -Uri "$baseUrl/zones/$domain" -Headers $headers -Method Get
    Write-Host "  Success!" -ForegroundColor Green
} catch {
    Write-Host "  Failed!" -ForegroundColor Red
    exit 1
}

# Update DNS zone - change root ALIAS to CNAME
Write-Host ""
Write-Host "[2/2] Changing root domain from ALIAS to CNAME..." -ForegroundColor Yellow

$newZone = @()

# Change root domain to CNAME (instead of ALIAS)
$newZone += @{
    name = "@"
    type = "CNAME"
    ttl = 300
    records = @(
        @{
            content = "d3qtzst32m5et0.cloudfront.net."
            is_disabled = $false
        }
    )
}

# Keep www CNAME
$newZone += @{
    name = "www"
    type = "CNAME"
    ttl = 300
    records = @(
        @{
            content = "d3qtzst32m5et0.cloudfront.net."
            is_disabled = $false
        }
    )
}

# Keep SSL verification CNAME
$newZone += @{
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

# Keep AWS CAA records
$newZone += @{
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

$requestPayload = @{
    zone = $newZone
}
$updateBody = $requestPayload | ConvertTo-Json -Depth 10

try {
    Invoke-RestMethod -Uri "$baseUrl/zones/$domain" -Headers $headers -Method Put -Body $updateBody -ContentType "application/json" | Out-Null
    Write-Host "  Success!" -ForegroundColor Green
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "DNS UPDATED - ROOT CHANGED TO CNAME" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Root domain (@) changed from ALIAS to CNAME" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "  Failed!" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red

    # Hostinger might not allow CNAME for root domain
    if ($_.Exception.Message -like "*CNAME*root*" -or $_.Exception.Message -like "*apex*") {
        Write-Host ""
        Write-Host "Hostinger does not allow CNAME records for root domain." -ForegroundColor Yellow
        Write-Host "We need to use www.sabalist.com instead of sabalist.com" -ForegroundColor Yellow
        Write-Host "OR use Hostinger's redirect feature to redirect @ to www" -ForegroundColor Yellow
    }
    exit 1
}
