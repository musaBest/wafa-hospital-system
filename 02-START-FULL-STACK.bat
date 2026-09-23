@echo off
setlocal
title Wafaa HIS - Start Full Stack
cd /d "%~dp0"

if not exist "wafa-api\vendor\autoload.php" (
  echo Please run 01-SETUP-WINDOWS.bat first.
  pause
  exit /b 1
)
if not exist "wafa-web\node_modules" (
  echo Please run 01-SETUP-WINDOWS.bat first.
  pause
  exit /b 1
)

start "Wafaa Laravel API" cmd /k "cd /d ""%~dp0wafa-api"" ^&^& php -S 127.0.0.1:18088 -t public public/index.php"
timeout /t 2 /nobreak >nul
start "Wafaa React Web" cmd /k "cd /d ""%~dp0wafa-web"" ^&^& npm run dev"

echo Laravel API: http://127.0.0.1:18088
echo React Web:   http://localhost:5173
echo API health:  http://127.0.0.1:18088/up
pause
