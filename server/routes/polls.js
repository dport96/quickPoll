const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

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

const validatePollId = [
  param('id').isUUID().withMessage('Invalid poll ID format')
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

// GET /api/polls/:id - Get poll details
router.get('/:id', validatePollId, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const memoryStore = req.memoryStore;
    
    
    const poll = await memoryStore.getPoll(id);
    console.log(`🎯 Poll found:`, poll ? 'YES' : 'NO');

    if (!poll || !poll.isActive) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    // Check if poll has expired
    if (poll.expiresAt && new Date(poll.expiresAt) < new Date()) {
      return res.status(410).json({ error: 'Poll has expired' });
    }

    // Get vote count
    const votes = await memoryStore.getVotesForPoll(id);

    res.json({
      success: true,
      poll: {
        id: poll.id,
        title: poll.title,
        description: poll.description,
        type: poll.type,
        requireAuth: poll.requireAuth,
        validEmails: poll.validEmails || [],
        options: poll.options,
        createdAt: poll.createdAt,
        totalVotes: votes.length,
        expiresAt: poll.expiresAt
      }
    });
  } catch (error) {
    console.error('Error fetching poll:', error);
    res.status(500).json({ error: 'Failed to fetch poll' });
  }
});

// POST /api/polls - Create new poll
router.post('/', validatePoll, handleValidationErrors, async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      options,
      requireAuth = false,
      validEmails = [],
      expiresAt,
      createdBy
    } = req.body;

    const memoryStore = req.memoryStore;
    const sessionId = req.sessionID;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || '';

    const pollData = {
      title,
      description,
      type,
      options,
      requireAuth,
      validEmails,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      sessionId,
      creatorInfo: {
        ipAddress,
        userAgent,
        createdBy
      }
    };

    const poll = await memoryStore.createPoll(pollData);

    // Create or update session
    await memoryStore.createSession({
      sessionId,
      ipAddress,
      userAgent,
      data: { createdPolls: [poll.id] }
    });

    // Emit real-time event for new poll creation
    req.io.emit('pollCreated', {
      pollId: poll.id,
      title: poll.title,
      type: poll.type
    });

    res.status(201).json({
      success: true,
      poll: {
        id: poll.id,
        title: poll.title,
        description: poll.description,
        type: poll.type,
        requireAuth: poll.requireAuth,
        validEmails: poll.validEmails || [],
        options: poll.options,
        createdAt: poll.createdAt,
        totalVotes: 0,
        // Generate URLs for sharing
        votingUrl: `${req.protocol}://${req.get('host')}/vote/${poll.id}`,
        resultsUrl: `${req.protocol}://${req.get('host')}/results/${poll.id}`
      }
    });
  } catch (error) {
    console.error('Error creating poll:', error);
    res.status(500).json({ error: 'Failed to create poll' });
  }
});

// GET /api/polls/:id/results - Get poll results
router.get('/:id/results', validatePollId, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const memoryStore = req.memoryStore;

    // Get poll details
    const poll = await memoryStore.getPoll(id);
    if (!poll || !poll.isActive) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    // Get all votes for this poll
    const votes = await memoryStore.getVotesForPoll(id);

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

    res.json({
      success: true,
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
      results: {
        ...results,
        totalVotes: votes.length,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching poll results:', error);
    res.status(500).json({ error: 'Failed to fetch poll results' });
  }
});

// PUT /api/polls/:id - Update poll
router.put('/:id', validatePollId, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, expiresAt } = req.body;
    const memoryStore = req.memoryStore;
    const sessionId = req.sessionID;

    const poll = await memoryStore.getPoll(id);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    // Check if user owns this poll
    if (poll.sessionId !== sessionId) {
      return res.status(403).json({ error: 'Not authorized to update this poll' });
    }

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;

    const updatedPoll = await memoryStore.updatePoll(id, updates);

    // Emit real-time update
    req.io.to(`poll_${id}`).emit('pollUpdated', {
      pollId: id,
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

// DELETE /api/polls/:id - Delete poll
router.delete('/:id', validatePollId, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const memoryStore = req.memoryStore;
    const sessionId = req.sessionID;

    const poll = await memoryStore.getPoll(id);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    // Check if user owns this poll
    if (poll.sessionId !== sessionId) {
      return res.status(403).json({ error: 'Not authorized to delete this poll' });
    }

    const deleted = await memoryStore.deletePoll(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    // Emit real-time event
    req.io.to(`poll_${id}`).emit('pollDeleted', { pollId: id });

    res.json({
      success: true,
      message: 'Poll deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting poll:', error);
    res.status(500).json({ error: 'Failed to delete poll' });
  }
});

// GET /api/polls/session/my - Get polls created by current session
router.get('/session/my', async (req, res) => {
  try {
    const sessionId = req.sessionID;
    const memoryStore = req.memoryStore;

    const polls = await memoryStore.getPollsBySession(sessionId);

    res.json({
      success: true,
      polls: polls.map(poll => ({
        id: poll.id,
        title: poll.title,
        type: poll.type,
        createdAt: poll.createdAt,
        isActive: poll.isActive,
        totalVotes: 0 // Will be calculated if needed
      }))
    });
  } catch (error) {
    console.error('Error fetching user polls:', error);
    res.status(500).json({ error: 'Failed to fetch polls' });
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
