@echo off
title FanRenWenDao - Local Server
cd /d "%~dp0."

echo.
echo  ============================================
echo    FanRenWenDao - One-Click Launcher
echo  ============================================
echo.

rem ---- Check Node.js ----
where node >nul 2>nul
if errorlevel 1 (
    echo  [ERROR] Node.js not found. Please install: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

rem ---- If port 8341 already serving, just open the browser ----
netstat -ano 2>nul | findstr ":8341" | findstr "LISTENING" >nul 2>nul
if not errorlevel 1 (
    echo  [INFO] Server is already running. Opening the game page...
    start "" "http://localhost:8341/index.html"
    echo.
    echo  You can close this window now.
    ping -n 5 127.0.0.1 >nul
    exit /b 0
)

echo  [START] Serving at http://localhost:8341
echo  [TIP]   Browser will open automatically. Press Ctrl+C to stop.
echo.

rem ---- Open the game in default browser after 1 second ----
start "" cmd /c "ping -n 2 127.0.0.1 >nul & start http://localhost:8341/index.html"

node server.mjs
pause
