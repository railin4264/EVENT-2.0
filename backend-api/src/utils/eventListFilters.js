const ESTIMATED_DURATION_MS = 2 * 60 * 60 * 1000;
const MAX_QUERY_PRICE = 100000000;
const invalid = message => { throw Object.assign(new Error(message), { statusCode: 400 }); };

function price(value, name) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim())) invalid(`${name} debe ser un precio válido`);
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > MAX_QUERY_PRICE) invalid(`${name} debe estar entre 0 y ${MAX_QUERY_PRICE}`);
  return amount;
}

function flag(value, name) {
  if (value === undefined) return false;
  if (value !== 'true' && value !== 'false') invalid(`${name} debe ser true o false`);
  return value === 'true';
}

function instant(value, name) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length > 40) invalid(`${name} debe ser una fecha ISO con Z u offset`);
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!parts) invalid(`${name} debe ser una fecha ISO con Z u offset`);
  const [, year, month, day, hour, minute, second = '0'] = parts;
  const calendar = new Date(0);
  calendar.setUTCFullYear(Number(year), Number(month), 0);
  const date = new Date(value);
  if (Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > calendar.getUTCDate() ||
    Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59 || !Number.isFinite(date.getTime())) invalid(`${name} no contiene una fecha válida`);
  return date;
}

function parseEventListFilters(query) {
  const filters = {
    priceMin: price(query.priceMin, 'priceMin'), priceMax: price(query.priceMax, 'priceMax'),
    startsAfter: instant(query.startsAfter, 'startsAfter'), startsBefore: instant(query.startsBefore, 'startsBefore'),
    freeOnly: flag(query.freeOnly, 'freeOnly'), secretOnly: flag(query.secretOnly, 'secretOnly'),
    hideAdultOnly: flag(query.hideAdultOnly, 'hideAdultOnly'), liveOnly: flag(query.liveOnly, 'liveOnly')
  };
  if (query.currency !== undefined) {
    if (typeof query.currency !== 'string' || !/^[A-Z]{3}$/i.test(query.currency.trim())) invalid('currency debe ser un código de moneda de tres letras');
    filters.currency = query.currency.trim().toUpperCase();
  }
  if (filters.priceMin !== undefined && filters.priceMax !== undefined && filters.priceMin > filters.priceMax) invalid('priceMin no puede superar priceMax');
  if (filters.startsAfter && filters.startsBefore && filters.startsAfter >= filters.startsBefore) invalid('startsAfter debe ser anterior a startsBefore');
  return filters;
}

/** An explicit end is exclusive; an event without endDate has a two-hour estimate. */
function activeEventTimeFilter(now) {
  return { $or: [{ endDate: { $gt: now } }, { endDate: null, date: { $gt: new Date(now.getTime() - ESTIMATED_DURATION_MS) } }] };
}

/** Return independent AND clauses so price/time OR conditions never replace visibility rules. */
function eventListConstraints(filters, now) {
  const clauses = [];
  const free = { $or: [{ 'price.amount': 0 }, { 'price.amount': null }] };
  const range = {};
  if (filters.priceMin !== undefined) range.$gte = filters.priceMin;
  if (filters.priceMax !== undefined) range.$lte = filters.priceMax;
  if (filters.currency) {
    clauses.push({ $or: [free, { 'price.currency': filters.currency, ...(Object.keys(range).length ? { 'price.amount': range } : {}) }] });
  } else if (Object.keys(range).length) clauses.push({ 'price.amount': range });
  if (filters.freeOnly) clauses.push(free);
  if (filters.secretOnly) clauses.push({ isSecretLocation: true });
  if (filters.hideAdultOnly) clauses.push({ 'ageRestriction.isAdultOnly': { $ne: true } },
    { $or: [{ 'ageRestriction.minAge': null }, { 'ageRestriction.minAge': { $lt: 18 } }] });
  if (filters.startsAfter || filters.startsBefore) clauses.push({ date: {
    ...(filters.startsAfter ? { $gte: filters.startsAfter } : {}), ...(filters.startsBefore ? { $lt: filters.startsBefore } : {})
  } });
  if (filters.liveOnly) clauses.push({ date: { $lte: now } }, activeEventTimeFilter(now));
  return clauses;
}

module.exports = { parseEventListFilters, eventListConstraints, activeEventTimeFilter };
