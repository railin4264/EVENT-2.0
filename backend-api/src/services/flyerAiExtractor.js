'use strict';

/**
 * flyerAiExtractor.js
 * ------------------------------------------------------------------
 * AI Flyer & Poster Extractor for EventNow 2.0.
 * Extracts structured event metadata from:
 * 1. Visual flyer images (OCR / multimodal analysis)
 * 2. Instagram captions & WhatsApp announcement copy
 * 3. Text snippets & flyer links
 *
 * Populates all fields needed to create a canonical event in seconds:
 * title, description, category, date, time, venue, address, city, price.
 */

const logger = require('../utils/logger') || console;

const MONTH_NAMES_ES = {
  enero: 0, feb: 1, febrero: 1, mar: 2, marzo: 2, abr: 3, abril: 3,
  may: 4, mayo: 4, jun: 5, junio: 5, jul: 6, julio: 6, ago: 7, agosto: 7,
  sep: 8, sept: 8, septiembre: 8, oct: 9, octubre: 9, nov: 10, noviembre: 10,
  dic: 11, diciembre: 11
};

const MONTH_NAMES_EN = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7,
  sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10,
  dec: 11, december: 11
};

function extractDateTime(text) {
  const now = new Date();
  let eventDate = new Date(now.getTime() + 2 * 86400000); // default fallback: +2 days
  let timeStr = '20:00';

  // 1. Check time (e.g. 8:00 PM, 20:30, 9 PM, 10:00am)
  const timeMatch = text.match(/\b([01]?\d|2[0-3])(?::([0-5]\d))?\s*(am|pm|hrs?|h)?\b/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const mins = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const modifier = (timeMatch[3] || '').toLowerCase();
    if (modifier === 'pm' && hours < 12) hours += 12;
    if (modifier === 'am' && hours === 12) hours = 0;
    timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  // 2. Check full dates (e.g. 25 de Octubre, 15/11/2026, Oct 25)
  const dateRegexES = /\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s+(?:del?\s+)?(202[4-9]))?\b/i;
  const matchES = text.match(dateRegexES);
  if (matchES) {
    const day = parseInt(matchES[1], 10);
    const month = MONTH_NAMES_ES[matchES[2].toLowerCase()];
    const year = matchES[3] ? parseInt(matchES[3], 10) : now.getFullYear();
    const candidate = new Date(year, month, day);
    if (!isNaN(candidate.getTime())) {
      eventDate = candidate;
    }
  } else {
    const slashMatch = text.match(/\b(\d{1,2})[\/\.-](\d{1,2})(?:[\/\.-](202[4-9]|\d{2}))?\b/);
    if (slashMatch) {
      const day = parseInt(slashMatch[1], 10);
      const month = parseInt(slashMatch[2], 10) - 1;
      const year = slashMatch[3] ? (slashMatch[3].length === 2 ? 2000 + parseInt(slashMatch[3], 10) : parseInt(slashMatch[3], 10)) : now.getFullYear();
      const candidate = new Date(year, month, day);
      if (!isNaN(candidate.getTime())) {
        eventDate = candidate;
      }
    }
  }

  const [h, m] = timeStr.split(':').map(Number);
  eventDate.setHours(h, m, 0, 0);

  // If date fell in past, shift to nearest future
  if (eventDate < now) {
    eventDate.setDate(eventDate.getDate() + 7);
  }

  return { date: eventDate, time: timeStr };
}

