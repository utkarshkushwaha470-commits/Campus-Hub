@echo off
title Campus Hub - Allenhouse Institute of Technology
color 0B
echo ======================================================================
echo    CAMPUS HUB - ALLENHOUSE INSTITUTE OF TECHNOLOGY
echo    Chief Administrator: UTKARSH KUSHWAHA
echo ======================================================================
echo.

cd /d "%~dp0"

:: 1. Check for Python
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not found in PATH!
    echo Please install Python 3.10+ from python.org and check "Add Python to PATH".
    echo.
    pause
    exit /b 1
)

:: 2. Check if virtualenv exists, create if missing
if not exist "%~dp0venv\Scripts\python.exe" (
    echo [*] Setting up virtual environment for the first time...
    python -m venv "%~dp0venv"
    echo [*] Installing dependencies from requirements.txt...
    "%~dp0venv\Scripts\pip.exe" install -r "%~dp0requirements.txt"
)

:: 3. Kill any zombie process holding port 8000 before launch
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    if not "%%a"=="0" (
        taskkill /F /PID %%a >nul 2>&1
    )
)

echo [*] Starting Campus Hub Local Server...
echo [*] Browser will open automatically at http://localhost:8000
echo.

"%~dp0venv\Scripts\python.exe" "%~dp0run.py"

if %ERRORLEVEL% neq 0 (
    echo.
    echo [NOTE] Server terminated with exit code %ERRORLEVEL%.
    pause
)
