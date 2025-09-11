#!/bin/bash

echo "===================================="
echo "QuickPoll PM2 Service Setup"
echo "===================================="

echo
echo "[1/6] Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi
echo "Node.js is installed: $(node --version)"

echo
echo "[2/7] Checking PM2 installation..."
if command -v pm2 &> /dev/null; then
    echo "PM2 is already installed: $(pm2 --version)"
else
    echo "Installing PM2 globally..."
    npm install -g pm2
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to install PM2"
        exit 1
    fi
    echo "PM2 installed successfully: $(pm2 --version)"
fi

echo
echo "[3/7] Installing PM2 Windows service support..."
npm install -g pm2-windows-service 2>/dev/null || echo "pm2-windows-service may already be installed or not available"

echo
echo "[4/7] Stopping any existing QuickPoll processes..."
pm2 stop quickpoll-server 2>/dev/null || true
pm2 delete quickpoll-server 2>/dev/null || true

echo
echo "[5/7] Starting QuickPoll with PM2..."
pm2 start ecosystem.config.json
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to start QuickPoll with PM2"
    exit 1
fi

echo
echo "[6/7] Saving PM2 process list..."
pm2 save
if [ $? -ne 0 ]; then
    echo "WARNING: Failed to save PM2 process list"
fi

echo
echo "[7/7] Setting up automatic startup..."
echo "Configuring PM2 to start on system boot..."

# Try to set up PM2 startup
pm2 startup

echo
echo "===================================="
echo "IMPORTANT: AUTOMATIC STARTUP SETUP"
echo "===================================="
echo
echo "To complete automatic startup setup, you need to run the following"
echo "command in an ADMINISTRATOR Command Prompt or PowerShell:"
echo
pm2 startup | grep -E "(sudo|pm2)" | head -1
echo
echo "After running that command, your QuickPoll server will automatically"
echo "start when Windows boots up."
echo
echo "Alternative: Use the manage-service.bat file for manual management"

echo
echo "===================================="
echo "Setup Complete!"
echo "===================================="
echo
echo "QuickPoll is now running as a PM2 service"
echo
echo "Useful PM2 commands:"
echo "  pm2 status           - Show all processes"
echo "  pm2 logs quickpoll-server - Show logs"
echo "  pm2 restart quickpoll-server - Restart service"
echo "  pm2 stop quickpoll-server - Stop service"
echo "  pm2 start quickpoll-server - Start service"
echo "  pm2 monit           - Monitor processes"
echo
echo "Management script:"
echo "  manage-service.bat   - Interactive management menu"
echo

echo "Current status:"
pm2 status

echo
echo "Server should be accessible at:"
echo "  Local: http://localhost:3001"
echo "  Network: http://$(hostname -I | awk '{print $1}' 2>/dev/null || echo '128.171.195.8'):3001"
echo
