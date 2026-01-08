$token = "J470GE8DaHtBQkOwJiXzKLMharJLWUJzUCZB2rgb5193e574"
$domain = "sabalist.com"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
$baseUrl = "https://developers.hostinger.com/api/dns/v1"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Updating DNS for New CloudFront Distribution" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Fetch current DNS records
Write-Host "[1/2] Fetching current DNS records..." -ForegroundColor Yellow
try {
    $currentZone = Invoke-RestMethod -Uri "$baseUrl/zones/$domain" -Headers $headers -Method Get
    Write-Host "  Success! Found $($currentZone.Count) DNS record groups" -ForegroundColor Green
} catch {
    Write-Host "  Failed to fetch DNS records" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Update DNS zone with new CloudFront distribution
Write-Host ""
Write-Host "[2/2] Updating DNS records to point to new CloudFront distribution..." -ForegroundColor Yellow

$newZone = @()

# Add updated root domain ALIAS (change to new CloudFront)
$newZone += @{
    name = "@"
    type = "ALIAS"
    ttl = 14400
    records = @(
        @{
            content = "d3qtzst32m5et0.cloudfront.net."
            is_disabled = $false
        }
    )
}

# Add updated www CNAME (change to new CloudFront)
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

# Keep SSL verification CNAME (unchanged)
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

# Keep AWS CAA records (unchanged)
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
    Write-Host "  DNS zone updated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "DNS UPDATE SUCCESSFUL!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Changes made:" -ForegroundColor White
    Write-Host "  - Updated root (@) to: d3qtzst32m5et0.cloudfront.net" -ForegroundColor White
    Write-Host "  - Updated www to: d3qtzst32m5et0.cloudfront.net" -ForegroundColor White
    Write-Host "  - Kept SSL verification CNAME" -ForegroundColor White
    Write-Host "  - Kept AWS CAA records" -ForegroundColor White
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Wait 5-15 minutes for DNS propagation"
    Write-Host "  2. AWS Amplify will automatically verify domain"
    Write-Host "  3. SSL certificate will be issued"
    Write-Host "  4. Your site will be live at https://sabalist.com"
    Write-Host ""
} catch {
    Write-Host "  Failed to update DNS zone" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Response: $responseBody" -ForegroundColor Red
    }
    exit 1
}
