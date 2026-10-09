@echo off
title Exam Seating Arrangement System
echo ======================================================
echo    EXAM SEATING ARRANGEMENT SYSTEM (WEB UI)
echo ======================================================
echo.
cd /d "%~dp0"
echo Starting local web server...
start http://localhost:3000
node server.js
pause