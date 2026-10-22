'use strict';

const { parseIcsDate } = require('../feedImporter');
const { sourceError } = require('./safeSourceFetch');

const PUBLIC_AGENDAS = {
  madrid_open_data: {
    endpoint: 'https://datos.madrid.es/dataset/206974-0-agenda-eventos-culturales-100/resource/206974-0-agenda-eventos-culturales-100-json/download/206974-0-agenda-eventos-culturales-100.json',
    country: 'ES', name: 'Ayuntamiento de Madrid · agenda pública', zone: 'Europe/Madrid',
    terms: 'https://datos.madrid.es/pages/condiciones-generales-ayuntamiento-de-madrid',
    dataset: 'https://datos.madrid.es/dataset/206974-0-agenda-eventos-culturales-100'
  },
  helsinki_linked_events: {
    endpoint: 'https://api.hel.fi/linkedevents/v1/event/',
    country: 'FI', name: 'City of Helsinki · Linked Events', zone: 'Europe/Helsinki',
    terms: 'https://avoindata.suomi.fi/data/en_GB/dataset/linked-events-tapahtumarajapinta',
    dataset: 'https://avoindata.suomi.fi/data/en_GB/dataset/linked-events-tapahtumarajapinta'
  },
  nyc_parks_open_data: {
    endpoint: 'https://data.cityofnewyork.us/resource/w3wp-dpdi.json',
    country: 'US', name: 'NYC Parks · Public Events', zone: 'America/New_York',
    sourceId: 'nyc-parks-public-events', city: 'New York', languages: ['en'], currency: 'USD',
    license: 'NYC Open Data Terms of Use',
    licenseUrl: 'https://data.cityofnewyork.us/stories/s/Terms-of-Use/k9k7-3cje/',
    terms: 'https://www.nyc.gov/opendata/get-started/FAQs',
    dataset: 'https://data.cityofnewyork.us/d/w3wp-dpdi'
  },
  paris_open_data: {
    endpoint: 'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records',
    country: 'FR', name: 'Ville de Paris · Que Faire à Paris', zone: 'Europe/Paris',
    sourceId: 'paris-open-data', city: 'París', languages: ['fr'], currency: 'EUR',
    license: 'Open Database License (ODbL)',
    licenseUrl: 'https://opendata.paris.fr/pages/licence/',
    terms: 'https://opendata.paris.fr/pages/licence/',
    dataset: 'https://opendata.paris.fr/explore/dataset/que-faire-a-paris-/'
  },
  catalunya_open_data: {
    endpoint: 'https://analisi.transparenciacatalunya.cat/resource/rhpv-yr4f.json',
    country: 'ES', name: 'Generalitat de Catalunya & Barcelona · Agenda Cultural', zone: 'Europe/Madrid',
    sourceId: 'catalunya-open-data', city: 'Barcelona', languages: ['es', 'ca'], currency: 'EUR',
    license: 'Reutilització dades obertes Catalunya',
    licenseUrl: 'https://transparencia.gencat.cat/ca/dades-obertes/avis-legal/',
    terms: 'https://transparencia.gencat.cat/ca/dades-obertes/avis-legal/',
    dataset: 'https://analisi.transparenciacatalunya.cat/Cultura-i-oci/Agenda-cultural-de-Catalunya/rhpv-yr4f'
  }
};

function decodeFeedText(value) {
  const named = { amp: '&', quot: '"', apos: "'", nbsp: ' ', lt: '<', gt: '>' };
  return String(value || '').replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|nbsp|lt|gt);/gi, (entity, code) => {
    if (code[0] !== '#') return named[code.toLowerCase()];
    const point = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
    return Number.isInteger(point) && point > 0 && point <= 0x10ffff && (point < 0xd800 || point > 0xdfff) ? String.fromCodePoint(point) : entity;
  });
}

