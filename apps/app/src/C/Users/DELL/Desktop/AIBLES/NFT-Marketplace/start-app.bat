@echo off
echo ============================================
echo   NFT MARKETPLACE - START FRONTEND
echo ============================================
echo.

echo [1/3] Checking Node version...
node --version
echo.

echo [2/3] Moving to app directory...
cd apps\app
echo Current directory: %CD%
echo.

echo [3/3] Starting Next.js development server...
echo Frontend will be available at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

npx next dev

pause
