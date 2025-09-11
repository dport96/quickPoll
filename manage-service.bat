@echo off
echo ====================================
echo QuickPoll Service Management
echo ====================================

:menu
echo.
echo Choose an option:
echo [1] Show service status
echo [2] View logs (real-time)
echo [3] View logs (last 50 lines)
echo [4] Restart service
echo [5] Stop service
echo [6] Start service
echo [7] Monitor processes (GUI)
echo [8] Exit
echo.
set /p choice="Enter your choice (1-8): "

if "%choice%"=="1" goto status
if "%choice%"=="2" goto logs_realtime
if "%choice%"=="3" goto logs_recent
if "%choice%"=="4" goto restart
if "%choice%"=="5" goto stop
if "%choice%"=="6" goto start
if "%choice%"=="7" goto monitor
if "%choice%"=="8" goto exit
echo Invalid choice. Please try again.
goto menu

:status
echo.
echo Current service status:
pm2 status
echo.
echo Server should be accessible at:
echo   Local: http://localhost:3001
echo   Network: http://128.171.195.8:3001
echo.
pause
goto menu

:logs_realtime
echo.
echo Showing real-time logs (Ctrl+C to exit)...
pm2 logs quickpoll-server
goto menu

:logs_recent
echo.
echo Last 50 log lines:
pm2 logs quickpoll-server --lines 50
echo.
pause
goto menu

:restart
echo.
echo Restarting QuickPoll service...
pm2 restart quickpoll-server
echo Service restarted.
echo.
pause
goto menu

:stop
echo.
echo Stopping QuickPoll service...
pm2 stop quickpoll-server
echo Service stopped.
echo.
pause
goto menu

:start
echo.
echo Starting QuickPoll service...
pm2 start quickpoll-server
echo Service started.
echo.
pause
goto menu

:monitor
echo.
echo Opening PM2 monitor (close the window to return)...
pm2 monit
goto menu

:exit
echo Goodbye!
