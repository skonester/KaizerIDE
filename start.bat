@echo off
title KaizerIDE Launcher
echo.
echo ========================================
echo    Starting KaizerIDE...
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [INFO] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies
        exit /b 1
    )
    echo.
)

echo [INFO] Launching KaizerIDE in development mode...
echo.
call npm run dev

REM If npm run dev exits, pause to see any errors
if errorlevel 1 (
    echo.
    echo [ERROR] KaizerIDE exited with an error
)
