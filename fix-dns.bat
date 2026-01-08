@echo off
echo ========================================
echo Hostinger DNS Fixer for sabalist.com
echo ========================================
echo.
echo This script will:
echo   1. Delete old CAA records (comodoca, digicert, etc.)
echo   2. Add AWS CAA records (amazon.com, amazontrust.com)
echo   3. Add SSL verification CNAME
echo   4. Add domain routing CNAMEs
echo.
echo You need a Hostinger API token to continue.
echo Get it from: https://hpanel.hostinger.com/api-tokens
echo.
set /p API_TOKEN="Enter your Hostinger API token: "

if "%API_TOKEN%"=="" (
    echo.
    echo ERROR: No API token provided!
    echo.
    pause
    exit /b 1
)

echo.
echo Running DNS update...
echo.

powershell.exe -ExecutionPolicy Bypass -File "%~dp0fix-hostinger-dns.ps1" -ApiToken "%API_TOKEN%"

echo.
pause
