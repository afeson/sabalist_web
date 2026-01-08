# Hostinger DNS Fixer for sabalist.com
# Fixes CAA records and adds AWS Amplify CNAME records

param(
    [Parameter(Mandatory=$true)]
    [string]$ApiToken
)

$domain = "sabalist.com"
$headers = @{
    "Authorization" = "Bearer $ApiToken"
    "Content-Type" = "application/json"
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Hostinger DNS Fixer for $domain" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Get current DNS records
Write-Host "[1/5] Fetching current DNS records..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "https://api.hostinger.com/dns/v1/domains/$domain/records" -Headers $headers -Method Get
    $currentRecords = $response.records
    Write-Host "✓ Found $($currentRecords.Count) existing DNS records" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to fetch DNS records: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure you have a valid Hostinger API token from:" -ForegroundColor Yellow
    Write-Host "https://hpanel.hostinger.com/api-tokens" -ForegroundColor Yellow
    exit 1
}

# Step 2: Delete CAA records
Write-Host ""
Write-Host "[2/5] Deleting old CAA records..." -ForegroundColor Yellow
$caaToDelete = @("comodoca.com", "digicert.com", "globalsign.com", "letsencrypt.org", "pki.goog")
$deletedCount = 0

foreach ($record in $currentRecords) {
    if ($record.type -eq "CAA") {
        $shouldDelete = $false
        foreach ($ca in $caaToDelete) {
            if ($record.content -like "*$ca*") {
                $shouldDelete = $true
                break
            }
        }

        if ($shouldDelete) {
            try {
                Invoke-RestMethod -Uri "https://api.hostinger.com/dns/v1/domains/$domain/records/$($record.id)" -Headers $headers -Method Delete | Out-Null
                Write-Host "  ✓ Deleted CAA record: $($record.content)" -ForegroundColor Green
                $deletedCount++
            } catch {
                Write-Host "  ✗ Failed to delete CAA record: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }
}
Write-Host "✓ Deleted $deletedCount CAA records" -ForegroundColor Green

# Step 3: Add AWS CAA records
Write-Host ""
Write-Host "[3/5] Adding AWS CAA records..." -ForegroundColor Yellow
$caaRecords = @(
    @{ name = "@"; type = "CAA"; content = "0 issue `"amazon.com`""; ttl = 3600 },
    @{ name = "@"; type = "CAA"; content = "0 issue `"amazontrust.com`""; ttl = 3600 }
)

foreach ($caa in $caaRecords) {
    try {
        $body = $caa | ConvertTo-Json
        Invoke-RestMethod -Uri "https://api.hostinger.com/dns/v1/domains/$domain/records" -Headers $headers -Method Post -Body $body | Out-Null
        Write-Host "  ✓ Added CAA record: $($caa.content)" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ Failed to add CAA record: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Step 4: Add SSL verification CNAME
Write-Host ""
Write-Host "[4/5] Adding SSL verification CNAME..." -ForegroundColor Yellow
$sslCname = @{
    name = "_a39684f0933de309c0799b5602087b2b"
    type = "CNAME"
    content = "_82394b3d74094c1ec49bf7f3c55b791a.jkddzztszm.acm-validations.aws."
    ttl = 3600
}

try {
    $body = $sslCname | ConvertTo-Json
    Invoke-RestMethod -Uri "https://api.hostinger.com/dns/v1/domains/$domain/records" -Headers $headers -Method Post -Body $body | Out-Null
    Write-Host "  ✓ Added SSL verification CNAME" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Failed to add SSL verification CNAME: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 5: Add domain routing CNAMEs
Write-Host ""
Write-Host "[5/5] Adding domain routing CNAMEs..." -ForegroundColor Yellow
$domainCnames = @(
    @{ name = "@"; type = "CNAME"; content = "d1ewgsv5l3yhh7.cloudfront.net"; ttl = 3600 },
    @{ name = "www"; type = "CNAME"; content = "d1ewgsv5l3yhh7.cloudfront.net"; ttl = 3600 }
)

foreach ($cname in $domainCnames) {
    try {
        $body = $cname | ConvertTo-Json
        Invoke-RestMethod -Uri "https://api.hostinger.com/dns/v1/domains/$domain/records" -Headers $headers -Method Post -Body $body | Out-Null
        Write-Host "  ✓ Added CNAME record: $($cname.name) -> $($cname.content)" -ForegroundColor Green
    } catch {
        # May fail if CNAME already exists or @ CNAME not supported
        Write-Host "  ⚠ Could not add CNAME for $($cname.name): $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DNS Update Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Wait 5-30 minutes for DNS propagation"
Write-Host "2. Run verify-dns.bat to check status"
Write-Host "3. Check AWS Amplify console for domain verification"
Write-Host ""
Write-Host "AWS Amplify should automatically detect the changes and issue SSL certificate." -ForegroundColor Green
