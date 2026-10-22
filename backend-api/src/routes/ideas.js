const express = require('express');
const mongoose = require('mongoose');
const ActivityIdea = require('../models/ActivityIdea');
const Event = require('../models/Event');
const Notification = require('../models/Notification');
const IdeaCondition = require('../models/IdeaCondition');
const { parseCondition, summarizeConditions } = require('../utils/ideaConditions');
const { protect, optionalAuth } = require('../middleware/auth');
const { CATEGORIES, CATEGORY_SLUGS } = require('../utils/categories');
const logger = require('../utils/logger');
const { ideaDeadline, ideaExpired: expired, activeDeadline, expiredDeadline } = require('../utils/ideaLifetime');

const router = express.Router();
router.use((req, res, next) => { res.set('Cache-Control', 'private, no-store'); res.vary('Authorization'); next(); });

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isId = (v) => mongoose.Types.ObjectId.isValid(v);
const normCategory = (c) => (CATEGORY_SLUGS.includes(c) ? c : 'other');
const versionOf = idea => idea.__v === undefined ? { $exists: false } : idea.__v;
const uniqueSupporters = supporters => {
  const seen = new Set();
  return (Array.isArray(supporters) ? supporters : []).filter(supporter => {
    const id = String(supporter && supporter.user || '');
    if (!isId(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

function serialize(idea, userId) {
  const o = idea.toObject ? idea.toObject() : idea;
  const supporters = uniqueSupporters(o.supporters);
  const supported = userId ? supporters.some(s => String(s.user) === String(userId)) : false;
  if (Array.isArray(o.supporters)) o.supportersCount = supporters.length;
  delete o.supporters;
  delete o.proposals;
  const quorumTarget = o.quorumTarget || 25;
  const quorumProgress = Math.min(Math.round(((o.supportersCount || 0) / quorumTarget) * 100), 100);
  return {
    ...o,
    expiresAt: ideaDeadline(o),
    isExpired: o.status === 'open' && expired(o),
    lifecycleStatus: o.status === 'open' && expired(o) ? 'expired' : o.status,
    supported,
    quorumTarget,
    quorumProgress,
    quorumReached: (o.supportersCount || 0) >= quorumTarget
  };
}

// @route   GET /api/ideas/categories  -> taxonomía para formularios
router.get('/categories', (req, res) => {
  res.json({ success: true, data: CATEGORIES });
});

// @route   GET /api/ideas/demand
// @desc    Demanda sin cubrir por zona/categoría (para creadores)
router.get('/demand', optionalAuth, async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radiusKm = Math.min(Math.max(parseFloat(req.query.radiusKm) || 30, 1), 200);
    const hasGeo = Number.isFinite(lat) && Number.isFinite(lng);

    const ideaFilter = { status: 'open', ...activeDeadline(new Date()) };
    if (hasGeo) {
      ideaFilter['zone.location'] = {
        $geoWithin: { $centerSphere: [[lng, lat], radiusKm / 6378.1] }
      };
    }
    const ideas = await ActivityIdea.find(ideaFilter).select('title category emoji supporters').limit(500).lean();
    for (const idea of ideas) idea.supportersCount = uniqueSupporters(idea.supporters).length;

    const eventFilter = { status: 'published', isPrivate: { $ne: true }, date: { $gte: new Date() } };
    if (hasGeo) {
      eventFilter.location = { $geoWithin: { $centerSphere: [[lng, lat], radiusKm / 6378.1] } };
    }
    const supplyAgg = await Event.aggregate([
      { $match: eventFilter },
      { $group: { _id: '$category', events: { $sum: 1 } } }
    ]);
    const supply = Object.fromEntries(supplyAgg.map(s => [s._id, s.events]));

    const byCategory = {};
    for (const idea of ideas) {
      const c = idea.category || 'other';
      byCategory[c] = byCategory[c] || { category: c, demand: 0, ideas: 0, top: [] };
      byCategory[c].demand += idea.supportersCount || 0;
      byCategory[c].ideas += 1;
      byCategory[c].top.push({ _id: idea._id, title: idea.title, supporters: idea.supportersCount || 0, emoji: idea.emoji });
    }
    const labelOf = Object.fromEntries(CATEGORIES.map(c => [c.slug, c]));
    const opportunities = Object.values(byCategory).map(entry => {
      const events = supply[entry.category] || 0;
      entry.top.sort((a, b) => b.supporters - a.supporters);
      return {
        category: entry.category,
        label: labelOf[entry.category]?.label || entry.category,
        emoji: labelOf[entry.category]?.emoji || '✨',
        demand: entry.demand,
        ideas: entry.ideas,
        upcomingEvents: events,
        // Más alto = mucha gente interesada y poca oferta
        gapScore: Math.round(((entry.demand + entry.ideas) / (events + 1)) * 10) / 10,
        topIdeas: entry.top.slice(0, 3)
      };
    }).sort((a, b) => b.gapScore - a.gapScore);

    res.json({
      success: true,
      data: {
        zone: hasGeo ? { lat, lng, radiusKm } : null,
        totalIdeas: ideas.length,
        totalSupporters: ideas.reduce((s, i) => s + (i.supportersCount || 0), 0),
        opportunities: opportunities.slice(0, 12)
      }
    });
  } catch (error) {
    logger.error('Ideas demand error:', error);
    res.status(500).json({ success: false, message: 'No se pudo calcular la demanda' });
  }
});

// @route   GET /api/ideas
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 50);
    const filter = { status: req.query.status === 'launched' ? 'launched' : 'open' };
    if (filter.status === 'open') filter.$and = [req.query.status === 'expired' ? expiredDeadline(new Date()) : activeDeadline(new Date())];
    if (req.query.category) filter.category = String(req.query.category);
    if (req.query.q) {
      const rx = new RegExp(escapeRegex(String(req.query.q).slice(0, 60)), 'i');
      filter.$or = [{ title: rx }, { description: rx }, { activityType: rx }];
    }
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const radiusKm = Math.min(Math.max(parseFloat(req.query.radiusKm) || 50, 1), 500);
      filter['zone.location'] = { $geoWithin: { $centerSphere: [[lng, lat], radiusKm / 6378.1] } };
    }
    const sort = req.query.sort === 'new' ? { createdAt: -1 } : { supportersCount: -1, createdAt: -1 };

    const [items, total] = await Promise.all([
      ActivityIdea.find(filter).sort(sort).skip((page - 1) * limit).limit(limit)
        .populate('createdBy', 'firstName lastName username avatar'),
      ActivityIdea.countDocuments(filter)
    ]);
    res.json({
      success: true,
      data: items.map(i => serialize(i, req.user && req.user.id)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    logger.error('Ideas list error:', error);
    res.status(500).json({ success: false, message: 'No se pudieron cargar las ideas' });
  }
});

// @route   POST /api/ideas
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, category, activityType, emoji, zone } = req.body || {};
    if (!title || String(title).trim().length < 4) {
      return res.status(400).json({ success: false, message: 'Describe la actividad (mínimo 4 caracteres)' });
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await ActivityIdea.countDocuments({ createdBy: req.user.id, createdAt: { $gte: since } });
    if (recent >= 5) {
      return res.status(429).json({ success: false, message: 'Has propuesto muchas ideas hoy. Intenta mañana.' });
    }

    const zoneDoc = {
      name: String(zone?.name || 'República Dominicana').slice(0, 80),
      city: zone?.city ? String(zone.city).slice(0, 60) : undefined
    };
    const c = zone?.coordinates;
    if (Array.isArray(c) && c.length === 2 && c.every(Number.isFinite) && Math.abs(c[0]) <= 180 && Math.abs(c[1]) <= 90) {
      zoneDoc.location = { type: 'Point', coordinates: c };
    }

    const quorumTarget = Math.min(Math.max(parseInt(req.body?.quorumTarget, 10) || 25, 5), 500);
    const daysToTarget = req.body?.daysToTarget === undefined ? 14 : Number(req.body.daysToTarget);
    if (!Number.isInteger(daysToTarget) || daysToTarget < 3 || daysToTarget > 60) return res.status(400).json({ success: false, message: 'La vigencia debe ser un número entero de 3 a 60 días.' });
    const quorumDeadline = new Date(Date.now() + daysToTarget * 86400000);

    const idea = await ActivityIdea.create({
      title: String(title).trim(),
      description: description ? String(description).slice(0, 600) : '',
      category: normCategory(category),
      activityType: activityType ? String(activityType).slice(0, 60) : undefined,
      emoji: emoji ? String(emoji).slice(0, 8) : undefined,
      zone: zoneDoc,
      createdBy: req.user.id,
      supporters: [{ user: req.user.id }],
      supportersCount: 1,
      quorumTarget,
      quorumDeadline,
      quorumReached: false
    });
    res.status(201).json({ success: true, data: serialize(idea, req.user.id) });
  } catch (error) {
    logger.error('Create idea error:', error);
    res.status(400).json({ success: false, message: error.message || 'No se pudo crear la idea' });
  }
});

