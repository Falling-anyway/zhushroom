@echo off
chcp 65001 >nul
cd /d "%~dp0"
title zju-sync-service

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  [!] Node.js not found.
  echo      Install it first:  https://nodejs.org/zh-cn
  echo      ^(click Next to the end, then double-click this file again^)
  echo.
  pause
  exit /b 1
)

echo ==============================================
echo   ZhuShi sync service is starting...
echo   Keep this window open while using the page.
echo   First run: a browser window will open,
echo   just log in to ZJU once, then it closes itself.
echo ==============================================
echo.
node "zju-sync-service.js"
echo.
echo [service exited] press any key to close
pause >nul
