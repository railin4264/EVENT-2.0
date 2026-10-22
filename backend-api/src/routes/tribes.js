const express = require('express');
const { protect, optionalAuth } = require('../middleware/auth');
const { tribeListCache, invalidateCache } = require('../middleware/cache');
const logger = require('../utils/logger');
const Tribe = require('../models/Tribe');
const Event = require('../models/Event');
const Notification = require('../models/Notification');
const { getIdString, getTribeAccess, tribeError, mutateTribeMembership } = require('../utils/tribeAccess');
const { buildAgeRestrictionFilter } = require('../utils/eventVisibility');

const router = express.Router();
router.use((req, res, next) => {
  res.vary('Authorization');
  res.set('Cache-Control', 'private, no-store');
  next();
});
for (const name of ['id', 'userId', 'postId', 'storyId']) {
  router.param(name, (req, res, next, value) => {
    if (!/^[a-f0-9]{24}$/i.test(value)) return res.status(400).json({ success: false, message: 'Identificador inválido' });
    next();
  });
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function discoverableTribes(user) {
  if (user?.role === 'admin') return {};
  const alternatives = [{ 'settings.privacy': { $ne: 'secret' } }];
  if (user?.id) alternatives.push({ creator: user.id }, {
    members: { $elemMatch: { user: user.id, status: 'active' } },
    $nor: [{ members: { $elemMatch: { user: user.id, status: 'banned' } } }]
  });
  return { $or: alternatives };
}

/**
 * Formats a Tribe document consistently across all tribe endpoints.
 */
function formatTribe(tribe, currentUserId, options = {}) {
  const access = getTribeAccess(tribe, currentUserId, options.role);
  const userIdStr = getIdString(currentUserId);
  const rawMembers = Array.isArray(tribe.members) ? tribe.members : [];
  const activeMembers = rawMembers.filter(m => !m.status || m.status === 'active');

  const { isMember, isAdmin, isModerator, userRole, hasPendingRequest, joinRequestStatus,
    privacy, membership, isPrivate, requiresApproval } = access;

  const rawJoinRequests = Array.isArray(tribe.joinRequests) ? tribe.joinRequests : [];
  const pendingRequests = rawJoinRequests.filter(r => r.status === 'pending');

  const eventsList = Array.isArray(options.events)
    ? options.events
    : Array.isArray(tribe.events)
      ? tribe.events
      : [];

  const postsList = Array.isArray(tribe.posts) ? tribe.posts : [];
  const memberCount = activeMembers.length;

  const base = {
    _id: tribe._id,
    name: tribe.name,
    description: tribe.description,
    category: tribe.category,
    coverImage: tribe.coverImage || tribe.avatar,
    tags: tribe.tags || [],
    rules: tribe.rules || [],
    welcomeMessage: isMember ? tribe.welcomeMessage || '' : '',
    socialLinks: isMember ? tribe.socialLinks || {} : {},
    location: tribe.location,
    privacy,
    membership,
    isPrivate,
    requiresApproval,
    settings: {
      ...(tribe.settings?.toObject ? tribe.settings.toObject() : (tribe.settings || {})),
      privacy,
      membership
    },
    memberCount,
    membersCount: memberCount,
    stats: {
      ...(tribe.stats?.toObject ? tribe.stats.toObject() : (tribe.stats || {})),
      totalMembers: memberCount,
      memberCount,
      membersCount: memberCount,
      postCount: access.canViewContent ? postsList.length : 0,
      totalEvents: isMember ? eventsList.length : 0,
      eventCount: isMember ? eventsList.length : 0,
      activityLevel: access.canViewContent && (postsList.length >= 3 || memberCount >= 10) ? 'high' : memberCount >= 3 ? 'medium' : 'low'
    },
    creator: tribe.creator
      ? {
        _id: tribe.creator._id || tribe.creator,
        username: tribe.creator.username,
        firstName: tribe.creator.firstName,
        lastName: tribe.creator.lastName,
        avatar: tribe.creator.avatar
      }
      : null,
    createdBy: tribe.creator
      ? {
        _id: tribe.creator._id || tribe.creator,
        username: tribe.creator.username,
        firstName: tribe.creator.firstName,
        lastName: tribe.creator.lastName,
        avatar: tribe.creator.avatar
      }
      : null,
    avatar: typeof tribe.avatar === 'string' ? tribe.avatar : (tribe.avatar?.url || ''),
    cover: typeof tribe.coverImage === 'string' ? tribe.coverImage : (tribe.coverImage?.url || (typeof tribe.avatar === 'string' ? tribe.avatar : (tribe.avatar?.url || ''))),
    isMember,
    isAdmin,
    isModerator,
    userRole,
    hasPendingRequest,
    joinRequestStatus,
    canViewContent: access.canViewContent,
    canManageRequests: access.canManageRequests,
    canRequestJoin: access.canRequestJoin,
    canJoin: access.canJoin,
    isBanned: access.isBanned,
    pendingRequestsCount: access.canManageRequests ? pendingRequests.length : 0,
    createdAt: tribe.createdAt,
    updatedAt: tribe.updatedAt
  };

  if (options.detailed) {
    base.members = (isMember ? activeMembers : []).map(member => {
      const u = member.user || {};
      return {
        _id: u._id || member.user,
        user: u._id
          ? {
            _id: u._id,
            username: u.username,
            firstName: u.firstName,
            lastName: u.lastName,
            avatar: u.avatar
          }
          : member.user,
        username: u.username,
        firstName: u.firstName || u.username || 'Miembro',
        lastName: u.lastName || '',
        avatar: u.avatar,
        role: member.role || 'member',
        status: member.status || 'active',
        joinedAt: member.joinedAt
      };
    });

    base.posts = (access.canViewContent ? postsList : []).map(post => {
      const authorObj = post.author || {};
      const likesArr = Array.isArray(post.likes) ? post.likes : [];
      const commentsArr = Array.isArray(post.comments) ? post.comments : [];
      const liked = userIdStr
        ? likesArr.some(l => getIdString(l.user) === userIdStr)
        : false;

      return {
        _id: post._id,
        content: post.content,
        images: post.images || [],
        author: {
          _id: authorObj._id || post.author,
          username: authorObj.username,
          firstName: authorObj.firstName || authorObj.username || 'Miembro',
          lastName: authorObj.lastName || '',
          avatar: authorObj.avatar
        },
        likes: likesArr.length,
        likesCount: likesArr.length,
        isLiked: liked,
        likedByUser: liked,
        comments: commentsArr.length,
        commentsCount: commentsArr.length,
        commentsList: commentsArr.map(c => {
          const cUser = c.user || {};
          return {
            _id: c._id,
            content: c.content,
            user: {
              _id: cUser._id || c.user,
              username: cUser.username,
              firstName: cUser.firstName || cUser.username || 'Miembro',
              lastName: cUser.lastName || '',
              avatar: cUser.avatar
            },
            createdAt: c.createdAt
          };
        }),
        createdAt: post.createdAt
      };
    });

    base.events = (isMember ? eventsList : []).map(e => ({
      _id: e._id,
      title: e.title,
      description: e.description,
      startDate: e.date || e.startDate || e.dateTime?.start,
      endDate: e.endDate || e.dateTime?.end,
      location: {
        name: e.location?.venue || e.location?.name || e.location?.city || e.location?.address || 'Santo Domingo',
        address: e.location?.address || e.location?.city || 'República Dominicana',
        city: e.location?.city || 'Santo Domingo',
        coordinates: e.location?.coordinates
      },
      attendees: Array.isArray(e.attendees) ? e.attendees.length : (e.attendeesCount || 0),
      attendeesCount: Array.isArray(e.attendees) ? e.attendees.length : (e.attendeesCount || 0),
      maxAttendees: e.maxAttendees || e.capacity,
      images: Array.isArray(e.images) && e.images.length > 0
        ? e.images
        : [{ url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&auto=format&fit=crop&q=80' }]
    }));

    base.joinRequests = access.canManageRequests
      ? pendingRequests.map(r => {
        const rUser = r.user || {};
        return {
          _id: r._id,
          user: {
            _id: rUser._id || r.user,
            username: rUser.username,
            firstName: rUser.firstName || rUser.username || 'Usuario',
            lastName: rUser.lastName || '',
            avatar: rUser.avatar,
            bio: rUser.bio
          },
          message: r.message || '',
          status: r.status || 'pending',
          requestedAt: r.requestedAt || r.createdAt
        };
      })
      : [];
  } else {
    base.members = isMember ? activeMembers.map(member => member.user?._id || member.user) : [];
  }

  return base;
}

// @desc    Get all tribes
// @route   GET /api/tribes
// @access  Public (Optional Auth)
router.get('/', optionalAuth, tribeListCache, async (req, res) => {
  try {
    const page = Number(req.query.page ?? 1);
    const requestedLimit = Number(req.query.limit ?? 20);
    if (!Number.isSafeInteger(page) || page < 1 || page > 1000000 || !Number.isSafeInteger(requestedLimit) || requestedLimit < 1) {
      return res.status(400).json({ success: false, message: 'page y limit deben ser enteros positivos' });
    }
    const limit = Math.min(requestedLimit, 100);
    const skip = (page - 1) * limit;

    const query = { isActive: true, $and: [discoverableTribes(req.user)] };
    if (req.query.scope !== undefined) {
      if (req.query.scope !== 'requests') return res.status(400).json({ success: false, message: 'Ámbito de tribus inválido' });
      if (!req.user) return res.status(401).json({ success: false, message: 'Inicia sesión para consultar tus solicitudes' });
      if (req.user.role === 'admin') {
        query.$and.push({ 'joinRequests.status': 'pending' });
      } else {
        query.$and.push({ $or: [
          { joinRequests: { $elemMatch: { user: req.user.id, status: 'pending' } }, 'settings.membership': { $ne: 'invite_only' },
            $nor: [{ members: { $elemMatch: { user: req.user.id, status: 'banned' } } }] },
          { 'joinRequests.status': 'pending', $or: [{ creator: req.user.id }, {
            members: { $elemMatch: { user: req.user.id, status: 'active', role: { $in: ['admin', 'moderator'] } } },
            $nor: [{ members: { $elemMatch: { user: req.user.id, status: 'banned' } } }]
          }] }
        ] });
      }
    }

    if (req.query.category && req.query.category !== 'all') {
      query.category = req.query.category;
    }

    if (req.query.privacy && ['public', 'private'].includes(req.query.privacy)) {
      query['settings.privacy'] = req.query.privacy;
    }

    if (req.query.search) {
      const safeSearch = escapeRegex(req.query.search);
      query.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { description: { $regex: safeSearch, $options: 'i' } },
        { tags: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    const tribes = await Tribe.find(query)
      .populate('creator', 'username firstName lastName avatar')
      .populate('members.user', 'username firstName lastName avatar')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Tribe.countDocuments(query);

    const formattedTribes = tribes.map(tribe =>
      formatTribe(tribe, req.user?.id, {
        role: req.user?.role,
        isPlatformAdmin: req.user?.role === 'admin'
      })
    );

    res.json({
      success: true,
      count: formattedTribes.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      data: formattedTribes,
      tribes: formattedTribes
    });
  } catch (error) {
    logger.error('Get tribes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get nearby tribes
// @route   GET /api/tribes/nearby
// @access  Public (Optional Auth)
router.get('/nearby', optionalAuth, async (req, res) => {
  try {
    const { lat, lng, radius = 25000 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const maxDistance = parseInt(radius, 10) || 25000;

    if (
      isNaN(latitude) ||
      isNaN(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates'
      });
    }

    let tribes = await Tribe.find({ isActive: true, ...discoverableTribes(req.user),
      location: { $geoWithin: { $centerSphere: [[longitude, latitude], maxDistance / 6371000] } } })
      .limit(30)
      .populate('creator', 'username firstName lastName avatar')
      .populate('members.user', 'username firstName lastName avatar');

    // Fallback to all active non-secret tribes if none within strict radius
    if (!tribes || tribes.length === 0) {
      tribes = await Tribe.find({
        isActive: true,
        ...discoverableTribes(req.user)
      })
        .populate('creator', 'username firstName lastName avatar')
        .populate('members.user', 'username firstName lastName avatar')
        .limit(30)
        .sort({ createdAt: -1 });
    }

    const formattedTribes = tribes.map(tribe =>
      formatTribe(tribe, req.user?.id, {
        role: req.user?.role,
        isPlatformAdmin: req.user?.role === 'admin'
      })
    );

    res.json({
      success: true,
      count: formattedTribes.length,
      data: formattedTribes,
      tribes: formattedTribes,
      searchLocation: {
        latitude,
        longitude,
        radius: maxDistance
      }
    });
  } catch (error) {
    logger.error('Get nearby tribes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get user's tribes
// @route   GET /api/tribes/user/me
// @access  Private
router.get('/user/me', protect, async (req, res) => {
  try {
    const tribes = await Tribe.find({
      $or: [
        { members: { $elemMatch: { user: req.user.id, status: 'active' } },
          $nor: [{ members: { $elemMatch: { user: req.user.id, status: 'banned' } } }] },
        { creator: req.user.id }
      ],
      isActive: true
    })
      .populate('creator', 'username firstName lastName avatar')
      .populate('members.user', 'username firstName lastName avatar')
      .sort({ createdAt: -1 });

    const formattedTribes = tribes.map(tribe =>
      formatTribe(tribe, req.user.id, {
        role: req.user.role,
        isPlatformAdmin: req.user.role === 'admin'
      })
    );

    res.json({
      success: true,
      count: formattedTribes.length,
      data: formattedTribes,
      tribes: formattedTribes
    });
  } catch (error) {
    logger.error('Get user tribes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get single tribe
// @route   GET /api/tribes/:id
// @access  Public (Optional Auth)
router.get('/:id', optionalAuth, async (req, res) => {
  if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ success: false, message: 'Invalid tribe ID' });
  }
  try {
    const tribe = await Tribe.findById(req.params.id)
      .populate('creator', 'username firstName lastName avatar')
      .populate('members.user', 'username firstName lastName avatar')
      .populate('posts.author', 'username firstName lastName avatar')
      .populate('posts.comments.user', 'username firstName lastName avatar')
      .populate('joinRequests.user', 'username firstName lastName avatar bio');

    if (!tribe) {
      return res.status(404).json({
        success: false,
        message: 'Tribe not found'
      });
    }

    const access = getTribeAccess(tribe, req.user?.id, req.user?.role);
    if (!access.canDiscover) return res.status(404).json({ success: false, message: 'Tribu no encontrada' });

    // Only explicit legacy references establish a relationship. Other events
    // created by the founder do not automatically belong to this community.
    let tribeEvents = [];
    try {
      const eventIds = tribe.get('events');
      const relation = Array.isArray(eventIds) && eventIds.length > 0
        ? { _id: { $in: eventIds } }
        : null;
      const eventQuery = access.isMember && relation ? {
        ...relation, status: 'published', isPrivate: { $ne: true },
        isSecretLocation: { $ne: true }, ...buildAgeRestrictionFilter(req.user)
      } : null;

      if (eventQuery) {
        tribeEvents = await Event.find(eventQuery)
          .sort({ date: 1 })
          .limit(6)
          .lean();
      }
    } catch (eventErr) {
      logger.warn('Could not load related tribe events:', eventErr.message);
    }

    const formattedTribe = formatTribe(tribe, req.user?.id, {
      role: req.user?.role,
      isPlatformAdmin: req.user?.role === 'admin',
      detailed: true,
      events: tribeEvents
    });

    res.json({
      success: true,
      tribe: formattedTribe,
      data: formattedTribe,
      ...formattedTribe
    });
  } catch (error) {
    logger.error('Get tribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Create new tribe
// @route   POST /api/tribes
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      isPublic,
      isPrivate,
      privacy: rawPrivacy,
      membership: rawMembership,
      requiresApproval,
      tags = [],
      rules = [],
      welcomeMessage = '',
      avatar,
      coverImage,
      socialLinks = {},
      location = {},
      settings = {}
    } = req.body;

    if (!name || !description || !category) {
      return res.status(400).json({
        success: false,
        message: 'Name, description, and category are required'
      });
    }

    // Check if tribe name already exists
    const existingTribe = await Tribe.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(name.trim())}$`, 'i') }
    });
    if (existingTribe) {
      return res.status(400).json({
        success: false,
        message: 'A tribe with this name already exists'
      });
    }

    // Determine privacy and membership settings
    let privacy = rawPrivacy || settings.privacy;
    if (!privacy) {
      if (isPrivate === true || isPublic === false) {
        privacy = 'private';
      } else {
        privacy = 'public';
      }
    }

    let membership = rawMembership || settings.membership;
    if (!membership) {
      if (requiresApproval === true || privacy === 'private') {
        membership = 'approval_required';
      } else {
        membership = 'open';
      }
    }

    // Normalize location so Mongoose GeoJSON validation never fails on partial objects
    let normalizedLocation = {
      type: 'Point',
      coordinates: [-69.9312, 18.4861], // Default: Santo Domingo, DO
      city: 'Santo Domingo',
      country: 'DO'
    };

    if (typeof location === 'string' && location.trim()) {
      normalizedLocation.address = location.trim();
      normalizedLocation.city = location.trim();
    } else if (location && typeof location === 'object') {
      const coords = Array.isArray(location.coordinates) && location.coordinates.length === 2
        ? [Number(location.coordinates[0]) || -69.9312, Number(location.coordinates[1]) || 18.4861]
        : (location.lng !== undefined && location.lat !== undefined)
          ? [Number(location.lng) || -69.9312, Number(location.lat) || 18.4861]
          : [-69.9312, 18.4861];

      normalizedLocation = {
        type: 'Point',
        coordinates: coords,
        address: location.address || location.name || '',
        city: location.city || 'Santo Domingo',
        state: location.state || '',
        country: location.country || 'DO',
        radius: Number(location.radius) || 25
      };
    }

    // Normalize rules array
    const normalizedRules = Array.isArray(rules)
      ? rules
        .filter(Boolean)
        .map((r, idx) => {
          if (typeof r === 'string') {
            return { title: `Regla ${idx + 1}`, description: r.trim(), isRequired: true };
          }
          return {
            title: r.title || `Regla ${idx + 1}`,
            description: r.description || '',
            isRequired: r.isRequired !== false
          };
        })
      : [];

    const normalizedTags = Array.isArray(tags)
      ? tags.map(t => String(t).trim().toLowerCase()).filter(Boolean)
      : [];

    const newTribe = new Tribe({
      name: name.trim(),
      description: description.trim(),
      category,
      tags: normalizedTags,
      rules: normalizedRules,
      welcomeMessage: welcomeMessage ? String(welcomeMessage).trim() : '',
      avatar: avatar || undefined,
      coverImage: coverImage || undefined,
      socialLinks,
      location: normalizedLocation,
      creator: req.user.id,
      members: [{ user: req.user.id, role: 'admin', status: 'active' }],
      Moderators: [req.user.id],
      settings: {
        ...settings,
        privacy,
        membership
      }
    });

    await newTribe.save();
    invalidateCache();

    const populatedTribe = await Tribe.findById(newTribe._id)
      .populate('creator', 'username firstName lastName avatar')
      .populate('members.user', 'username firstName lastName avatar');

    const formatted = formatTribe(populatedTribe, req.user.id, { role: req.user.role, isPlatformAdmin: req.user.role === 'admin' });

    res.status(201).json({
      success: true,
      message: 'Tribe created successfully',
      tribe: formatted,
      data: formatted
    });
  } catch (error) {
    logger.error('Create tribe error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A tribe with this name already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update tribe
// @route   PUT /api/tribes/:id
// @access  Private (Admin only)
router.put('/:id', protect, async (req, res) => {
  try {
    const tribe = await Tribe.findById(req.params.id);

    if (!tribe) {
      return res.status(404).json({
        success: false,
        message: 'Tribe not found'
      });
    }

    const { isAdmin } = getTribeAccess(tribe, req.user.id, req.user.role);
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this tribe'
      });
    }

    const allowedFields = [
      'name',
      'description',
      'category',
      'avatar',
      'coverImage',
      'tags',
      'location',
      'settings',
      'rules',
      'welcomeMessage',
      'socialLinks'
    ];
    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    if (req.body.privacy || req.body.membership || req.body.isPrivate !== undefined) {
      const currentSettings = tribe.settings?.toObject ? tribe.settings.toObject() : (tribe.settings || {});
      const nextPrivacy = req.body.privacy || (req.body.isPrivate ? 'private' : currentSettings.privacy || 'public');
      const nextMembership = req.body.membership || (nextPrivacy === 'private' ? 'approval_required' : currentSettings.membership || 'open');
      updateData.settings = {
        ...currentSettings,
        ...(req.body.settings || {}),
        privacy: nextPrivacy,
        membership: nextMembership
      };
    }

    const updatedTribe = await Tribe.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('creator', 'username firstName lastName avatar')
      .populate('members.user', 'username firstName lastName avatar');

    invalidateCache();

    const formatted = formatTribe(updatedTribe, req.user.id, { detailed: true, role: req.user.role });

    res.json({
      success: true,
      message: 'Tribe updated successfully',
      tribe: formatted,
      data: formatted
    });
  } catch (error) {
    logger.error('Update tribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Delete tribe
// @route   DELETE /api/tribes/:id
// @access  Private (Admin only)
router.delete('/:id', protect, async (req, res) => {
  try {
    const tribe = await Tribe.findById(req.params.id);

    if (!tribe) {
      return res.status(404).json({
        success: false,
        message: 'Tribe not found'
      });
    }

    const { isAdmin } = getTribeAccess(tribe, req.user.id, req.user.role);
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this tribe'
      });
    }

    await Tribe.findByIdAndDelete(req.params.id);
    invalidateCache();

    res.json({
      success: true,
      message: 'Tribe deleted successfully'
    });
  } catch (error) {
    logger.error('Delete tribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Membership mutations share an optimistic lock: parallel users cannot replace
// each other's requests, and competing decisions re-check current permissions.
function membershipPayload(tribe, user) {
  const access = getTribeAccess(tribe, user.id, user.role);
  return { isMember: access.isMember, hasPendingRequest: access.hasPendingRequest,
    joinRequestStatus: access.joinRequestStatus, isBanned: access.isBanned,
    canJoin: access.canJoin, canRequestJoin: access.canRequestJoin,
    canViewContent: access.canViewContent, canManageRequests: access.canManageRequests,
    memberCount: tribe.members.filter(m => !m.status || m.status === 'active').length };
}

function membershipRoute(change) {
  return async (req, res) => {
    try {
      const result = await mutateTribeMembership(Tribe, req.params.id, tribe => change(tribe, req));
      if (result.changed) invalidateCache();
      if (result.notification) {
        try { await Notification.create(result.notification); }
        catch (error) { logger.warn('Non-blocking tribe notification error:', error.message); }
      }
      res.json({ success: true, ...result.response });
    } catch (error) {
      logger.error('Tribe membership error:', error);
      const status = error.statusCode || (error.name === 'ValidationError' ? 400 : 500);
      res.status(status).json({ success: false, message: status === 500 ? 'Server error' : error.message });
    }
  };
}

function availableAccess(tribe, user) {
  if (tribe.isActive === false) throw tribeError(404, 'Tribu no encontrada');
  return getTribeAccess(tribe, user.id, user.role);
}

function requireRequestManager(tribe, user) {
  const access = availableAccess(tribe, user);
  if (!access.canManageRequests) throw tribeError(403, 'No tienes permiso para gestionar solicitudes');
  return access;
}

// @route POST /api/tribes/:id/join
router.post('/:id/join', protect, membershipRoute((tribe, req) => {
  const access = availableAccess(tribe, req.user);
  if (access.isBanned) throw tribeError(403, 'Has sido bloqueado de esta tribu');
  if (access.isMember) return { changed: false, response: {
    ...membershipPayload(tribe, req.user), status: 'joined', alreadyMember: true,
    message: 'Ya eres miembro de esta tribu' } };
  if (!access.canJoin && !access.canRequestJoin) {
    throw tribeError(403, 'Esta tribu es solo por invitación. No se permite el ingreso directo.');
  }
  const message = req.body?.message ?? '';
  if (typeof message !== 'string' || message.trim().length > 500) {
    throw tribeError(400, 'La presentación debe ser texto de hasta 500 caracteres');
  }
  if (access.canRequestJoin) {
    if (access.hasPendingRequest) return { changed: false, response: {
      ...membershipPayload(tribe, req.user), status: 'pending', message: 'Ya tienes una solicitud pendiente' } };
    // Keep one historical entry per user, including re-submissions after rejection.
    tribe.joinRequests = tribe.joinRequests.filter(r => getIdString(r.user) !== String(req.user.id));
    tribe.joinRequests.push({ user: req.user.id, message: message.trim(), status: 'pending', requestedAt: new Date() });
    return { changed: true, response: { ...membershipPayload(tribe, req.user), status: 'pending',
      message: 'Solicitud enviada al administrador de la tribu' }, notification: {
      recipient: tribe.creator, sender: req.user.id, type: 'tribe_request',
      title: `Nueva solicitud en ${tribe.name}`.slice(0, 100),
      message: `${req.user.firstName || req.user.username || 'Un usuario'} solicitó unirse a ${tribe.name}`,
      data: { tribeId: tribe._id, requesterId: req.user.id } } };
  }
  // An inactive former moderator rejoins as a regular member, never with a stale role.
  tribe.members = tribe.members.filter(m => getIdString(m.user) !== String(req.user.id));
  tribe.members.push({ user: req.user.id, role: 'member', status: 'active', joinedAt: new Date() });
  tribe.joinRequests = tribe.joinRequests.filter(r => getIdString(r.user) !== String(req.user.id));
  return { changed: true, response: { ...membershipPayload(tribe, req.user), status: 'joined', message: 'Te has unido a la tribu' } };
}));

// @route DELETE /api/tribes/:id/join-request (POST alias retained)
const cancelJoinRequestHandler = membershipRoute((tribe, req) => {
  availableAccess(tribe, req.user);
  const remaining = tribe.joinRequests.filter(r => !(getIdString(r.user) === String(req.user.id) && r.status === 'pending'));
  const changed = remaining.length !== tribe.joinRequests.length;
  tribe.joinRequests = remaining;
  return { changed, response: { ...membershipPayload(tribe, req.user), status: 'none', message: 'Solicitud cancelada correctamente' } };
});
router.delete('/:id/join-request', protect, cancelJoinRequestHandler);
router.post('/:id/cancel-request', protect, cancelJoinRequestHandler);

// @route GET /api/tribes/:id/requests
router.get('/:id/requests', protect, async (req, res) => {
  try {
    const tribe = await Tribe.findById(req.params.id).populate('joinRequests.user', 'username firstName lastName avatar bio');
    if (!tribe) throw tribeError(404, 'Tribu no encontrada');
    requireRequestManager(tribe, req.user);
    const pending = tribe.joinRequests.filter(r => r.status === 'pending').map(r => ({
      _id: r._id, user: r.user, message: r.message || '', status: r.status, requestedAt: r.requestedAt
    }));
    res.json({ success: true, count: pending.length, requests: pending, joinRequests: pending, data: pending });
  } catch (error) {
    logger.error('Get tribe join requests error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : 'Server error' });
  }
});

// @route POST /api/tribes/:id/requests/:userId/approve
router.post('/:id/requests/:userId/approve', protect, membershipRoute((tribe, req) => {
  requireRequestManager(tribe, req.user);
  const target = req.params.userId;
  const targetAccess = getTribeAccess(tribe, target);
  if (targetAccess.isBanned) throw tribeError(403, 'No se puede aprobar a un usuario bloqueado');
  const entry = tribe.joinRequests.find(r => getIdString(r.user) === target);
  if (targetAccess.isMember && entry?.status === 'approved') return { changed: false, response: {
    ...membershipPayload(tribe, req.user), status: 'approved', message: 'La solicitud ya fue aprobada' } };
  if (!entry || entry.status !== 'pending') throw tribeError(404, 'Solicitud pendiente no encontrada');
  entry.status = 'approved';
  entry.reviewedAt = new Date();
  entry.reviewedBy = req.user.id;
  if (!targetAccess.isMember) {
    tribe.members = tribe.members.filter(m => getIdString(m.user) !== target);
    tribe.members.push({ user: target, role: 'member', status: 'active', joinedAt: new Date() });
  }
  return { changed: true, response: { ...membershipPayload(tribe, req.user), status: 'approved',
    message: 'Solicitud aprobada correctamente' }, notification: {
    recipient: target, sender: req.user.id, type: 'tribe_approved',
    title: `¡Bienvenido a ${tribe.name}!`.slice(0, 100),
    message: `Tu solicitud para unirte a ${tribe.name} ha sido aprobada.`, data: { tribeId: tribe._id }
  } };
}));

// @route POST /api/tribes/:id/requests/:userId/reject
router.post('/:id/requests/:userId/reject', protect, membershipRoute((tribe, req) => {
  requireRequestManager(tribe, req.user);
  const entry = tribe.joinRequests.find(r => getIdString(r.user) === req.params.userId);
  if (!entry) return { changed: false, response: { status: 'none', message: 'No hay solicitud pendiente' } };
  if (entry.status === 'approved') throw tribeError(409, 'La solicitud ya fue aprobada; no se puede rechazar después');
  if (entry.status === 'rejected') return { changed: false, response: { status: 'rejected', message: 'La solicitud ya fue rechazada' } };
  entry.status = 'rejected';
  entry.reviewedAt = new Date();
  entry.reviewedBy = req.user.id;
  return { changed: true, response: { status: 'rejected', message: 'Solicitud rechazada' } };
}));

// @route POST /api/tribes/:id/leave
router.post('/:id/leave', protect, membershipRoute((tribe, req) => {
  const access = availableAccess(tribe, req.user);
  if (access.isBanned) throw tribeError(403, 'El bloqueo de esta tribu sigue vigente');
  if (access.isCreator) throw tribeError(409, 'El creador debe conservar la administración de la tribu');
  const remaining = tribe.members.filter(m => !(getIdString(m.user) === String(req.user.id) && (!m.status || m.status === 'active')));
  const changed = remaining.length !== tribe.members.length;
  tribe.members = remaining;
  return { changed, response: { ...membershipPayload(tribe, req.user), status: 'left', message: 'Has salido de la tribu' } };
}));

// ============= TRIBE POSTS ROUTES =============

// @desc    Create tribe post
// @route   POST /api/tribes/:id/posts
// @access  Private (Members only)
router.post('/:id/posts', protect, async (req, res) => {
  try {
    const { content, images = [] } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Content is required'
      });
    }

    const tribe = await Tribe.findById(req.params.id);

    if (!tribe) {
      return res.status(404).json({
        success: false,
        message: 'Tribe not found'
      });
    }

    const access = getTribeAccess(tribe, req.user.id, req.user.role);
    const { isMember } = access;
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member to post in this tribe'
      });
    }

    const newPost = {
      author: req.user.id,
      content: content.trim(),
      images: (Array.isArray(images) ? images : []).map(img =>
        typeof img === 'string' ? { url: img, alt: '' } : { url: img.url, alt: img.alt || '' }
      ),
      likes: [],
      comments: [],
      createdAt: new Date()
    };

    tribe.posts.unshift(newPost);
    await tribe.save();
    invalidateCache();

    const savedTribe = await Tribe.findById(tribe._id)
      .populate('posts.author', 'username firstName lastName avatar');

    const createdPost = savedTribe.posts[0];

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post: {
        _id: createdPost._id,
        content: createdPost.content,
        images: createdPost.images,
        author: {
          _id: createdPost.author?._id || req.user.id,
          username: createdPost.author?.username || req.user.username,
          firstName: createdPost.author?.firstName || req.user.firstName || 'Miembro',
          lastName: createdPost.author?.lastName || req.user.lastName || '',
          avatar: createdPost.author?.avatar || req.user.avatar
        },
        likes: createdPost.likes.length,
        likesCount: createdPost.likes.length,
        isLiked: false,
        comments: createdPost.comments.length,
        commentsCount: createdPost.comments.length,
        commentsList: [],
        createdAt: createdPost.createdAt
      }
    });
  } catch (error) {
    logger.error('Create tribe post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get tribe posts
// @route   GET /api/tribes/:id/posts
// @access  Public (for public tribes) / Private (for private tribes)
router.get('/:id/posts', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const tribe = await Tribe.findById(req.params.id)
      .populate('posts.author', 'username firstName lastName avatar')
      .populate('posts.likes.user', 'username firstName lastName')
      .populate('posts.comments.user', 'username firstName lastName avatar');

    if (!tribe) {
      return res.status(404).json({
        success: false,
        message: 'Tribe not found'
      });
    }

    const access = getTribeAccess(tribe, req.user?.id, req.user?.role);
    if (!access.canDiscover) return res.status(404).json({ success: false, message: 'Tribu no encontrada' });
    if (!access.canViewContent) return res.status(req.user ? 403 : 401).json({
      success: false, message: 'Debes ser miembro activo para ver este contenido' });

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const posts = tribe.posts.slice(startIndex, endIndex);

    const formattedPosts = posts.map(post => {
      const liked = req.user
        ? post.likes.some(l => getIdString(l.user) === String(req.user.id))
        : false;
      return {
        _id: post._id,
        content: post.content,
        images: post.images,
        author: {
          _id: post.author?._id,
          username: post.author?.username,
          firstName: post.author?.firstName || post.author?.username || 'Miembro',
          lastName: post.author?.lastName || '',
          avatar: post.author?.avatar
        },
        likes: post.likes.length,
        likesCount: post.likes.length,
        isLiked: liked,
        likedByUser: liked,
        comments: post.comments.length,
        commentsCount: post.comments.length,
        commentsList: (post.comments || []).map(c => ({
          _id: c._id,
          content: c.content,
          user: {
            _id: c.user?._id,
            username: c.user?.username,
            firstName: c.user?.firstName || c.user?.username || 'Miembro',
            lastName: c.user?.lastName || '',
            avatar: c.user?.avatar
          },
          createdAt: c.createdAt
        })),
        createdAt: post.createdAt
      };
    });

    res.json({
      success: true,
      count: formattedPosts.length,
      total: tribe.posts.length,
      pagination: {
        page,
        limit,
        pages: Math.ceil(tribe.posts.length / limit)
      },
      posts: formattedPosts
    });
  } catch (error) {
    logger.error('Get tribe posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Delete tribe post
// @route   DELETE /api/tribes/:id/posts/:postId
// @access  Private (Post author or tribe admin)
router.delete('/:id/posts/:postId', protect, async (req, res) => {
  try {
    const tribe = await Tribe.findById(req.params.id);

    if (!tribe) {
      return res.status(404).json({
        success: false,
        message: 'Tribe not found'
      });
    }

    const post = tribe.posts.id(req.params.postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const isAuthor = getIdString(post.author) === String(req.user.id);
    const access = getTribeAccess(tribe, req.user.id, req.user.role);
    if (!access.isAdmin && !(isAuthor && access.isMember)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this post'
      });
    }

    post.deleteOne();
    await tribe.save();
    invalidateCache();

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    logger.error('Delete tribe post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Like/Unlike tribe post
// @route   POST /api/tribes/:id/posts/:postId/like
// @access  Private (Members only)
router.post('/:id/posts/:postId/like', protect, async (req, res) => {
  try {
    const tribe = await Tribe.findById(req.params.id);

    if (!tribe) {
      return res.status(404).json({
        success: false,
        message: 'Tribe not found'
      });
    }

    const access = getTribeAccess(tribe, req.user.id, req.user.role);
    if (!access.canViewContent) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member to like posts'
      });
    }

    const post = tribe.posts.id(req.params.postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const likeIndex = post.likes.findIndex(
      l => getIdString(l.user) === String(req.user.id)
    );

    if (likeIndex > -1) {
      post.likes.splice(likeIndex, 1);
      await tribe.save();
      invalidateCache();

      res.json({
        success: true,
        message: 'Post unliked',
        liked: false,
        isLiked: false,
        likes: post.likes.length,
        likesCount: post.likes.length
      });
    } else {
      post.likes.push({
        user: req.user.id
      });
      await tribe.save();
      invalidateCache();

      res.json({
        success: true,
        message: 'Post liked',
        liked: true,
        isLiked: true,
        likes: post.likes.length,
        likesCount: post.likes.length
      });
    }
  } catch (error) {
    logger.error('Like tribe post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Comment on tribe post
// @route   POST /api/tribes/:id/posts/:postId/comments
// @access  Private (Members only)
router.post('/:id/posts/:postId/comments', protect, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required'
      });
    }

    const tribe = await Tribe.findById(req.params.id);

    if (!tribe) {
      return res.status(404).json({
        success: false,
        message: 'Tribe not found'
      });
    }

    const access = getTribeAccess(tribe, req.user.id, req.user.role);
    const { isMember } = access;
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member to comment on posts'
      });
    }

    const post = tribe.posts.id(req.params.postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const newComment = {
      user: req.user.id,
      content: content.trim(),
      createdAt: new Date()
    };

    post.comments.push(newComment);
    await tribe.save();
    invalidateCache();

    const savedTribe = await Tribe.findById(tribe._id)
      .populate('posts.comments.user', 'username firstName lastName avatar');

    const savedPost = savedTribe.posts.id(post._id);
    const savedComment = savedPost.comments[savedPost.comments.length - 1];

    res.json({
      success: true,
      message: 'Comment added successfully',
      commentsCount: savedPost.comments.length,
      comment: {
        _id: savedComment._id,
        content: savedComment.content,
        user: {
          _id: savedComment.user?._id || req.user.id,
          username: savedComment.user?.username || req.user.username,
          firstName: savedComment.user?.firstName || req.user.firstName || 'Miembro',
          lastName: savedComment.user?.lastName || req.user.lastName || '',
          avatar: savedComment.user?.avatar || req.user.avatar
        },
        createdAt: savedComment.createdAt
      }
    });
  } catch (error) {
    logger.error('Comment on tribe post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// ============= TRIBE STORIES ROUTES =============

// @desc    Create tribe story
// @route   POST /api/tribes/:id/stories
// @access  Private (Members only)
router.post('/:id/stories', protect, async (req, res) => {
  try {
    const { media, duration = 5 } = req.body;

    if (!media || !media.url || !media.type) {
      return res.status(400).json({
        success: false,
        message: 'Media URL and type are required'
      });
    }

    if (!['image', 'video'].includes(media.type)) {
      return res.status(400).json({
        success: false,
        message: 'Media type must be image or video'
      });
    }

    const tribe = await Tribe.findById(req.params.id);

    if (!tribe) {
      return res.status(404).json({
        success: false,
        message: 'Tribe not found'
      });
    }

    const access = getTribeAccess(tribe, req.user.id, req.user.role);
    const { isMember } = access;
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member to post stories'
      });
    }

    const newStory = {
      author: req.user.id,
      media: {
        url: media.url,
        type: media.type,
        thumbnail: media.thumbnail || null
      },
      duration,
      views: [],
      createdAt: new Date()
    };

    tribe.stories.unshift(newStory);
    await tribe.save();
    invalidateCache();

    const savedTribe = await Tribe.findById(tribe._id)
      .populate('stories.author', 'username firstName lastName avatar');

    const createdStory = savedTribe.stories[0];

    res.status(201).json({
      success: true,
      message: 'Story created successfully',
      story: {
        _id: createdStory._id,
        author: {
          _id: createdStory.author._id,
          firstName: createdStory.author.firstName,
          lastName: createdStory.author.lastName,
          avatar: createdStory.author.avatar
        },
        media: createdStory.media,
        duration: createdStory.duration,
        views: createdStory.views.length,
        createdAt: createdStory.createdAt
      }
    });
  } catch (error) {
    logger.error('Create tribe story error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get tribe stories (last 24 hours)
// @route   GET /api/tribes/:id/stories
// @access  Private (Members only)
router.get('/:id/stories', protect, async (req, res) => {
  try {
    const tribe = await Tribe.findById(req.params.id)
      .populate('stories.author', 'username firstName lastName avatar');

    if (!tribe) {
      return res.status(404).json({
        success: false,
        message: 'Tribe not found'
      });
    }

    const access = getTribeAccess(tribe, req.user.id, req.user.role);
    const { isMember } = access;
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member to view stories'
      });
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentStories = tribe.stories.filter(story =>
      new Date(story.createdAt) > twentyFourHoursAgo
    );

    const formattedStories = recentStories.map(story => ({
      _id: story._id,
      author: {
        _id: story.author._id,
        firstName: story.author.firstName,
        lastName: story.author.lastName,
        avatar: story.author.avatar
      },
      media: story.media,
      duration: story.duration,
      views: story.views.length,
      viewedByUser: story.views.some(v => getIdString(v.user) === String(req.user.id)),
      createdAt: story.createdAt
    }));

    res.json({
      success: true,
      count: formattedStories.length,
      stories: formattedStories
    });
  } catch (error) {
    logger.error('Get tribe stories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Mark story as viewed
// @route   POST /api/tribes/:id/stories/:storyId/view
// @access  Private (Members only)
router.post('/:id/stories/:storyId/view', protect, async (req, res) => {
  try {
    const tribe = await Tribe.findById(req.params.id);

    if (!tribe) {
      return res.status(404).json({
        success: false,
        message: 'Tribe not found'
      });
    }

    const access = getTribeAccess(tribe, req.user.id, req.user.role);
    const { isMember } = access;
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member to view stories'
      });
    }

    const story = tribe.stories.id(req.params.storyId);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    const alreadyViewed = story.views.some(v => getIdString(v.user) === String(req.user.id));

    if (!alreadyViewed) {
      story.views.push({
        user: req.user.id,
        viewedAt: new Date()
      });
      await tribe.save();
    }

    res.json({
      success: true,
      message: 'Story view recorded',
      viewsCount: story.views.length
    });
  } catch (error) {
    logger.error('View tribe story error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
