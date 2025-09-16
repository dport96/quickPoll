const express = require('express');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Validation middleware
const validatePoll = [
  body('title')
    .isLength({ min: 3, max: 255 })
    .withMessage('Title must be between 3 and 255 characters'),
  body('type')
    .isIn(['simple', 'rating', 'ranking'])
    .withMessage('Type must be simple, rating, or ranking'),
  body('options')
    .isArray({ min: 2, max: 10 })
    .withMessage('Must have between 2 and 10 options'),
  body('options.*')
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Each option must be 1-100 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('requireAuth')
    .optional()
    .isBoolean()
    .withMessage('requireAuth must be a boolean'),
  body('validEmails')
    .optional()
    .isArray()
    .withMessage('validEmails must be an array'),
];

// Error handler for validation
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

// GET /api/polls/current - Get current poll details
router.get('/current', async (req, res) => {
  try {
    const memoryStore = req.memoryStore;
    const poll = await memoryStore.getCurrentPoll();
    const includeClosed = req.query.includeClosed === 'true';

    if (!poll) {
      return res.status(404).json({ error: 'No active poll found' });
    }

    // Check if poll has expired
    if (poll.expiresAt && new Date(poll.expiresAt) < new Date()) {
      return res.status(410).json({ error: 'Poll has expired' });
    }

    // Check if poll is closed (only reject if includeClosed is false)
    if (poll.isClosed && !includeClosed) {
      return res.status(410).json({ error: 'Poll has been closed' });
    }

    // Get vote count
    const votes = await memoryStore.getVotesForPoll();

    res.json({
      success: true,
      poll: {
        title: poll.title,
        description: poll.description,
        type: poll.type,
        requireAuth: poll.requireAuth,
        validEmails: poll.validEmails || [],
        options: poll.options,
        createdAt: poll.createdAt,
        createdBy: poll.createdBy,
        creatorName: poll.creatorName,
        totalVotes: votes.length,
        expiresAt: poll.expiresAt,
        isClosed: poll.isClosed,
        closedAt: poll.closedAt
      }
    });
  } catch (error) {
    console.error('Error fetching current poll:', error);
    res.status(500).json({ error: 'Failed to fetch current poll' });
  }
});

// POST /api/polls - Create new poll
router.post('/', validatePoll, handleValidationErrors, async (req, res) => {
  try {
    console.log('📊 Poll creation attempt:', req.body);
    
    const memoryStore = req.memoryStore;
    
    // Check if there's already an active poll
    const existingPoll = await memoryStore.getCurrentPoll();
    if (existingPoll && !existingPoll.isClosed) {
      console.log('❌ Poll creation blocked - active poll exists:', existingPoll.title);
      return res.status(409).json({ 
        error: 'Poll already exists',
        message: 'There is already an active poll. Please wait for it to be closed before creating a new one.',
        existingPoll: {
          title: existingPoll.title,
          createdAt: existingPoll.createdAt,
          createdBy: existingPoll.createdBy
        }
      });
    }

    const {
      title,
      description,
      type,
      options,
      requireAuth = true,
      validEmails = [],
      expiresAt,
      createdBy,
      creatorName
    } = req.body;

    // Authentication check - allow anonymous creation but track properly
    const isAnonymous = !createdBy || createdBy === 'anonymous';
    const actualCreatedBy = isAnonymous ? `anonymous-${Date.now()}` : createdBy.toLowerCase();
    const actualCreatorName = isAnonymous ? 'Anonymous User' : (creatorName || createdBy);

    const sessionId = req.sessionID;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || '';

    const pollData = {
      title,
      description,
      type,
      options,
      requireAuth,
      validEmails: validEmails.map(email => email.trim().toLowerCase()),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      sessionId,
      createdBy: actualCreatedBy,
      creatorName: actualCreatorName,
      creatorInfo: {
        ipAddress,
        userAgent,
        createdBy: actualCreatedBy
      }
    };

    const poll = await memoryStore.createPoll(pollData);
    console.log('✅ Poll created successfully:', poll.title, 'by', poll.createdBy);

    // Create or update session
    await memoryStore.createSession({
      sessionId,
      ipAddress,
      userAgent,
      data: { createdPoll: true }
    });

    // Emit real-time event for new poll creation
    req.io.emit('pollCreated', {
      title: poll.title,
      type: poll.type
    });

    res.status(201).json({
      success: true,
      poll: {
        title: poll.title,
        description: poll.description,
        type: poll.type,
        requireAuth: poll.requireAuth,
        validEmails: poll.validEmails || [],
        options: poll.options,
        createdAt: poll.createdAt,
        totalVotes: 0,
        // Generate URLs for sharing (no ID needed)
        votingUrl: `${req.protocol}://${req.get('host')}/vote`,
        resultsUrl: `${req.protocol}://${req.get('host')}/results`
      }
    });
  } catch (error) {
    console.error('Error creating poll:', error);
    res.status(500).json({ error: 'Failed to create poll' });
  }
});

