$token = "J470GE8DaHtBQkOwJiXzKLMharJLWUJzUCZB2rgb5193e574"
$domain = "sabalist.com"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
$baseUrl = "https://developers.hostinger.com/api/dns/v1"

Write-Host "Fixing SSL by removing conflicting CloudFront ALIAS record" -ForegroundColor Cyan
Write-Host ""

# Fetch current DNS records
Write-Host "Fetching current DNS zone..." -ForegroundColor Yellow
$response = Invoke-RestMethod -Uri "$baseUrl/zones/$domain" -Headers $headers -Method Get

# Build new zone - keep everything EXCEPT the CloudFront ALIAS record
$newZone = @()

foreach ($record in $response.zone) {
    # Skip the CloudFront ALIAS record (conflicting with Vercel A record)
    if ($record.type -eq "ALIAS" -and $record.name -eq "@") {
        Write-Host "Removing CloudFront ALIAS: @ -> $($record.records[0].content)" -ForegroundColor Yellow
        continue
    }

    # Also remove AWS CAA records (allow Vercel to use Let's Encrypt)
    if ($record.type -eq "CAA" -and $record.name -eq "@") {
        Write-Host "Removing AWS CAA records" -ForegroundColor Yellow
        continue
    }

    # Keep everything else
    $newZone += $record
    Write-Host "Keeping: $($record.type) record for $($record.name)" -ForegroundColor Gray
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
    Write-Host "DNS UPDATED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Changes made:" -ForegroundColor Cyan
    Write-Host "  Removed: ALIAS @ -> dw7vwsazooevk.cloudfront.net" -ForegroundColor Red
    Write-Host "  Removed: CAA records for AWS" -ForegroundColor Red
    Write-Host "  Kept: A @ -> 76.76.21.21 (Vercel)" -ForegroundColor Green
    Write-Host "  Kept: CNAME www -> cname.vercel-dns.com (Vercel)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Wait 5-10 minutes for DNS propagation"
    Write-Host "  2. Vercel will auto-detect and issue SSL for sabalist.com"
    Write-Host "  3. Both sabalist.com and www.sabalist.com will work with HTTPS"
    Write-Host ""

} catch {
    Write-Host "Error occurred during DNS update" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
