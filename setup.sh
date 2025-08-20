#!/bin/bash

# QuickPoll Server Setup Script
echo "🚀 Setting up QuickPoll Server with In-Memory Storage..."

# Navigate to server directory
cd "$(dirname "$0")"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

echo "✅ npm found: $(npm --version)"

# Create server directory if it doesn't exist
if [ ! -d "server" ]; then
    echo "📁 Creating server directory..."
    mkdir server
fi

cd server

# Install dependencies
echo "📦 Installing server dependencies..."
npm install

echo "⚡ No database setup required - using in-memory storage!"

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating environment configuration..."
    
    # Get basic configuration
    read -p "Server port (3001): " port
    port=${port:-3001}
    
    read -p "Environment (development): " env
    env=${env:-development}
    
    # Generate session secret
    session_secret=$(openssl rand -base64 32 2>/dev/null || echo "your_session_secret_here")
    
    cat > .env << EOF
# Server Configuration
PORT=${port}
NODE_ENV=${env}
CORS_ORIGIN=http://localhost:3001

# Security
SESSION_SECRET=${session_secret}

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Poll Configuration
MAX_POLL_OPTIONS=10
POLL_CLEANUP_DAYS=30

# Development Settings
LOG_LEVEL=debug
ENABLE_SWAGGER=true
EOF

    echo "✅ Environment file created"
    echo ""
    echo "💡 For external access (beyond localhost):"
    echo "   1. Edit server/.env and change CORS_ORIGIN to your IP address"
    echo "   2. Edit server-client-script.js and update API URLs"
    echo "   3. See README.md for detailed configuration instructions"
else
    echo "✅ Environment file already exists"
fi
# Create a simple start script
echo "� Creating start script..."
cat > start.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting QuickPoll Server..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please run setup.sh first."
    exit 1
fi

# Start the server
npm start
EOF

chmod +x start.sh

# Create development start script
cat > dev.sh << 'EOF'
#!/bin/bash
echo "� Starting QuickPoll Server in development mode..."

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

# Start with nodemon
npm run dev
EOF

chmod +x dev.sh

echo ""
echo "🎉 QuickPoll Server setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Review the .env file and adjust settings if needed"
echo "   2. Run './start.sh' to start the server"
echo "   3. Or run './dev.sh' for development with auto-reload"
echo "   4. Visit http://localhost:${port:-3001} to use QuickPoll"
echo ""
echo "💡 Features:"
echo "   ✅ In-memory storage (no database required)"
echo "   ✅ Real-time voting updates"
echo "   ✅ Session-based poll management"
echo "   ✅ Zero configuration required"
echo ""
echo "🌐 For external access (beyond localhost):"
echo "   Run: ./configure-external-access.sh"
echo "   Or see README.md for manual configuration"
echo ""
echo "📚 For more information, see README_SERVER.md"
echo ""
    echo "📦 Installing nodemon for development..."
    npm install --save-dev nodemon
fi

# Start in development mode with auto-reload
npm run dev
EOF

chmod +x dev.sh

echo ""
echo "🎉 QuickPoll Server setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Review the .env file and adjust settings if needed"
echo "   2. Run './start.sh' to start the server"
echo "   3. Or run './dev.sh' for development with auto-reload"
echo "   4. Visit http://localhost:${port:-3001} to use QuickPoll"
echo ""
echo "🔗 API endpoints:"
echo "   http://localhost:3001/api/health    (health check)"
echo "   http://localhost:3001/api/polls     (poll management)"
echo "   http://localhost:3001/api/votes     (vote submission)"
echo ""
echo "Happy polling! 🗳️"
