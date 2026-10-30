@echo off
title Campus Hub - Share Live Worldwide (Public HTTPS Link)
color 0A
cd /d "%~dp0"

if exist "venv\Scripts\python.exe" (
    venv\Scripts\python.exe share_tunnel.py
) else if exist "..\venv\Scripts\python.exe" (
    ..\venv\Scripts\python.exe share_tunnel.py
) else (
    python share_tunnel.py
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Tunnel ended or failed to start.
    pause
)
