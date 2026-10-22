const express = require('express');
const { protect, optionalAuth, restrictTo } = require('../middleware/auth');
const logger = require('../utils/logger');
const mongoose = require('mongoose');
const User = require('../models/User');
const Tribe = require('../models/Tribe');
const Order = require('../models/Order');
const Event = require('../models/Event');
const { getAudienceInsights } = require('../services/audienceInsights');

const router = express.Router();
const { analyticsInput } = require('../utils/analyticsInput');

// Analytics Event Model
const analyticsEventSchema = new mongoose.Schema({
  eventId: { type: String },
  name: {
    type: String,
    required: true,
    index: true
  },
  properties: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true,
    index: true
  },
  sessionId: {
    type: String,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  userAgent: String,
  ipAddress: String,
  url: String,
  referrer: String
}, {
  timestamps: true
});

// Indexes for performance
analyticsEventSchema.index({ name: 1, timestamp: -1 });
analyticsEventSchema.index({ userId: 1, timestamp: -1 });
analyticsEventSchema.index({ timestamp: -1 });

analyticsEventSchema.index({ eventId: 1 }, { unique: true, partialFilterExpression: { eventId: { $type: 'string' } } });
// Retention must preserve historical aggregates; no automatic deletion without an agreed policy.

// Create the model if it doesn't exist
let AnalyticsEvent;
try {
  AnalyticsEvent = mongoose.model('AnalyticsEvent');
} catch (error) {
  AnalyticsEvent = mongoose.model('AnalyticsEvent', analyticsEventSchema);
}

