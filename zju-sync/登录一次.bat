@echo off
chcp 65001 >nul
cd /d "%~dp0"
title ZJU login

set "BROWSER="
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" set "BROWSER=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" set "BROWSER=C:\Program Files\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" set "BROWSER=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not defined BROWSER echo [!] Edge / Chrome not found & pause & exit /b 1

echo ==========================================
echo   1. A browser window will open.
echo   2. Log in to ZJU (courses.zju.edu.cn).
echo   3. Open the 教务网 course-table page once,
echo      it is the second tab.
echo   4. This window closes itself when both
echo      sessions are captured.
echo ==========================================
echo.

start "" "%BROWSER%" --remote-debugging-port=9333 --user-data-dir="%TEMP%\zhushi-zju-profile" --no-first-run --no-default-browser-check --new-window "https://courses.zju.edu.cn/user/index" "https://zdbk.zju.edu.cn/jwglxt/kbcx/xskbcx_cxXskbcxIndex.html?gnmkdm=N253508&layout=default"
timeout /t 3 >nul

if not exist "%~dp0zju-sync-service.exe" (
  echo [!] zju-sync-service.exe is missing from this folder.
  echo     Do not use the green Code button. Download zju-sync-helper.zip
  echo     from https://github.com/Falling-anyway/zhushroom/releases and unzip it.
  pause
  exit /b 1
)

zju-sync-service.exe --login

echo.
echo [done] press any key to close
pause >nul