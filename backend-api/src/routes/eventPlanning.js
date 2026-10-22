const express = require('express');
const Event = require('../models/Event');
const { optionalAuth, protect } = require('../middleware/auth');
const { ageIsAllowed, buildAgeRestrictionFilter } = require('../utils/eventVisibility');
const { hasEventParticipation } = require('../services/eventSocialAccess');
const { normalizePlanning, budgetSummary } = require('../utils/eventPlanning');
const router = express.Router();
router.use((req, res, next) => { res.set('Cache-Control', 'private, no-store'); res.vary('Authorization'); next(); });
const identity = value => String(value?._id || value || '');
const manager = (event, user) => Boolean(user && (user.role === 'admin' || identity(event.createdBy) === identity(user.id || user._id)));
router.param('id', async (req, res, next, id) => {
  try {
    if (!/^[a-f0-9]{24}$/i.test(id)) return res.status(400).json({ success: false, message: 'Identificador inválido' });
    req.planningEvent = await Event.findById(id);
    if (!req.planningEvent) return res.status(404).json({ success: false, message: 'Evento no disponible' });
    next();
  } catch (error) { next(error); }
});
async function access(req, res, next) {
  try {
    const event = req.planningEvent;
    if (manager(event, req.user)) return next();
    if (!['published', 'cancelled', 'completed', 'expired'].includes(event.status) || !ageIsAllowed(event, req.user) || (event.isPrivate && !await hasEventParticipation(event, req.user?._id || req.user?.id))) return res.status(404).json({ success: false, message: 'Evento no disponible' });
    next();
  } catch (error) { next(error); }
}
const hasAlternatives = event => event.status === 'cancelled' || (event.status === 'published' && Boolean(event.previousDate && event.rescheduledAt));
const dto = (event, user) => ({ eventId: event.id, canManage: manager(event, user), practical: event.isSecretLocation && !manager(event, user) ? { bring: event.practicalInfo?.bring, accessibility: event.practicalInfo?.accessibility } : event.practicalInfo || {}, budget: budgetSummary(event), alternativesAvailable: hasAlternatives(event) });
router.get('/:id', optionalAuth, access, (req, res) => res.json({ success: true, data: dto(req.planningEvent, req.user) }));
router.put('/:id', protect, async (req, res, next) => {
  try {
    const event = req.planningEvent;
    if (!manager(event, req.user)) return res.status(403).json({ success: false, message: 'Sólo el anfitrión puede editar esta información' });
    let patch;
    try { patch = normalizePlanning(req.body, event.price?.currency || 'USD'); } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
    // Compare the currency too: a concurrent ticket-price change cannot mix currencies.
    const updated = await Event.findOneAndUpdate({ _id: event._id, 'price.currency': event.price.currency }, { $set: patch }, { new: true, runValidators: true });
    if (!updated) return res.status(409).json({ success: false, message: 'El evento cambió; vuelve a cargar antes de guardar' });
    res.json({ success: true, data: dto(updated, req.user) });
  } catch (error) { next(error); }
});
router.get('/:id/alternatives', optionalAuth, access, async (req, res, next) => {
  try {
    const source = req.planningEvent;
    if (!hasAlternatives(source)) return res.json({ success: true, data: [], reason: 'Las alternativas se ofrecen después de una cancelación o cambio de fecha registrado' });
    const city = source.location?.city, country = source.location?.countryCode;
    if (!city || !country) return res.json({ success: true, data: [], reason: 'Falta una ciudad y país verificables para comparar' });
    const base = Math.max(Date.now(), new Date(source.status === 'cancelled' ? source.date : source.previousDate).getTime());
    const candidates = await Event.find({ $and: [buildAgeRestrictionFilter(req.user)], _id: { $ne: source._id }, status: 'published', isPrivate: { $ne: true }, isSecretLocation: { $ne: true }, 'location.city': city, 'location.countryCode': country, date: { $gte: new Date(Math.max(Date.now(), base - 86400000)), $lte: new Date(base + 3 * 86400000) }, 'price.currency': source.price?.currency || 'USD' }).select('title date endDate timeZone location.city location.countryCode price outingBudget').sort({ date: 1, _id: 1 }).limit(60).lean();
    const ceiling = budgetSummary(source).knownMinimum;
    const data = candidates.filter(event => ceiling === null || (budgetSummary(event).knownMinimum !== null && budgetSummary(event).knownMinimum <= ceiling)).slice(0, 6).map(event => ({ id: event._id, title: event.title, date: event.date, timeZone: event.timeZone || 'UTC', city: event.location.city, countryCode: event.location.countryCode, budget: budgetSummary(event) }));
    res.json({ success: true, data, reason: 'Opciones cercanas en fecha y en la misma ciudad; compara los gastos pendientes antes de elegir' });
  } catch (error) { next(error); }
});

// ─── Trip & Outing Budget Calculator ──────────────────────────────────────────

// @route   POST /api/event-planning/:id/trip-budget
// @desc    Calculate complete travel, lodging, dining, and serrucho split for an event
router.post('/:id/trip-budget', optionalAuth, access, async (req, res) => {
  try {
    const event = req.planningEvent;
    const { calculateTripBudget } = require('../services/tripBudgetCalculator');

    const nights = req.body.nights !== undefined
      ? Number(req.body.nights)
      : req.body.nightsCount !== undefined
        ? Number(req.body.nightsCount)
        : (req.body.originCity && req.body.originCity.toLowerCase() !== (event.location?.city || '').toLowerCase() ? 1 : 0);

    const ticketPrice = req.body.customTicketPrice !== undefined
      ? Number(req.body.customTicketPrice)
      : (event.price?.amount || 0);

    const result = calculateTripBudget({
      ticketPrice,
      currency: event.price?.currency || 'USD',
      destinationCity: event.location?.city || req.body.destinationCity || 'Santo Domingo',
      originCity: req.body.originCity || (req.user?.location?.city || ''),
      travelersCount: Number(req.body.travelersCount) || 1,
      nights,
      lodgingTier: req.body.lodgingTier || 'hotel',
      diningTier: req.body.diningTier || 'midRange',
      transportMode: req.body.transportMode || 'local',
      customTransportAmount: Number(req.body.customTransportAmount) || 0,
      eventDate: event.date
    });

    res.json({ success: true, ...result, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error calculating trip budget: ' + error.message });
  }
});

// @route   GET /api/event-planning/benchmarks/cities
// @desc    Get destination benchmarks for lodging, dining, and transit
router.get('/benchmarks/cities', (req, res) => {
  const { CITY_BENCHMARKS } = require('../services/tripBudgetCalculator');
  res.json({ success: true, cities: Object.values(CITY_BENCHMARKS) });
});

module.exports = router;
