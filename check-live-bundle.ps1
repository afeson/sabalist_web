# Check which bundle sabalist.com is serving
Write-Host "Checking sabalist.com bundle version..." -ForegroundColor Cyan
Write-Host ""

$response = Invoke-WebRequest -Uri "https://sabalist.com/" -UseBasicParsing 2>$null
$bundle = if ($response.Content -match 'main\.([a-f0-9]+)\.js') { $matches[1] } else { "not found" }

Write-Host "Current bundle hash: " -NoNewline
if ($bundle -eq "f616e046") {
    Write-Host "$bundle " -ForegroundColor Red -NoNewline
    Write-Host "(OLD - CDN not updated yet)" -ForegroundColor Yellow
} elseif ($bundle -eq "749d63b7") {
    Write-Host "$bundle " -ForegroundColor Green -NoNewline
    Write-Host "(NEW - CDN updated! ✓)" -ForegroundColor Green
} else {
    Write-Host "$bundle " -ForegroundColor Magenta -NoNewline
    Write-Host "(Unknown version)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Expected NEW bundle: " -ForegroundColor Cyan -NoNewline
Write-Host "749d63b7" -ForegroundColor Green
Write-Host ""

if ($bundle -eq "f616e046") {
    Write-Host "CDN is still serving old cached version." -ForegroundColor Yellow
    Write-Host "Try these options:" -ForegroundColor White
    Write-Host "  1. Hard refresh in browser (Ctrl+Shift+R)" -ForegroundColor Gray
    Write-Host "  2. Open DevTools, check 'Disable cache', refresh" -ForegroundColor Gray
    Write-Host "  3. Wait 5-10 more minutes for CDN propagation" -ForegroundColor Gray
    Write-Host "  4. Try: https://sabalist.com/?v=549b847" -ForegroundColor Gray
} elseif ($bundle -eq "749d63b7") {
    Write-Host "SUCCESS! CDN has been updated." -ForegroundColor Green
    Write-Host "You can now test Create Listing with the new code." -ForegroundColor Green
}

Write-Host ""
