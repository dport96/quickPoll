const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const os = require('os');
require('dotenv').config();

const pollRoutes = require('./routes/polls');
const voteRoutes = require('./routes/votes');
const memoryStore = require('./storage/memoryStore');
const { setupSocketIO } = require('./socket/socketHandler');

// Function to get server's IP address
function getServerIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost'; // Fallback to localhost if no external IP found
}

// Get server configuration
const PORT = process.env.PORT || 3001;
const SERVER_IP = getServerIP();
const CORS_ORIGINS = [
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
  `http://${SERVER_IP}:${PORT}`,
  process.env.CORS_ORIGIN
].filter(Boolean); // Remove any undefined values


const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: CORS_ORIGINS,
    methods: ["GET", "POST"]
  }
});

// Security middleware - simplified for IP access
// app.use(helmet()); // Disabled for IP access compatibility

// Add custom headers to prevent HTTPS upgrade
app.use((req, res, next) => {
  // Prevent browsers from upgrading HTTP to HTTPS
  res.setHeader('Strict-Transport-Security', 'max-age=0');
  res.removeHeader('X-Powered-By');
  next();
});
app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true
}));

// Session middleware for tracking user sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'quickpoll-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Make io and memory store available to routes
app.use((req, res, next) => {
  req.io = io;
  req.memoryStore = memoryStore;
  next();
});

// Serve static files FIRST (for the frontend)
app.use(express.static(path.join(__dirname, '../')));

// Routes
app.use('/api/polls', pollRoutes);
app.use('/api/votes', voteRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const stats = await memoryStore.getSystemStats();
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    storage: 'in-memory',
    stats
  });
});

// System stats endpoint
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await memoryStore.getSystemStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get system stats' });
  }
});

// Clean URL routes for voting and results - for Nano ID format (6-12 alphanumeric chars)
app.get('/vote/:pollId([A-Za-z0-9_-]{6,12})', (req, res) => {
  // Serve the main HTML file - the frontend will handle the routing
  res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/results/:pollId([A-Za-z0-9_-]{6,12})', (req, res) => {
  // Serve the main HTML file - the frontend will handle the routing
  res.sendFile(path.join(__dirname, '../index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize server
async function startServer() {
  try {
    
    setupSocketIO(io);
    
    server.listen(PORT, () => {
      console.log(` Frontend served at: http://${SERVER_IP}:${PORT}`);
      console.log(` Local access: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log(' Received SIGTERM, shutting down gracefully');
  
  // Optional: Save data before shutdown
  if (process.env.PERSIST_ON_SHUTDOWN === 'true') {
    const fs = require('fs');
    const data = memoryStore.exportData();
    fs.writeFileSync('./data/backup.json', JSON.stringify(data, null, 2));
  }
  
  server.close(() => {
    process.exit(0);
  });
});

startServer();
