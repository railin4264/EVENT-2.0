const express = require('express');
const Event = require('../models/Event');
const { protect, optionalAuth } = require('../middleware/auth');
const { eventListCache, eventDetailsCache, invalidateCache } = require('../middleware/cache');
const logger = require('../utils/logger');
const { body, query, param, validationResult } = require('express-validator');

const router = express.Router();

// Sanitization middleware for queries
const sanitizeQuery = (req, res, next) => {
  // Prevent NoSQL injection by removing operators from query params
  Object.keys(req.query).forEach(key => {
    if (typeof req.query[key] === 'object') {
      // Remove objects that might contain operators like $ne, $gt, etc.
      delete req.query[key];
    } else if (typeof req.query[key] === 'string') {
      // Escape special characters
      req.query[key] = req.query[key].replace(/[<>]/g, '');
    }
  });
  next();
};

// @desc    Get all events
// @route   GET /api/events
// @access  Public (with optional authentication)
router.get('/', optionalAuth, eventListCache, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const { lat, lng, radius = 10, priceMin, priceMax, timeFilter = 'all' } = req.query;

    // Build filter
    const filter = { status: 'published' };

    // Time-based filtering (upcoming, past, all)
    const now = new Date();
    if (timeFilter === 'upcoming') {
      // Show only future events
      filter.$or = [
        { endDate: { $gte: now } },
        { endDate: null, date: { $gte: now } }
      ];
    } else if (timeFilter === 'past') {
      // Show only past events
      filter.$or = [
        { endDate: { $lt: now } },
        { endDate: null, date: { $lt: now } }
      ];
    } else if (timeFilter === 'all') {
      // 'all' shows events from today onwards (today + future)
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      filter.$or = [
        { endDate: { $gte: startOfToday } },
        { endDate: null, date: { $gte: startOfToday } }
      ];
    }
    // No filter shows everything

    if (req.query.category) {
      filter.category = req.query.category;
    }

    // Age-based filtering
    if (req.user && req.user.age !== undefined) {
      const userAge = req.user.age;
      // Must meet min age
      filter['ageRestriction.minAge'] = { $lte: userAge };

      // Must meet max age (if set)
      filter.$and = [
        {
          $or: [
            { 'ageRestriction.maxAge': { $exists: false } },
            { 'ageRestriction.maxAge': null },
            { 'ageRestriction.maxAge': { $gte: userAge } }
          ]
        }
      ];
    } else {
      // Not logged in (or no age set) - hide adult content and 18+ events
      filter['ageRestriction.isAdultOnly'] = { $ne: true };
      filter['ageRestriction.minAge'] = { $lte: 18 };
    }

    if (req.query.createdBy) {
      filter.createdBy = req.query.createdBy;
    }

    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }

    // Add price range filter
    if (priceMin !== undefined || priceMax !== undefined) {
      filter['price.amount'] = {};
      if (priceMin !== undefined) {
        filter['price.amount'].$gte = parseFloat(priceMin);
      }
      if (priceMax !== undefined) {
        filter['price.amount'].$lte = parseFloat(priceMax);
      }
    }

    let events;
    let total;

    // Add geographical filtering if coordinates provided
    if (lat && lng) {
      const radiusInKm = parseFloat(radius);
      const centerLat = parseFloat(lat);
      const centerLng = parseFloat(lng);

      logger.info(`Discovery query: center=(${centerLat}, ${centerLng}), radius=${radiusInKm}km`);

      // Use MongoDB's native geospatial query for optimal performance
      // Use $geoWithin instead of $near to avoid sorting requirements conflict
      filter.location = {
        $geoWithin: {
          $centerSphere: [[centerLng, centerLat], radiusInKm / 6378.1]
        }
      };

      events = await Event.find(filter)
        .populate('createdBy', '_id username firstName lastName avatar')
        .populate('attendees.user', 'username firstName lastName avatar')
        .skip(startIndex)
        .limit(limit);

      total = await Event.countDocuments(filter);

      logger.info(`Found ${events.length} events within ${radiusInKm}km radius using $near query`);
    } else {
      // No location filtering - use regular query
      events = await Event.find(filter)
        .populate('createdBy', '_id username firstName lastName avatar')
        .populate('attendees.user', 'username firstName lastName avatar')
        .skip(startIndex)
        .limit(limit)
        .sort({ date: 1 });
      total = await Event.countDocuments(filter);
    }

    // Add isAttending and isFavorite fields if user is authenticated
    let eventsWithUserData = events;
    if (req.user) {
      // Fetch user once instead of inside the loop
      const User = require('../models/User');
      const user = await User.findById(req.user.id).select('favorites').lean();

      eventsWithUserData = events.map(event => {
        const eventObj = event.toObject();

        // Check if user is attending
        const isAttending = event.attendees.some(
          attendee => attendee.user && attendee.user.toString() === req.user.id
        );
        eventObj.isAttending = isAttending;

        // Check if event is favorited
        const isFavorite = user && user.favorites && user.favorites.includes(event._id.toString());
        eventObj.isFavorite = !!isFavorite;

        return eventObj;
      });
    }

    const response = {
      success: true,
      count: eventsWithUserData.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      events: eventsWithUserData
    };

    logger.info(`Sending ${response.count} events in response`);

    res.json(response);
  } catch (error) {
    logger.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Search events with advanced filters
// @route   GET /api/events/search
// @access  Public
router.get('/search', sanitizeQuery, async (req, res) => {
  try {
    const {
      category = 'all',
      dateRange = 'all',
      priceRange = '0,1000',
      distance = 50,
      attendees = '1,1000',
      rating = 0,
      tags = '',
      isOnline = false,
      isFree = false,
      hasFood = false,
      hasDrinks = false,
      isWheelchairAccessible = false,
      isFamilyFriendly = false,
      sortBy = 'relevance',
      page = 1,
      limit = 20
    } = req.query;

    // Build filter
    const filter = { status: 'published' };

    // Category filter
    if (category && category !== 'all') {
      filter.category = category;
    }

    // Date range filter
    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      switch (dateRange) {
      case 'today':
        filter.date = {
          $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
        };
        break;
      case 'tomorrow':
        filter.date = {
          $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
          $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2)
        };
        break;
      case 'this-week': {
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 6, 23, 59, 59);
        filter.date = { $gte: startOfWeek, $lte: endOfWeek };
        break;
      }
      case 'this-month':
        filter.date = {
          $gte: new Date(now.getFullYear(), now.getMonth(), 1),
          $lt: new Date(now.getFullYear(), now.getMonth() + 1, 1)
        };
        break;
      }
    }

    // Price range filter
    if (priceRange && priceRange !== '0,1000') {
      const [minPrice, maxPrice] = priceRange.split(',').map(Number);
      filter.price = { $gte: minPrice, $lte: maxPrice };
    }

    // Attendees filter
    if (attendees && attendees !== '1,1000') {
      const [minAttendees, maxAttendees] = attendees.split(',').map(Number);
      filter.maxAttendees = { $gte: minAttendees, $lte: maxAttendees };
    }

    // Tags filter
    if (tags && tags.trim()) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      filter.tags = { $in: tagArray };
    }

    // Boolean filters
    if (isOnline === 'true') filter.isVirtual = true;
    if (isFree === 'true') filter.price = 0;
    if (hasFood === 'true') filter.hasFood = true;
    if (hasDrinks === 'true') filter.hasDrinks = true;
    if (isWheelchairAccessible === 'true') filter.isWheelchairAccessible = true;
    if (isFamilyFriendly === 'true') filter.isFamilyFriendly = true;

    // Pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const startIndex = (pageNum - 1) * limitNum;

    // Sort options
    let sortOptions = {};
    switch (sortBy) {
    case 'date':
      sortOptions = { date: 1 };
      break;
    case 'price':
      sortOptions = { price: 1 };
      break;
    case 'popularity':
      sortOptions = { 'attendees.length': -1 };
      break;
    case 'relevance':
    default:
      sortOptions = { date: 1 };
      break;
    }

    const events = await Event.find(filter)
      .populate('createdBy', '_id username firstName lastName avatar')
      .skip(startIndex)
      .limit(limitNum)
      .sort(sortOptions);

    const total = await Event.countDocuments(filter);

    res.json({
      success: true,
      count: events.length,
      total,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      events
    });
  } catch (error) {
    logger.error('Search events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get nearby events
// @route   GET /api/events/nearby
// @access  Public
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 10, limit = 12 } = req.query;

    if (!lat || !lng) {
      // If no location provided, return recent events instead of mock data
      const recentEvents = await Event.find({ status: 'published' })
        .populate('createdBy', '_id username firstName lastName avatar')
        .limit(parseInt(limit))
        .sort({ date: 1 });

      const formattedEvents = recentEvents.map(event => ({
        _id: event._id,
        title: event.title,
        description: event.description,
        category: event.category,
        date: event.date,
        location: event.location,
        attendees: event.attendees,
        createdBy: {
          username: event.createdBy?.username,
          firstName: event.createdBy?.firstName,
          lastName: event.createdBy?.lastName,
          avatar: event.createdBy?.avatar
        },
        price: event.price,
        currency: event.currency,
        maxAttendees: event.maxAttendees,
        status: event.status,
        tags: event.tags,
        images: event.images
      }));

      return res.json({
        success: true,
        count: formattedEvents.length,
        events: formattedEvents
      });
    }

    const query = {
      status: 'published',
      location: {
        $geoWithin: {
          $centerSphere: [[parseFloat(lng), parseFloat(lat)], radius / 6371]
        }
      }
    };

    if (req.query.category) {
      query.category = req.query.category;
    }

    const events = await Event.find(query)
      .populate('createdBy', '_id username firstName lastName avatar')
      .limit(parseInt(limit))
      .sort({ date: 1 });

    const formattedEvents = events.map(event => ({
      _id: event._id,
      title: event.title,
      description: event.description,
      category: event.category,
      date: event.date,
      location: event.location,
      attendees: event.attendees,
      createdBy: {
        username: event.createdBy?.username,
        firstName: event.createdBy?.firstName,
        lastName: event.createdBy?.lastName,
        avatar: event.createdBy?.avatar
      },
      price: event.price,
      currency: event.currency,
      maxAttendees: event.maxAttendees,
      status: event.status,
      tags: event.tags,
      images: event.images
    }));

    res.json({
      success: true,
      count: formattedEvents.length,
      events: formattedEvents
    });
  } catch (error) {
    logger.error('Get nearby events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Create new event
// @route   POST /api/events
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    // Whitelist allowed fields to prevent Mass Assignment
    const allowedFields = [
      'title', 'description', 'category', 'date', 'endDate',
      'location', 'images', 'maxAttendees', 'isPrivate',
      'tags', 'price', 'ageRestriction'
    ];
    const eventData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        eventData[field] = req.body[field];
      }
    });
    eventData.createdBy = req.user.id;

    const event = await Event.create(eventData);

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      event
    });
  } catch (error) {
    logger.error('Create event error:', error);
    // Validation failures (e.g. missing title) must be 400, not 500.
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get user's favorite events
// @route   GET /api/events/favorites
// @access  Private
router.get('/favorites', protect, async (req, res) => {
  try {
    const User = require('../models/User');

    const user = await User.findById(req.user.id).select('favorites').lean();

    if (!user || !user.favorites || user.favorites.length === 0) {
      return res.json({
        success: true,
        events: []
      });
    }

    // Get all favorite events
    const events = await Event.find({ _id: { $in: user.favorites } })
      .populate('createdBy', 'username firstName lastName avatar')
      .populate('attendees.user', 'username firstName lastName avatar')
      .sort({ date: 1 })
      .lean();

    // Add isFavorite flag (always true for this endpoint)
    const eventsWithFlags = events.map(event => ({
      ...event,
      isFavorite: true,
      isAttending: event.attendees && event.attendees.some(a => a.user && a.user._id && a.user._id.toString() === req.user.id)
    }));

    res.json({
      success: true,
      events: eventsWithFlags
    });
  } catch (error) {
    logger.error('Get favorites error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public (with optional authentication)
router.get('/:id', optionalAuth, eventDetailsCache, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('createdBy', '_id username firstName lastName avatar')
      .populate('attendees.user', 'username firstName lastName avatar');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check age restriction
    if (event.ageRestriction) {
      const userAge = req.user ? req.user.age : 0; // Default to 0 if not logged in

      // Check min age
      if (event.ageRestriction.minAge && userAge < event.ageRestriction.minAge) {
        // If public/not logged in, and restriction is > 18, allow viewing but maybe warn?
        // Sticking to strict: Block it.
        return res.status(403).json({
          success: false,
          message: `You must be at least ${event.ageRestriction.minAge} years old to view this event`
        });
      }

      // Check max age
      if (event.ageRestriction.maxAge && userAge > event.ageRestriction.maxAge) {
        return res.status(403).json({
          success: false,
          message: `This event is restricted to ages ${event.ageRestriction.minAge}-${event.ageRestriction.maxAge}`
        });
      }

      // Check adult only
      if (event.ageRestriction.isAdultOnly && userAge < 18) {
        return res.status(403).json({
          success: false,
          message: 'This event is for adults only'
        });
      }
    }

    // Add isAttending and isFavorited fields if user is authenticated
    const eventResponse = event.toObject();
    if (req.user) {
      const isAttending = event.attendees.some(
        attendee => attendee.user && (
          (typeof attendee.user === 'object' && attendee.user._id && attendee.user._id.toString() === req.user.id) ||
          (attendee.user.toString() === req.user.id)
        )
      );
      eventResponse.isAttending = isAttending;

      // Check if event is favorited by current user
      const User = require('../models/User');
      const user = await User.findById(req.user.id).select('favorites').lean();
      const isFavorite = user && user.favorites && user.favorites.includes(req.params.id);
      eventResponse.isFavorite = !!isFavorite;
    }

    res.json({
      success: true,
      event: eventResponse
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Attend event
// @route   POST /api/events/:id/attend
// @access  Private
router.post('/:id/attend', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('createdBy', 'firstName lastName');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if user is already attending
    const existingAttendee = event.attendees.find(
      attendee => attendee.user.toString() === req.user.id
    );

    if (existingAttendee) {
      return res.status(200).json({
        success: true,
        message: 'User is already attending this event',
        event
      });
    }

    // Add user to attendees
    event.attendees.push({
      user: req.user.id,
      status: 'confirmed',
      joinedAt: new Date()
    });

    await event.save();

    // Populate the event with user details
    await event.populate('attendees.user', 'username firstName lastName avatar');

    // Send notification to event creator
    try {
      const NotificationService = require('../services/notificationService');
      const io = req.app.get('io');
      const notificationService = new NotificationService(io);

      const User = require('../models/User');
      const attendee = await User.findById(req.user.id).select('firstName lastName');
      const attendeeName = `${attendee.firstName} ${attendee.lastName}`;

      await notificationService.createEventAttendeeNotification(
        event.createdBy._id.toString(),
        req.user.id,
        event._id.toString(),
        event.title,
        attendeeName
      );

      // Check capacity and send warning if needed
      const remainingSpots = event.maxAttendees - event.attendees.length;
      if (event.maxAttendees && remainingSpots <= event.maxAttendees * 0.2) {
        await notificationService.createEventCapacityWarningNotification(
          event.createdBy._id.toString(),
          event._id.toString(),
          event.title,
          remainingSpots,
          event.maxAttendees
        );
      }
    } catch (notifError) {
      logger.error('Error sending attendee notification:', notifError);
      // Don't fail the request if notification fails
    }

    logger.info(`User ${req.user.id} attended event ${req.params.id}`);

    res.json({
      success: true,
      message: 'Successfully attended event',
      event
    });
  } catch (error) {
    logger.error('Attend event error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get event attendees
// @route   GET /api/events/:id/attendees
// @access  Public
router.get('/:id/attendees', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('attendees.user', 'username firstName lastName avatar');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      attendees: event.attendees,
      count: event.attendees.length
    });
  } catch (error) {
    logger.error('Get event attendees error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get event comments
// @route   GET /api/events/:id/comments
// @access  Public
router.get('/:id/comments', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('comments.user', 'username firstName lastName avatar');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Sort comments by newest first
    const sortedComments = (event.comments || []).sort((a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json({
      success: true,
      comments: sortedComments,
      count: sortedComments.length
    });
  } catch (error) {
    logger.error('Get event comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Add comment to event
// @route   POST /api/events/:id/comments
// @access  Private
router.post('/:id/comments', protect, async (req, res) => {
  try {
    const { comment } = req.body;

    if (!comment || !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required'
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Add comment to event
    const newComment = {
      user: req.user.id,
      text: comment.trim(),
      likes: [],
      createdAt: new Date()
    };

    event.comments.push(newComment);
    await event.save();

    // Populate the user details for the new comment
    await event.populate('comments.user', 'username firstName lastName avatar');

    // Return the newly added comment
    const addedComment = event.comments[event.comments.length - 1];

    logger.info(`User ${req.user.id} commented on event ${req.params.id}`);

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      comment: addedComment
    });
  } catch (error) {
    logger.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Delete comment from event
// @route   DELETE /api/events/:id/comments/:commentId
// @access  Private
router.delete('/:id/comments/:commentId', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Find comment index
    const commentIndex = event.comments.findIndex(
      comment => comment._id.toString() === req.params.commentId
    );

    if (commentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check if user is comment owner or event owner
    const comment = event.comments[commentIndex];
    if (comment.user.toString() !== req.user.id &&
      event.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment'
      });
    }

    // Remove comment
    event.comments.splice(commentIndex, 1);
    await event.save();

    logger.info(`Comment ${req.params.commentId} deleted from event ${req.params.id}`);

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    logger.error('Delete comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Like/unlike comment
// @route   POST /api/events/:id/comments/:commentId/like
// @access  Private
router.post('/:id/comments/:commentId/like', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Find comment
    const comment = event.comments.find(
      c => c._id.toString() === req.params.commentId
    );

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check if user already liked
    const likeIndex = comment.likes.indexOf(req.user.id);

    if (likeIndex > -1) {
      // Unlike
      comment.likes.splice(likeIndex, 1);
    } else {
      // Like
      comment.likes.push(req.user.id);
    }

    await event.save();

    res.json({
      success: true,
      message: likeIndex > -1 ? 'Comment unliked' : 'Comment liked',
      likesCount: comment.likes.length,
      isLiked: likeIndex === -1
    });
  } catch (error) {
    logger.error('Like comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// NOTE: Duplicate POST /:id/view route removed (was shadowed by the one below at line ~1025)

// @desc    Track event share
// @route   POST /api/events/:id/share
// @access  Private (optional)
router.post('/:id/share', async (req, res) => {
  try {
    const { platform } = req.body;
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Add share tracking
    const shareData = {
      platform: platform || 'unknown',
      sharedAt: new Date()
    };

    if (req.user) {
      shareData.user = req.user.id;
    }

    event.shares.push(shareData);
    await event.save();

    res.json({
      success: true,
      sharesCount: event.shares.length
    });
  } catch (error) {
    logger.error('Track share error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// NOTE: Duplicate POST /:eventId/comments/:commentId/like and DELETE /:eventId/comments/:commentId
// routes removed. The canonical versions are defined above (lines ~786 and ~731).

// @desc    Track event view
// @route   POST /api/events/:id/view
// @access  Public
router.post('/:id/view', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Add view record
    const viewRecord = {
      user: req.user?.id || null,
      viewedAt: new Date()
    };

    event.views.push(viewRecord);
    await event.save();

    res.json({
      success: true,
      data: {
        viewsCount: event.views.length
      }
    });
  } catch (error) {
    logger.error('Track view error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Join event (alias for attend)
// @route   POST /api/events/:id/join
// @access  Private
router.post('/:id/join', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if user is already attending
    const existingAttendee = event.attendees.find(
      attendee => attendee.user.toString() === req.user.id
    );

    if (existingAttendee) {
      return res.status(400).json({
        success: false,
        message: 'User is already attending this event'
      });
    }

    // Add user to attendees
    event.attendees.push({
      user: req.user.id,
      status: 'confirmed',
      joinedAt: new Date()
    });

    await event.save();

    // Populate the event with user details
    await event.populate('attendees.user', 'username firstName lastName avatar');

    logger.info(`User ${req.user.id} joined event ${req.params.id}`);

    res.json({
      success: true,
      message: 'Successfully joined event',
      event
    });
  } catch (error) {
    logger.error('Join event error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Leave event
// @route   POST /api/events/:id/leave
// @access  Private
router.post('/:id/leave', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Find and remove user from attendees
    const attendeeIndex = event.attendees.findIndex(
      attendee => attendee.user.toString() === req.user.id
    );

    if (attendeeIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'User is not attending this event'
      });
    }

    event.attendees.splice(attendeeIndex, 1);
    await event.save();

    logger.info(`User ${req.user.id} left event ${req.params.id}`);

    res.json({
      success: true,
      message: 'Successfully left event',
      event
    });
  } catch (error) {
    logger.error('Leave event error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Toggle favorite event
// @route   POST /api/events/:id/favorite
// @access  Private
router.post('/:id/favorite', protect, async (req, res) => {
  try {
    const User = require('../models/User');

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Initialize favorites array if it doesn't exist
    if (!user.favorites) {
      user.favorites = [];
    }

    // Check if event is already favorited
    const favoriteIndex = user.favorites.indexOf(req.params.id);
    let isFavorited = false;

    if (favoriteIndex > -1) {
      // Remove from favorites
      user.favorites.splice(favoriteIndex, 1);
      isFavorited = false;
    } else {
      // Add to favorites
      user.favorites.push(req.params.id);
      isFavorited = true;
    }

    await user.save();

    logger.info(`User ${req.user.id} ${isFavorited ? 'favorited' : 'unfavorited'} event ${req.params.id}`);

    res.json({
      success: true,
      message: isFavorited ? 'Event added to favorites' : 'Event removed from favorites',
      isFavorited
    });
  } catch (error) {
    logger.error('Toggle favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Toggle like event
// @route   POST /api/events/:id/like
// @access  Private
router.post('/:id/like', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Initialize likes array if it doesn't exist
    if (!event.likes) {
      event.likes = [];
    }

    const isLiked = event.isLikedByUser(req.user.id);

    if (isLiked) {
      // Unlike event
      event.likes = event.likes.filter(like => like.user.toString() !== req.user.id);
    } else {
      // Like event
      event.likes.push({
        user: req.user.id,
        createdAt: new Date()
      });
    }

    await event.save();

    logger.info(`User ${req.user.id} ${isLiked ? 'unliked' : 'liked'} event ${req.params.id}`);

    res.json({
      success: true,
      message: isLiked ? 'Event unliked' : 'Event liked',
      data: {
        likesCount: event.likesCount,
        isLiked: !isLiked
      }
    });
  } catch (error) {
    logger.error('Like event error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get users who liked event
// @route   GET /api/events/:id/likes
// @access  Public
router.get('/:id/likes', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('likes.user', 'username firstName lastName avatar verified bio');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const likes = event.likes ? event.likes.map(like => ({
      user: {
        _id: like.user._id,
        username: like.user.username,
        firstName: like.user.firstName,
        lastName: like.user.lastName,
        avatar: like.user.avatar,
        verified: like.user.verified,
        bio: like.user.bio
      },
      createdAt: like.createdAt
    })) : [];

    res.json({
      success: true,
      count: likes.length,
      data: likes
    });
  } catch (error) {
    logger.error('Get event likes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;





