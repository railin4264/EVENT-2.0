const Event = require('../models/Event');
const Idea = require('../models/ActivityIdea');
const { ideaExpired } = require('../utils/ideaLifetime');
const { ageIsAllowed } = require('../utils/eventVisibility');
const { confirmedRegistrations } = require('../utils/recommendationRanking');
const id = value => String(value?._id || value || '');
function text(value, max, required = true) {
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) throw Object.assign(new Error('Revisa los campos y sus límites.'), { status: 400 });
  return value.trim();
}
function evidence(value) {
  const result = text(value, 500, false);
  if (/https?:\/\//i.test(result)) {
    try { const url = new URL(result); if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error(); }
    catch { throw Object.assign(new Error('Usa una URL pública http/https sin credenciales o una referencia de texto.'), { status: 400 }); }
  }
  if (/^(javascript|data|file):/i.test(result)) throw Object.assign(new Error('Referencia no permitida.'), { status: 400 });
  return result;
}
async function target(type, targetId, user) {
  const row = type === 'event' ? await Event.findById(targetId).select('title status ageRestriction isPrivate isSecretLocation visibility date endDate createdBy attendees location.city').lean() : type === 'idea' ? await Idea.findById(targetId).select('title status createdBy supporters zone.city quorumDeadline createdAt').lean() : null;
  if (!row) return null;
  const available = type === 'event' ? row.status === 'published' && row.isPrivate !== true && !['private', 'secret'].includes(row.visibility) && new Date(row.endDate || row.date).getTime() > Date.now() : row.status === 'open' && !ideaExpired(row);
  if (!available || (type === 'event' && id(row.createdBy) !== id(user) && !ageIsAllowed(row, user))) return null;
  return { owner: id(row.createdBy), title: row.title, city: type === 'event' ? (row.isSecretLocation ? undefined : row.location?.city) : row.zone?.city, audience: type === 'event' ? confirmedRegistrations(row.attendees || []) : new Set((row.supporters || []).map(item => id(item.user)).filter(Boolean)).size, audienceLabel: type === 'event' ? 'inscripciones confirmadas' : 'personas interesadas' };
}
function project(need, resource, actor = '') {
  const owner = id(need.owner) === actor;
  const accepted = need.proposals.find(p => id(p._id) === id(need.acceptedProposalId));
  const participant = accepted && id(accepted.by) === actor;
  return { _id: id(need._id), title: need.title, description: need.description, kind: need.kind, status: need.status, targetType: need.targetType, targetId: id(need.targetId), resource: resource && { title: resource.title, city: resource.city, audience: resource.audience, audienceLabel: resource.audienceLabel }, canManage: owner, canCoordinate: !!accepted && (owner || !!participant), messages: owner || participant ? (need.messages || []).map(m => ({ role: m.role, text: m.text, at: m.at })) : [], canDeliver: !!participant && need.status === 'coordinating', canConfirm: owner && need.status === 'delivered', acceptedProposalId: owner || participant ? id(need.acceptedProposalId) : undefined, evidence: owner || participant ? need.evidence : undefined, proposals: need.proposals.filter(p => owner || id(p.by) === actor).map(p => ({ _id: id(p._id), note: p.note, spaceId: p.space ? id(p.space) : undefined, mine: id(p.by) === actor })), proposalCount: need.proposals.length };
}
module.exports = { id, text, evidence, target, project };
