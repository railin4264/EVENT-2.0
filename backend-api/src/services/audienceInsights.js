/**
 * Audience insights for event creators, derived from REAL nearby events.
 *
 * Given a lat/lng (and optional radius), aggregates events in that zone and
 * computes actionable audience preferences: dominant categories, typical price
 * band, best day-of-week, audience concentration and event density. This powers
 * the creator tool so organizers can see what resonates in a zone before they
 * publish — no fabricated demographics, only aggregated real event signals.
 */
const Event = require('../models/Event');

const CATEGORY_LABELS = {
  music: 'Música',
  música: 'Música',
  sports: 'Deportes',
  deportes: 'Deportes',
  technology: 'Tech',
  tecnologia: 'Tech',
  'tecnología': 'Tech',
  food: 'Gastronomía',
  comida: 'Gastronomía',
  'gastronomía': 'Gastronomía',
  art: 'Arte',
  arte: 'Arte',
  business: 'Negocios',
  negocios: 'Negocios',
  empresarial: 'Negocios',
  education: 'Educación',
  'educación': 'Educación',
  'educacion': 'Educación',
  other: 'Otro',
  otro: 'Otro',
};

const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/**
 * @param {number} lat
 * @param {number} lng
 * @param {number} radiusKm
 * @returns {Promise<object>} insights for the zone
 */
async function getAudienceInsights(lat, lng, radiusKm = 25) {
  const radiusMeters = radiusKm * 1000;

  const events = await Event.find({
    location: {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: radiusMeters,
      },
    },
  }).limit(200).lean();

  if (!events.length) {
    return {
      zone: { lat, lng, radiusKm },
      hasData: false,
      eventCount: 0,
      message: 'Aún no hay eventos en esta zona. Sé el primero en activarla.',
      topCategories: [],
      priceBand: null,
      bestDays: [],
      audienceConcentration: 0,
      eventDensity: 0,
    };
  }

  // Category tallies
  const catCount = {};
  let totalAttendees = 0;
  const prices = [];
  const dayTally = [0, 0, 0, 0, 0, 0, 0];

  for (const ev of events) {
    const cat = (ev.category || 'other').toLowerCase();
    catCount[cat] = (catCount[cat] || 0) + 1;

    const attendees = Array.isArray(ev.attendees) ? ev.attendees.length : (typeof ev.attendees === 'number' ? ev.attendees : 0);
    totalAttendees += attendees;

    if (ev.price && typeof ev.price.amount === 'number') {
      prices.push(ev.price.amount);
    }

    if (ev.date) {
      const d = new Date(ev.date).getDay();
      dayTally[d] += 1;
    }
  }

  const topCategories = Object.entries(catCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat, count]) => ({
      category: cat,
      label: CATEGORY_LABELS[cat] || (require('../utils/categories').CATEGORIES.find(c => c.slug === cat) || {}).label || cat,
      count,
      share: Math.round((count / events.length) * 100),
    }));

  const bestDays = dayTally
    .map((count, idx) => ({ day: idx, label: DAYS_ES[idx], count }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((d) => d.label);

  let priceBand = null;
  if (prices.length) {
    const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const freeCount = prices.filter((p) => p === 0).length;
    const freeShare = Math.round((freeCount / prices.length) * 100);
    priceBand = {
      average: Math.round(avg),
      min,
      max,
      freeShare,
      recommendation:
        freeShare >= 50
          ? 'La zona prefiere eventos gratuitos — considera un modelo freemium o donación.'
          : avg < 30000
          ? 'Ticket económico (＜$30K) funciona bien en esta zona.'
          : 'Hay capacidad de pago alta — un ticket premium puede funcionar.',
    };
  }

  return {
    zone: { lat, lng, radiusKm },
    hasData: true,
    eventCount: events.length,
    topCategories,
    priceBand,
    bestDays,
    audienceConcentration: totalAttendees,
    eventDensity: Math.round((events.length / radiusKm) * 10) / 10, // events per 10km
    message: null,
  };
}

module.exports = { getAudienceInsights };
