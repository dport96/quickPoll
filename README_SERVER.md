# QuickPoll Server Edition 🚀

**Professional real-time voting application with in-memory session storage and live updates**

## 🎯 What Changed

We've migrated QuickPoll to use in-memory server-side sessions instead of external databases, providing:

### ✅ Solved Problems
- **Zero setup required** - No database installation or configuration needed
- **Real-time updates** - See votes come in live across all devices
- **Session-based storage** - Data persists during server runtime
- **Enhanced security** - Server-side validation and protection
- **Improved performance** - Lightning-fast in-memory operations

### 🚀 New Features
- **Live vote updates** - Results update automatically without page refresh
- **Real-time notifications** - See when new votes come in
- **Session tracking** - Polls tied to user sessions for management
- **Better error handling** - Clear, actionable error messages
- **Mobile optimization** - Enhanced mobile experience with touch-friendly interface

## 🏗️ Architecture

```
Frontend (Browser) ↔ REST API (Express.js) ↔ In-Memory Store ↔ Real-time (Socket.IO)
```

### Technology Stack
- **Backend**: Node.js + Express.js
- **Storage**: In-memory sessions with automatic cleanup
- **Real-time**: Socket.IO for live updates
- **Frontend**: Enhanced vanilla JavaScript with modern features
- **Security**: Rate limiting, input validation, session management

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/dport96/quickPoll.git
cd quickPoll

# Install dependencies
cd server
npm install

# Start the server
npm run dev
```

### Option 2: Manual Setup

```bash
# Install dependencies
cd server
npm install

# Start the server
npm start
```

### Option 3: Development Mode

```bash
# Start with auto-reload for development
cd server
npm run dev
```

## 📊 In-Memory Storage

### Session-Based Data

- **Polls**: Stored in memory during server runtime
- **Votes**: Associated with polls and sessions
- **Sessions**: Track user activity and poll ownership
- **Automatic Cleanup**: Old sessions and expired polls removed automatically

### Data Persistence Options

- **Runtime Only**: Data exists while server is running (default)
- **Optional Backup**: Export data to JSON on shutdown (configurable)
- **Session Recovery**: Polls persist for 24 hours or until server restart

## 🔧 Configuration

### Environment Variables

```bash
# Server
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3001

# Security
SESSION_SECRET=your_session_secret_key
RATE_LIMIT_MAX=100

# Storage (optional)
PERSIST_ON_SHUTDOWN=true  # Export data backup on shutdown
```

### External Access Configuration

#### Local Network Access

To make your QuickPoll server accessible to others on your local network:

1. **Determine your local IP address**:
   ```bash
   # Windows
   ipconfig
   
   # macOS/Linux
   hostname -I | awk '{print $1}'  # or
   ip addr show | grep "inet " | grep -v 127.0.0.1
   ```

2. **Update server configuration** (`server/.env`):
   ```bash
   PORT=3001
   NODE_ENV=development
   CORS_ORIGIN=http://192.168.1.100:3001  # Replace with your IP
   ```

3. **Update frontend configuration** (`server-client-script.js`):
   ```javascript
   // Line ~7: Update API URL
   this.apiUrl = 'http://192.168.1.100:3001/api';
   
   // Line ~38: Update Socket.IO URL
   this.socket = io('http://192.168.1.100:3001');
   ```

4. **Ensure network accessibility**:
   ```bash
   # Check if port is accessible (from another device)
   telnet 192.168.1.100 3001
   
   # Or test HTTP access
   curl http://192.168.1.100:3001/api/health
   ```

#### Cloud Deployment

For internet-wide access, deploy to cloud platforms:

**Heroku Example**:
```bash
# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set CORS_ORIGIN=https://your-app.herokuapp.com
heroku config:set SESSION_SECRET=$(openssl rand -base64 32)
```

**Railway/Render Example**:
```bash
# Environment variables
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://your-app.railway.app
SESSION_SECRET=your_secure_random_string
```

**VPS/DigitalOcean Example**:
```bash
# Environment variables for production
NODE_ENV=production
PORT=80
CORS_ORIGIN=https://yourdomain.com
SESSION_SECRET=your_secure_session_secret

# Frontend URLs update
this.apiUrl = 'https://yourdomain.com/api';
this.socket = io('https://yourdomain.com');
```

#### Network Firewall Configuration

Ensure your server is accessible:

```bash
# Ubuntu/Debian firewall
sudo ufw allow 3001/tcp

# CentOS/RHEL firewall
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload

# Check if port is listening
netstat -tlnp | grep :3001
```

### Frontend Configuration Updates

When changing server location, update these files:

1. **API Configuration** (`server-client-script.js`):
   ```javascript
   // Update server URL (line ~7)
   this.apiUrl = 'http://YOUR_SERVER:3001/api';
   
   // Update Socket.IO URL (line ~38)  
   this.socket = io('http://YOUR_SERVER:3001');
   ```

2. **CORS Configuration** (`server/.env`):
   ```bash
   CORS_ORIGIN=http://YOUR_CLIENT_DOMAIN:PORT
   ```

### Quick Configuration Examples

#### Home Network Setup
```bash
# Server IP: 192.168.1.100
# .env file:
CORS_ORIGIN=http://192.168.1.100:3001

# JavaScript file:
this.apiUrl = 'http://192.168.1.100:3001/api';
this.socket = io('http://192.168.1.100:3001');
```

#### Production Domain Setup
```bash
# Domain: polls.mycompany.com
# .env file:
CORS_ORIGIN=https://polls.mycompany.com

