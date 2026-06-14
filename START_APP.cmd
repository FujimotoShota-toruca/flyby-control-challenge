@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found.
  echo Install Node.js, then run START_APP.cmd again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing packages for the first launch...
  call npm.cmd install
  if errorlevel 1 (
    echo Package installation failed.
    pause
    exit /b 1
  )
)

echo Starting Flyby Control Challenge...
echo Keep this window open while using the app.
call npm.cmd run dev -- --host 127.0.0.1 --open

if errorlevel 1 pause
