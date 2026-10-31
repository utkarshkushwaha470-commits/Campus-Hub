@echo off
title Campus Hub - Connect to Chief Administrator UTKARSH KUSHWAHA's Server
color 0B
cd /d "%~dp0"

if exist "venv\Scripts\python.exe" (
    venv\Scripts\python.exe connect_host.py
) else if exist "..\venv\Scripts\python.exe" (
    ..\venv\Scripts\python.exe connect_host.py
) else (
    python connect_host.py
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo If Python is not installed, open the live link directly in your browser:
    type LIVE_SERVER_URL.txt 2>nul
    echo.
    pause
)
