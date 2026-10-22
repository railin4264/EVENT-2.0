const express = require('express');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const { protect, optionalAuth, restrictTo } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { invalidateCache } = require('../middleware/cache');
const logger = require('../utils/logger');
const { paymentsEnabled } = require('../config/features');
const { body, query, param, validationResult } = require('express-validator');
const { buildCategoryFilterQuery } = require('../utils/categories');
const { buildAgeRestrictionFilter, ageIsAllowed } = require('../utils/eventVisibility');
const { parseEventListFilters, eventListConstraints, activeEventTimeFilter } = require('../utils/eventListFilters');
const { hasEventParticipation, toggleSocialVote } = require('../services/eventSocialAccess');
const { PROFILE_FIELDS, summarizeAttendance, safeAttendanceEntries } = require('../utils/attendanceSummary');
const { memoryUploadLimit, receiveMemoryImage, storeMemoryImage, findMemoryImage, openMemoryImage,
  deleteMemoryImage, serializeMemory } = require('../services/privateMemoryStorage');

const { VIBES, isLive, summarizeVibe } = require('../utils/liveVibe');
const router = express.Router();

// Both attendance entry points apply the same event rules before mutating data.
router.post(['/:id/attend', '/:id/join'], protect, async (req, res, next) => {
  try {
    if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(400).json({ success: false, message: 'Identificador de evento inválido' });
    const event = await Event.findById(req.params.id);
    if (!event || event.status !== 'published') return res.status(404).json({ success: false, message: 'Evento no disponible' });
    const organizer = String(event.createdBy) === req.user.id || req.user.role === 'admin';
    if (event.isPrivate && !organizer && !await hasEventParticipation(event, req.user._id)) return res.status(403).json({ success: false, message: 'Este evento es privado' });
    if (!organizer && !ageIsAllowed(event, req.user)) return res.status(403).json({ success: false, message: 'No cumples los requisitos de edad del evento' });
    if (new Date(event.endDate || event.date).getTime() < Date.now()) return res.status(400).json({ success: false, message: 'Este evento ya terminó' });
    next();
  } catch (error) { next(error); }
});

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

function canViewSecretLocation(event, user) {
  if (!event || !event.isSecretLocation) return true;
  if (!user) return false;
  if (user.role === 'admin') return true;
  const creatorId = (event.createdBy?._id || event.createdBy)?.toString();
  if (creatorId && creatorId === String(user.id || user._id)) return true;
  const isAttendee = event.attendees?.some(a => {
    const attendeeId = (a.user?._id || a.user)?.toString();
    return attendeeId === String(user.id || user._id) && ['attending', 'confirmed'].includes(a.status);
  });
  return Boolean(isAttendee);
}

function sanitizeEventLocation(eventObj, user) {
  if (!eventObj || !eventObj.isSecretLocation || !eventObj.location) return eventObj;
  if (canViewSecretLocation(eventObj, user)) return eventObj;

  eventObj.location = {
    ...eventObj.location,
    address: 'Ubicación secreta · se revela al confirmar',
    venue: undefined,
    coordinates: (eventObj.location.coordinates || []).map(n => Math.round(n * 100) / 100)
  };
  delete eventObj.distance; delete eventObj.distanceKm; delete eventObj.distanceMeters;
  return eventObj;
}

function sanitizeSecretLocation(eventObj, user) {
  const result = sanitizeEventLocation(eventObj, user);
  const canManage = user && (user.role === 'admin' || String(result?.createdBy?._id || result?.createdBy) === String(user.id || user._id));
  if (result?.isSecretLocation && result.practicalInfo && !canManage) {
    result.practicalInfo = { bring: result.practicalInfo.bring, accessibility: result.practicalInfo.accessibility };
  }
  if (result && Array.isArray(result.attendees)) {
    result.attendanceSummary = summarizeAttendance(result.attendees);
    result.attendeesCount = result.attendanceSummary.confirmedCount;
    result.attendees = safeAttendanceEntries(result.attendees, user?.id || user?._id);
  }
  return result;
}

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function discoveryScope(req, res, next) {
  const q = req.query;
  const fail = message => res.status(400).json({ success: false, message });
  const scope = {};
  if (q.countryCode !== undefined) {
    if (typeof q.countryCode !== 'string' || !/^[a-z]{2}$/i.test(q.countryCode.trim())) return fail('countryCode debe ser un código de país de dos letras');
    scope.countryCode = q.countryCode.trim().toUpperCase();
  }
  if (q.city !== undefined) {
    if (!scope.countryCode || typeof q.city !== 'string' || !q.city.trim() || q.city.trim().length > 100) return fail('city requiere countryCode y un nombre de ciudad válido');
    scope.city = q.city.trim();
  }
  if (q.lat !== undefined || q.lng !== undefined) {
    const number = value => typeof value === 'string' && value.trim() ? Number(value) : NaN;
    const lat = number(q.lat), lng = number(q.lng);
    const radius = q.radiusKm ?? q.radius;
    const km = radius === undefined ? 50 : number(radius);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || !Number.isFinite(km) || km <= 0) return fail('Indica lat, lng y radio válidos');
    scope.geo = { lat, lng, radiusKm: Math.min(km, 500) };
  }
  req.discoveryScope = scope;
  next();
}

const scopeFilter = scope => ({
  ...(scope.countryCode ? { 'location.countryCode': scope.countryCode } : {}),
  ...(scope.city ? { 'location.city': new RegExp(`^${escapeRegex(scope.city)}$`, 'i') } : {})
});

