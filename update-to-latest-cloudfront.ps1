$token = "J470GE8DaHtBQkOwJiXzKLMharJLWUJzUCZB2rgb5193e574"
$domain = "sabalist.com"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
$baseUrl = "https://developers.hostinger.com/api/dns/v1"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Updating DNS to Latest CloudFront" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "New CloudFront: dw7vwsazooevk.cloudfront.net" -ForegroundColor White
Write-Host ""

$newZone = @(
    @{
        name = "@"
        type = "CNAME"
        ttl = 300
        records = @(
            @{
                content = "dw7vwsazooevk.cloudfront.net."
                is_disabled = $false
            }
        )
    },
    @{
        name = "www"
        type = "CNAME"
        ttl = 300
        records = @(
            @{
                content = "dw7vwsazooevk.cloudfront.net."
                is_disabled = $false
            }
        )
    },
    @{
        name = "_a39684f0933de309c0799b5602087b2b"
        type = "CNAME"
        ttl = 300
        records = @(
            @{
                content = "_82394b3d74094c1ec49bf7f3c55b791a.jkddzztszm.acm-validations.aws."
                is_disabled = $false
            }
        )
    },
    @{
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
)

$requestPayload = @{
    zone = $newZone
}
$updateBody = $requestPayload | ConvertTo-Json -Depth 10

try {
    Invoke-RestMethod -Uri "$baseUrl/zones/$domain" -Headers $headers -Method Put -Body $updateBody -ContentType "application/json" | Out-Null
    Write-Host "DNS updated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Waiting for AWS Amplify to verify domain..." -ForegroundColor Yellow
    Write-Host "This typically takes 5-15 minutes" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "Failed to update DNS" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
