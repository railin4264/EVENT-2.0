const express = require('express');
const router = express.Router();
const Serrucho = require('../models/Serrucho');
const Event = require('../models/Event');
const { protect, optionalAuth } = require('../middleware/auth');
const { ageIsAllowed } = require('../utils/eventVisibility');
const { hasEventParticipation } = require('../services/eventSocialAccess');
const logger = require('../utils/logger');
const auditService = require('../services/auditService');

const idOf = value => String(value?._id || value || '');
const fail = (statusCode, message) => Object.assign(new Error(message), { statusCode });
const isManager = (pool, user) => Boolean(user && (idOf(pool.creator) === user.id || user.role === 'admin'));
const isParticipant = (pool, user) => Boolean(user && pool.participants.some(participant => idOf(participant.user) === user.id));
const participantName = user => (`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username).slice(0, 100);
const expired = pool => !pool.expiresAt || !Number.isFinite(new Date(pool.expiresAt).getTime()) || new Date(pool.expiresAt).getTime() <= Date.now();
function effectiveStatus(pool) {
  if (pool.status === 'cancelled') return 'cancelled';
  if (Serrucho.collected(pool.participants) >= pool.targetAmount) return 'completed';
  return expired(pool) || pool.status === 'expired' ? 'expired' : 'open';
}
function text(value, label, max, fallback = '') {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || value.trim().length > max) throw fail(400, `${label}: indica texto de hasta ${max} caracteres`);
  return value.trim();
}
function money(value, label, fallback) {
  if (value === undefined) return fallback;
  if (!['string', 'number'].includes(typeof value) || (typeof value === 'string' && !/^\d+(?:\.\d{1,2})?$/.test(value))) {
    throw fail(400, `${label}: indica un monto positivo con hasta dos decimales`);
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0.01 || number > 100000000 || Math.abs(number * 100 - Math.round(number * 100)) > 0.000001) {
    throw fail(400, `${label}: indica un monto positivo de hasta 100000000 con dos decimales`);
  }
  return Math.round(number * 100) / 100;
}
function currencyCode(value) {
  if (typeof value !== 'string' || !/^[a-z]{3}$/i.test(value)) throw fail(400, 'La moneda debe tener un código de tres letras');
  return value.toUpperCase();
}
function instructions(value) {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw fail(400, 'Las instrucciones deben ser un objeto');
  return Object.fromEntries(Object.entries({ bankName: 100, accountNumber: 100, accountHolder: 150, rncOrCedula: 30, notes: 300 })
    .filter(([key]) => value[key] !== undefined).map(([key, max]) => [key, text(value[key], key, max)]));
}
async function visibleEvent(eventId, user) {
  const event = await Event.findById(eventId);
  if (!event || event.status !== 'published') throw fail(404, 'Evento no disponible');
  const privileged = user && (user.role === 'admin' || idOf(event.createdBy) === user.id);
  if (!privileged && !ageIsAllowed(event, user)) throw fail(404, 'Evento no disponible');
  if (event.isPrivate && !privileged && !(user && await hasEventParticipation(event, user._id))) {
    throw fail(404, 'Evento no disponible');
  }
  return event;
}
function projection(pool, user, event) {
  const manage = isManager(pool, user);
  const participant = isParticipant(pool, user);
  const status = effectiveStatus(pool);
  const totalCollected = Serrucho.collected(pool.participants);
  const committedAmount = pool.participants.reduce((sum, item) => sum + (Number.isFinite(item.amount) && item.amount > 0 && item.amount <= 100000000 ? Math.round(item.amount * 100) : 0), 0) / 100;
  const creator = pool.creator?._id ? { _id: idOf(pool.creator), firstName: pool.creator.firstName,
    username: pool.creator.username, avatar: pool.creator.avatar } : { _id: idOf(pool.creator) };
  const result = {
    _id: pool._id, shareCode: pool.shareCode, title: pool.title, creator,
    event: event ? { _id: event._id, title: event.title, date: event.date,
      images: event.images || [], price: event.price, category: event.category, isSecretLocation: Boolean(event.isSecretLocation) } : null,
    targetAmount: pool.targetAmount, perPersonAmount: pool.perPersonAmount, targetParticipants: pool.targetParticipants,
    currency: pool.currency, status, expiresAt: pool.expiresAt, isExpired: expired(pool),
    paymentMode: 'manual_record', paymentNotice: 'Registro manual de aportes externos; EventNow no cobra, custodia ni verifica transferencias bancarias.',
    totalCollected, confirmedAmount: totalCollected, committedAmount,
    progressPercent: Math.min(100, Math.round(totalCollected / pool.targetAmount * 100)),
    participantCount: pool.participants.length, participantsCount: pool.participants.length,
    confirmedParticipantsCount: pool.participants.filter(Serrucho.isConfirmed).length,
    availableSlots: Math.max(0, pool.targetParticipants - pool.participants.length),
    canManage: manage, isParticipant: participant,
    canJoin: Boolean(user && !participant && status === 'open' && pool.participants.length < pool.targetParticipants),
    canSubmitEvidence: Boolean(user && participant && status !== 'cancelled' &&
      !Serrucho.isConfirmed(pool.participants.find(item => idOf(item.user) === user.id))),
    createdAt: pool.createdAt, updatedAt: pool.updatedAt,
    participants: pool.participants.map((item, index) => {
      const own = Boolean(user && idOf(item.user) === user.id);
      const confirmed = Serrucho.isConfirmed(item);
      const summary = { name: manage || participant ? item.name : `Participante ${index + 1}`,
        amount: item.amount, paid: confirmed, paymentStatus: confirmed ? 'confirmed' : item.voucherRef ? 'submitted' : 'pending',
        joinedAt: item.joinedAt, isSelf: own };
      if (manage || own) Object.assign(summary, { _id: item._id, user: item.user, phone: item.phone || '',
        paymentMethod: item.paymentMethod, voucherRef: item.voucherRef || '',
        paidAt: confirmed ? item.confirmedAt : null, confirmedAt: confirmed ? item.confirmedAt : null,
        confirmedBy: confirmed ? item.confirmedBy : null, confirmedAfterExpiry: confirmed && Boolean(item.confirmedAfterExpiry) });
      return summary;
    })
  };
  if (manage || participant) result.paymentInstructions = pool.paymentInstructions;
  return result;
}
async function respond(pool, user, event) {
  await pool.populate('creator', 'firstName username avatar');
  return projection(pool, user, event);
}
function endpoint(handler) {
  return async (req, res) => {
    try { await handler(req, res); }
    catch (error) {
      logger.error('Serrucho manual record error:', error);
      const status = error.statusCode || (error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500);
      res.status(status).json({ success: false, message: status === 500 ? 'No se pudo procesar el registro de aportes' : error.message });
    }
  };
}
async function changePool(code, user, change) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const pool = await Serrucho.findOne({ shareCode: code });
    if (!pool) throw fail(404, 'Serrucho no encontrado');
    const event = await visibleEvent(pool.event, user);
    const outcome = change(pool);
    if (!outcome.changed) return { pool, event, ...outcome };
    const result = await Serrucho.updateOne({ _id: pool._id, __v: pool.__v, ...outcome.guard }, {
      $set: { participants: pool.participants.toObject(), status: effectiveStatus(pool) }, $inc: { __v: 1 }
    }, { runValidators: true });
    if (result.modifiedCount === 1) {
      pool.status = effectiveStatus(pool);
      return { pool, event, ...outcome };
    }
  }
  throw fail(409, 'El registro cambió mientras procesábamos tu solicitud. Inténtalo de nuevo.');
}
router.use((req, res, next) => {
  if (req.body === undefined) req.body = {};
  res.vary('Authorization'); res.set('Cache-Control', 'private, no-store'); next();
});
router.param('shareCode', (req, res, next, code) => {
  if (!/^coro-[a-f0-9]{6,32}$/.test(code)) return res.status(400).json({ success: false, message: 'Enlace de serrucho inválido' });
  next();
});
router.param('participantId', (req, res, next, id) => {
  if (!/^[a-f0-9]{24}$/i.test(id)) return res.status(400).json({ success: false, message: 'Participante inválido' });
  next();
});

router.post('/', protect, endpoint(async (req, res) => {
  if (!/^[a-f0-9]{24}$/i.test(req.body.eventId || '')) throw fail(400, 'Evento inválido');
  const event = await visibleEvent(req.body.eventId, req.user);
  const count = Number(req.body.targetParticipants ?? 4);
  if (!['string', 'number', 'undefined'].includes(typeof req.body.targetParticipants) || !Number.isInteger(count) || count < 2 || count > 50) {
    throw fail(400, 'El grupo debe tener entre 2 y 50 participantes');
  }
  const perPersonAmount = money(req.body.perPersonAmount, 'Aporte por persona');
  if (perPersonAmount === undefined) throw fail(400, 'Indica el aporte por persona');
  const targetAmount = money(req.body.targetAmount, 'Meta', Math.round(perPersonAmount * count * 100) / 100);
  if (targetAmount > 100000000 || targetAmount < perPersonAmount) throw fail(400, 'La meta debe ser al menos el aporte por persona y no superar 100000000');
  const title = text(req.body.title, 'Título', 120, `Serrucho para ${event.title}`.slice(0, 120));
  if (!title) throw fail(400, 'Indica un título');
  let expiresAt = new Date(Date.now() + 7 * 86400000);
  if (req.body.expiresAt !== undefined) {
    if (typeof req.body.expiresAt !== 'string' || !/T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(req.body.expiresAt)) throw fail(400, 'La expiración debe incluir zona horaria');
    expiresAt = new Date(req.body.expiresAt);
    if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date() || expiresAt > new Date(Date.now() + 30 * 86400000)) throw fail(400, 'La expiración debe estar entre ahora y los próximos 30 días');
  }
  const pool = await Serrucho.create({ event: event._id, creator: req.user.id, title, targetAmount, perPersonAmount,
    targetParticipants: count, currency: currencyCode(req.body.currency === undefined ? event.price?.currency ?? 'DOP' : req.body.currency),
    paymentInstructions: instructions(req.body.paymentInstructions), expiresAt,
    participants: [{ user: req.user.id, name: participantName(req.user),
      phone: req.user.phone || '', amount: perPersonAmount, paid: false, paymentStatus: 'pending' }] });
  await auditService.log({ action: 'other', targetType: 'event', targetId: event.id, targetLabel: pool.title,
    details: { operation: 'serrucho_created', serruchoId: pool.id, paymentMode: 'manual_record' }, req });
  res.status(201).json({ success: true, message: 'Grupo creado. Los aportes quedan pendientes hasta su confirmación manual.', data: await respond(pool, req.user, event) });
}));

router.get('/:shareCode', optionalAuth, endpoint(async (req, res) => {
  const pool = await Serrucho.findOne({ shareCode: req.params.shareCode });
  if (!pool) throw fail(404, 'Serrucho no encontrado');
  const event = await visibleEvent(pool.event, req.user);
  res.json({ success: true, data: await respond(pool, req.user, event) });
}));

// A session is the contribution identity. Names, telephone numbers and voucher
// text are never accepted as proof of payment or ownership of another record.
router.post('/:shareCode/join', protect, endpoint(async (req, res) => {
  const result = await changePool(req.params.shareCode, req.user, pool => {
    if (effectiveStatus(pool) === 'cancelled') throw fail(409, 'Este grupo fue cancelado');
    const existing = pool.participants.find(participant => idOf(participant.user) === req.user.id);
    const amount = money(req.body.amount, 'Aporte', existing?.amount ?? pool.perPersonAmount);
    const phone = text(req.body.phone, 'Teléfono', 30, req.user.phone || '');
    const voucherRef = text(req.body.voucherRef, 'Referencia del comprobante', 300);
    const method = req.body.paymentMethod === undefined ? 'transferencia' : req.body.paymentMethod;
    if (!['transferencia', 'efectivo', 'tarjeta'].includes(method)) throw fail(400, 'Método de pago externo inválido');
    if (existing) {
      if (Math.round(existing.amount * 100) !== Math.round(amount * 100)) throw fail(409, 'Ya tienes un aporte registrado con otro monto');
      if (!Serrucho.isConfirmed(existing) && voucherRef && voucherRef !== existing.voucherRef) {
        existing.voucherRef = voucherRef;
        existing.paymentMethod = method;
        existing.phone = phone;
        existing.paid = false;
        existing.paymentStatus = 'submitted';
        existing.paidAt = undefined;
        return { changed: true, alreadyJoined: true };
      }
      return { changed: false, alreadyJoined: true };
    }
    if (expired(pool) || pool.status === 'expired') throw fail(410, 'El plazo para sumarse a este grupo terminó');
    if (effectiveStatus(pool) !== 'open') throw fail(409, 'La meta de aportes confirmados ya fue alcanzada');
    if (pool.participants.length >= pool.targetParticipants) throw fail(409, 'El grupo ya tiene todos sus participantes');
    pool.participants.push({ user: req.user.id, name: participantName(req.user),
      phone, amount, paymentMethod: method, voucherRef, paid: false, paymentStatus: voucherRef ? 'submitted' : 'pending' });
    return { changed: true, alreadyJoined: false, guard: { expiresAt: { $gt: new Date() } } };
  });
  res.json({ success: true, alreadyJoined: result.alreadyJoined,
    message: result.alreadyJoined ? 'Tu aporte ya está registrado; no se agregó otro participante.' : 'Compromiso registrado. No se ha cobrado ni confirmado ningún pago.',
    data: await respond(result.pool, req.user, result.event) });
}));

router.put('/:shareCode/confirm/:participantId', protect, endpoint(async (req, res) => {
  const result = await changePool(req.params.shareCode, req.user, pool => {
    if (!isManager(pool, req.user)) throw fail(403, 'Solo quien organiza o administración puede registrar la confirmación manual');
    if (pool.status === 'cancelled') throw fail(409, 'Este grupo fue cancelado');
    const participant = pool.participants.id(req.params.participantId);
    if (!participant) throw fail(404, 'Participante no encontrado');
    if (Serrucho.isConfirmed(participant)) return { changed: false };
    money(participant.amount, 'Aporte');
    participant.paid = true;
    participant.paymentStatus = 'confirmed';
    participant.paidAt = new Date();
    participant.confirmedAt = participant.paidAt;
    participant.confirmedBy = req.user.id;
    participant.confirmedAfterExpiry = expired(pool);
    return { changed: true };
  });
  if (result.changed) await auditService.log({ action: 'other', targetType: 'event', targetId: idOf(result.pool.event), targetLabel: result.pool.title,
    details: { operation: 'serrucho_manual_confirmation', serruchoId: result.pool.id, participantId: req.params.participantId,
      paymentMode: 'manual_record', afterExpiry: expired(result.pool) }, req });
  res.json({ success: true, message: 'Confirmación manual registrada por quien organiza; no es una verificación bancaria.',
    data: await respond(result.pool, req.user, result.event) });
}));

module.exports = router;
