@echo off
REM Deploy Account Deletion Page to Firebase Hosting
REM Usage: DEPLOY_DELETE_PAGE.bat

echo.
echo 🚀 Deploying Sabalist Account Deletion Page...
echo.

REM Create public directory if it doesn't exist
if not exist "public" (
    echo 📁 Creating public directory...
    mkdir public
)

REM Create delete-account subdirectory
echo 📁 Creating delete-account directory...
if not exist "public\delete-account" mkdir public\delete-account

REM Copy the HTML file
echo 📄 Copying delete-account.html...
copy /Y delete-account.html public\delete-account\index.html > nul

REM Check if Firebase is initialized
if not exist "firebase.json" (
    echo ❌ Error: firebase.json not found
    echo Run: firebase init hosting
    exit /b 1
)

REM Deploy to Firebase Hosting
echo.
echo 🔥 Deploying to Firebase Hosting...
call firebase deploy --only hosting

echo.
echo ✅ Deployment complete!
echo.
echo Your deletion page is now live at:
echo   https://sabalist.web.app/delete-account
echo   https://sabalist.firebaseapp.com/delete-account
echo.
echo Next steps:
echo 1. Visit the URL to verify it works
echo 2. Test on mobile device
echo 3. Add URL to Google Play Console -^> Data safety
echo.
pause
