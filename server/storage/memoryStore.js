/**
 * In-Memory Data Store for QuickPoll
 * Replaces PostgreSQL database with session-based storage
 */

const { v4: uuidv4 } = require('uuid');

class MemoryStore {
  constructor() {
    this.polls = new Map();
    this.votes = new Map();
    this.sessions = new Map();
    this.pollsBySession = new Map(); // Maps session -> poll IDs
    
    console.log('🧠 In-memory storage initialized');
  }

  // Poll Management
  async createPoll(pollData) {
    const pollId = uuidv4();
    const now = new Date();
    
    const poll = {
      id: pollId,
      title: pollData.title,
      description: pollData.description || '',
      type: pollData.type,
      options: pollData.options,
      requireAuth: pollData.requireAuth || false,
      validEmails: pollData.validEmails || [],
      isActive: true,
      createdAt: now,
      updatedAt: now,
      expiresAt: pollData.expiresAt || null,
      sessionId: pollData.sessionId || null,
      creatorInfo: {
        ipAddress: pollData.creatorInfo?.ipAddress || '',
        userAgent: pollData.creatorInfo?.userAgent || ''
      }
    };

    this.polls.set(pollId, poll);
    
    // Track polls by session
    if (poll.sessionId) {
      if (!this.pollsBySession.has(poll.sessionId)) {
        this.pollsBySession.set(poll.sessionId, new Set());
      }
      this.pollsBySession.get(poll.sessionId).add(pollId);
    }

    return poll;
  }

  async getPoll(pollId) {
    return this.polls.get(pollId) || null;
  }

  async updatePoll(pollId, updates) {
    const poll = this.polls.get(pollId);
    if (!poll) return null;

    const updatedPoll = {
      ...poll,
      ...updates,
      updatedAt: new Date()
    };

    this.polls.set(pollId, updatedPoll);
    return updatedPoll;
  }

  async deletePoll(pollId) {
    const poll = this.polls.get(pollId);
    if (!poll) return false;

    // Remove from session tracking
    if (poll.sessionId && this.pollsBySession.has(poll.sessionId)) {
      this.pollsBySession.get(poll.sessionId).delete(pollId);
    }

    // Delete all votes for this poll
    const pollVotes = Array.from(this.votes.keys()).filter(key => key.startsWith(`${pollId}:`));
    pollVotes.forEach(key => this.votes.delete(key));

    this.polls.delete(pollId);
    return true;
  }

  async getPollsBySession(sessionId) {
    const pollIds = this.pollsBySession.get(sessionId);
    if (!pollIds) return [];

    return Array.from(pollIds)
      .map(id => this.polls.get(id))
      .filter(poll => poll && poll.isActive);
  }

  // Vote Management
  async submitVote(voteData) {
    const voteId = uuidv4();
    const now = new Date();
    
    const vote = {
      id: voteId,
      pollId: voteData.pollId,
      voteData: voteData.voteData,
      voterIdentifier: voteData.voterIdentifier || '',
      voterInfo: voteData.voterInfo || {},
      ipAddress: voteData.ipAddress || '',
      userAgent: voteData.userAgent || '',
      sessionId: voteData.sessionId || '',
      createdAt: now
    };

    // Store vote with composite key: pollId:voteId
    const voteKey = `${vote.pollId}:${voteId}`;
    this.votes.set(voteKey, vote);

    return vote;
  }

  async getVotesForPoll(pollId) {
    const votes = [];
    for (const [key, vote] of this.votes.entries()) {
      if (key.startsWith(`${pollId}:`)) {
        votes.push(vote);
      }
    }
    return votes;
  }

  async hasVoted(pollId, identifier) {
    for (const [key, vote] of this.votes.entries()) {
      if (key.startsWith(`${pollId}:`) && 
          (vote.voterIdentifier === identifier || 
           vote.ipAddress === identifier ||
           vote.sessionId === identifier)) {
        return vote;
      }
    }
    return null;
  }

  async deleteVote(voteId) {
    // Find and delete vote by ID
    for (const [key, vote] of this.votes.entries()) {
      if (vote.id === voteId) {
        this.votes.delete(key);
        return true;
      }
    }
    return false;
  }

  // Session Management
  async createSession(sessionData) {
    const sessionId = sessionData.sessionId || uuidv4();
    const now = new Date();

    const session = {
      id: sessionId,
      ipAddress: sessionData.ipAddress || '',
      userAgent: sessionData.userAgent || '',
      createdAt: now,
      lastAccess: now,
      data: sessionData.data || {}
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  async getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Update last access time
      session.lastAccess = new Date();
      this.sessions.set(sessionId, session);
    }
    return session;
  }

  async updateSession(sessionId, data) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.data = { ...session.data, ...data };
    session.lastAccess = new Date();
    this.sessions.set(sessionId, session);
    return session;
  }

  // Analytics and Statistics
  async getPollStats(pollId) {
    const poll = this.polls.get(pollId);
    if (!poll) return null;

    const votes = await this.getVotesForPoll(pollId);
    
    return {
      totalVotes: votes.length,
      uniqueVoters: new Set(votes.map(v => v.voterIdentifier || v.ipAddress)).size,
      createdAt: poll.createdAt,
      lastVoteAt: votes.length > 0 ? Math.max(...votes.map(v => v.createdAt)) : null
    };
  }

  async getSystemStats() {
    return {
      totalPolls: this.polls.size,
      activePolls: Array.from(this.polls.values()).filter(p => p.isActive).length,
      totalVotes: this.votes.size,
      activeSessions: this.sessions.size,
      memoryUsage: process.memoryUsage()
    };
  }

  // Cleanup and Maintenance
  async cleanup() {
    const now = new Date();
    const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours
    
    // Clean up old sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastAccess > maxSessionAge) {
        this.sessions.delete(sessionId);
        this.pollsBySession.delete(sessionId);
      }
    }

    // Clean up expired polls
    for (const [pollId, poll] of this.polls.entries()) {
      if (poll.expiresAt && now > poll.expiresAt) {
        await this.deletePoll(pollId);
      }
    }

    console.log(`🧹 Cleanup completed. Active polls: ${this.polls.size}, Sessions: ${this.sessions.size}`);
  }

  // Export/Import for persistence (optional)
  exportData() {
    return {
      polls: Array.from(this.polls.entries()),
      votes: Array.from(this.votes.entries()),
      sessions: Array.from(this.sessions.entries()),
      pollsBySession: Array.from(this.pollsBySession.entries()).map(([k, v]) => [k, Array.from(v)])
    };
  }

  importData(data) {
    if (data.polls) {
      this.polls = new Map(data.polls);
    }
    if (data.votes) {
      this.votes = new Map(data.votes);
    }
    if (data.sessions) {
      this.sessions = new Map(data.sessions);
    }
    if (data.pollsBySession) {
      this.pollsBySession = new Map(data.pollsBySession.map(([k, v]) => [k, new Set(v)]));
    }
  }
}

// Singleton instance
const memoryStore = new MemoryStore();

// Auto-cleanup every hour
setInterval(() => {
  memoryStore.cleanup();
}, 60 * 60 * 1000);

module.exports = memoryStore;
