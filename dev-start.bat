@echo off
title EventNow Dev

echo [1/3] Stopping OneDrive to prevent file locks...
taskkill /F /IM OneDrive.exe >/dev/null 2>&1
timeout /t 1 /nobreak >/dev/null

echo [2/3] Starting services...
set ROOT=%~dp0

start "BACKEND"  cmd /k "cd /d "%ROOT%backend-api" && npm run dev"
start "FRONTEND" cmd /k "cd /d "%ROOT%eventconnect-frontend" && npm run dev"
start "MOBILE"   cmd /k "cd /d "%ROOT%mobile-app" && npx expo start --clear"

echo [3/3] All services started!
echo.
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:3000
echo   Mobile:   scan QR with Expo Go
echo.
echo When done developing, run dev-stop.bat to restart OneDrive.
