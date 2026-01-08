$token = "J470GE8DaHtBQkOwJiXzKLMharJLWUJzUCZB2rgb5193e574"
$domain = "sabalist.com"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
$baseUrl = "https://developers.hostinger.com/api/dns/v1"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Hostinger DNS Fix for $domain" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Get current DNS records
Write-Host "[1/5] Fetching current DNS records..." -ForegroundColor Yellow
try {
    $zone = Invoke-RestMethod -Uri "$baseUrl/zones/$domain" -Headers $headers -Method Get
    $currentRecords = $zone.records
    Write-Host "  Success! Found $($currentRecords.Count) records" -ForegroundColor Green
} catch {
    Write-Host "  API Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Response: $($_.Exception.Response)" -ForegroundColor Red
    exit 1
}

# Build new records list
Write-Host ""
Write-Host "[2/5] Building new DNS configuration..." -ForegroundColor Yellow

# Keep all records except CAA records we want to delete
$caaToDelete = @("comodoca", "digicert", "globalsign", "letsencrypt", "pki.goog")
$newRecords = @()
$deletedCount = 0

foreach ($rec in $currentRecords) {
    $shouldKeep = $true

    if ($rec.type -eq "CAA") {
        foreach ($ca in $caaToDelete) {
            if ($rec.content -like "*$ca*") {
                $shouldKeep = $false
                $deletedCount++
                Write-Host "  Removing: $($rec.content)" -ForegroundColor Gray
                break
            }
        }
    }

    if ($shouldKeep) {
        $newRecords += $rec
    }
}

Write-Host "  Marked $deletedCount CAA records for deletion" -ForegroundColor Green

# Add AWS CAA records
Write-Host ""
Write-Host "[3/5] Adding AWS CAA records..." -ForegroundColor Yellow
$newRecords += @{
    name = "@"
    type = "CAA"
    content = '0 issue "amazon.com"'
    ttl = 3600
}
$newRecords += @{
    name = "@"
    type = "CAA"
    content = '0 issue "amazontrust.com"'
    ttl = 3600
}
Write-Host "  Added 2 AWS CAA records" -ForegroundColor Green

# Add SSL verification CNAME
Write-Host ""
Write-Host "[4/5] Adding SSL verification CNAME..." -ForegroundColor Yellow
$newRecords += @{
    name = "_a39684f0933de309c0799b5602087b2b"
    type = "CNAME"
    content = "_82394b3d74094c1ec49bf7f3c55b791a.jkddzztszm.acm-validations.aws."
    ttl = 3600
}
Write-Host "  Added SSL verification CNAME" -ForegroundColor Green

# Add domain CNAMEs (if they don't exist)
Write-Host ""
Write-Host "[5/5] Adding domain routing CNAMEs..." -ForegroundColor Yellow

$hasRootCname = $newRecords | Where-Object { $_.name -eq "@" -and $_.type -eq "CNAME" }
if (-not $hasRootCname) {
    $newRecords += @{
        name = "@"
        type = "CNAME"
        content = "d1ewgsv5l3yhh7.cloudfront.net"
        ttl = 3600
    }
    Write-Host "  Added root CNAME" -ForegroundColor Green
}

$hasWwwCname = $newRecords | Where-Object { $_.name -eq "www" -and $_.type -eq "CNAME" }
if (-not $hasWwwCname) {
    $newRecords += @{
        name = "www"
        type = "CNAME"
        content = "d1ewgsv5l3yhh7.cloudfront.net"
        ttl = 3600
    }
    Write-Host "  Added www CNAME" -ForegroundColor Green
}

# Update DNS zone with new records
Write-Host ""
Write-Host "Updating DNS zone..." -ForegroundColor Yellow

$updateBody = @{
    records = $newRecords
    overwrite = $true
} | ConvertTo-Json -Depth 10

try {
    Invoke-RestMethod -Uri "$baseUrl/zones/$domain" -Headers $headers -Method Put -Body $updateBody | Out-Null
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "DNS UPDATE SUCCESSFUL!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Changes made:" -ForegroundColor White
    Write-Host "  - Deleted $deletedCount old CAA records" -ForegroundColor White
    Write-Host "  - Added 2 AWS CAA records" -ForegroundColor White
    Write-Host "  - Added SSL verification CNAME" -ForegroundColor White
    Write-Host "  - Added domain routing CNAMEs" -ForegroundColor White
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Wait 10-30 minutes for DNS propagation"
    Write-Host "  2. AWS Amplify will automatically verify domain"
    Write-Host "  3. SSL certificate will be issued"
    Write-Host "  4. Your site will be live at https://sabalist.com"
    Write-Host ""
} catch {
    Write-Host ""
    Write-Host "Update failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
