@echo off
REM Sabalist Web Deployment Script
REM Builds and deploys web app to Vercel

echo.
echo ========================================
echo   SABALIST WEB DEPLOYMENT
echo ========================================
echo.

REM Step 1: Build
echo [1/3] Building web app...
echo.
call npm run build:web

if %errorlevel% neq 0 (
    echo.
    echo ❌ Build failed!
    echo Check the error messages above.
    pause
    exit /b 1
)

echo.
echo ✅ Build successful!
echo.

REM Step 2: Verify build
echo [2/3] Verifying build output...
if exist "dist\index.html" (
    echo ✅ Build output verified
) else (
    echo ❌ Build output not found
    echo Expected: dist\index.html
    pause
    exit /b 1
)

echo.

REM Step 3: Ready to deploy
echo [3/3] Ready to deploy
echo.
echo ========================================
echo   DEPLOYMENT OPTIONS
echo ========================================
echo.
echo 1. Deploy with Vercel CLI (automatic)
echo 2. Manual deployment instructions
echo.
set /p choice="Choose option (1 or 2): "

if "%choice%"=="1" (
    echo.
    echo Deploying to Vercel...
    echo.
    vercel --prod

    if %errorlevel% neq 0 (
        echo.
        echo ❌ Deployment failed
        echo.
        echo Make sure you have:
        echo 1. Installed Vercel CLI: npm i -g vercel
        echo 2. Logged in: vercel login
        pause
        exit /b 1
    )

    echo.
    echo ✅ Deployment complete!
) else (
    echo.
    echo ========================================
    echo   MANUAL DEPLOYMENT STEPS
    echo ========================================
    echo.
    echo 1. Go to https://vercel.com/dashboard
    echo 2. Click "Add New" -^> "Project"
    echo 3. Import your Git repository
    echo 4. Framework Preset: Other
    echo 5. Build Command: npx expo export:web
    echo 6. Output Directory: dist
    echo 7. Click "Deploy"
    echo.
    echo OR use Vercel CLI:
    echo   npm i -g vercel
    echo   vercel login
    echo   vercel --prod
    echo.
)

echo.
echo ========================================
echo   POST-DEPLOYMENT CHECKLIST
echo ========================================
echo.
echo [ ] Test app at your Vercel URL
echo [ ] Test /delete-account page
echo [ ] Set environment variables in Vercel
echo [ ] Test Firebase auth
echo [ ] Add URL to Google Play Console
echo.
echo Environment variables needed in Vercel:
echo   EXPO_PUBLIC_FIREBASE_API_KEY
echo   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
echo   EXPO_PUBLIC_FIREBASE_PROJECT_ID
echo   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
echo   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
echo   EXPO_PUBLIC_FIREBASE_APP_ID
echo   EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
echo.
echo See .env file for values
echo.
pause
