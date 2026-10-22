'use strict';

const { sourceUrl } = require('./safeSourceFetch');
const { PUBLIC_AGENDAS } = require('./publicAgendaAdapters');

// An adapter name or a public website is not evidence of permission or readiness.
const SUPPORTED_ADAPTERS = new Set(['ics_feed', 'json_feed', 'wp_events_calendar', ...Object.keys(PUBLIC_AGENDAS)]);

function sourceBlockers(source) {
  const blockers = [];
  if (!['approved', 'active'].includes(source.status)) blockers.push('source_not_approved');
  if (source.classification === 'P') blockers.push('prospect_only');
  if (source.license?.commercialAllowed !== true || source.license?.displayAllowed !== true ||
      !source.license?.reviewedAt || !source.license?.reviewedBy) blockers.push('permission_not_reviewed');
  if (!source.accessConfig?.termsUrl) blockers.push('terms_missing');
  if (!SUPPORTED_ADAPTERS.has(source.adapterType)) blockers.push('adapter_not_ready');
  if (PUBLIC_AGENDAS[source.adapterType] && source.accessConfig?.endpointUrl !== PUBLIC_AGENDAS[source.adapterType].endpoint) blockers.push('invalid_endpoint');
  if (source.accessConfig?.apiKeyRequired || source.accessConfig?.oauthRequired) blockers.push('credentials_integration_pending');
  if (!source.responsibleOrganizer) blockers.push('responsible_organizer_missing');
  try { sourceUrl(source.accessConfig?.endpointUrl); } catch { blockers.push('invalid_endpoint'); }
  return blockers;
}

module.exports = { sourceBlockers, SUPPORTED_ADAPTERS };
