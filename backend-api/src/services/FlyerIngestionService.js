const logger = require('../utils/logger') || console;

/**
 * Intelligent Flyer & Social Media Ingestion Service
 * Extracts dates, venues, coordinates, prices, and categories from Dominican
 * flyer text, OCR outputs, and Instagram/Facebook captions.
 */

// Dominican Landmark Venue Coordinate Dictionary
const DOMINICAN_VENUES = [
  { keywords: ['estadio quisqueya', 'juan marichal', 'licey', 'aguilas'], venue: 'Estadio Quisqueya Juan Marichal', address: 'Avenida Tiradentes, Ensanche La Fe', city: 'Santo Domingo', coordinates: [-69.9272, 18.4839] },
  { keywords: ['teatro nacional', 'eduardo brito', 'sala principal'], venue: 'Teatro Nacional Eduardo Brito', address: 'Avenida Máximo Gómez esq. César Nicolás Penson', city: 'Santo Domingo', coordinates: [-69.9115, 18.4731] },
  { keywords: ['mirador sur', 'km 0', 'kilometro 0'], venue: 'Parque Mirador Sur (Km 0)', address: 'Avenida Anacaona con Jiménez Moya', city: 'Santo Domingo', coordinates: [-69.9467, 18.4485] },
  { keywords: ['ruinas de san francisco', 'ruinas san francisco', 'bonye'], venue: 'Ruinas del Monasterio de San Francisco', address: 'Calle Hostos con Calle Tejera', city: 'Santo Domingo', coordinates: [-69.8858, 18.4764] },
  { keywords: ['plaza de la cultura', 'museo de arte moderno', 'mam'], venue: 'Museo de Arte Moderno (MAM)', address: 'Avenida Máximo Gómez, Plaza de la Cultura', city: 'Santo Domingo', coordinates: [-69.9103, 18.4725] },
  { keywords: ['agora mall', 'atrio central'], venue: 'Ágora Mall (Atrio Central)', address: 'Av. John F. Kennedy con Av. Abraham Lincoln', city: 'Santo Domingo', coordinates: [-69.9383, 18.4832] },
  { keywords: ['sambil', 'plaza sambil'], venue: 'Sambil Santo Domingo', address: 'Av. John F. Kennedy con Paseo Los Aviadores', city: 'Santo Domingo', coordinates: [-69.9149, 18.4828] },
  { keywords: ['supermercados bravo', 'bravo churchill'], venue: 'Supermercados Bravo (Churchill)', address: 'Av. Winston Churchill con Calle José Brea Peña', city: 'Santo Domingo', coordinates: [-69.9419, 18.4682] },
  { keywords: ['la sirena', 'sirena churchill'], venue: 'Tiendas La Sirena', address: 'Av. Winston Churchill esq. Gustavo Mejía Ricart', city: 'Santo Domingo', coordinates: [-69.9415, 18.4715] },
  { keywords: ['zona colonial', 'parque colon', 'calle el conde'], venue: 'Zona Colonial (Parque Colón)', address: 'Calle El Conde con Calle Arzobispo Meriño', city: 'Santo Domingo', coordinates: [-69.8837, 18.4734] },
  { keywords: ['piantini', 'la cantina'], venue: 'Piantini Distrito Gastronómico', address: 'Calle Federico Geraldino esq. Gustavo Mejía Ricart', city: 'Santo Domingo', coordinates: [-69.9328, 18.4719] },
  { keywords: ['jarabacoa', 'rancho baiguate', 'rio yaque'], venue: 'Rancho Baiguate', address: 'Carretera Jarabacoa - Manabao', city: 'Jarabacoa', coordinates: [-70.6417, 19.1219] },
  { keywords: ['samana', 'cayo levantado', 'salto del limon'], venue: 'Bahía de Samaná', address: 'Península de Samaná', city: 'Samaná', coordinates: [-69.3361, 19.2056] },
  { keywords: ['punta cana', 'bavaro', 'coco bongo'], venue: 'Downtown Punta Cana', address: 'Boulevard Turístico del Este', city: 'Punta Cana', coordinates: [-68.3667, 18.5833] },
  { keywords: ['santiago', 'monumento santiago', 'cibao'], venue: 'Monumento a los Héroes de la Restauración', address: 'Avenida Francia', city: 'Santiago de los Caballeros', coordinates: [-70.6872, 19.4517] }
];

