$token = "J470GE8DaHtBQkOwJiXzKLMharJLWUJzUCZB2rgb5193e574"
$domain = "sabalist.com"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
$baseUrl = "https://developers.hostinger.com/api/dns/v1"

Write-Host "Fixing DNS for Vercel SSL Certificate Issuance" -ForegroundColor Cyan
Write-Host ""
Write-Host "ISSUE: Conflicting DNS records blocking SSL certificate" -ForegroundColor Yellow
Write-Host "  - CloudFront ALIAS record conflicts with Vercel A record" -ForegroundColor Yellow
Write-Host "  - CAA records only allow AWS, blocking Let's Encrypt" -ForegroundColor Yellow
Write-Host "  - AWS validation CNAMEs are not needed" -ForegroundColor Yellow
Write-Host ""

# Clean DNS configuration - Vercel ONLY
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
    # WWW subdomain CNAME pointing to Vercel
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

$requestPayload = @{
    zone = $newZone
}
$updateBody = $requestPayload | ConvertTo-Json -Depth 10

Write-Host "Updating DNS zone to Vercel-only configuration..." -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/zones/$domain" -Headers $headers -Method Put -Body $updateBody -ContentType "application/json"

    Write-Host "✅ DNS UPDATED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host ""
    Write-Host "New DNS configuration:" -ForegroundColor Cyan
    Write-Host "  A     @ -> 76.76.21.21 (Vercel)" -ForegroundColor White
    Write-Host "  CNAME www -> cname.vercel-dns.com (Vercel)" -ForegroundColor White
    Write-Host ""
    Write-Host "Removed conflicting records:" -ForegroundColor Yellow
    Write-Host "  ❌ ALIAS @ -> dw7vwsazooevk.cloudfront.net (CloudFront)" -ForegroundColor Red
    Write-Host "  ❌ CAA @ -> amazon.com, amazontrust.com (AWS only)" -ForegroundColor Red
    Write-Host "  ❌ CNAME _55fb929d28f12bc18903fcc1d5baac73.www -> AWS validation" -ForegroundColor Red
    Write-Host "  ❌ CNAME _a39684f0933de309c0799b5602087b2b -> AWS validation" -ForegroundColor Red
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Wait 5-10 minutes for DNS propagation" -ForegroundColor White
    Write-Host "  2. Vercel will automatically detect clean DNS" -ForegroundColor White
    Write-Host "  3. SSL certificate will be issued for sabalist.com" -ForegroundColor White
    Write-Host "  4. Both sabalist.com and www.sabalist.com will work with HTTPS" -ForegroundColor White
    Write-Host ""
    Write-Host "✅ SSL certificate issuance should complete in 10-30 minutes" -ForegroundColor Green
    Write-Host ""

} catch {
    Write-Host "❌ Error updating DNS zone" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error details: $errorBody" -ForegroundColor Red
    }
}
