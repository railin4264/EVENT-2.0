const express = require('express');
const mongoose = require('mongoose');
const CommunityAction = require('../models/CommunityAction');
const Event = require('../models/Event');
const ActivityIdea = require('../models/ActivityIdea');
const { optionalAuth, protect } = require('../middleware/auth');
const { permission, idOf, repeatDays, serialize } = require('../utils/communityActions');
const { hasEventParticipation } = require('../services/eventSocialAccess');
const router = express.Router();
const fail = (status, message) => Object.assign(new Error(message), { status });
router.use((req, res, next) => { res.set('Cache-Control', 'private, no-store'); res.vary('Authorization'); next(); });
router.param('scope', (req, res, next, scope) => ['events', 'ideas'].includes(scope) ? next() : res.status(404).json({ success: false, message: 'Sección no encontrada' }));
async function context(req) {
  if (!mongoose.isValidObjectId(req.params.id)) throw fail(400, 'Identificador inválido');
  const target = await (req.params.scope === 'events' ? Event : ActivityIdea).findById(req.params.id).lean();
  const registered = target && req.params.scope === 'events' && req.user ? await hasEventParticipation(target, req.user._id) : false;
  const access = permission(req.params.scope, target, req.user, Date.now(), registered);
  if (!access.visible) throw fail(404, 'Actividad no disponible');
  return { target, access };
}
const handler = fn => async (req, res) => { try { await fn(req, res); } catch (error) { res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'No se pudo completar la acción. Reintenta.' }); } };
router.get('/:scope/:id', optionalAuth, handler(async (req, res) => {
  const { target, access } = await context(req);
  const doc = await CommunityAction.findOne({ scope: req.params.scope, target: target._id }).lean();
  res.json({ success: true, data: { title: target.title, ...serialize(doc, access, req.user) } });
}));
async function mutate(req, operation) {
  // Re-read permissions on each CAS attempt so retries cannot use stale event status.
  for (let attempt = 0; attempt < 6; attempt++) {
    const { target, access } = await context(req);
    const key = { scope: req.params.scope, target: target._id };
    let doc = await CommunityAction.findOne(key).lean();
    if (!doc) {
      try { doc = (await CommunityAction.create({ ...key, roles: [], repeatVotes: [] })).toObject(); }
      catch (error) { if (error.code === 11000) continue; throw error; }
    }
    operation(doc, access, target);
    const saved = await CommunityAction.findOneAndUpdate({ _id: doc._id, __v: doc.__v }, { $set: { roles: doc.roles, repeatVotes: doc.repeatVotes, meetup: doc.meetup }, $inc: { __v: 1 } }, { new: true, runValidators: true }).lean();
    if (saved) return { title: target.title, ...serialize(saved, access, req.user) };
  }
  throw fail(409, 'Hubo otro cambio al mismo tiempo. Reintenta.');
}
const mutation = operation => handler(async (req, res) => { const data = await mutate(req, (doc, access, target) => operation(req, doc, access, target)); res.json({ success: true, data }); });
const requireManager = access => { if (!access.canManage) throw fail(403, 'Sólo el anfitrión puede gestionar esta sección'); };
const requireOpen = access => { if (!access.canContribute) throw fail(400, 'La convocatoria ya no está abierta'); };
router.post('/:scope/:id/roles', protect, mutation((req, doc, access) => {
  requireManager(access); requireOpen(access);
  const { title, slots } = req.body;
  if (typeof title !== 'string' || !title.trim() || title.length > 100 || !Number.isInteger(slots) || slots < 1 || slots > 50 || doc.roles.length >= 20) throw fail(400, 'Indica una necesidad y entre 1 y 50 plazas (máximo 20 necesidades)');
  doc.roles.push({ _id: new mongoose.Types.ObjectId(), title: title.trim(), slots, closed: false, offers: [] });
}));
router.patch('/:scope/:id/roles/:roleId', protect, mutation((req, doc, access) => {
  requireManager(access); requireOpen(access);
  const role = doc.roles.find(row => idOf(row) === req.params.roleId);
  if (!role) throw fail(404, 'Necesidad no encontrada');
  if (typeof req.body.closed !== 'boolean') throw fail(400, 'Estado inválido');
  role.closed = req.body.closed;
}));
router.post('/:scope/:id/roles/:roleId/offer', protect, mutation((req, doc, access) => {
  requireOpen(access);
  const role = doc.roles.find(row => idOf(row) === req.params.roleId);
  if (!role || role.closed) throw fail(400, 'Esta necesidad no acepta más ofertas');
  if (typeof req.body.note !== 'string' || !req.body.note.trim() || req.body.note.length > 300) throw fail(400, 'Describe tu aporte en hasta 300 caracteres');
  if (access.canManage) throw fail(400, 'El anfitrión gestiona las ofertas de los colaboradores');
  const existing = role.offers.find(row => idOf(row.user) === idOf(req.user));
  if (existing) throw fail(409, 'Ya enviaste una oferta para esta necesidad');
  if (role.offers.length >= 100) throw fail(400, 'Esta necesidad ya alcanzó el límite de ofertas');
  role.offers.push({ user: req.user._id, name: String(req.user.firstName || req.user.username || 'Colaborador').slice(0, 80), note: req.body.note.trim(), status: 'offered' });
}));
router.delete('/:scope/:id/roles/:roleId/offer', protect, mutation((req, doc) => {
  const role = doc.roles.find(row => idOf(row) === req.params.roleId);
  if (!role) throw fail(404, 'Necesidad no encontrada');
  role.offers = role.offers.filter(row => idOf(row.user) !== idOf(req.user));
}));
router.patch('/:scope/:id/roles/:roleId/offers/:userId', protect, mutation((req, doc, access) => {
  requireManager(access); requireOpen(access);
  const role = doc.roles.find(row => idOf(row) === req.params.roleId), status = req.body.status;
  const offer = role?.offers.find(row => idOf(row.user) === req.params.userId);
  if (!offer) throw fail(404, 'Oferta no encontrada');
  if (!['accepted', 'declined'].includes(status)) throw fail(400, 'Estado inválido');
  if (status === 'accepted' && offer.status !== 'accepted' && role.offers.filter(row => row.status === 'accepted').length >= role.slots) throw fail(409, 'Las plazas de esta necesidad están completas');
  offer.status = status;
}));
router.put('/:scope/:id/repeat', protect, mutation((req, doc, access) => {
  if (req.params.scope !== 'events' || !access.canRepeat) throw fail(403, 'Sólo asistentes confirmados pueden pedir otra edición después del evento');
  if (typeof req.body.interested !== 'boolean') throw fail(400, 'Confirma tu preferencia');
  let days; try { days = repeatDays(req.body.days || []); } catch (error) { throw fail(400, error.message); }
  doc.repeatVotes = doc.repeatVotes.filter(row => idOf(row.user) !== idOf(req.user));
  if (req.body.interested) {
    if (doc.repeatVotes.length >= 10000) throw fail(400, 'Se alcanzó el límite de respuestas');
    doc.repeatVotes.push({ user: req.user._id, days });
  }
}));
router.put('/:scope/:id/meetup', protect, mutation((req, doc, access, target) => {
  requireManager(access);
  if (req.params.scope !== 'events' || !access.meetupActive) throw fail(400, 'El evento ya no admite puntos de encuentro');
  const { place, time, isPublicPlace } = req.body, timestamp = typeof time === 'string' ? Date.parse(time) : NaN;
  const start = new Date(target.date).getTime();
  if (typeof place !== 'string' || !place.trim() || place.length > 200 || isPublicPlace !== true || !Number.isFinite(timestamp) || timestamp <= Date.now() || timestamp > start || timestamp < start - 86400000) throw fail(400, 'Elige un lugar público y una hora futura dentro de las 24 horas previas al evento');
  // A changed meeting requires fresh consent from every person.
  if (doc.meetup?.place === place.trim() && new Date(doc.meetup.time).getTime() === timestamp) return;
  doc.meetup = { place: place.trim(), time: new Date(timestamp), participants: [] };
}));
router.put('/:scope/:id/meetup/join', protect, mutation((req, doc, access) => {
  if (req.params.scope !== 'events' || !access.meetupActive || !doc.meetup?.place || (req.body.joined !== false && new Date(doc.meetup.time).getTime() <= Date.now())) throw fail(400, 'El encuentro ya no admite cambios');
  if (typeof req.body.joined !== 'boolean' || (req.body.joined && typeof req.body.shareName !== 'boolean')) throw fail(400, 'Confirma tu participación y privacidad');
  // Withdrawal is allowed even if an event registration was subsequently removed.
  if (req.body.joined && !access.confirmed && !access.canManage) throw fail(403, 'Confirma primero tu asistencia al evento');
  doc.meetup.participants = (doc.meetup.participants || []).filter(row => idOf(row.user) !== idOf(req.user));
  if (req.body.joined) {
    if (doc.meetup.participants.length >= 200) throw fail(400, 'El encuentro alcanzó su límite de participantes');
    doc.meetup.participants.push({ user: req.user._id, name: String(req.user.firstName || req.user.username || 'Participante').slice(0, 80), shareName: req.body.shareName });
  }
}));
module.exports = router;
