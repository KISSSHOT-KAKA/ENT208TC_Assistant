@echo off
cd /d "%~dp0"
call npm run build:cubism_app
if errorlevel 1 exit /b %errorlevel%
npm start
