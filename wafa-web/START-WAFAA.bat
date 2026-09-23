@echo off
title Wafaa HIS React Frontend
echo Installing project dependencies...
call npm install
if errorlevel 1 goto error
echo.
echo Starting Wafaa HIS at http://localhost:5173
call npm run dev
exit /b 0
:error
echo.
echo Could not start. Make sure Node.js 18 or newer is installed.
pause