// GET /api/polls/results - Get current poll results
router.get('/results', async (req, res) => {
  try {
    const memoryStore = req.memoryStore;

    // Get current poll details
    const poll = await memoryStore.getCurrentPoll();
    if (!poll) {
      return res.status(404).json({ error: 'No active poll found' });
    }

    // Get all votes for this poll
    const votes = await memoryStore.getVotesForPoll();

    // Calculate results based on poll type
    let results = {};
    
    switch (poll.type) {
      case 'simple':
        results = calculateSimpleResults(votes, poll.options);
        break;
      case 'rating':
        results = calculateRatingResults(votes, poll.options);
        break;
      case 'ranking':
        results = calculateRankingResults(votes, poll.options);
        break;
      default:
        results = { error: 'Unknown poll type' };
    }

    // For authenticated polls, include voter list (without vote data)
    let voters = [];
    if (poll.requireAuth) {
      voters = votes
        .filter(vote => vote.voterIdentifier) // Only authenticated votes
        .map(vote => ({
          id: vote.id,
          email: vote.voterIdentifier,
          name: vote.voterInfo?.name || '',
          submittedAt: vote.createdAt
        }))
        .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt)); // Sort by submission time
    }

    res.json({
      success: true,
      poll: {
        title: poll.title,
        description: poll.description,
        type: poll.type,
        requireAuth: poll.requireAuth,
        validEmails: poll.validEmails || [],
        options: poll.options,
        createdAt: poll.createdAt,
        createdBy: poll.createdBy,
        creatorName: poll.creatorName,
        isClosed: poll.isClosed || false,
        closedAt: poll.closedAt || null
      },
      results: {
        ...results,
        totalVotes: votes.length,
        voters: voters, // Include voter list for authenticated polls
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching poll results:', error);
    res.status(500).json({ error: 'Failed to fetch poll results' });
  }
});

// PUT /api/polls - Update current poll
router.put('/', async (req, res) => {
  try {
    console.log('📝 Poll update attempt:', req.body);
    const { title, description, expiresAt, isClosed, closedAt, requestedBy } = req.body;
    const memoryStore = req.memoryStore;
    const sessionId = req.sessionID;

    const poll = await memoryStore.getCurrentPoll();
    if (!poll) {
      console.log('❌ No active poll found for update');
      return res.status(404).json({ error: 'No active poll found' });
    }

    console.log('🔐 Checking authorization - poll.createdBy:', poll.createdBy, 'poll.sessionId:', poll.sessionId, 'req.sessionID:', sessionId, 'requestedBy:', requestedBy);
    
    // Check authorization: 
    // 1. For authenticated users: match email address
    // 2. For anonymous users: match session ID
    let isAuthorized = false;
    
    if (requestedBy) {
      // User provided their email, check if they created this poll (case-insensitive)
      isAuthorized = poll.createdBy.toLowerCase() === requestedBy.toLowerCase();
      console.log('🔐 Email-based authorization check:', isAuthorized);
    } else if (poll.createdBy && poll.createdBy.startsWith('anonymous-')) {
      // Anonymous poll, check session ID
      isAuthorized = poll.sessionId === sessionId;
      console.log('🔐 Session-based authorization check:', isAuthorized);
    } else {
      // Fallback to session check
      isAuthorized = poll.sessionId === sessionId;
      console.log('🔐 Fallback session-based authorization check:', isAuthorized);
    }
    
    if (!isAuthorized) {
      console.log('❌ Authorization failed - user does not own this poll');
      return res.status(403).json({ error: 'Not authorized to update this poll' });
    }

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (isClosed !== undefined) updates.isClosed = isClosed;
    if (closedAt !== undefined) updates.closedAt = closedAt;

    const updatedPoll = await memoryStore.updatePoll(updates);
    console.log('✅ Poll updated successfully:', updates);

    // Emit real-time update
    req.io.emit('pollUpdated', {
      updates
    });

    res.json({
      success: true,
      poll: updatedPoll
    });
  } catch (error) {
    console.error('Error updating poll:', error);
    res.status(500).json({ error: 'Failed to update poll' });
  }
});

// DELETE /api/polls - Delete current poll
router.delete('/', async (req, res) => {
  try {
    const memoryStore = req.memoryStore;
    const sessionId = req.sessionID;

    const poll = await memoryStore.getCurrentPoll();
    if (!poll) {
      return res.status(404).json({ error: 'No active poll found' });
    }

    // Check if user owns this poll
    if (poll.sessionId !== sessionId) {
      return res.status(403).json({ error: 'Not authorized to delete this poll' });
    }

    const deleted = await memoryStore.deletePoll();
    if (!deleted) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    // Emit real-time event
    req.io.emit('pollDeleted', {});

    res.json({
      success: true,
      message: 'Poll deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting poll:', error);
    res.status(500).json({ error: 'Failed to delete poll' });
  }
});

// Helper functions for calculating results
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

module.exports = router;
