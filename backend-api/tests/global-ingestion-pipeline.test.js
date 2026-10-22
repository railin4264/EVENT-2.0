'use strict';

const {
  computeH3Hierarchy,
  getSurroundingCells,
  buildH3SpatialFilter
} = require('../src/services/eventIngestion/h3SpatialIndexer');

const {
  extractJsonLdBlocks,
  normalizeSchemaOrgEvent
} = require('../src/services/eventIngestion/schemaOrgExtractor');

const {
  normalizeSocrataEvent
} = require('../src/services/eventIngestion/socrataCivicHarvester');

const {
  parseTelegramHtml,
  parseEventHeuristics,
  cleanChannelName
} = require('../src/services/eventIngestion/telegramChannelHarvester');

const {
  jaroWinkler,
  tokenOverlap,
  compareEvents,
  mergeEventRecords,
  deduplicateEventBatch
} = require('../src/services/eventIngestion/entityDeduplicator');

describe('Planetary Event Ingestion & H3 Pipeline Suite', () => {

  describe('1. Uber H3 Spatial Hierarchy Indexing', () => {
    test('computes valid H3 cell IDs across resolutions 3, 5, 7, 9 for Santo Domingo', () => {
      const hierarchy = computeH3Hierarchy(18.4861, -69.9312);
      expect(hierarchy).toBeDefined();
      expect(hierarchy.res3).toBeTruthy();
      expect(hierarchy.res5).toBeTruthy();
      expect(hierarchy.res7).toBeTruthy();
      expect(hierarchy.res9).toBeTruthy();
      expect(typeof hierarchy.res9).toBe('string');
      expect(hierarchy.res9.length).toBeGreaterThan(5);
    });

    test('generates k-ring disk of 7 hexagons for Resolution 7 (radius search)', () => {
      const cells = getSurroundingCells(18.4861, -69.9312, 7, 1);
      expect(Array.isArray(cells)).toBe(true);
      expect(cells.length).toBe(7);
    });

    test('builds indexed MongoDB filter using $in on H3 cell array', () => {
      const filter = buildH3SpatialFilter(18.4861, -69.9312, 7, 1);
      expect(filter).toHaveProperty(['h3.res7']);
      expect(filter['h3.res7']).toHaveProperty('$in');
      expect(filter['h3.res7'].$in.length).toBe(7);
    });
  });

  describe('2. Schema.org / JSON-LD Web Extractor (Tier 3)', () => {
    test('extracts and parses application/ld+json blocks from raw HTML', () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "MusicEvent",
                "name": "Festival de Jazz en Las Terrenas",
                "description": "Gran concierto frente a la playa con músicos caribeños e internacionales.",
                "startDate": "2026-11-20T20:00:00-04:00",
                "endDate": "2026-11-20T23:30:00-04:00",
                "location": {
                  "@type": "Place",
                  "name": "Playa Bonita",
                  "address": "Las Terrenas, Samaná, República Dominicana",
                  "geo": {
                    "@type": "GeoCoordinates",
                    "latitude": 19.3214,
                    "longitude": -69.5482
                  }
                },
                "offers": {
                  "@type": "Offer",
                  "price": "1500",
                  "priceCurrency": "DOP",
                  "url": "https://lasterrenasjazz.do/tickets"
                },
                "image": "https://lasterrenasjazz.do/banner.jpg"
              }
            </script>
          </head>
          <body><h1>Festival de Jazz</h1></body>
        </html>
      `;

      const blocks = extractJsonLdBlocks(mockHtml);
      expect(blocks.length).toBe(1);
      expect(blocks[0].name).toBe('Festival de Jazz en Las Terrenas');

      const normalized = normalizeSchemaOrgEvent(blocks[0], 'https://lasterrenasjazz.do');
      expect(normalized).not.toBeNull();
      expect(normalized.title).toBe('Festival de Jazz en Las Terrenas');
      expect(normalized.category).toBe('music');
      expect(normalized.price.amount).toBe(1500);
      expect(normalized.price.currency).toBe('DOP');
      expect(normalized.location.coordinates[0]).toBeCloseTo(-69.5482);
      expect(normalized.location.coordinates[1]).toBeCloseTo(19.3214);
      expect(normalized.h3.res9).toBeTruthy();
      expect(normalized.pipelineMeta.tier).toBe(3);
    });
  });

  describe('3. Socrata SODA Civic Harvester (Tier 3)', () => {
    test('normalizes civic municipal rows to canonical schema with H3 indexing', () => {
      const mockRow = {
        ':id': 'civic-sd-991',
        event_name: 'Feria Municipal del Libro & Arte Barrial',
        description: 'Exposición comunitaria gratuita con talleres para niños y presentaciones de poetas locales.',
        start_date_time: '2026-11-15T10:00:00Z',
        event_location: 'Parque Colón, Ciudad Colonial',
        latitude: '18.4735',
        longitude: '-69.8833'
      };

      const normalized = normalizeSocrataEvent(mockRow, 'https://data.gob.do/civic-events.json');
      expect(normalized).not.toBeNull();
      expect(normalized.title).toBe('Feria Municipal del Libro & Arte Barrial');
      expect(normalized.isOfficial).toBe(true);
      expect(normalized.price.amount).toBe(0);
      expect(normalized.location.coordinates[0]).toBeCloseTo(-69.8833);
      expect(normalized.location.coordinates[1]).toBeCloseTo(18.4735);
      expect(normalized.h3.res7).toBeTruthy();
      expect(normalized.pipelineMeta.tier).toBe(3);
    });
  });

  describe('4. Telegram Public Preview Harvester (Tier 4)', () => {
    test('cleans channel username strings', () => {
      expect(cleanChannelName('https://t.me/s/EventNowRD')).toBe('eventnowrd');
      expect(cleanChannelName('@CorosDominicanos')).toBe('corosdominicanos');
    });

    test('extracts messages and forwarded channels from public t.me/s HTML', () => {
      const mockTelegramHtml = `
        <div class="tgme_widget_message_wrap">
          <div class="tgme_widget_message" data-post="eventosrd/1420">
            <a class="tgme_widget_message_forwarded_from_name" href="https://t.me/underground_raves_rd">Raves RD</a>
            <div class="tgme_widget_message_text">¡Este viernes fiesta clandestina en la Zona Colonial! Puertas abren a las 10 PM. Lineup sorpresa de techno y house. Entrada libre antes de las 11 PM.</div>
            <time datetime="2026-10-21T18:00:00+00:00"></time>
          </div>
        </div>
      `;

      const msgs = parseTelegramHtml(mockTelegramHtml, 'eventosrd');
      expect(msgs.length).toBe(1);
      expect(msgs[0].channel).toBe('eventosrd');
      expect(msgs[0].forwardedFrom).toBe('underground_raves_rd');

      const candidate = parseEventHeuristics(msgs[0]);
      expect(candidate).not.toBeNull();
      expect(candidate.activityType).toBe('extraofficial_coro');
      expect(candidate.pipelineMeta.tier).toBe(4);
      expect(candidate.pipelineMeta.forwardedSource).toBe('underground_raves_rd');
    });
  });

  describe('5. Fellegi-Sunter Probabilistic Deduplicator', () => {
    test('accurately calculates Jaro-Winkler string similarity', () => {
      const s1 = 'Festival de Jazz en Las Terrenas 2026';
      const s2 = 'Festival Jazz Las Terrenas 2026';
      const sim = jaroWinkler(s1, s2);
      expect(sim).toBeGreaterThan(0.85);
    });

    test('detects duplicate events across different sources and merges metadata', () => {
      const date = new Date('2026-11-20T20:00:00Z');

      const sourceA = {
        title: 'Clásico de Béisbol: Tigres del Licey vs Águilas',
        date,
        location: { venue: 'Estadio Quisqueya Juan Marichal' },
        description: 'Breve descripción.',
        images: [{ url: 'https://cdn.com/a.jpg' }],
        source: 'ticketmaster',
        sourceId: 'tm-100',
        h3: { res9: '894cd42ee2bffff' },
        pipelineMeta: { tier: 1 }
      };

      const sourceB = {
        title: 'Béisbol Dominicano: Licey vs. Águilas Cibaeñas',
        date,
        location: { venue: 'Estadio Quisqueya' },
        description: 'Descripción mucho más amplia y detallada con información sobre las orquestas en las gradas y fuegos artificiales.',
        images: [{ url: 'https://cdn.com/b.jpg' }],
        ticketUrl: 'https://boletaslicey.do',
        source: 'schema_org_json_ld',
        sourceId: 'schema-999',
        h3: { res9: '894cd42ee2bffff' },
        pipelineMeta: { tier: 3 }
      };

      const comparison = compareEvents(sourceA, sourceB);
      expect(comparison.isDuplicate).toBe(true);
      expect(comparison.score).toBeGreaterThan(0.80);

      const merged = mergeEventRecords(sourceA, sourceB);
      expect(merged.description).toBe(sourceB.description); // Kept richer description
      expect(merged.images.length).toBe(2); // Merged images
      expect(merged.ticketUrl).toBe('https://boletaslicey.do'); // Preserved missing ticket URL
      expect(merged.pipelineMeta.mergedSources.length).toBe(1);
      expect(merged.pipelineMeta.mergedSources[0].sourceName).toBe('schema_org_json_ld');
    });

    test('deduplicates a batch of events within H3 spatiotemporal blocks', () => {
      const date = new Date('2026-11-25T19:00:00Z');
      const batch = [
        {
          title: 'Work in the Park Sunset Networking',
          date,
          location: { venue: 'Parque Mirador Sur' },
          h3: { res9: '894cd42ee2bffff' },
          source: 'telegram',
          images: []
        },
        {
          title: 'Work in the Park & Sunset: Networking al Aire Libre',
          date,
          location: { venue: 'Mirador Sur' },
          h3: { res9: '894cd42ee2bffff' },
          source: 'schema_org',
          images: [{ url: 'https://cdn.com/banner.jpg' }]
        },
        {
          title: 'Concierto Sinfónico en el Teatro Nacional',
          date,
          location: { venue: 'Teatro Nacional Eduardo Brito' },
          h3: { res9: '894cd42ee3fffff' },
          source: 'official',
          images: []
        }
      ];

      const { canonical, duplicateCount } = deduplicateEventBatch(batch);
      expect(duplicateCount).toBe(1);
      expect(canonical.length).toBe(2);
    });
  });

});
