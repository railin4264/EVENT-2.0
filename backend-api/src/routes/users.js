const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const Follow = require('../models/Follow');
const { protect } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { enforceSecondFactor } = require('../middleware/twoFactor');
const { settingsUpdate } = require('../utils/settingsUpdate');

const router = express.Router();
router.use('/me/workspaces', require('./workspaces'));

function publicProfile(user, isFollowing = false) {
  const data = user.toObject();
  const fields = ['_id', 'id', 'username', 'firstName', 'lastName', 'avatar', 'coverImage', 'verified', 'isPrivate'];
  if (!data.isPrivate || isFollowing) fields.push('bio', 'interests', 'socialLinks');
  const profile = Object.fromEntries(fields.filter(key => data[key] !== undefined).map(key => [key, data[key]]));
  if (data.isPrivate && !isFollowing) profile.bio = 'Este perfil es privado.';
  if ((!data.isPrivate || isFollowing) && data.settings?.privacy?.showLocation && data.location?.address) {
    profile.location = { address: data.location.address };
  }
  return profile;
}

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

// @desc    Get featured and verified organizers
// @route   GET /api/users/featured-organizers
// @access  Public
router.get('/featured-organizers', async (req, res) => {
  try {
    const Event = require('../models/Event');
    const organizers = await User.find({
      isActive: true,
      'settings.privacy.showProfile': { $ne: false },
      $or: [
        { isOrganizerVerified: true },
        { verified: true },
        { 'organizerVerification.status': 'verified' }
      ]
    })
      .select('firstName lastName username avatar bio organizerVerification isOrganizerVerified verified interests createdAt')
      .limit(10)
      .lean();

    const enriched = await Promise.all(organizers.map(async (org) => {
      const [eventsCount, followersCount] = await Promise.all([
        Event.countDocuments({ createdBy: org._id, imported: { $ne: true }, status: 'published', date: { $gte: new Date() } }),
        Follow.countDocuments({ following: org._id })
      ]);
      return {
        ...org,
        organizationName: org.organizerVerification?.organizationName || `${org.firstName} ${org.lastName}`,
        activeEventsCount: eventsCount,
        followersCount
      };
    }));

    res.json({
      success: true,
      data: enriched
    });
  } catch (error) {
    logger.error('Get featured organizers error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
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
    if (!/^[a-f0-9]{24}$/i.test(userId)) return res.status(400).json({ success: false, message: 'Identificador de perfil inválido' });
    const isOwnProfile = userId === req.user.id;

    const user = await User.findById(userId).select('-password');

    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!isOwnProfile && req.user.role !== 'admin' && user.settings?.privacy?.showProfile === false) return res.status(404).json({ success: false, message: 'Perfil no disponible' });
    // Get follow counts and relationship status
    const stats = await Follow.getFollowCounts(userId);
    const isFollowing = !isOwnProfile ? await Follow.isFollowing(req.user.id, userId) : false;

    const canViewAttendance = isOwnProfile || ((!user.isPrivate || isFollowing) && user.settings?.privacy?.showAttendedEvents !== false);

    // Add stats and follow status to user data
    const userWithStats = {
      ...(isOwnProfile ? user.toObject() : publicProfile(user, isFollowing)),
      id: user._id, // Add id field for frontend compatibility
      stats: {
        eventsAttended: canViewAttendance ? user.eventsAttended?.length || 0 : undefined,
        eventsCreated: user.eventsCreated?.length || 0,
        tribesJoined: user.tribesJoined?.length || 0,
        connections: stats.followersCount
      },
      isFollowing,
      canViewAttendance,
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

    res.set('Cache-Control', 'private, no-store');
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
  enforceSecondFactor,
  body('firstName').optional().isLength({ min: 1 }).trim().escape(),
  body('lastName').optional().isLength({ min: 1 }).trim().escape(),
  body('bio').optional().isLength({ max: 500 }).trim().escape(),
  body('phone').optional().custom(value => value === '' || (typeof value === 'string' && /^[0-9+\-\s()]{5,30}$/.test(value))),
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

    const visibleUsers = { isActive: true, 'settings.privacy.showProfile': { $ne: false } };
    const users = await User.find(visibleUsers)
      .select('username firstName lastName avatar coverImage verified isPrivate bio interests socialLinks settings.privacy.showLocation location.address')
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(visibleUsers);

    res.json({
      success: true,
      count: users.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      users: users.map(user => publicProfile(user))
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

// @desc    Update current user's live geolocation
// @route   PUT /api/users/me/location
// @route   POST /api/users/me/location
// @route   PUT /api/users/location
// @route   POST /api/users/location
// @access  Private
const updateUserLocationHandler = async (req, res) => {
  try {
    const {
      lat,
      lng,
      latitude,
      longitude,
      coordinates,
      address,
      city,
      country,
      countryCode
    } = req.body || {};

    let parsedLat = lat !== undefined ? Number(lat) : latitude !== undefined ? Number(latitude) : undefined;
    let parsedLng = lng !== undefined ? Number(lng) : longitude !== undefined ? Number(longitude) : undefined;

    if ((parsedLat === undefined || parsedLng === undefined) && Array.isArray(coordinates) && coordinates.length === 2) {
      parsedLng = Number(coordinates[0]);
      parsedLat = Number(coordinates[1]);
    }

    if (
      parsedLat === undefined ||
      parsedLng === undefined ||
      Number.isNaN(parsedLat) ||
      Number.isNaN(parsedLng) ||
      parsedLat < -90 ||
      parsedLat > 90 ||
      parsedLng < -180 ||
      parsedLng > 180
    ) {
      return res.status(400).json({
        success: false,
        message: 'Valid latitude and longitude are required'
      });
    }

    const locationUpdate = {
      type: 'Point',
      coordinates: [parsedLng, parsedLat],
      address: address || city || 'Santo Domingo, República Dominicana',
      city: city || 'Santo Domingo',
      country: country || 'República Dominicana',
      countryCode: countryCode || 'DO',
      updatedAt: new Date()
    };

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { location: locationUpdate } },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Location updated successfully',
      location: user?.location || locationUpdate,
      data: {
        location: user?.location || locationUpdate,
        lat: parsedLat,
        lng: parsedLng
      }
    });
  } catch (error) {
    logger.error('Update user location error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating location'
    });
  }
};

router.put('/me/location', protect, updateUserLocationHandler);
router.post('/me/location', protect, updateUserLocationHandler);
router.put('/location', protect, updateUserLocationHandler);
router.post('/location', protect, updateUserLocationHandler);

// @desc    Get user's attended events
// @route   GET /api/users/:id/attended-events
// @access  Private
router.get('/:id/attended-events', protect, async (req, res) => {
  try {
    const Event = require('../models/Event');
    const userId = req.params.id;
    if (!/^[a-f0-9]{24}$/i.test(userId)) return res.status(400).json({ success: false, message: 'Identificador de perfil inválido' });
    const user = await User.findOne({ _id: userId, isActive: true });
    const isOwn = userId === req.user.id;
    if (!user || (!isOwn && user.settings?.privacy?.showProfile === false)) return res.status(404).json({ success: false, message: 'Perfil no disponible' });
    const following = !isOwn && user.isPrivate ? await Follow.isFollowing(req.user.id, userId) : false;
    if (!isOwn && (user.settings?.privacy?.showAttendedEvents === false || (user.isPrivate && !following))) return res.json({ success: true, count: 0, events: [], restricted: true });
    const events = await Event.find({
      attendees: { $elemMatch: { user: userId, status: { $in: ['attending', 'confirmed'] } } },
      status: { $in: ['published', 'completed'] },
      ...(!isOwn ? { isPrivate: { $ne: true }, isSecretLocation: { $ne: true } } : {})
    }).populate('createdBy', 'firstName lastName username avatar')
      .select('title description date endDate timeZone location images category status price')
      .sort({ date: -1 }).limit(50);
    res.set('Cache-Control', 'private, no-store');
    return res.json({ success: true, count: events.length, events });
  } catch (error) {
    logger.error('Get attended events error:', error);
    return res.status(500).json({ success: false, message: 'No se pudieron consultar los eventos compartidos' });
  }
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
router.get('/:id', protect, async (req, res, next) => {
  try {
    if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isSelf = req.user && req.user.id === user._id.toString();
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isSelf && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this user'
      });
    }
    const isFollowing = !isSelf && await Follow.isFollowing(req.user.id, user._id);

    res.json({
      success: true,
      user: isSelf ? user : publicProfile(user, isFollowing)
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
        email: false,
        push: false,
        eventReminders: true,
        newMessages: true,
        weeklyDigest: false,
        friendPlans: false,
        shareAttendance: false
      },
      privacy: {
        showProfile: true,
        showAttendedEvents: true,
        showLocation: false
      },
      preferences: {
        theme: 'system',
        language: 'es',
        timezone: 'America/Santo_Domingo'
      }
    };

    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    const stored = user.toObject().settings || {};
    const settings = Object.fromEntries(Object.entries(defaultSettings).map(([section, defaults]) => [section, { ...defaults, ...(stored[section] || {}) }]));

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
router.put('/me/settings', protect, enforceSecondFactor, async (req, res) => {
  try {
    const update = settingsUpdate(req.body);
    if (!Object.keys(update).length) return res.status(400).json({ success: false, message: 'No hay preferencias válidas para actualizar' });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: update },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: user.settings
    });
  } catch (error) {
    logger.error('Update settings error:', error);
    res.status(error.status || (error.name === 'ValidationError' ? 400 : 500)).json({
      success: false,
      message: error.status ? error.message : 'No pudimos guardar la configuración'
    });
  }
});


// @desc    Update user settings by id (alias used by the web settings page)
// @route   PUT /api/users/:id/settings
// @access  Private
router.put('/:id/settings', protect, enforceSecondFactor, async (req, res) => {
  try {
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this user' });
    }
    const update = settingsUpdate(req.body);
    if (!Object.keys(update).length) return res.status(400).json({ success: false, message: 'No hay preferencias válidas para actualizar' });
    const user = await User.findByIdAndUpdate(req.user.id, { $set: update }, { new: true, runValidators: true }).select('-password');
    res.json({ success: true, message: 'Settings updated successfully', settings: user.settings });
  } catch (error) {
    logger.error('Update settings by id error:', error);
    res.status(error.status || (error.name === 'ValidationError' ? 400 : 500)).json({ success: false, message: error.status ? error.message : 'No pudimos guardar la configuración' });
  }
});

