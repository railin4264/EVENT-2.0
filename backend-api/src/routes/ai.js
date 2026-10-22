const express = require('express');
const { protect } = require('../middleware/auth');
const AIRecommendationService = require('../services/AIRecommendationService');
const logger = require('../utils/logger');

const router = express.Router();

// @desc    Get AI event recommendations
// @route   GET /api/ai/recommendations/events
// @access  Private
router.get('/recommendations/events', protect, async (req, res) => {
  try {
    const { lat, lng, radius, limit } = req.query;

    const options = {
      limit: parseInt(limit) || 10,
      radius: parseInt(radius) || 25
    };

    if (lat && lng) {
      options.location = {
        lat: parseFloat(lat),
        lng: parseFloat(lng)
      };
    }

    const recommendations = await AIRecommendationService.getEventRecommendations(
      req.user,
      options
    );

    res.json({
      success: true,
      count: recommendations.length,
      data: recommendations
    });
  } catch (error) {
    logger.error('Error getting event recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting event recommendations'
    });
  }
});

// @desc    Enhance Event Title and Description using AI (B2B Creator Tool)
// @route   POST /api/ai/enhance-event
// @access  Private
router.post('/enhance-event', protect, async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title && !description) {
      return res.status(400).json({
        success: false,
        message: 'Must provide either title or description to enhance'
      });
    }

    if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ success: false, code: 'AI_NOT_CONFIGURED', message: 'La mejora con IA aún no está configurada. Puedes editar y publicar tu texto manualmente.' });
    const aiResult = await AIRecommendationService.enhanceEventDescriptionWithAI(title, description);
    if (!aiResult || !(aiResult.title || aiResult.description)) return res.status(502).json({ success: false, code: 'AI_UNAVAILABLE', message: 'El proveedor no devolvió una mejora válida. Tu texto se conserva.' });
    return res.json({ success: true, data: { title: aiResult.title || title, description: aiResult.description || description }, source: 'claude' });

  } catch (error) {
    logger.error('Error enhancing event with AI:', error);
    res.status(502).json({
      success: false, code: 'AI_UNAVAILABLE',
      message: 'La mejora con IA no está disponible. Tu texto se conserva.'
    });
  }
});

// @desc    Get AI tribe recommendations
// @route   GET /api/ai/recommendations/tribes
// @access  Private
router.get('/recommendations/tribes', protect, async (req, res) => {
  try {
    const { limit } = req.query;

    const options = {
      limit: parseInt(limit) || 5
    };

    const recommendations = await AIRecommendationService.getTribeRecommendations(
      req.user,
      options
    );

    res.json({
      success: true,
      count: recommendations.length,
      data: recommendations
    });
  } catch (error) {
    logger.error('Error getting tribe recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting tribe recommendations'
    });
  }
});

// @desc    Get user recommendations (people to follow)
// @route   GET /api/ai/recommendations/users
// @access  Private
router.get('/recommendations/users', protect, async (req, res) => {
  try {
    const { limit } = req.query;

    const options = {
      limit: parseInt(limit) || 5
    };

    const recommendations = await AIRecommendationService.getUserRecommendations(
      req.user,
      options
    );

    res.json({
      success: true,
      count: recommendations.length,
      data: recommendations
    });
  } catch (error) {
    logger.error('Error getting user recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting user recommendations'
    });
  }
});

// @desc    Get AI recommendations (general)
// @route   GET /api/ai/recommendations
// @access  Private
router.get('/recommendations', protect, async (req, res) => {
  try {
    const { lat, lng, radius, limit } = req.query;

    const options = {
      limit: parseInt(limit) || 10,
      radius: parseInt(radius) || 25
    };

    if (lat && lng) {
      options.location = {
        lat: parseFloat(lat),
        lng: parseFloat(lng)
      };
    }

    // Get all types of recommendations in parallel
    const [eventRecommendations, tribeRecommendations, userRecommendations] = await Promise.all([
      AIRecommendationService.getEventRecommendations(req.user, options),
      AIRecommendationService.getTribeRecommendations(req.user, { limit: 5 }),
      AIRecommendationService.getUserRecommendations(req.user, { limit: 5 })
    ]);

    res.json({
      success: true,
      data: {
        events: eventRecommendations,
        tribes: tribeRecommendations,
        users: userRecommendations
      }
    });
  } catch (error) {
    logger.error('Error getting AI recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting AI recommendations'
    });
  }
});

// @desc    Get curated feed
// @route   GET /api/ai/feed
// @access  Private
router.get('/feed', protect, async (req, res) => {
  try {
    const { limit, offset } = req.query;

    const options = {
      limit: parseInt(limit) || 20,
      offset: parseInt(offset) || 0
    };

    const feed = await AIRecommendationService.getCuratedFeed(req.user, options);

    res.json({
      success: true,
      count: feed.length,
      data: feed
    });
  } catch (error) {
    logger.error('Error getting curated feed:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting curated feed'
    });
  }
});

// @desc    Get trending content
// @route   GET /api/ai/trending
// @access  Public
router.get('/trending', async (req, res) => {
  try {
    const { timeframe, lat, lng, category, limit } = req.query;

    const options = {
      timeframe: timeframe || '24h',
      limit: parseInt(limit) || 10,
      category
    };

    if (lat && lng) {
      options.location = {
        lat: parseFloat(lat),
        lng: parseFloat(lng)
      };
    }

    const trending = await AIRecommendationService.getTrendingContent(options);

    res.json({
      success: true,
      count: trending.length,
      data: trending
    });
  } catch (error) {
    logger.error('Error getting trending content:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting trending content'
    });
  }
});

// @desc    Get AI-powered smart event recommendations with Claude rationale
// @route   GET /api/ai/recommendations/smart
// @access  Private
router.get('/recommendations/smart', protect, async (req, res) => {
  try {
    const { lat, lng, radius, limit } = req.query;

    const options = {
      limit: parseInt(limit) || 5,
      radius: parseInt(radius) || 25
    };

    if (lat && lng) {
      options.location = {
        lat: parseFloat(lat),
        lng: parseFloat(lng)
      };
    }

    const recommendations = await AIRecommendationService.getSmartRecommendations(
      req.user,
      options
    );

    res.json({
      success: true,
      count: recommendations.length,
      data: recommendations,
      aiEnhanced: !!process.env.ANTHROPIC_API_KEY
    });
  } catch (error) {
    logger.error('Error getting smart recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting smart recommendations'
    });
  }
});

// @desc    Record user interaction for learning
// @route   POST /api/ai/interaction
// @access  Private
router.post('/interaction', protect, async (req, res) => {
  try {
    const { eventId, type } = req.body;

    if (!eventId || !type) {
      return res.status(400).json({
        success: false,
        message: 'Event ID and interaction type are required'
      });
    }

    const validTypes = ['view', 'like', 'attend', 'share'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid interaction type. Valid types: ' + validTypes.join(', ')
      });
    }

    await AIRecommendationService.recordUserInteraction(
      req.user._id,
      eventId,
      type
    );

    res.json({
      success: true,
      message: 'Interaction recorded successfully'
    });
  } catch (error) {
    logger.error('Error recording user interaction:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording user interaction'
    });
  }
});

module.exports = router;