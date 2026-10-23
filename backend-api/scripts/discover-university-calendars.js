/**
 * Descubre calendarios públicos de universidades de un país y los registra para revisión.
 * Lista de universidades: Research Organization Registry (ROR, https://ror.org, datos CC0).
 * Cada calendario encontrado entra como fuente "evaluating": nada se importa hasta que un
 * administrador revisa sus condiciones en /admin/sources.
 * Uso: node scripts/discover-university-calendars.js --country=DO [--limit=100] [--apply]
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const axios = require('axios');
const mongoose = require('mongoose');
const Source = require('../src/models/Source');
const { fetchSource } = require('../src/services/eventIngestion/safeSourceFetch');
const { probeUniversityCalendar } = require('../src/services/eventIngestion/universityCalendarAdapters');

const arg = name => process.argv.find(a => a.startsWith(`--${name}=`))?.split('=')[1];
const country = String(arg('country') || '').toUpperCase();
const limit = Math.min(Math.max(Number(arg('limit')) || 100, 1), 2000);
const apply = process.argv.includes('--apply');
const HIGHER_EDUCATION = /univers|college|institut|polytechn|politécn|politecn|hochschule|école|escuela superior|facultad|academia|academy|conservator/i;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function universities() {
  const list = [];
  for (let page = 1; list.length < limit; page++) {
    const { data } = await axios.get('https://api.ror.org/v2/organizations', {
      params: { filter: `types:education,country.country_code:${country}`, page }, timeout: 30000
    });
    for (const org of data.items || []) {
      const website = (org.links || []).find(link => link.type === 'website')?.value;
      const name = org.names?.find(n => n.types?.includes('ror_display'))?.value || org.names?.[0]?.value || '';
      // ROR "education" also lists schools and districts; keep higher education only.
      if (!website || !HIGHER_EDUCATION.test(org.names.map(n => n.value).join(' '))) continue;
      list.push({
        rorId: org.id, website,
        name,
        city: org.locations?.[0]?.geonames_details?.name
      });
    }
    if (!data.items?.length || page * 20 >= data.number_of_results) break;
    await pause(200);
  }
  return list.slice(0, limit);
}

(async () => {
  if (!/^[A-Z]{2}$/.test(country)) throw new Error('Indica --country con el código ISO de dos letras, por ejemplo --country=DO');
  const candidates = await universities();
  console.log(`${candidates.length} universidades con sitio web en ${country} (ROR)`);
  const found = [];
  for (const university of candidates) {
    const calendar = await probeUniversityCalendar(university.website, fetchSource);
    if (calendar) {
      found.push({ ...university, ...calendar });
      console.log(`  ✓ ${university.name} · ${calendar.adapterType} · ${calendar.origin} · ${calendar.upcoming} próximos`);
    }
    await pause(300);
  }
  console.log(`${found.length} calendarios compatibles encontrados`);
  if (!apply || !found.length) return;
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    for (const item of found) {
      const sourceId = 'univ-' + new URL(item.origin).hostname.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      await Source.updateOne({ sourceId }, { $setOnInsert: {
        sourceId, name: item.name, domain: new URL(item.origin).hostname, classification: 'O', status: 'evaluating',
        adapterType: item.adapterType,
        coverage: { country, cities: item.city ? [item.city] : [], categories: ['education'] },
        accessConfig: { endpointUrl: item.endpoint || item.origin, apiKeyRequired: false, documentationUrl: item.website },
        license: { licenseType: 'Calendario institucional público', commercialAllowed: false, displayAllowed: false, attributionRequired: true, attributionText: 'Fuente: ' + item.name },
        syncSchedule: { frequencyHours: 24 }
      } }, { upsert: true });
    }
    console.log(`Registradas para revisión en /admin/sources: ${found.length}`);
  } finally { await mongoose.disconnect(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