// @desc    Get all events
// @route   GET /api/events
// @access  Public (with optional authentication)
router.get('/', optionalAuth, discoveryScope, async (req, res) => {
  try {
    res.set('Cache-Control', 'private, no-store');
    const requestedPage = req.query.page === undefined ? 1 : Number(req.query.page);
    const requestedLimit = req.query.limit === undefined ? 10 : Number(req.query.limit);
    if (!Number.isSafeInteger(requestedPage) || !Number.isSafeInteger(requestedLimit)) return res.status(400).json({ success: false, message: 'page y limit deben ser números enteros' });
    const page = Math.min(Math.max(requestedPage, 1), 1000000);
    const limit = Math.min(Math.max(requestedLimit, 1), 100);
    const startIndex = (page - 1) * limit;
    const { timeFilter = 'all' } = req.query;
    const listFilters = parseEventListFilters(req.query);

    // Build filter
    const filter = { status: 'published', isPrivate: { $ne: true }, ...buildAgeRestrictionFilter(req.user), ...scopeFilter(req.discoveryScope) };

    // Time-based filtering (upcoming, past, all)
    const now = new Date();
    filter.$and.push(...eventListConstraints(listFilters, now));
    if (timeFilter === 'upcoming') {
      // Includes the current two-hour estimate when no explicit end exists.
      filter.$and.push(activeEventTimeFilter(now));
    } else if (timeFilter === 'past') {
      // Show only past events
      filter.$or = [
        { endDate: { $lt: now } },
        { endDate: null, date: { $lt: now } }
      ];
    } else if (timeFilter === 'all') {
      // 'all' shows events from today onwards (today + future) and recurring weekly activities
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      filter.$or = [
        { endDate: { $gte: startOfToday } },
        { endDate: null, date: { $gte: startOfToday } },
        { isRecurring: true }
      ];
    }
    // No filter shows everything

    const categoryFilter = buildCategoryFilterQuery({
      category: req.query.category,
      categories: req.query.categories,
      excludeCategories: req.query.excludeCategories,
      hidePolitical: req.query.hidePolitical,
      hideReligious: req.query.hideReligious,
      userPreferences: req.user?.settings?.preferences
    });
    if (categoryFilter !== null) {
      filter.category = categoryFilter;
    }

    if (req.query.isRecurring !== undefined) {
      filter.isRecurring = req.query.isRecurring === 'true';
    }

    if (req.query.isCommercialDeal !== undefined) {
      filter.isCommercialDeal = req.query.isCommercialDeal === 'true';
    }

    if (req.query.isTourOrTrip !== undefined) {
      filter.isTourOrTrip = req.query.isTourOrTrip === 'true';
    }

    if (req.query.isUnofficial !== undefined) {
      filter.isUnofficial = req.query.isUnofficial === 'true';
    }

    if (req.query.isOnline === 'true' || req.query.isVirtual === 'true' || req.query.virtual === 'true') {
      filter.isVirtual = true;
    }

    if (req.query.virtualPlatform) {
      filter.virtualPlatform = req.query.virtualPlatform;
    }

    if (req.query.eventType) {
      filter.eventType = req.query.eventType;
    }

    if (req.query.isStream === 'true') {
      filter['virtualDetails.isStream'] = true;
    }

    if (req.query.isWorkshop === 'true') {
      filter['virtualDetails.isWorkshop'] = true;
    }

    if (req.query.isWebinar === 'true') {
      filter['virtualDetails.isWebinar'] = true;
    }

    if (req.query.createdBy) {
      if (!/^[0-9a-fA-F]{24}$/.test(req.query.createdBy)) {
        return res.status(400).json({ success: false, message: 'Invalid createdBy ID' });
      }
      filter.createdBy = req.query.createdBy;
    }

    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }

    let events;
    let total;

    // Add geographical filtering if coordinates provided (skipped for purely virtual queries)
    if (req.discoveryScope.geo && !filter.isVirtual) {
      const { lat: centerLat, lng: centerLng, radiusKm: radiusInKm } = req.discoveryScope.geo;

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
        .populate('attendees.user', PROFILE_FIELDS)
        .sort({ date: 1, _id: 1 })
        .skip(startIndex)
        .limit(limit);

      total = await Event.countDocuments(filter);

      logger.info(`Found ${events.length} events within ${radiusInKm}km radius using $near query`);
    } else {
      // No location filtering - use regular query
      events = await Event.find(filter)
        .populate('createdBy', '_id username firstName lastName avatar')
        .populate('attendees.user', PROFILE_FIELDS)
        .skip(startIndex)
        .limit(limit)
        .sort({ date: 1, _id: 1 });
      total = await Event.countDocuments(filter);
    }

    // Add isAttending and isFavorite fields if user is authenticated, and sanitize secret location
    let userFavorites = null;
    if (req.user) {
      const User = require('../models/User');
      const user = await User.findById(req.user.id).select('favorites').lean();
      userFavorites = new Set((user?.favorites || []).map(value => String(value?._id || value)));
    }

    const eventsWithUserData = (events || []).map(event => {
      const eventObj = event.toObject ? event.toObject() : { ...event };
      eventObj.vibeRadar = summarizeVibe(event);
      if (req.user) {
        eventObj.isAttending = Boolean(event.attendees?.some(
          attendee => attendee.user && String(attendee.user._id || attendee.user) === String(req.user.id) && ['attending', 'confirmed'].includes(attendee.status)
        ));
        eventObj.isFavorite = Boolean(userFavorites?.has(String(event._id)));
      }
      return sanitizeSecretLocation(eventObj, req.user);
    });

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
    if (error.statusCode === 400) return res.status(400).json({ success: false, message: error.message });
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get personalized and location-aware event recommendations
// @route   GET /api/events/recommendations
// @access  Public (Optional Auth)
router.get('/recommendations', optionalAuth, async (req, res) => {
  try {
    const aiService = require('../services/AIRecommendationService');
    const number = value => typeof value === 'string' && value.trim() ? Number(value) : NaN;
    const lat = req.query.lat ?? req.query.latitude, lng = req.query.lng ?? req.query.longitude;
    const radius = req.query.radius === undefined ? 50 : number(req.query.radius);
    const limit = req.query.limit === undefined ? 10 : number(req.query.limit);
    const location = lat !== undefined || lng !== undefined ? { lat: number(lat), lng: number(lng) } : null;
    if ((location && (!Number.isFinite(location.lat) || Math.abs(location.lat) > 90 || !Number.isFinite(location.lng) || Math.abs(location.lng) > 180)) ||
      !Number.isFinite(radius) || radius <= 0 || radius > 500 || !Number.isInteger(limit) || limit < 1 || limit > 30) {
      return res.status(400).json({ success: false, message: 'Indica coordenadas válidas, radio entre 0 y 500 km y límite entre 1 y 30' });
    }

    const userContext = req.user || {
      _id: '000000000000000000000000',
      interests: [],
      location: location ? { type: 'Point', coordinates: [location.lng, location.lat] } : null
    };

    const recommendations = await aiService.getRuleBasedEventRecommendations(userContext, {
      ...req.query, location, radius, limit
    });

    res.json({
      success: true,
      count: recommendations.length,
      events: recommendations,
      recommendations,
      data: {
        events: recommendations,
        recommendations
      }
    });
  } catch (error) {
    logger.error('Get event recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching event recommendations'
    });
  }
});

// Destinations come from visible upcoming events; no external geocoding or inferred countries.
router.get('/destinations', optionalAuth, discoveryScope, async (req, res) => {
  const raw = req.query.q ?? '';
  if (typeof raw !== 'string' || raw.trim().length > 80 || raw.trim().length === 1) return res.status(400).json({ success: false, message: 'Busca un destino con entre 2 y 80 caracteres' });
  const term = raw.trim();
  const search = term ? new RegExp(escapeRegex(term), 'i') : null;
  const now = new Date();
  const match = { status: 'published', isPrivate: { $ne: true }, ...buildAgeRestrictionFilter(req.user),
    ...scopeFilter(req.discoveryScope), 'location.countryCode': req.discoveryScope.countryCode || /^[A-Z]{2}$/,
    $or: [{ endDate: { $gte: now } }, { endDate: null, date: { $gte: now } }] };
  const centroid = axis => ({ $avg: { $cond: ['$isSecretLocation', { $round: [{ $arrayElemAt: ['$location.coordinates', axis] }, 2] }, { $arrayElemAt: ['$location.coordinates', axis] }] } });
  try {
    const rows = await Event.aggregate([
      { $match: match },
      { $facet: {
        countries: [
          ...(search ? [{ $match: { $or: [{ 'location.country': search }, { 'location.countryCode': search }] } }] : []),
          { $group: { _id: '$location.countryCode', country: { $first: '$location.country' }, eventsCount: { $sum: 1 }, lat: centroid(1), lng: centroid(0) } },
          { $project: { _id: 0, kind: { $literal: 'country' }, countryCode: '$_id', country: { $ifNull: ['$country', '$_id'] },
            label: { $ifNull: ['$country', '$_id'] }, eventsCount: 1, lat: 1, lng: 1 } }
        ],
        cities: [
          { $match: { 'location.city': { $type: 'string', $regex: /\S/ } } },
          ...(search ? [{ $match: { $or: [{ 'location.city': search }, { 'location.country': search }, { 'location.countryCode': search }] } }] : []),
          { $group: { _id: { countryCode: '$location.countryCode', city: { $toLower: { $trim: { input: '$location.city' } } } },
            city: { $first: '$location.city' }, country: { $first: '$location.country' }, eventsCount: { $sum: 1 }, lat: centroid(1), lng: centroid(0) } },
          { $project: { _id: 0, kind: { $literal: 'city' }, countryCode: '$_id.countryCode', city: 1,
            country: { $ifNull: ['$country', '$_id.countryCode'] },
            label: { $concat: ['$city', ', ', { $ifNull: ['$country', '$_id.countryCode'] }] }, eventsCount: 1, lat: 1, lng: 1 } }
        ]
      } },
      { $project: { destinations: { $concatArrays: ['$countries', '$cities'] } } },
      { $unwind: '$destinations' },
      { $replaceRoot: { newRoot: '$destinations' } },
      { $sort: { eventsCount: -1, label: 1 } },
      { $limit: 12 }
    ]);
    res.set('Cache-Control', req.user ? 'private, no-cache' : 'public, max-age=60');
    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Get destinations error:', error);
    res.status(500).json({ success: false, message: 'No se pudieron cargar los destinos' });
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
    const categoryFilter = buildCategoryFilterQuery({
      category: category && category !== 'all' ? category : undefined,
      categories: req.query.categories,
      excludeCategories: req.query.excludeCategories,
      hidePolitical: req.query.hidePolitical,
      hideReligious: req.query.hideReligious,
      userPreferences: req.user?.settings?.preferences
    });
    if (categoryFilter !== null) {
      filter.category = categoryFilter;
    }

    if (req.query.isUnofficial !== undefined) {
      filter.isUnofficial = req.query.isUnofficial === 'true';
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
      filter['price.amount'] = { $gte: minPrice, $lte: maxPrice };
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

    // Boolean & Virtual filters
    if (isOnline === 'true' || req.query.isVirtual === 'true' || req.query.virtual === 'true') {
      filter.isVirtual = true;
    }
    if (req.query.eventType) {
      filter.eventType = req.query.eventType;
    }
    if (req.query.virtualPlatform) {
      filter.virtualPlatform = req.query.virtualPlatform;
    }
    if (req.query.isStream === 'true') {
      filter['virtualDetails.isStream'] = true;
    }
    if (req.query.isWorkshop === 'true') {
      filter['virtualDetails.isWorkshop'] = true;
    }
    if (req.query.isWebinar === 'true') {
      filter['virtualDetails.isWebinar'] = true;
    }
    if (isFree === 'true') filter['price.amount'] = 0;
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
      sortOptions = { 'price.amount': 1 };
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

    const sanitizedEvents = (events || []).map(e => sanitizeSecretLocation(e.toObject ? e.toObject() : { ...e }, req.user));

    res.json({
      success: true,
      count: sanitizedEvents.length,
      total,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      events: sanitizedEvents
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
    const { lat, lng, radius = 10, limit = 12, useH3, ring = 1 } = req.query;

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
        images: event.images,
        organizer: event.organizer,
        interestedCount: event.interestedCount
      }));

      return res.json({
        success: true,
        count: formattedEvents.length,
        events: formattedEvents
      });
    }

    let query;
    if (useH3 === 'true') {
      const { buildH3SpatialFilter } = require('../services/eventIngestion/h3SpatialIndexer');
      query = {
        status: 'published',
        ...buildH3SpatialFilter(lat, lng, 7, parseInt(ring) || 1)
      };
    } else {
      query = {
        status: 'published',
        location: {
          $geoWithin: {
            $centerSphere: [[parseFloat(lng), parseFloat(lat)], radius / 6371]
          }
        }
      };
    }

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
      images: event.images,
      organizer: event.organizer,
      interestedCount: event.interestedCount
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

// @desc    Get pending events for admin review
// @route   GET /api/events/admin/pending
// @access  Private (Admin)
router.get('/admin/pending', protect, restrictTo('admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const filter = { status: 'pending_review' };
    const [events, total] = await Promise.all([
      Event.find(filter)
        .populate('createdBy', 'username firstName lastName email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Event.countDocuments(filter)
    ]);

    res.json({
      success: true,
      count: events.length,
      total,
      data: events
    });
  } catch (error) {
    logger.error('Get pending events error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Approve an event (Admin)
// @route   POST /api/events/:id/approve
// @access  Private (Admin)
router.post('/:id/approve', protect, restrictTo('admin'), param('id').isMongoId(), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('createdBy', 'username firstName lastName email');
    if (!event) return res.status(404).json({ success: false, message: 'Evento no encontrado' });

    event.status = 'published';
    await event.save();
    invalidateCache();

    res.json({
      success: true,
      message: `El evento "${event.title}" fue aprobado y publicado exitosamente.`,
      event
    });
  } catch (error) {
    logger.error('Approve event error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Reject an event (Admin)
// @route   POST /api/events/:id/reject
// @access  Private (Admin)
router.post('/:id/reject', protect, restrictTo('admin'), param('id').isMongoId(), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Evento no encontrado' });

    const reason = req.body.reason || 'El evento no cumple con las directrices de la comunidad.';
    event.status = 'cancelled';
    event.moderationNote = reason;
    await event.save();
    invalidateCache();

    res.json({
      success: true,
      message: 'El evento fue rechazado.',
      event
    });
  } catch (error) {
    logger.error('Reject event error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Create new event
// @route   POST /api/events
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    // Whitelist allowed fields to prevent Mass Assignment
    const allowedFields = [
      'title', 'description', 'category', 'date', 'endDate', 'timeZone',
      'location', 'images', 'maxAttendees', 'isPrivate',
      'tags', 'price', 'ageRestriction', 'isUnofficial', 'isVirtual', 'virtualLink', 'accessibility', 'isSecretLocation',
      'ticketUrl', 'paymentInfo', 'activityType', 'eventType', 'virtualPlatform', 'virtualDetails'
    ];
    const eventData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        eventData[field] = req.body[field];
      }
    });
    eventData.createdBy = req.user.id;
    if (typeof eventData.price === 'number') {
      eventData.price = { amount: eventData.price, currency: 'USD' };
    }

    const isAutoApproved = Boolean(req.user.role === 'admin' || req.user.verified || req.user.isOrganizerVerified || req.user.isVerifiedOrganizer);

    // Do not publish an event whose admission cannot be reserved. A draft is
    // hidden from discovery until both documents have been persisted.
    const event = new Event({ ...eventData, status: 'draft' });
    const ticket = new Ticket({
      _id: event._id, eventId: event._id, name: 'General',
      price: event.price.amount, currency: event.price.currency.toLowerCase(),
      quantity: event.maxAttendees || 100, saleStartDate: new Date(), saleEndDate: event.date
    });
    await event.validate();
    await ticket.validate();
    try {
      await event.save();
      await ticket.save();
      event.status = isAutoApproved ? 'published' : 'pending_review';
      await event.save();
    } catch (error) {
      await Promise.allSettled([Event.deleteOne({ _id: event._id }), Ticket.deleteOne({ _id: ticket._id })]);
      throw error;
    }

    invalidateCache();

    res.status(201).json({
      success: true,
      message: isAutoApproved
        ? 'Evento publicado exitosamente'
        : '¡Evento enviado a revisión! El equipo de moderación lo revisará en breve para publicarlo en la cartelera.',
      isPendingReview: !isAutoApproved,
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

// Update the organizer's event without accepting ownership or activity fields.
router.put('/:id', protect, param('id').isMongoId(), async (req, res, next) => {
  if (!validationResult(req).isEmpty()) return res.status(400).json({ success: false, message: 'Invalid event ID' });
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (String(event.createdBy) !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this event' });
    }
    const fields = ['title', 'description', 'category', 'date', 'endDate', 'timeZone', 'images', 'maxAttendees',
      'isPrivate', 'tags', 'price', 'ageRestriction', 'isUnofficial', 'isVirtual', 'virtualLink', 'accessibility', 'isSecretLocation', 'ticketUrl', 'paymentInfo', 'activityType', 'eventType', 'virtualPlatform', 'virtualDetails'];
    for (const field of fields) if (req.body[field] !== undefined) event.set(field, req.body[field]);
    if (req.body.location !== undefined) {
      event.location = { ...(event.location?.toObject?.() || event.location || {}), ...req.body.location };
    }
    await event.validate();
    const original = await Event.findById(event._id).lean();
    const inventoryChange = event.maxAttendees !== original.maxAttendees || event.price.amount !== original.price.amount ||
      event.price.currency !== original.price.currency || new Date(event.date).getTime() !== new Date(original.date).getTime();
    if (inventoryChange) {
      const tickets = await Ticket.find({ eventId: event._id });
      // Multiple ticket types have independent prices and sale windows.
      if (tickets.some(ticket => ticket.sold > 0) || tickets.length > 1) {
        return res.status(409).json({ success: false, message: 'No puedes cambiar fecha, precio o aforo después de reservar entradas o crear varios tipos de entrada.' });
      }
      if (tickets.length === 1) {
        const ticket = tickets[0];
        const changed = await Ticket.findOneAndUpdate({ _id: ticket._id, sold: 0 }, { $set: {
          price: event.price.amount, currency: event.price.currency.toLowerCase(),
          quantity: event.maxAttendees || ticket.quantity, available: event.maxAttendees || ticket.quantity,
          saleEndDate: event.date, isFree: event.price.amount === 0
        } }, { new: true, runValidators: true });
        if (!changed) return res.status(409).json({ success: false, message: 'Las entradas cambiaron. Recarga el evento antes de editarlo.' });
      }
    }
    if (new Date(event.date).getTime() !== new Date(original.date).getTime()) {
      event.previousDate = original.date;
      event.rescheduledAt = new Date();
    }
    await event.save();
    await invalidateCache();
    res.json({ success: true, event });
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ success: false, message: 'Validation failed',
      errors: Object.values(error.errors).map(item => item.message) });
    next(error);
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

// @desc    Neuro-UX Roulette: get a surprising curated event tailored to mood/vibe
// @route   GET /api/events/roulette
// @access  Public
router.get('/roulette', sanitizeQuery, optionalAuth, async (req, res) => {
  try {
    const { vibe, budget, maxPrice, durationHours, lat, lng, radius = 50 } = req.query;
    const numeric = (value, min, max) => value === undefined || (String(value).trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max);
    if (!numeric(maxPrice, 0, 1000000) || !numeric(durationHours, 0.1, 168) ||
      !numeric(lat, -90, 90) || !numeric(lng, -180, 180) || !numeric(radius, 1, 500) ||
      ((lat === undefined) !== (lng === undefined))) {
      return res.status(400).json({ success: false, message: 'Revisa el presupuesto, la duración y la zona elegidos.' });
    }
    res.set('Cache-Control', 'private, no-store');
    const now = new Date();

    const query = {
      status: 'published',
      isPrivate: { $ne: true },
      ...buildAgeRestrictionFilter(req.user),
      $or: [
        { endDate: { $gte: now } },
        { endDate: null, date: { $gte: now } }
      ]
    };

    if (budget === 'free' || maxPrice === '0' || maxPrice === 0) {
      query['price.amount'] = 0;
    } else if (maxPrice && !isNaN(parseFloat(maxPrice))) {
      query['price.amount'] = { $lte: parseFloat(maxPrice) };
      // The budget selector is denominated in DOP; do not compare unlike currencies.
      query['price.currency'] = 'DOP';
    }

    if (durationHours && !isNaN(parseFloat(durationHours))) {
      const maxMs = parseFloat(durationHours) * 3600 * 1000;
      query.$and = query.$and || [];
      query.$and.push({ endDate: { $type: 'date' }, $expr: { $and: [
        { $gte: [{ $subtract: ['$endDate', '$date'] }, 0] },
        { $lte: [{ $subtract: ['$endDate', '$date'] }, maxMs] }
      ] } });
    }

    if (vibe) {
      const vibeMap = {
        bohemio: ['art', 'music', 'culture'],
        party: ['entertainment', 'music', 'nightlife'],
        chill: ['health', 'wellness', 'culture', 'sports'],
        tech: ['technology', 'education', 'networking'],
        food: ['food', 'networking']
      };
      if (vibeMap[vibe]) {
        query.category = { $in: vibeMap[vibe] };
      } else if (vibe !== 'any') {
        query.category = vibe;
      }
    }

    const categoryFilter = buildCategoryFilterQuery({
      categories: Array.isArray(query.category?.$in) ? query.category.$in : undefined,
      category: typeof query.category === 'string' ? query.category : undefined,
      excludeCategories: req.query.excludeCategories,
      hidePolitical: req.query.hidePolitical,
      hideReligious: req.query.hideReligious,
      userPreferences: req.user?.settings?.preferences
    });
    if (categoryFilter !== null) {
      query.category = categoryFilter;
    }

    if (lat !== undefined && lng !== undefined) {
      const radiusInKm = parseFloat(radius) || 50;
      query.location = {
        $geoWithin: {
          $centerSphere: [[parseFloat(lng), parseFloat(lat)], radiusInKm / 6378.1]
        }
      };
    }

    const totalEligible = await Event.countDocuments(query);

    if (totalEligible === 0) {
      return res.status(404).json({
        success: false,
        message: 'No encontramos planes con esos filtros. Prueba otra zona, presupuesto o duración.'
      });
    }

    const randomSkip = Math.floor(Math.random() * totalEligible);
    const chosenEvent = await Event.findOne(query)
      .skip(randomSkip)
      .populate('createdBy', '_id username firstName lastName avatar isOrganizerVerified')
      .lean();
    if (!chosenEvent) return res.status(404).json({ success: false, message: 'Este plan ya no está disponible. Vuelve a intentarlo.' });

    const icebreakers = [
      '¿Qué fue lo más inesperado que hiciste esta semana?',
      'Si pudieras teletransportarte a cualquier rincón de RD ahora mismo, ¿a dónde irías?',
      '¿Cuál es esa canción o actividad que te reinicia la mente?',
      '¿Qué habilidad extraña te gustaría aprender este año?',
      '¿Qué es lo mejor que te ha pasado al ir solo a un lugar nuevo?'
    ];
    const randomIcebreaker = icebreakers[Math.floor(Math.random() * icebreakers.length)];

    const matchReasons = [];
    const eventPrice = chosenEvent.price?.amount || 0;
    const currency = chosenEvent.price?.currency || 'DOP';
    let priceLabel;
    try { priceLabel = new Intl.NumberFormat('es-DO', { style: 'currency', currency }).format(eventPrice); }
    catch { priceLabel = `${eventPrice} ${currency}`; }
    if (eventPrice === 0) {
      matchReasons.push('Entrada libre y gratuita');
    } else if (maxPrice) {
      matchReasons.push(`Precio: ${priceLabel}`);
    } else {
      matchReasons.push(`Precio: ${priceLabel}`);
    }

    if (durationHours) {
      matchReasons.push(`Horario compatible: para disfrutar en tus ${durationHours}h disponibles`);
    }

    res.json({
      success: true,
      data: {
        event: sanitizeSecretLocation(chosenEvent, req.user),
        vibe: vibe || 'Serendipia espontánea',
        icebreaker: randomIcebreaker,
        matchReasons,
        timeAvailable: durationHours ? `${durationHours} horas` : null
      }
    });
  } catch (error) {
    logger.error('Roulette event error:', error);
    res.status(500).json({ success: false, message: 'Error en la ruleta de eventos' });
  }
});

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public (with optional authentication)
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    res.set('Cache-Control', 'private, no-store');
    if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(400).json({ success: false, message: 'Identificador de evento inválido' });
    const event = await Event.findById(req.params.id)
      .populate('createdBy', '_id username firstName lastName avatar verified isOrganizerVerified organizerVerification')
      .populate('attendees.user', PROFILE_FIELDS);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (['draft', 'pending_review'].includes(event.status) && String(event.createdBy?._id || event.createdBy) !== req.user?.id && req.user?.role !== 'admin') {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event.isPrivate && req.user?.role !== 'admin' && String(event.createdBy?._id || event.createdBy) !== req.user?.id && !await hasEventParticipation(event, req.user?._id)) {
      return res.status(403).json({ success: false, message: 'Este evento es privado' });
    }

    // Check age restriction
    if (event.ageRestriction) {
      const userAge = Number(req.user?.age) || 0;

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
      if (event.ageRestriction.maxAge && (!userAge || userAge > event.ageRestriction.maxAge)) {
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
    let eventResponse = event.toObject();
    eventResponse.vibeRadar = summarizeVibe(event);
    if (req.user) {
      const isAttending = await hasEventParticipation(event, req.user._id);
      eventResponse.isAttending = isAttending;

      // Check if event is favorited by current user
      const User = require('../models/User');
      const user = await User.findById(req.user.id).select('favorites').lean();
      const isFavorite = user && user.favorites && user.favorites.includes(req.params.id);
      eventResponse.isFavorite = !!isFavorite;
    }

    eventResponse = sanitizeSecretLocation(eventResponse, req.user);
    eventResponse.attendanceSummary = summarizeAttendance(event.attendees);
    eventResponse.attendeesCount = eventResponse.attendanceSummary.confirmedCount;
    eventResponse.attendees = safeAttendanceEntries(event.attendees, req.user?.id);

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

    if ((event.price?.amount || 0) > 0 && paymentsEnabled()) {
      return res.status(402).json({
        success: false,
        message: 'Este evento requiere comprar una entrada en el checkout'
      });
    }

    const confirmedCount = event.attendees.filter(a => !a.status || ['attending', 'confirmed'].includes(a.status)).length;
    if (event.maxAttendees && confirmedCount >= event.maxAttendees) {
      return res.status(400).json({
        success: false,
        message: 'El evento ha alcanzado su capacidad máxima'
      });
    }

    // Add user to attendees
    const promoterCode = (req.body?.promoter || req.body?.rrpp || req.query?.rrpp || req.query?.promoter || '').trim().toLowerCase().slice(0, 50);
    event.attendees.push({
      user: req.user.id,
      status: 'confirmed',
      promoter: promoterCode || undefined,
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

    try {
      await require('../services/friendAttendanceNotifications').notifyFriendsOfAttendance(event, req.user.id, req.app.get('io'));
    } catch (error) { logger.error('Friend attendance notification failed:', error); }
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

// @desc    Toggle solo-attendee status on an event (Mesa de los que van solos)
// @route   POST /api/events/:id/solo-toggle
// @access  Private
router.post('/:id/solo-toggle', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Evento no encontrado' });
    }

    const attendee = event.attendees.find(a => a.user && a.user.toString() === req.user.id);
    let isSoloNow = false;

    if (!attendee) {
      isSoloNow = true;
      event.attendees.push({
        user: req.user.id,
        status: 'confirmed',
        isSolo: true,
        joinedAt: new Date()
      });
    } else {
      attendee.isSolo = !attendee.isSolo;
      isSoloNow = Boolean(attendee.isSolo);
    }

    await event.save();
    await event.populate('attendees.user', '_id username firstName lastName avatar');

    const soloList = event.attendees
      .filter(a => a.isSolo && a.user)
      .map(a => a.user);

    res.json({
      success: true,
      message: isSoloNow ? '¡Te sumaste a la mesa de los que van solos!' : 'Estado actualizado',
      isSolo: isSoloNow,
      soloCount: soloList.length,
      soloAttendees: soloList
    });
  } catch (error) {
    logger.error('Solo toggle error:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar estado de asistencia solo' });
  }
});

// @desc    Get solo-goers table for an event
// @route   GET /api/events/:id/solo-attendees
// @access  Public
router.get('/:id/solo-attendees', optionalAuth, async (req, res) => {
  try {
    res.set('Cache-Control', 'private, no-store');
    if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(400).json({ success: false, message: 'Identificador de evento inválido' });
    const event = await Event.findById(req.params.id)
      .populate('attendees.user', PROFILE_FIELDS);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Evento no encontrado' });
    }

    const manager = req.user?.role === 'admin' || String(event.createdBy) === String(req.user?.id);
    if (['draft', 'pending_review'].includes(event.status) && !manager) return res.status(404).json({ success: false, message: 'Evento no encontrado' });
    if (event.isPrivate && !manager && !await hasEventParticipation(event, req.user?._id)) return res.status(403).json({ success: false, message: 'Este evento es privado' });
    if (!manager && !ageIsAllowed(event, req.user)) return res.status(403).json({ success: false, message: 'No cumples los requisitos de edad del evento' });
    const soloList = summarizeAttendance((event.attendees || []).filter(a => a.isSolo)).visibleAttendees
      .map(person => ({ _id: person.id, firstName: person.firstName, username: person.username, avatar: person.avatar }));

    const isUserSolo = req.user
      ? (event.attendees || []).some(a => a.isSolo && a.user?._id?.toString() === req.user.id)
      : false;

    res.json({
      success: true,
      data: {
        isSoloFriendly: event.isSoloFriendly !== false,
        welcomeNote: event.soloWelcomeNote || 'Mesa de bienvenida para quienes vienen solos. ¡Aquí nadie se queda aislado!',
        welcomeHost: event.soloWelcomeHost,
        count: soloList.length,
        attendees: soloList,
        isUserSolo
      }
    });
  } catch (error) {
    logger.error('Get solo attendees error:', error);
    res.status(500).json({ success: false, message: 'Error al consultar asistentes solos' });
  }
});

// @desc    Volunteer as solo welcome host (Bienvenida con Anfitrión Voluntario)
// @route   POST /api/events/:id/solo-host
// @access  Private
router.post('/:id/solo-host', protect, async (req, res) => {
  try {
    const { meetingSpot, timeWindow } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Evento no encontrado' });

    const isAttendee = event.attendees.some(a => String(a.user?._id || a.user) === String(req.user.id));
    const isOrganizer = String(event.createdBy) === String(req.user.id) || req.user.role === 'admin';
    if (!isAttendee && !isOrganizer) {
      return res.status(403).json({ success: false, message: 'Debes ser asistente o el organizador para ser anfitrión de bienvenida' });
    }

    event.soloWelcomeHost = {
      user: req.user.id,
      name: `${req.user.firstName || req.user.username}`,
      meetingSpot: String(meetingSpot || 'Mesa principal / Entrada').slice(0, 100),
      timeWindow: String(timeWindow || 'Primeros 15 minutos').slice(0, 80),
      confirmed: true
    };
    await event.save();

    res.json({
      success: true,
      message: '¡Gracias! Quedaste registrado como Anfitrión de Bienvenida voluntario.',
      welcomeHost: event.soloWelcomeHost
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al registrar anfitrión' });
  }
});

// @desc    Get event attendees
// @route   GET /api/events/:id/attendees
// @access  Public
router.get('/:id/attendees', optionalAuth, async (req, res) => {
  try {
    res.set('Cache-Control', 'private, no-store');
    if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(400).json({ success: false, message: 'Identificador de evento inválido' });
    const event = await Event.findById(req.params.id)
      .populate('attendees.user', PROFILE_FIELDS);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const manager = req.user?.role === 'admin' || String(event.createdBy) === String(req.user?.id);
    if (['draft', 'pending_review'].includes(event.status) && !manager) return res.status(404).json({ success: false, message: 'Event not found' });
    if (event.isPrivate && !manager && !await hasEventParticipation(event, req.user?._id)) return res.status(403).json({ success: false, message: 'Este evento es privado' });
    if (!manager && !ageIsAllowed(event, req.user)) return res.status(403).json({ success: false, message: 'No cumples los requisitos de edad del evento' });
    const attendanceSummary = summarizeAttendance(event.attendees);
    res.json({
      success: true,
      attendees: safeAttendanceEntries(event.attendees, req.user?.id),
      attendanceSummary,
      count: attendanceSummary.confirmedCount
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

    if ((event.price?.amount || 0) > 0 && paymentsEnabled()) {
      return res.status(402).json({
        success: false,
        message: 'Este evento requiere comprar una entrada en el checkout'
      });
    }

    const confirmedCount = event.attendees.filter(a => !a.status || ['attending', 'confirmed'].includes(a.status)).length;
    if (event.maxAttendees && confirmedCount >= event.maxAttendees) {
      return res.status(400).json({
        success: false,
        message: 'El evento ha alcanzado su capacidad máxima'
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

    try {
      await require('../services/friendAttendanceNotifications').notifyFriendsOfAttendance(event, req.user.id, req.app.get('io'));
    } catch (error) { logger.error('Friend attendance notification failed:', error); }
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

// @desc    Admin manually triggers Dominican Republic event auto-population
// @route   POST /api/events/admin/seed-now
// @access  Admin
router.post('/admin/seed-now', [protect, restrictTo('admin')], async (req, res) => {
  try {
    const RDEventSeeder = require('../services/rdEventSeeder');
    const result = await RDEventSeeder.seedAllRDEvents(true);
    if (result?.skipped) return res.status(409).json({ success: false, message: 'Los datos de demostración están deshabilitados. Esta función no importa eventos reales.' });
    res.json({
      success: true,
      message: 'Datos de ejemplo de RD creados; no son una sincronización de eventos reales',
      data: result
    });
  } catch (error) {
    logger.error('Admin seed events error:', error);
    res.status(500).json({ success: false, message: 'Error al auto-poblar eventos' });
  }
});

// ─── Termómetro de Vibra / Vibe Radar en Vivo ────────────────────────────────

// @route   POST /api/events/:id/vibe
// @desc    Reportar o actualizar la vibra en vivo del evento (🔥 Encendido, 🍃 Chill, 👥 Lleno, 💤 Apagado)
router.post('/:id/vibe', protect, async (req, res) => {
  try {
    if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(400).json({ success: false, message: 'Identificador inválido' });
    const { vibe, comment } = req.body;
    if (!VIBES.includes(vibe) || (comment != null && typeof comment !== 'string')) return res.status(400).json({ success: false, message: 'Reporte inválido' });
    const event = await Event.findById(req.params.id);
    if (!event || event.status !== 'published') return res.status(404).json({ success: false, message: 'Evento no disponible' });
    if (!ageIsAllowed(event, req.user)) return res.status(403).json({ success: false, message: 'No cumples los requisitos del evento' });
    const participant = await hasEventParticipation(event, req.user._id);
    const organizer = String(event.createdBy) === String(req.user._id);
    if (!participant && !organizer) return res.status(403).json({ success: false, message: 'Confirma tu asistencia antes de reportar el ambiente' });
    const now = new Date();
    if (!isLive(event, now.getTime())) return res.status(409).json({ success: false, message: 'Solo se admiten reportes mientras el evento está en curso y tiene hora de cierre confirmada' });
    const userId = req.user._id;
    // Atomic replacement: repeated taps update one ballot, including concurrent requests.
    const updated = await Event.findOneAndUpdate({ _id: event._id, status: 'published', date: { $lte: now }, endDate: { $gt: now } }, [{ $set: {
      'vibeRadar.recentReports': { $slice: [{ $concatArrays: [
        [{ user: userId, vibe, comment: { $literal: (comment || '').trim().slice(0, 140) }, reportedAt: now }],
        { $filter: { input: { $ifNull: ['$vibeRadar.recentReports', []] }, as: 'report', cond: { $ne: ['$$report.user', userId] } } }
      ] }, 30] }
    } }], { new: true });
    if (!updated) return res.status(409).json({ success: false, message: 'El evento ya no está en curso' });
    const summary = summarizeVibe(updated);
    // No global broadcast of activity in private or age-restricted events.
    res.set('Cache-Control', 'private, no-store').json({ success: true, data: summary });
  } catch (error) {
    logger.error('Vibe report error:', error);
    res.status(500).json({ success: false, message: 'No se pudo registrar el reporte' });
  }
});

router.get('/:id/vibe', optionalAuth, async (req, res) => {
  try {
    if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(400).json({ success: false, message: 'Identificador inválido' });
    const event = await Event.findById(req.params.id);
    if (!event || event.status !== 'published' || !ageIsAllowed(event, req.user) ||
      (event.isPrivate && String(event.createdBy) !== String(req.user?._id) && !await hasEventParticipation(event, req.user?._id))) {
      return res.status(404).json({ success: false, message: 'Evento no disponible' });
    }
    res.set('Cache-Control', 'private, no-store').json({ success: true, data: summarizeVibe(event) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'No se pudo consultar el ambiente' });
  }
});

// ─── Coro Seguro (Carpool & Retorno Acompañado) ──────────────────────────────

// @route   POST /api/events/:id/safety/carpool
// @desc    Unirse al grupo de retorno seguro / carpool de una zona
router.post('/:id/safety/carpool', protect, async (req, res) => {
  try {
    const { zone, contactPhone, role } = req.body;
    if (!zone || !String(zone).trim()) {
      return res.status(400).json({ success: false, message: 'Especifica la zona de retorno (ej. Distrito Nacional, SDE, Santiago)' });
    }

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Evento no encontrado' });

    if (!event.safetyCoro) {
      event.safetyCoro = { enabled: true, carpoolZones: [], registeredCarpoolers: [] };
    }

    const cleanZone = String(zone).trim().slice(0, 50);
    if (!event.safetyCoro.carpoolZones.includes(cleanZone)) {
      event.safetyCoro.carpoolZones.push(cleanZone);
    }

    const existingIdx = event.safetyCoro.registeredCarpoolers.findIndex(
      r => String(r.user) === String(req.user.id)
    );
    if (existingIdx !== -1) {
      event.safetyCoro.registeredCarpoolers[existingIdx].zone = cleanZone;
      event.safetyCoro.registeredCarpoolers[existingIdx].contactPhone = contactPhone ? String(contactPhone).slice(0, 20) : undefined;
      event.safetyCoro.registeredCarpoolers[existingIdx].role = role === 'driver' ? 'driver' : 'passenger';
    } else {
      event.safetyCoro.registeredCarpoolers.push({
        user: req.user.id,
        zone: cleanZone,
        contactPhone: contactPhone ? String(contactPhone).slice(0, 20) : undefined,
        role: role === 'driver' ? 'driver' : 'passenger'
      });
    }

    await event.save();

    res.json({
      success: true,
      message: 'Te has sumado al Coro Seguro para esta zona',
      data: {
        zone: cleanZone,
        totalInZone: event.safetyCoro.registeredCarpoolers.filter(r => r.zone === cleanZone).length,
        allZones: event.safetyCoro.carpoolZones
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'No se pudo registrar en el Coro Seguro' });
  }
});

// @route   GET /api/events/:id/safety/carpool
// @desc    Obtener zonas y conteo de participantes en Coro Seguro
router.get('/:id/safety/carpool', optionalAuth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .select('safetyCoro')
      .populate('safetyCoro.registeredCarpoolers.user', 'firstName lastName username avatar');
    if (!event) return res.status(404).json({ success: false, message: 'Evento no encontrado' });

    const registered = event.safetyCoro?.registeredCarpoolers || [];
    const byZone = {};
    for (const r of registered) {
      byZone[r.zone] = (byZone[r.zone] || 0) + 1;
    }

    res.json({
      success: true,
      data: {
        zones: event.safetyCoro?.carpoolZones || [],
        countsByZone: byZone,
        totalCarpoolers: registered.length,
        carpoolers: registered.map(r => ({
          user: r.user,
          zone: r.zone,
          role: r.role
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'No se pudo obtener información de Coro Seguro' });
  }
});

// ─── Event Boost / Patrocinio Local (Monetización RD) ────────────────────────

// @route   POST /api/events/:id/boost
// @desc    Activar impulso/patrocinio local para el evento (Bronce RD$500, Plata RD$1000, Oro RD$1500)
router.post('/:id/boost', protect, async (req, res) => {
  try {
    const { tier } = req.body;
    const pricing = { bronce: 500, plata: 1000, oro: 1500 };
    if (!pricing[tier]) {
      return res.status(400).json({ success: false, message: 'Nivel de impulso inválido (bronce, plata, oro)' });
    }

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Evento no encontrado' });
    if (String(event.createdBy) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Solo el creador o un administrador puede impulsar este evento' });
    }

    const days = tier === 'oro' ? 14 : tier === 'plata' ? 7 : 3;
    const now = new Date();
    const expires = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    event.isFeatured = true;
    event.featuredUntil = expires;
    event.featuredRank = tier === 'oro' ? 10 : tier === 'plata' ? 5 : 2;
    event.boost = {
      tier,
      activatedAt: now,
      expiresAt: expires,
      paidAmountDOP: pricing[tier]
    };

    await event.save();

    res.json({
      success: true,
      message: `¡Evento impulsado con éxito al nivel ${tier.toUpperCase()}!`,
      data: {
        eventId: event._id,
        tier,
        expiresAt: expires,
        paidAmountDOP: pricing[tier]
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'No se pudo impulsar el evento' });
  }
});

// @desc    Double-Blind Mutual Match: «Me gustaría volver a coincidir»
// Enforce the parent event's visibility for all social resources below.
router.use('/:id/:feature', optionalAuth, async (req, res, next) => {
  if (!['reconnect', 'memories', 'afters', 'plus-ones', 'songs'].includes(req.params.feature)) return next();
  res.set('Cache-Control', 'private, no-store');
  if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(400).json({ success: false, message: 'Evento inválido' });
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Evento no encontrado' });
    const organizer = req.user && (String(event.createdBy) === req.user.id || req.user.role === 'admin');
    const participant = req.user && await hasEventParticipation(event, req.user._id);
    // A former attendee may remove their own content. The scoped DELETE
    // handler below still checks authorship and never returns album contents.
    const removal = req.params.feature === 'memories' && req.method === 'DELETE';
    req.socialEvent = event;
    req.isEventParticipant = Boolean(participant);
    req.isEventOrganizer = Boolean(organizer);
    if (event.status === 'draft' && !organizer) return res.status(404).json({ success: false, message: 'Evento no encontrado' });
    if (event.isPrivate && !participant && !organizer && !removal) return res.status(403).json({ success: false, message: 'Este evento es privado' });
    const age = req.user?.age;
    const restriction = event.ageRestriction;
    if (!organizer && !removal && restriction && ((restriction.isAdultOnly && !(age >= 18)) ||
      (restriction.minAge > 0 && !(typeof age === 'number' && age >= restriction.minAge)) ||
      (restriction.maxAge > 0 && !(typeof age === 'number' && age <= restriction.maxAge)))) {
      return res.status(403).json({ success: false, message: 'No cumples los requisitos de edad del evento' });
    }
    if (['memories', 'reconnect'].includes(req.params.feature)) {
      if (!req.user) return res.status(401).json({ success: false, message: 'Inicia sesión para acceder' });
      if (!participant && !removal && !(req.params.feature === 'memories' && organizer)) {
        return res.status(403).json({ success: false, message: 'Esta función es para asistentes confirmados' });
      }
    }
    next();
  } catch (error) { next(error); }
});

for (const name of ['memoryId', 'afterId', 'postId', 'songId']) {
  router.param(name, (req, res, next, value) => {
    if (!/^[a-f0-9]{24}$/i.test(value)) return res.status(400).json({ success: false, message: 'Identificador inválido' });
    next();
  });
}

// @route   POST /api/events/:id/reconnect
// @access  Private
router.post('/:id/reconnect', protect, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'targetUserId es requerido' });
    }
    if (String(targetUserId) === String(req.user.id)) {
      return res.status(400).json({ success: false, message: 'No puedes seleccionarte a ti mismo' });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Evento no encontrado' });
    }

    if (!/^[a-f0-9]{24}$/i.test(String(targetUserId))) return res.status(400).json({ success: false, message: 'Usuario inválido' });
    const isCurrentAttendee = req.isEventParticipant;
    const isTargetAttendee = await hasEventParticipation(event, targetUserId);
    if (!isCurrentAttendee || !isTargetAttendee) {
      return res.status(403).json({ success: false, message: 'Ambos usuarios deben ser asistentes registrados de este evento' });
    }

    const EventConnection = require('../models/EventConnection');

    let connection = await EventConnection.findOne({
      event: event._id,
      fromUser: req.user.id,
      toUser: targetUserId
    });

    if (connection && ['blocked', 'dismissed'].includes(connection.status)) {
      return res.status(409).json({ success: false, message: 'Esta conexión no está disponible' });
    }
    if (connection?.isMutual) {
      return res.json({
        success: true,
        isMutual: connection.isMutual,
        message: connection.isMutual
          ? '¡Coincidencia mutua ya confirmada!'
          : 'Ya habías seleccionado a esta persona de forma privada'
      });
    }

    // Persist the selection before reading its reverse. Concurrent requests
    // then converge, and retrying an old pending selection repairs a race.
    if (!connection) {
      const key = { event: event._id, fromUser: req.user.id, toUser: targetUserId };
      try {
        connection = await EventConnection.findOneAndUpdate(key,
          { $setOnInsert: { ...key, isMutual: false, status: 'pending' } }, { upsert: true, new: true });
      } catch (error) {
        if (error.code !== 11000) throw error;
        connection = await EventConnection.findOne(key);
      }
    }

    // Check if the other person already selected the current user (double blind resolution)
    const reverseConnection = await EventConnection.findOne({
      event: event._id,
      fromUser: targetUserId,
      toUser: req.user.id,
      status: { $in: ['pending', 'matched'] }
    });

    const now = new Date();
    let isMutual = false;

    if (reverseConnection) {
      isMutual = true;
      reverseConnection.isMutual = true;
      reverseConnection.status = 'matched';
      reverseConnection.matchedAt = now;
      await reverseConnection.save();

      connection.isMutual = true;
      connection.status = 'matched';
      connection.matchedAt = now;
      await connection.save();

      // Emit real-time notification to both users
      try {
        const { io } = require('../server');
        if (io) {
          io.to(`user_${targetUserId}`).emit('reconnect:mutual_match', {
            eventId: event._id,
            eventTitle: event.title,
            matchedWith: {
              id: req.user.id,
              firstName: req.user.firstName,
              username: req.user.username,
              avatar: req.user.avatar
            }
          });
        }
      } catch (err) {
        logger.warn('Socket notification error for mutual match:', err.message);
      }
    }

    res.json({
      success: true,
      isMutual,
      message: isMutual
        ? '🎉 ¡Coincidencia mutua! A ambos les gustaría volver a coincidir.'
        : '🔒 Selección guardada de forma 100% confidencial. Solo se revelará si la otra persona también te elige.'
    });
  } catch (error) {
    logger.error('Reconnect error:', error);
    res.status(500).json({ success: false, message: 'Error al procesar reconexión' });
  }
});

// @desc    Get candidates for double-blind reconnection
// @route   GET /api/events/:id/reconnect/candidates
// @access  Private
router.get('/:id/reconnect/candidates', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('attendees.user', '_id firstName lastName username avatar');

    if (!event) return res.status(404).json({ success: false, message: 'Evento no encontrado' });

    const EventConnection = require('../models/EventConnection');
    const myConnections = await EventConnection.find({
      event: event._id,
      fromUser: req.user.id
    }).lean();

    const connectionMap = new Map(myConnections.map(c => [String(c.toUser), c]));

    const candidates = (event.attendees || [])
      .filter(a => a.user && ['attending', 'confirmed'].includes(a.status) && String(a.user._id || a.user) !== String(req.user.id))
      .map(a => {
        const u = a.user;
        const conn = connectionMap.get(String(u._id || u));
        return {
          user: {
            _id: u._id,
            firstName: u.firstName,
            username: u.username,
            avatar: u.avatar
          },
          alreadySelected: Boolean(conn),
          isMutual: Boolean(conn?.isMutual)
        };
      });

    res.json({
      success: true,
      data: candidates
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener candidatos' });
  }
});

// @desc    Get confirmed mutual matches for user in this event
// @route   GET /api/events/:id/reconnect/matches
// @access  Private
router.get('/:id/reconnect/matches', protect, async (req, res) => {
  try {
    const EventConnection = require('../models/EventConnection');
    const matches = await EventConnection.find({
      event: req.params.id,
      fromUser: req.user.id,
      isMutual: true
    }).populate('toUser', '_id firstName lastName username avatar bio');

    res.json({
      success: true,
      data: matches.map(m => ({
        matchedAt: m.matchedAt,
        user: m.toUser
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener matches' });
  }
});

// @desc    Get shared memories for confirmed attendees
// @route   GET /api/events/:id/memories
// @access  Private
router.get('/:id/memories', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Evento no encontrado' });

    const isAttendee = req.isEventParticipant;
    const isOrganizer = String(event.createdBy) === String(req.user.id) || req.user.role === 'admin';
    if (!isAttendee && !isOrganizer) {
      return res.status(403).json({ success: false, message: 'El álbum de recuerdos es privado para asistentes confirmados de este evento' });
    }

    const EventMemory = require('../models/EventMemory');
    const memories = await EventMemory.find({ event: event._id, isApproved: true })
      .select('+imageAssetId')
      .populate('user', '_id firstName lastName username avatar')
      .sort({ createdAt: -1 })
      .lean();

    const data = memories.map(m => serializeMemory(m, req.user.id));

    res.json({ success: true, data });
  } catch (error) {
    logger.error('Get memories error:', error);
    res.status(500).json({ success: false, message: 'Error al cargar recuerdos del evento' });
  }
});

// @desc    Post a new photo/memory to the shared attendee album
// @route   POST /api/events/:id/memories
// @access  Private
router.post('/:id/memories', protect, memoryUploadLimit, receiveMemoryImage, async (req, res) => {
  let storedAssetId;
  try {
    const { caption } = req.body;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Selecciona una foto para subirla al álbum privado. No se admiten enlaces públicos.' });
    }
    if (caption != null && (typeof caption !== 'string' || caption.trim().length > 200)) {
      return res.status(400).json({ success: false, message: 'El comentario debe tener hasta 200 caracteres' });
    }

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Evento no encontrado' });

    const isAttendee = req.isEventParticipant;
    const isOrganizer = String(event.createdBy) === String(req.user.id) || req.user.role === 'admin';
    if (!isAttendee && !isOrganizer) {
      return res.status(403).json({ success: false, message: 'Solo los asistentes confirmados pueden subir fotos al álbum privado' });
    }

    const EventMemory = require('../models/EventMemory');
    const memory = new EventMemory({
      event: event._id,
      user: req.user.id,
      caption: (caption || '').trim()
    });
    storedAssetId = await storeMemoryImage(req.file.buffer, event._id, memory._id);
    memory.imageAssetId = storedAssetId;
    await memory.save();

    await memory.populate('user', '_id firstName lastName username avatar');

    res.status(201).json({
      success: true,
      message: '¡Recuerdo compartido en el álbum privado del evento!',
      data: serializeMemory(memory, req.user.id)
    });
  } catch (error) {
    if (storedAssetId) await deleteMemoryImage(storedAssetId).catch(cleanupError => logger.error('Memory upload cleanup failed:', cleanupError));
    logger.error('Create memory error:', error);
    res.status(error.status || 500).json({ success: false, message: error.status === 400 ? error.message : 'Error al subir recuerdo' });
  }
});

// The file itself uses the same event/age/participation policy as the album.
// Tokens are sent in Authorization, never embedded in a shareable image URL.
router.get('/:id/memories/:memoryId/image', protect, async (req, res, next) => {
  try {
    const EventMemory = require('../models/EventMemory');
    const memory = await EventMemory.findOne({ _id: req.params.memoryId, event: req.params.id, isApproved: true }).select('+imageAssetId');
    if (!memory?.imageAssetId) return res.status(404).json({ success: false, message: 'Foto no disponible. Vuelve a subirla al álbum privado.' });
    const file = await findMemoryImage(memory.imageAssetId, req.params.id, memory._id);
    if (!file) return res.status(404).json({ success: false, message: 'Foto no disponible' });
    res.set({ 'Content-Type': 'image/jpeg', 'Content-Length': String(file.length),
      'Content-Disposition': 'inline; filename="recuerdo.jpg"', 'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store, max-age=0', 'Pragma': 'no-cache', 'Expires': '0' });
    const stream = openMemoryImage(memory.imageAssetId);
    stream.on('error', error => {
      if (res.headersSent) res.destroy(error);
      else next(error);
    });
    res.on('close', () => stream.destroy());
    stream.pipe(res);
  } catch (error) { next(error); }
});

// @desc    Delete a memory (owner or organizer/admin)
// @route   DELETE /api/events/:id/memories/:memoryId
// @access  Private
router.delete('/:id/memories/:memoryId', protect, async (req, res) => {
  try {
    const EventMemory = require('../models/EventMemory');
    const memory = await EventMemory.findOne({ _id: req.params.memoryId, event: req.params.id }).select('+imageAssetId');
    if (!memory) return res.status(404).json({ success: false, message: 'Recuerdo no encontrado' });

    const event = await Event.findById(req.params.id);
    const isOwner = String(memory.user) === String(req.user.id);
    const isOrganizer = event && (String(event.createdBy) === String(req.user.id) || req.user.role === 'admin');

    if (!isOwner && !isOrganizer) {
      return res.status(403).json({ success: false, message: 'No estás autorizado para eliminar este recuerdo' });
    }

    await EventMemory.deleteOne({ _id: req.params.memoryId, event: req.params.id });
    if (memory.imageAssetId) await deleteMemoryImage(memory.imageAssetId).catch(error => logger.error('Private memory file cleanup failed:', error));
    res.json({ success: true, message: 'Recuerdo eliminado del álbum' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar recuerdo' });
  }
});

// @desc    Toggle like on memory
// @route   POST /api/events/:id/memories/:memoryId/like
// @access  Private
router.post('/:id/memories/:memoryId/like', protect, async (req, res) => {
  try {
    const EventMemory = require('../models/EventMemory');
    const memory = await toggleSocialVote(EventMemory, { _id: req.params.memoryId, event: req.params.id, isApproved: true }, 'likes', req.user._id);
    if (!memory) return res.status(404).json({ success: false, message: 'Recuerdo no encontrado' });

    res.json({
      success: true,
      hasLiked: memory.likes.some(uid => String(uid) === req.user.id),
      likesCount: memory.likes.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al procesar like' });
  }
});

// ==========================================
// INNOVATION: RADAR DE AFTERS («¿Dónde es el After?»)
// ==========================================

// @desc    Get after-party spots for an event
// @route   GET /api/events/:id/afters
// @access  Public (or semi-private)
router.get('/:id/afters', optionalAuth, async (req, res) => {
  try {
    const EventAfter = require('../models/EventAfter');
    const afters = await EventAfter.find({ event: req.params.id })
      .populate('user', '_id firstName lastName username avatar')
      .sort({ 'attendeesGoing.length': -1, createdAt: -1 })
      .lean();

    const currentUserId = req.user?.id || null;
    const data = afters.map(a => ({
      ...a,
      goingCount: (a.attendeesGoing || []).length,
      isGoing: currentUserId ? (a.attendeesGoing || []).some(uid => String(uid) === String(currentUserId)) : false
    }));

    res.json({ success: true, data });
  } catch (error) {
    logger.error('Get afters error:', error);
    res.status(500).json({ success: false, message: 'Error al cargar opciones de after' });
  }
});

// @desc    Propose an after spot
// @route   POST /api/events/:id/afters
// @access  Private
router.post('/:id/afters', protect, async (req, res) => {
  try {
    const { spotName, spotType, address, googleMapsUrl, vibe, description } = req.body;
    if (!spotName) {
      return res.status(400).json({ success: false, message: 'El nombre del lugar es requerido' });
    }

    const EventAfter = require('../models/EventAfter');
    const after = await EventAfter.create({
      event: req.params.id,
      user: req.user.id,
      spotName: spotName.trim(),
      spotType: spotType || 'food',
      address: address?.trim(),
      googleMapsUrl: googleMapsUrl?.trim(),
      vibe: vibe || 'comida_tardia',
      description: description?.trim(),
      attendeesGoing: [req.user.id]
    });

    const populated = await EventAfter.findById(after._id).populate('user', '_id firstName lastName username avatar');

    if (req.io) {
      req.io.to(`event:${req.params.id}`).emit('after:new', populated);
    }

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    logger.error('Create after error:', error);
    res.status(500).json({ success: false, message: 'Error al proponer after' });
  }
});

// @desc    Toggle attendance to an after spot
// @route   POST /api/events/:id/afters/:afterId/vote
// @access  Private
router.post('/:id/afters/:afterId/vote', protect, async (req, res) => {
  try {
    const EventAfter = require('../models/EventAfter');
    const after = await toggleSocialVote(EventAfter, { _id: req.params.afterId, event: req.params.id }, 'attendeesGoing', req.user._id);
    if (!after) return res.status(404).json({ success: false, message: 'Lugar de after no encontrado' });

    res.json({
      success: true,
      isGoing: after.attendeesGoing.some(uid => String(uid) === req.user.id),
      goingCount: after.attendeesGoing.length
    });
  } catch (error) {
    logger.error('Vote after error:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar voto de after' });
  }
});

// ==========================================
// INNOVATION: BUSCO ACOMPAÑANTE & BOLETA EXTRA (Plus-One Matcher)
// ==========================================

// @desc    Get companion/extra ticket posts for an event
// @route   GET /api/events/:id/plus-ones
// @access  Public
router.get('/:id/plus-ones', optionalAuth, async (req, res) => {
  try {
    const EventPlusOne = require('../models/EventPlusOne');
    const posts = await EventPlusOne.find({ event: req.params.id, status: { $ne: 'closed' } })
      .populate('user', '_id firstName lastName username avatar')
      .populate('interestedUsers.user', '_id firstName lastName username avatar')
      .sort({ createdAt: -1 })
      .lean();

    const currentUserId = req.user?.id || null;
    const data = posts.map(p => ({
      ...p,
      interestedUsers: currentUserId && String(p.user?._id || p.user) === String(currentUserId) ? p.interestedUsers : [],
      interestedCount: (p.interestedUsers || []).length,
      matchedWith: currentUserId && (String(p.user?._id || p.user) === String(currentUserId) || String(p.matchedWith) === String(currentUserId)) ? p.matchedWith : undefined,
      isOwner: currentUserId ? String(p.user?._id || p.user) === String(currentUserId) : false,
      hasExpressedInterest: currentUserId ? (p.interestedUsers || []).some(iu => String(iu.user?._id || iu.user) === String(currentUserId)) : false
    }));

    res.json({ success: true, data });
  } catch (error) {
    logger.error('Get plus-ones error:', error);
    res.status(500).json({ success: false, message: 'Error al consultar publicaciones de acompañantes' });
  }
});

// @desc    Create companion / extra ticket post
// @route   POST /api/events/:id/plus-ones
// @access  Private
router.post('/:id/plus-ones', protect, async (req, res) => {
  try {
    const { type, title, description, ticketPrice, isFree } = req.body;
    if (!title || !type) {
      return res.status(400).json({ success: false, message: 'Tipo y título son requeridos' });
    }

    const EventPlusOne = require('../models/EventPlusOne');
    const post = await EventPlusOne.create({
      event: req.params.id,
      user: req.user.id,
      type,
      title: title.trim(),
      description: description?.trim(),
      ticketPrice: Number(ticketPrice) || 0,
      isFree: Boolean(isFree)
    });

    const populated = await EventPlusOne.findById(post._id).populate('user', '_id firstName lastName username avatar');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    logger.error('Create plus-one error:', error);
    res.status(500).json({ success: false, message: 'Error al publicar oferta de acompañante' });
  }
});

// @desc    Express interest in companion / extra ticket post
// @route   POST /api/events/:id/plus-ones/:postId/interest
// @access  Private
router.post('/:id/plus-ones/:postId/interest', protect, async (req, res) => {
  try {
    const EventPlusOne = require('../models/EventPlusOne');
    const post = await EventPlusOne.findOne({ _id: req.params.postId, event: req.params.id });
    if (!post) return res.status(404).json({ success: false, message: 'Publicación no encontrada' });
    if (post.status !== 'open') return res.status(409).json({ success: false, message: 'Esta publicación ya está cerrada' });
    if (String(post.user) === String(req.user.id)) {
      return res.status(400).json({ success: false, message: 'No puedes postularte a tu propia publicación' });
    }

    const alreadyInterested = (post.interestedUsers || []).some(iu => String(iu.user) === String(req.user.id));
    if (alreadyInterested) {
      return res.status(400).json({ success: false, message: 'Ya has expresado interés en esta publicación' });
    }

    if (req.body.message != null && (typeof req.body.message !== 'string' || req.body.message.trim().length > 250)) {
      return res.status(400).json({ success: false, message: 'El mensaje debe tener hasta 250 caracteres' });
    }
    const updated = await EventPlusOne.findOneAndUpdate({ _id: post._id, event: req.params.id,
      status: 'open', 'interestedUsers.user': { $ne: req.user._id } }, {
      $push: { interestedUsers: { user: req.user._id,
        message: req.body.message?.trim() || '¡Hola! Me gustaría coordinar para este evento.' } }
    }, { new: true, runValidators: true });
    if (!updated) return res.status(409).json({ success: false, message: 'La publicación ya fue actualizada' });

    res.json({ success: true, message: 'Interés enviado al organizador de la publicación' });
  } catch (error) {
    logger.error('Express interest error:', error);
    res.status(500).json({ success: false, message: 'Error al enviar interés' });
  }
});

// @desc    Match/accept a companion
// @route   POST /api/events/:id/plus-ones/:postId/match
// @access  Private
router.post('/:id/plus-ones/:postId/match', protect, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const EventPlusOne = require('../models/EventPlusOne');
    const post = await EventPlusOne.findOne({ _id: req.params.postId, event: req.params.id });
    if (!post) return res.status(404).json({ success: false, message: 'Publicación no encontrada' });
    if (String(post.user) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Solo el creador puede confirmar el acompañante' });
    }

    if (!/^[a-f0-9]{24}$/i.test(String(targetUserId)) ||
      !post.interestedUsers.some(item => String(item.user) === String(targetUserId))) {
      return res.status(400).json({ success: false, message: 'Elige una persona que haya solicitado participar' });
    }
    const accepted = await EventPlusOne.findOneAndUpdate({ _id: post._id, event: req.params.id, status: 'open' },
      { $set: { status: 'matched', matchedWith: targetUserId } }, { new: true });
    if (!accepted) return res.status(409).json({ success: false, message: 'La publicación ya fue actualizada' });
    res.json({ success: true, message: '¡Acompañante confirmado con éxito!', post: accepted });
  } catch (error) {
    logger.error('Match plus-one error:', error);
    res.status(500).json({ success: false, message: 'Error al confirmar acompañante' });
  }
});

// ==========================================
// INNOVATION: HIMNO DEL CORO (Crowd Playlist & Song Voting)
// ==========================================

// @desc    Get nominated songs for event
// @route   GET /api/events/:id/songs
// @access  Public
router.get('/:id/songs', optionalAuth, async (req, res) => {
  try {
    const EventSong = require('../models/EventSong');
    const songs = await EventSong.find({ event: req.params.id })
      .populate('user', '_id firstName lastName username avatar')
      .sort({ votesCount: -1, createdAt: 1 })
      .limit(30)
      .lean();

    const currentUserId = req.user?.id || null;
    const data = songs.map(s => ({
      ...s,
      votes: undefined,
      hasVoted: currentUserId ? (s.votes || []).some(uid => String(uid) === String(currentUserId)) : false
    }));

    res.json({ success: true, data });
  } catch (error) {
    logger.error('Get songs error:', error);
    res.status(500).json({ success: false, message: 'Error al cargar canciones del coro' });
  }
});

// @desc    Nominate a song for the crowd playlist
// @route   POST /api/events/:id/songs
// @access  Private
router.post('/:id/songs', protect, async (req, res) => {
  try {
    const { title, artist, spotifyUrl, youtubeUrl } = req.body;
    if (!title || !artist) {
      return res.status(400).json({ success: false, message: 'Título y artista de la canción son requeridos' });
    }

    const EventSong = require('../models/EventSong');
    const userSongsCount = await EventSong.countDocuments({ event: req.params.id, user: req.user.id });
    if (userSongsCount >= 3) {
      return res.status(400).json({ success: false, message: 'Puedes proponer un máximo de 3 canciones por evento' });
    }

    const song = await EventSong.create({
      event: req.params.id,
      user: req.user.id,
      title: title.trim(),
      artist: artist.trim(),
      spotifyUrl: spotifyUrl?.trim(),
      youtubeUrl: youtubeUrl?.trim(),
      votes: [req.user.id],
      votesCount: 1
    });

    const populated = await EventSong.findById(song._id).populate('user', '_id firstName lastName username avatar');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    logger.error('Nominate song error:', error);
    res.status(500).json({ success: false, message: 'Error al nominar canción' });
  }
});

// @desc    Toggle vote for a nominated song
// @route   POST /api/events/:id/songs/:songId/vote
// @access  Private
router.post('/:id/songs/:songId/vote', protect, async (req, res) => {
  try {
    const EventSong = require('../models/EventSong');
    const song = await toggleSocialVote(EventSong, { _id: req.params.songId, event: req.params.id }, 'votes', req.user._id, 'votesCount');
    if (!song) return res.status(404).json({ success: false, message: 'Canción no encontrada' });

    res.json({
      success: true,
      hasVoted: song.votes.some(uid => String(uid) === req.user.id),
      votesCount: song.votesCount
    });
  } catch (error) {
    logger.error('Vote song error:', error);
    res.status(500).json({ success: false, message: 'Error al votar por canción' });
  }
});

// @desc    Get unified 8-innovations hub data for an event
// @route   GET /api/events/:id/innovations
// @access  Public (with optional authentication)
router.get('/:id/innovations', optionalAuth, async (req, res) => {
  try {
    const EventSong = require('../models/EventSong');
    const EventAfter = require('../models/EventAfter');
    const EventPlusOne = require('../models/EventPlusOne');
    const EventMemory = require('../models/EventMemory');

    const [event, songs, afters, plusOnes, memoriesCount] = await Promise.all([
      Event.findById(req.params.id)
        .select('title date endDate isSoloFriendly soloWelcomeNote soloWelcomeHost attendees vibeRadar safetyCoro')
        .populate('attendees.user', '_id username firstName lastName avatar bio'),
      EventSong.find({ event: req.params.id })
        .populate('user', '_id firstName lastName username avatar')
        .sort({ votesCount: -1, createdAt: 1 })
        .limit(30)
        .lean(),
      EventAfter.find({ event: req.params.id })
        .populate('user', '_id firstName lastName username avatar')
        .sort({ createdAt: -1 })
        .lean(),
      EventPlusOne.find({ event: req.params.id, status: { $ne: 'closed' } })
        .populate('user', '_id firstName lastName username avatar')
        .sort({ createdAt: -1 })
        .lean(),
      EventMemory.countDocuments({ event: req.params.id, isApproved: true })
    ]);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Evento no encontrado' });
    }

    const soloAttendees = (event.attendees || [])
      .filter(a => a.isSolo && a.user)
      .map(a => a.user);

    res.json({
      success: true,
      data: {
        songs,
        afters,
        plusOnes,
        memoriesCount,
        soloTable: {
          isSoloFriendly: event.isSoloFriendly !== false,
          welcomeNote: event.soloWelcomeNote,
          welcomeHost: event.soloWelcomeHost,
          count: soloAttendees.length,
          attendees: soloAttendees
        },
        vibeRadar: event.vibeRadar || { currentVibe: 'none', reportsCount: 0 },
        safetyCoro: event.safetyCoro || { enabled: true }
      }
    });
  } catch (error) {
    logger.error('Get innovations hub error:', error);
    res.status(500).json({ success: false, message: 'Error al cargar innovaciones del evento' });
  }
});


// @route   GET /api/events/:id/promoters
// @desc    Obtener desglose de invitados por promotor / RRPP
router.get('/:id/promoters', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('attendees.user', 'firstName lastName username avatar');
    if (!event) return res.status(404).json({ success: false, message: 'Evento no encontrado' });
    const isCreator = String(event.createdBy) === String(req.user.id);
    if (!isCreator && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Solo el creador o un admin puede ver estadísticas de promotores' });
    }

    const tally = {};
    for (const att of (event.attendees || [])) {
      const code = (att.promoter || 'organico').toLowerCase().trim();
      if (!tally[code]) {
        tally[code] = { promoter: code, totalGuests: 0, checkedInGuests: 0, guests: [] };
      }
      tally[code].totalGuests++;
      if (att.checkedInAt) tally[code].checkedInGuests++;
      if (att.user) {
        tally[code].guests.push({
          _id: att.user._id,
          name: `${att.user.firstName || ''} ${att.user.lastName || ''}`.trim() || att.user.username,
          username: att.user.username,
          avatar: att.user.avatar,
          joinedAt: att.joinedAt,
          checkedIn: Boolean(att.checkedInAt)
        });
      }
    }

    res.json({
      success: true,
      data: Object.values(tally),
      totalPromoters: Object.keys(tally).length
    });
  } catch (err) {
    logger.error('Error fetching event promoters:', err);
    res.status(500).json({ success: false, message: 'Error al consultar promotores' });
  }
});


// ─── 1. RADAR DE COROS & HEATMAP EN VIVO ──────────────────────────────────────
router.get('/radar/live', optionalAuth, discoveryScope, async (req, res) => {
  try {
    const now = new Date();
    const filter = { status: 'published', isPrivate: { $ne: true }, isSecretLocation: { $ne: true },
      date: { $lte: now }, endDate: { $gt: now }, ...buildAgeRestrictionFilter(req.user), ...scopeFilter(req.discoveryScope) };
    if (req.discoveryScope.geo) {
      const { lat, lng, radiusKm } = req.discoveryScope.geo;
      filter.location = { $geoWithin: { $centerSphere: [[lng, lat], radiusKm / 6378.1] } };
    }
    const events = await Event.find(filter)
      .select('title category status date endDate location vibeRadar').sort({ date: -1, _id: 1 }).limit(50).lean();
    const items = events.map(event => ({ _id: event._id, title: event.title, category: event.category,
      date: event.date, endDate: event.endDate, location: event.location, vibeRadar: summarizeVibe(event) }))
      .sort((a, b) => b.vibeRadar.reportsCount - a.vibeRadar.reportsCount);
    res.set('Cache-Control', 'private, no-store').json({ success: true, count: items.length, data: items,
      reportWindowMinutes: 120, limit: 50, note: 'Reportes de asistentes; no representan aforo verificado ni medición de popularidad.' });
  } catch (error) {
    logger.error('Radar live error:', error);
    res.status(500).json({ success: false, message: 'No se pudo consultar el radar' });
  }
});

// ─── 2. OFERTAS & PROMOCIONES FLASH CERCANAS ─────────────────────────────────
router.get('/deals/nearby', optionalAuth, async (req, res) => {
  try {
    const deals = await Event.find({
      status: 'published',
      $or: [
        { isCommercialDeal: true },
        { 'tags': { $in: ['promocion', 'oferta', 'sin-itbis', 'descuento-50', 'compras'] } }
      ]
    })
      .select('title description category date location commercialBrand commercialOffer images price tags')
      .sort({ date: 1 })
      .limit(10);

    res.json({
      success: true,
      count: deals.length,
      data: deals
    });
  } catch (err) {
    logger.error('Deals nearby error:', err);
    res.status(500).json({ success: false, message: 'Error al consultar promociones flash' });
  }
});

// ─── 3. BOT INGESTOR DE FLYERS / INSTAGRAM CON IA ─────────────────────────────
router.post('/ingest/flyer', protect, async (req, res) => {
  try {
    const FlyerIngestionService = require('../services/FlyerIngestionService');
    const flyerInput = req.body.flyerText || req.body.rawText || req.body.text;
    const { imageUrl, organizerName, autoPublish } = req.body;

    if (!flyerInput) {
      return res.status(400).json({ success: false, message: 'Se requiere el texto o pie de foto del flyer' });
    }

    const parsedEventData = FlyerIngestionService.parseFlyerContent(
      flyerInput,
      imageUrl,
      organizerName || req.user.username || 'Promotor Verificado'
    );

    parsedEventData.createdBy = req.user.id;
    if (autoPublish && req.user.role === 'admin') {
      parsedEventData.status = 'published';
      parsedEventData.isOfficial = true;
    }

    const createdEvent = await Event.create(parsedEventData);

    res.status(201).json({
      success: true,
      message: 'Flyer procesado e importado exitosamente',
      data: createdEvent
    });
  } catch (err) {
    logger.error('Flyer ingestion error:', err);
    res.status(500).json({ success: false, message: err.message || 'Error al procesar flyer' });
  }
});

// ─── EXTRACTOR IA DE AFICHE / FLYER PARA AUTO-RELLENO ──────────────────────────
router.post('/ai-extract-flyer', protect, upload.any(), async (req, res) => {
  try {
    const { extractEventFromText } = require('../services/flyerAiExtractor');
    let text = req.body.text || req.body.flyerText || req.body.rawText || '';
    let coverUrl = req.body.imageUrl || '';

    const uploadedFile = (req.files && req.files[0]) || req.file;
    if (uploadedFile) {
      coverUrl = `/uploads/events/${uploadedFile.filename}`;
      if (!text && uploadedFile.originalname) {
        text = uploadedFile.originalname.replace(/[-_.]/g, ' ');
      }
    }

    if (!text && !coverUrl) {
      return res.status(400).json({
        success: false,
        message: 'Por favor proporciona una imagen del afiche o el texto descriptivo del evento'
      });
    }

    const extracted = extractEventFromText(text, { coverUrl });

    res.status(200).json({
      success: true,
      message: 'Afiche procesado con IA exitosamente',
      data: extracted
    });
  } catch (err) {
    logger.error('Error in ai-extract-flyer:', err);
    res.status(500).json({ success: false, message: 'Error procesando el afiche' });
  }
});

// ─── 4. MATCH DE CORO (PARA TURISTAS Y PANAS SOLOS) ───────────────────────────
router.post('/:id/coro-match', protect, async (req, res) => {
  try {
    const { role = 'seeking_coro', note = '', whatsappContact = '' } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Evento no encontrado' });

    if (!event.coroMatchQueue) event.coroMatchQueue = [];

    // Remove existing if already registered
    event.coroMatchQueue = event.coroMatchQueue.filter(
      item => item.user?.toString() !== req.user.id.toString()
    );

    event.coroMatchQueue.push({
      user: req.user.id,
      role,
      note: note.slice(0, 200),
      whatsappContact: whatsappContact.slice(0, 40),
      joinedAt: new Date()
    });

    await event.save();

    res.json({
      success: true,
      message: role === 'seeking_coro' ? '¡Te sumaste a la búsqueda de Coro!' : '¡Abriste tu Coro para recibir panas!',
      data: event.coroMatchQueue
    });
  } catch (err) {
    logger.error('Coro match join error:', err);
    res.status(500).json({ success: false, message: 'Error al unirse al Match de Coro' });
  }
});

router.get('/:id/coro-match', optionalAuth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .select('title coroMatchQueue')
      .populate('coroMatchQueue.user', 'firstName lastName username avatar bio');
    if (!event) return res.status(404).json({ success: false, message: 'Evento no encontrado' });

    res.json({
      success: true,
      count: (event.coroMatchQueue || []).length,
      data: event.coroMatchQueue || []
    });
  } catch (err) {
    logger.error('Coro match fetch error:', err);
    res.status(500).json({ success: false, message: 'Error al consultar Coro Match' });
  }
});

// ─── 5. PAQUETES MONETIZACIÓN & DESTACAR EVENTO ──────────────────────────────
router.post('/:id/boost-request', protect, async (req, res) => {
  try {
    const { tier = 'bronce', bankSelected = 'Banco Popular Dominicano', paymentProofRef = '' } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Evento no encontrado' });

    if (event.createdBy.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Solo el organizador puede solicitar boost' });
    }

    const priceMap = { bronce: 1500, plata: 2500, oro: 4500 };
    const paidAmount = priceMap[tier] || 1500;

    event.promotionRequest = {
      requested: true,
      requestedAt: new Date(),
      note: `Solicitud de Boost ${tier.toUpperCase()} - Pago en ${bankSelected} (Ref: ${paymentProofRef})`
    };

    // Auto-approve if admin
    if (req.user.role === 'admin') {
      event.isFeatured = true;
      event.featuredRank = tier === 'oro' ? 10 : tier === 'plata' ? 5 : 2;
      event.boost = {
        tier,
        activatedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        paidAmountDOP: paidAmount
      };
    }

    await event.save();

    res.json({
      success: true,
      message: req.user.role === 'admin' ? 'Boost activado inmediatamente' : 'Solicitud de Boost enviada para aprobación del Admin',
      data: {
        tier,
        paidAmountDOP: paidAmount,
        promotionRequest: event.promotionRequest
      }
    });
  } catch (err) {
    logger.error('Boost request error:', err);
    res.status(500).json({ success: false, message: 'Error al procesar solicitud de Boost' });
  }
});

router.post('/:id/approve-boost', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Solo administradores pueden aprobar Boosts' });
    }
    const { tier = 'oro', days = 7 } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Evento no encontrado' });

    event.isFeatured = true;
    event.featuredRank = tier === 'oro' ? 10 : tier === 'plata' ? 5 : 2;
    event.boost = {
      tier,
      activatedAt: new Date(),
      expiresAt: new Date(Date.now() + days * 24 * 3600 * 1000),
      paidAmountDOP: tier === 'oro' ? 4500 : tier === 'plata' ? 2500 : 1500
    };
    event.promotionRequest = { requested: false };
    await event.save();

    res.json({
      success: true,
      message: `Boost ${tier.toUpperCase()} aprobado por ${days} días`,
      data: event.boost
    });
  } catch (err) {
    logger.error('Approve boost error:', err);
    res.status(500).json({ success: false, message: 'Error al aprobar boost' });
  }
});



// @route   POST /api/events/pipeline/harvest
// @desc    Triggers the planetary multi-tier event ingestion cycle
// @access  Private (Admin) / Optional in dev
router.post('/pipeline/harvest', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { dryRun = false } = req.body || {};
    if (typeof dryRun !== 'boolean') return res.status(400).json({ success: false, message: 'dryRun debe ser booleano' });
    const { runGlobalIngestionCycle } = require('../services/eventIngestion/GlobalPipelineOrchestrator');
    const result = await runGlobalIngestionCycle({ dryRun: Boolean(dryRun) });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;





