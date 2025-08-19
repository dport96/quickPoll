#!/bin/bash
echo "🚀 Starting QuickPoll Server..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please run setup.sh first."
    exit 1
fi

# Start the server
npm start
