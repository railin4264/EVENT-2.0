'use strict';

// Static catalogs hold hand-written events whose dates are computed relative to
// "now", so every run pushes them forward again. They are demo fixtures, never
// real agenda data: they may only write in explicitly enabled development.
function demoCatalogEnabled() {
  return process.env.NODE_ENV === 'development' && process.env.ENABLE_DEMO_DATA === 'true';
}

const DEMO_CATALOG_SKIP = Object.freeze({ success: true, skipped: true, reason: 'Demo catalog disabled', created: 0, updated: 0, total: 0 });

// How each static catalog marks the events it wrote, used to retire them.
const FABRICATED_CATALOG_FILTERS = [
  { source: { $in: ['planetary_catalog', 'rd_tickets_lidom', 'university_agenda', 'civic_political_agenda', 'astronomy_open_science', 'demo_catalog', 'clinicaltrials.gov'] } },
  { 'publicSource.platform': { $in: ['fashion_editorial_harvester', 'global_metropolis_harvester'] } },
  { 'pipelineMeta.rawSchemaType': 'planetary_catalog' }
];

module.exports = { demoCatalogEnabled, DEMO_CATALOG_SKIP, FABRICATED_CATALOG_FILTERS };
