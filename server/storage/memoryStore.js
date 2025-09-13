// In-memory storage for single poll system
class MemoryStore {
  constructor() {
    this.currentPoll = null;
    this.votes = new Map();
    this.sessions = new Map();
  }

  // Get the current active poll
  async getCurrentPoll() {
    return this.currentPoll;
  }

  // Create a new poll (replaces any existing poll)
  async createPoll(pollData) {
    // Clear existing data when creating new poll
    this.currentPoll = null;
    this.votes.clear();
    
    // Create new poll with ID and timestamps
    const poll = {
      id: this.generateId(),
      ...pollData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isClosed: false,
      closedAt: null
    };
    
    this.currentPoll = poll;
    return poll;
  }

  // Update current poll
  async updatePoll(updates) {
    if (!this.currentPoll) {
      throw new Error('No active poll to update');
    }
    
    this.currentPoll = {
      ...this.currentPoll,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    return this.currentPoll;
  }

  // Delete current poll
  async deletePoll() {
    if (!this.currentPoll) {
      return false;
    }
    
    this.currentPoll = null;
    this.votes.clear();
    return true;
  }

  // Submit a vote
  async submitVote(voteData, voterInfo = {}) {
    if (!this.currentPoll) {
      throw new Error('No active poll');
    }

    // Check if poll is closed
    if (this.currentPoll.isClosed) {
      throw new Error('Poll is closed');
    }

    // Generate vote ID
    const voteId = this.generateId();
    
    // Create vote object
    const vote = {
      id: voteId,
      voteData,
      voterInfo,
      createdAt: new Date().toISOString(),
      sessionId: voterInfo.sessionId || null,
      ipAddress: voterInfo.ipAddress || null
    };

    // Store the vote
    this.votes.set(voteId, vote);
    
    return vote;
  }

  // Get all votes for current poll
  async getVotesForPoll() {
    return Array.from(this.votes.values());
  }

  // Check if a user has already voted (by identifier)
  async hasVoted(identifier) {
    const votes = Array.from(this.votes.values());
    return votes.find(vote => {
      // Check against session ID, IP address, or voter identifier
      return vote.sessionId === identifier || 
             vote.ipAddress === identifier || 
             vote.voterInfo?.voterIdentifier === identifier ||
             (vote.voterInfo && vote.voterInfo.sessionId === identifier);
    });
  }

  // Calculate poll results
  async calculateResults() {
    if (!this.currentPoll) {
      return null;
    }

    const votes = Array.from(this.votes.values());
    const results = {};
    
    // Initialize results for each option
    this.currentPoll.options.forEach((option, index) => {
      results[index] = {
        option: option,
        votes: 0,
        percentage: 0
      };
    });

    // Count votes
    votes.forEach(vote => {
      if (vote.voteData && vote.voteData.selectedOptions) {
        vote.voteData.selectedOptions.forEach(optionIndex => {
          if (results[optionIndex]) {
            results[optionIndex].votes++;
          }
        });
      }
    });

    // Calculate percentages
    const totalVotes = votes.length;
    if (totalVotes > 0) {
      Object.keys(results).forEach(key => {
        results[key].percentage = Math.round((results[key].votes / totalVotes) * 100);
      });
    }

    return {
      poll: this.currentPoll,
      results: Object.values(results),
      totalVotes,
      timestamp: new Date().toISOString()
    };
  }

  // Delete a specific vote
  async deleteVote(voteId) {
    return this.votes.delete(voteId);
  }

  // Get system statistics
  async getSystemStats() {
    return {
      totalPolls: this.currentPoll ? 1 : 0,
      totalVotes: this.votes.size,
      activePoll: !!this.currentPoll,
      pollTitle: this.currentPoll?.title || null,
      pollCreated: this.currentPoll?.createdAt || null,
      pollClosed: this.currentPoll?.isClosed || false
    };
  }

  // Store session data
  async storeSession(sessionId, sessionData) {
    this.sessions.set(sessionId, {
      ...sessionData,
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString()
    });
  }

  // Alias for storeSession (for backward compatibility)
  async createSession(sessionData) {
    const sessionId = sessionData.sessionId;
    return this.storeSession(sessionId, sessionData);
  }

  // Get session data
  async getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Update last accessed time
      session.lastAccessed = new Date().toISOString();
    }
    return session;
  }

  // Clean up old sessions (optional maintenance)
  async cleanupSessions(maxAge = 24 * 60 * 60 * 1000) { // 24 hours default
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      const sessionAge = now - new Date(session.lastAccessed).getTime();
      if (sessionAge > maxAge) {
        this.sessions.delete(sessionId);
      }
    }
  }

  // Generate random ID
  generateId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  // Check if a poll is currently active
  async hasActivePoll() {
    return !!this.currentPoll && !this.currentPoll.isClosed;
  }
}

module.exports = MemoryStore;
