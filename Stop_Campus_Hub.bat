@echo off
title Stop Campus Hub Server
color 0C
echo ======================================================================
echo    Stopping Campus Hub Server...
echo ======================================================================
echo.

cd /d "%~dp0"

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    if not "%%a"=="0" (
        echo Terminating server process PID: %%a
        taskkill /F /PID %%a >nul 2>&1
    )
)

echo.
echo [*] Campus Hub server has been cleanly stopped.
timeout /t 2 >nul
exit
