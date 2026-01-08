# Add Firebase Environment Variables to Vercel
# This script helps you add all required Firebase env vars to your Vercel project

Write-Host "`n=== ADD FIREBASE ENVIRONMENT VARIABLES TO VERCEL ===" -ForegroundColor Cyan
Write-Host ""

# Load environment variables from .env file
if (Test-Path ".env") {
    Write-Host "Reading Firebase credentials from .env file..." -ForegroundColor Yellow
    $envVars = Get-Content .env | Where-Object { $_ -match "^EXPO_PUBLIC_FIREBASE" }

    Write-Host "`nFound the following Firebase variables:" -ForegroundColor Green
    foreach ($line in $envVars) {
        if ($line -match "^([^=]+)=(.+)$") {
            $key = $matches[1]
            $value = $matches[2]
            Write-Host "  $key = $value" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "ERROR: .env file not found!" -ForegroundColor Red
    Write-Host "Please create a .env file with your Firebase credentials." -ForegroundColor Yellow
    exit 1
}

Write-Host "`n=== OPTION 1: Manual Setup (Recommended) ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Go to: https://vercel.com/dashboard" -ForegroundColor White
Write-Host "2. Select your project: 'afrilist-mvp'" -ForegroundColor White
Write-Host "3. Go to: Settings → Environment Variables" -ForegroundColor White
Write-Host "4. Add these 7 variables (copy-paste from below):" -ForegroundColor White
Write-Host ""

# Parse and display each variable
$envContent = Get-Content .env
foreach ($line in $envContent) {
    if ($line -match "^EXPO_PUBLIC_FIREBASE_([^=]+)=(.+)$") {
        $varName = "EXPO_PUBLIC_FIREBASE_$($matches[1])"
        $varValue = $matches[2]
        Write-Host "   Variable Name: $varName" -ForegroundColor Cyan
        Write-Host "   Value: $varValue" -ForegroundColor Green
        Write-Host "   Environments: Production, Preview, Development (check all 3)" -ForegroundColor Gray
        Write-Host ""
    }
}

Write-Host "5. Click 'Save' after adding all variables" -ForegroundColor White
Write-Host "6. Redeploy your app (Deployments → ... → Redeploy)" -ForegroundColor White

Write-Host "`n=== OPTION 2: Using Vercel CLI ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "Prerequisites:" -ForegroundColor Gray
Write-Host "  npm install -g vercel" -ForegroundColor White
Write-Host "  vercel login" -ForegroundColor White
Write-Host ""
Write-Host "Then run these commands:" -ForegroundColor Gray
Write-Host ""

# Generate Vercel CLI commands
foreach ($line in $envContent) {
    if ($line -match "^(EXPO_PUBLIC_FIREBASE_[^=]+)=(.+)$") {
        $varName = $matches[1]
        $varValue = $matches[2]
        Write-Host "vercel env add $varName production" -ForegroundColor White
        Write-Host "  (paste value: $varValue)" -ForegroundColor Gray
        Write-Host "vercel env add $varName preview" -ForegroundColor White
        Write-Host "  (paste value: $varValue)" -ForegroundColor Gray
        Write-Host "vercel env add $varName development" -ForegroundColor White
        Write-Host "  (paste value: $varValue)" -ForegroundColor Gray
        Write-Host ""
    }
}

Write-Host "After adding all variables, redeploy:" -ForegroundColor White
Write-Host "  vercel --prod" -ForegroundColor Cyan
Write-Host ""

Write-Host "=== VERIFICATION ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "After redeployment, verify environment variables are working:" -ForegroundColor White
Write-Host ""
Write-Host "1. Visit https://sabalist.com" -ForegroundColor White
Write-Host "2. Open browser console (F12)" -ForegroundColor White
Write-Host "3. Look for this log:" -ForegroundColor White
Write-Host ""
Write-Host "   🔥 Firebase Web SDK initialized: {" -ForegroundColor Green
Write-Host "     hasAuth: true," -ForegroundColor Green
Write-Host "     hasConfig: true,  // ← Must be TRUE" -ForegroundColor Green
Write-Host "     projectId: 'sabalist'  // ← Must have value" -ForegroundColor Green
Write-Host "   }" -ForegroundColor Green
Write-Host ""
Write-Host "4. If hasConfig is FALSE or projectId is undefined:" -ForegroundColor Yellow
Write-Host "   → Environment variables are not configured correctly" -ForegroundColor Red
Write-Host "   → Double-check Vercel dashboard and redeploy" -ForegroundColor Red
Write-Host ""

Write-Host "=== TROUBLESHOOTING ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "If Create Listing still fails after adding env vars:" -ForegroundColor White
Write-Host ""
Write-Host "1. Hard refresh browser (Ctrl+Shift+R)" -ForegroundColor Gray
Write-Host "2. Check Vercel build logs for errors" -ForegroundColor Gray
Write-Host "3. Verify all 7 variables are added (not 6, not 8)" -ForegroundColor Gray
Write-Host "4. Ensure values don't have quotes (paste raw values)" -ForegroundColor Gray
Write-Host "5. Check that environment types are selected (Production/Preview/Development)" -ForegroundColor Gray
Write-Host ""

Write-Host "For detailed explanation, see:" -ForegroundColor Cyan
Write-Host "  WHY_AMPLIFY_WORKS_VERCEL_FAILS.md" -ForegroundColor White
Write-Host ""

# Ask if user wants to open Vercel dashboard
$openVercel = Read-Host "Open Vercel dashboard now? (y/n)"
if ($openVercel -eq "y" -or $openVercel -eq "Y") {
    Start-Process "https://vercel.com/team_RAjA5rDelmgg6P6vDbgFuZDS/afrilist-mvp/settings/environment-variables"
    Write-Host "✅ Opened Vercel Environment Variables page" -ForegroundColor Green
}

Write-Host "`nDone!`n" -ForegroundColor Cyan
