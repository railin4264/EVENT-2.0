const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const GroupPlan = require('../models/GroupPlan');
const Event = require('../models/Event');
const SpontaneousCoro = require('../models/SpontaneousCoro');
const { protect, optionalAuth } = require('../middleware/auth');

const router = express.Router();
const eventFields = 'title date endDate location.address price isSecretLocation isPrivate status ageRestriction';
const isPublicOption = event => event && event.status === 'published' && !event.isPrivate &&
  !event.ageRestriction?.isAdultOnly && !(event.ageRestriction?.minAge > 0) &&
  !(event.ageRestriction?.maxAge > 0) && new Date(event.date) > new Date();

router.use((req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });
router.use(rateLimit({ windowMs: 60000, max: 120, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Espera un momento antes de volver a intentarlo.' } }));

function identity(req, res) {
  if (req.user) return crypto.createHash('sha256').update(`user:${req.user.id}`).digest('hex');
  let guest;
  try {
    const payload = jwt.verify(req.cookies?.['eventnow-plan-voter'] || '', process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (payload.type === 'plan-guest' && typeof payload.guest === 'string') guest = payload.guest;
  } catch (_) { /* Missing/expired guest cookie starts a new browser identity. */ }
  if (!guest) {
    guest = crypto.randomUUID();
    res.cookie('eventnow-plan-voter', jwt.sign({ guest, type: 'plan-guest' }, process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '30d' }), {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
      maxAge: 30 * 86400000, path: '/api'
    });
  }
  return crypto.createHash('sha256').update(`guest:${guest}`).digest('hex');
}

function view(plan, voter, userId) {
  const ballots = Array.from(plan.ballots?.values() || []);
  const options = plan.options.map(option => {
    const event = option.eventId;
    const available = Boolean(isPublicOption(event));
    return { id: String(option._id), votes: ballots.filter(id => id === String(option._id)).length, available,
      event: available ? { id: String(event._id), title: event.title, date: event.date, endDate: event.endDate,
        location: event.isSecretLocation ? 'Ubicación por confirmar' : event.location?.address || 'En línea',
        price: event.price } : null };
  });
  return { title: plan.title, shareToken: plan.shareToken, options, totalVotes: ballots.length,
    status: plan.status === 'open' && plan.expiresAt <= new Date() ? 'expired' : plan.status,
    expiresAt: plan.expiresAt, selectedOptionId: plan.selectedOptionId,
    myVote: voter ? plan.ballots?.get(voter) || null : null,
    isOwner: Boolean(userId && String(plan.createdBy) === String(userId)) };
}
const load = token => GroupPlan.findOne({ shareToken: token }).select('+ballots').populate('options.eventId', eventFields);
const tokenPattern = /^[a-f0-9]{48}$/;

router.get('/mine', protect, async (req, res, next) => {
  try {
    const plans = await GroupPlan.find({ createdBy: req.user.id }).sort({ createdAt: -1 }).limit(30)
      .select('+ballots').populate('options.eventId', eventFields);
    res.json({ success: true, data: plans.map(plan => view(plan, null, req.user.id)) });
  } catch (error) { next(error); }
});

router.post('/', protect, async (req, res, next) => {
  try {
    const { title, eventIds, hours = 72 } = req.body;
    if (typeof title !== 'string' || title.trim().length < 4 || title.trim().length > 80 ||
        !Array.isArray(eventIds) || eventIds.length < 2 || eventIds.length > 5 ||
        eventIds.some(id => typeof id !== 'string' || !/^[a-f0-9]{24}$/i.test(id)) ||
        new Set(eventIds.map(id => id.toLowerCase())).size !== eventIds.length ||
        !Number.isInteger(hours) || hours < 1 || hours > 168) {
      return res.status(400).json({ success: false, message: 'Añade un título y entre dos y cinco eventos distintos. El plazo debe ser de 1 a 168 horas.' });
    }
    const recent = await GroupPlan.countDocuments({ createdBy: req.user.id, createdAt: { $gte: new Date(Date.now() - 86400000) } });
    if (recent >= 20) return res.status(429).json({ success: false, message: 'Ya creaste 20 votaciones hoy. Puedes seguir compartiendo las que tienes.' });
    const events = await Event.find({ _id: { $in: eventIds } }).select(eventFields);
    if (events.length !== eventIds.length || !events.every(isPublicOption)) {
      return res.status(400).json({ success: false, message: 'Elige eventos públicos futuros y sin restricción de edad.' });
    }
    const plan = await GroupPlan.create({ title: title.trim(), createdBy: req.user.id,
      options: eventIds.map(eventId => ({ eventId })),
      expiresAt: new Date(Math.min(Date.now() + hours * 3600000, ...events.map(event => new Date(event.date).getTime()))) });
    res.status(201).json({ success: true, data: view(await load(plan.shareToken), null, req.user.id) });
  } catch (error) { next(error); }
});

// ─── Coro Espontáneo ("¿Quién se anima hoy?") ────────────────────────────────

// @route   GET /api/plans/spontaneous
// @desc    Obtener coros espontáneos activos para hoy
router.get('/spontaneous', optionalAuth, async (req, res) => {
  try {
    const { city, mood } = req.query;
    const filter = {
      status: { $in: ['active', 'full'] },
      expiresAt: { $gt: new Date() }
    };
    if (city) filter.city = new RegExp(city.trim(), 'i');
    if (mood && mood !== 'all') filter.mood = mood;

    const coros = await SpontaneousCoro.find(filter)
      .sort({ createdAt: -1 })
      .populate('creator', 'firstName lastName username avatar')
      .populate('members.user', 'firstName lastName username avatar')
      .populate('recommendedEvent', 'title date location.address images price');

    const formatted = coros.map(c => {
      const obj = c.toObject();
      const isMember = req.user ? (c.members || []).some(m => String(m.user?._id || m.user) === String(req.user.id) && m.status === 'confirmed') : false;
      const isCreator = req.user ? String(c.creator?._id || c.creator) === String(req.user.id) : false;
      return { ...obj, isMember, isCreator };
    });

    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: 'No se pudieron cargar los coros espontáneos' });
  }
});

// @route   POST /api/plans/spontaneous
// @desc    Crear un faro de coro espontáneo para hoy
router.post('/spontaneous', protect, async (req, res) => {
  try {
    const { title, mood, city, meetingSpot, timeSlot, maxMembers, recommendedEventId } = req.body;
    if (!title || String(title).trim().length < 4) {
      return res.status(400).json({ success: false, message: 'Indica el plan o título (mínimo 4 caracteres)' });
    }

    const activeCount = await SpontaneousCoro.countDocuments({
      creator: req.user.id,
      status: 'active',
      expiresAt: { $gt: new Date() }
    });
    if (activeCount >= 3) {
      return res.status(429).json({ success: false, message: 'Ya tienes 3 coros activos hoy. Puedes unirte a otros o esperar a que concluyan.' });
    }

    const coro = await SpontaneousCoro.create({
      title: String(title).trim(),
      mood: ['cafe', 'art', 'outdoors', 'music', 'gaming', 'food', 'party', 'relax'].includes(mood) ? mood : 'cafe',
      city: String(city || 'Santo Domingo').trim(),
      meetingSpot: meetingSpot ? String(meetingSpot).slice(0, 120) : 'Punto público céntrico a acordar',
      timeSlot: ['now', 'afternoon', 'evening', 'night'].includes(timeSlot) ? timeSlot : 'now',
      creator: req.user.id,
      maxMembers: Number.isInteger(maxMembers) && maxMembers >= 2 && maxMembers <= 8 ? maxMembers : 5,
      recommendedEvent: recommendedEventId && /^[a-f0-9]{24}$/i.test(recommendedEventId) ? recommendedEventId : undefined,
      members: [{ user: req.user.id, status: 'confirmed', joinedAt: new Date() }]
    });

    const populated = await SpontaneousCoro.findById(coro._id)
      .populate('creator', 'firstName lastName username avatar')
      .populate('members.user', 'firstName lastName username avatar');

    res.status(201).json({ success: true, data: { ...populated.toObject(), isMember: true, isCreator: true } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'No se pudo crear el coro espontáneo' });
  }
});

// @route   POST /api/plans/spontaneous/:id/join
// @desc    Unirse a un micro-coro espontáneo
router.post('/spontaneous/:id/join', protect, async (req, res) => {
  try {
    const coro = await SpontaneousCoro.findById(req.params.id);
    if (!coro || coro.status === 'cancelled' || coro.expiresAt <= new Date()) {
      return res.status(404).json({ success: false, message: 'Este coro ya no está disponible' });
    }

    const existingIndex = coro.members.findIndex(m => String(m.user) === String(req.user.id));
    if (existingIndex !== -1 && coro.members[existingIndex].status === 'confirmed') {
      return res.status(400).json({ success: false, message: 'Ya estás en este coro' });
    }

    const activeCount = coro.members.filter(m => m.status === 'confirmed').length;
    if (activeCount >= coro.maxMembers) {
      coro.status = 'full';
      await coro.save();
      return res.status(400).json({ success: false, message: 'El coro alcanzó su capacidad máxima de personas' });
    }

    if (existingIndex !== -1) {
      coro.members[existingIndex].status = 'confirmed';
      coro.members[existingIndex].joinedAt = new Date();
    } else {
      coro.members.push({ user: req.user.id, status: 'confirmed' });
    }

    if (coro.members.filter(m => m.status === 'confirmed').length >= coro.maxMembers) {
      coro.status = 'full';
    }

    await coro.save();

    const populated = await SpontaneousCoro.findById(coro._id)
      .populate('creator', 'firstName lastName username avatar')
      .populate('members.user', 'firstName lastName username avatar');

    res.json({ success: true, data: { ...populated.toObject(), isMember: true, isCreator: String(coro.creator) === String(req.user.id) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al unirse al coro' });
  }
});

// @route   POST /api/plans/spontaneous/:id/leave
// @desc    Salirse de un micro-coro
router.post('/spontaneous/:id/leave', protect, async (req, res) => {
  try {
    const coro = await SpontaneousCoro.findById(req.params.id);
    if (!coro) return res.status(404).json({ success: false, message: 'Coro no encontrado' });

    const member = coro.members.find(m => String(m.user) === String(req.user.id) && m.status === 'confirmed');
    if (!member) return res.status(400).json({ success: false, message: 'No perteneces a este coro' });

    member.status = 'left';
    if (coro.status === 'full') coro.status = 'active';
    await coro.save();

    res.json({ success: true, message: 'Has salido del coro exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al salir del coro' });
  }
});

router.param('token', (req, res, next, token) => {
  if (!tokenPattern.test(token)) return res.status(404).json({ success: false, message: 'No encontramos esa votación.' });
  next();
});

router.get('/:token', optionalAuth, async (req, res, next) => {
  try {
    const plan = await load(req.params.token);
    if (!plan) return res.status(404).json({ success: false, message: 'No encontramos esa votación.' });
    res.json({ success: true, data: view(plan, identity(req, res), req.user?.id) });
  } catch (error) { next(error); }
});

router.post('/:token/vote', optionalAuth, async (req, res, next) => {
  try {
    const plan = await load(req.params.token);
    if (!plan) return res.status(404).json({ success: false, message: 'No encontramos esa votación.' });
    const option = plan.options.find(item => String(item._id) === req.body.optionId);
    if (!option || !isPublicOption(option.eventId)) return res.status(400).json({ success: false, message: 'Esa opción ya no está disponible.' });
    const voter = identity(req, res);
    const field = `ballots.${voter}`;
    const result = await GroupPlan.updateOne({ _id: plan._id, status: 'open', expiresAt: { $gt: new Date() },
      $or: [{ [field]: { $exists: true } }, { $expr: { $lt: [{ $size: { $objectToArray: { $ifNull: ['$ballots', {}] } } }, 1000] } }]
    }, { $set: { [field]: req.body.optionId }, $inc: { __v: 1 } });
    if (!result.matchedCount) return res.status(409).json({ success: false, message: 'La votación está cerrada o alcanzó su límite de participantes.' });
    res.json({ success: true, data: view(await load(req.params.token), voter, req.user?.id) });
  } catch (error) { next(error); }
});

router.post('/:token/decide', protect, async (req, res, next) => {
  try {
    const plan = await load(req.params.token);
    if (!plan) return res.status(404).json({ success: false, message: 'No encontramos esa votación.' });
    if (String(plan.createdBy) !== req.user.id) return res.status(403).json({ success: false, message: 'Solo quien creó el grupo puede confirmar el plan.' });
    const summary = view(plan, null, req.user.id);
    const selected = summary.options.find(option => option.id === req.body.optionId);
    const maximum = Math.max(0, ...summary.options.filter(option => option.available).map(option => option.votes));
    if (!selected?.available || !maximum || selected.votes !== maximum) {
      return res.status(400).json({ success: false, message: 'Confirma una opción disponible entre las más votadas. Si hay empate, tú decides.' });
    }
    const result = await GroupPlan.updateOne({ _id: plan._id, status: 'open', __v: plan.__v }, {
      $set: { status: 'decided', selectedOptionId: selected.id, decidedAt: new Date() }, $inc: { __v: 1 }
    });
    if (!result.matchedCount) return res.status(409).json({ success: false, message: 'La votación cambió. Actualiza antes de confirmar.' });
    res.json({ success: true, data: view(await load(req.params.token), null, req.user.id) });
  } catch (error) { next(error); }
});

module.exports = router;