// @route   POST /api/ideas/:id/support
// An explicit desired state is retry-safe; an omitted state retains legacy toggle behavior.
router.post('/:id/support', protect, async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ success: false, message: 'ID inválido' });
    const explicit = Object.prototype.hasOwnProperty.call(req.body || {}, 'supported');
    if (explicit && typeof req.body.supported !== 'boolean') {
      return res.status(400).json({ success: false, message: 'supported debe ser booleano' });
    }
    const userId = req.user.id;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const now = new Date();
      const idea = await ActivityIdea.findById(req.params.id).lean();
      if (!idea) return res.status(404).json({ success: false, message: 'Idea no encontrada' });
      if (idea.status !== 'open' || idea.linkedEvent || expired(idea, now)) {
        return res.status(409).json({ success: false, message: 'Esta idea ya no recibe apoyos' });
      }
      const supporters = uniqueSupporters(idea.supporters);
      const already = supporters.some(s => String(s.user) === String(userId));
      const desired = explicit ? req.body.supported : !already;
      const next = desired
        ? already ? supporters : [...supporters, { user: userId, at: now }]
        : supporters.filter(s => String(s.user) !== String(userId));
      const target = idea.quorumTarget || 25;
      const reached = next.length >= target;
      const justReachedQuorum = supporters.length < target && reached;
      if (explicit && desired === already && supporters.length === idea.supporters.length &&
          idea.supportersCount === next.length && idea.quorumReached === reached && (reached || !idea.quorumReachedAt)) {
        return res.json({ success: true, data: { supported: desired, supportersCount: next.length,
          quorumTarget: target, quorumReached: reached, justReachedQuorum: false } });
      }
      const update = { $set: { supporters: next, supportersCount: next.length, quorumReached: reached }, $inc: { __v: 1 } };
      if (reached) update.$set.quorumReachedAt = supporters.length >= target && idea.quorumReachedAt ? idea.quorumReachedAt : now;
      else update.$unset = { quorumReachedAt: 1 };
      const saved = await ActivityIdea.findOneAndUpdate({ _id: idea._id, __v: versionOf(idea), status: 'open', linkedEvent: null,
        ...activeDeadline(now) }, update, { new: true, runValidators: true });
      if (!saved) continue;
      // Broadcast only a committed transition. Losing CAS attempts never announce success.
      if (justReachedQuorum) {
        try {
          const { io } = require('../server');
          if (io) io.emit('idea:quorum_reached', { ideaId: saved._id, title: saved.title,
            quorumTarget: target, supportersCount: saved.supportersCount });
        } catch (error) { logger.warn('Idea quorum broadcast unavailable'); }
      }
      return res.json({ success: true, data: { supported: desired, supportersCount: saved.supportersCount,
        quorumTarget: target, quorumReached: saved.quorumReached, justReachedQuorum } });
    }
    return res.status(409).json({ success: false, message: 'La idea cambió mientras actualizabas tu interés. Intenta de nuevo.' });
  } catch (error) {
    logger.error('Support idea error:', error);
    return res.status(500).json({ success: false, message: 'No se pudo actualizar tu interés' });
  }
});

