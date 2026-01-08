$token = "J470GE8DaHtBQkOwJiXzKLMharJLWUJzUCZB2rgb5193e574"
$domain = "sabalist.com"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
$baseUrl = "https://developers.hostinger.com/api/dns/v1"

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "Hostinger DNS Fix for $domain" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Fetch current DNS records
Write-Host "[1/3] Fetching current DNS records..." -ForegroundColor Yellow
try {
    $currentZone = Invoke-RestMethod -Uri "$baseUrl/zones/$domain" -Headers $headers -Method Get
    Write-Host "  ✓ Found $($currentZone.Count) DNS record groups" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Failed to fetch DNS records" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Build new DNS zone with AWS CAA records
Write-Host ""
Write-Host "[2/3] Building DNS configuration with AWS CAA records..." -ForegroundColor Yellow

# Keep existing records and add AWS CAA records
$newZone = @($currentZone)

# Add AWS CAA records (amazon.com and amazontrust.com)
$newZone += @{
    name = "@"
    type = "CAA"
    ttl = 3600
    records = @(
        @{
            content = "0 issue `"amazon.com`""
            is_disabled = $false
        },
        @{
            content = "0 issue `"amazontrust.com`""
            is_disabled = $false
        }
    )
}

Write-Host "  ✓ Added 2 AWS CAA records for SSL certificate issuance" -ForegroundColor Green

# Step 3: Update DNS zone
Write-Host ""
Write-Host "[3/3] Updating DNS zone on Hostinger..." -ForegroundColor Yellow

$updateBody = $newZone | ConvertTo-Json -Depth 10

try {
    Invoke-RestMethod -Uri "$baseUrl/zones/$domain" -Headers $headers -Method Put -Body $updateBody -ContentType "application/json" | Out-Null
    Write-Host "  ✓ DNS zone updated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "===========================================" -ForegroundColor Green
    Write-Host "DNS UPDATE SUCCESSFUL!" -ForegroundColor Green
    Write-Host "===========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Changes made:" -ForegroundColor White
    Write-Host "  ✓ Added CAA record: 0 issue ""amazon.com""" -ForegroundColor White
    Write-Host "  ✓ Added CAA record: 0 issue ""amazontrust.com""" -ForegroundColor White
    Write-Host "  ✓ Kept existing SSL verification CNAME" -ForegroundColor White
    Write-Host "  ✓ Kept existing domain routing records" -ForegroundColor White
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Wait 10-30 minutes for DNS propagation"
    Write-Host "  2. AWS Amplify will automatically verify domain"
    Write-Host "  3. SSL certificate will be issued"
    Write-Host "  4. Your site will be live at https://sabalist.com"
    Write-Host ""
    Write-Host "You can check DNS propagation with:" -ForegroundColor Cyan
    Write-Host "  nslookup -type=CAA sabalist.com 8.8.8.8"
    Write-Host ""
} catch {
    Write-Host "  ✗ Failed to update DNS zone" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Response: $responseBody" -ForegroundColor Red
    }
    exit 1
}
