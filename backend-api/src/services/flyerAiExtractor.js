'use strict';

/**
 * flyerAiExtractor.js
 * ------------------------------------------------------------------
 * Reads an announcement text (Instagram caption, WhatsApp message or the text of a
 * flyer) and proposes event fields for the organizer to confirm.
 *
 * Only what the text states is returned. A missing date, time, price or place stays
 * null so the form asks for it; nothing is guessed or defaulted.
 */

const MONTH_NAMES_ES = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5, julio: 6, agosto: 7,
  septiembre: 8, setiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
};

function pad(value) {
  return String(value).padStart(2, '0');
}

/** Explicit clock time ("20:30", "8 PM", "9:00 p.m.") or null. */
function extractTime(text) {
  const clock = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\s*(a\.?\s?m\.?|p\.?\s?m\.?)?(?=\W|$)/i);
  const loose = clock ? null : text.match(/\b(1[0-2]|0?[1-9])\s*(a\.?\s?m\.?|p\.?\s?m\.?)(?=\W|$)/i);
  const match = clock || loose;
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = clock ? parseInt(match[2], 10) : 0;
  const modifier = String((clock ? match[3] : match[2]) || '').toLowerCase().replace(/[^ap]/g, '');
  if (modifier === 'p' && hours < 12) hours += 12;
  if (modifier === 'a' && hours === 12) hours = 0;
  return `${pad(hours)}:${pad(minutes)}`;
}

/**
 * Explicit calendar day as YYYY-MM-DD, or null. A day without a year is read as its next
 * occurrence (an announcement for "25 de octubre" posted in November means next year).
 */
function extractDay(text, now = new Date()) {
  let year, month, day;
  const spanish = text.match(/\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+(?:de(?:l)?\s+)?(20\d{2}))?\b/i);
  const numeric = spanish ? null : text.match(/\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](20\d{2}|\d{2}))?\b/);
  if (spanish) {
    day = parseInt(spanish[1], 10); month = MONTH_NAMES_ES[spanish[2].toLowerCase()]; year = spanish[3] ? parseInt(spanish[3], 10) : null;
  } else if (numeric) {
    day = parseInt(numeric[1], 10); month = parseInt(numeric[2], 10) - 1;
    year = numeric[3] ? (numeric[3].length === 2 ? 2000 + parseInt(numeric[3], 10) : parseInt(numeric[3], 10)) : null;
  } else {
    return null;
  }
  const valid = (y) => {
    const candidate = new Date(Date.UTC(y, month, day));
    return candidate.getUTCMonth() === month && candidate.getUTCDate() === day ? candidate : null;
  };
  let date = year ? valid(year) : valid(now.getFullYear());
  if (!date) return null;
  if (!year && date < new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))) date = valid(now.getFullYear() + 1);
  return date ? date.toISOString().slice(0, 10) : null;
}

/** Kept for callers that read both parts at once. */
function extractDateTime(text, now = new Date()) {
  return { date: extractDay(text, now), time: extractTime(text) };
}

