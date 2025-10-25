@echo off
echo ============================================
echo   NFT MARKETPLACE - INSTALL DEPENDENCIES
echo ============================================
echo.
echo WARNING: Run this file as Administrator!
echo Right-click and select "Run as administrator"
echo.
pause

echo [1/4] Cleaning old installations...
if exist node_modules (
    echo Removing node_modules...
    rmdir /s /q node_modules
)
if exist yarn.lock (
    echo Removing yarn.lock...
    del /f yarn.lock
)
if exist package-lock.json (
    echo Removing package-lock.json...
    del /f package-lock.json
)
echo.

echo [2/4] Checking Node.js version...
node --version
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js not found! Please install Node.js v18 or higher.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)
echo.

echo [3/4] Installing dependencies with npm...
echo This may take 3-5 minutes...
echo.
npm install --legacy-peer-deps
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Installation failed!
    echo Try running this file as Administrator.
    pause
    exit /b 1
)
echo.

echo [4/4] Installation completed successfully!
echo.
echo ============================================
echo   NEXT STEPS:
echo ============================================
echo 1. Start Subsquid Indexer (if not running):
echo    docker-compose -f docker-compose.indexer.yml up -d
echo.
echo 2. Start Frontend:
echo    Double-click: start-app.bat
echo    OR run: cd apps\app ^&^& npx next dev
echo.
echo 3. Open browser: http://localhost:3000
echo ============================================
echo.
pause
