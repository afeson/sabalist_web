# Update DNS records for Vercel deployment
$apiToken = "J470GE8DaHtBQkOwJiXzKLMharJLWUJzUCZB2rgb5193e574"
$domain = "sabalist.com"
$headers = @{
    "Authorization" = "Bearer $apiToken"
    "Content-Type" = "application/json"
}

Write-Host "Fetching current DNS records for $domain..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "https://api.hostinger.com/dns/v1/domains/$domain/records" -Headers $headers -Method Get
    Write-Host "Current DNS records fetched successfully" -ForegroundColor Green

    $recordsToDelete = $response.records | Where-Object {
        ($_.type -eq "A" -and ($_.name -eq "@" -or $_.name -eq "www")) -or
        ($_.type -eq "CNAME" -and ($_.name -eq "@" -or $_.name -eq "www"))
    }

    Write-Host "Deleting conflicting records..." -ForegroundColor Yellow
    foreach ($record in $recordsToDelete) {
        Write-Host "Deleting $($record.type) record: $($record.name) -> $($record.content)" -ForegroundColor Yellow
        try {
            Invoke-RestMethod -Uri "https://api.hostinger.com/dns/v1/domains/$domain/records/$($record.id)" -Headers $headers -Method Delete
            Write-Host "  Deleted successfully" -ForegroundColor Green
        } catch {
            Write-Host "  Error deleting record" -ForegroundColor Red
        }
    }

    Write-Host "Adding new Vercel DNS records..." -ForegroundColor Cyan

    # Add A record for root domain
    $rootARecord = @{
        type = "A"
        name = "@"
        content = "76.76.21.21"
        ttl = 3600
    } | ConvertTo-Json

    Invoke-RestMethod -Uri "https://api.hostinger.com/dns/v1/domains/$domain/records" -Headers $headers -Method Post -Body $rootARecord
    Write-Host "Added A record: @ -> 76.76.21.21" -ForegroundColor Green

    # Add A record for www subdomain
    $wwwARecord = @{
        type = "A"
        name = "www"
        content = "76.76.21.21"
        ttl = 3600
    } | ConvertTo-Json

    Invoke-RestMethod -Uri "https://api.hostinger.com/dns/v1/domains/$domain/records" -Headers $headers -Method Post -Body $wwwARecord
    Write-Host "Added A record: www -> 76.76.21.21" -ForegroundColor Green

    Write-Host ""
    Write-Host "DNS UPDATE COMPLETE!" -ForegroundColor Green
    Write-Host "Your domain is now configured for Vercel:" -ForegroundColor Cyan
    Write-Host "  sabalist.com -> 76.76.21.21" -ForegroundColor White
    Write-Host "  www.sabalist.com -> 76.76.21.21" -ForegroundColor White
    Write-Host ""
    Write-Host "Note: DNS propagation may take 5-10 minutes." -ForegroundColor Yellow

} catch {
    Write-Host "Error occurred during DNS update" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
