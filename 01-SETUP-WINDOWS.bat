@echo off
setlocal
title Wafaa HIS - First Setup
cd /d "%~dp0"

where php >nul 2>nul || goto php_error
where composer >nul 2>nul || goto composer_error
where node >nul 2>nul || goto node_error

echo [1/4] Installing Laravel dependencies...
cd /d "%~dp0wafa-api"
if not exist "bootstrap\cache" mkdir "bootstrap\cache"
if not exist "bootstrap\cache\.gitignore" type nul > "bootstrap\cache\.gitignore"
call composer install
if errorlevel 1 goto failed

echo [2/4] Preparing Laravel database...
if not exist .env copy .env.example .env >nul
call php artisan key:generate --force
if errorlevel 1 goto failed
call php artisan migrate --seed
if errorlevel 1 goto failed

echo [3/4] Installing React dependencies...
cd /d "%~dp0wafa-web"
call npm install
if errorlevel 1 goto failed

echo [4/4] Building React production bundle...
call npm run build
if errorlevel 1 goto failed

echo.
echo Setup completed successfully.
echo Run 02-START-FULL-STACK.bat next.
pause
exit /b 0

:php_error
echo PHP 8.2 or newer is required and must be available in PATH.
pause
exit /b 1
:composer_error
echo Composer is required and must be available in PATH.
pause
exit /b 1
:node_error
echo Node.js 18 or newer is required and must be available in PATH.
pause
exit /b 1
:failed
echo Setup failed. Review the error above.
pause
exit /b 1