class FlyerIngestionService {
  /**
   * Parses raw flyer text or Instagram caption into structured Event fields
   */
  static parseFlyerContent(rawText, imageUrl = '', organizerName = 'Promotor Verificado') {
    if (!rawText || typeof rawText !== 'string') {
      throw new Error('Flyer text is required for parsing');
    }

    const text = rawText.trim();
    const lower = text.toLowerCase();

    // 1. Detect Category
    let category = 'community';
    if (/(futbol|beisbol|béisbol|pelota|lidom|running|maraton|maratón|padel|pádel|basket|crossfit|gym)/i.test(lower)) {
      category = 'sports';
    } else if (/(concierto|musica|música|dj|banda|live|acustico|acústico|son|jazz|salsa|merengue|reggaeton|bachata)/i.test(lower)) {
      category = 'music';
    } else if (/(teatro|museo|arte|expo|pintura|galeria|galería|opera|ópera|sinfonica|sinfónica|danza)/i.test(lower)) {
      category = 'culture';
    } else if (/(tecnologia|tecnología|ai|ia|programacion|startup|coding|hackathon|crypto|gaming|esports)/i.test(lower)) {
      category = 'technology';
    } else if (/(tour|excursion|excursión|playa|rio|río|montaña|senderismo|camping|bote|catamaran)/i.test(lower)) {
      category = 'outdoors';
    } else if (/(karaoke|comedia|stand up|fiesta|party|disco|rooftop|club)/i.test(lower)) {
      category = 'entertainment';
    } else if (/(descuento|oferta|itbis|black friday|sale|feria|tienda|compras)/i.test(lower)) {
      category = 'community';
    }

    // 2. Detect Venue & Location
    let matchedLocation = {
      venue: 'Santo Domingo Distrito Cultural',
      address: 'Distrito Nacional, Santo Domingo',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      countryCode: 'DO',
      coordinates: [-69.9312, 18.4861]
    };

    for (const item of DOMINICAN_VENUES) {
      if (item.keywords.some(kw => lower.includes(kw))) {
        matchedLocation = {
          venue: item.venue,
          address: item.address,
          city: item.city,
          country: 'República Dominicana',
          countryCode: 'DO',
          coordinates: item.coordinates
        };
        break;
      }
    }

    // 3. Detect Price
    let priceAmount = 0;
    let currency = 'DOP';

    const freeMatch = /(gratis|entrada libre|free entry|libre de costo|sin costo)/i.test(lower);
    if (!freeMatch) {
      const priceDopMatch = lower.match(/(?:rd\$|\$)\s*(\d{1,3}(?:,\d{3})*|\d+)/i);
      const usdMatch = lower.match(/(\d+)\s*(?:usd|dolares|dólares)/i);
      if (usdMatch) {
        priceAmount = parseInt(usdMatch[1], 10);
        currency = 'USD';
      } else if (priceDopMatch) {
        priceAmount = parseInt(priceDopMatch[1].replace(/,/g, ''), 10);
        currency = 'DOP';
      }
    }

    // 4. Extract Date / Time Heuristics
    let eventDate = new Date(Date.now() + 3 * 24 * 3600 * 1000 + 19 * 3600 * 1000); // fallback in 3 days at 7:00 PM
    const daysMap = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, miércoles: 3, jueves: 4, viernes: 5, sabado: 6, sábado: 6 };
    
    for (const [dayName, dayIdx] of Object.entries(daysMap)) {
      if (lower.includes(dayName)) {
        const todayIdx = new Date().getDay();
        let diff = dayIdx - todayIdx;
        if (diff <= 0) diff += 7;
        const target = new Date();
        target.setDate(target.getDate() + diff);
        target.setHours(19, 30, 0, 0);
        eventDate = target;
        break;
      }
    }

    // 5. Special Patterns: Recurring, Commercial Deal, Tour
    const isRecurring = /(todos los|cada semana|semanalmente|every week|fijo todos)/i.test(lower);
    let recurringSchedule = undefined;
    if (isRecurring) {
      let dayName = 'Jueves';
      for (const d of ['lunes', 'martes', 'miércoles', 'miercoles', 'jueves', 'viernes', 'sábado', 'sabado', 'domingo']) {
        if (lower.includes(d)) {
          dayName = d.charAt(0).toUpperCase() + d.slice(1);
          break;
        }
      }
      recurringSchedule = {
        frequency: 'weekly',
        dayName,
        timeText: '7:30 PM'
      };
    }

    const isCommercialDeal = /(descuento|sin itbis|50%|2x1|oferta|promocion|promoción|rebajas)/i.test(lower);
    let commercialBrand = undefined;
    let commercialOffer = undefined;
    if (isCommercialDeal) {
      commercialBrand = matchedLocation.venue || 'Marca Participante';
      commercialOffer = 'Promoción especial por tiempo limitado en este evento';
    }

    const isTourOrTrip = /(tour|excursión|excursion|viaje|salida desde|paquete incluye)/i.test(lower);
    let tourDetails = undefined;
    if (isTourOrTrip) {
      tourDetails = {
        departurePoint: 'Salida céntrica coordinada (Santo Domingo)',
        includes: [
          'Transporte ida y vuelta climatizado',
          'Guía certificado y asistencia',
          'Refrigerios y fotos oficiales del grupo'
        ]
      };
    }

    // 6. Extract Tags
    const hashtagMatches = text.match(/#([a-zA-Z0-9_\u00C0-\u017F]+)/g) || [];
    let tags = hashtagMatches.map(t =>
      t.replace('#', '')
       .toLowerCase()
       .normalize('NFD')
       .replace(/[\u0300-\u036f]/g, '')
       .replace(/[^a-z0-9_-]/g, '')
       .slice(0, 25)
    ).filter(t => t.length >= 2);
    if (tags.length === 0) {
      tags = [category, 'republica-dominicana', 'evento-rd'];
    }

    // 7. Extract Title from first line or strong sentence
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let title = lines[0] || 'Nuevo Evento Extraído';
    if (title.length > 90) title = title.slice(0, 87) + '...';

    return {
      title,
      description: text,
      category,
      date: eventDate,
      endDate: new Date(eventDate.getTime() + 4 * 3600 * 1000),
      timeZone: 'America/Santo_Domingo',
      location: {
        type: 'Point',
        coordinates: matchedLocation.coordinates,
        venue: matchedLocation.venue,
        address: matchedLocation.address,
        city: matchedLocation.city,
        country: matchedLocation.country,
        countryCode: matchedLocation.countryCode
      },
      price: {
        amount: priceAmount,
        currency
      },
      images: imageUrl ? [{ url: imageUrl }] : [{ url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&q=80' }],
      tags: tags.slice(0, 6),
      isRecurring,
      recurringSchedule,
      isCommercialDeal,
      commercialBrand,
      commercialOffer,
      isTourOrTrip,
      tourDetails,
      isOfficial: false,
      status: 'pending_review',
      source: 'flyer_ai_ingestion',
      organizer: organizerName
    };
  }
}

module.exports = FlyerIngestionService;
