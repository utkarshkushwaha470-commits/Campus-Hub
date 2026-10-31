@echo off
title Campus Hub - Open Database Folder
color 0A
echo Opening Campus Hub Database Folder in File Explorer...

if exist "%~dp0Database" (
    explorer.exe "%~dp0Database"
) else if exist "C:\Users\sssss\Desktop\Campus-Hub-Project\Database" (
    explorer.exe "C:\Users\sssss\Desktop\Campus-Hub-Project\Database"
) else (
    echo Database directory not found.
    pause
)