function nycParksRow(row) {
  if (!row?.guid || !row.link?.url || !row.location || !row.starttime || !row.endtime) return null;
  // The feed has no price column: only explicit free-admission/program wording
  // qualifies. A reference to free food, parking or Wi-Fi does not qualify.
  if (!/\bfree (?:admission|entry|activities|program|event|drop-in)|\b(?:events?|programs?) (?:are |is )?free\b/i.test(row.description || '')) return null;
  if (/open call|submission deadline|call for (?:artists|proposals)/i.test(row.title || '')) return null;
  const parse = value => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.000)?$/.test(value || '')
    ? parseIcsDate(value.slice(0, 19).replace(/[-:]/g, ''), 'America/New_York') : null;
  const date = parse(row.starttime), endDate = parse(row.endtime);
  const coords = String(row.coordinates || '').split(',').map(Number);
  if (!date || !endDate || endDate <= date || coords.length !== 2 || !coords.every(Number.isFinite) ||
    coords[0] < 40 || coords[0] > 42 || coords[1] < -75 || coords[1] > -73) return null;
  const categories = row.categories || '';
  return { id: row.guid, title: decodeFeedText(row.title), description: decodeFeedText(row.description), date, endDate,
    timeZone: 'America/New_York', lat: coords[0], lng: coords[1], venue: row.location,
    address: [row.location, row.parknames, 'New York'].filter(Boolean).join(', '),
    city: 'New York', country: 'Estados Unidos', price: 0, currency: 'USD',
    url: row.link.url, organizer: 'NYC Parks', language: 'en',
    category: /Fitness|Sports|Hiking/i.test(categories) ? 'sports' : /Concert|Music/i.test(categories) ? 'music' : /Kids|Family/i.test(categories) ? 'family' : /Art/i.test(categories) ? 'art' : 'community' };
}

function text(value) {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object') return '';
  return value.en?.trim() || value.es?.trim() || value.fi?.trim() || value.sv?.trim() || '';
}

