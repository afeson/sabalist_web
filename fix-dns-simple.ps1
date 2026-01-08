$token = "J470GE8DaHtBQkOwJiXzKLMharJLWUJzUCZB2rgb5193e574"
$domain = "sabalist.com"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "Hostinger DNS Fix for $domain" -ForegroundColor Cyan
Write-Host ""

# Test API
Write-Host "[1/5] Testing API..." -ForegroundColor Yellow
try {
    $records = Invoke-RestMethod -Uri "https://api.hostinger.com/dns/v1/domains/$domain/records" -Headers $headers -Method Get
    Write-Host "Success! Found $($records.records.Count) records" -ForegroundColor Green
} catch {
    Write-Host "API Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Delete CAA records
Write-Host ""
Write-Host "[2/5] Deleting old CAA records..." -ForegroundColor Yellow
$caaToDelete = @("comodoca", "digicert", "globalsign", "letsencrypt", "pki.goog")
foreach ($rec in $records.records) {
    if ($rec.type -eq "CAA") {
        foreach ($ca in $caaToDelete) {
            if ($rec.content -like "*$ca*") {
                try {
                    Invoke-RestMethod -Uri "https://api.hostinger.com/dns/v1/domains/$domain/records/$($rec.id)" -Headers $headers -Method Delete | Out-Null
                    Write-Host "  Deleted: $($rec.content)" -ForegroundColor Green
                } catch {
                    Write-Host "  Failed to delete: $($_.Exception.Message)" -ForegroundColor Red
                }
                break
            }
        }
    }
}

# Add AWS CAA
Write-Host ""
Write-Host "[3/5] Adding AWS CAA records..." -ForegroundColor Yellow
$caa1 = @{ name = "@"; type = "CAA"; content = '0 issue "amazon.com"'; ttl = 3600 } | ConvertTo-Json
$caa2 = @{ name = "@"; type = "CAA"; content = '0 issue "amazontrust.com"'; ttl = 3600 } | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "https://api.hostinger.com/dns/v1/domains/$domain/records" -Headers $headers -Method Post -Body $caa1 | Out-Null
    Write-Host "  Added: amazon.com" -ForegroundColor Green
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

try {
    Invoke-RestMethod -Uri "https://api.hostinger.com/dns/v1/domains/$domain/records" -Headers $headers -Method Post -Body $caa2 | Out-Null
    Write-Host "  Added: amazontrust.com" -ForegroundColor Green
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Add SSL CNAME
Write-Host ""
Write-Host "[4/5] Adding SSL verification CNAME..." -ForegroundColor Yellow
$sslCname = @{
    name = "_a39684f0933de309c0799b5602087b2b"
    type = "CNAME"
    content = "_82394b3d74094c1ec49bf7f3c55b791a.jkddzztszm.acm-validations.aws."
    ttl = 3600
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "https://api.hostinger.com/dns/v1/domains/$domain/records" -Headers $headers -Method Post -Body $sslCname | Out-Null
    Write-Host "  Added SSL verification CNAME" -ForegroundColor Green
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Add domain CNAMEs
Write-Host ""
Write-Host "[5/5] Adding domain CNAMEs..." -ForegroundColor Yellow
$rootCname = @{ name = "@"; type = "CNAME"; content = "d1ewgsv5l3yhh7.cloudfront.net"; ttl = 3600 } | ConvertTo-Json
$wwwCname = @{ name = "www"; type = "CNAME"; content = "d1ewgsv5l3yhh7.cloudfront.net"; ttl = 3600 } | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "https://api.hostinger.com/dns/v1/domains/$domain/records" -Headers $headers -Method Post -Body $rootCname | Out-Null
    Write-Host "  Added root CNAME" -ForegroundColor Green
} catch {
    Write-Host "  Warning: $($_.Exception.Message)" -ForegroundColor Yellow
}

try {
    Invoke-RestMethod -Uri "https://api.hostinger.com/dns/v1/domains/$domain/records" -Headers $headers -Method Post -Body $wwwCname | Out-Null
    Write-Host "  Added www CNAME" -ForegroundColor Green
} catch {
    Write-Host "  Warning: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "DNS update complete!" -ForegroundColor Green
Write-Host "Wait 10-30 minutes for DNS propagation" -ForegroundColor Yellow
