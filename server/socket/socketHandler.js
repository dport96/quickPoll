// Socket.IO handler for real-time updates
function setupSocketIO(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join poll room for real-time updates (single poll system)
    socket.on('joinPoll', (room) => {
      if (room === 'current' || room) {
        socket.join('poll_room');
        console.log(`📊 Client ${socket.id} joined main poll room`);
        
        // Send confirmation
        socket.emit('joinedPoll', { message: 'Successfully joined poll updates' });
      } else {
        socket.emit('error', { message: 'Invalid room' });
      }
    });

    // Leave poll room
    socket.on('leavePoll', () => {
      socket.leave('poll_room');
      console.log(`📊 Client ${socket.id} left poll room`);
      socket.emit('leftPoll', { message: 'Left poll updates' });
    });

    // Handle real-time voting status
    socket.on('votingStarted', (data) => {
      socket.to('poll_room').emit('someoneVoting', {
        timestamp: new Date().toISOString(),
        message: 'Someone is currently voting...'
      });
    });

    // Handle typing indicators for comments (if implemented)
    socket.on('typing', (data) => {
      const { isTyping } = data;
      socket.to('poll_room').emit('userTyping', {
        isTyping,
        socketId: socket.id
      });
    });

    // Ping/pong for connection monitoring
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    // Error handling
    socket.on('error', (error) => {
      console.error(`🔌 Socket error from ${socket.id}:`, error);
    });
  });

  // Broadcast system-wide messages (for maintenance, etc.)
  setInterval(() => {
    io.emit('heartbeat', { 
      timestamp: new Date().toISOString(),
      connectedClients: io.engine.clientsCount 
    });
  }, 30000); // Every 30 seconds

  console.log('✅ Socket.IO configured with real-time poll updates');
}

module.exports = {
  setupSocketIO
};
