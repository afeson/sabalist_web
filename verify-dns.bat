@echo off
echo ========================================
echo Verifying DNS Records for sabalist.com
echo ========================================
echo.

echo Checking CNAME for SSL verification...
nslookup -type=CNAME _a39684f0933de309c0799b5602087b2b.sabalist.com 8.8.8.8
echo.

echo Checking root domain CNAME...
nslookup sabalist.com 8.8.8.8
echo.

echo Checking www subdomain CNAME...
nslookup www.sabalist.com 8.8.8.8
echo.

echo Checking AWS Amplify domain status...
aws amplify get-domain-association --app-id d2hef9d7y3mss4 --domain-name sabalist.com --region us-east-1 --query "domainAssociation.domainStatus" --output text
echo.

echo ========================================
echo Run this script after updating DNS in Hostinger
echo DNS propagation may take 5-30 minutes
echo ========================================
pause