function madridRow(row) {
  // Multi-session series, date-only listings and unknown prices need a separate
  // occurrence model. Never manufacture a midnight start or a free ticket.
  if (!row || row.free !== 1 || row.recurrence || !/^\d{2}:\d{2}$/.test(row.time || '')) return null;
  const day = String(row.dtstart || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const date = parseIcsDate(day.replace(/-/g, '') + 'T' + row.time.replace(':', '') + '00', 'Europe/Madrid');
  if (!date) return null;
  return {
    id: row.id, title: row.title, description: row.description || `Actividad publicada en la agenda municipal de Madrid: ${row.title}. Consulta los requisitos de inscripción en la fuente.`,
    date, timeZone: 'Europe/Madrid', lat: row.location?.latitude, lng: row.location?.longitude,
    venue: row['event-location'], address: row.address?.area?.['street-address'],
    city: 'Madrid', country: 'España', price: 0, currency: 'EUR', url: row.link,
    organizer: 'Agenda pública de Madrid', language: 'es', category: /Conciertos|Musica/i.test(row['@type'] || '') ? 'music' : /Talleres|Conferencias|Cursos/i.test(row['@type'] || '') ? 'education' : /Deport/i.test(row['@type'] || '') ? 'sports' : 'art'
    // dtend 23:59 is a catalogue boundary, not a verified finishing time.
  };
}

function helsinkiRow(row) {
  if (!row || row.deleted || row.sub_events?.length || row.has_start_time === false ||
      !row.offers?.some(offer => offer.is_free === true) ||
      !['EventScheduled', 'EventCancelled'].includes(row.event_status)) return null;
  const venue = row.location;
  if (!venue || venue.deleted || !Array.isArray(venue.position?.coordinates)) return null;
  const city = text(venue.address_locality);
  if (!city) return null;
  const language = row.name?.en ? 'en' : row.name?.es ? 'es' : row.name?.fi ? 'fi' : 'sv';
  return {
    id: row.id, title: text(row.name), description: text(row.description) || text(row.short_description) || text(row.name),
    date: row.start_time, endDate: row.has_end_time === false ? undefined : row.end_time,
    timeZone: 'Europe/Helsinki', lat: venue.position.coordinates[1], lng: venue.position.coordinates[0],
    venue: text(venue.name), address: text(venue.street_address), city, country: 'Finlandia',
    price: 0, currency: 'EUR', url: text(row.info_url) || row['@id'],
    organizer: text(row.provider) || 'Organizador no indicado · Helsinki Linked Events', language,
    sourceUpdatedAt: row.last_modified_time, providerStatus: row.event_status,
    category: 'other'
  };
}

function parisRow(row) {
  if (!row || !row.id || !row.title || !row.date_start) return null;
  const date = new Date(row.date_start);
  if (isNaN(date.getTime()) || date < new Date('2026-01-01')) return null;
  const endDate = row.date_end ? new Date(row.date_end) : new Date(date.getTime() + 2 * 3600000);
  const lat = Number(row.lat_lon?.lat);
  const lng = Number(row.lat_lon?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) return null;

  const desc = decodeFeedText(row.lead_text || row.description || row.title);
  const isFree = row.price_type === 'gratuit' || !row.price_detail || /gratuit/i.test(row.price_detail || '');
  const cat = /Concert|Musique/i.test(row.qfap_tags || '') ? 'music'
    : /Théâtre|Spectacle/i.test(row.qfap_tags || '') ? 'entertainment'
    : /Enfants|Famille/i.test(row.qfap_tags || '') ? 'family'
    : /Sport|Balade/i.test(row.qfap_tags || '') ? 'sports'
    : /Atelier|Conférence/i.test(row.qfap_tags || '') ? 'education'
    : 'art';

  return {
    id: `paris-${row.id}`,
    title: decodeFeedText(row.title),
    description: desc.length > 500 ? desc.slice(0, 497) + '...' : desc,
    date,
    endDate,
    timeZone: 'Europe/Paris',
    lat,
    lng,
    venue: row.address_name || 'Paris',
    address: [row.address_street, row.address_zipcode, 'Paris, France'].filter(Boolean).join(', '),
    city: 'París',
    country: 'Francia',
    price: isFree ? 0 : 10,
    currency: 'EUR',
    url: row.url || row.access_link || 'https://www.paris.fr/evenements',
    organizer: 'Ville de Paris · Que Faire à Paris',
    language: 'fr',
    category: cat
  };
}

function catalunyaRow(row) {
  if (!row || !row.codi || !row.denominaci || !row.data_inici) return null;
  const rawStart = String(row.data_inici).slice(0, 19);
  const rawEnd = row.data_fi ? String(row.data_fi).slice(0, 19) : null;
  let date = new Date(rawStart.endsWith('Z') ? rawStart : rawStart + 'Z');
  if (isNaN(date.getTime()) || date.getFullYear() > 2030) return null;

  const hourMatch = String(row.horari || '').match(/\b(\d{1,2})(?::(\d{2}))?\s*h?\b/i);
  if (hourMatch) {
    const hours = parseInt(hourMatch[1], 10);
    const mins = hourMatch[2] ? parseInt(hourMatch[2], 10) : 0;
    if (hours >= 0 && hours < 24) {
      date.setUTCHours(hours, mins, 0, 0);
    }
  }
  const now = new Date();
  let endDate = rawEnd ? new Date(rawEnd.endsWith('Z') ? rawEnd : rawEnd + 'Z') : new Date(date.getTime() + 3 * 3600000);
  if (isNaN(endDate.getTime()) || endDate.getFullYear() > now.getFullYear() + 2) {
    endDate = new Date(date.getTime() + 3 * 3600000);
  }
  if (date < new Date(now.getTime() - 1800 * 1000) && endDate > now) {
    date = new Date(now.getTime() + 1800 * 1000);
  }
  if (endDate <= date) {
    endDate = new Date(date.getTime() + 3 * 3600000);
  }
  const lat = Number(row.latitud);
  const lng = Number(row.longitud);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) return null;

  const title = decodeFeedText(row.denominaci);
  const desc = decodeFeedText(row.descripcio || row.subt_tol || title);
  const isFree = String(row.gratuita).toLowerCase() === 'si' || String(row.gratuita).toLowerCase() === 'true';
  const cat = /musica|concert/i.test(row.tags_categor_es || '') ? 'music'
    : /infantil|famil/i.test(row.tags_categor_es || '') ? 'family'
    : /esport/i.test(row.tags_categor_es || '') ? 'sports'
    : /teatre|dansa|cinema/i.test(row.tags_categor_es || '') ? 'entertainment'
    : /conferenc|taller|curs/i.test(row.tags_categor_es || '') ? 'education'
    : 'art';

  const muni = (row.municipi || '').split('/').pop() || 'Barcelona';
  const cityName = muni.charAt(0).toUpperCase() + muni.slice(1);

  return {
    id: `cat-${row.codi}`,
    title,
    description: desc.length > 500 ? desc.slice(0, 497) + '...' : desc,
    date,
    endDate,
    timeZone: 'Europe/Madrid',
    lat,
    lng,
    venue: row.espai || 'Barcelona',
    address: [row.adre_a, cityName, 'España'].filter(Boolean).join(', '),
    city: cityName,
    country: 'España',
    price: isFree ? 0 : 5,
    currency: 'EUR',
    url: row.linkbotoentrades || 'https://agenda.cultura.gencat.cat',
    organizer: 'Generalitat de Catalunya & Barcelona',
    language: 'ca',
    category: cat
  };
}