// POST /api/analytics/track - Track analytics events
router.post('/track', optionalAuth, async (req, res) => {
  try {
    if (req.body.ownerId !== undefined && req.body.ownerId !== String(req.user?._id || '')) return res.status(403).json({ success: false, message: 'La sesión de analítica cambió' });
    let processedEvents;
    try { processedEvents = analyticsInput(req.body.events, req.user?._id); }
    catch (error) { return res.status(400).json({ success: false, message: error.message }); }

    // Insert events with error handling
    try {
      await AnalyticsEvent.insertMany(processedEvents, { ordered: false });
      
      logger.info(`Successfully tracked ${processedEvents.length} analytics events`);
      
      res.json({
        success: true,
        message: `${processedEvents.length} events tracked successfully`,
        eventsProcessed: processedEvents.length
      });
    } catch (insertError) {
      // Handle partial failures in batch insert
      logger.error('Partial failure in analytics tracking:', insertError);
      
      res.status(207).json({
        success: true,
        message: 'Some events tracked successfully',
        warning: 'Some events may have failed to save'
      });
    }

  } catch (error) {
    logger.error('Analytics tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track events',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Get event analytics
// @route   GET /api/analytics/events
// @access  Private
router.get('/events', protect, async (req, res) => {
  try {
    const timeframe = req.query.timeframe || '30d';
    const days = { '24h': 1, '7d': 7, '30d': 30, '90d': 90 }[timeframe];
    if (!days) return res.status(400).json({ success: false, message: 'Periodo inválido' });
    const now = new Date();
    const since = new Date(now.getTime() - days * 86400000);
    const previous = new Date(since.getTime() - days * 86400000);
    const scope = req.user.role === 'admin' ? {} : { createdBy: req.user._id };
    if (req.query.eventId) {
      if (!mongoose.isValidObjectId(req.query.eventId)) return res.status(400).json({ success: false, message: 'Evento inválido' });
      scope._id = new mongoose.Types.ObjectId(req.query.eventId);
      if (!await Event.exists(scope)) return res.status(404).json({ success: false, message: 'Evento no disponible' });
    }
    const [catalogue] = await Event.aggregate([{ $match: scope }, { $facet: {
      totals: [{ $group: { _id: null, total: { $sum: 1 }, created: { $sum: { $cond: [{ $gte: ['$createdAt', since] }, 1, 0] } }, previous: { $sum: { $cond: [{ $and: [{ $gte: ['$createdAt', previous] }, { $lt: ['$createdAt', since] }] }, 1, 0] } }, upcoming: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'published'] }, { $gte: ['$date', now] }] }, 1, 0] } } } }],
      statuses: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
      categories: [{ $group: { _id: '$category', count: { $sum: 1 } } }],
      attendees: [{ $unwind: '$attendees' }, { $match: { 'attendees.status': 'confirmed' } }, { $group: { _id: '$attendees.user', count: { $sum: 1 } } }, { $group: { _id: null, total: { $sum: '$count' }, unique: { $sum: 1 } } }],
      top: [{ $project: { title: 1, attendees: { $size: { $filter: { input: { $ifNull: ['$attendees', []] }, as: 'a', cond: { $eq: ['$$a.status', 'confirmed'] } } } } } }, { $sort: { attendees: -1 } }, { $limit: 10 }],
      daily: [{ $match: { createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, events: { $sum: 1 } } }, { $sort: { _id: 1 } }]
    } }]);
    // Client telemetry is observational, never a source of attendance, revenue or ratings.
    const observations = await AnalyticsEvent.aggregate([
      { $match: { timestamp: { $gte: since } } },
      { $addFields: { linkedEvent: { $convert: { input: '$properties.eventId', to: 'objectId', onError: null, onNull: null } } } },
      { $lookup: { from: 'events', localField: 'linkedEvent', foreignField: '_id', as: 'event' } },
      { $unwind: '$event' },
      { $match: { ...(scope.createdBy ? { 'event.createdBy': scope.createdBy } : {}), ...(scope._id ? { 'event._id': scope._id } : {}) } },
      { $group: { _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, event: '$event._id', action: '$properties.action' }, count: { $sum: 1 }, users: { $addToSet: '$userId' } } }
    ]);
    const total = catalogue.totals[0] || { total: 0, created: 0, previous: 0, upcoming: 0 };
    const attendance = catalogue.attendees[0] || { total: 0, unique: 0 };
    const statuses = Object.fromEntries(catalogue.statuses.map(row => [row._id, row.count]));
    const count = action => observations.filter(row => row._id.action === action).reduce((sum, row) => sum + row.count, 0);
    const views = count('view');
    const telemetryDays = new Map();
    for (const row of observations) {
      const day = telemetryDays.get(row._id.day) || { date: row._id.day, events: 0, users: new Set() };
      day.events += row.count; (row.users || []).filter(Boolean).forEach(user => day.users.add(String(user))); telemetryDays.set(day.date, day);
    }
    const analytics = {
      telemetry: { daily: [...telemetryDays.values()].sort((a,b) => a.date.localeCompare(b.date)).map(day => ({ date: day.date, events: day.events, users: day.users.size })) },
      overview: { totalEvents: total.total, totalAttendees: attendance.total, totalRevenue: null, averageRating: null, growthRate: total.previous ? Number(((total.created - total.previous) / total.previous * 100).toFixed(1)) : null, totalPageViews: views, totalInteractions: observations.reduce((sum,row) => sum + row.count, 0) },
      events: { created: total.created, published: statuses.published || 0, completed: statuses.completed || 0, cancelled: statuses.cancelled || 0, upcoming: total.upcoming },
      attendees: { total: attendance.total, unique: attendance.unique, new: null, returning: null, averagePerEvent: total.total ? attendance.total / total.total : 0 },
      engagement: { averageViews: total.total ? views / total.total : 0, averageShares: total.total ? count('share') / total.total : 0, averageComments: null, clickThroughRate: null },
      topEvents: catalogue.top.map(event => ({ _id: event._id, title: event.title, attendees: event.attendees, views: observations.filter(row => String(row._id.event) === String(event._id) && row._id.action === 'view').reduce((sum, row) => sum + row.count, 0), rating: null })),
      trends: { daily: catalogue.daily.map(row => ({ date: row._id, events: row.events, users: null })), categories: catalogue.categories.map(row => ({ name: row._id, count: row.count, growth: null })) },
      measurement: { catalogue: 'current_database_snapshot', created: 'selected_period', telemetry: 'client_reported_selected_period', unavailable: ['revenue', 'ratings', 'new_and_returning_attendees', 'comments', 'click_through_rate'], note: 'Los campos no medidos se devuelven como null; no equivalen a cero.' }
    };
    res.set('Cache-Control', 'private, no-store');
    return res.json({ success: true, analytics, timeframe, generatedAt: now.toISOString() });
  } catch (error) {
    logger.error('Get event analytics error:', error);
    return res.status(500).json({ success: false, message: 'No se pudieron cargar las métricas' });
  }
});

