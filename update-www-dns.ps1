$token = "J470GE8DaHtBQkOwJiXzKLMharJLWUJzUCZB2rgb5193e574"
$domain = "sabalist.com"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
$baseUrl = "https://developers.hostinger.com/api/dns/v1"

Write-Host "Updating www to: d2gvmmtq2x5ne7.cloudfront.net" -ForegroundColor Cyan

$newZone = @(
    @{
        name = "www"
        type = "CNAME"
        ttl = 300
        records = @(
            @{
                content = "d2gvmmtq2x5ne7.cloudfront.net."
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

$requestPayload = @{ zone = $newZone }
$updateBody = $requestPayload | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "$baseUrl/zones/$domain" -Headers $headers -Method Put -Body $updateBody -ContentType "application/json" | Out-Null
Write-Host "DNS updated! Waiting for verification..." -ForegroundColor Green
