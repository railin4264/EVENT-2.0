'use strict';

/**
 * Source Model - Registry of Event Sources
 * ------------------------------------------------------------------
 * Manages the global and local catalog of event data providers:
 * - Classification:
 *   D (Descubrimiento Documentado: Ticketmaster, AllEvents, OpenAgenda, PredictHQ)
 *   O (Organizador / "Conecta tu agenda": Eventbrite, Luma, pretix, Google Calendar)
 *   W (Web / Directorio Público: Uepa Tickets, TIX, RA RD, sitemaps)
 *   P (Prospecto a investigar)
 * - Lifecycle:
 *   discovered -> evaluating -> approved -> active -> degraded -> suspended -> retired
 */

const mongoose = require('mongoose');

const sourceSchema = new mongoose.Schema({
  sourceId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  domain: {
    type: String,
    trim: true,
    lowercase: true,
    index: true
  },
  classification: {
    type: String,
    enum: ['D', 'O', 'W', 'P'],
    default: 'D',
    index: true
  },
  status: {
    type: String,
    enum: ['discovered', 'evaluating', 'approved', 'active', 'degraded', 'suspended', 'retired'],
    default: 'evaluating',
    index: true
  },
  adapterType: {
    type: String,
    enum: [
      'rest_api',
      'graphql',
      'openagenda',
      'soda_socrata',
      'ics_feed',
      'json_feed',
      'schema_org_sitemap',
      'telegram_channel',
      'wp_events_calendar',
      'manual_organizer',
      'madrid_open_data',
      'helsinki_linked_events',
      'nyc_parks_open_data',
      'paris_open_data',
      'catalunya_open_data',
      'localist_calendar',
      'livewhale_calendar',
      'schema_org_page'
    ],
    default: 'rest_api'
  },
  coverage: {
    country: { type: String, uppercase: true, index: true },
    cities: [{ type: String, trim: true }],
    languages: [{ type: String, default: 'es' }],
    categories: [{ type: String, trim: true }]
  },
  accessConfig: {
    endpointUrl: { type: String, trim: true },
    apiKeyRequired: { type: Boolean, default: false },
    oauthRequired: { type: Boolean, default: false },
    documentationUrl: { type: String, trim: true },
    termsUrl: { type: String, trim: true }
  },
  license: {
    licenseType: { type: String, default: 'Unreviewed' },
    attributionRequired: { type: Boolean, default: false },
    attributionText: { type: String, trim: true },
    commercialAllowed: { type: Boolean, default: false },
    displayAllowed: { type: Boolean, default: false },
    reviewedAt: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    retentionDays: { type: Number, default: 90 }
  },
  rateLimits: {
    requestsPerSecond: { type: Number, default: 5 },
    dailyQuota: { type: Number, default: 5000 },
    currentUsageToday: { type: Number, default: 0 },
    lastResetDate: Date
  },
  metrics: {
    totalEventsHarvested: { type: Number, default: 0 },
    activeEventsCount: { type: Number, default: 0 },
    lastHarvestAt: Date,
    lastSuccessAt: Date,
    lastError: { type: String, trim: true },
    consecutiveFailures: { type: Number, default: 0 },
    qualityScore: { type: Number, default: 100 } // 0 to 100
  },
  responsibleOrganizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  eventDefaults: {
    freeAdmissionConfirmed: { type: Boolean, default: false },
    currency: { type: String, trim: true, uppercase: true }
  },
  syncSchedule: {
    frequencyHours: { type: Number, default: 24 }, // 1 to 168
    nextSyncDue: Date
  }
}, {
  timestamps: true
});

sourceSchema.index({ status: 1, 'coverage.country': 1 });
sourceSchema.index({ classification: 1, adapterType: 1 });

module.exports = mongoose.model('Source', sourceSchema);
