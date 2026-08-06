const express = require('express');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Event = require('../models/Event');
const Tribe = require('../models/Tribe');
const logger = require('../utils/logger');

const router = express.Router();

// Sanitize user input before using in MongoDB regex to prevent ReDoS attacks
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Sanitize NoSQL operators from query string to prevent injection
function sanitizeNoSqlOperators(str) {
  if (typeof str !== 'string') return str;
  const noSqlOperators = [
    '$where', '$gt', '$gte', '$lt', '$lte', '$ne', '$in', '$nin',
    '$or', '$and', '$not', '$nor', '$exists', '$type', '$mod',
    '$regex', '$options', '$all', '$elemMatch', '$size', '$comment',
    '$natural', '$orderby', '$hint', '$maxScan', '$min', '$max',
    '$returnKey', '$showDiskLoc', '$snapshot', '$query', '$explain'
  ];
  let sanitized = str;
  for (const op of noSqlOperators) {
    const regex = new RegExp(op.replace('$', '\\$'), 'gi');
    sanitized = sanitized.replace(regex, '');
  }
  return sanitized;
}

// @desc    Get search suggestions
// @route   GET /api/search/suggestions
// @access  Private
router.get('/suggestions', protect, async (req, res) => {
  try {
    const { q, type } = req.query;

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        suggestions: []
      });
    }

    if (q.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be 100 characters or fewer'
      });
    }

    const safeQ = escapeRegex(q);
    const suggestions = [];

    // Search users
    if (!type || type === 'users') {
      const users = await User.find({
        $or: [
          { username: { $regex: safeQ, $options: 'i' } },
          { firstName: { $regex: safeQ, $options: 'i' } },
          { lastName: { $regex: safeQ, $options: 'i' } }
        ]
      })
        .select('username firstName lastName avatar')
        .limit(5);

      suggestions.push(...users.map(user => ({
        type: 'user',
        id: user._id,
        title: `${user.firstName} ${user.lastName}`,
        subtitle: `@${user.username}`,
        avatar: user.avatar
      })));
    }

    // Search events
    if (!type || type === 'events') {
      const events = await Event.find({
        $or: [
          { title: { $regex: safeQ, $options: 'i' } },
          { description: { $regex: safeQ, $options: 'i' } }
        ],
        status: 'published'
      })
        .select('title description date location')
        .limit(5);

      suggestions.push(...events.map(event => ({
        type: 'event',
        id: event._id,
        title: event.title,
        subtitle: event.location || new Date(event.date).toLocaleDateString(),
        date: event.date
      })));
    }

    // Search tribes
    if (!type || type === 'tribes') {
      const tribes = await Tribe.find({
        $or: [
          { name: { $regex: safeQ, $options: 'i' } },
          { description: { $regex: safeQ, $options: 'i' } }
        ]
      })
        .select('name description memberCount')
        .limit(5);

      suggestions.push(...tribes.map(tribe => ({
        type: 'tribe',
        id: tribe._id,
        title: tribe.name,
        subtitle: `${tribe.memberCount} miembros`,
        memberCount: tribe.memberCount
      })));
    }

    res.json({
      success: true,
      suggestions: suggestions.slice(0, 10) // Limit total suggestions
    });
  } catch (error) {
    logger.error('Search suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Global search
// @route   GET /api/search/global
// @access  Private
router.get('/global', protect, async (req, res) => {
  try {
    const { q, type, page = 1, limit = 20 } = req.query;

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        results: {
          users: [],
          events: [],
          tribes: []
        },
        pagination: {
          page: 1,
          limit: parseInt(limit),
          total: 0,
          pages: 0
        }
      });
    }

    if (q.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be 100 characters or fewer'
      });
    }

    const safeQ = escapeRegex(q);
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const results = {};

    // Search users
    if (!type || type === 'users') {
      const users = await User.find({
        $or: [
          { username: { $regex: safeQ, $options: 'i' } },
          { firstName: { $regex: safeQ, $options: 'i' } },
          { lastName: { $regex: safeQ, $options: 'i' } }
        ]
      })
        .select('username firstName lastName avatar bio')
        .skip(skip)
        .limit(parseInt(limit));

      const userCount = await User.countDocuments({
        $or: [
          { username: { $regex: safeQ, $options: 'i' } },
          { firstName: { $regex: safeQ, $options: 'i' } },
          { lastName: { $regex: safeQ, $options: 'i' } }
        ]
      });

      results.users = {
        data: users,
        total: userCount,
        page: parseInt(page),
        pages: Math.ceil(userCount / parseInt(limit))
      };
    }

    // Search events
    if (!type || type === 'events') {
      const events = await Event.find({
        $or: [
          { title: { $regex: safeQ, $options: 'i' } },
          { description: { $regex: safeQ, $options: 'i' } }
        ],
        status: 'published'
      })
        .populate('createdBy', 'username firstName lastName avatar')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ date: 1 });

      const eventCount = await Event.countDocuments({
        $or: [
          { title: { $regex: safeQ, $options: 'i' } },
          { description: { $regex: safeQ, $options: 'i' } }
        ],
        status: 'published'
      });

      results.events = {
        data: events,
        total: eventCount,
        page: parseInt(page),
        pages: Math.ceil(eventCount / parseInt(limit))
      };
    }

    // Search tribes
    if (!type || type === 'tribes') {
      const tribes = await Tribe.find({
        $or: [
          { name: { $regex: safeQ, $options: 'i' } },
          { description: { $regex: safeQ, $options: 'i' } }
        ]
      })
        .populate('createdBy', 'username firstName lastName avatar')
        .skip(skip)
        .limit(parseInt(limit));

      const tribeCount = await Tribe.countDocuments({
        $or: [
          { name: { $regex: safeQ, $options: 'i' } },
          { description: { $regex: safeQ, $options: 'i' } }
        ]
      });

      results.tribes = {
        data: tribes,
        total: tribeCount,
        page: parseInt(page),
        pages: Math.ceil(tribeCount / parseInt(limit))
      };
    }

    res.json({
      success: true,
      results,
      query: q,
      type: type || 'all'
    });
  } catch (error) {
    logger.error('Global search error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Search events, users, tribes by text query
// @route   GET /api/search
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { q, type } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        data: { events: [], users: [], tribes: [] }
      });
    }

    if (q.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be 100 characters or fewer'
      });
    }

    // Sanitize NoSQL operators from query
    const safeQ = sanitizeNoSqlOperators(q.trim());
    const escapedQ = escapeRegex(safeQ);
    const searchTypes = type ? type.split(',') : ['events', 'users', 'tribes'];
    const data = { events: [], users: [], tribes: [] };

    // Search users
    if (searchTypes.includes('users')) {
      const users = await User.find({
        $or: [
          { username: { $regex: escapedQ, $options: 'i' } },
          { firstName: { $regex: escapedQ, $options: 'i' } },
          { lastName: { $regex: escapedQ, $options: 'i' } }
        ],
        isActive: true
      })
        .select('username firstName lastName avatar bio')
        .limit(20);
      data.users = users;
    }

    // Search events
    if (searchTypes.includes('events')) {
      const events = await Event.find({
        $or: [
          { title: { $regex: escapedQ, $options: 'i' } },
          { description: { $regex: escapedQ, $options: 'i' } }
        ],
        status: 'published'
      })
        .populate('createdBy', 'username firstName lastName avatar')
        .select('title description date location images category')
        .limit(20)
        .sort({ date: 1 });
      data.events = events;
    }

    // Search tribes
    if (searchTypes.includes('tribes')) {
      const tribes = await Tribe.find({
        $or: [
          { name: { $regex: escapedQ, $options: 'i' } },
          { description: { $regex: escapedQ, $options: 'i' } }
        ],
        isActive: true
      })
        .populate('creator', 'username firstName lastName avatar')
        .select('name description category memberCount avatar')
        .limit(20);
      data.tribes = tribes;
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
