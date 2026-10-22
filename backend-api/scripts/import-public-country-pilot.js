'use strict';

// Explicit, recoverable first publication of reviewed open-data country pilots.
// Default is preview only. --apply requires a NEW absolute --backup path.
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const Source = require('../src/models/Source');
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const { PUBLIC_AGENDAS } = require('../src/services/eventIngestion/publicAgendaAdapters');
const { sourceBlockers } = require('../src/services/eventIngestion/sourcePolicy');
const { syncAgenda } = require('../src/services/eventIngestion/agendaConnector');

async function main() {
  const args = process.argv.slice(2), apply = args.includes('--apply');
  const option = name => args[args.indexOf(name) + 1];
  const country = args.includes('--country') ? option('--country').toUpperCase() : null;
  if (apply && !country) throw new Error('--apply exige --country para no publicar lotes pendientes de otros países');
  if (country && !Object.values(PUBLIC_AGENDAS).some(config => config.country === country)) throw new Error('País sin adaptador público revisado');
  const backup = args.includes('--backup') ? option('--backup') : null;
  if (apply && (!backup || !path.isAbsolute(backup) || fs.existsSync(backup))) throw new Error('--apply exige una ruta --backup absoluta y nueva');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eventconnect', { autoIndex: false, autoCreate: false });
  const owners = await User.find({ role: 'admin', isActive: true }).limit(2);
  if (owners.length !== 1) throw new Error('Se necesita un único administrador activo para este piloto');
  const owner = owners[0], now = new Date();
  const plans = Object.entries(PUBLIC_AGENDAS).filter(([, config]) => !country || config.country === country).map(([adapterType, config]) => ({
    sourceId: config.sourceId || (config.country === 'ES' ? 'madrid-datos-abiertos' : 'helsinki-linked-events'),
    name: config.name, domain: new URL(config.endpoint).hostname, classification: 'D', status: 'active', adapterType,
    coverage: { country: config.country, cities: [config.city || (config.country === 'ES' ? 'Madrid' : 'Helsinki')], languages: config.languages || (config.country === 'ES' ? ['es'] : ['en', 'fi', 'sv']) },
    accessConfig: { endpointUrl: config.endpoint, apiKeyRequired: false, oauthRequired: false, termsUrl: config.terms, documentationUrl: config.dataset },
    license: { licenseType: config.license || 'CC BY 4.0', commercialAllowed: true, displayAllowed: true, attributionRequired: true,
      attributionText: `Origen de los datos: ${config.name}. Adaptación de formato por EventNow; sin afiliación ni patrocinio.`, reviewedAt: now, reviewedBy: owner._id, retentionDays: 90 },
    responsibleOrganizer: owner._id, eventDefaults: { currency: config.currency || 'EUR', freeAdmissionConfirmed: false },
    syncSchedule: { frequencyHours: 12, nextSyncDue: now }
  }));
  const priorSources = await Source.find({ sourceId: { $in: plans.map(plan => plan.sourceId) } }).lean();
  const prefix = new RegExp('^(?:' + plans.map(plan => plan.sourceId).join('|') + '):');
  const priorEvents = await Event.find({ source: 'registered_agenda', sourceId: prefix }).lean();
  if (apply) fs.writeFileSync(backup, JSON.stringify({ checkedAt: now, sourceIds: plans.map(plan => plan.sourceId), sources: priorSources, events: priorEvents }, null, 2), { flag: 'wx' });
  const results = [];
  for (const plan of plans) {
    if (sourceBlockers(plan).length) throw new Error('La configuración revisada tiene bloqueos');
    const preview = await syncAgenda(plan.accessConfig.endpointUrl, owner.id, { source: plan, dryRun: true });
    if (!preview.previewCount) { results.push({ country: plan.coverage.country, preview: 0, published: 0 }); continue; }
    if (!apply) { results.push({ country: plan.coverage.country, preview: preview.previewCount, incomplete: preview.incomplete, sample: preview.events.map(event => ({ title: event.title, date: event.date, location: event.location })) }); continue; }
    await Source.findOneAndUpdate({ sourceId: plan.sourceId }, { $set: plan }, { upsert: true, runValidators: true });
    const run = await syncAgenda(plan.accessConfig.endpointUrl, owner.id, { source: plan });
    if (run.failedWrites) throw new Error('La importación tiene escrituras fallidas; no se publica automáticamente');
    const candidates = await Event.find({ source: 'registered_agenda', sourceId: new RegExp('^' + plan.sourceId + ':'),
      createdBy: owner._id, status: 'pending_review', archivedAt: null, imported: true,
      date: { $gt: new Date() }, 'price.amount': 0, 'price.currency': plan.eventDefaults.currency,
      'publicSource.license': plan.license.licenseType, 'publicSource.providerStatus': 'EventScheduled', externalUrl: { $regex: '^https?://' }
    }).sort({ date: 1, _id: 1 }).limit(100);
    // Revalidate every exact record to be published. No sample/template events.
    for (const event of candidates) await event.validate();
    fs.writeFileSync(backup + '.' + plan.coverage.country + '.publication.json', JSON.stringify({ reviewedAt: new Date(),
      review: 'Structural open-data pilot validation; source attribution, future date, coordinates and explicitly free admission. No claim of organizer verification.',
      sourceId: plan.sourceId, ids: candidates.map(event => event.id) }, null, 2), { flag: 'wx' });
    const publication = await Event.updateMany({ _id: { $in: candidates.map(event => event._id) }, status: 'pending_review', createdBy: owner._id }, { $set: { status: 'published', isOfficial: false, isFeatured: false } });
    await Source.updateOne({ sourceId: plan.sourceId }, { $set: { 'metrics.lastHarvestAt': new Date(), 'metrics.lastSuccessAt': new Date(),
      'metrics.lastError': run.incomplete ? 'incomplete_feed' : '', 'syncSchedule.nextSyncDue': new Date(Date.now() + 12 * 3600000) }, $inc: { 'metrics.totalEventsHarvested': run.created } });
    results.push({ country: plan.coverage.country, preview: preview.previewCount, created: run.created, updated: run.updated, published: publication.modifiedCount, incomplete: run.incomplete, sampleIds: candidates.slice(0, 3).map(event => event.id) });
  }
  console.log(JSON.stringify({ apply, results, note: 'Bounded initial pilot, not exhaustive country coverage. Subsequent new imports remain pending moderation.' }, null, 2));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
