const express = require('express');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const User = require('../models/User');
const { protect, optionalAuth, restrictTo } = require('../middleware/auth');
const { getPublicConfig } = require('../config/features');
const { buildCategoryFilterQuery } = require('../utils/categories');
const logger = require('../utils/logger');
const { buildAgeRestrictionFilter } = require('../utils/eventVisibility');
const { confirmedRegistrations, diversifyRecommendations } = require('../utils/recommendationRanking');

const router = express.Router();

const CARD_FIELDS = 'title description category activityType date endDate timeZone location images price isFeatured featuredRank isUnofficial isSecretLocation isVirtual paymentMode ticketUrl maxAttendees createdBy organizer interestedCount tags imported source publicSource externalUrl';
const isId = (v) => mongoose.Types.ObjectId.isValid(v);

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

function geoFilter(lat, lng, radiusKm) {
  return { $geoWithin: { $centerSphere: [[lng, lat], radiusKm / 6378.1] } };
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

/** Cartas públicas: oculta dirección exacta de eventos con ubicación secreta. */
function toCard(ev, extra = {}) {
  const o = ev.toObject ? ev.toObject() : ev;
  if (o.isSecretLocation && o.location) {
    o.location = {
      ...o.location,
      address: 'Ubicación secreta · se revela al confirmar',
      venue: undefined,
      coordinates: (o.location.coordinates || []).map(n => Math.round(n * 100) / 100)
    };
  }
  o.attendeesCount = o.attendeesCount ?? 0;
  o.isOrganizerVerified = !o.imported && Boolean(o.createdBy?.isOrganizerVerified || o.createdBy?.verified);
  return { ...o, ...extra };
}

const upcoming = (user) => ({
  status: 'published',
  isPrivate: { $ne: true },
  ...buildAgeRestrictionFilter(user),
  $or: [
    { endDate: { $gte: new Date() } },
    { endDate: null, date: { $gte: new Date() } },
    { endDate: { $exists: false }, date: { $gte: new Date() } }
  ]
});

/** Calcula las IDs de eventos en tendencia (con puntaje), opcionalmente cerca de un punto. */
async function trendingIds({ scope = {}, categoryFilter, user, limit = 10, windowDays = 45 } = {}) {
  const geo = scope.geo;
  const now = new Date();
  const match = {
    status: 'published',
    isPrivate: { $ne: true },
    ...buildAgeRestrictionFilter(user),
    ...scopeFilter(scope),
    date: { $gte: now, $lte: new Date(now.getTime() + windowDays * 86400000) }
  };
  if (geo) match.location = geoFilter(geo.lat, geo.lng, geo.radiusKm);
  if (categoryFilter !== null && categoryFilter !== undefined) match.category = categoryFilter;

  const rows = await Event.aggregate([
    { $match: match },
    {
      $addFields: {
        viewsN: { $size: { $ifNull: ['$views', []] } },
        likesN: { $size: { $ifNull: ['$likes', []] } },
        sharesN: { $size: { $ifNull: ['$shares', []] } },
        attendeesN: { $size: { $filter: { input: { $ifNull: ['$attendees', []] }, as: 'attendee', cond: { $in: ['$$attendee.status', ['attending', 'confirmed']] } } } },
        daysAway: { $divide: [{ $subtract: ['$date', now] }, 86400000] },
        ageDays: { $divide: [{ $subtract: [now, '$createdAt'] }, 86400000] }
      }
    },
    { $match: { $expr: { $gt: [{ $add: ['$viewsN', '$likesN', '$sharesN', '$attendeesN', { $ifNull: ['$interestedCount', 0] }] }, 0] } } },
    {
      $addFields: {
        score: {
          $add: [
            '$viewsN', { $multiply: ['$likesN', 2] }, { $multiply: ['$sharesN', 3] },
            { $multiply: ['$attendeesN', 4] }, { $multiply: [{ $ifNull: ['$interestedCount', 0] }, 2] },
            { $cond: [{ $lte: ['$ageDays', 7] }, 5, 0] },
            // pequeño impulso a lo que ocurre pronto
            { $divide: [10, { $add: [1, { $divide: ['$daysAway', 7] }] }] }
          ]
        }
      }
    },
    { $sort: { score: -1, date: 1 } },
    { $limit: limit },
    { $project: { _id: 1, score: 1 } }
  ]);
  return rows;
}

async function hydrate(rows, extraByIdFn) {
  if (!rows.length) return [];
  const ids = rows.map(r => r._id);
  const docs = await Event.find({ _id: { $in: ids } }).select(CARD_FIELDS)
    .populate('createdBy', 'firstName lastName username avatar isOrganizerVerified verified');
  const byId = new Map(docs.map(d => [String(d._id), d]));
  return rows.map(r => byId.get(String(r._id))).filter(Boolean)
    .map(d => toCard(d, extraByIdFn ? extraByIdFn(d) : {}));
}

// @route   GET /api/events/featured
// @desc    Banner principal: destacados activos; se completa con tendencias
router.get('/featured', optionalAuth, discoveryScope, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 6, 1), 12);
    const now = new Date();
    const categoryFilter = buildCategoryFilterQuery({
      category: req.query.category,
      categories: req.query.categories,
      excludeCategories: req.query.excludeCategories,
      hidePolitical: req.query.hidePolitical,
      hideReligious: req.query.hideReligious,
      userPreferences: req.user?.settings?.preferences
    });

    const match = {
      ...upcoming(req.user),
      ...scopeFilter(req.discoveryScope),
      isFeatured: true,
      $and: [...buildAgeRestrictionFilter(req.user).$and,
        { $or: [{ featuredUntil: null }, { featuredUntil: { $exists: false } }, { featuredUntil: { $gte: now } }] }]
    };
    const geo = req.discoveryScope.geo;
    if (geo) match.location = geoFilter(geo.lat, geo.lng, geo.radiusKm);
    if (categoryFilter !== null) match.category = categoryFilter;

    const featured = await Event.find(match).sort({ featuredRank: -1, date: 1 }).limit(limit).select(CARD_FIELDS)
      .populate('createdBy', 'firstName lastName username avatar isOrganizerVerified verified');

    const items = featured.map(e => toCard(e, { badge: 'featured', badgeLabel: 'Destacado' }));

    if (items.length < limit) {
      const taken = new Set(items.map(i => String(i._id)));
      const rows = (await trendingIds({ scope: req.discoveryScope, categoryFilter, user: req.user, limit: limit * 2 })).filter(r => !taken.has(String(r._id))).slice(0, limit - items.length);
      const filler = await hydrate(rows, () => ({ badge: 'trending', badgeLabel: 'En tendencia' }));
      items.push(...filler);
    }

    if (items.length < limit) {
      const next = { ...upcoming(req.user), ...scopeFilter(req.discoveryScope), _id: { $nin: items.map(item => item._id) } };
      if (geo) next.location = geoFilter(geo.lat, geo.lng, geo.radiusKm);
      if (categoryFilter !== null) next.category = categoryFilter;
      const nearest = await Event.find(next).sort({ date: 1, _id: 1 }).limit(limit - items.length).select(CARD_FIELDS)
        .populate('createdBy', 'firstName lastName username avatar');
      items.push(...nearest.map(event => toCard(event, { badge: 'upcoming', badgeLabel: 'Próximamente' })));
    }

    res.set('Cache-Control', req.user ? 'private, no-cache' : 'public, max-age=60');
    res.json({ success: true, data: items });
  } catch (error) {
    logger.error('Featured events error:', error);
    res.status(500).json({ success: false, message: 'No se pudieron cargar los destacados' });
  }
});