// @route   POST /api/ideas/:id/launch
// Only the idea author (or platform admin) may connect their published event.
async function launchIdea(req, res) {
  let claimed;
  let committed = false;
  const rollback = async () => {
    if (!claimed) return;
    await ActivityIdea.updateOne({ _id: claimed._id, __v: claimed.__v, status: 'launched', linkedEvent: claimed.linkedEvent },
      { $set: { status: 'open' }, $unset: { linkedEvent: 1, launchedBy: 1, launchedAt: 1, acceptedProposalId: 1 }, $inc: { __v: 1 } });
  };
  try {
    const { eventId } = req.body || {};
    if (!isId(req.params.id) || !isId(eventId)) {
      return res.status(400).json({ success: false, message: 'Idea o evento inválido' });
    }
    const [idea, event] = await Promise.all([ActivityIdea.findById(req.params.id).lean(), Event.findById(eventId).lean()]);
    if (!idea) return res.status(404).json({ success: false, message: 'Idea no encontrada' });
    if (!event) return res.status(404).json({ success: false, message: 'Evento no encontrado' });
    const admin = req.user.role === 'admin';
    const proposal = req.acceptIdeaProposal && (idea.proposals || []).find(p => String(p._id) === req.acceptIdeaProposal && String(p.event) === String(event._id));
    if (req.acceptIdeaProposal && !proposal) return res.status(404).json({ success: false, message: 'Propuesta no encontrada' });
    const eventOwner = proposal ? String(proposal.organizer) : String(req.user.id);
    if ((!admin && String(idea.createdBy) !== String(req.user.id)) || (!admin && String(event.createdBy) !== eventOwner)) {
      return res.status(403).json({ success: false, message: 'Solo el autor de la idea puede vincular un evento propio' });
    }
    const now = new Date();
    if (idea.status !== 'open' || idea.linkedEvent || expired(idea, now)) {
      return res.status(409).json({ success: false, message: 'Esta idea ya no está abierta para lanzamiento' });
    }
    const eventEnd = new Date(event.endDate || event.date).getTime();
    if (event.status !== 'published' || event.isPrivate === true || !Number.isFinite(eventEnd) || eventEnd <= now.getTime() ||
        (event.sourceIdeaId && String(event.sourceIdeaId) !== String(idea._id))) {
      return res.status(409).json({ success: false, message: 'El evento debe estar publicado, ser público y seguir vigente sin otra idea vinculada' });
    }
    claimed = await ActivityIdea.findOneAndUpdate({ _id: idea._id, __v: versionOf(idea), status: 'open', linkedEvent: null,
      ...activeDeadline(now) }, { $set: { status: 'launched', linkedEvent: event._id, launchedBy: req.user.id, launchedAt: now,
      ...(proposal ? { acceptedProposalId: proposal._id } : {}) },
    $inc: { __v: 1 } }, { new: true, runValidators: true });
    if (!claimed) return res.status(409).json({ success: false, message: 'La idea cambió. Actualiza antes de lanzarla.' });
    // Conditional second write prevents replacing another idea or linking a newly hidden event.
    // These writes are compensated, not a transaction; a process crash between them needs reconciliation.
    const linked = await Event.findOneAndUpdate({ _id: event._id, status: 'published', isPrivate: { $ne: true },
      ...(admin ? {} : { createdBy: eventOwner }),
      $and: [
        { $or: [{ endDate: { $gt: new Date() } }, { endDate: null, date: { $gt: new Date() } }] },
        { $or: [{ sourceIdeaId: null }, { sourceIdeaId: idea._id }] }
      ] }, { $set: { sourceIdeaId: idea._id }, $inc: { __v: 1 } }, { new: true });
    if (!linked) {
      await rollback();
      claimed = null;
      return res.status(409).json({ success: false, message: 'El evento cambió y no pudo vincularse. Actualiza e intenta de nuevo.' });
    }
    committed = true;
    const recipients = uniqueSupporters(claimed.supporters).map(s => s.user)
      .filter(user => String(user) !== String(req.user.id)).slice(0, 500);
    let notified = 0;
    // Only the CAS winner reaches fanout. Delivery remains best effort, not a durable queue.
    for (const recipient of recipients) {
      try {
        await Notification.createNotification({ recipient, type: 'event_update', title: 'Tu idea ya tiene evento',
          message: `"${idea.title}" ya tiene evento: ${linked.title}`, data: { eventId: linked._id, ideaId: idea._id },
          actionUrl: `/events/${linked._id}`, priority: 'high' });
        notified += 1;
      } catch (error) { logger.warn('Idea launch notification unavailable'); }
    }
    return res.json({ success: true, data: { ideaId: idea._id, eventId: linked._id, notified } });
  } catch (error) {
    if (claimed && !committed) {
      try { await rollback(); } catch (rollbackError) { logger.error('Idea launch rollback requires reconciliation:', rollbackError); }
    }
    logger.error('Launch idea error:', error);
    return res.status(500).json({ success: false, message: 'No se pudo lanzar la idea' });
  }
}
router.post('/:id/launch', protect, launchIdea);

