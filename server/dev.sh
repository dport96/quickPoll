#!/bin/bash
echo "🔧 Starting QuickPoll Server in development mode..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please run setup.sh first."
    exit 1
fi

# Install nodemon if not present
if ! npm list nodemon > /dev/null 2>&1; then
    echo "📦 Installing nodemon for development..."
    npm install --save-dev nodemon
fi

# Start in development mode with auto-reload
npm run dev