// @route   GET /api/events/trending
router.get('/trending', optionalAuth, discoveryScope, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 30);
    const categoryFilter = buildCategoryFilterQuery({
      category: req.query.category,
      categories: req.query.categories,
      excludeCategories: req.query.excludeCategories,
      hidePolitical: req.query.hidePolitical,
      hideReligious: req.query.hideReligious,
      userPreferences: req.user?.settings?.preferences
    });
    // Only events with real interaction count as trending; an empty list is an honest answer.
    const rows = await trendingIds({ scope: req.discoveryScope, categoryFilter, user: req.user, limit });
    const scoreById = new Map(rows.map(r => [String(r._id), Math.round(r.score * 10) / 10]));
    const items = await hydrate(rows, d => ({ badge: 'trending', badgeLabel: 'En tendencia', trendingScore: scoreById.get(String(d._id)) }));
    res.set('Cache-Control', req.user ? 'private, no-cache' : 'public, max-age=60');
    res.json({ success: true, data: items });
  } catch (error) {
    logger.error('Trending events error:', error);
    res.status(500).json({ success: false, message: 'No se pudieron cargar las tendencias' });
  }
});

// @route   GET /api/events/for-you
// @desc    Eventos y actividades según tus gustos, tu historial y tu cercanía
router.get('/for-you', protect, discoveryScope, async (req, res) => {
  try {
    const { normalizeCategory } = require('../services/eventAggregator');
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 30);
    const user = await User.findById(req.user.id).select('interests location eventsAttended favorites settings birthDate');
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const geo = req.discoveryScope.geo;

    const weights = {};
    const bump = (cat, w) => { weights[cat] = (weights[cat] || 0) + w; };
    const interestTerms = (user.interests || []).map(i => String(i).toLowerCase().trim()).filter(Boolean);
    interestTerms.forEach(t => bump(normalizeCategory(t), 3));

    const historyIds = [...new Set([...(user.eventsAttended || []), ...(user.favorites || [])].map(String))].slice(-40);
    if (historyIds.length) {
      const past = await Event.find({ _id: { $in: historyIds } }).select('category');
      past.forEach(p => bump(normalizeCategory(p.category), 2));
    }

    const categoryFilter = buildCategoryFilterQuery({
      categories: req.query.categories,
      excludeCategories: req.query.excludeCategories,
      hidePolitical: req.query.hidePolitical,
      hideReligious: req.query.hideReligious,
      userPreferences: user.settings?.preferences
    });

    const filter = { ...upcoming(user), ...scopeFilter(req.discoveryScope), 'attendees.user': { $ne: user._id } };
    if (categoryFilter !== null) filter.category = categoryFilter;
    if (geo) filter.location = geoFilter(geo.lat, geo.lng, geo.radiusKm);
    const candidates = await Event.find(filter).sort({ date: 1 }).limit(300)
      .select(CARD_FIELDS + ' views likes attendees')
      .populate('createdBy', 'firstName lastName username avatar');

    const scored = candidates.map(ev => {
      const reasons = [];
      let score = 0;
      const cat = normalizeCategory(ev.category);
      if (weights[cat]) { score += weights[cat] * 10; reasons.push('Coincide con tus gustos'); }
      const haystack = `${ev.title} ${(ev.tags || []).join(' ')} ${ev.activityType || ''}`.toLowerCase();
      const hit = interestTerms.find(t => t.length > 2 && haystack.includes(t));
      if (hit) { score += 15; reasons.push(`Te interesa "${hit}"`); }
      if (geo && ev.location?.coordinates?.length === 2) {
        const d = haversineKm(geo.lat, geo.lng, ev.location.coordinates[1], ev.location.coordinates[0]);
        score += Math.max(0, 10 * (1 - d / geo.radiusKm));
        if (d <= 10) reasons.push(`A ${Math.max(1, Math.round(d))} km del punto elegido`);
      }
      if (ev.isUnofficial) { score += 2; reasons.push('Plan extra-oficial'); }
      if ((ev.price?.amount || 0) === 0) score += 1;
      score += Math.min(((ev.likes || []).length + confirmedRegistrations(ev.attendees)) / 10, 5);
      return { ev, score, reasons };
    });
    const selection = diversifyRecommendations(scored, limit);

    const personalized = selection.some(s => s.reasons.length > 0);
    const data = selection.map(s => {
      const card = toCard(s.ev, { matchReasons: s.reasons, matchScore: Math.round(s.score) });
      delete card.views; delete card.likes; delete card.attendees;
      return card;
    });
    res.json({ success: true, data, meta: { personalized, usedLocation: Boolean(geo), interests: interestTerms } });
  } catch (error) {
    logger.error('For-you error:', error);
    res.status(500).json({ success: false, message: 'No se pudo armar tu selección' });
  }
});

