const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const { protect: authMiddleware } = require('../middleware/auth');
const User = require('../models/User');
const Achievement = require('../models/Achievement');
const UserAchievement = require('../models/UserAchievement');
const Challenge = require('../models/Challenge');
const UserChallenge = require('../models/UserChallenge');
const GamificationService = require('../services/gamificationService');
const ChallengeService = require('../services/challengeService');
const logger = require('../utils/logger');

const router = express.Router();

// Initialize services
const gamificationService = new GamificationService();
const challengeService = new ChallengeService(gamificationService);

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Datos de entrada inválidos',
      errors: errors.array(),
    });
  }
  next();
};

// @route   GET /api/gamification/profile
// @desc    Get user gamification profile
// @access  Private
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const profile = await gamificationService.getUserProfile(req.user.id);
      
    logger.info('GET', '/api/gamification/profile', req.user.id);
    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    logger.error('GET', '/api/gamification/profile', error, req.user.id);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el perfil de gamificación',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// @route   GET /api/gamification/achievements
// @desc    Get user achievements
// @access  Private
router.get('/achievements',
  authMiddleware,
  [
    query('completed').optional().isBoolean().withMessage('Completed must be boolean'),
    query('category').optional().isIn(['event', 'social', 'exploration', 'mastery', 'special']).withMessage('Invalid category'),
    query('rarity').optional().isIn(['common', 'rare', 'epic', 'legendary']).withMessage('Invalid rarity'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { completed, category, rarity, page = 1, limit = 20 } = req.query;
      
      const options = {
        completed: completed !== undefined ? JSON.parse(completed) : null,
        category,
        rarity,
        page: parseInt(page),
        limit: parseInt(limit),
      };

      const achievements = await UserAchievement.getUserAchievements(req.user.id, options);
      
      // Filter out achievements that don't match the criteria
      const filteredAchievements = achievements.filter(ua => ua.achievement !== null);

      logger.info('GET', '/api/gamification/achievements', req.user.id);
      res.json({
        success: true,
        data: filteredAchievements,
        pagination: {
          page: options.page,
          limit: options.limit,
          hasMore: filteredAchievements.length === options.limit,
        },
      });
    } catch (error) {
      logger.error('GET', '/api/gamification/achievements', error, req.user.id);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los logros',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   GET /api/gamification/achievements/available
// @desc    Get all available achievements
// @access  Private
router.get('/achievements/available',
  authMiddleware,
  [
    query('category').optional().isIn(['event', 'social', 'exploration', 'mastery', 'special']).withMessage('Invalid category'),
    query('rarity').optional().isIn(['common', 'rare', 'epic', 'legendary']).withMessage('Invalid rarity'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { category, rarity } = req.query;
      
      const filter = { isActive: true };
      if (category) filter.category = category;
      if (rarity) filter.rarity = rarity;

      const achievements = await Achievement.find(filter).sort({ category: 1, rarity: 1 });
      
      // Get user's progress for each achievement
      const userAchievements = await UserAchievement.find({
        user: req.user.id,
        achievementId: { $in: achievements.map(a => a.id) },
      });

      const userAchievementMap = userAchievements.reduce((map, ua) => {
        map[ua.achievementId] = ua;
        return map;
      }, {});

      const enrichedAchievements = achievements.map(achievement => {
        const userAchievement = userAchievementMap[achievement.id];
        return {
          ...achievement.toObject(),
          userProgress: userAchievement ? {
            current: userAchievement.progress.current,
            target: userAchievement.progress.target,
            percentage: userAchievement.progress.percentage,
            isCompleted: userAchievement.isCompleted,
            unlockedAt: userAchievement.unlockedAt,
          } : {
            current: 0,
            target: achievement.requirements.target || 1,
            percentage: 0,
            isCompleted: false,
            unlockedAt: null,
          },
        };
      });

      logger.info('GET', '/api/gamification/achievements/available', req.user.id);
      res.json({
        success: true,
        data: enrichedAchievements,
      });
    } catch (error) {
      logger.error('GET', '/api/gamification/achievements/available', error, req.user.id);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los logros disponibles',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   GET /api/gamification/leaderboards
// @desc    Get leaderboards
// @access  Private
router.get('/leaderboards',
  authMiddleware,
  [
    query('type').optional().isIn(['xp', 'level', 'achievements']).withMessage('Invalid leaderboard type'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('timeframe').optional().isIn(['all_time', 'monthly', 'weekly']).withMessage('Invalid timeframe'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { type = 'xp', limit = 20, timeframe = 'all_time' } = req.query;
      
      const leaderboard = await gamificationService.getLeaderboard(
        type,
        parseInt(limit),
        timeframe
      );

      logger.info('GET', '/api/gamification/leaderboards', req.user.id);
      res.json({
        success: true,
        data: {
          type,
          timeframe,
          leaderboard,
        },
      });
    } catch (error) {
      logger.error('GET', '/api/gamification/leaderboards', error, req.user.id);
      res.status(500).json({
        success: false,
        message: 'Error al obtener las tablas de clasificación',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   GET /api/gamification/challenges
// @desc    Get active challenges for user
// @access  Private
router.get('/challenges',
  authMiddleware,
  [
    query('type').optional().isIn(['daily', 'weekly', 'monthly', 'special']).withMessage('Invalid challenge type'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { type } = req.query;

      const challenges = await challengeService.getUserActiveChallenges(req.user.id, type);

      logger.info('GET', '/api/gamification/challenges', req.user.id);
      res.json({
        success: true,
        data: challenges,
      });
    } catch (error) {
      logger.error('GET', '/api/gamification/challenges', error, req.user.id);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los desafíos',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   POST /api/gamification/challenges/enroll
// @desc    Enroll user in a challenge
// @access  Private
router.post('/challenges/enroll',
  authMiddleware,
  [
    body('challengeId').notEmpty().withMessage('Challenge ID is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { challengeId } = req.body;

      const result = await challengeService.enrollUserInChallenge(req.user.id, challengeId);

      logger.info('POST', '/api/gamification/challenges/enroll', req.user.id);
      res.json({
        success: true,
        message: 'Inscripción exitosa en el desafío',
        data: result.userChallenge,
      });
    } catch (error) {
      logger.error('POST', '/api/gamification/challenges/enroll', error, req.user.id);
      res.status(500).json({
        success: false,
        message: error.message || 'Error al inscribirse en el desafío',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   GET /api/gamification/challenges/stats
// @desc    Get user challenge statistics
// @access  Private
router.get('/challenges/stats',
  authMiddleware,
  async (req, res) => {
    try {
      const stats = await challengeService.getUserChallengeStats(req.user.id);

      logger.info('GET', '/api/gamification/challenges/stats', req.user.id);
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('GET', '/api/gamification/challenges/stats', error, req.user.id);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas de desafíos',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   POST /api/gamification/track-action
// @desc    Track user action for achievements and challenges
// @access  Private
router.post('/track-action',
  authMiddleware,
  [
    body('action').notEmpty().withMessage('Action is required'),
    body('metadata').optional().isObject().withMessage('Metadata must be an object'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { action, metadata = {} } = req.body;

      // Track both achievements and challenges
      const [unlockedAchievements, completedChallenges] = await Promise.all([
        gamificationService.trackAction(req.user.id, action, metadata),
        challengeService.trackChallengeAction(req.user.id, action, metadata),
      ]);

      logger.info('POST', '/api/gamification/track-action', req.user.id);
      res.json({
        success: true,
        data: {
          action,
          unlockedAchievements: unlockedAchievements.length,
          achievements: unlockedAchievements,
          completedChallenges: completedChallenges.length,
          challenges: completedChallenges,
        },
      });
    } catch (error) {
      logger.error('POST', '/api/gamification/track-action', error, req.user.id);
      res.status(500).json({
        success: false,
        message: 'Error al rastrear la acción',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   POST /api/gamification/award-xp
// @desc    Award XP to user (admin only)
// @access  Private/Admin
router.post('/award-xp',
  authMiddleware,
  [
    body('userId').optional().isMongoId().withMessage('Invalid user ID'),
    body('amount').isInt({ min: 1 }).withMessage('Amount must be a positive integer'),
    body('source').optional().notEmpty().withMessage('Source cannot be empty'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      // Check if user is admin (you might want to implement proper role checking)
      if (!req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado',
        });
      }

      const { userId = req.user.id, amount, source = 'manual_award' } = req.body;
      
      const result = await gamificationService.awardXP(userId, amount, source);

      logger.info('POST', '/api/gamification/award-xp', req.user.id);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('POST', '/api/gamification/award-xp', error, req.user.id);
      res.status(500).json({
        success: false,
        message: 'Error al otorgar XP',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   GET /api/gamification/stats
// @desc    Get gamification statistics
// @access  Private
router.get('/stats',
  authMiddleware,
  async (req, res) => {
    try {
      const [
        userProfile,
        totalAchievements,
        totalUsers,
        avgLevel,
      ] = await Promise.all([
        gamificationService.getUserProfile(req.user.id),
        Achievement.countDocuments({ isActive: true }),
        User.countDocuments({}),
        User.aggregate([
          { $group: { _id: null, avgLevel: { $avg: '$gamification.level' } } },
        ]),
      ]);

      const stats = {
        user: userProfile.stats,
        global: {
          totalAchievements,
          totalUsers,
          averageLevel: avgLevel[0]?.avgLevel || 1,
        },
        leaderboardPosition: userProfile.leaderboardPosition,
      };

      logger.info('GET', '/api/gamification/stats', req.user.id);
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('GET', '/api/gamification/stats', error, req.user.id);
      res.status(500).json({
        success: false,
        message: 'Error al obtener las estadísticas',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   POST /api/gamification/challenges/create
// @desc    Create new challenge (admin only)
// @access  Private/Admin
router.post('/challenges/create',
  authMiddleware,
  [
    body('id').notEmpty().withMessage('Challenge ID is required'),
    body('title').trim().isLength({ min: 1, max: 100 }).withMessage('Title must be between 1-100 characters'),
    body('description').trim().isLength({ min: 1, max: 500 }).withMessage('Description must be between 1-500 characters'),
    body('type').isIn(['daily', 'weekly', 'monthly', 'special']).withMessage('Invalid challenge type'),
    body('category').isIn(['event', 'social', 'exploration', 'mastery', 'special']).withMessage('Invalid category'),
    body('requirements.action').notEmpty().withMessage('Requirements action is required'),
    body('requirements.target').isInt({ min: 1 }).withMessage('Requirements target must be a positive integer'),
    body('duration').isInt({ min: 1 }).withMessage('Duration must be a positive integer'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado - Se requieren permisos de administrador',
        });
      }

      const challengeData = {
        ...req.body,
        createdBy: req.user.id,
        startDate: new Date(),
        endDate: new Date(Date.now() + req.body.duration * 60 * 60 * 1000),
      };

      const result = await challengeService.createChallenge(challengeData);

      logger.info('POST', '/api/gamification/challenges/create', req.user.id);
      res.status(201).json({
        success: true,
        message: 'Desafío creado exitosamente',
        data: result.challenge,
      });
    } catch (error) {
      logger.error('POST', '/api/gamification/challenges/create', error, req.user.id);
      res.status(500).json({
        success: false,
        message: 'Error al crear el desafío',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   POST /api/gamification/challenges/auto-enroll
// @desc    Auto-enroll users in daily/weekly challenges (admin only)
// @access  Private/Admin
router.post('/challenges/auto-enroll',
  authMiddleware,
  async (req, res) => {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado - Se requieren permisos de administrador',
        });
      }

      const result = await challengeService.autoEnrollUsersInChallenges();

      logger.info('POST', '/api/gamification/challenges/auto-enroll', req.user.id);
      res.json({
        success: true,
        message: 'Inscripción automática completada',
        data: result,
      });
    } catch (error) {
      logger.error('POST', '/api/gamification/challenges/auto-enroll', error, req.user.id);
      res.status(500).json({
        success: false,
        message: 'Error en la inscripción automática',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   POST /api/gamification/challenges/cleanup
// @desc    Clean up expired challenges (admin only)
// @access  Private/Admin
router.post('/challenges/cleanup',
  authMiddleware,
  async (req, res) => {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado - Se requieren permisos de administrador',
        });
      }

      const result = await challengeService.cleanupExpiredChallenges();

      logger.info('POST', '/api/gamification/challenges/cleanup', req.user.id);
      res.json({
        success: true,
        message: 'Limpieza de desafíos completada',
        data: result,
      });
    } catch (error) {
      logger.error('POST', '/api/gamification/challenges/cleanup', error, req.user.id);
      res.status(500).json({
        success: false,
        message: 'Error en la limpieza de desafíos',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   POST /api/gamification/initialize
// @desc    Initialize default achievements and challenges (admin only)
// @access  Private/Admin
router.post('/initialize',
  authMiddleware,
  async (req, res) => {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado - Se requieren permisos de administrador',
        });
      }

      // Initialize both achievements and challenges
      await Promise.all([
        Achievement.initializeDefaults(),
        challengeService.initializeDefaultChallenges(),
      ]);

      logger.info('POST', '/api/gamification/initialize', req.user.id);
      res.json({
        success: true,
        message: 'Sistema de gamificación inicializado correctamente',
      });
    } catch (error) {
      logger.error('POST', '/api/gamification/initialize', error, req.user.id);
      res.status(500).json({
        success: false,
        message: 'Error al inicializar el sistema de gamificación',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

module.exports = router;