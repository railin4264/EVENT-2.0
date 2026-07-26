const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { protect: authMiddleware } = require('../middleware/auth');
const Follow = require('../models/Follow');
const User = require('../models/User');
const logger = require('../utils/logger');

const router = express.Router();

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

// @route   POST /api/follows/:userId
// @desc    Follow a user
// @access  Private
router.post('/:userId',
  authMiddleware,
  [
    param('userId').isMongoId().withMessage('ID de usuario inválido'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { userId } = req.params;

      // Check if trying to follow yourself
      if (userId === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'No puedes seguirte a ti mismo'
        });
      }

      // Check if target user exists
      const targetUser = await User.findById(userId);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Follow the user
      const follow = await Follow.followUser(req.user.id, userId);

      logger.info(`User ${req.user.id} started following user ${userId}`);

      res.status(201).json({
        success: true,
        message: 'Ahora sigues a este usuario',
        data: {
          followId: follow._id,
          following: {
            _id: targetUser._id,
            firstName: targetUser.firstName,
            lastName: targetUser.lastName,
            username: targetUser.username,
            avatar: targetUser.avatar
          },
          status: follow.status
        }
      });
    } catch (error) {
      logger.error('Follow user error:', error);
      
      if (error.message.includes('Already following') || 
          error.message.includes('pending') ||
          error.message.includes('Cannot follow')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error al seguir usuario',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   DELETE /api/follows/:userId
// @desc    Unfollow a user
// @access  Private
router.delete('/:userId',
  authMiddleware,
  [
    param('userId').isMongoId().withMessage('ID de usuario inválido'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { userId } = req.params;

      await Follow.unfollowUser(req.user.id, userId);

      logger.info(`User ${req.user.id} unfollowed user ${userId}`);

      res.json({
        success: true,
        message: 'Ya no sigues a este usuario'
      });
    } catch (error) {
      logger.error('Unfollow user error:', error);
      
      if (error.message.includes('Not following')) {
        return res.status(400).json({
          success: false,
          message: 'No sigues a este usuario'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error al dejar de seguir usuario',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   GET /api/follows/status/:userId
// @desc    Check if following a user
// @access  Private
router.get('/status/:userId',
  authMiddleware,
  [
    param('userId').isMongoId().withMessage('ID de usuario inválido'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { userId } = req.params;

      const isFollowing = await Follow.isFollowing(req.user.id, userId);
      const followsMe = await Follow.isFollowing(userId, req.user.id);

      res.json({
        success: true,
        data: {
          isFollowing,
          followsMe,
          isMutual: isFollowing && followsMe
        }
      });
    } catch (error) {
      logger.error('Check follow status error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al verificar estado de seguimiento',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   GET /api/follows/followers/:userId
// @desc    Get user's followers
// @access  Private
router.get('/followers/:userId',
  authMiddleware,
  [
    param('userId').isMongoId().withMessage('ID de usuario inválido'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      const followers = await Follow.getFollowers(userId, page, limit);
      const followCounts = await Follow.getFollowCounts(userId);

      // Check which followers the current user is following
      const followersWithStatus = await Promise.all(
        followers.map(async (follow) => {
          const isFollowingBack = await Follow.isFollowing(req.user.id, follow.follower._id);
          
          return {
            _id: follow._id,
            user: follow.follower,
            followedAt: follow.acceptedAt,
            isFollowingBack
          };
        })
      );

      res.json({
        success: true,
        data: {
          followers: followersWithStatus,
          ...followCounts,
          pagination: {
            page,
            limit,
            hasMore: followers.length === limit
          }
        }
      });
    } catch (error) {
      logger.error('Get followers error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener seguidores',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   GET /api/follows/following/:userId
// @desc    Get users that a user follows
// @access  Private
router.get('/following/:userId',
  authMiddleware,
  [
    param('userId').isMongoId().withMessage('ID de usuario inválido'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      const following = await Follow.getFollowing(userId, page, limit);
      const followCounts = await Follow.getFollowCounts(userId);

      // Check which users the current user is also following
      const followingWithStatus = await Promise.all(
        following.map(async (follow) => {
          const isAlsoFollowing = userId !== req.user.id ? 
            await Follow.isFollowing(req.user.id, follow.following._id) : true;
          
          return {
            _id: follow._id,
            user: follow.following,
            followedAt: follow.acceptedAt,
            isAlsoFollowing
          };
        })
      );

      res.json({
        success: true,
        data: {
          following: followingWithStatus,
          ...followCounts,
          pagination: {
            page,
            limit,
            hasMore: following.length === limit
          }
        }
      });
    } catch (error) {
      logger.error('Get following error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener usuarios seguidos',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   GET /api/follows/mutual/:userId
// @desc    Get mutual follows between current user and another user
// @access  Private
router.get('/mutual/:userId',
  authMiddleware,
  [
    param('userId').isMongoId().withMessage('ID de usuario inválido'),
    query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit) || 10;

      if (userId === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'No se pueden obtener conexiones mutuas contigo mismo'
        });
      }

      const mutualFollows = await Follow.getMutualFollows(req.user.id, userId, limit);

      res.json({
        success: true,
        data: {
          mutualFollows,
          count: mutualFollows.length
        }
      });
    } catch (error) {
      logger.error('Get mutual follows error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener conexiones mutuas',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   GET /api/follows/suggestions
// @desc    Get suggested users to follow
// @access  Private
router.get('/suggestions',
  authMiddleware,
  [
    query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;

      const suggestions = await Follow.getSuggestedUsers(req.user.id, limit);

      // Populate mutual friends details
      const suggestionsWithDetails = await Promise.all(
        suggestions.map(async (suggestion) => {
          const mutualFriendsDetails = await User.find({
            _id: { $in: suggestion.mutualFriends }
          }).select('firstName lastName username avatar').limit(3);

          return {
            ...suggestion,
            mutualFriendsDetails
          };
        })
      );

      res.json({
        success: true,
        data: suggestionsWithDetails
      });
    } catch (error) {
      logger.error('Get follow suggestions error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener sugerencias',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   GET /api/follows/requests
// @desc    Get pending follow requests (for private accounts)
// @access  Private
router.get('/requests',
  authMiddleware,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      const requests = await Follow.getFollowRequests(req.user.id, page, limit);

      const requestsData = requests.map(follow => ({
        _id: follow._id,
        user: follow.follower,
        requestedAt: follow.createdAt
      }));

      res.json({
        success: true,
        data: {
          requests: requestsData,
          pagination: {
            page,
            limit,
            hasMore: requests.length === limit
          }
        }
      });
    } catch (error) {
      logger.error('Get follow requests error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener solicitudes de seguimiento',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   POST /api/follows/requests/:requestId/accept
// @desc    Accept a follow request
// @access  Private
router.post('/requests/:requestId/accept',
  authMiddleware,
  [
    param('requestId').isMongoId().withMessage('ID de solicitud inválido'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { requestId } = req.params;

      const follow = await Follow.acceptFollowRequest(requestId, req.user.id);

      logger.info(`User ${req.user.id} accepted follow request ${requestId}`);

      res.json({
        success: true,
        message: 'Solicitud de seguimiento aceptada',
        data: {
          followId: follow._id,
          status: follow.status
        }
      });
    } catch (error) {
      logger.error('Accept follow request error:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: 'Solicitud no encontrada'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error al aceptar solicitud',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   POST /api/follows/requests/:requestId/reject
// @desc    Reject a follow request
// @access  Private
router.post('/requests/:requestId/reject',
  authMiddleware,
  [
    param('requestId').isMongoId().withMessage('ID de solicitud inválido'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { requestId } = req.params;

      await Follow.rejectFollowRequest(requestId, req.user.id);

      logger.info(`User ${req.user.id} rejected follow request ${requestId}`);

      res.json({
        success: true,
        message: 'Solicitud de seguimiento rechazada'
      });
    } catch (error) {
      logger.error('Reject follow request error:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: 'Solicitud no encontrada'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error al rechazar solicitud',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   GET /api/follows/stats/:userId
// @desc    Get follow statistics for a user
// @access  Private
router.get('/stats/:userId',
  authMiddleware,
  [
    param('userId').isMongoId().withMessage('ID de usuario inválido'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { userId } = req.params;

      const followCounts = await Follow.getFollowCounts(userId);
      const mutualCount = userId !== req.user.id ? 
        (await Follow.getMutualFollows(req.user.id, userId, 100)).length : 0;

      res.json({
        success: true,
        data: {
          ...followCounts,
          mutualCount
        }
      });
    } catch (error) {
      logger.error('Get follow stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

module.exports = router;