// @route   POST /api/events/:id/promotion-request
// @desc    El organizador pide aparecer destacado (el pago se coordina fuera de la app)
router.post('/:id/promotion-request', protect, async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ success: false, message: 'Identificador de evento inválido' });
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Evento no encontrado' });
    if (String(event.createdBy) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Solo el organizador puede pedir destacar su evento' });
    }
    const now = new Date();
    if (event.status !== 'published' || event.isPrivate || new Date(event.endDate || event.date) <= now) return res.status(400).json({ success: false, message: 'La promoción requiere un evento público publicado y vigente' });
    if (req.body?.note !== undefined && (typeof req.body.note !== 'string' || req.body.note.length > 300)) return res.status(400).json({ success: false, message: 'La nota debe ser un texto de hasta 300 caracteres' });
    const registered = event.promotionRequest?.requested || await Event.findOneAndUpdate({ _id: event._id, createdBy: req.user.id,
      status: 'published', isPrivate: { $ne: true }, 'promotionRequest.requested': { $ne: true },
      $or: [{ endDate: { $gt: now } }, { endDate: null, date: { $gt: now } }] },
    { $set: { promotionRequest: { requested: true, requestedAt: now, note: (req.body?.note || '').trim() } } }, { new: true });
    if (!registered) {
      const current = await Event.findById(event._id).select('promotionRequest');
      if (!current?.promotionRequest?.requested) return res.status(409).json({ success: false, message: 'El evento cambió. Actualiza la página antes de solicitar promoción.' });
    }
    res.json({ success: true, message: 'Solicitud registrada para revisión. No activa una promoción ni realiza un cobro.', data: getPublicConfig().promotion });
  } catch (error) {
    logger.error('Promotion request error:', error);
    res.status(500).json({ success: false, message: 'No se pudo enviar la solicitud' });
  }
});