// @desc    Get user analytics
// @route   GET /api/analytics/users
// @access  Private/Admin
router.get('/users', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

    const [totalUsers, activeUsers, newUsers, topUsers] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: true, updatedAt: { $gte: since } }),
      User.countDocuments({ createdAt: { $gte: since } }),
      User.aggregate([
        { $match: { isActive: true } },
        { $project: { firstName: 1, lastName: 1, username: 1, createdAt: 1 } },
        { $sort: { createdAt: -1 } },
        { $limit: 10 }
      ])
    ]);

    const growthDaily = await User.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        newUsers: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);

    const userAnalytics = {
      overview: {
        totalUsers,
        activeUsers,
        newUsers,
        retentionRate: totalUsers > 0 ? parseFloat(((activeUsers / totalUsers) * 100).toFixed(1)) : 0
      },
      recentUsers: topUsers.map(u => ({
        userId: u._id,
        name: `${u.firstName} ${u.lastName}`,
        username: u.username,
        joinedAt: u.createdAt
      })),
      growth: {
        daily: growthDaily.map(d => ({ date: d._id, newUsers: d.newUsers }))
      }
    };

    res.json({ success: true, userAnalytics, generatedAt: new Date().toISOString() });
  } catch (error) {
    logger.error('Get user analytics error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Get tribe analytics
// @route   GET /api/analytics/tribes
// @access  Private/Admin
router.get('/tribes', protect, restrictTo('admin'), async (req, res) => {
  try {
    const [totalTribes, topTribes, byCategory] = await Promise.all([
      Tribe.countDocuments({ isActive: true }),
      Tribe.aggregate([
        { $match: { isActive: true } },
        { $project: { name: 1, category: 1, memberCount: { $size: '$members' } } },
        { $sort: { memberCount: -1 } },
        { $limit: 10 }
      ]),
      Tribe.aggregate([
        { $match: { isActive: true } },
        { $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalMembers: { $sum: { $size: '$members' } }
        }},
        { $sort: { count: -1 } }
      ])
    ]);

    const totalMembers = topTribes.reduce((sum, t) => sum + t.memberCount, 0);

    const tribeAnalytics = {
      overview: {
        totalTribes,
        totalMembers,
        averageMembersPerTribe: totalTribes > 0 ? parseFloat((totalMembers / totalTribes).toFixed(1)) : 0
      },
      topTribes: topTribes.map(t => ({
        _id: t._id,
        name: t.name,
        category: t.category,
        members: t.memberCount
      })),
      categories: byCategory.map(c => ({
        name: c._id,
        count: c.count,
        members: c.totalMembers
      }))
    };

    res.json({ success: true, tribeAnalytics, generatedAt: new Date().toISOString() });
  } catch (error) {
    logger.error('Get tribe analytics error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Get revenue analytics
// @route   GET /api/analytics/revenue
// @access  Private/Admin
router.get('/revenue', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    const days = timeframe === '7d' ? 7 : timeframe === '90d' ? 90 : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const prevSince = new Date(since.getTime() - days * 24 * 60 * 60 * 1000);

    const [overview, dailyTrend, topEvents] = await Promise.all([
      Order.aggregate([
        { $match: { status: 'paid' } },
        { $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalTransactions: { $sum: 1 }
        }}
      ]),
      Order.aggregate([
        { $match: { status: 'paid', createdAt: { $gte: since } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          transactions: { $sum: 1 }
        }},
        { $sort: { _id: 1 } }
      ]),
      Order.aggregate([
        { $match: { status: 'paid' } },
        { $group: {
          _id: '$eventId',
          revenue: { $sum: '$totalAmount' },
          ticketsSold: { $sum: '$totalTickets' },
          orders: { $sum: 1 }
        }},
        { $sort: { revenue: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'events', localField: '_id', foreignField: '_id', as: 'event' } },
        { $unwind: { path: '$event', preserveNullAndEmptyArrays: true } }
      ])
    ]);

    const [thisPeriod, lastPeriod] = await Promise.all([
      Order.aggregate([
        { $match: { status: 'paid', createdAt: { $gte: since } } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' } } }
      ]),
      Order.aggregate([
        { $match: { status: 'paid', createdAt: { $gte: prevSince, $lt: since } } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' } } }
      ])
    ]);

    const total = overview[0]?.totalRevenue || 0;
    const totalTx = overview[0]?.totalTransactions || 0;
    const thisRev = thisPeriod[0]?.revenue || 0;
    const lastRev = lastPeriod[0]?.revenue || 0;
    const growth = lastRev > 0 ? parseFloat((((thisRev - lastRev) / lastRev) * 100).toFixed(1)) : 0;

    const revenueAnalytics = {
      overview: {
        totalRevenue: total,
        thisPeriod: thisRev,
        lastPeriod: lastRev,
        growth,
        averageTransactionValue: totalTx > 0 ? parseFloat((total / totalTx).toFixed(2)) : 0,
        totalTransactions: totalTx
      },
      trends: {
        daily: dailyTrend.map(d => ({ date: d._id, revenue: d.revenue, transactions: d.transactions }))
      },
      topEvents: topEvents.map(e => ({
        eventId: e._id,
        title: e.event?.title || 'Evento eliminado',
        revenue: e.revenue,
        ticketsSold: e.ticketsSold || e.orders,
        averagePrice: e.orders > 0 ? parseFloat((e.revenue / e.orders).toFixed(2)) : 0
      }))
    };

    res.json({ success: true, revenueAnalytics, timeframe, generatedAt: new Date().toISOString() });
  } catch (error) {
    logger.error('Get revenue analytics error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Audience insights for creators by zone (derived from real nearby events)
// @route   GET /api/analytics/audience-insights
// @access  Private
router.get('/audience-insights', protect, async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radiusKm = req.query.radius ? parseFloat(req.query.radius) : 25;

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: 'lat and lng query params are required',
      });
    }

    const insights = await getAudienceInsights(lat, lng, radiusKm);
    res.json({ success: true, data: insights });
  } catch (error) {
    logger.error('Audience insights error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
















