@echo off
title Campus Hub - Interactive Database Viewer (SSMS Style)
color 0B
echo Opening SQL Server Management Studio Database Viewer...

if exist "%~dp0Database\Database_Viewer.html" (
    start "" "%~dp0Database\Database_Viewer.html"
) else if exist "%~dp0Campus-Hub-Project\Database\Database_Viewer.html" (
    start "" "%~dp0Campus-Hub-Project\Database\Database_Viewer.html"
) else if exist "C:\Users\sssss\Desktop\Campus-Hub-Project\Database\Database_Viewer.html" (
    start "" "C:\Users\sssss\Desktop\Campus-Hub-Project\Database\Database_Viewer.html"
) else (
    echo Could not locate Database_Viewer.html
    pause
)
