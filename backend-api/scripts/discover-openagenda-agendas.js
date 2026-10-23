/**
 * Busca agendas oficiales en OpenAgenda y las registra para revisión.
 * Requiere OPENAGENDA_API_KEY (cuenta gratuita en openagenda.com).
 * Nada se importa hasta que un administrador revisa cada agenda en /admin/sources.
 * Uso: node scripts/discover-openagenda-agendas.js --search=Lyon [--limit=50] [--all] [--apply]
 *   --all incluye agendas no oficiales (por defecto solo oficiales).
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Source = require('../src/models/Source');
const { fetchSource } = require('../src/services/eventIngestion/safeSourceFetch');

const arg = name => process.argv.find(a => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const search = String(arg('search') || '').trim();
const limit = Math.min(Math.max(Number(arg('limit')) || 50, 1), 500);
const officialOnly = !process.argv.includes('--all');
const apply = process.argv.includes('--apply');
const key = process.env.OPENAGENDA_API_KEY;

(async () => {
  if (!key) throw new Error('Configura OPENAGENDA_API_KEY: crea una cuenta gratuita en openagenda.com y copia tu clave pública');
  const agendas = [];
  let after = [];
  while (agendas.length < limit) {
    const url = new URL('https://api.openagenda.com/v2/agendas');
    url.searchParams.set('size', '100');
    if (officialOnly) url.searchParams.set('official', '1');
    if (search) url.searchParams.set('search', search);
    for (const field of ['uid', 'title', 'slug', 'official', 'description']) url.searchParams.append('includeFields[]', field);
    for (const value of after) url.searchParams.append('after[]', String(value));
    const { data } = await fetchSource(url.href, { headers: { key } });
    agendas.push(...(data.agendas || []));
    if (!Array.isArray(data.after) || !data.after.length || !(data.agendas || []).length) break;
    after = data.after;
  }
  const found = agendas.slice(0, limit);
  found.forEach(agenda => console.log(`  ${agenda.official ? '★' : ' '} ${agenda.uid} · ${agenda.title} · https://openagenda.com/${agenda.slug}`));
  console.log(`${found.length} agendas ${officialOnly ? 'oficiales ' : ''}encontradas${search ? ` para "${search}"` : ''}`);
  if (!apply || !found.length) return;
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    for (const agenda of found) {
      const sourceId = `openagenda-${agenda.uid}`;
      await Source.updateOne({ sourceId }, { $setOnInsert: {
        sourceId, name: agenda.title, domain: 'openagenda.com', classification: agenda.official ? 'O' : 'D', status: 'evaluating',
        adapterType: 'openagenda',
        accessConfig: { endpointUrl: `https://api.openagenda.com/v2/agendas/${agenda.uid}`, apiKeyRequired: false,
          // The reviewer records the agenda terms in /admin/sources; they vary per agenda.
          documentationUrl: `https://openagenda.com/${agenda.slug}` },
        license: { licenseType: 'Licence Ouverte 2.0 (según la agenda)', commercialAllowed: false, displayAllowed: false, attributionRequired: true, attributionText: `Fuente: ${agenda.title} vía OpenAgenda` },
        syncSchedule: { frequencyHours: 24 }
      } }, { upsert: true });
    }
    console.log(`Registradas para revisión en /admin/sources: ${found.length}`);
  } finally { await mongoose.disconnect(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
