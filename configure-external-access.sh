#!/bin/bash

# QuickPoll External Access Configuration Script
echo "🌐 Configuring QuickPoll for External Access"
echo ""

# Get current IP address
echo "🔍 Detecting your IP address..."

# Try multiple methods to get IP address
if command -v hostname &> /dev/null; then
    LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
fi

if [ -z "$LOCAL_IP" ] && command -v ifconfig &> /dev/null; then
    LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}' | cut -d: -f2)
fi

if [ -z "$LOCAL_IP" ] && command -v ip &> /dev/null; then
    LOCAL_IP=$(ip addr show | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}' | cut -d/ -f1)
fi

if [ -z "$LOCAL_IP" ]; then
    echo "❌ Could not automatically detect IP address."
    echo "Please find your IP address manually:"
    echo "  - Windows: ipconfig"
    echo "  - macOS/Linux: ifconfig | grep 'inet '"
    echo ""
    read -p "Enter your IP address: " LOCAL_IP
fi

echo "✅ IP Address: $LOCAL_IP"
echo ""

# Prompt user for confirmation
read -p "🤔 Configure QuickPoll for external access using $LOCAL_IP? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Configuration cancelled."
    exit 1
fi

echo ""
echo "🔧 Updating configuration files..."

# Update .env file
ENV_FILE="server/.env"
if [ -f "$ENV_FILE" ]; then
    echo "📝 Updating $ENV_FILE..."
    
    # Backup original file
    cp "$ENV_FILE" "$ENV_FILE.backup"
    
    # Update CORS_ORIGIN
    sed -i.tmp "s|CORS_ORIGIN=.*|CORS_ORIGIN=http://${LOCAL_IP}:3001|" "$ENV_FILE"
    rm "$ENV_FILE.tmp" 2>/dev/null
    
    echo "✅ Updated CORS_ORIGIN to http://${LOCAL_IP}:3001"
else
    echo "❌ $ENV_FILE not found. Please run setup.sh first."
    exit 1
fi

# Update JavaScript file
JS_FILE="server-client-script.js"
if [ -f "$JS_FILE" ]; then
    echo "📝 Updating $JS_FILE..."
    
    # Backup original file
    cp "$JS_FILE" "$JS_FILE.backup"
    
    # Update API URL
    sed -i.tmp "s|this\.apiUrl = 'http://localhost:3001/api'|this.apiUrl = 'http://${LOCAL_IP}:3001/api'|" "$JS_FILE"
    
    # Update Socket.IO URL
    sed -i.tmp "s|this\.socket = io('http://localhost:3001')|this.socket = io('http://${LOCAL_IP}:3001')|" "$JS_FILE"
    
    rm "$JS_FILE.tmp" 2>/dev/null
    
    echo "✅ Updated API URLs to use $LOCAL_IP"
else
    echo "❌ $JS_FILE not found."
    exit 1
fi

echo ""
echo "🎉 Configuration complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Start the server: cd server && npm start"
echo "   2. Share this URL: http://${LOCAL_IP}:3001"
echo "   3. Others can access polls using that URL"
echo ""
echo "💡 Tips:"
echo "   - Make sure port 3001 is not blocked by firewall"
echo "   - Your device must be on the same network as users"
echo "   - To revert changes, restore from .backup files"
echo ""
echo "🔙 To restore localhost configuration:"
echo "   cp server/.env.backup server/.env"
echo "   cp server-client-script.js.backup server-client-script.js"
echo ""