router.get('/:id/conditions', optionalAuth, async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ success: false, message: 'Idea inválida' });
    if (!await ActivityIdea.exists({ _id: req.params.id })) return res.status(404).json({ success: false, message: 'Idea no encontrada' });
    const [rows, own] = await Promise.all([
      IdeaCondition.find({ idea: req.params.id }).select('maxBudget currency dayOfWeek zone -_id').limit(5000).lean(),
      req.user ? IdeaCondition.findOne({ idea: req.params.id, user: req.user.id }).select('maxBudget currency dayOfWeek zone -_id').lean() : null
    ]);
    return res.json({ success: true, data: { summary: { ...summarizeConditions(rows), limitedTo: 5000 }, own } });
  } catch (error) { return res.status(500).json({ success: false, message: 'No se pudieron cargar las condiciones' }); }
});
router.put('/:id/conditions', protect, async (req, res) => {
  let values;
  try { values = parseCondition(req.body); } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
  try {
    if (!isId(req.params.id)) return res.status(400).json({ success: false, message: 'Idea inválida' });
    const idea = await ActivityIdea.findById(req.params.id).lean();
    if (!idea) return res.status(404).json({ success: false, message: 'Idea no encontrada' });
    const filter = { idea: idea._id, user: req.user.id };
    if (!values) { await IdeaCondition.deleteOne(filter); return res.json({ success: true }); }
    if (idea.status !== 'open' || expired(idea, new Date())) return res.status(409).json({ success: false, message: 'Esta idea ya no recibe condiciones' });
    try { await IdeaCondition.findOneAndReplace(filter, { ...filter, ...values }, { upsert: true, runValidators: true }); }
    catch (error) {
      if (error.code !== 11000) throw error;
      await IdeaCondition.findOneAndReplace(filter, { ...filter, ...values }, { runValidators: true });
    }
    return res.json({ success: true });
  } catch (error) { return res.status(500).json({ success: false, message: 'No se pudieron guardar las condiciones' }); }
});

