@echo off
chcp 65001 >nul
powershell -ExecutionPolicy Bypass -File "%~dp0connect-samsung.ps1"
pause
