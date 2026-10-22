'use strict';

// A research queue, not permission to harvest. Existing registry entries stay intact.
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const Source = require('../src/models/Source');
const candidates = [
  { sourceId: 'do-sic-cultura-candidate', name: 'RD · Sistema de Información Cultural (en evaluación)', country: 'DO',
    url: 'https://sic.cultura.gob.do/', terms: 'https://sic.cultura.gob.do/terminos',
    reason: 'Los términos autorizan al Ministerio a mostrar contenido de sus usuarios; falta permiso para redistribuirlo en EventNow y validar un feed de eventos.' },
  { sourceId: 'co-idartes-agenda-candidate', name: 'Colombia · Idartes Bogotá (en evaluación)', country: 'CO',
    url: 'https://www.idartes.gov.co/es/agenda',
    terms: 'https://www.idartes.gov.co/es/terminos-condiciones-web',
    reason: 'Agenda futura confirmada. Los términos protegen el contenido salvo indicación contraria: falta resolver la reutilización, un adaptador y coordenadas verificadas por sede. No se importan imágenes.' },
  { sourceId: 'pe-bnp-agenda-candidate', name: 'Perú · BNP datos culturales (histórico; buscar agenda futura)', country: 'PE',
    url: 'https://www.datosabiertos.gob.pe/dataset/eventos-culturales-publicados-%E2%80%93-bnp',
    reason: 'El recurso revisado contiene actividades de 2025; no es una fuente vigente de próximas actividades. Buscar agenda futura con hora, lugar y condiciones.' },
  { sourceId: 'br-ceara-mapa-candidate', name: 'Brasil · Mapa Cultural do Ceará (en evaluación)', country: 'BR',
    url: 'https://mapacultural.secult.ce.gov.br/', terms: 'https://mapacultural.secult.ce.gov.br/termos-de-uso',
    endpoint: 'https://mapacultural.secult.ce.gov.br/api/event/find',
    reason: 'API pública confirmada, con sesiones y precio; resolver permiso de redistribución y descartar coordenadas 0,0, direcciones ausentes y sesiones pasadas.' }
];

async function main() {
  const args = process.argv.slice(2), apply = args.includes('--apply');
  const backup = args.includes('--backup') ? args[args.indexOf('--backup') + 1] : null;
  if (!apply) return console.log(JSON.stringify({ apply, candidates }, null, 2));
  if (!backup || !path.isAbsolute(backup) || fs.existsSync(backup)) throw new Error('Se requiere --backup absoluto y nuevo');
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false, autoCreate: false });
  const prior = await Source.find({ sourceId: { $in: candidates.map(item => item.sourceId) } }).lean();
  fs.writeFileSync(backup, JSON.stringify({ checkedAt: new Date(), prior, candidates }, null, 2), { flag: 'wx' });
  for (const item of candidates) await Source.updateOne({ sourceId: item.sourceId }, { $setOnInsert: {
    sourceId: item.sourceId, name: item.name, domain: new URL(item.url).hostname, classification: 'W', status: 'evaluating', adapterType: 'rest_api',
    coverage: { country: item.country }, accessConfig: { documentationUrl: item.url, termsUrl: item.terms, endpointUrl: item.endpoint },
    license: { licenseType: 'Pendiente de revisión', commercialAllowed: false, displayAllowed: false, attributionText: item.reason }
  } }, { upsert: true, runValidators: true });
  console.log(JSON.stringify({ apply, candidates: candidates.map(item => ({ sourceId: item.sourceId, country: item.country, active: false })), note: 'No se importaron ni publicaron eventos desde estas fuentes. No se modificaron registros existentes.' }, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
