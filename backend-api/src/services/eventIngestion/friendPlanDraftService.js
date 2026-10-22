'use strict';

/** Explicit text drafts and confirmed friend-plan publication. */

const Event = require('../../models/Event');
const { absoluteDate } = require('./agendaConnector');
const { sourceError } = require('./safeSourceFetch');
const { computeH3Hierarchy } = require('./h3SpatialIndexer');

/**
 * Parses informal Spanish text and extracts draft event attributes.
 *
 * @param {string} rawText
 * @returns {object} Draft attributes
 */
function extractFriendPlanDraft(rawText = '') {
  const text = String(rawText).trim();
  const folded = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const title = (text.split('\n').find(line => line.trim()) || 'Plan entre amigos').trim().slice(0, 100);
  const categories = [
    ['sports', /\b(basket|baloncesto|futbol|pelota|padel|running)\b/],
    ['food', /\b(cena|comida|asado|bbq)\b/], ['gaming', /\b(juegos de mesa|gaming|videojuegos)\b/],
    ['outdoors', /\b(excursion|playa|senderismo|camping)\b/], ['party', /\b(fiesta|karaoke|discoteca)\b/],
    ['literature', /\b(lectura|libros|literatura)\b/], ['music', /\b(concierto|musica|jazz)\b/]
  ];
  const category = categories.find(([, regex]) => regex.test(folded))?.[0] || 'social';
  const iso = text.match(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})\b/i)?.[0];
  const date = iso ? absoluteDate(iso) : null;
  let localDate = date ? iso.slice(0, 10) : null;
  let localTime = date ? iso.slice(11, 16) : null;
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const human = folded.match(/\b(\d{1,2}) de ([a-z]+) de (\d{4})\b/);
  if (!localDate && human && months.includes(human[2])) {
    const candidate = `${human[3]}-${String(months.indexOf(human[2]) + 1).padStart(2, '0')}-${human[1].padStart(2, '0')}`;
    if (absoluteDate(candidate + 'T00:00:00Z')) localDate = candidate;
  }
  if (!localDate) {
    const explicit = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (explicit && absoluteDate(explicit[1] + 'T00:00:00Z')) localDate = explicit[1];
  }
  if (!localTime) {
    const clock = folded.match(/(?:\ba las\s+|\bhora\s*:\s*)(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?)?/);
    if (clock) {
      let hour = Number(clock[1]); const minute = Number(clock[2] || '0');
      const period = clock[3]?.replace(/[.\s]/g, '');
      if (minute < 60 && ((!period && clock[2] && hour < 24) || (period && hour >= 1 && hour <= 12))) {
        if (period) hour = hour % 12 + (period === 'pm' ? 12 : 0);
        localTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      }
    }
  }
  const zoneText = text.match(/(?:\bzona(?: horaria)?|\btimezone)\s*:\s*([A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)+|UTC)\b/i)?.[1];
  let timeZone = null;
  if (zoneText) {
    try { new Intl.DateTimeFormat('en', { timeZone: zoneText }).format(); timeZone = zoneText; } catch { /* Ask for confirmation instead of guessing. */ }
  }
  const venue = text.match(/^(?:lugar|recinto|venue)\s*:\s*(.+)$/im)?.[1]?.trim().slice(0, 200) || null;
  const priceText = text.match(/^(?:precio|entrada|costo)\s*:\s*(.+)$/im)?.[1]?.trim() || null;
  return {
    title, description: text, category, date, endDate: null, localDate, localTime, timeZone, venue,
    estimatedBudget: priceText, suggestedVisibility: 'private', needsConfirmation: true,
    extractionMethod: 'explicit_text',
    missingFields: [!localDate && 'date', !localTime && 'time', !timeZone && 'timeZone', !venue && 'location', !priceText && 'price'].filter(Boolean)
  };
}

/**
 * Confirms and publishes a friend plan with strict privacy enforcement.
 *
 * @param {object} confirmedData
 * @param {string} userId - Host / Organizer ID
 * @returns {Promise<object>} Created event document
 */
async function publishFriendPlan(confirmedData, userId) {
  if (!['public', 'group', 'friends_only', 'private'].includes(confirmedData.visibility)) throw sourceError('Confirma quién puede ver el plan');
  const isPrivatePlan = confirmedData.visibility !== 'public';
  const start = absoluteDate(confirmedData.date);
  const end = confirmedData.endDate ? absoluteDate(confirmedData.endDate) : null;
  if (!start || start <= new Date() || (confirmedData.endDate && (!end || end < start))) throw sourceError('Confirma fecha y hora con su zona horaria');

  const amount = confirmedData.price?.amount;
  const currency = confirmedData.price?.currency;
  const currencies = Event.schema.path('price.currency').enumValues;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0 || amount > 1000000 || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6 || !currencies.includes(currency)) throw sourceError('Confirma el precio y la moneda; escribe cero solo si es gratuito');
  if (confirmedData.timeZone) {
    try { new Intl.DateTimeFormat('en', { timeZone: confirmedData.timeZone }).format(); } catch { throw sourceError('Confirma una zona horaria IANA válida'); }
  }

  const defaultCoords = confirmedData.location?.coordinates;
  if (!Array.isArray(defaultCoords) || defaultCoords.length !== 2 || !defaultCoords.every(Number.isFinite) || Math.abs(defaultCoords[0]) > 180 || Math.abs(defaultCoords[1]) > 90) throw sourceError('Confirma las coordenadas del encuentro');
  const h3Hierarchy = computeH3Hierarchy(defaultCoords[1], defaultCoords[0]);

  const eventPayload = {
    title: confirmedData.title,
    description: confirmedData.description,
    category: confirmedData.category || 'social',
    activityType: 'friend_plan',
    date: start,
    endDate: end || undefined,
    createdBy: userId,
    isPrivate: isPrivatePlan,
    // Strict privacy rule: Never expose exact address on public feeds for private coros
    isSecretLocation: isPrivatePlan,
    location: {
      type: 'Point',
      coordinates: defaultCoords,
      venue: confirmedData.venue || 'Lugar por coordinar',
      address: isPrivatePlan ? 'Dirección privada (solo miembros del coro)' : (confirmedData.address || confirmedData.location?.address)
    },
    price: { amount, currency },
    ...(confirmedData.timeZone ? { timeZone: confirmedData.timeZone } : {}),
    source: 'friend_plan_submission',
    sourceId: `plan-${userId}-${Date.now()}`,
    status: isPrivatePlan ? 'published' : 'pending_review',
    h3: h3Hierarchy,
    pipelineMeta: {
      tier: 4,
      ingestedAt: new Date(),
      confidenceScore: 1.0,
      rawSchemaType: 'friend_plan'
    }
  };

  const created = await Event.create(eventPayload);
  return created;
}

module.exports = {
  extractFriendPlanDraft,
  publishFriendPlan
};
