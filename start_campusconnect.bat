@echo off
title CampusConnect Local Server
echo ========================================================
echo   Launching CampusConnect PWA Server
echo   College: Apex Institute of Technology
echo ========================================================
cd /d "%~dp0backend"
start http://localhost:8000
echo Server running at http://localhost:8000 (Press Ctrl+C to stop)
"..\venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
pause