// @route   POST /api/events/:id/feature   (admin)
router.post('/:id/feature', protect, restrictTo('admin'), async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return next();
    const days = Math.min(Math.max(parseInt(req.body?.days, 10) || 7, 1), 90);
    const rank = Math.min(Math.max(parseInt(req.body?.rank, 10) || 1, 0), 100);
    const event = await Event.findByIdAndUpdate(req.params.id, {
      isFeatured: true,
      featuredRank: rank,
      featuredUntil: new Date(Date.now() + days * 86400000),
      'promotionRequest.requested': false
    }, { new: true });
    if (!event) return res.status(404).json({ success: false, message: 'Evento no encontrado' });
    res.json({ success: true, data: { _id: event._id, featuredUntil: event.featuredUntil, featuredRank: event.featuredRank } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'No se pudo destacar el evento' });
  }
});

// @route   DELETE /api/events/:id/feature   (admin)
router.delete('/:id/feature', protect, restrictTo('admin'), async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return next();
    await Event.findByIdAndUpdate(req.params.id, { isFeatured: false, featuredUntil: null });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'No se pudo quitar el destacado' });
  }
});

// @route   POST /api/events/admin/ingest   (admin) -> ejecuta la ingesta ahora
router.post('/admin/ingest', protect, restrictTo('admin'), async (req, res) => {
  try {
    const result = await require('../services/eventIngestion/GlobalPipelineOrchestrator').runGlobalIngestionCycle();
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Manual ingest error:', error);
    res.status(500).json({ success: false, message: 'La ingesta falló' });
  }
});

module.exports = router;
