// Socket.IO handler for real-time updates
function setupSocketIO(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join poll room for real-time updates
    socket.on('joinPoll', (pollId) => {
      if (pollId && pollId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
        socket.join(`poll_${pollId}`);
        console.log(`📊 Client ${socket.id} joined poll room: poll_${pollId}`);
        
        // Send confirmation
        socket.emit('joinedPoll', { pollId, message: 'Successfully joined poll updates' });
      } else {
        socket.emit('error', { message: 'Invalid poll ID' });
      }
    });

    // Leave poll room
    socket.on('leavePoll', (pollId) => {
      if (pollId) {
        socket.leave(`poll_${pollId}`);
        console.log(`📊 Client ${socket.id} left poll room: poll_${pollId}`);
        socket.emit('leftPoll', { pollId, message: 'Left poll updates' });
      }
    });

    // Handle real-time voting status
    socket.on('votingStarted', (data) => {
      const { pollId, voterIdentifier } = data;
      if (pollId) {
        socket.to(`poll_${pollId}`).emit('someoneVoting', {
          pollId,
          timestamp: new Date().toISOString(),
          message: 'Someone is currently voting...'
        });
      }
    });

    // Handle typing indicators for comments (if implemented)
    socket.on('typing', (data) => {
      const { pollId, isTyping } = data;
      if (pollId) {
        socket.to(`poll_${pollId}`).emit('userTyping', {
          pollId,
          isTyping,
          socketId: socket.id
        });
      }
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
