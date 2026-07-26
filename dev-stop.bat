@echo off
title Stopping Dev

echo Stopping dev servers...
taskkill /F /IM node.exe >/dev/null 2>&1

echo Restarting OneDrive...
start "" "%LOCALAPPDATA%\Microsoft\OneDrive\OneDrive.exe"

echo Done. OneDrive is syncing again.
