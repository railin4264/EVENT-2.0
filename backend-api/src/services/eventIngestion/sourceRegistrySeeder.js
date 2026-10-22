'use strict';

/**
 * Source Registry Initializer & Seeder
 * ------------------------------------------------------------------
 * Populates the Source Registry with the verified Dominican and
 * international discovery, institutional, and open data sources.
 */

const Source = require('../../models/Source');
const logger = require('../../utils/logger') || console;

const SEED_SOURCES = [
  {
    sourceId: 'ticketmaster-discovery',
    name: 'Ticketmaster Discovery API v2',
    domain: 'ticketmaster.com',
    classification: 'D',
    status: 'evaluating',
    adapterType: 'rest_api',
    coverage: {
      country: 'US',
      cities: ['New York', 'Miami', 'Santo Domingo'],
      languages: ['en', 'es'],
      categories: ['music', 'sports', 'entertainment']
    },
    accessConfig: {
      endpointUrl: 'https://app.ticketmaster.com/discovery/v2/events.json',
      apiKeyRequired: true,
      documentationUrl: 'https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/'
    },
    license: {
      licenseType: 'Commercial API Terms',
      attributionRequired: true,
      attributionText: 'Datos provistos por Ticketmaster Discovery'
    },
    rateLimits: {
      requestsPerSecond: 5,
      dailyQuota: 5000
    }
  },
  {
    sourceId: 'openagenda-public',
    name: 'OpenAgenda Open Data Platform',
    domain: 'openagenda.com',
    classification: 'D',
    status: 'evaluating',
    adapterType: 'openagenda',
    coverage: {
      country: 'FR',
      cities: ['París', 'Lyon', 'Madrid', 'Santo Domingo'],
      languages: ['fr', 'es', 'en'],
      categories: ['culture', 'art', 'education']
    },
    accessConfig: {
      endpointUrl: 'https://api.openagenda.com/v2/',
      apiKeyRequired: false,
      documentationUrl: 'https://developers.openagenda.com/'
    },
    license: {
      licenseType: 'Licence Ouverte 2.0',
      attributionRequired: true,
      attributionText: 'Agenda cultural provista bajo Licence Ouverte 2.0 por OpenAgenda'
    }
  },
  {
    sourceId: 'madrid-datos-abiertos',
    name: 'Ayuntamiento de Madrid: Agenda de Actividades',
    domain: 'datos.madrid.es',
    classification: 'D',
    status: 'evaluating',
    adapterType: 'json_feed',
    coverage: {
      country: 'ES',
      cities: ['Madrid'],
      languages: ['es'],
      categories: ['culture', 'family', 'outdoors']
    },
    accessConfig: {
      endpointUrl: 'https://datos.madrid.es/id/dataset/300107-0-agenda-actividades-eventos/resource/300107-5-agenda-actividades-eventos-json',
      apiKeyRequired: false,
      documentationUrl: 'https://datos.madrid.es/'
    },
    license: {
      licenseType: 'CC BY 4.0 / Datos Abiertos Madrid',
      attributionRequired: true,
      attributionText: 'Fuente: Ayuntamiento de Madrid (datos.madrid.es)'
    }
  },
  {
    sourceId: 'uepa-tickets-rd',
    name: 'Uepa Tickets República Dominicana',
    domain: 'uepatickets.com',
    classification: 'W',
    status: 'evaluating',
    adapterType: 'schema_org_sitemap',
    coverage: {
      country: 'DO',
      cities: ['Santo Domingo', 'Santiago', 'Punta Cana'],
      languages: ['es'],
      categories: ['music', 'theater', 'sports']
    },
    accessConfig: {
      endpointUrl: 'https://uepatickets.com/tickets/es-do/listaEventos',
      apiKeyRequired: false,
      documentationUrl: 'https://uepatickets.com'
    },
    license: {
      licenseType: 'Public Web Listings',
      attributionRequired: true,
      attributionText: 'Información pública de cartelera Uepa Tickets'
    }
  },
  {
    sourceId: 'tix-events-rd',
    name: 'TIX República Dominicana',
    domain: 'events.tix.do',
    classification: 'W',
    status: 'evaluating',
    adapterType: 'schema_org_sitemap',
    coverage: {
      country: 'DO',
      cities: ['Santo Domingo', 'Santiago', 'Las Terrenas'],
      languages: ['es'],
      categories: ['entertainment', 'culture', 'party']
    },
    accessConfig: {
      endpointUrl: 'https://events.tix.do',
      apiKeyRequired: false,
      documentationUrl: 'https://events.tix.do'
    },
    license: {
      licenseType: 'Public Web Listings',
      attributionRequired: true,
      attributionText: 'Cartelera pública TIX.do'
    }
  },
  {
    sourceId: 'godominicanrepublic-turismo',
    name: 'GoDominicanRepublic (Agenda Oficial Turismo)',
    domain: 'godominicanrepublic.com',
    classification: 'W',
    status: 'evaluating',
    adapterType: 'schema_org_sitemap',
    coverage: {
      country: 'DO',
      cities: ['Santo Domingo', 'Punta Cana', 'Samaná', 'Puerto Plata', 'Jarabacoa'],
      languages: ['es', 'en'],
      categories: ['culture', 'outdoors', 'food']
    },
    accessConfig: {
      endpointUrl: 'https://www.godominicanrepublic.com/things-to-do/entertainment-and-events',
      apiKeyRequired: false,
      documentationUrl: 'https://www.godominicanrepublic.com'
    },
    license: {
      licenseType: 'Public Tourism Calendar',
      attributionRequired: true,
      attributionText: 'Ministerio de Turismo de la República Dominicana'
    }
  },
  {
    sourceId: 'telegram-coros-rd',
    name: 'Canales Comunitarios de Telegram RD',
    domain: 't.me',
    classification: 'W',
    status: 'evaluating',
    adapterType: 'telegram_channel',
    coverage: {
      country: 'DO',
      cities: ['Santo Domingo', 'Santiago'],
      languages: ['es'],
      categories: ['party', 'social', 'community']
    },
    accessConfig: {
      endpointUrl: 'https://t.me/s/EventNowRD',
      apiKeyRequired: false,
      documentationUrl: 'https://core.telegram.org'
    },
    license: {
      licenseType: 'Public Channel Broadcasts (Zero-Auth)',
      attributionRequired: false
    }
  },
  {
    sourceId: 'organizer-agenda-connect',
    name: 'Conecta tu Agenda (Organizador Directo)',
    domain: 'eventnow.do',
    classification: 'O',
    status: 'evaluating',
    adapterType: 'ics_feed',
    coverage: {
      country: 'DO',
      cities: ['Todas'],
      languages: ['es', 'en'],
      categories: ['community', 'business', 'education', 'wellness']
    },
    accessConfig: {
      endpointUrl: 'https://eventnow.do/api/events/connect-agenda',
      apiKeyRequired: false,
      documentationUrl: 'https://eventnow.do/docs/connect-agenda'
    },
    license: {
      licenseType: 'Organizer Authorized Voluntary Feed',
      attributionRequired: true
    }
  }
];

async function seedSourceRegistry() {
  let seeded = 0;
  for (const src of SEED_SOURCES) {
    try {
      await Source.findOneAndUpdate(
        { sourceId: src.sourceId },
        { $setOnInsert: { ...src, status: 'evaluating', license: { ...src.license, commercialAllowed: false, displayAllowed: false } } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      seeded++;
    } catch (err) {
      logger.warn?.(`Failed to seed source ${src.sourceId}: ${err.message}`);
    }
  }
  logger.info?.(`[SourceRegistry] Successfully registered/seeded ${seeded} master sources.`);
  return seeded;
}

module.exports = {
  SEED_SOURCES,
  seedSourceRegistry
};
