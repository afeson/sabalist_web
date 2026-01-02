#!/bin/bash

# Deploy Account Deletion Page to Firebase Hosting
# Usage: bash DEPLOY_DELETE_PAGE.sh

echo "🚀 Deploying Sabalist Account Deletion Page..."
echo ""

# Create public directory if it doesn't exist
if [ ! -d "public" ]; then
    echo "📁 Creating public directory..."
    mkdir -p public
fi

# Create delete-account subdirectory
echo "📁 Creating delete-account directory..."
mkdir -p public/delete-account

# Copy the HTML file
echo "📄 Copying delete-account.html..."
cp delete-account.html public/delete-account/index.html

# Check if Firebase is initialized
if [ ! -f "firebase.json" ]; then
    echo "❌ Error: firebase.json not found"
    echo "Run: firebase init hosting"
    exit 1
fi

# Deploy to Firebase Hosting
echo ""
echo "🔥 Deploying to Firebase Hosting..."
firebase deploy --only hosting

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Your deletion page is now live at:"
echo "  https://sabalist.web.app/delete-account"
echo "  https://sabalist.firebaseapp.com/delete-account"
echo ""
echo "Next steps:"
echo "1. Visit the URL to verify it works"
echo "2. Test on mobile device"
echo "3. Add URL to Google Play Console → Data safety"
echo ""
