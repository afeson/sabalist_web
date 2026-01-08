# Firebase Storage CORS Fix - Interactive Script
# This will guide you through fixing CORS step by step

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FIREBASE STORAGE CORS FIX" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "This script will help you fix Create Listing on Vercel" -ForegroundColor White
Write-Host ""

# Step 1: Authenticate with Google Cloud
Write-Host "STEP 1: Authenticate with Google Cloud" -ForegroundColor Yellow
Write-Host "---------------------------------------" -ForegroundColor Gray
Write-Host ""
Write-Host "Setting project to 'sabalist'..." -ForegroundColor White
gcloud config set project sabalist

Write-Host ""
Write-Host "Opening browser for authentication..." -ForegroundColor White
Write-Host "Please sign in with your Google account that owns the Firebase project." -ForegroundColor Yellow
Write-Host ""

# Start authentication
gcloud auth login

Write-Host ""
Write-Host "Authentication complete!" -ForegroundColor Green
Write-Host ""

# Step 2: Apply CORS configuration
Write-Host "STEP 2: Apply CORS Configuration" -ForegroundColor Yellow
Write-Host "---------------------------------" -ForegroundColor Gray
Write-Host ""
Write-Host "Applying CORS to Firebase Storage bucket..." -ForegroundColor White
Write-Host ""

$result = gsutil cors set cors.json gs://sabalist.firebasestorage.app 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS! CORS configuration applied!" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "ERROR: Failed to apply CORS configuration" -ForegroundColor Red
    Write-Host "Error details: $result" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please use the Google Cloud Console instead:" -ForegroundColor Yellow
    Write-Host "https://console.cloud.google.com/storage/browser" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

# Step 3: Verify CORS was applied
Write-Host "STEP 3: Verify CORS Configuration" -ForegroundColor Yellow
Write-Host "----------------------------------" -ForegroundColor Gray
Write-Host ""
Write-Host "Checking CORS configuration..." -ForegroundColor White
Write-Host ""

$corsConfig = gsutil cors get gs://sabalist.firebasestorage.app 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "CORS Configuration:" -ForegroundColor Green
    Write-Host $corsConfig -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "Warning: Could not verify CORS configuration" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  CORS CONFIGURATION COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Next steps
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Wait 2-3 minutes for CORS to propagate globally" -ForegroundColor White
Write-Host ""
Write-Host "2. Add Firebase Authorized Domains:" -ForegroundColor White
Write-Host "   https://console.firebase.google.com/project/sabalist/authentication/settings" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Click 'Add domain' and add:" -ForegroundColor Gray
Write-Host "   - sabalist.com" -ForegroundColor Gray
Write-Host "   - www.sabalist.com" -ForegroundColor Gray
Write-Host "   - afrilist-mvp.vercel.app" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Add Vercel Environment Variables:" -ForegroundColor White
Write-Host "   https://vercel.com/team_RAjA5rDelmgg6P6vDbgFuZDS/afrilist-mvp/settings/environment-variables" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Add these 7 variables (check Production, Preview, Development for each):" -ForegroundColor Gray
Write-Host "   - EXPO_PUBLIC_FIREBASE_API_KEY = AIzaSyBTy0WJrU9YCCBzlseDjpbhu9RGYvyQ7sk" -ForegroundColor Gray
Write-Host "   - EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN = sabalist.firebaseapp.com" -ForegroundColor Gray
Write-Host "   - EXPO_PUBLIC_FIREBASE_PROJECT_ID = sabalist" -ForegroundColor Gray
Write-Host "   - EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET = sabalist.firebasestorage.app" -ForegroundColor Gray
Write-Host "   - EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = 231273918004" -ForegroundColor Gray
Write-Host "   - EXPO_PUBLIC_FIREBASE_APP_ID = 1:231273918004:web:0020dcc14b7f52e3356461" -ForegroundColor Gray
Write-Host "   - EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID = G-LGGRMQBGSD" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Redeploy on Vercel (Deployments -> ... -> Redeploy)" -ForegroundColor White
Write-Host ""
Write-Host "5. Test Create Listing at https://sabalist.com" -ForegroundColor White
Write-Host ""

$openFirebase = Read-Host "Open Firebase Console to add authorized domains? (y/n)"
if ($openFirebase -eq "y" -or $openFirebase -eq "Y") {
    Start-Process "https://console.firebase.google.com/project/sabalist/authentication/settings"
    Write-Host "Opened Firebase Console" -ForegroundColor Green
}

Write-Host ""
$openVercel = Read-Host "Open Vercel to add environment variables? (y/n)"
if ($openVercel -eq "y" -or $openVercel -eq "Y") {
    Start-Process "https://vercel.com/team_RAjA5rDelmgg6P6vDbgFuZDS/afrilist-mvp/settings/environment-variables"
    Write-Host "Opened Vercel Environment Variables" -ForegroundColor Green
}

Write-Host ""
Write-Host "Done! Please complete the next steps above." -ForegroundColor Cyan
Write-Host ""
pause