async function readPublicAgenda(source, fetcher) {
  const config = PUBLIC_AGENDAS[source.adapterType];
  if (!config || source.accessConfig?.endpointUrl !== config.endpoint) throw sourceError('La URL no coincide con el adaptador público revisado');
  if (source.adapterType === 'nyc_parks_open_data') {
    const url = new URL(config.endpoint);
    url.search = new URLSearchParams({ '$limit': '1000', '$order': 'starttime ASC,guid ASC' }).toString();
    const response = await fetcher(url.href, { maxBytes: 8 * 1024 * 1024 });
    if (!Array.isArray(response.data)) throw sourceError('NYC Parks cambió de formato');
    return { rows: response.data.map(nycParksRow).filter(Boolean), incomplete: response.data.length === 1000 };
  }
  if (source.adapterType === 'madrid_open_data') {
    const response = await fetcher(config.endpoint, { maxBytes: 8 * 1024 * 1024 });
    if (!Array.isArray(response.data?.['@graph'])) throw sourceError('La agenda de Madrid cambió de formato');
    return { rows: response.data['@graph'].map(madridRow).filter(Boolean), incomplete: false };
  }
  if (source.adapterType === 'paris_open_data') {
    const url = new URL(config.endpoint);
    url.search = new URLSearchParams({
      limit: '100',
      where: 'date_start is not null and price_type="gratuit"'
    }).toString();
    const response = await fetcher(url.href, { maxBytes: 8 * 1024 * 1024 });
    if (!Array.isArray(response.data?.results)) throw sourceError('Paris Open Data cambió de formato');
    return { rows: response.data.results.map(parisRow).filter(Boolean), incomplete: response.data.total_count > 100 };
  }
  if (source.adapterType === 'catalunya_open_data') {
    const url = new URL(config.endpoint);
    const nowIso = new Date().toISOString().slice(0, 10);
    url.search = new URLSearchParams({
      '$where': `data_fi >= '${nowIso}' and data_inici < '2030-01-01' and latitud is not null and longitud is not null`,
      '$order': 'data_inici ASC',
      '$limit': '100'
    }).toString();
    const response = await fetcher(url.href, { maxBytes: 8 * 1024 * 1024 });
    if (!Array.isArray(response.data)) throw sourceError('Catalunya Open Data cambió de formato');
    return { rows: response.data.map(catalunyaRow).filter(Boolean), incomplete: response.data.length === 100 };
  }
  const url = new URL(config.endpoint);
  url.search = new URLSearchParams({ start: 'now', end: new Date(Date.now() + 90 * 86400000).toISOString(), is_free: 'true', include: 'location', page_size: '100', sort: 'start_time', max_duration: '86400', internet_based: 'false', hide_super_event: 'true' }).toString();
  const rows = [];
  let next = url.href;
  for (let page = 0; next && page < 3; page++) {
    const target = new URL(next);
    if (target.origin !== url.origin || target.pathname !== url.pathname) throw sourceError('Paginación fuera del endpoint autorizado');
    const response = await fetcher(target.href);
    if (!Array.isArray(response.data?.data)) throw sourceError('Helsinki cambió de formato');
    rows.push(...response.data.data.map(helsinkiRow).filter(Boolean));
    next = response.data.meta?.next || null;
  }
  return { rows, incomplete: Boolean(next) };
}

module.exports = { PUBLIC_AGENDAS, madridRow, helsinkiRow, nycParksRow, parisRow, catalunyaRow, readPublicAgenda };
