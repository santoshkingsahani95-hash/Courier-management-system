@echo off
title GitHub Authorization ^& Push - Courier Management System
cd /d "%~dp0"
echo =======================================================
echo   Courier Management System - Push to GitHub
echo =======================================================
echo.
echo Triggering Git push... Git Credential Manager will open
echo your browser popup to authorize your GitHub account.
echo.
git push -u origin main
echo.
if %ERRORLEVEL% equ 0 (
    echo =======================================================
    echo   SUCCESS! Pushed to GitHub successfully!
    echo =======================================================
) else (
    echo =======================================================
    echo   Push failed or was cancelled.
    echo =======================================================
)
echo.
pause

