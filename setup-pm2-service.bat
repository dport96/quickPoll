@echo off
echo ====================================
echo QuickPoll PM2 Service Setup
echo ====================================

echo.
echo [1/6] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo Node.js is installed: 
node --version

echo.
echo [2/6] Installing PM2 globally...
npm install -g pm2
if %errorlevel% neq 0 (
    echo ERROR: Failed to install PM2
    pause
    exit /b 1
)

echo.
echo [3/6] Stopping any existing QuickPoll processes...
pm2 stop quickpoll-server 2>nul
pm2 delete quickpoll-server 2>nul

echo.
echo [4/6] Starting QuickPoll with PM2...
pm2 start ecosystem.config.json
if %errorlevel% neq 0 (
    echo ERROR: Failed to start QuickPoll with PM2
    pause
    exit /b 1
)

echo.
echo [5/6] Saving PM2 process list...
pm2 save
if %errorlevel% neq 0 (
    echo WARNING: Failed to save PM2 process list
)

echo.
echo [6/6] Setting up PM2 to start on Windows boot...
pm2 startup windows
echo.
echo IMPORTANT: To complete the startup setup, you need to run the command shown above
echo as Administrator. Copy and paste it into an Administrator Command Prompt.

echo.
echo ====================================
echo Setup Complete!
echo ====================================
echo.
echo QuickPoll is now running as a PM2 service
echo.
echo Useful PM2 commands:
echo   pm2 status           - Show all processes
echo   pm2 logs quickpoll-server - Show logs
echo   pm2 restart quickpoll-server - Restart service
echo   pm2 stop quickpoll-server - Stop service
echo   pm2 start quickpoll-server - Start service
echo   pm2 monit           - Monitor processes
echo.

echo Current status:
pm2 status

echo.
echo Server should be accessible at:
echo   Local: http://localhost:3001
echo   Network: http://128.171.195.8:3001
echo.
pause
