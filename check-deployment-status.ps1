# Check Sabalist Deployment Status
# Run this to verify the latest code is deployed and working

Write-Host "`n=== SABALIST DEPLOYMENT STATUS CHECK ===" -ForegroundColor Cyan
Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n" -ForegroundColor Gray

# 1. Check Git Status
Write-Host "1. Git Repository Status" -ForegroundColor Yellow
Write-Host "   Latest commit:" -ForegroundColor Gray
git log -1 --oneline
Write-Host "   Branch status:" -ForegroundColor Gray
git status -sb
Write-Host ""

# 2. Check if code is pushed to remote
Write-Host "2. Remote Sync Status" -ForegroundColor Yellow
$local = git rev-parse HEAD
$remote = git rev-parse origin/master
if ($local -eq $remote) {
    Write-Host "   ✅ Local and remote are in sync" -ForegroundColor Green
    Write-Host "   Commit: $local" -ForegroundColor Gray
} else {
    Write-Host "   ❌ Local and remote are OUT OF SYNC!" -ForegroundColor Red
    Write-Host "   Local:  $local" -ForegroundColor Gray
    Write-Host "   Remote: $remote" -ForegroundColor Gray
    Write-Host "   Action: Run 'git push origin master' to deploy latest changes" -ForegroundColor Yellow
}
Write-Host ""

# 3. Check live site availability
Write-Host "3. Live Site Status (https://sabalist.com)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://sabalist.com" -Method Head -TimeoutSec 10 -UseBasicParsing
    Write-Host "   ✅ Site is ONLINE" -ForegroundColor Green
    Write-Host "   HTTP Status: $($response.StatusCode) $($response.StatusDescription)" -ForegroundColor Gray
    Write-Host "   Server: $($response.Headers['Server'])" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Site is OFFLINE or unreachable" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
}
Write-Host ""

# 4. Check if Firebase config exists
Write-Host "4. Firebase Configuration" -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "   ✅ .env file found" -ForegroundColor Green
    $envContent = Get-Content .env
    $hasApiKey = $envContent | Where-Object { $_ -match "EXPO_PUBLIC_FIREBASE_API_KEY" }
    $hasProjectId = $envContent | Where-Object { $_ -match "EXPO_PUBLIC_FIREBASE_PROJECT_ID" }
    if ($hasApiKey -and $hasProjectId) {
        Write-Host "   ✅ Firebase credentials configured" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Firebase credentials may be incomplete" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  .env file not found" -ForegroundColor Yellow
}
Write-Host ""

# 5. Check critical source files
Write-Host "5. Critical Source Files" -ForegroundColor Yellow
$criticalFiles = @(
    "src/lib/firebase.web.js",
    "src/lib/firebaseFactory.js",
    "src/screens/NotificationsScreen.js",
    "src/screens/CreateListingScreen.js",
    "src/services/listings.web.js"
)

foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        $lastMod = (Get-Item $file).LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
        Write-Host "   ✅ $file" -ForegroundColor Green
        Write-Host "      Modified: $lastMod" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ $file (MISSING!)" -ForegroundColor Red
    }
}
Write-Host ""

# 6. Check for recent fixes
Write-Host "6. Recent Critical Fixes" -ForegroundColor Yellow
Write-Host "   Checking last 5 commits..." -ForegroundColor Gray
git log --oneline -5 --pretty=format:"   %C(green)✓%Creset %s" --color=always
Write-Host "`n"

# 7. Check if build artifacts exist
Write-Host "7. Build Output" -ForegroundColor Yellow
if (Test-Path "dist") {
    $distSize = (Get-ChildItem "dist" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "   ✅ dist/ folder exists" -ForegroundColor Green
    Write-Host "      Size: $([math]::Round($distSize, 2)) MB" -ForegroundColor Gray

    if (Test-Path "dist/index.html") {
        Write-Host "   ✅ dist/index.html exists" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  dist/index.html missing - run 'npm run build'" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  dist/ folder not found" -ForegroundColor Yellow
    Write-Host "      Run 'npm run build' to create production build" -ForegroundColor Gray
}
Write-Host ""

# Summary
Write-Host "=== SUMMARY ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Latest Deploy: Commit 2d178aa" -ForegroundColor Gray
Write-Host "Fixes Applied:" -ForegroundColor Gray
Write-Host "  • Firebase re-initialization crash" -ForegroundColor Gray
Write-Host "  • NotificationsScreen doc() error" -ForegroundColor Gray
Write-Host "  • Missing getDoc method" -ForegroundColor Gray
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Visit https://sabalist.com" -ForegroundColor White
Write-Host "  2. Open browser console (F12)" -ForegroundColor White
Write-Host "  3. Look for:" -ForegroundColor White
Write-Host "     • '🔥 Firebase Web SDK initialized:' log" -ForegroundColor Gray
Write-Host "     • '🔧 Firebase factory initialized for platform: web' log" -ForegroundColor Gray
Write-Host "  4. Try creating a listing to verify the fix" -ForegroundColor White
Write-Host ""
Write-Host "To check if your posts are showing:" -ForegroundColor Yellow
Write-Host "  1. Go to Home/Discover page" -ForegroundColor White
Write-Host "  2. Your recent listings should appear" -ForegroundColor White
Write-Host "  3. Check 'My Listings' in profile" -ForegroundColor White
Write-Host ""

# Optional: Open browser to live site
$openSite = Read-Host "Open https://sabalist.com in browser? (y/n)"
if ($openSite -eq "y" -or $openSite -eq "Y") {
    Start-Process "https://sabalist.com"
    Write-Host "✅ Opened browser" -ForegroundColor Green
}

Write-Host "`nDone!`n" -ForegroundColor Cyan