const eligibleProposalEvent = event => event && event.status === 'published' && event.isPrivate !== true && new Date(event.endDate || event.date).getTime() > Date.now();
router.get('/:id/proposals', optionalAuth, async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ success: false, message: 'Idea inválida' });
    const idea = await ActivityIdea.findById(req.params.id).lean();
    if (!idea) return res.status(404).json({ success: false, message: 'Idea no encontrada' });
    const events = await Event.find({ _id: { $in: (idea.proposals || []).map(p => p.event) }, status: 'published', isPrivate: { $ne: true } })
      .select('title date endDate price location.city isSecretLocation createdBy status isPrivate').lean();
    const data = (idea.proposals || []).flatMap(proposal => {
      const event = events.find(e => String(e._id) === String(proposal.event) && String(e.createdBy) === String(proposal.organizer));
      if (!eligibleProposalEvent(event)) return [];
      return [{ _id: proposal._id, note: proposal.note, accepted: String(idea.acceptedProposalId) === String(proposal._id),
        event: { _id: event._id, title: event.title, date: event.date, price: event.price,
          city: event.isSecretLocation ? undefined : event.location?.city } }];
    });
    return res.json({ success: true, data: { proposals: data, canAccept: Boolean(req.user && (req.user.role === 'admin' || String(idea.createdBy) === String(req.user.id)) && idea.status === 'open' && !expired(idea, new Date())) } });
  } catch (error) { return res.status(500).json({ success: false, message: 'No se pudieron cargar las propuestas' }); }
});
router.post('/:id/proposals', protect, async (req, res) => {
  try {
    const { eventId, note = '' } = req.body || {};
    if (!isId(req.params.id) || !isId(eventId) || typeof note !== 'string' || note.length > 300) return res.status(400).json({ success: false, message: 'Propuesta inválida' });
    const event = await Event.findById(eventId).lean();
    if (!event || String(event.createdBy) !== String(req.user.id)) return res.status(403).json({ success: false, message: 'Elige un evento propio' });
    if (!eligibleProposalEvent(event) || event.sourceIdeaId) return res.status(409).json({ success: false, message: 'El evento debe ser público, estar publicado y disponible' });
    const now = new Date();
    const updated = await ActivityIdea.findOneAndUpdate({ _id: req.params.id, status: 'open', ...activeDeadline(now),
      'proposals.event': { $ne: event._id }, $expr: { $lt: [{ $size: { $ifNull: ['$proposals', []] } }, 20] } },
    { $push: { proposals: { event: event._id, organizer: req.user.id, note: note.trim(), at: now } }, $inc: { __v: 1 } }, { new: true, runValidators: true });
    if (!updated) return res.status(409).json({ success: false, message: 'La idea cerró, ya enviaste este evento o alcanzó 20 propuestas' });
    return res.status(201).json({ success: true });
  } catch (error) { return res.status(500).json({ success: false, message: 'No se pudo proponer el evento' }); }
});
router.post('/:id/proposals/:proposalId/accept', protect, async (req, res) => {
  if (!isId(req.params.id) || !isId(req.params.proposalId)) return res.status(400).json({ success: false, message: 'Propuesta inválida' });
  try {
    const idea = await ActivityIdea.findById(req.params.id).lean();
    if (!idea) return res.status(404).json({ success: false, message: 'Idea no encontrada' });
    if (req.user.role !== 'admin' && String(idea.createdBy) !== String(req.user.id)) return res.status(403).json({ success: false, message: 'Solo el autor puede aceptar la propuesta' });
    const proposal = (idea.proposals || []).find(p => String(p._id) === req.params.proposalId);
    if (!proposal) return res.status(404).json({ success: false, message: 'Propuesta no encontrada' });
    req.acceptIdeaProposal = req.params.proposalId;
    req.body = { eventId: String(proposal.event) };
    return launchIdea(req, res);
  } catch (error) { return res.status(500).json({ success: false, message: 'No se pudo aceptar la propuesta' }); }
});
// @route   DELETE /api/ideas/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ success: false, message: 'ID inválido' });
    const idea = await ActivityIdea.findById(req.params.id);
    if (!idea) return res.status(404).json({ success: false, message: 'Idea no encontrada' });
    if (String(idea.createdBy) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }
    await idea.deleteOne();
    await IdeaCondition.deleteMany({ idea: idea._id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'No se pudo eliminar la idea' });
  }
});

module.exports = router;
