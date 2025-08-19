const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const pollRoutes = require('./routes/polls');
const voteRoutes = require('./routes/votes');
const memoryStore = require('./storage/memoryStore');
const { setupSocketIO } = require('./socket/socketHandler');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3001",
    methods: ["GET", "POST"]
  }
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3001",
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

// Clean URL routes for voting and results - but only for valid UUIDs
app.get('/vote/:pollId([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', (req, res) => {
  // Serve the main HTML file - the frontend will handle the routing
  res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/results/:pollId([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', (req, res) => {
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
    console.log('🧠 In-memory storage ready');
    
    setupSocketIO(io);
    console.log('🔌 Socket.IO configured');
    
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`🚀 QuickPoll server running on port ${PORT}`);
      console.log(`📱 Frontend served at: http://localhost:${PORT}`);
      console.log(`🔗 API endpoint: http://localhost:${PORT}/api`);
      console.log(`💾 Storage: In-Memory Sessions`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  
  // Optional: Save data before shutdown
  if (process.env.PERSIST_ON_SHUTDOWN === 'true') {
    const fs = require('fs');
    const data = memoryStore.exportData();
    fs.writeFileSync('./data/backup.json', JSON.stringify(data, null, 2));
    console.log('💾 Data exported to backup.json');
  }
  
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

startServer();
