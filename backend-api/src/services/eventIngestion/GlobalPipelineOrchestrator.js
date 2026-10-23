'use strict';

const Source = require('../../models/Source');
const { sourceBlockers } = require('./sourcePolicy');
const { syncAgenda } = require('./agendaConnector');

// Only the registry supplies targets. No hardcoded cities, channels or websites.
async function runGlobalIngestionCycle({ dryRun = false, dueOnly = false } = {}) {
  const started = Date.now();
  const filter = { status: dueOnly ? 'active' : { $in: ['approved', 'active'] } };
  if (dueOnly) filter.$or = [{ 'syncSchedule.nextSyncDue': null }, { 'syncSchedule.nextSyncDue': { $lte: new Date() } }];
  // Sources due first; INGESTION_SOURCES_PER_CYCLE bounds one cycle so a large registry spreads over the day.
  const perCycle = Math.min(Math.max(Number(process.env.INGESTION_SOURCES_PER_CYCLE) || 50, 1), 500);
  const found = await Source.find(filter).sort({ 'syncSchedule.nextSyncDue': 1, sourceId: 1 }).limit(perCycle + 1);
  const sources = found.slice(0, perCycle);
  const stats = { totalRawEvents: 0, canonicalSaved: 0, created: 0, updated: 0,
    unchanged: 0, skipped: 0, duplicatesResolved: 0, previewCount: 0,
    eligibleSources: 0, blockedSources: 0, failedSources: 0, failedWrites: 0, durationMs: 0 };
  const runs = [], sampleEvents = [];
  for (const source of sources) {
    const blockers = sourceBlockers(source);
    if (blockers.length) {
      stats.blockedSources++;
      runs.push({ sourceId: source.sourceId, status: 'blocked', blockers });
      continue;
    }
    stats.eligibleSources++;
    try {
      const type = { ics_feed: 'ics', json_feed: 'json', wp_events_calendar: 'wp_the_events_calendar' }[source.adapterType] || source.adapterType;
      const result = await syncAgenda(source.accessConfig.endpointUrl, source.responsibleOrganizer, { type, source, dryRun });
      stats.totalRawEvents += result.detectedCount;
      for (const key of ['created', 'updated', 'unchanged', 'skipped', 'previewCount', 'failedWrites']) stats[key] += result[key];
      if (result.failedWrites) stats.failedSources++;
      stats.canonicalSaved += result.syncedCount;
      runs.push({ sourceId: source.sourceId, status: dryRun ? 'preview' : result.failedWrites ? 'partial' : 'completed', incomplete: result.incomplete,
        detected: result.detectedCount, created: result.created, updated: result.updated, skipped: result.skipped });
      sampleEvents.push(...result.events.slice(0, Math.max(0, 5 - sampleEvents.length)));
      if (!dryRun) {
        const now = new Date();
        await Source.updateOne({ _id: source._id }, { $set: {
          'metrics.lastHarvestAt': now, ...(!result.failedWrites ? { 'metrics.lastSuccessAt': now } : {}),
          'metrics.lastError': result.failedWrites ? 'partial_write_failure' : result.incomplete ? 'incomplete_feed' : '', 'metrics.consecutiveFailures': 0,
          'syncSchedule.nextSyncDue': new Date(now.getTime() + Math.min(168, Math.max(1, source.syncSchedule?.frequencyHours || 24)) * 3600000)
        }, $inc: { 'metrics.totalEventsHarvested': result.created } });
      }
    } catch {
      stats.failedSources++;
      runs.push({ sourceId: source.sourceId, status: 'failed', reason: 'source_sync_failed' });
      if (!dryRun) await Source.updateOne({ _id: source._id }, { $set: {
        'metrics.lastHarvestAt': new Date(), 'metrics.lastError': 'source_sync_failed'
      }, $inc: { 'metrics.consecutiveFailures': 1 } });
    }
  }
  stats.durationMs = Date.now() - started;
  return { success: stats.failedSources === 0, dryRun, stats, sampleEvents, sources: runs, incomplete: found.length > perCycle || runs.some(run => run.incomplete),
    message: !stats.eligibleSources ? 'No hay fuentes aprobadas y listas para importar' :
      dryRun ? 'Vista previa sin guardar eventos ni métricas' : 'Ciclo de importación terminado; las nuevas fichas requieren revisión' };
}

module.exports = { runGlobalIngestionCycle };
