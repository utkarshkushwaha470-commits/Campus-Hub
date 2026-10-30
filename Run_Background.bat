@echo off
title Running Campus Hub in Background...
cd /d "%~dp0"
echo ======================================================================
echo    Launching Campus Hub in the Background (No Console Window)
echo    College: Allenhouse Institute of Technology
echo ======================================================================
echo.
wscript "%~dp0Run_Background.vbs"
echo [*] Campus Hub is now running silently in the background!
echo [*] You can close this window now.
echo [*] To open the website, go to: http://localhost:8000
echo [*] To stop the server anytime, run Stop_Campus_Hub.bat
echo.
timeout /t 3 >nul
exit