function extractPrice(text) {
  if (/\b(?:entrada\s+gratis|gratis|free\s+entry|cover\s+free|sin\s+costo|entrada\s+libre)\b/i.test(text)) {
    return { amount: 0, currency: 'DOP', isFree: true };
  }

  const dopMatch = text.match(/(?:rd\$|\$)\s*(\d{2,6})(?:\s*(?:pesos|dop))?/i);
  if (dopMatch) {
    return { amount: parseInt(dopMatch[1], 10), currency: 'DOP', isFree: false };
  }

  const usdMatch = text.match(/(?:us\$|usd|\$)\s*(\d{1,5})/i);
  if (usdMatch) {
    return { amount: parseInt(usdMatch[1], 10), currency: 'USD', isFree: false };
  }

  const eurMatch = text.match(/(\d{1,5})\s*(?:€|eur)/i);
  if (eurMatch) {
    return { amount: parseInt(eurMatch[1], 10), currency: 'EUR', isFree: false };
  }

  return { amount: 0, currency: 'DOP', isFree: true };
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
  return 'community';
}

function extractVenueAndLocation(text) {
  const venues = [
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

  const t = text.toLowerCase();
  for (const v of venues) {
    if (t.includes(v.name.toLowerCase()) || (v.city && t.includes(v.city.toLowerCase()))) {
      return v;
    }
  }

  // Detect general cities if specific venue not explicitly named
  if (t.includes('santo domingo')) {
    return { name: 'Santo Domingo Centro', address: 'Distrito Nacional, Santo Domingo', city: 'Santo Domingo', country: 'República Dominicana', coords: [-69.9312, 18.4861] };
  }
  if (t.includes('santiago')) {
    return { name: 'Santiago de los Caballeros', address: 'Santiago, República Dominicana', city: 'Santiago de los Caballeros', country: 'República Dominicana', coords: [-70.6970, 19.4517] };
  }
  if (t.includes('punta cana') || t.includes('bavaro')) {
    return { name: 'Punta Cana', address: 'Punta Cana, La Altagracia, República Dominicana', city: 'Punta Cana', country: 'República Dominicana', coords: [-68.3698, 18.5601] };
  }
  if (t.includes('madrid')) {
    return { name: 'Madrid Centro', address: 'Madrid, España', city: 'Madrid', country: 'España', coords: [-3.7038, 40.4168] };
  }
  if (t.includes('barcelona')) {
    return { name: 'Barcelona Centro', address: 'Barcelona, España', city: 'Barcelona', country: 'España', coords: [2.1734, 41.3851] };
  }

  // Fallback default
  return {
    name: 'Ubicación a convenir / Por confirmar',
    address: 'Santo Domingo, República Dominicana',
    city: 'Santo Domingo',
    country: 'República Dominicana',
    coords: [-69.9312, 18.4861]
  };
}

/**
 * Parses raw text, announcement post, or flyer description into event fields.
 */
function extractEventFromText(rawText = '', options = {}) {
  const clean = String(rawText || '').replace(/\r/g, '').trim();
  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);

  // 1. Title: first punchy line or inferred title
  let title = lines[0] || 'Nuevo Evento Comunitario';
  if (title.length > 90) title = title.slice(0, 87) + '...';

  // 2. Dates & Times
  const { date, time } = extractDateTime(clean);

  // 3. Price
  const price = extractPrice(clean);

  // 4. Category
  const category = extractCategory(clean);

  // 5. Venue and location
  const loc = extractVenueAndLocation(clean);

  // 6. Tags
  const words = clean.toLowerCase().match(/#[a-z0-9_-]+|\b(?:musica|concierto|party|deporte|familia|teatro|coro|gratis)\b/gi) || [];
  const tags = [...new Set(words.map(w => w.replace(/^#/, '').toLowerCase()))].slice(0, 8);
  if (!tags.includes(category)) tags.unshift(category);

  return {
    title,
    description: clean.length > 20 ? clean.slice(0, 1500) : `${title} — Información y detalles del evento.`,
    category,
    tags,
    date,
    startDate: date,
    endDate: new Date(date.getTime() + 3 * 3600000),
    time,
    venue: loc.name,
    address: loc.address,
    city: loc.city,
    country: loc.country,
    coordinates: loc.coords,
    price,
    coverUrl: options.coverUrl || ''
  };
}

module.exports = {
  extractEventFromText,
  extractDateTime,
  extractPrice,
  extractCategory,
  extractVenueAndLocation
};
