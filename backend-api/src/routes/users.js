const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const Follow = require('../models/Follow');
const { protect } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed!'), false);
    }
  }
});

// @desc    Get current user profile
// @route   GET /api/users/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get user profile (own profile or by user ID)
// @route   GET /api/users/profile/:id?
// @access  Private
router.get('/profile/:id?', protect, async (req, res) => {
  try {
    const userId = req.params.id || req.user.id;
    const isOwnProfile = userId === req.user.id;

    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get follow counts and relationship status
    const stats = await Follow.getFollowCounts(userId);
    const isFollowing = !isOwnProfile ? await Follow.isFollowing(req.user.id, userId) : false;

    // Add stats and follow status to user data
    const userWithStats = {
      ...user.toObject(),
      id: user._id, // Add id field for frontend compatibility
      stats: {
        eventsAttended: user.eventsAttended?.length || 0,
        eventsCreated: user.eventsCreated?.length || 0,
        tribesJoined: user.tribesJoined?.length || 0,
        connections: stats.followersCount
      },
      isFollowing,
      followersCount: stats.followersCount,
      followingCount: stats.followingCount
    };

    // If viewing someone else's private profile and not following, limit data
    if (!isOwnProfile && user.isPrivate && !isFollowing) {
      userWithStats.email = undefined;
      userWithStats.phone = undefined;
      userWithStats.location = undefined;
      userWithStats.socialLinks = undefined;
      userWithStats.bio = 'Este perfil es privado.';
    }

    res.json({
      success: true,
      user: userWithStats
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', [
  protect,
  body('firstName').optional().isLength({ min: 1 }).trim().escape(),
  body('lastName').optional().isLength({ min: 1 }).trim().escape(),
  body('bio').optional().isLength({ max: 500 }).trim(),
  body('phone').optional().isMobilePhone(),
  body('interests').optional().isArray().custom((value) => {
    if (value.length > 20) {
      throw new Error('Maximum 20 interests allowed');
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const allowedFields = [
      'firstName', 'lastName', 'bio', 'phone', 'interests',
      'location', 'socialLinks', 'isPrivate'
    ];

    const fieldsToUpdate = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        fieldsToUpdate[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      fieldsToUpdate,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get all users (with pagination)
// @route   GET /api/users
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const users = await User.find({ isActive: true })
      .select('-password')
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments({ isActive: true });

    res.json({
      success: true,
      count: users.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      users
    });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

const cloudinaryService = require('../services/cloudinaryService');

// @desc    Upload user avatar
// @route   POST /api/users/avatar
// @access  Private
router.post('/avatar', protect, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    let avatarUrl = `/uploads/${req.file.filename}`;
    if (cloudinaryService.isConfiguredProperly()) {
      try {
        const result = await cloudinaryService.uploadAvatar(req.file.path, req.user.id);
        if (result && result.url) {
          avatarUrl = result.url;
        }
      } catch (err) {
        logger.error('Failed to upload avatar to Cloudinary', err);
      }
    }

    // Update user's avatar in database
    await User.findByIdAndUpdate(req.user.id, { avatar: avatarUrl });

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      avatarUrl
    });
  } catch (error) {
    logger.error('Upload avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Upload user cover image
// @route   POST /api/users/cover
// @access  Private
router.post('/cover', protect, upload.single('cover'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    let coverUrl = `/uploads/${req.file.filename}`;
    if (cloudinaryService.isConfiguredProperly()) {
      try {
        // use generic uploadImage with some transformation if wanted, or just simple uploadFile
        const result = await cloudinaryService.uploadImage(req.file.path, {
          folder: `users/covers/${req.user.id}`,
          transformation: [{ width: 1200, height: 400, crop: 'fill' }]
        });
        if (result && result.url) {
          coverUrl = result.url;
        }
      } catch (err) {
        logger.error('Failed to upload cover to Cloudinary', err);
      }
    }

    // Update user's cover image in database
    await User.findByIdAndUpdate(req.user.id, { coverImage: coverUrl });

    res.json({
      success: true,
      message: 'Cover image uploaded successfully',
      coverUrl
    });
  } catch (error) {
    logger.error('Upload cover error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get user's attended events
// @route   GET /api/users/:id/attended-events
// @access  Private
router.get('/:id/attended-events', protect, async (req, res) => {
  try {
    const Event = require('../models/Event');
    const userId = req.params.id;

    // Verificar que el usuario existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Buscar eventos donde el usuario es un attendee
    const events = await Event.find({
      'attendees.user': userId,
      status: { $in: ['published', 'completed'] }
    })
      .populate('createdBy', 'firstName lastName username avatar')
      .select('title description date location images category attendees status price')
      .sort({ date: -1 })
      .limit(50);

    // Filtrar para asegurar que el usuario realmente asistió (status: attending or confirmed)
    const attendedEvents = events.filter(event => {
      const attendee = event.attendees.find(a => a.user.toString() === userId);
      return attendee && ['attending', 'confirmed'].includes(attendee.status);
    });

    res.json({
      success: true,
      count: attendedEvents.length,
      events: attendedEvents
    });
  } catch (error) {
    logger.error('Get attended events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update user by ID
// @route   PUT /api/users/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    // Only allow users to update their own profile
    if (req.params.id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this profile'
      });
    }

    const fieldsToUpdate = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      bio: req.body.bio,
      interests: req.body.interests,
      location: req.body.location
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(key =>
      fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    const user = await User.findByIdAndUpdate(
      req.params.id,
      fieldsToUpdate,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    logger.error('Update user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get user settings
// @route   GET /api/users/me/settings
// @access  Private
router.get('/me/settings', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('settings');

    const defaultSettings = {
      notifications: {
        email: true,
        push: true,
        eventReminders: true,
        newMessages: true,
        weeklyDigest: false
      },
      privacy: {
        showProfile: true,
        showAttendedEvents: true,
        showLocation: false
      },
      preferences: {
        theme: 'system',
        language: 'es',
        timezone: 'America/Mexico_City'
      }
    };

    const settings = { ...defaultSettings, ...user.settings };

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    logger.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update user settings
// @route   PUT /api/users/me/settings
// @access  Private
router.put('/me/settings', protect, async (req, res) => {
  try {
    const { notifications, privacy, preferences } = req.body;

    const settings = {};
    if (notifications) settings.notifications = notifications;
    if (privacy) settings.privacy = privacy;
    if (preferences) settings.preferences = preferences;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { settings },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: user.settings
    });
  } catch (error) {
    logger.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update user profile (comprehensive)
// @route   PUT /api/users/me/profile
// @access  Private
router.put('/me/profile', [
  protect,
  body('firstName').optional().isLength({ min: 1, max: 50 }).trim().escape(),
  body('lastName').optional().isLength({ min: 1, max: 50 }).trim().escape(),
  body('username').optional().isLength({ min: 3, max: 50 }).trim().escape(),
  body('bio').optional().isLength({ max: 500 }).trim(),
  body('phone').optional().isMobilePhone(),
  body('interests').optional().isArray().custom((value) => {
    if (value.length > 20) {
      throw new Error('Maximum 20 interests allowed');
    }
    return true;
  }),
  body('location.address').optional().trim(),
  body('socialLinks.website').optional().isURL({ require_protocol: false, allow_localhost: true }),
  body('socialLinks.instagram').optional().trim(),
  body('socialLinks.twitter').optional().trim(),
  body('socialLinks.linkedin').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // LOG VALIDATION ERRORS
      console.error('❌ PROFILE UPDATE VALIDATION FAILED:');
      console.error('Errors:', JSON.stringify(errors.array(), null, 2));
      console.error('Body:', JSON.stringify(req.body, null, 2));
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const allowedFields = [
      'firstName', 'lastName', 'username', 'bio', 'phone', 'interests',
      'location', 'socialLinks', 'isPrivate'
    ];

    const fieldsToUpdate = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        fieldsToUpdate[field] = req.body[field];
      }
    });

    // Check if username is already taken (if updating username)
    if (fieldsToUpdate.username) {
      const existingUser = await User.findOne({
        username: fieldsToUpdate.username,
        _id: { $ne: req.user.id }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username is already taken'
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      fieldsToUpdate,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Change password
// @route   PUT /api/users/me/password
// @access  Private
router.put('/me/password', [
  protect,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Password confirmation does not match');
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update notification preferences
// @route   PUT /api/users/me/notifications
// @access  Private
router.put('/me/notifications', protect, async (req, res) => {
  try {
    const { email, push, eventReminders, newMessages, weeklyDigest } = req.body;

    const notificationSettings = {
      'settings.notifications.email': email,
      'settings.notifications.push': push,
      'settings.notifications.eventReminders': eventReminders,
      'settings.notifications.newMessages': newMessages,
      'settings.notifications.weeklyDigest': weeklyDigest
    };

    // Remove undefined fields
    Object.keys(notificationSettings).forEach(key =>
      notificationSettings[key] === undefined && delete notificationSettings[key]
    );

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: notificationSettings },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Notification preferences updated successfully',
      notifications: user.settings.notifications
    });
  } catch (error) {
    logger.error('Update notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Delete user account
// @route   DELETE /api/users/me
// @access  Private
router.delete('/me', [
  protect,
  body('password').notEmpty().withMessage('Password is required to delete account'),
  body('confirmDelete').equals('DELETE').withMessage('Please type DELETE to confirm')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { password } = req.body;

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    // Verify password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect password'
      });
    }

    // Delete user's follows
    await Follow.deleteMany({
      $or: [
        { follower: req.user.id },
        { following: req.user.id }
      ]
    });

    // Soft delete user (mark as inactive)
    await User.findByIdAndUpdate(req.user.id, {
      isActive: false,
      email: `deleted_${req.user.id}@deleted.local`,
      username: `deleted_${req.user.id}`,
      deletedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    logger.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Delete user account
// @route   DELETE /api/users/account
// @access  Private
router.delete('/account', protect, async (req, res) => {
  try {
    // Delete user's follows
    await Follow.deleteMany({
      $or: [
        { follower: req.user.id },
        { following: req.user.id }
      ]
    });

    // Soft delete user (mark as inactive)
    await User.findByIdAndUpdate(req.user.id, {
      isActive: false,
      email: `deleted_${req.user.id}@deleted.local`,
      username: `deleted_${req.user.id}`,
      deletedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    logger.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Search users
// @route   GET /api/users/search
// @access  Private
router.get('/search', protect, async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;

    if (!q || q.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const startIndex = (parseInt(page) - 1) * parseInt(limit);

    const searchRegex = new RegExp(q.trim(), 'i');

    const users = await User.find({
      isActive: true,
      _id: { $ne: req.user.id },
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { username: searchRegex },
        { email: searchRegex }
      ]
    })
      .select('firstName lastName username avatar verified bio')
      .skip(startIndex)
      .limit(parseInt(limit))
      .sort({ verified: -1, createdAt: -1 });

    const total = await User.countDocuments({
      isActive: true,
      _id: { $ne: req.user.id },
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { username: searchRegex },
        { email: searchRegex }
      ]
    });

    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get available users for chat
// @route   GET /api/users/available-for-chat
// @access  Private
router.get('/available-for-chat', protect, async (req, res) => {
  try {
    const { search, limit = 50 } = req.query;

    // Construir query: excluir usuario actual, solo usuarios activos
    const query = {
      _id: { $ne: req.user.id },
      isActive: true,
    };

    // Si hay búsqueda, agregar filtros
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Obtener usuarios
    const users = await User.find(query)
      .select('name username avatar bio lastActive isOnline')
      .sort({ lastActive: -1, isOnline: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    logger.error('Error obteniendo usuarios disponibles:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios disponibles',
    });
  }
});

module.exports = router;





