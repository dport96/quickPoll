const express = require('express');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Validation middleware
const validateVote = [
  body('voteData').isObject().withMessage('Vote data must be an object'),
  body('voterIdentifier').optional().isString().withMessage('Voter identifier must be a string'),
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// POST /api/votes - Submit a vote
router.post('/', validateVote, handleValidationErrors, async (req, res) => {
  try {
    console.log('📊 Vote submission attempt:', { 
      voteData: req.body.voteData, 
      voterIdentifier: req.body.voterIdentifier || 'anonymous',
      hasVoterInfo: !!req.body.voterInfo 
    });

    const {
      voteData,
      voterIdentifier,
      voterInfo = {}
    } = req.body;

    const memoryStore = req.memoryStore;
    const sessionId = req.sessionID;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || '';

    // Check if there's an active poll
    const poll = await memoryStore.getCurrentPoll();
    if (!poll) {
      return res.status(404).json({ error: 'No active poll found' });
    }

    // Check if poll has expired
    if (poll.expiresAt && new Date(poll.expiresAt) < new Date()) {
      return res.status(410).json({ error: 'Poll has expired' });
    }

    // Check if poll is closed
    if (poll.isClosed) {
      return res.status(410).json({ error: 'Poll has been closed by the creator' });
    }

    // Validate vote data based on poll type
    const validationResult = validateVoteData(voteData, poll);
    if (!validationResult.valid) {
      return res.status(400).json({ error: validationResult.error });
    }

    // Check email authentication if required
    if (poll.requireAuth) {
      if (!voterIdentifier) {
        return res.status(401).json({ 
          error: 'Email authentication required',
          message: 'Please sign in with your email to vote in this poll'
        });
      }

      // Check if email is in the valid emails list
      if (poll.validEmails && poll.validEmails.length > 0) {
        const normalizedVoterEmail = voterIdentifier.toLowerCase();
        const isValidEmail = poll.validEmails.includes(normalizedVoterEmail);
        if (!isValidEmail) {
          return res.status(403).json({ 
            error: 'Email not authorized',
            message: 'Your email address is not authorized to vote in this poll'
          });
        }
      }
    }

    // Check for duplicate votes (by session, IP, or email)
    const identifier = voterIdentifier || sessionId || ipAddress;
    const existingVote = await memoryStore.hasVoted(identifier);

    if (existingVote) {
      return res.status(409).json({
        error: 'You already voted',
        existingVote: {
          id: existingVote.id,
          submittedAt: existingVote.createdAt
        }
      });
    }

    // Submit the vote
    const vote = await memoryStore.submitVote(voteData, {
      ...voterInfo,
      voterIdentifier: voterIdentifier || '',
      ipAddress,
      userAgent,
      sessionId
    });

    // Get updated vote counts
    const allVotes = await memoryStore.getVotesForPoll();
    const totalVotes = allVotes.length;

    // Emit real-time update to all clients
    console.log(`📡 Emitting voteSubmitted to all clients`);
    req.io.emit('voteSubmitted', {
      voteId: vote.id,
      totalVotes,
      timestamp: vote.createdAt
    });

    // Calculate and emit updated results
    const results = calculateResults(allVotes, poll);
    console.log(`📡 Emitting resultsUpdated to all clients`);
    req.io.emit('resultsUpdated', {
      poll: {
        title: poll.title,
        description: poll.description,
        type: poll.type,
        requireAuth: poll.requireAuth,
        validEmails: poll.validEmails || [],
        options: poll.options,
        createdAt: poll.createdAt
      },
      results,
      totalVotes,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      vote: {
        id: vote.id,
        submittedAt: vote.createdAt
      },
      poll: {
        title: poll.title,
        totalVotes
      }
    });

  } catch (error) {
    console.error('Error submitting vote:', error);
    res.status(500).json({ error: 'Failed to submit vote' });
  }
});

// GET /api/votes/:pollId - Get votes for a poll (for poll creators)
router.get('/:pollId', async (req, res) => {
  try {
    const { pollId } = req.params;
    const memoryStore = req.memoryStore;
    const sessionId = req.sessionID;

    const poll = await memoryStore.getPoll(pollId);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    // Only allow poll creator to see individual votes
    if (poll.sessionId !== sessionId) {
      return res.status(403).json({ error: 'Not authorized to view vote details' });
    }

    const votes = await memoryStore.getVotesForPoll(pollId);

    // Return anonymized vote data
    const anonymizedVotes = votes.map(vote => ({
      id: vote.id,
      voteData: vote.voteData,
      submittedAt: vote.createdAt,
      voterInfo: {
        // Only include non-identifying information
        timestamp: vote.createdAt,
        userAgent: vote.userAgent ? vote.userAgent.split(' ')[0] : '', // Browser only
      }
    }));

    res.json({
      success: true,
      pollId,
      votes: anonymizedVotes,
      totalVotes: votes.length
    });

  } catch (error) {
    console.error('Error fetching votes:', error);
    res.status(500).json({ error: 'Failed to fetch votes' });
  }
});

// DELETE /api/votes/:voteId - Delete a vote (for poll creators or vote owners)
router.delete('/:voteId', async (req, res) => {
  try {
    const { voteId } = req.params;
    const memoryStore = req.memoryStore;
    const sessionId = req.sessionID;

    // Find the vote first
    let vote = null;
    let pollId = null;

    // Search through all votes to find the one with this ID
    for (const [key, v] of memoryStore.votes.entries()) {
      if (v.id === voteId) {
        vote = v;
        pollId = v.pollId;
        break;
      }
    }

    if (!vote) {
      return res.status(404).json({ error: 'Vote not found' });
    }

    const poll = await memoryStore.getPoll(pollId);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    // Check authorization (poll creator or vote owner)
    if (poll.sessionId !== sessionId && vote.sessionId !== sessionId) {
      return res.status(403).json({ error: 'Not authorized to delete this vote' });
    }

    const deleted = await memoryStore.deleteVote(voteId);
    if (!deleted) {
      return res.status(404).json({ error: 'Vote not found' });
    }

    // Get updated vote counts
    const allVotes = await memoryStore.getVotesForPoll(pollId);
    const totalVotes = allVotes.length;

    // Emit real-time update
    req.io.to(`poll_${pollId}`).emit('voteDeleted', {
      pollId,
      voteId,
      totalVotes,
      timestamp: new Date().toISOString()
    });

    // Calculate and emit updated results
    const results = calculateResults(allVotes, poll);
    req.io.to(`poll_${pollId}`).emit('resultsUpdated', {
      pollId,
      poll: {
        id: poll.id,
        title: poll.title,
        description: poll.description,
        type: poll.type,
        requireAuth: poll.requireAuth,
        validEmails: poll.validEmails || [],
        options: poll.options,
        createdAt: poll.createdAt
      },
      results,
      totalVotes,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Vote deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting vote:', error);
    res.status(500).json({ error: 'Failed to delete vote' });
  }
});

// Helper function to validate vote data based on poll type
function validateVoteData(voteData, poll) {
  switch (poll.type) {
    case 'simple':
      if (voteData.option === undefined || voteData.option < 0 || voteData.option >= poll.options.length) {
        return { valid: false, error: 'Invalid option selected' };
      }
      break;

    case 'rating':
      if (!voteData.ratings || !Array.isArray(voteData.ratings)) {
        return { valid: false, error: 'Ratings must be an array' };
      }
      if (voteData.ratings.length !== poll.options.length) {
        return { valid: false, error: 'Must rate all options' };
      }
      for (const rating of voteData.ratings) {
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
          return { valid: false, error: 'All ratings must be integers between 1 and 5' };
        }
      }
      break;

    case 'ranking':
      if (!voteData.rankings || !Array.isArray(voteData.rankings)) {
        return { valid: false, error: 'Rankings must be an array' };
      }
      if (voteData.rankings.length !== poll.options.length) {
        return { valid: false, error: 'Must rank all options' };
      }
      // Check if rankings are a valid permutation
      const sortedRankings = [...voteData.rankings].sort((a, b) => a - b);
      for (let i = 0; i < sortedRankings.length; i++) {
        if (sortedRankings[i] !== i) {
          return { valid: false, error: 'Rankings must be a valid permutation (0 to n-1)' };
        }
      }
      break;

    default:
      return { valid: false, error: 'Unknown poll type' };
  }

  return { valid: true };
}

// Helper function to calculate results
function calculateResults(votes, poll) {
  switch (poll.type) {
    case 'simple':
      return calculateSimpleResults(votes, poll.options);
    case 'rating':
      return calculateRatingResults(votes, poll.options);
    case 'ranking':
      return calculateRankingResults(votes, poll.options);
    default:
      return { error: 'Unknown poll type' };
  }
}

function calculateSimpleResults(votes, options) {
  const results = options.map((option, index) => ({
    option,
    votes: 0,
    percentage: 0
  }));

  votes.forEach(vote => {
    if (vote.voteData.option !== undefined) {
      const optionIndex = vote.voteData.option;
      if (optionIndex >= 0 && optionIndex < results.length) {
        results[optionIndex].votes++;
      }
    }
  });

  const totalVotes = votes.length;
  results.forEach(result => {
    result.percentage = totalVotes > 0 ? (result.votes / totalVotes) * 100 : 0;
  });

  return { options: results };
}

function calculateRatingResults(votes, options) {
  const results = options.map((option, index) => ({
    option,
    totalRating: 0,
    voteCount: 0,
    averageRating: 0,
    ratings: [0, 0, 0, 0, 0] // Count of 1-5 star ratings
  }));

  votes.forEach(vote => {
    if (vote.voteData.ratings) {
      vote.voteData.ratings.forEach((rating, index) => {
        if (index < results.length && rating >= 1 && rating <= 5) {
          results[index].totalRating += rating;
          results[index].voteCount++;
          results[index].ratings[rating - 1]++;
        }
      });
    }
  });

  results.forEach(result => {
    result.averageRating = result.voteCount > 0 ? result.totalRating / result.voteCount : 0;
  });

  return { options: results };
}

function calculateRankingResults(votes, options) {
  const results = options.map((option, index) => ({
    option,
    totalScore: 0,
    averagePosition: 0,
    votes: 0
  }));

  votes.forEach(vote => {
    if (vote.voteData.rankings) {
      vote.voteData.rankings.forEach((position, index) => {
        if (index < results.length) {
          // Higher positions get more points (inverted ranking)
          const points = options.length - position;
          results[index].totalScore += points;
          results[index].votes++;
        }
      });
    }
  });

  results.forEach(result => {
    result.averagePosition = result.votes > 0 ? result.totalScore / result.votes : 0;
  });

  // Sort by average position (higher is better)
  results.sort((a, b) => b.averagePosition - a.averagePosition);

  return { options: results };
}

// GET /api/votes/status - Check if current user has voted and is authorized to vote
router.get('/status', async (req, res) => {
  try {
    const memoryStore = req.memoryStore;
    const sessionId = req.sessionID;
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    // Get voter identifier from query params (for authenticated users)
    const voterIdentifier = req.query.voterIdentifier;
    
    // Check if there's an active poll
    const poll = await memoryStore.getCurrentPoll();
    if (!poll) {
      return res.status(404).json({ error: 'No active poll found' });
    }

    // Determine identifier to check
    const identifier = voterIdentifier || sessionId || ipAddress;
    
    // Check if user has voted
    const existingVote = await memoryStore.hasVoted(identifier);
    
    // Check if user is authorized to vote
    let isAuthorized = true;
    let authError = null;
    
    if (poll.requireAuth) {
      if (!voterIdentifier) {
        isAuthorized = false;
        authError = 'Email authentication required';
      } else if (poll.validEmails && poll.validEmails.length > 0) {
        const normalizedVoterEmail = voterIdentifier.toLowerCase();
        const isValidEmail = poll.validEmails.includes(normalizedVoterEmail);
        if (!isValidEmail) {
          isAuthorized = false;
          authError = 'Email not authorized';
        }
      }
    }
    
    res.json({
      success: true,
      hasVoted: !!existingVote,
      isAuthorized: isAuthorized,
      authError: authError,
      canVote: isAuthorized && !existingVote,
      voteId: existingVote ? existingVote.id : null,
      submittedAt: existingVote ? existingVote.createdAt : null,
      poll: {
        requireAuth: poll.requireAuth,
        hasValidEmailsList: !!(poll.validEmails && poll.validEmails.length > 0)
      }
    });
  } catch (error) {
    console.error('Error checking vote status:', error);
    res.status(500).json({ error: 'Failed to check vote status' });
  }
});

module.exports = router;