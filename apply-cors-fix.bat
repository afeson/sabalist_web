@echo off
echo ============================================
echo Firebase Storage CORS Configuration
echo ============================================
echo.

echo Step 1: Authenticating with Google Cloud...
echo.
gcloud auth login

echo.
echo Step 2: Setting project to sabalist...
gcloud config set project sabalist

echo.
echo Step 3: Applying CORS configuration to Firebase Storage...
gsutil cors set cors.json gs://sabalist.firebasestorage.app

echo.
echo Step 4: Verifying CORS configuration...
gsutil cors get gs://sabalist.firebasestorage.app

echo.
echo ============================================
echo CORS configuration complete!
echo ============================================
echo.
echo Next steps:
echo 1. Wait 2-3 minutes for CORS to propagate
echo 2. Go to Firebase Console and add authorized domains:
echo    https://console.firebase.google.com/project/sabalist/authentication/settings
echo.
echo    Add these domains:
echo    - sabalist.com
echo    - www.sabalist.com
echo    - afrilist-mvp.vercel.app
echo.
echo 3. Test Create Listing at https://sabalist.com
echo.
pause
