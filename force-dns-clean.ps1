$token = "J470GE8DaHtBQkOwJiXzKLMharJLWUJzUCZB2rgb5193e574"
$domain = "sabalist.com"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
$baseUrl = "https://developers.hostinger.com/api/dns/v1"

Write-Host "Force cleaning DNS - Vercel ONLY configuration" -ForegroundColor Cyan
Write-Host ""

# Absolute minimal configuration
$cleanZone = @{
    zone = @(
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
        @{
            name = "www"
            type = "CNAME"
            ttl = 3600
            records = @(
                @{
                    content = "cname.vercel-dns.com."
                    is_disabled = $false
                }
            )
        }
    )
}

$body = $cleanZone | ConvertTo-Json -Depth 10 -Compress

Write-Host "Sending update to Hostinger API..." -ForegroundColor Yellow
Write-Host "Request body:" -ForegroundColor Gray
Write-Host $body -ForegroundColor DarkGray
Write-Host ""

try {
    $response = Invoke-RestMethod `
        -Uri "$baseUrl/zones/$domain" `
        -Headers $headers `
        -Method Put `
        -Body $body `
        -ContentType "application/json" `
        -Verbose

    Write-Host "✅ SUCCESS! DNS zone updated" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 5
    Write-Host ""

    # Verify the change
    Start-Sleep -Seconds 2
    Write-Host "Verifying changes..." -ForegroundColor Yellow
    $verify = Invoke-RestMethod -Uri "$baseUrl/zones/$domain" -Headers $headers -Method Get

    Write-Host ""
    Write-Host "Current records in Hostinger:" -ForegroundColor Cyan
    foreach ($rec in $verify.zone) {
        Write-Host "  $($rec.type) $($rec.name) -> $($rec.records[0].content)" -ForegroundColor White
    }

} catch {
    Write-Host "❌ ERROR!" -ForegroundColor Red
    Write-Host "Message: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red

    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}
