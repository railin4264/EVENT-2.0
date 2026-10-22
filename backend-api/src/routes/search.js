const express = require('express');
const rateLimit = require('express-rate-limit');
const { optionalAuth } = require('../middleware/auth');
const User = require('../models/User');
const Event = require('../models/Event');
const Tribe = require('../models/Tribe');
const { buildAgeRestrictionFilter } = require('../utils/eventVisibility');
const { publicEventCard } = require('../utils/publicEventCard');
const logger = require('../utils/logger');
const router = express.Router();
router.use(rateLimit({ windowMs: 60000, max: 90, standardHeaders: true, legacyHeaders: false }));
router.use((req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });
const HOST_ROLES = ['organizer', 'creator'];
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const fold = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
function searchRegex(value) {
  const variants = { a: '[aáàäâã]', e: '[eéèëê]', i: '[iíìïî]', o: '[oóòöôõ]', u: '[uúùüû]', n: '[nñ]' };
  return escapeRegex(fold(value)).replace(/[aeioun]/g, character => variants[character]);
}
function text(value, name, max = 100) {
  if (value === undefined) return '';
  if (typeof value !== 'string' || value.length > max) throw new Error(`${name}: texto no válido.`);
  return value.trim();
}
function integer(value, fallback, max) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value) || Number(value) < 1 || Number(value) > max) throw new Error('Paginación no válida.');
  return Number(value);
}
function parse(query) {
  const q = text(query.q, 'Búsqueda');
  const input = text(query.type, 'Tipo');
  const types = !input || input === 'all' ? ['events', 'users', 'tribes'] : input.split(',');
  if (types.some(type => !['events', 'users', 'tribes', 'hosts', 'locations'].includes(type))) throw new Error('Tipo de búsqueda no válido.');
  const page = integer(query.page, 1, 100), limit = integer(query.limit, 12, 30);
  const category = text(query.category, 'Categoría');
  const location = text(query.location, 'Lugar');
  const date = {};
  for (const [key, operator] of [['startDate', '$gte'], ['endDate', '$lte']]) {
    if (query[key] !== undefined) {
      const value = text(query[key], 'Fecha', 40);
      if (!value || !Number.isFinite(Date.parse(value))) throw new Error('Fecha no válida.');
      date[operator] = new Date(value);
    }
  }
  if (date.$gte && date.$lte && date.$gte > date.$lte) throw new Error('El intervalo de fechas no es válido.');
  const price = {};
  for (const [key, operator] of [['minPrice', '$gte'], ['maxPrice', '$lte']]) {
    if (query[key] !== undefined) {
      const value = text(query[key], 'Precio', 20);
      if (!value || !Number.isFinite(Number(value)) || Number(value) < 0) throw new Error('Precio no válido.');
      price[operator] = Number(value);
    }
  }
  if (price.$gte !== undefined && price.$lte !== undefined && price.$gte > price.$lte) throw new Error('El intervalo de precios no es válido.');
  return { q, types, page, limit, category, location, date, price };
}
async function search(query, user) {
  const options = parse(query);
  const { q, types, page, limit } = options;
  const groups = { events: { data: [], total: 0 }, users: { data: [], total: 0 }, tribes: { data: [], total: 0 } };
  if (q.length < 2) return { options, groups, results: [] };
  const regex = { $regex: searchRegex(q), $options: 'i' };
  const specs = [];
  if (types.includes('events') || types.includes('locations')) {
    const places = [{ 'location.city': regex }, { 'location.country': regex }, { isSecretLocation: { $ne: true }, 'location.venue': regex }, { isSecretLocation: { $ne: true }, 'location.address': regex }];
    const filter = { status: 'published', isPrivate: { $ne: true }, ...buildAgeRestrictionFilter(user), $or: types.includes('locations') && !types.includes('events') ? places : [{ title: regex }, { description: regex }, { tags: regex }, ...places] };
    if (options.category) filter.category = options.category;
    if (options.location) {
      const place = { $regex: searchRegex(options.location), $options: 'i' };
      filter.$and.push({ $or: [{ 'location.city': place }, { 'location.country': place }, { isSecretLocation: { $ne: true }, 'location.address': place }] });
    }
    if (Object.keys(options.date).length) filter.date = options.date;
    if (Object.keys(options.price).length) filter['price.amount'] = options.price;
    specs.push(['events', Event, filter, 'title description date endDate location images category price isSecretLocation isVirtual status createdBy tags', { date: 1, _id: 1 }]);
  }
  if (types.includes('users') || types.includes('hosts')) {
    const personRegex = { $regex: searchRegex(q.startsWith('@') ? q.slice(1) : q), $options: 'i' };
    const filter = { isActive: true, isPrivate: { $ne: true }, 'settings.privacy.showProfile': { $ne: false }, role: { $ne: 'system' }, $or: ['username', 'firstName', 'lastName', 'bio'].map(field => ({ [field]: personRegex })) };
    specs.push(['users', User, filter, 'username firstName lastName avatar bio role', { username: 1, _id: 1 }]);
  }
  if (types.includes('tribes')) {
    const filter = { isActive: true, 'settings.privacy': { $nin: ['private', 'secret'] }, $or: [{ name: regex }, { description: regex }, { tags: regex }] };
    specs.push(['tribes', Tribe, filter, 'name description category stats.totalMembers avatar', { name: 1, _id: 1 }]);
  }
  const hostOnly = types.includes('hosts') && !types.includes('users');
  const publicHostedEvent = { status: 'published', isPrivate: { $ne: true }, ...buildAgeRestrictionFilter(user) };
  await Promise.all(specs.map(async ([name, Model, filter, fields, sort]) => {
    if (name === 'users' && hostOnly) {
      const [facet] = await User.aggregate([
        { $match: filter },
        { $lookup: { from: Event.collection.name, let: { author: '$_id' }, pipeline: [
          { $match: { ...publicHostedEvent, $expr: { $eq: ['$createdBy', '$$author'] } } }, { $limit: 1 }, { $project: { _id: 1 } },
        ], as: 'publicEvents' } },
        { $match: { $or: [{ role: { $in: HOST_ROLES } }, { 'publicEvents.0': { $exists: true } }] } },
        { $facet: { data: [{ $sort: sort }, { $skip: (page - 1) * limit }, { $limit: limit }, { $project: { username: 1, firstName: 1, lastName: 1, avatar: 1, bio: 1, role: 1, publicHost: { $literal: true } } }], count: [{ $count: 'total' }] } },
      ]).option({ maxTimeMS: 5000 });
      groups.users = { data: facet?.data || [], total: facet?.count?.[0]?.total || 0 };
      return;
    }
    const [rows, total] = await Promise.all([Model.find(filter).select(fields).sort(sort).skip((page - 1) * limit).limit(limit).lean(), Model.countDocuments(filter)]);
    groups[name] = { data: name === 'events' ? rows.map(publicEventCard) : rows, total };
  }));
  if (!hostOnly && groups.users.data.length) {
    // The lookup is bounded to this page's users; do not collect every organizer ID.
    const authors = await Event.distinct('createdBy', { ...publicHostedEvent, createdBy: { $in: groups.users.data.map(person => person._id) } });
    const publicAuthors = new Set(authors.map(String));
    groups.users.data = groups.users.data.map(person => ({ ...person, publicHost: publicAuthors.has(String(person._id)) }));
  }
  const results = [
    ...groups.events.data.map(event => ({ id: String(event._id), type: 'event', title: event.title, description: event.description, image: event.images?.[0]?.url || (typeof event.images?.[0] === 'string' ? event.images[0] : undefined), metadata: { date: event.date, category: event.category, price: event.price, location: event.isSecretLocation ? 'Ubicación reservada' : typeof event.location === 'string' ? event.location : event.location?.city || event.location?.address || '', isSecretLocation: event.isSecretLocation === true } })),
    ...groups.users.data.map(person => ({ id: String(person._id), type: 'user', title: [person.firstName, person.lastName].filter(Boolean).join(' ') || person.username, description: person.bio || `@${person.username}`, image: typeof person.avatar === 'string' ? person.avatar : person.avatar?.url, metadata: { username: person.username, role: person.role, isHost: person.publicHost === true || HOST_ROLES.includes(person.role) } })),
    ...groups.tribes.data.map(tribe => ({ id: String(tribe._id), type: 'tribe', title: tribe.name, description: tribe.description, image: typeof tribe.avatar === 'string' ? tribe.avatar : tribe.avatar?.url, metadata: { category: tribe.category, memberCount: tribe.stats?.totalMembers || 0 } })),
  ];
  // Exact and prefix matches first, with stable deterministic tie-breaking.
  const score = item => fold(item.title).trim() === fold(q) ? 2 : fold(item.title).startsWith(fold(q)) ? 1 : 0;
  results.sort((a, b) => score(b) - score(a) || a.title.localeCompare(b.title, 'es') || a.id.localeCompare(b.id));
  return { options, groups, results };
}
async function handle(req, res) {
  try {
    const { options, groups, results } = await search(req.query, req.user);
    const perType = Object.fromEntries(Object.entries(groups).map(([key, value]) => [key, { total: value.total, pages: Math.ceil(value.total / options.limit) }]));
    const total = Object.values(groups).reduce((sum, group) => sum + group.total, 0);
    if (req.path === '/suggestions') return res.json({ success: true, suggestions: results.slice(0, 10).map(item => ({ type: item.type, id: item.id, title: item.title, subtitle: item.description, avatar: item.image })) });
    if (req.path === '/global') return res.json({ success: true, query: options.q, type: req.query.type || 'all', results: Object.fromEntries(Object.entries(groups).map(([key, group]) => [key, { ...group, page: options.page, pages: perType[key].pages }])) });
    res.json({ success: true, query: options.q, results, data: Object.fromEntries(Object.entries(groups).map(([key, value]) => [key, value.data])), pagination: { page: options.page, limit: options.limit, total, hasMore: Object.values(perType).some(group => group.pages > options.page), perType } });
  } catch (error) {
    if (/no válid|no es válido|Paginación|intervalo/.test(error.message)) return res.status(400).json({ success: false, message: error.message });
    logger.error('Global search failed', { message: error.message });
    res.status(500).json({ success: false, message: 'No pudimos completar la búsqueda.' });
  }
}
router.get('/trending', (req, res) => res.json({ success: true, trending: [], suggestions: ['Música', 'Aire libre', 'Gastronomía'], kind: 'suggested' }));
router.get('/suggestions', optionalAuth, handle);
router.get('/global', optionalAuth, handle);
router.get('/', optionalAuth, handle);
module.exports = router;