// @desc    Update user profile (comprehensive)
// @route   PUT /api/users/me/profile
// @access  Private
router.put('/me/profile', [
  protect,
  enforceSecondFactor,
  body('firstName').optional().isLength({ min: 1, max: 50 }).trim().escape(),
  body('lastName').optional().isLength({ min: 1, max: 50 }).trim().escape(),
  body('username').optional().isLength({ min: 3, max: 50 }).trim().escape(),
  body('bio').optional().isLength({ max: 500 }).trim().escape(),
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
  enforceSecondFactor,
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

    // Update password and invalidate existing sessions
    user.password = newPassword;
    user.sessionVersion = (user.sessionVersion || 0) + 1;
    user.tokens = [];
    user.refreshTokens = [];
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
router.put('/me/notifications', protect, enforceSecondFactor, async (req, res) => {
  try {
    const notificationSettings = settingsUpdate({ notifications: req.body });
    if (!Object.keys(notificationSettings).length) return res.status(400).json({ success: false, message: 'No hay notificaciones válidas para actualizar' });

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
    res.status(error.status || (error.name === 'ValidationError' ? 400 : 500)).json({
      success: false,
      message: error.status ? error.message : 'No pudimos guardar las notificaciones'
    });
  }
});

// @desc    Delete user account
// @route   DELETE /api/users/me
// @access  Private
router.delete('/me', [
  protect,
  enforceSecondFactor,
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

    await Promise.all([
      require('../models/UserWorkspace').deleteOne({ _id: req.user._id }),
      require('../models/PushReceipt').deleteMany({ recipient: req.user._id })
    ]);

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
      pushTokens: [],
      'notificationSettings.pushEnabled': false,
      'settings.notifications.push': false,
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
router.delete('/account', protect, enforceSecondFactor, async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to delete account'
      });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect password'
      });
    }

    await Promise.all([
      require('../models/UserWorkspace').deleteOne({ _id: req.user._id }),
      require('../models/PushReceipt').deleteMany({ recipient: req.user._id })
    ]);

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
      pushTokens: [],
      'notificationSettings.pushEnabled': false,
      'settings.notifications.push': false,
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

    const escapedQuery = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escapedQuery, 'i');

    const users = await User.find({
      isActive: true,
      _id: { $ne: req.user.id },
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { username: searchRegex }
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
        { username: searchRegex }
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
      const escapedSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { firstName: { $regex: escapedSearch, $options: 'i' } },
        { lastName: { $regex: escapedSearch, $options: 'i' } },
        { name: { $regex: escapedSearch, $options: 'i' } },
        { username: { $regex: escapedSearch, $options: 'i' } },
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

// @desc    Get organizer verification status
// @route   GET /api/users/organizer-verification/status
// @access  Private
router.get('/organizer-verification/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('isOrganizerVerified organizerVerification');
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    res.json({
      success: true,
      isOrganizerVerified: Boolean(user.isOrganizerVerified),
      verification: user.organizerVerification || { status: 'none' }
    });
  } catch (error) {
    logger.error('Get organizer verification status error:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

// @desc    Submit organizer verification request
// @route   POST /api/users/organizer-verification/submit
// @access  Private
router.post('/organizer-verification/submit', protect, async (req, res) => {
  try {
    const { organizationName, documentType, documentNumber, socialProofUrl, phoneNumber, notes } = req.body;

    if (!documentNumber || !documentType || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de documento, número de documento y teléfono son obligatorios para la verificación.'
      });
    }

    const validTypes = ['cedula', 'passport', 'rnc', 'business_license', 'other'];
    if (!validTypes.includes(documentType)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de documento no válido.'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    user.organizerVerification = {
      status: 'pending',
      organizationName: organizationName ? String(organizationName).trim() : `${user.firstName} ${user.lastName}`.trim(),
      documentType,
      documentNumber: String(documentNumber).trim(),
      socialProofUrl: socialProofUrl ? String(socialProofUrl).trim() : '',
      phoneNumber: String(phoneNumber).trim(),
      notes: notes ? String(notes).trim() : '',
      submittedAt: new Date(),
      reviewedAt: null,
      rejectionReason: null,
      reviewedBy: null
    };

    await user.save();

    res.json({
      success: true,
      message: 'Solicitud de verificación enviada con éxito. El equipo de EventNow revisará tus antecedentes para activar tu insignia de Organizador Verificado.',
      verification: user.organizerVerification
    });
  } catch (error) {
    logger.error('Submit organizer verification error:', error);
    res.status(500).json({ success: false, message: 'Error al enviar solicitud de verificación' });
  }
});

module.exports = router;





