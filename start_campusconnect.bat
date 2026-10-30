@echo off
title Brogrammers Local Server
echo ========================================================
echo   Launching Brogrammers PWA Server
echo   College: Apex Institute of Technology
echo   Opening: http://localhost:8000
echo ========================================================

cd /d "%~dp0"

start http://localhost:8000

if exist "%~dp0venv\Scripts\python.exe" (
    "%~dp0venv\Scripts\python.exe" "%~dp0run.py"
) else (
    python "%~dp0run.py"
)

pause