/** Price stated in the text; an ambiguous "$" keeps its amount but no currency. */
function extractPrice(text) {
  if (/\b(?:entrada\s+gratis|gratis|free\s+entry|cover\s+free|sin\s+costo|entrada\s+libre)\b/i.test(text)) {
    return { amount: 0, currency: null, isFree: true };
  }
  const tagged = [
    [/(?:rd\$|dop)\s*([\d.,]{2,9})|([\d.,]{2,9})\s*(?:pesos dominicanos|dop)\b/i, 'DOP'],
    [/(?:us\$|usd)\s*([\d.,]{1,9})|([\d.,]{1,9})\s*usd\b/i, 'USD'],
    [/(?:€|eur)\s*([\d.,]{1,9})|([\d.,]{1,9})\s*(?:€|eur)\b/i, 'EUR'],
    [/(?:mxn|mx\$)\s*([\d.,]{1,9})|([\d.,]{1,9})\s*mxn\b/i, 'MXN'],
    [/\$\s*([\d.,]{1,9})/, null]
  ];
  for (const [pattern, currency] of tagged) {
    const match = text.match(pattern);
    if (!match) continue;
    const amount = Number(String(match[1] || match[2]).replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.'));
    if (Number.isFinite(amount) && amount > 0) return { amount, currency, isFree: false };
  }
  return null;
}

function extractCategory(text) {
  const t = text.toLowerCase();
  if (/\b(?:concierto|musica|musica en vivo|live music|dembow|bachata|merengue|salsa|dj|banda|rock|acustico|jazz)\b/.test(t)) return 'music';
  if (/\b(?:torneo|futbol|baloncesto|basket|running|maraton|beisbol|padel|crossfit|fitness)\b/.test(t)) return 'sports';
  if (/\b(?:fiesta|party|coro|open bar|discoteca|nocturna|nightlife|vip|after party)\b/.test(t)) return 'party';
  if (/\b(?:taller|conferencia|workshop|masterclass|charla|bootcamp|curso|aprende)\b/.test(t)) return 'education';
  if (/\b(?:bebe|bebes|niños|infantil|maternal|familia|familiar|kids)\b/.test(t)) return 'family';
  if (/\b(?:comida|gastronomia|degustacion|food|brunch|cena|catas|cocina)\b/.test(t)) return 'food';
  if (/\b(?:salud|medico|ensayo|clinico|paciente|terapia|bienestar|yoga|meditacion)\b/.test(t)) return 'health';
  if (/\b(?:teatro|comedia|stand up|cine|estreno|obra)\b/.test(t)) return 'entertainment';
  if (/\b(?:arte|exposicion|galeria|pintura|escultura|fotografia)\b/.test(t)) return 'art';
  if (/\b(?:networking|startups|tech|tecnologia|hackathon|software|inversion)\b/.test(t)) return 'technology';
  return null;
}

// Well-known venues with their real location. A city alone is not a venue: it fills the
// city field and leaves the exact place for the organizer to confirm.
const KNOWN_VENUES = [
  { name: 'Estadio Quisqueya Juan Marichal', address: 'Av. Tiradentes con San Cristóbal, Santo Domingo', city: 'Santo Domingo', country: 'República Dominicana', coords: [-69.9248, 18.4878] },
  { name: 'Teatro Nacional Eduardo Brito', address: 'Av. Máximo Gómez 35, Plaza de la Cultura, Santo Domingo', city: 'Santo Domingo', country: 'República Dominicana', coords: [-69.9102, 18.4716] },
  { name: 'Casa de Teatro', address: 'Calle Arzobispo Meriño 110, Zona Colonial, Santo Domingo', city: 'Santo Domingo', country: 'República Dominicana', coords: [-69.8856, 18.4735] },
  { name: 'Hard Rock Café Santo Domingo', address: 'BlueMall, Av. Winston Churchill, Santo Domingo', city: 'Santo Domingo', country: 'República Dominicana', coords: [-69.9405, 18.4721] },
  { name: 'Anfiteatro Altos de Chavón', address: 'Casa de Campo Resort, La Romana', city: 'La Romana', country: 'República Dominicana', coords: [-68.8906, 18.4239] },
  { name: 'Estadio Cibao', address: 'Av. Imbert, Santiago de los Caballeros', city: 'Santiago de los Caballeros', country: 'República Dominicana', coords: [-70.7093, 19.4678] },
  { name: 'Parque Mirador Sur', address: 'Av. Anacaona, Santo Domingo', city: 'Santo Domingo', country: 'República Dominicana', coords: [-69.9532, 18.4485] },
  { name: 'Pueblo de Los Pescadores', address: 'Calle Duarte, Las Terrenas, Samaná', city: 'Las Terrenas', country: 'República Dominicana', coords: [-69.5398, 19.3218] },
  { name: 'Parque La Confluencia', address: 'Jarabacoa, La Vega', city: 'Jarabacoa', country: 'República Dominicana', coords: [-70.6417, 19.1189] }
];
const KNOWN_CITIES = [
  ['santo domingo', 'Santo Domingo', 'República Dominicana'], ['santiago de los caballeros', 'Santiago de los Caballeros', 'República Dominicana'],
  ['punta cana', 'Punta Cana', 'República Dominicana'], ['puerto plata', 'Puerto Plata', 'República Dominicana'],
  ['la romana', 'La Romana', 'República Dominicana'], ['madrid', 'Madrid', 'España'], ['barcelona', 'Barcelona', 'España']
];

function extractVenueAndLocation(text) {
  const t = text.toLowerCase();
  const venue = KNOWN_VENUES.find(v => t.includes(v.name.toLowerCase()));
  if (venue) return venue;
  const city = KNOWN_CITIES.find(([needle]) => t.includes(needle));
  return city ? { name: null, address: null, city: city[1], country: city[2], coords: null } : null;
}

/** Event fields stated in an announcement text; unknown fields are null. */
function extractEventFromText(rawText = '', options = {}) {
  const clean = String(rawText || '').replace(/\r/g, '').trim();
  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
  const title = lines[0] ? (lines[0].length > 90 ? lines[0].slice(0, 87) + '...' : lines[0]) : null;
  const { date, time } = extractDateTime(clean, options.now);
  const category = extractCategory(clean);
  const place = extractVenueAndLocation(clean);
  const words = clean.toLowerCase().match(/#[a-z0-9_-]+/gi) || [];
  const tags = [...new Set(words.map(w => w.replace(/^#/, '')))].slice(0, 8);

  return {
    title,
    description: clean.length > 20 ? clean.slice(0, 1500) : null,
    category,
    tags,
    date,
    time,
    venue: place?.name || null,
    address: place?.address || null,
    city: place?.city || null,
    country: place?.country || null,
    coordinates: place?.coords || null,
    price: extractPrice(clean),
    coverUrl: options.coverUrl || '',
    // Fields the organizer must still provide before publishing.
    missing: ['title', 'date', 'time', 'venue', 'price'].filter(field => field === 'venue' ? !place?.name : field === 'price' ? !extractPrice(clean) : !({ title, date, time })[field])
  };
}

module.exports = {
  extractEventFromText,
  extractDateTime,
  extractDay,
  extractTime,
  extractPrice,
  extractCategory,
  extractVenueAndLocation
};
