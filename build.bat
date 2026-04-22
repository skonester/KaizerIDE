@echo off
echo ========================================
echo  KaizerIDE Build Script
echo ========================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Running as Administrator
) else (
    echo [WARNING] Not running as Administrator
    echo Some features may not work properly
)
echo.

REM Set environment variables to skip code signing
set CSC_IDENTITY_AUTO_DISCOVERY=false
set WIN_CSC_LINK=
set WIN_CSC_KEY_PASSWORD=

echo [1/3] Cleaning old build...
if exist "dist" rmdir /s /q "dist"
if exist "release" rmdir /s /q "release"
echo [OK] Cleaned

echo.
echo [2/3] Building React app with Vite...
call npm run build
if %errorLevel% neq 0 (
    echo [ERROR] Vite build failed!
    pause
    exit /b 1
)
echo [OK] Vite build complete

echo.
echo [3/3] Packaging with Electron Builder...
call npx electron-builder --win --x64 --dir
if %errorLevel% neq 0 (
    echo [ERROR] Electron Builder failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo  BUILD COMPLETE!
echo ========================================
echo.
echo Your app is ready at:
echo   release\win-unpacked\KaizerIDE.exe
echo.
echo You can run it directly or create a shortcut.
echo.
pause