# JavaScript file:
this.apiUrl = 'https://polls.mycompany.com/api';
this.socket = io('https://polls.mycompany.com');
```
PERSIST_ON_SHUTDOWN=true  # Export data backup on shutdown
```

## 📡 API Endpoints

### Poll Management
```
POST   /api/polls              # Create new poll
GET    /api/polls/:id          # Get poll details
GET    /api/polls/:id/results  # Get poll results
PUT    /api/polls/:id          # Update poll
DELETE /api/polls/:id          # Delete poll
```

### Voting
```
POST   /api/votes              # Submit vote
GET    /api/votes/:pollId      # Get votes for poll
DELETE /api/votes/:voteId      # Delete vote
```

### System
```
GET    /api/health             # Health check
WebSocket: /ws                 # Real-time updates
```

## 🎮 Usage Examples

### Creating a Poll
```javascript
const response = await fetch('/api/polls', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Favorite Programming Language',
    type: 'simple',
    options: ['JavaScript', 'Python', 'Java'],
    requireAuth: false
  })
});

const poll = await response.json();
console.log(`Poll created: ${poll.poll.votingUrl}`);
```

### Submitting a Vote
```javascript
const response = await fetch('/api/votes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    pollId: 'poll-uuid-here',
    voteData: { option: 0 }, // Vote for first option
    voterIdentifier: 'user@example.com' // Optional for auth polls
  })
});
```

### Real-time Updates
```javascript
const socket = io();

// Join poll room for updates
socket.emit('joinPoll', pollId);

// Listen for new votes
socket.on('voteSubmitted', (data) => {
  console.log(`New vote! Total: ${data.totalVotes}`);
  updateVoteDisplay(data.totalVotes);
});

// Listen for results updates
socket.on('resultsUpdated', (data) => {
  updateResultsChart(data.results);
});
```

## 🚀 Deployment

### Local Development
```bash
cd server
npm run dev  # Starts with nodemon for auto-reload
```

### Production Deployment

#### Option 1: VPS (DigitalOcean, Linode, etc.)
```bash
# Install Node.js
# Clone repository
# Set environment variables
# Start with PM2
npm install -g pm2
pm2 start server.js --name quickpoll
```

#### Option 2: Cloud Platforms (Recommended)
- **Vercel**: Deploy with one click
- **Railway**: Automatic deployments from GitHub
- **Render**: Free tier hosting
- **Fly.io**: Modern deployment platform

#### Option 3: Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## 📊 Features Comparison

| Feature | In-Memory Version |
|---------|-------------------|
| Setup Required | ❌ Zero setup |
| Real-time Updates | ✅ Live updates |
| Reliability | ✅ Session-based |
| Performance | 🚀 Lightning fast |
| Security | ✅ Server-side validation |
| Analytics | ✅ Runtime statistics |
| Scalability | ⚠️ Single-server runtime |
| Cost | ✅ Free |
| Data Persistence | ⚠️ Runtime only |

## 🔒 Security Features

- **Rate Limiting**: Prevents spam and abuse
- **Input Validation**: All data validated server-side
- **Session Management**: Secure session handling with Express
- **CORS Protection**: Configurable origin restrictions
- **Memory Safety**: Automatic cleanup prevents memory leaks

## 📱 Mobile Features

- **Touch-friendly Interface**: Optimized for mobile voting
- **Responsive Design**: Works perfectly on all screen sizes
- **Offline Support**: Graceful handling of connection issues
- **Push Notifications**: Real-time vote notifications
- **Fast Loading**: Optimized for mobile networks

## 🧪 Testing

```bash
# Run tests
npm test

# Run specific test suites
npm test -- --grep "polls"
npm test -- --grep "votes"

# Coverage report
npm run test:coverage
```

## 📈 Monitoring

### Health Checks
```bash
# Check server status
curl http://localhost:3001/api/health
```

### Logs
```bash
# View logs
tail -f logs/quickpoll.log

# Error logs only
tail -f logs/error.log
```

## 🔄 In-Memory Data Management

### Data Persistence
The application uses in-memory storage with session management:
- Data persists during server runtime
- Sessions automatically cleaned up after expiration
- Optional: Export/import functionality for data backup

### Manual Data Management
1. Export current poll data using the admin endpoint
2. Import data on server restart if needed
3. Monitor memory usage for high-traffic scenarios

## 🆘 Troubleshooting

### Common Issues

**Server won't start**
```bash
# Check if port is in use
lsof -i :3001

# Check environment variables
cat .env

# Check server health
curl http://localhost:3001/api/health
```

**Memory or performance issues**
```bash
# Check memory usage
node --inspect server.js

# Monitor active sessions
curl http://localhost:3001/api/health

# Clear expired sessions
# (automatic cleanup runs every hour)
```

**Real-time updates not working**
```bash
# Check Socket.IO connection
curl http://localhost:3001/socket.io/

# Check browser console for WebSocket errors
```

### Support
- 📧 Email: support@quickpoll.dev
- 💬 Discord: https://discord.gg/quickpoll
- 🐛 Issues: https://github.com/dport96/quickPoll/issues

## 🛣️ Roadmap

### v2.0 (Current)
- ✅ Server-side storage
- ✅ Real-time updates
- ✅ Professional deployment

### v2.1 (Next)
- 🔄 Advanced analytics dashboard
- 🔄 Poll templates and themes
- 🔄 Team collaboration features
- 🔄 API rate limiting improvements

### v2.2 (Future)
- 🔄 Mobile PWA app
- 🔄 Integration APIs
- 🔄 Advanced poll types
- 🔄 White-label solutions

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

**Ready to create amazing polls with real-time updates? Let's get started! 🚀**
