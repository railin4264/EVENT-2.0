const { activeDeadline } = require('../utils/ideaLifetime');
const express = require('express');
const mongoose = require('mongoose');
const { protect, optionalAuth } = require('../middleware/auth');
const { PartnerNeed: Need, PartnerSpace: Space } = require('../models/PartnerWorkspace');
const { id, text, evidence, target, project } = require('../services/partnerWorkspace');
const router = express.Router();
router.use((req, res, next) => { res.set('Cache-Control', 'private, no-store'); res.vary('Authorization'); next(); });
const fail = (status, message) => Object.assign(new Error(message), { status });
const route = fn => async (req, res) => { try { await fn(req, res); } catch (error) { res.status(error.status || (error.name === 'ValidationError' ? 400 : 500)).json({ success: false, message: error.status ? error.message : 'No se pudo completar la acción.' }); } };
const valid = value => { if (typeof value !== 'string' || !mongoose.isValidObjectId(value)) throw fail(400, 'Identificador inválido.'); return value; };
const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
const load = async req => { const need = await Need.findById(valid(req.params.id)); if (!need) throw fail(404, 'Solicitud no disponible.'); return need; };
router.get('/needs', optionalAuth, route(async (req, res) => {
  const rows = await Need.find({ status: 'open' }).sort({ createdAt: -1 }).limit(80).lean();
  const data = await Promise.all(rows.map(async row => { const resource = await target(row.targetType, row.targetId, req.user); return resource ? project(row, resource) : null; }));
  ok(res, data.filter(Boolean));
}));
router.get('/spaces', route(async (req, res) => { ok(res, await Space.find({ active: true }).select('-owner -__v').sort({ createdAt: -1 }).limit(80).lean()); }));
router.get('/targets', protect, route(async (req, res) => {
  const Event = require('../models/Event'); const Idea = require('../models/ActivityIdea');
  const [events, ideas] = await Promise.all([Event.find({ createdBy: req.user._id, status: 'published', isPrivate: { $ne: true }, visibility: { $nin: ['private', 'secret'] }, $or: [{ endDate: { $gt: new Date() } }, { endDate: { $exists: false }, date: { $gt: new Date() } }] }).select('_id title').limit(100).lean(), Idea.find({ createdBy: req.user._id, status: 'open', ...activeDeadline(new Date()) }).select('_id title').limit(100).lean()]);
  ok(res, [...events.map(row => ({ _id: id(row), title: row.title, type: 'event' })), ...ideas.map(row => ({ _id: id(row), title: row.title, type: 'idea' }))]);
}));
router.get('/mine', protect, route(async (req, res) => {
  const actor = id(req.user); const rows = await Need.find({ $or: [{ owner: actor }, { 'proposals.by': actor }] }).sort({ createdAt: -1 }).limit(100).lean();
  const needs = await Promise.all(rows.map(async row => project(row, await target(row.targetType, row.targetId, req.user), actor)));
  ok(res, { needs, spaces: await Space.find({ owner: actor }).select('-owner -__v').lean() });
}));
router.post('/spaces', protect, route(async (req, res) => {
  const b = req.body; const capacity = Number(b.capacity); if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000) throw fail(400, 'Capacidad inválida.');
  const data = await Space.create({ owner: req.user._id, title: text(b.title, 100), city: text(b.city, 80), country: text(b.country, 80), capacity, accessibility: text(b.accessibility || '', 400, false), conditions: text(b.conditions, 800), availability: text(b.availability, 400) }); ok(res, { _id: data.id }, 201);
}));
router.post('/spaces/:id/close', protect, route(async (req, res) => { const row = await Space.findOneAndUpdate({ _id: valid(req.params.id), owner: req.user._id }, { $set: { active: false } }, { new: true }); if (!row) throw fail(404, 'Espacio no disponible.'); ok(res, { _id: row.id, active: false }); }));
router.post('/needs', protect, route(async (req, res) => {
  const b = req.body; valid(b.targetId); const resource = await target(b.targetType, b.targetId, req.user);
  if (!resource || resource.owner !== id(req.user)) throw fail(403, 'Elige un evento público vigente o una idea abierta de tu autoría.');
  if (!['space', 'in_kind', 'outreach'].includes(b.kind)) throw fail(400, 'Tipo de colaboración inválido.');
  const row = await Need.create({ owner: req.user._id, targetType: b.targetType, targetId: b.targetId, kind: b.kind, title: text(b.title, 100), description: text(b.description, 800) }); ok(res, project(row, resource, id(req.user)), 201);
}));
router.post('/needs/:id/proposals', protect, route(async (req, res) => {
  const row = await load(req); if (id(row.owner) === id(req.user)) throw fail(400, 'No puedes proponerte a tu propia solicitud.');
  if (!await target(row.targetType, row.targetId, req.user)) throw fail(404, 'Actividad no disponible.');
  let space; if (req.body.spaceId) { space = await Space.findOne({ _id: valid(req.body.spaceId), owner: req.user._id, active: true }); if (!space) throw fail(403, 'El espacio debe ser tuyo y estar activo.'); }
  if (row.kind === 'space' && !space) throw fail(400, 'Selecciona uno de tus espacios activos.');
  const note = text(req.body.note, 600);
  const updated = await Need.findOneAndUpdate({ _id: row._id, status: 'open', 'proposals.by': { $ne: req.user._id }, $expr: { $lt: [{ $size: '$proposals' }, 100] } }, { $push: { proposals: { by: req.user._id, note, space: space?._id } } }, { new: true });
  if (!updated) throw fail(409, 'La convocatoria se cerró, alcanzó su límite o ya enviaste una propuesta.'); ok(res, project(updated, await target(row.targetType, row.targetId, req.user), id(req.user)));
}));
router.post('/needs/:id/accept', protect, route(async (req, res) => {
  const row = await load(req); if (id(row.owner) !== id(req.user)) throw fail(403, 'Sólo el anfitrión puede elegir una propuesta.');
  if (!await target(row.targetType, row.targetId, req.user)) throw fail(409, 'La actividad ya no está disponible.');
  const proposalId = valid(req.body.proposalId); const selected = row.proposals.find(p => id(p._id) === proposalId);
  if (!selected) throw fail(400, 'Propuesta inválida.');
  if (selected.space && !await Space.exists({ _id: selected.space, owner: selected.by, active: true })) throw fail(409, 'El espacio propuesto ya no está disponible.');
  const updated = await Need.findOneAndUpdate({ _id: row._id, status: 'open' }, { $set: { status: 'coordinating', acceptedProposalId: proposalId } }, { new: true });
  if (!updated) throw fail(409, 'Ya se eligió una propuesta.'); ok(res, project(updated, await target(row.targetType, row.targetId, req.user), id(req.user)));
}));
router.post('/needs/:id/deliver', protect, route(async (req, res) => {
  const row = await load(req); const accepted = row.proposals.find(p => id(p._id) === id(row.acceptedProposalId));
  if (!accepted || id(accepted.by) !== id(req.user)) throw fail(403, 'Sólo el colaborador elegido puede informar la entrega.');
  const updated = await Need.findOneAndUpdate({ _id: row._id, status: 'coordinating', acceptedProposalId: row.acceptedProposalId }, { $set: { status: 'delivered', deliveredAt: new Date(), evidence: evidence(req.body.evidence || '') } }, { new: true });
  if (!updated) throw fail(409, 'La entrega ya fue registrada o la coordinación terminó.'); ok(res, project(updated, null, id(req.user)));
}));
router.post('/needs/:id/messages', protect, route(async (req, res) => {
  const row = await load(req); const accepted = row.proposals.find(p => id(p._id) === id(row.acceptedProposalId));
  if (!accepted || ![id(row.owner), id(accepted.by)].includes(id(req.user))) throw fail(403, 'Conversación disponible sólo para las partes elegidas.');
  const message = { role: id(row.owner) === id(req.user) ? 'host' : 'partner', text: text(req.body.text, 500), at: new Date() };
  const updated = await Need.findOneAndUpdate({ _id: row._id, acceptedProposalId: row.acceptedProposalId, status: { $in: ['coordinating', 'delivered'] }, $expr: { $lt: [{ $size: '$messages' }, 80] } }, { $push: { messages: message } }, { new: true });
  if (!updated) throw fail(409, 'Coordinación terminada o límite de mensajes alcanzado.'); ok(res, project(updated, null, id(req.user)));
}));
router.post('/needs/:id/confirm', protect, route(async (req, res) => {
  const need = await load(req);
  if (id(need.owner) !== id(req.user)) throw fail(403, 'Sólo el anfitrión puede confirmar la entrega.');
  const updated = await Need.findOneAndUpdate({ _id: valid(req.params.id), owner: req.user._id, status: 'delivered' }, { $set: { status: 'confirmed', confirmedAt: new Date() } }, { new: true });
  if (!updated) throw fail(409, 'Sólo el anfitrión puede confirmar una entrega pendiente.'); ok(res, project(updated, null, id(req.user)));
}));
router.post('/needs/:id/close', protect, route(async (req, res) => { const row = await Need.findOneAndUpdate({ _id: valid(req.params.id), owner: req.user._id, status: { $in: ['open', 'coordinating', 'delivered'] } }, { $set: { status: 'closed' } }, { new: true }); if (!row) throw fail(409, 'No se puede cerrar esta convocatoria.'); ok(res, project(row, null, id(req.user))); }));
module.exports = router;
