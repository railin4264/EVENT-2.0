'use strict';

/**
 * planetaryCatalog.js
 * ------------------------------------------------------------------
 * Worldwide Curated Catalog for EventNow 2.0
 * Native events covering Dominican Republic, Brazil, Japan, Mexico,
 * Colombia, Argentina, Spain, United States, and Global Virtual Hubs.
 *
 * Each item contains verified geographic coordinates [lng, lat], native
 * currencies (DOP, BRL, JPY, MXN, COP, ARS, EUR, USD), correct IANA
 * timezones, and culturally authentic venues.
 */

function sanitizeTag(tag) {
  if (!tag) return 'evento';
  return String(tag)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30) || 'evento';
}

const futureDate = (days, hour = 19, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
};

const PLANETARY_ITEMS = [
  // =========================================================================
  // 1. BRASIL 🇧🇷 (São Paulo, Rio de Janeiro, Salvador)
  // =========================================================================
  {
    sourceId: 'br-sp-allianz-sertanejo-2026',
    title: 'Festival Sertanejo Universitário & Pagode Ao Vivo',
    description: 'A maior celebração da música brasileira no Allianz Parque. Shows ao vivo com grandes nomes do sertanejo e pagode paulista, praça gastronômica com churrasco gaúcho, chopp gelado e camarotes com vista panorâmica. Abertura dos portões às 16:00.',
    category: 'music',
    date: futureDate(5, 17, 0),
    endDate: futureDate(5, 23, 30),
    timeZone: 'America/Sao_Paulo',
    location: {
      type: 'Point',
      coordinates: [-46.6784, -23.5275],
      address: 'Avenida Francisco Matarazzo 1705, Água Branca',
      venue: 'Allianz Parque',
      city: 'São Paulo',
      country: 'Brasil',
      countryCode: 'BR'
    },
    price: { amount: 120, currency: 'BRL' },
    images: [{ url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&q=80' }],
    maxAttendees: 28000,
    tags: ['sao-paulo', 'sertanejo', 'pagode', 'allianz-parque', 'brasil', 'musica'],
    isOfficial: true,
    activityType: 'festival'
  },
  {
    sourceId: 'br-sp-ibirapuera-jazz-2026',
    title: 'Ibirapuera Jazz & Instrumental ao Pôr do Sol',
    description: 'Encontro cultural gratuito ao ar livre no gramado da Praça da Paz. Músicos instrumentistas renomados apresentam clássicos da Bossa Nova, Samba-Jazz e Choro. Traga sua canga de piquenique e aproveite o entardecer mais charmoso de São Paulo.',
    category: 'culture',
    date: futureDate(3, 16, 30),
    endDate: futureDate(3, 20, 0),
    timeZone: 'America/Sao_Paulo',
    location: {
      type: 'Point',
      coordinates: [-46.6576, -23.5874],
      address: 'Avenida Pedro Álvares Cabral, Vila Mariana',
      venue: 'Parque Ibirapuera (Praça da Paz)',
      city: 'São Paulo',
      country: 'Brasil',
      countryCode: 'BR'
    },
    price: { amount: 0, currency: 'BRL' },
    images: [{ url: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=1200&q=80' }],
    maxAttendees: 5000,
    tags: ['ibirapuera', 'jazz', 'bossa-nova', 'gratis', 'sao-paulo', 'piquenique'],
    isOfficial: true,
    activityType: 'concert'
  },
  {
    sourceId: 'br-sp-vila-madalena-samba-2026',
    title: 'Roda de Samba dos Amigos da Madalena',
    description: 'O coração boêmio de São Paulo ganha vida com uma autêntica roda de samba de raiz no Beco do Batman. Cerveja artesanal trincando, feijoada tradicional, percussão envolvente e dança espontânea para celebrar a amizade.',
    category: 'nightlife',
    date: futureDate(6, 15, 0),
    endDate: futureDate(6, 22, 0),
    timeZone: 'America/Sao_Paulo',
    location: {
      type: 'Point',
      coordinates: [-46.6868, -23.5574],
      address: 'Rua Medeiros de Albuquerque 82, Vila Madalena',
      venue: 'Beco do Batman Cultural Stage',
      city: 'São Paulo',
      country: 'Brasil',
      countryCode: 'BR'
    },
    price: { amount: 35, currency: 'BRL' },
    images: [{ url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&q=80' }],
    maxAttendees: 450,
    tags: ['vila-madalena', 'samba', 'beco-do-batman', 'cerveja', 'feijoada'],
    isOfficial: true,
    activityType: 'social_party'
  },
  {
    sourceId: 'br-rj-maracana-classico-2026',
    title: 'Clássico Carioca no Maracanã: Flamengo vs. Fluminense (Fla-Flu)',
    description: 'A maior paixão do futebol mundial no lendário Maracanã. Mosaicos gigantes nas arquibancadas, baterias organizadas, bandeirões e a energia contagiante de 70.000 torcedores vibrando com o clássico mais charmoso do Brasil.',
    category: 'sports',
    date: futureDate(4, 16, 0),
    endDate: futureDate(4, 18, 30),
    timeZone: 'America/Sao_Paulo',
    location: {
      type: 'Point',
      coordinates: [-43.2280, -22.9121],
      address: 'Avenida Presidente Castelo Branco, Maracanã',
      venue: 'Estádio Jornalista Mário Filho (Maracanã)',
      city: 'Rio de Janeiro',
      country: 'Brasil',
      countryCode: 'BR'
    },
    price: { amount: 80, currency: 'BRL' },
    images: [{ url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&q=80' }],
    maxAttendees: 70000,
    tags: ['futebol', 'maracana', 'fla-flu', 'rio-de-janeiro', 'esporte', 'brasil'],
    isOfficial: true,
    activityType: 'sports_match'
  },
  {
    sourceId: 'br-rj-copacabana-sunset-2026',
    title: 'Luau Eletrônico Sunset Copacabana',
    description: 'Pôr do sol mágico nas areias de Copacabana (Posto 4). DJs renomados de melodic house e afrobeat, caipirinhas de frutas tropicais e iluminação suave ao som das ondas do Atlântico.',
    category: 'nightlife',
    date: futureDate(7, 17, 30),
    endDate: futureDate(7, 23, 0),
    timeZone: 'America/Sao_Paulo',
    location: {
      type: 'Point',
      coordinates: [-43.1872, -22.9714],
      address: 'Avenida Atlântica, Posto 4, Copacabana',
      venue: 'Quiosque Praia & Beats Copacabana',
      city: 'Rio de Janeiro',
      country: 'Brasil',
      countryCode: 'BR'
    },
    price: { amount: 0, currency: 'BRL' },
    images: [{ url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80' }],
    maxAttendees: 1200,
    tags: ['copacabana', 'sunset', 'musica-eletronica', 'rio', 'praia', 'gratis'],
    isOfficial: true,
    activityType: 'beach_party'
  },
  {
    sourceId: 'br-ba-pelourinho-olodum-2026',
    title: 'Terça da Bênção & Ensaio Oficial do Olodum',
    description: 'As ladeiras históricas do Pelourinho vibram com os tambores inconfundíveis do Olodum. Tradição afro-brasileira, cores, dança e ancestralidade no coração histórico de Salvador da Bahia.',
    category: 'culture',
    date: futureDate(2, 19, 0),
    endDate: futureDate(2, 22, 30),
    timeZone: 'America/Sao_Paulo',
    location: {
      type: 'Point',
      coordinates: [-38.5085, -12.9716],
      address: 'Largo do Pelourinho, Centro Histórico',
      venue: 'Praça das Artes Pelourinho',
      city: 'Salvador',
      country: 'Brasil',
      countryCode: 'BR'
    },
    price: { amount: 50, currency: 'BRL' },
    images: [{ url: 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=1200&q=80' }],
    maxAttendees: 3000,
    tags: ['salvador', 'bahia', 'pelourinho', 'olodum', 'cultura-afro', 'percussao'],
    isOfficial: true,
    activityType: 'cultural_celebration'
  },

  // =========================================================================
  // 2. JAPÓN 🇯🇵 (Tokio: Shibuya, Shinjuku, Akihabara, Roppongi, Kioto)
  // =========================================================================
  {
    sourceId: 'jp-tokyo-shibuya-indie-2026',
    title: 'Shibuya Indie Beat Showcase & Visual Art Jam',
    description: 'Underground indie rock bands, modular synth artists, and live generative visual mapping in Shibuya. Experience the bleeding-edge of Tokyo\'s creative music underground with craft highballs and interactive visual walls.',
    category: 'music',
    date: futureDate(5, 19, 0),
    endDate: futureDate(5, 23, 0),
    timeZone: 'Asia/Tokyo',
    location: {
      type: 'Point',
      coordinates: [139.7029, 35.6580],
      address: '3-21-3 Shibuya, Shibuya-ku',
      venue: 'Shibuya Stream Hall',
      city: 'Tokio',
      country: 'Japón',
      countryCode: 'JP'
    },
    price: { amount: 3500, currency: 'JPY' },
    images: [{ url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1200&q=80' }],
    maxAttendees: 700,
    tags: ['shibuya', 'tokyo', 'japon', 'indie-music', 'synth', 'visual-art'],
    isOfficial: true,
    activityType: 'live_concert'
  },
  {
    sourceId: 'jp-tokyo-shinjuku-food-sake-2026',
    title: 'Shinjuku Neon Alley Food & Craft Sake Night Tour',
    description: 'Immersive guided evening through the iconic lantern-lit alleyways of Omoide Yokocho and Golden Gai. Taste charcoal-grilled yakitori skewers, seasonal artisanal sake, and connect with fellow explorers in intimate micro-bars.',
    category: 'food',
    date: futureDate(3, 18, 30),
    endDate: futureDate(3, 21, 30),
    timeZone: 'Asia/Tokyo',
    location: {
      type: 'Point',
      coordinates: [139.7011, 35.6938],
      address: '1-2 Nishishinjuku, Shinjuku-ku',
      venue: 'Omoide Yokocho Alleyway',
      city: 'Tokio',
      country: 'Japón',
      countryCode: 'JP'
    },
    price: { amount: 6000, currency: 'JPY' },
    images: [{ url: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1200&q=80' }],
    maxAttendees: 25,
    tags: ['shinjuku', 'sake', 'yakitori', 'tokio', 'gastronomia', 'nocturno'],
    isOfficial: true,
    activityType: 'food_tour'
  },
  {
    sourceId: 'jp-tokyo-akihabara-gaming-summit-2026',
    title: 'Akihabara Retro Arcade & Next-Gen Gaming Summit',
    description: 'The epicenter of global otaku and gaming culture. Retro arcade speedrunning tournaments, indie game demos, robotic showcases, and developer networking sessions in the heart of Electric Town.',
    category: 'gaming',
    date: futureDate(6, 11, 0),
    endDate: futureDate(6, 18, 0),
    timeZone: 'Asia/Tokyo',
    location: {
      type: 'Point',
      coordinates: [139.7719, 35.7003],
      address: '4-14-1 Sotokanda, Chiyoda-ku',
      venue: 'Akihabara UDX Conference Center',
      city: 'Tokio',
      country: 'Japón',
      countryCode: 'JP'
    },
    price: { amount: 2000, currency: 'JPY' },
    images: [{ url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&q=80' }],
    maxAttendees: 1200,
    tags: ['akihabara', 'gaming', 'esports', 'arcade', 'tokio', 'tech'],
    isOfficial: true,
    activityType: 'gaming_summit'
  },
  {
    sourceId: 'jp-tokyo-roppongi-art-night-2026',
    title: 'Roppongi Art Night: Arquitectura y Luz Futurista',
    description: 'Apertura nocturna especial del Mori Art Museum en la cima de Roppongi Hills con vistas panorámicas 360° de la Torre de Tokio. Instalaciones de arte digital interactivo, esculturas cinéticas y cócteles de autor.',
    category: 'art',
    date: futureDate(8, 20, 0),
    endDate: futureDate(8, 24, 0),
    timeZone: 'Asia/Tokyo',
    location: {
      type: 'Point',
      coordinates: [139.7292, 35.6605],
      address: '6-10-1 Roppongi, Minato-ku',
      venue: 'Mori Art Museum (Roppongi Hills Mori Tower 53F)',
      city: 'Tokio',
      country: 'Japón',
      countryCode: 'JP'
    },
    price: { amount: 2500, currency: 'JPY' },
    images: [{ url: 'https://images.unsplash.com/photo-1508997449629-303059a039c0?w=1200&q=80' }],
    maxAttendees: 900,
    tags: ['roppongi', 'arte-moderno', 'mori-art-museum', 'tokio', 'luces', 'cultura'],
    isOfficial: true,
    activityType: 'exhibition'
  },
  {
    sourceId: 'jp-tokyo-dome-symphonic-rock-2026',
    title: 'Tokyo Dome: J-Rock & Anime Live Symphonic Explosion',
    description: 'Las bandas sonoras más épicas del anime y los grandes éxitos del J-Rock interpretados por una orquesta sinfónica de 80 músicos junto a guitarras eléctricas y vocalistas invitados. Luces láser, pirotecnia de estadio y pantallas 8K.',
    category: 'music',
    date: futureDate(12, 18, 0),
    endDate: futureDate(12, 21, 30),
    timeZone: 'Asia/Tokyo',
    location: {
      type: 'Point',
      coordinates: [139.7519, 35.7056],
      address: '1-3-61 Koraku, Bunkyo-ku',
      venue: 'Tokyo Dome Arena',
      city: 'Tokio',
      country: 'Japón',
      countryCode: 'JP'
    },
    price: { amount: 9800, currency: 'JPY' },
    images: [{ url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1200&q=80' }],
    maxAttendees: 50000,
    tags: ['tokyo-dome', 'anime', 'sinfonica', 'j-rock', 'concierto', 'tokio'],
    isOfficial: true,
    activityType: 'mega_concert'
  },
  {
    sourceId: 'jp-kyoto-zen-matcha-walk-2026',
    title: 'Paseo de Faroles de Bambú y Taller de Té Ceremonial en Kioto',
    description: 'Experiencia zen tradicional en el distrito histórico de Gion. Caminata al atardecer por callejones de madera preservada con faroles de papel, seguida por una sesión de meditación y ceremonia de matcha en templo centenario.',
    category: 'culture',
    date: futureDate(4, 15, 30),
    endDate: futureDate(4, 18, 30),
    timeZone: 'Asia/Tokyo',
    location: {
      type: 'Point',
      coordinates: [135.7739, 35.0006],
      address: '584 Gionmachi Minamigawa, Higashiyama-ku',
      venue: 'Kennin-ji Sub-temple Garden Pavillion',
      city: 'Kioto',
      country: 'Japón',
      countryCode: 'JP'
    },
    price: { amount: 4500, currency: 'JPY' },
    images: [{ url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&q=80' }],
    maxAttendees: 30,
    tags: ['kioto', 'zen', 'matcha', 'gion', 'japon', 'meditacion', 'te'],
    isOfficial: true,
    activityType: 'cultural_workshop'
  },

  // =========================================================================
  // 3. MÉXICO 🇲🇽 (CDMX, Guadalajara, Monterrey)
  // =========================================================================
  {
    sourceId: 'mx-cdmx-foro-sol-rock-2026',
    title: 'Vive Rock & Alternativo CDMX 2026',
    description: 'El mayor festival de rock iberoamericano y música alternativa en el Foro Sol. 4 escenarios simultáneos, tianguis de diseño independiente, más de 40 bandas en vivo y zona gastronómica con tacos de birria, mezcal y cerveza artesanal.',
    category: 'music',
    date: futureDate(7, 14, 0),
    endDate: futureDate(7, 24, 0),
    timeZone: 'America/Mexico_City',
    location: {
      type: 'Point',
      coordinates: [-99.0963, 19.4042],
      address: 'Viaducto Río de la Piedad s/n, Granjas México, Iztacalco',
      venue: 'Foro Sol (Estadio GNP Seguros)',
      city: 'Ciudad de México',
      country: 'México',
      countryCode: 'MX'
    },
    price: { amount: 1450, currency: 'MXN' },
    images: [{ url: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200&q=80' }],
    maxAttendees: 65000,
    tags: ['cdmx', 'foro-sol', 'rock', 'festival', 'musica', 'mexico'],
    isOfficial: true,
    activityType: 'music_festival'
  },
  {
    sourceId: 'mx-cdmx-arena-mexico-lucha-2026',
    title: 'Viernes Espectacular de Lucha Libre Mexicana',
    description: 'La Catedral de la Lucha Libre abre sus puertas para una noche electrizante de lances aéreos, rivalidades históricas de rudos contra técnicos, máscaras legendarias y ambiente inigualable. ¡Grita con pasión y vive el folclor más auténtico de México!',
    category: 'sports',
    date: futureDate(2, 20, 30),
    endDate: futureDate(2, 23, 0),
    timeZone: 'America/Mexico_City',
    location: {
      type: 'Point',
      coordinates: [-99.1512, 19.4244],
      address: 'Dr. Lavista 189, Doctores, Cuauhtémoc',
      venue: 'Arena México',
      city: 'Ciudad de México',
      country: 'México',
      countryCode: 'MX'
    },
    price: { amount: 350, currency: 'MXN' },
    images: [{ url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&q=80' }],
    maxAttendees: 16500,
    tags: ['lucha-libre', 'arena-mexico', 'cdmx', 'mascaras', 'deporte', 'tradicion'],
    isOfficial: true,
    activityType: 'sports_match'
  },
  {
    sourceId: 'mx-cdmx-auditorio-nacional-boleros-2026',
    title: 'Noche de Gala: Grandes Boleros & Canto Sinfónico Mexicano',
    description: 'Homenaje a los compositores más grandes de la música romántica mexicana con orquesta sinfónica en vivo y mariachi tradicional en el Auditorio Nacional de Reforma. Traje formal o elegante sport.',
    category: 'culture',
    date: futureDate(10, 20, 0),
    endDate: futureDate(10, 22, 30),
    timeZone: 'America/Mexico_City',
    location: {
      type: 'Point',
      coordinates: [-99.1923, 19.4253],
      address: 'Paseo de la Reforma 50, Bosque de Chapultepec',
      venue: 'Auditorio Nacional',
      city: 'Ciudad de México',
      country: 'México',
      countryCode: 'MX'
    },
    price: { amount: 850, currency: 'MXN' },
    images: [{ url: 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=1200&q=80' }],
    maxAttendees: 9800,
    tags: ['auditorio-nacional', 'mariachi', 'boleros', 'cultura', 'cdmx', 'reforma'],
    isOfficial: true,
    activityType: 'gala'
  },
  {
    sourceId: 'mx-cdmx-roma-condesa-art-walk-2026',
    title: 'Ruta de Galerías de Arte Independiente y Mezcal en la Roma',
    description: 'Caminata cultural guiada a pie por Álvaro Obregón y Plaza Río de Janeiro. Visita 4 galerías independientes con artistas plásticos en vivo, finalizando con cata guiada de mezcales oaxaqueños artesanales.',
    category: 'art',
    date: futureDate(4, 17, 0),
    endDate: futureDate(4, 20, 30),
    timeZone: 'America/Mexico_City',
    location: {
      type: 'Point',
      coordinates: [-99.1624, 19.4183],
      address: 'Avenida Álvaro Obregón 110, Roma Norte',
      venue: 'Plaza Río de Janeiro & Galerías Roma',
      city: 'Ciudad de México',
      country: 'México',
      countryCode: 'MX'
    },
    price: { amount: 400, currency: 'MXN' },
    images: [{ url: 'https://images.unsplash.com/photo-1460661419200-1845a1df98c1?w=1200&q=80' }],
    maxAttendees: 40,
    tags: ['roma-norte', 'arte', 'mezcal', 'galerias', 'cdmx', 'caminata'],
    isOfficial: true,
    activityType: 'art_walk'
  },
  {
    sourceId: 'mx-gdl-trasloma-tequila-beats-2026',
    title: 'Festival del Agave, Gastronomía Tapatía y Música Indie',
    description: 'Celebración tapatía al aire libre con las mejores casas de tequila artesanal, birria tradicional de Jalisco, bandas locales de indie pop y feria de diseño gráfico en Zapopan.',
    category: 'food',
    date: futureDate(9, 13, 0),
    endDate: futureDate(9, 21, 0),
    timeZone: 'America/Mexico_City',
    location: {
      type: 'Point',
      coordinates: [-103.4005, 20.6672],
      address: 'Avenida Mariano Otero 1460, Zapopan',
      venue: 'Parque Trasloma Cultural Grounds',
      city: 'Guadalajara',
      country: 'México',
      countryCode: 'MX'
    },
    price: { amount: 350, currency: 'MXN' },
    images: [{ url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80' }],
    maxAttendees: 3500,
    tags: ['guadalajara', 'tequila', 'tapatio', 'gastronomia', 'jalisco', 'indie'],
    isOfficial: true,
    activityType: 'food_festival'
  },
  {
    sourceId: 'mx-mty-fundidora-tech-summit-2026',
    title: 'Monterrey Tech & AI Founders Summit en Fundidora',
    description: 'Encuentro de startups, fondos de inversión y desarrolladores de software e inteligencia artificial en la Nave Lewis de Parque Fundidora. Keynotes, networking y pitches en vivo.',
    category: 'tech',
    date: futureDate(11, 9, 0),
    endDate: futureDate(11, 18, 0),
    timeZone: 'America/Mexico_City',
    location: {
      type: 'Point',
      coordinates: [-100.2833, 25.6786],
      address: 'Avenida Fundidora y Adolfo Prieto s/n, Obrera',
      venue: 'Nave Lewis, Parque Fundidora',
      city: 'Monterrey',
      country: 'México',
      countryCode: 'MX'
    },
    price: { amount: 650, currency: 'MXN' },
    images: [{ url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1200&q=80' }],
    maxAttendees: 2000,
    tags: ['monterrey', 'tech', 'ia', 'fundidora', 'startups', 'networking'],
    isOfficial: true,
    activityType: 'conference'
  },

  // =========================================================================
  // 4. COLOMBIA 🇨🇴 (Bogotá, Medellín)
  // =========================================================================
  {
    sourceId: 'co-bog-movistar-indie-fest-2026',
    title: 'Festival Bogotá Indie & Sonidos Urbanos',
    description: 'La arena cubierta más moderna de Sudamérica presenta los actos más vibrantes del indie pop, rock andino y beats urbanos. Acústica de primera categoría, zona de comidas con sabores colombianos y experiencias interactivas.',
    category: 'music',
    date: futureDate(6, 18, 0),
    endDate: futureDate(6, 23, 30),
    timeZone: 'America/Bogota',
    location: {
      type: 'Point',
      coordinates: [-74.0772, 4.6486],
      address: 'Diagonal 61C No. 26-36, Teusaquillo',
      venue: 'Movistar Arena Bogotá',
      city: 'Bogotá',
      country: 'Colombia',
      countryCode: 'CO'
    },
    price: { amount: 140000, currency: 'COP' },
    images: [{ url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1200&q=80' }],
    maxAttendees: 14000,
    tags: ['bogota', 'movistar-arena', 'indie', 'musica', 'colombia', 'concierto'],
    isOfficial: true,
    activityType: 'concert'
  },
  {
    sourceId: 'co-bog-simon-bolivar-picnic-2026',
    title: 'Picnic Electrónico & Yoga al Aire Libre en Simón Bolívar',
    description: 'Sesión matutina de bienestar consciente y música downtempo en el pulmón verde de Bogotá. Clase abierta de vinyasa yoga guiada por maestros certificados, seguida por DJs de organic house y mercado ecológico de productores locales.',
    category: 'wellness',
    date: futureDate(3, 9, 30),
    endDate: futureDate(3, 14, 0),
    timeZone: 'America/Bogota',
    location: {
      type: 'Point',
      coordinates: [-74.0931, 4.6584],
      address: 'Avenida Calle 63 y Carrera 60',
      venue: 'Parque Metropolitano Simón Bolívar (Sector Lago)',
      city: 'Bogotá',
      country: 'Colombia',
      countryCode: 'CO'
    },
    price: { amount: 0, currency: 'COP' },
    images: [{ url: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=1200&q=80' }],
    maxAttendees: 2500,
    tags: ['bogota', 'yoga', 'simon-bolivar', 'picnic', 'bienestar', 'gratis'],
    isOfficial: true,
    activityType: 'wellness_gathering'
  },
  {
    sourceId: 'co-bog-candelaria-cuenteria-2026',
    title: 'Noche de Cuentería, Café de Origen y Fogata en La Candelaria',
    description: 'Tradición oral andina en la cuna histórica de Bogotá. Narradores de historias urbanas y mitos latinoamericanos en la plazoleta del Chorro de Quevedo, acompañados de chocolate santafereño caliente con queso y café especial de Huila.',
    category: 'culture',
    date: futureDate(4, 18, 30),
    endDate: futureDate(4, 21, 30),
    timeZone: 'America/Bogota',
    location: {
      type: 'Point',
      coordinates: [-74.0699, 4.5973],
      address: 'Calle 12B con Carrera 2, La Candelaria',
      venue: 'Plazoleta del Chorro de Quevedo',
      city: 'Bogotá',
      country: 'Colombia',
      countryCode: 'CO'
    },
    price: { amount: 25000, currency: 'COP' },
    images: [{ url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=1200&q=80' }],
    maxAttendees: 150,
    tags: ['candelaria', 'chorro-de-quevedo', 'cuenteria', 'cafe', 'bogota', 'cultura'],
    isOfficial: true,
    activityType: 'storytelling'
  },
  {
    sourceId: 'co-mde-provenza-music-crawl-2026',
    title: 'Provenza Rooftop Music Crawl & Afrobeat Session',
    description: 'Recorrido nocturno por las terrazas más exclusivas de Provenza y El Poblado. Coctelería de autor con maracuyá y café, DJs de reggaetón clásico y afrobeat, y el clima primaveral perfecto de la Ciudad de la Eterna Primavera.',
    category: 'nightlife',
    date: futureDate(5, 20, 0),
    endDate: futureDate(5, 24, 0),
    timeZone: 'America/Bogota',
    location: {
      type: 'Point',
      coordinates: [-75.5678, 6.2088],
      address: 'Carrera 35 con Calle 8, El Poblado',
      venue: 'Provenza Rooftops & Social Hub',
      city: 'Medellín',
      country: 'Colombia',
      countryCode: 'CO'
    },
    price: { amount: 60000, currency: 'COP' },
    images: [{ url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1200&q=80' }],
    maxAttendees: 300,
    tags: ['medellin', 'provenza', 'el-poblado', 'rooftop', 'rumba', 'colombia'],
    isOfficial: true,
    activityType: 'bar_crawl'
  },
  {
    sourceId: 'co-mde-jardin-botanico-orquideas-2026',
    title: 'Feria de Orquídeas, Flora Silvestre y Acústicos en el Orquideorama',
    description: 'El icónico Orquideorama del Jardín Botánico de Medellín abre para un festival de flores, botánica y conciertos de cuerdas al aire libre. Talleres de jardinería urbana y mercado campesino sostenible.',
    category: 'outdoors',
    date: futureDate(8, 10, 0),
    endDate: futureDate(8, 17, 0),
    timeZone: 'America/Bogota',
    location: {
      type: 'Point',
      coordinates: [-75.5636, 6.2709],
      address: 'Calle 73 No. 51D-14, Aranjuez',
      venue: 'Orquideorama, Jardín Botánico de Medellín',
      city: 'Medellín',
      country: 'Colombia',
      countryCode: 'CO'
    },
    price: { amount: 15000, currency: 'COP' },
    images: [{ url: 'https://images.unsplash.com/photo-1466781783364-36c955e42a7f?w=1200&q=80' }],
    maxAttendees: 4000,
    tags: ['medellin', 'flores', 'orquideorama', 'botanico', 'naturaleza', 'familia'],
    isOfficial: true,
    activityType: 'nature_exhibition'
  },

  // =========================================================================
  // 5. ARGENTINA 🇦🇷 (Buenos Aires)
  // =========================================================================
  {
    sourceId: 'ar-ba-monumental-rock-2026',
    title: 'Noche de Rock de Estadios en el Monumental (River Plate)',
    description: 'El estadio más imponente de Argentina con más de 84.000 almas cantando al unísono. Producción visual monumental con pantallas envolventes, sonido estéreo de última generación y la incomparable euforia del público porteño.',
    category: 'music',
    date: futureDate(9, 20, 30),
    endDate: futureDate(9, 23, 45),
    timeZone: 'America/Argentina/Buenos_Aires',
    location: {
      type: 'Point',
      coordinates: [-58.4497, -34.5453],
      address: 'Avenida Figueroa Alcorta 7597, Núñez',
      venue: 'Estadio Mâs Monumental (River Plate)',
      city: 'Buenos Aires',
      country: 'Argentina',
      countryCode: 'AR'
    },
    price: { amount: 35000, currency: 'ARS' },
    images: [{ url: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80' }],
    maxAttendees: 84000,
    tags: ['buenos-aires', 'monumental', 'rock', 'river-plate', 'argentina', 'estadio'],
    isOfficial: true,
    activityType: 'mega_concert'
  },
  {
    sourceId: 'ar-ba-teatro-colon-opera-2026',
    title: 'Gala Lírica & Sinfonía Clásica en el Teatro Colón',
    description: 'Considerado una de las salas con mejor acústica del planeta. La Orquesta Filarmónica de Buenos Aires interpreta obras cumbre de Verdi y Puccini con solistas líricos internacionales invitados.',
    category: 'culture',
    date: futureDate(6, 20, 0),
    endDate: futureDate(6, 22, 30),
    timeZone: 'America/Argentina/Buenos_Aires',
    location: {
      type: 'Point',
      coordinates: [-58.3828, -34.6011],
      address: 'Cerrito 628, San Nicolás',
      venue: 'Teatro Colón (Sala Principal)',
      city: 'Buenos Aires',
      country: 'Argentina',
      countryCode: 'AR'
    },
    price: { amount: 18000, currency: 'ARS' },
    images: [{ url: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=1200&q=80' }],
    maxAttendees: 2400,
    tags: ['teatro-colon', 'opera', 'filarmonica', 'buenos-aires', 'cultura', 'clasico'],
    isOfficial: true,
    activityType: 'opera'
  },
  {
    sourceId: 'ar-ba-palermo-craft-beer-2026',
    title: 'Palermo Soho: Feria de Cervezas Artesanales, Burgers & Street Art',
    description: 'Plaza Serrano y sus pasajes empedrados se transforman en una gran fiesta urbana de birras premiadas (IPA, Stout, Honey), hamburguesas de autor y artistas plásticos pintando murales en vivo al ritmo de indie rock.',
    category: 'food',
    date: futureDate(4, 18, 0),
    endDate: futureDate(4, 23, 30),
    timeZone: 'America/Argentina/Buenos_Aires',
    location: {
      type: 'Point',
      coordinates: [-58.4301, -34.5885],
      address: 'Plaza Serrano (Plaza Cortázar), Palermo Soho',
      venue: 'Plaza Serrano Cultural Corridor',
      city: 'Buenos Aires',
      country: 'Argentina',
      countryCode: 'AR'
    },
    price: { amount: 5500, currency: 'ARS' },
    images: [{ url: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=1200&q=80' }],
    maxAttendees: 1500,
    tags: ['palermo-soho', 'birra', 'hamburguesas', 'buenos-aires', 'street-art'],
    isOfficial: true,
    activityType: 'food_festival'
  },
  {
    sourceId: 'ar-ba-san-telmo-tango-dorrego-2026',
    title: 'Milonga Nocturna a Cielo Abierto en Plaza Dorrego',
    description: 'El corazón arrabalero de San Telmo late al compás del dos por cuatro. Orquesta típica de bandoneones en vivo sobre adoquines centenarios, parejas bailando bajo los faroles y copas de Malbec en las mesas de la plaza.',
    category: 'dance',
    date: futureDate(2, 20, 30),
    endDate: futureDate(2, 23, 30),
    timeZone: 'America/Argentina/Buenos_Aires',
    location: {
      type: 'Point',
      coordinates: [-58.3718, -34.6202],
      address: 'Humberto 1º y Defensa, San Telmo',
      venue: 'Plaza Dorrego Histórica',
      city: 'Buenos Aires',
      country: 'Argentina',
      countryCode: 'AR'
    },
    price: { amount: 0, currency: 'ARS' },
    images: [{ url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1200&q=80' }],
    maxAttendees: 600,
    tags: ['san-telmo', 'tango', 'milonga', 'plaza-dorrego', 'gratis', 'buenos-aires'],
    isOfficial: true,
    activityType: 'milonga'
  },

  // =========================================================================
  // 6. ESPAÑA 🇪🇸 (Madrid, Barcelona)
  // =========================================================================
  {
    sourceId: 'es-mad-wizink-indie-2026',
    title: 'Madrid Indie & Pop Fest en WiZink Center',
    description: 'El Palacio de los Deportes de la Comunidad de Madrid reúne a las bandas y solistas más vibrantes del pop-rock independiente español. Visuales inmersivas, sonido impecable y ambiente festivalero en el barrio de Salamanca.',
    category: 'music',
    date: futureDate(8, 19, 30),
    endDate: futureDate(8, 23, 30),
    timeZone: 'Europe/Madrid',
    location: {
      type: 'Point',
      coordinates: [-3.6716, 40.4239],
      address: 'Avenida Felipe II s/n, Salamanca',
      venue: 'WiZink Center',
      city: 'Madrid',
      country: 'España',
      countryCode: 'ES'
    },
    price: { amount: 42, currency: 'EUR' },
    images: [{ url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80' }],
    maxAttendees: 15500,
    tags: ['madrid', 'wizink-center', 'indie', 'pop', 'espana', 'concierto'],
    isOfficial: true,
    activityType: 'concert'
  },
  {
    sourceId: 'es-mad-malasana-tapas-acustico-2026',
    title: 'Ruta de Tapas de Autor, Vinos y Acústicos en Malasaña',
    description: 'Tardeo madrileño por excelencia en la Plaza del Dos de Mayo y alrededores. Paradas en tascas legendarias con croquetas cremosas, tortillas jugosas y directos acústicos en tabernas con historia.',
    category: 'food',
    date: futureDate(3, 19, 0),
    endDate: futureDate(3, 22, 30),
    timeZone: 'Europe/Madrid',
    location: {
      type: 'Point',
      coordinates: [-3.7046, 40.4265],
      address: 'Plaza del Dos de Mayo, Malasaña',
      venue: 'Plaza del Dos de Mayo & Tabernas Históricas',
      city: 'Madrid',
      country: 'España',
      countryCode: 'ES'
    },
    price: { amount: 28, currency: 'EUR' },
    images: [{ url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80' }],
    maxAttendees: 60,
    tags: ['malasana', 'tapas', 'madrid', 'vino', 'tardeo', 'espana'],
    isOfficial: true,
    activityType: 'food_walk'
  },
  {
    sourceId: 'es-bcn-palau-sant-jordi-electro-2026',
    title: 'Barcelona Electronic Waves en Palau Sant Jordi',
    description: 'La montaña mágica de Montjuïc se ilumina con los mejores DJs internacionales de melodic techno y deep house. Escenario 360°, mapping tridimensional y sistema de sonido Funktion-One.',
    category: 'music',
    date: futureDate(11, 21, 0),
    endDate: futureDate(12, 4, 0),
    timeZone: 'Europe/Madrid',
    location: {
      type: 'Point',
      coordinates: [2.1528, 41.3638],
      address: 'Passeig Olímpic 5-7, Montjuïc',
      venue: 'Palau Sant Jordi',
      city: 'Barcelona',
      country: 'España',
      countryCode: 'ES'
    },
    price: { amount: 55, currency: 'EUR' },
    images: [{ url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80' }],
    maxAttendees: 18000,
    tags: ['barcelona', 'palau-sant-jordi', 'techno', 'house', 'montjuic', 'musica'],
    isOfficial: true,
    activityType: 'electronic_fest'
  },
  {
    sourceId: 'es-bcn-gracia-vermut-diseno-2026',
    title: 'Feria de Diseño Sostenible, Vermut y Rumba Catalana en Gràcia',
    description: 'Las plazas del barrio de Gràcia se llenan de creadores locales, moda circular, ilustración y puestos de vermut artesanal con aceitunas rellenas, amenizado con guitarras de rumba en vivo.',
    category: 'culture',
    date: futureDate(4, 12, 0),
    endDate: futureDate(4, 17, 30),
    timeZone: 'Europe/Madrid',
    location: {
      type: 'Point',
      coordinates: [2.1583, 41.4026],
      address: 'Plaça del Sol, Gràcia',
      venue: 'Plaça del Sol & Carrer de Verdi',
      city: 'Barcelona',
      country: 'España',
      countryCode: 'ES'
    },
    price: { amount: 0, currency: 'EUR' },
    images: [{ url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1200&q=80' }],
    maxAttendees: 1200,
    tags: ['barcelona', 'gracia', 'vermut', 'diseno', 'rumba', 'gratis'],
    isOfficial: true,
    activityType: 'fair'
  },

  // =========================================================================
  // 7. ESTADOS UNIDOS 🇺🇸 (New York, Miami, Los Angeles)
  // =========================================================================
  {
    sourceId: 'us-nyc-msg-world-summit-2026',
    title: 'MSG Worldwide Live Music Gala 2026',
    description: 'The world\'s most famous arena hosts global pop, hip-hop and Latin stars under one roof. World-class acoustics, breathtaking LED arena rigging, and celebrity guest appearances in Midtown Manhattan.',
    category: 'music',
    date: futureDate(10, 19, 30),
    endDate: futureDate(10, 23, 0),
    timeZone: 'America/New_York',
    location: {
      type: 'Point',
      coordinates: [-73.9934, 40.7505],
      address: '4 Pennsylvania Plaza, Manhattan',
      venue: 'Madison Square Garden',
      city: 'New York',
      country: 'Estados Unidos',
      countryCode: 'US'
    },
    price: { amount: 165, currency: 'USD' },
    images: [{ url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&q=80' }],
    maxAttendees: 20000,
    tags: ['nyc', 'madison-square-garden', 'concierto', 'new-york', 'musica', 'estados-unidos'],
    isOfficial: true,
    activityType: 'mega_concert'
  },
  {
    sourceId: 'us-nyc-brooklyn-mirage-sunset-2026',
    title: 'Brooklyn Mirage Open-Air Sunset Sessions',
    description: 'An open-air sanctuary in East Williamsburg with an iconic 200-foot curved LED video wall. Top international melodic house and techno DJs performing under the stars with skyline views.',
    category: 'nightlife',
    date: futureDate(5, 17, 0),
    endDate: futureDate(5, 24, 0),
    timeZone: 'America/New_York',
    location: {
      type: 'Point',
      coordinates: [-73.9272, 40.7107],
      address: '140 Stewart Avenue, Brooklyn',
      venue: 'The Brooklyn Mirage (Avant Gardner)',
      city: 'New York',
      country: 'Estados Unidos',
      countryCode: 'US'
    },
    price: { amount: 65, currency: 'USD' },
    images: [{ url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&q=80' }],
    maxAttendees: 6000,
    tags: ['brooklyn', 'brooklyn-mirage', 'techno', 'house', 'sunset', 'nyc'],
    isOfficial: true,
    activityType: 'electronic_show'
  },
  {
    sourceId: 'us-mia-wynwood-art-beats-2026',
    title: 'Wynwood Art Walk & Afro-Latin Sunset Beats',
    description: 'Vibrant murals, open-air gallery installations, food trucks serving Caribbean street eats, and live DJ sets of reggaeton, salsa brava, and afrobeats in the world-famous Wynwood Arts District.',
    category: 'art',
    date: futureDate(3, 17, 30),
    endDate: futureDate(3, 23, 0),
    timeZone: 'America/New_York',
    location: {
      type: 'Point',
      coordinates: [-80.1993, 25.8010],
      address: '2520 NW 2nd Avenue, Wynwood',
      venue: 'Wynwood Walls & Outdoor Stage',
      city: 'Miami',
      country: 'Estados Unidos',
      countryCode: 'US'
    },
    price: { amount: 0, currency: 'USD' },
    images: [{ url: 'https://images.unsplash.com/photo-1508873696983-2df5293cb325?w=1200&q=80' }],
    maxAttendees: 3500,
    tags: ['miami', 'wynwood', 'art-walk', 'reggaeton', 'gratis', 'florida'],
    isOfficial: true,
    activityType: 'art_walk'
  },
  {
    sourceId: 'us-la-hollywood-bowl-philharmonic-2026',
    title: 'Hollywood Bowl: Cinematic Scores Live Under the Stars',
    description: 'The Los Angeles Philharmonic performs legendary movie scores from John Williams, Hans Zimmer, and Ennio Morricone under the starlit Hollywood hills. Bring your wine and picnic basket.',
    category: 'music',
    date: futureDate(9, 20, 0),
    endDate: futureDate(9, 22, 30),
    timeZone: 'America/Los_Angeles',
    location: {
      type: 'Point',
      coordinates: [-118.3387, 34.1122],
      address: '2301 N Highland Avenue, Hollywood',
      venue: 'Hollywood Bowl Amphitheater',
      city: 'Los Angeles',
      country: 'Estados Unidos',
      countryCode: 'US'
    },
    price: { amount: 55, currency: 'USD' },
    images: [{ url: 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=1200&q=80' }],
    maxAttendees: 17500,
    tags: ['hollywood', 'hollywood-bowl', 'filarmonica', 'cine', 'los-angeles', 'california'],
    isOfficial: true,
    activityType: 'orchestra'
  },

  // =========================================================================
  // 8. REPÚBLICA DOMINICANA 🇩🇴 (Santo Domingo, Santiago, Punta Cana)
  // =========================================================================
  {
    sourceId: 'do-sd-olimpico-ritmo-2026',
    title: 'Festival Presidente del Ritmo: Merengue, Bachata & Urbano',
    description: 'El evento musical más gigantesco del Caribe en el Estadio Olímpico Félix Sánchez. Las máximas estrellas de la bachata, el merengue y el dembow dominicano en una producción con sonido envolvente y fuegos artificiales.',
    category: 'music',
    date: futureDate(14, 17, 0),
    endDate: futureDate(15, 2, 0),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.9175, 18.4795],
      address: 'Avenida 27 de Febrero esq. Máximo Gómez',
      venue: 'Estadio Olímpico Félix Sánchez',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      countryCode: 'DO'
    },
    price: { amount: 2000, currency: 'DOP' },
    images: [{ url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1200&q=80' }],
    maxAttendees: 50000,
    tags: ['santo-domingo', 'olimpico', 'bachata', 'merengue', 'dembow', 'rd'],
    isOfficial: true,
    activityType: 'mega_festival'
  },
  {
    sourceId: 'do-sd-ruinas-bonye-2026',
    title: 'Grupo Bonyé: Tarde Dominicana de Son, Merengue y Montuno',
    description: 'La tradición cultural más pura de los domingos en Santo Domingo. Cientos de parejas bailando son tradicional, merengue de orquesta y salsa en vivo frente a los muros centenarios de las Ruinas de San Francisco. Entrada libre.',
    category: 'dance',
    date: futureDate(1, 17, 30),
    endDate: futureDate(1, 22, 0),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.8856, 18.4764],
      address: 'Calle Hostos con Emiliano Tejera, Zona Colonial',
      venue: 'Ruinas del Monasterio de San Francisco',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      countryCode: 'DO'
    },
    price: { amount: 0, currency: 'DOP' },
    images: [{ url: 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=1200&q=80' }],
    maxAttendees: 2500,
    tags: ['bonye', 'zona-colonial', 'son', 'merengue', 'baile', 'gratis', 'domingo'],
    isOfficial: true,
    activityType: 'traditional_dance'
  },
  {
    sourceId: 'do-sti-monumento-jazz-2026',
    title: 'Noche de Jazz & Perico Ripiao en el Monumento de Santiago',
    description: 'Encuentro cultural al aire libre al pie del majestuoso Monumento a los Héroes de la Restauración. Acordeón cibaeño, güira y tambora fusionados con trompetas de jazz contemporáneo.',
    category: 'music',
    date: futureDate(6, 19, 0),
    endDate: futureDate(6, 22, 30),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-70.6865, 19.4502],
      address: 'Avenida Francia esq. Calle El Sol',
      venue: 'Monumento a los Héroes de la Restauración',
      city: 'Santiago de los Caballeros',
      country: 'República Dominicana',
      countryCode: 'DO'
    },
    price: { amount: 0, currency: 'DOP' },
    images: [{ url: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=1200&q=80' }],
    maxAttendees: 1800,
    tags: ['santiago', 'monumento', 'jazz', 'perico-ripiao', 'cibao', 'gratis'],
    isOfficial: true,
    activityType: 'fusion_concert'
  },
  {
    sourceId: 'do-pc-sunset-beach-fest-2026',
    title: 'Punta Cana Caribbean Sunset & Beach Club Session',
    description: 'La mejor fiesta frente a las aguas turquesas del Caribe. DJs internacionales de tropical house, malabares con fuego, degustación de rones dominicanos prémium y ambientación bohemia en la playa.',
    category: 'nightlife',
    date: futureDate(8, 16, 30),
    endDate: futureDate(8, 23, 30),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-68.3684, 18.5601],
      address: 'Carretera Bávaro - Punta Cana Km 5',
      venue: 'Punta Cana Beach Pavilion',
      city: 'Punta Cana',
      country: 'República Dominicana',
      countryCode: 'DO'
    },
    price: { amount: 2500, currency: 'DOP' },
    images: [{ url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80' }],
    maxAttendees: 2200,
    tags: ['punta-cana', 'playa', 'sunset', 'beach-club', 'fiesta', 'caribe'],
    isOfficial: true,
    activityType: 'beach_party'
  },

  // =========================================================================
  // 9. EVENTOS VIRTUALES & TRANSMISIONES GLOBALES 🌐 (Mundial / En Línea)
  // =========================================================================
  {
    sourceId: 'global-virtual-boiler-room-live-2026',
    title: '🔴 Boiler Room Worldwide: Live Electronic Underground Sets',
    description: 'Transmisión mundial en vivo de música electrónica, underground techno y house directamente desde clubes icónicos de Londres, Berlín, São Paulo y Tokio. Conéctate con audio de alta definición y chat interactivo en tiempo real.',
    category: 'music',
    date: futureDate(1, 16, 0),
    endDate: futureDate(1, 22, 0),
    timeZone: 'UTC',
    isVirtual: true,
    eventType: 'virtual',
    virtualPlatform: 'youtube_live',
    virtualLink: 'https://www.youtube.com/watch?v=live_boiler_room_worldwide',
    virtualDetails: {
      isStream: true,
      isWorkshop: false,
      isWebinar: false,
      streamEmbedUrl: 'https://www.youtube-nocookie.com/embed/live_stream?channel=BoilerRoom',
      prerequisites: ['Auriculares o altavoces con buenos graves']
    },
    location: {
      type: 'Point',
      coordinates: [0, 20],
      address: '🌐 Transmisión Mundial en Vivo · Acceso Global',
      venue: 'YouTube Live Official Stage',
      city: 'En Línea / Global',
      country: 'Mundial'
    },
    price: { amount: 0, currency: 'USD' },
    images: [{ url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80' }],
    maxAttendees: 50000,
    tags: ['stream', 'boiler-room', 'techno', 'live', 'virtual', 'musica'],
    isOfficial: true,
    activityType: 'live_stream'
  },
  {
    sourceId: 'global-virtual-twitch-rivals-2026',
    title: '🎮 Twitch Rivals: Gran Final Continental de Esports & Creadores',
    description: 'Torneo internacional en vivo con los mejores equipos de creadores de contenido compitiendo en directo. Drops exclusivos en el chat, entrevistas en vivo y casteo multilingüe.',
    category: 'gaming',
    date: futureDate(3, 15, 0),
    endDate: futureDate(3, 20, 0),
    timeZone: 'UTC',
    isVirtual: true,
    eventType: 'virtual',
    virtualPlatform: 'twitch',
    virtualLink: 'https://www.twitch.tv/twitchrivals_es',
    virtualDetails: {
      isStream: true,
      isWorkshop: false,
      isWebinar: false,
      streamEmbedUrl: 'https://player.twitch.tv/?channel=twitchrivals_es&parent=localhost',
      prerequisites: ['Cuenta de Twitch para interactuar en el chat']
    },
    location: {
      type: 'Point',
      coordinates: [0, 20],
      address: '🌐 Transmisión Mundial en Vivo · Acceso Global',
      venue: 'Twitch Interactive Channel',
      city: 'En Línea / Global',
      country: 'Mundial'
    },
    price: { amount: 0, currency: 'USD' },
    images: [{ url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&q=80' }],
    maxAttendees: 100000,
    tags: ['twitch', 'esports', 'gaming', 'stream', 'torneo', 'online'],
    isOfficial: true,
    activityType: 'esports_stream'
  },
  {
    sourceId: 'global-virtual-ai-agents-masterclass-2026',
    title: '⚡ Masterclass: Creando Agentes de IA Autónomos con DeepSeek y MCP',
    description: 'Taller interactivo en vivo: arquitectura de agentes que razonan, ejecutan código en paralelo, integran servidores Model Context Protocol (MCP) y automatizan tareas del mundo real. Código fuente abierto para todos los asistentes.',
    category: 'tech',
    date: futureDate(4, 18, 0),
    endDate: futureDate(4, 21, 0),
    timeZone: 'UTC',
    isVirtual: true,
    eventType: 'virtual',
    virtualPlatform: 'google_meet',
    virtualLink: 'https://meet.google.com/eventnow-ai-agents-2026',
    virtualDetails: {
      isStream: false,
      isWorkshop: true,
      isWebinar: true,
      meetingId: 'eventnow-ai-agents',
      prerequisites: ['Conocimientos básicos de JavaScript o Python', 'Computadora con conexión']
    },
    location: {
      type: 'Point',
      coordinates: [0, 20],
      address: '🌐 Sala Virtual Global · Google Meet',
      venue: 'Google Meet Stage',
      city: 'En Línea / Global',
      country: 'Mundial'
    },
    price: { amount: 0, currency: 'USD' },
    images: [{ url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&q=80' }],
    maxAttendees: 2000,
    tags: ['ia', 'agentes', 'deepseek', 'mcp', 'taller', 'tecnologia', 'virtual'],
    isOfficial: true,
    activityType: 'masterclass'
  },
  // =========================================================================
  // 10. FAMILIA, BEBÉS & MATERNIDAD SEGURA 🧸 (Comunidad Sensible & Cuidados)
  // =========================================================================
  {
    sourceId: 'do-sd-torneo-gateo-bebes-2026',
    title: 'Torneo de Gateo & Estimulación Sensorial para Bebés (6 a 18 meses)',
    description: 'Competencia recreativa y lúdica de gateo sobre colchonetas antialérgicas esterilizadas. Talleres de estimulación motriz temprana guiados por fisioterapeutas pediátricos, zona de descanso, estación de hidratación y medalla conmemorativa para todos los bebés participantes.',
    category: 'family',
    date: futureDate(5, 10, 0),
    endDate: futureDate(5, 13, 0),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.9392, 18.4715],
      address: 'Avenida John F. Kennedy con Tiradentes (Nivel 4)',
      venue: 'Ágora Cultural Kids & Family Space',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      countryCode: 'DO'
    },
    price: { amount: 350, currency: 'DOP' },
    images: [{ url: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=1200&q=80' }],
    maxAttendees: 80,
    tags: ['bebes', 'gateo', 'familia', 'estimulacion-temprana', 'ninos', 'santo-domingo'],
    isOfficial: true,
    activityType: 'baby_competition',
    familyDetails: {
      isFamilyEvent: true,
      targetAudience: 'babies',
      ageMinMonths: 6,
      ageMaxMonths: 18,
      strollerAccessible: true,
      nursingRoomAvailable: true,
      diaperChangingStation: true,
      supervisionRequired: true,
      safetyNotes: 'Acompañamiento obligatorio de al menos un padre o tutor legal. Pistas acolchadas higienizadas.'
    }
  },
  {
    sourceId: 'do-sd-taller-lactancia-maternidad-2026',
    title: 'Taller de Lactancia Materna, Postparto y Crianza Respetuosa',
    description: 'Espacio cálido y seguro para futuras madres, madres lactantes y sus parejas. Asesoría con consultoras internacionales de lactancia (IBCLC), técnicas de agarre sin dolor, gestión del sueño infantil, nutrición postparto y círculo de escucha emocional.',
    category: 'education',
    date: futureDate(4, 15, 30),
    endDate: futureDate(4, 18, 0),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.9312, 18.4861],
      address: 'Avenida Winston Churchill, Piantini',
      venue: 'Centro de Bienestar Materno-Infantil',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      countryCode: 'DO'
    },
    price: { amount: 800, currency: 'DOP' },
    images: [{ url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=1200&q=80' }],
    maxAttendees: 35,
    tags: ['maternidad', 'lactancia', 'madres', 'postparto', 'bebes', 'crianza'],
    isOfficial: true,
    activityType: 'parenting_workshop',
    familyDetails: {
      isFamilyEvent: true,
      targetAudience: 'parents',
      strollerAccessible: true,
      nursingRoomAvailable: true,
      diaperChangingStation: true,
      supervisionRequired: false
    }
  },

  // =========================================================================
  // 11. DÍAS FESTIVOS & CELEBRACIONES TEMÁTICAS 💐❤️
  // =========================================================================
  {
    sourceId: 'do-sd-especial-madres-botanico-2026',
    title: 'Especial Día de las Madres: Serenata & Picnic en el Jardín Botánico',
    description: 'Celebración familiar para homenajear a las madres en su día. Ensamble de cuerdas en vivo bajo los árboles del pabellón de helechos, merienda campestre, sesiones fotográficas familiares gratuitas y flores de bienvenida para cada madre.',
    category: 'music',
    date: futureDate(9, 11, 0),
    endDate: futureDate(9, 16, 0),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.9547, 18.4908],
      address: 'Avenida República de Colombia, Los Jardines',
      venue: 'Jardín Botánico Nacional Dr. Rafael M. Moscoso',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      countryCode: 'DO'
    },
    price: { amount: 450, currency: 'DOP' },
    images: [{ url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1200&q=80' }],
    maxAttendees: 1500,
    tags: ['dia-de-las-madres', 'madres', 'familia', 'botanico', 'serenata', 'musica'],
    isOfficial: true,
    activityType: 'holiday_celebration',
    holidaySeason: 'mothers_day',
    holidayLabel: 'Especial Día de las Madres',
    familyDetails: {
      isFamilyEvent: true,
      targetAudience: 'all_family',
      strollerAccessible: true,
      diaperChangingStation: true
    }
  },
  {
    sourceId: 'es-mad-san-valentin-tardeo-2026',
    title: 'Especial San Valentín: Tardeo Romántico & Jazz Acústico en el Retiro',
    description: 'Celebración del amor y la amistad en los jardines históricos de Madrid. Paseo en barca por el estanque, cócteles de autor con fresas silvestres, velas al caer la noche y música íntima de saxofón y guitarra española.',
    category: 'music',
    date: futureDate(3, 18, 0),
    endDate: futureDate(3, 22, 0),
    timeZone: 'Europe/Madrid',
    location: {
      type: 'Point',
      coordinates: [-3.6838, 40.4153],
      address: 'Plaza de la Independencia 7, Parque del Retiro',
      venue: 'Estanque Grande y Terrazas del Retiro',
      city: 'Madrid',
      country: 'España',
      countryCode: 'ES'
    },
    price: { amount: 25, currency: 'EUR' },
    images: [{ url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=1200&q=80' }],
    maxAttendees: 400,
    tags: ['san-valentin', 'amor', 'madrid', 'retiro', 'jazz', 'romantico'],
    isOfficial: true,
    activityType: 'romantic_gathering',
    holidaySeason: 'valentines',
    holidayLabel: 'Especial San Valentín'
  },

  // =========================================================================
  // 12. SALUD COMUNITARIA & INVESTIGACIÓN CIENTÍFICA ACREDITADA 🏥🔬
  // =========================================================================
  {
    sourceId: 'do-sd-jornada-salud-comunitaria-2026',
    title: 'Jornada Comunitaria de Salud Visual, Pediatría y Chequeos Gratuitos',
    description: 'Operativo médico asistencial y preventivo para familias y adultos mayores. Consultas gratuitas de oftalmología (con entrega de lentes de lectura según evaluación), despistaje de hipertensión/diabetes, vacunación pediátrica y orientación nutricional comunitaria.',
    category: 'health',
    date: futureDate(2, 8, 30),
    endDate: futureDate(2, 14, 0),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.8974, 18.4725],
      address: 'Calle Caracas esq. Calle Ravelo, Villa Francisca',
      venue: 'Centro Comunitario & Parroquial Villa Francisca',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      countryCode: 'DO'
    },
    price: { amount: 0, currency: 'DOP' },
    images: [{ url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=1200&q=80' }],
    maxAttendees: 500,
    tags: ['salud', 'operativo-medico', 'gratis', 'pediatria', 'oftalmologia', 'comunidad'],
    isOfficial: true,
    activityType: 'free_health_clinic',
    healthDetails: {
      isHealthInitiative: true,
      healthType: 'community_clinic',
      hospitalOrInstitution: 'Patronato de Salud Comunitaria & Cruz Roja Dominicana',
      medicalDisclaimer: 'Operativo médico preventivo y asistencial sin costo. Atención por orden de llegada con médicos colegiados y voluntarios de salud certificados.'
    }
  },
  {
    sourceId: 'do-sd-estudio-clinico-acreditado-2026',
    title: 'Ficha Informativa: Protocolo Clínico en Salud Cardiovascular (Centro Acreditado)',
    description: 'Aviso institucional de divulgación científica: centro de investigaciones biomédicas universitario abre convocatoria para protocolo observacional y clínico en prevención de factores de riesgo cardíaco. Incluye chequeos de laboratorio y seguimiento cardiológico especializado sin costo para participantes calificados.',
    category: 'health',
    date: futureDate(7, 9, 0),
    endDate: futureDate(7, 13, 0),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.9115, 18.4731],
      address: 'Avenida Pedro Henríquez Ureña esq. Alma Mater',
      venue: 'Centro de Investigaciones Médicas y Biomédicas Universitario',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      countryCode: 'DO'
    },
    price: { amount: 0, currency: 'DOP' },
    images: [{ url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1200&q=80' }],
    maxAttendees: 150,
    tags: ['investigacion-medica', 'salud', 'cardiologia', 'estudio-clinico', 'hospital'],
    isOfficial: true,
    activityType: 'clinical_trial_info',
    healthDetails: {
      isHealthInitiative: true,
      healthType: 'clinical_trial_info',
      hospitalOrInstitution: 'Centro de Investigaciones Médicas y Cardiovasculares (Hospital Universitario)',
      clinicalTrialId: 'NCT06184201',
      ethicsApprovalRef: 'Comité de Bioética en Investigación Ref. CBI-2026-44',
      medicalDisclaimer: 'Aviso estrictamente divulgativo e institucional de protocolo clínico aprobado. EventNow no intermedia ni diagnostica. La elegibilidad voluntaria se evalúa formalmente en la consulta médica del hospital patrocinador.'
    }
  },

  // ==========================================
  // REINO UNIDO (UK - Gran Bretaña)
  // ==========================================
  {
    sourceId: 'gb-lon-soho-ronnie-scotts',
    title: 'Soho Live Jazz & Late Night Jam en Ronnie Scott’s',
    description: 'La mítica catedral del jazz de Londres abre sus puertas para una sesión de jazz clásico, neo-soul e improvisación libre con leyendas locales y talentos emergentes del West End. Cócteles clásicos y ambiente íntimo.',
    category: 'music',
    date: futureDate(3, 20, 30),
    endDate: futureDate(4, 1, 30),
    timeZone: 'Europe/London',
    location: {
      type: 'Point',
      coordinates: [-0.1311, 51.5134],
      address: '47 Frith Street, Soho',
      venue: 'Ronnie Scott’s Jazz Club',
      city: 'Londres',
      country: 'Reino Unido',
      countryCode: 'GB'
    },
    price: { amount: 35, currency: 'GBP' },
    images: [{ url: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=1200&q=80' }],
    maxAttendees: 220,
    tags: ['jazz', 'london', 'soho', 'musica', 'en-vivo', 'nightlife'],
    isOfficial: true,
    activityType: 'concert',
    organizer: 'Ronnie Scott’s Official Productions'
  },
  {
    sourceId: 'gb-lon-camden-indie-market',
    title: 'Camden Market Indie Vinyl & Street Art Fest',
    description: 'Encuentro de coleccionistas de vinilos, ilustración independiente, ropa vintage y bandas de indie-rock británicas en directo junto al Regent’s Canal. Street food de 30 países.',
    category: 'culture',
    date: futureDate(5, 11, 0),
    endDate: futureDate(5, 19, 0),
    timeZone: 'Europe/London',
    location: {
      type: 'Point',
      coordinates: [-0.1448, 51.5414],
      address: 'Camden Lock Place, Camden Town',
      venue: 'Camden Lock Market',
      city: 'Londres',
      country: 'Reino Unido',
      countryCode: 'GB'
    },
    price: { amount: 0, currency: 'GBP' },
    images: [{ url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&q=80' }],
    maxAttendees: 3000,
    tags: ['camden', 'london', 'indie', 'arte', 'vinilos', 'gratis'],
    isOfficial: true,
    activityType: 'street_market'
  },
  {
    sourceId: 'gb-lon-tate-modern-lates',
    title: 'Tate Modern Lates: Arte Contemporáneo, Sintetizadores & DJ Set',
    description: 'Apertura nocturna exclusiva de las galerías de arte contemporáneo de la Tate Modern en Bankside. Instalaciones audiovisuales inmersivas, DJs de música ambient y debates culturales con vistas al Támesis y San Pablo.',
    category: 'art',
    date: futureDate(9, 18, 0),
    endDate: futureDate(9, 22, 30),
    timeZone: 'Europe/London',
    location: {
      type: 'Point',
      coordinates: [-0.0994, 51.5076],
      address: 'Bankside, London SE1 9TG',
      venue: 'Tate Modern (Turbine Hall)',
      city: 'Londres',
      country: 'Reino Unido',
      countryCode: 'GB'
    },
    price: { amount: 0, currency: 'GBP' },
    images: [{ url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1200&q=80' }],
    maxAttendees: 1500,
    tags: ['tate-modern', 'arte', 'london', 'cultura', 'gratis', 'nocturno'],
    isOfficial: true,
    activityType: 'museum_night'
  },

  // ==========================================
  // FRANCIA (FR)
  // ==========================================
  {
    sourceId: 'fr-par-montmartre-chanson',
    title: 'Montmartre Bohème: Noche de Chanson Francesa & Degustación de Vinos',
    description: 'En el corazón bohemio de Montmartre, a pasos del Sacré-Cœur. Acordeón clásico, poesía callejera y canciones de Piaf y Brel interpretadas por artistas parisinos con cata de vinos biodinámicos del Loira y quesos artesanales.',
    category: 'music',
    date: futureDate(4, 19, 30),
    endDate: futureDate(4, 23, 0),
    timeZone: 'Europe/Paris',
    location: {
      type: 'Point',
      coordinates: [2.3431, 48.8867],
      address: 'Place du Tertre, Montmartre',
      venue: 'Café des Artistes de Montmartre',
      city: 'París',
      country: 'Francia',
      countryCode: 'FR'
    },
    price: { amount: 28, currency: 'EUR' },
    images: [{ url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80' }],
    maxAttendees: 90,
    tags: ['paris', 'montmartre', 'chanson', 'vino', 'francia', 'bohemio'],
    isOfficial: true,
    activityType: 'live_acoustic'
  },
  {
    sourceId: 'fr-par-marais-art-walk',
    title: 'Le Marais Gallery Night & Sunset en el Sena',
    description: 'Recorrido curado por las galerías más vanguardistas del Marais, seguido de un brindis al atardecer frente al Pont des Arts. Encuentro de artistas plásticos, fotógrafos y diseñadores de moda.',
    category: 'art',
    date: futureDate(7, 18, 0),
    endDate: futureDate(7, 22, 0),
    timeZone: 'Europe/Paris',
    location: {
      type: 'Point',
      coordinates: [2.3622, 48.8575],
      address: 'Rue des Francs-Bourgeois, Le Marais',
      venue: 'Galeries du Marais',
      city: 'París',
      country: 'Francia',
      countryCode: 'FR'
    },
    price: { amount: 0, currency: 'EUR' },
    images: [{ url: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1200&q=80' }],
    maxAttendees: 350,
    tags: ['paris', 'art', 'marais', 'galeria', 'sena', 'gratis'],
    isOfficial: true,
    activityType: 'art_walk'
  },

  // ==========================================
  // ALEMANIA (DE)
  // ==========================================
  {
    sourceId: 'de-ber-kreuzberg-underground',
    title: 'Kreuzberg Modular Synth & Deep Electronic Session',
    description: 'El sonido auténtico de Berlín en una antigua nave industrial junto al río Spree. Sesión de sintetizadores modulares analógicos, proyecciones visuales generativas y DJ set de techno melódico hasta el amanecer.',
    category: 'nightlife',
    date: futureDate(5, 23, 0),
    endDate: futureDate(6, 6, 0),
    timeZone: 'Europe/Berlin',
    location: {
      type: 'Point',
      coordinates: [13.4385, 52.4991],
      address: 'Schlesische Straße 28, Kreuzberg',
      venue: 'Spree Werkstatt & Sound Laboratory',
      city: 'Berlín',
      country: 'Alemania',
      countryCode: 'DE'
    },
    price: { amount: 18, currency: 'EUR' },
    images: [{ url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80' }],
    maxAttendees: 400,
    tags: ['berlin', 'techno', 'kreuzberg', 'synth', 'electronic', 'nightlife'],
    isOfficial: true,
    activityType: 'electronic_club'
  },
  {
    sourceId: 'de-ber-mauerpark-karaoke-fest',
    title: 'Mauerpark Sunday Open-Air Karaoke & Flea Market',
    description: 'El domingo más vibrante de Berlín en el antiguo muro. Cientos de personas animando en el anfiteatro al aire libre, comida callejera internacional, mercado de pulgas histórico y artistas callejeros de todo el mundo.',
    category: 'social',
    date: futureDate(3, 13, 0),
    endDate: futureDate(3, 18, 30),
    timeZone: 'Europe/Berlin',
    location: {
      type: 'Point',
      coordinates: [13.4026, 52.5447],
      address: 'Gleimstraße 55, Prenzlauer Berg',
      venue: 'Mauerpark Amphitheater',
      city: 'Berlín',
      country: 'Alemania',
      countryCode: 'DE'
    },
    price: { amount: 0, currency: 'EUR' },
    images: [{ url: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1200&q=80' }],
    maxAttendees: 4000,
    tags: ['berlin', 'mauerpark', 'karaoke', 'domingo', 'comunidad', 'gratis'],
    isOfficial: true,
    activityType: 'open_air_festival'
  },

  // ==========================================
  // CHILE (CL)
  // ==========================================
  {
    sourceId: 'cl-stgo-bellavista-bohemia',
    title: 'Barrio Bellavista: Noche de Cueca Brava, Cumbia & Terremotos',
    description: 'La esencia de la bohemia santiaguina en Bellavista. Bandas de cueca urbana y cumbia chilena en vivo, mesas largas, degustación de terremoto tradicional y ambiente de fiesta popular.',
    category: 'music',
    date: futureDate(6, 21, 0),
    endDate: futureDate(7, 2, 30),
    timeZone: 'America/Santiago',
    location: {
      type: 'Point',
      coordinates: [-70.6353, -33.4338],
      address: 'Calle Constitución esq. Dardignac, Bellavista',
      venue: 'Galpón Cultural Víctor Jara de Bellavista',
      city: 'Santiago',
      country: 'Chile',
      countryCode: 'CL'
    },
    price: { amount: 8000, currency: 'CLP' },
    images: [{ url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&q=80' }],
    maxAttendees: 300,
    tags: ['santiago', 'chile', 'bellavista', 'cueca', 'cumbia', 'bohemia'],
    isOfficial: true,
    activityType: 'live_concert'
  },

  // ==========================================
  // PERÚ (PE)
  // ==========================================
  {
    sourceId: 'pe-lim-barranco-afroperuano',
    title: 'Barranco Bohemio: Noche Afroperuana, Pisco Sour & Cajón en Vivo',
    description: 'Frente al Puente de los Suspiros en el distrito tradicional de Barranco. Maestros cajoneros afroperuanos, festejo, landó y jazz fusión en vivo, acompañado de la mejor coctelería a base de pisco quebranta.',
    category: 'music',
    date: futureDate(5, 20, 0),
    endDate: futureDate(5, 23, 30),
    timeZone: 'America/Lima',
    location: {
      type: 'Point',
      coordinates: [-77.0219, -12.1489],
      address: 'Bajada de Baños 340, Barranco',
      venue: 'Peña & Centro Cultural La Noche de Barranco',
      city: 'Lima',
      country: 'Perú',
      countryCode: 'PE'
    },
    price: { amount: 45, currency: 'PEN' },
    images: [{ url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80' }],
    maxAttendees: 180,
    tags: ['lima', 'peru', 'barranco', 'afroperuano', 'cajon', 'pisco'],
    isOfficial: true,
    activityType: 'peña_cultural'
  },

  // ==========================================
  // CANADÁ (CA)
  // ==========================================
  {
    sourceId: 'ca-tor-queen-west-indie',
    title: 'Queen West Live Indie & Underground Showcase (Toronto)',
    description: 'En el epicentro del arte y la música independiente de Toronto. Tres bandas de indie rock canadiense, pop sintético y exposición de arte visual en The Drake Underground.',
    category: 'music',
    date: futureDate(4, 20, 0),
    endDate: futureDate(4, 23, 30),
    timeZone: 'America/Toronto',
    location: {
      type: 'Point',
      coordinates: [-79.4239, 43.6432],
      address: '1150 Queen Street West',
      venue: 'The Drake Underground',
      city: 'Toronto',
      country: 'Canadá',
      countryCode: 'CA'
    },
    price: { amount: 22, currency: 'CAD' },
    images: [{ url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&q=80' }],
    maxAttendees: 250,
    tags: ['toronto', 'canada', 'indie', 'live-music', 'queen-west'],
    isOfficial: true,
    activityType: 'concert'
  },
  {
    sourceId: 'ca-mtl-plateau-rooftop-fest',
    title: 'Plateau-Mont-Royal Sunset Rooftop Jam (Montréal)',
    description: 'Vistas panorámicas de la ciudad y el Mont-Royal. Músicos francófonos y anglófonos mezclando folk moderno, ritmos caribeños y electrónica orgánica en una terraza comunitaria.',
    category: 'music',
    date: futureDate(8, 17, 30),
    endDate: futureDate(8, 22, 0),
    timeZone: 'America/Toronto',
    location: {
      type: 'Point',
      coordinates: [-73.5794, 45.5218],
      address: 'Avenue du Mont-Royal Est',
      venue: 'Terrasse Collective du Plateau',
      city: 'Montreal',
      country: 'Canadá',
      countryCode: 'CA'
    },
    price: { amount: 15, currency: 'CAD' },
    images: [{ url: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=1200&q=80' }],
    maxAttendees: 160,
    tags: ['montreal', 'plateau', 'rooftop', 'sunset', 'musica'],
    isOfficial: true,
    activityType: 'rooftop_session'
  },

  // ==========================================
  // ITALIA (IT)
  // ==========================================
  {
    sourceId: 'it-rom-trastevere-serenata',
    title: 'Trastevere Antico: Aperitivo, Serenata & Chitarra Romana',
    description: 'Entre callejones empedrados y flores en los balcones de Trastevere. Aperitivo tradicional italiano (Spritz, supplì y focaccia caliente) con música acústica en vivo de serenatas romanas bajo las estrellas.',
    category: 'music',
    date: futureDate(4, 19, 0),
    endDate: futureDate(4, 23, 0),
    timeZone: 'Europe/Rome',
    location: {
      type: 'Point',
      coordinates: [12.4709, 41.8893],
      address: 'Piazza Santa Maria in Trastevere',
      venue: 'Piazza Trastevere & Chiostro Storico',
      city: 'Roma',
      country: 'Italia',
      countryCode: 'IT'
    },
    price: { amount: 20, currency: 'EUR' },
    images: [{ url: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1200&q=80' }],
    maxAttendees: 150,
    tags: ['roma', 'trastevere', 'italia', 'aperitivo', 'serenata', 'acustico'],
    isOfficial: true,
    activityType: 'live_acoustic'
  },
  {
    sourceId: 'it-mil-navigli-design-aperitivo',
    title: 'Navigli Design & Art Jam en el Canal Grande (Milano)',
    description: 'A orillas del histórico canal de los Navigli en Milán. Exposición de diseño industrial, instalaciones lumínicas de jóvenes creadores italianos y aperitivo con DJ set de jazz electrónico.',
    category: 'art',
    date: futureDate(7, 18, 30),
    endDate: futureDate(7, 23, 0),
    timeZone: 'Europe/Rome',
    location: {
      type: 'Point',
      coordinates: [9.1728, 45.4512],
      address: 'Ripa di Porta Ticinese, Navigli',
      venue: 'Spazio Naviglio Grande',
      city: 'Milán',
      country: 'Italia',
      countryCode: 'IT'
    },
    price: { amount: 15, currency: 'EUR' },
    images: [{ url: 'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?w=1200&q=80' }],
    maxAttendees: 300,
    tags: ['milan', 'navigli', 'design', 'arte', 'aperitivo', 'italia'],
    isOfficial: true,
    activityType: 'art_showcase'
  },

  // ==========================================
  // REPÚBLICA DOMINICANA (DO) - EXPANSIÓN PROVINCIAL
  // ==========================================
  {
    sourceId: 'do-pop-cabarete-kitesurf-bonfire',
    title: 'Cabarete Kite Fest, Beach Bonfire & Reggae en Vivo',
    description: 'La capital de los deportes de viento del Caribe en su máxima expresión. Competencia de exhibición de kitesurf y wingfoil al atardecer, fogata comunitaria en la arena, tambores y banda de reggae en vivo frente al mar.',
    category: 'sports',
    date: futureDate(6, 16, 0),
    endDate: futureDate(6, 23, 30),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-70.4072, 19.7511],
      address: 'Kite Beach Cabarete, Carretera Principal',
      venue: 'Kite Beach Cabarete',
      city: 'Puerto Plata',
      country: 'República Dominicana',
      countryCode: 'DO'
    },
    price: { amount: 0, currency: 'DOP' },
    images: [{ url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80' }],
    maxAttendees: 1200,
    tags: ['cabarete', 'puerto-plata', 'kitesurf', 'playa', 'fogata', 'gratis'],
    isOfficial: true,
    activityType: 'beach_festival'
  },
  {
    sourceId: 'do-sam-lasterrenas-sunset-coco',
    title: 'Las Terrenas Sunset Bachata & Coco Loco Fest',
    description: 'Playa Bonita y Cosón se llenan de ritmo caribeño. Clases de bachata tradicional frente a los cocoteros, DJs de afro-latin beats y degustación de cócteles tropicales en coco fresco.',
    category: 'dance',
    date: futureDate(5, 17, 0),
    endDate: futureDate(5, 23, 0),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.5601, 19.3242],
      address: 'Paseo de la Costanera, Playa Bonita',
      venue: 'Playa Bonita Village',
      city: 'Samaná',
      country: 'República Dominicana',
      countryCode: 'DO'
    },
    price: { amount: 500, currency: 'DOP' },
    images: [{ url: 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=1200&q=80' }],
    maxAttendees: 800,
    tags: ['las-terrenas', 'samana', 'playa', 'bachata', 'baile', 'caribe'],
    isOfficial: true,
    activityType: 'beach_party'
  },
  {
    sourceId: 'do-jar-campamento-cafe-fogata',
    title: 'Jarabacoa: Campamento de Montaña, Fogata & Ruta del Café',
    description: 'En el frescor de la Cordillera Central. Caminata ecológica por cafetales de altura, tostado artesanal de café en leña, historias campesinas al calor de la fogata y música de guitarra acústica bajo las estrellas.',
    category: 'outdoors',
    date: futureDate(7, 15, 0),
    endDate: futureDate(8, 12, 0),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-70.6416, 19.1215],
      address: 'Carretera Jarabacoa - Manabao Km 8',
      venue: 'Campamento Ecológico Los Pinos',
      city: 'Jarabacoa',
      country: 'República Dominicana',
      countryCode: 'DO'
    },
    price: { amount: 1500, currency: 'DOP' },
    images: [{ url: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1200&q=80' }],
    maxAttendees: 120,
    tags: ['jarabacoa', 'montana', 'camping', 'cafe', 'fogata', 'naturaleza'],
    isOfficial: true,
    activityType: 'outdoor_adventure'
  },
  {
    sourceId: 'do-rom-bayahibe-catamaran-sunset',
    title: 'Bayahíbe Sunset Catamarán & Snorkel en el Parque Cotubanamá',
    description: 'Zarpe desde el pintoresco muelle de Bayahíbe en un catamarán de vela. Parada de snorkel en arrecife de coral protegido, barra libre de bebidas nacionales, música caribeña y regreso al caer el sol.',
    category: 'outdoors',
    date: futureDate(9, 14, 0),
    endDate: futureDate(9, 19, 0),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-68.8398, 18.3756],
      address: 'Muelle Turístico de Bayahíbe',
      venue: 'Embarcadero de Bayahíbe',
      city: 'La Romana',
      country: 'República Dominicana',
      countryCode: 'DO'
    },
    price: { amount: 3200, currency: 'DOP' },
    images: [{ url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80' }],
    maxAttendees: 60,
    tags: ['bayahibe', 'la-romana', 'catamaran', 'snorkel', 'sunset', 'tour'],
    isOfficial: true,
    activityType: 'boat_tour'
  },
  {
    sourceId: 'do-sti-murales-merengue-tipico',
    title: 'Ruta de los Murales de Los Pepines & Noche de Merengue Típico',
    description: 'Tour guiado a pie por los vibrantes callejones artísticos de Los Pepines en Santiago. Historia urbana contada en murales, rematando con picadera criolla, yaniqueques y fiesta de perico ripiao en un patio cultural.',
    category: 'culture',
    date: futureDate(4, 18, 0),
    endDate: futureDate(4, 22, 30),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-70.6974, 19.4526],
      address: 'Calle Cuba esq. Calle 16 de Agosto, Los Pepines',
      venue: 'Callejón del Arte Los Pepines',
      city: 'Santiago de los Caballeros',
      country: 'República Dominicana',
      countryCode: 'DO'
    },
    price: { amount: 350, currency: 'DOP' },
    images: [{ url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1200&q=80' }],
    maxAttendees: 150,
    tags: ['santiago', 'los-pepines', 'murales', 'merengue-tipico', 'cultura', 'cibao'],
    isOfficial: true,
    activityType: 'cultural_walk'
  },

  // ==========================================
  // MEGA-FESTIVALES LEGENDARIOS DEL MUNDO
  // ==========================================
  {
    sourceId: 'be-tomorrowland-mainstage',
    title: 'Tomorrowland: The Book of Wisdom (Mainstage Experience)',
    description: 'El festival de música electrónica más icónico del planeta en Boom, Bélgica. Escenarios monumentales de fantasía, pirotecnia sincronizada y los mejores DJs del mundo en una atmósfera de hermandad global.',
    category: 'music',
    date: futureDate(25, 12, 0),
    endDate: futureDate(28, 0, 0),
    timeZone: 'Europe/Brussels',
    location: {
      type: 'Point',
      coordinates: [4.3853, 51.0914],
      address: 'De Schorre Recreation Ground, Schommelei 1',
      venue: 'De Schorre Park Mainstage',
      city: 'Boom',
      country: 'Bélgica',
      countryCode: 'BE'
    },
    price: { amount: 375, currency: 'EUR' },
    images: [{ url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&q=80' }],
    maxAttendees: 180000,
    tags: ['tomorrowland', 'belgica', 'edm', 'festival', 'mainstage', 'electronic'],
    isOfficial: true,
    activityType: 'mega_festival'
  },
  {
    sourceId: 'us-coachella-indio',
    title: 'Coachella Valley Music & Arts Festival',
    description: 'El legendario encuentro de música, moda y arte en el Empire Polo Club en el desierto de California. Artistas de talla mundial, carpas masivas de electrónica y esculturas a escala colosal.',
    category: 'music',
    date: futureDate(18, 14, 0),
    endDate: futureDate(21, 1, 0),
    timeZone: 'America/Los_Angeles',
    location: {
      type: 'Point',
      coordinates: [-116.2372, 33.6803],
      address: '81-800 Avenue 51',
      venue: 'Empire Polo Club',
      city: 'Indio',
      country: 'Estados Unidos',
      countryCode: 'US'
    },
    price: { amount: 549, currency: 'USD' },
    images: [{ url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&q=80' }],
    maxAttendees: 125000,
    tags: ['coachella', 'california', 'indie', 'pop', 'fashion', 'festival'],
    isOfficial: true,
    activityType: 'mega_festival'
  },
  {
    sourceId: 'es-bcn-primavera-sound',
    title: 'Primavera Sound Barcelona: Parc del Fòrum',
    description: 'El festival de música independiente y vanguardia más prestigioso de Europa frente al Mar Mediterráneo. Decenas de escenarios simultáneos de indie, rock, electrónica y música urbana.',
    category: 'music',
    date: futureDate(22, 16, 0),
    endDate: futureDate(25, 4, 0),
    timeZone: 'Europe/Madrid',
    location: {
      type: 'Point',
      coordinates: [2.2215, 41.4116],
      address: 'Carrer de la Pau 12, Sant Martí',
      venue: 'Parc del Fòrum',
      city: 'Barcelona',
      country: 'España',
      countryCode: 'ES'
    },
    price: { amount: 265, currency: 'EUR' },
    images: [{ url: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200&q=80' }],
    maxAttendees: 80000,
    tags: ['primaverasound', 'barcelona', 'indie', 'rock', 'mediterraneo', 'festival'],
    isOfficial: true,
    activityType: 'mega_festival'
  },
  {
    sourceId: 'gb-glastonbury-pyramid',
    title: 'Glastonbury Festival of Contemporary Performing Arts',
    description: 'El legendario festival en Worthy Farm en Somerset, Inglaterra. Conciertos históricos en el Pyramid Stage, teatro, circo, poesía y campamentos al aire libre.',
    category: 'music',
    date: futureDate(30, 11, 0),
    endDate: futureDate(34, 2, 0),
    timeZone: 'Europe/London',
    location: {
      type: 'Point',
      coordinates: [-2.5858, 51.1537],
      address: 'Worthy Farm, Pilton',
      venue: 'Pyramid Stage & Worthy Grounds',
      city: 'Pilton',
      country: 'Reino Unido',
      countryCode: 'GB'
    },
    price: { amount: 335, currency: 'GBP' },
    images: [{ url: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1200&q=80' }],
    maxAttendees: 210000,
    tags: ['glastonbury', 'uk', 'pyramid-stage', 'rock', 'legendario', 'camping'],
    isOfficial: true,
    activityType: 'mega_festival'
  },
  {
    sourceId: 'cl-vina-del-mar-quinta',
    title: 'Festival Internacional de la Canción de Viña del Mar',
    description: 'El festival hispanoamericano más importante en el Anfiteatro de la Quinta Vergara. El Monstruo de la Quinta Vergara premia a los artistas con Gaviotas de Plata y Oro.',
    category: 'music',
    date: futureDate(15, 21, 0),
    endDate: futureDate(16, 2, 30),
    timeZone: 'America/Santiago',
    location: {
      type: 'Point',
      coordinates: [-71.5519, -33.0298],
      address: 'Calle Errázuriz 596',
      venue: 'Anfiteatro de la Quinta Vergara',
      city: 'Viña del Mar',
      country: 'Chile',
      countryCode: 'CL'
    },
    price: { amount: 45000, currency: 'CLP' },
    images: [{ url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80' }],
    maxAttendees: 15000,
    tags: ['vinadelmar', 'chile', 'quintavergara', 'cancion', 'gaviota', 'musica'],
    isOfficial: true,
    activityType: 'festival'
  },
  {
    sourceId: 'co-mde-feria-flores',
    title: 'Feria de las Flores: Gran Desfile de Silleteros de Medellín',
    description: 'La tradición más hermosa de Antioquia. Cientos de campesinos de Santa Elena desfilan cargando monumentales silletas florales de más de 80 kilos por las avenidas de Medellín con música de carrilera y fiesta comunitaria.',
    category: 'culture',
    date: futureDate(10, 10, 0),
    endDate: futureDate(10, 18, 0),
    timeZone: 'America/Bogota',
    location: {
      type: 'Point',
      coordinates: [-75.5751, 6.2442],
      address: 'Avenida del Río con San Juan',
      venue: 'Ruta del Desfile de Silleteros',
      city: 'Medellín',
      country: 'Colombia',
      countryCode: 'CO'
    },
    price: { amount: 0, currency: 'COP' },
    images: [{ url: 'https://images.unsplash.com/photo-1508615039623-a25605d2b022?w=1200&q=80' }],
    maxAttendees: 500000,
    tags: ['medellin', 'feriadelasflores', 'silleteros', 'colombia', 'cultura', 'gratis'],
    isOfficial: true,
    activityType: 'cultural_festival'
  },
  {
    sourceId: 'co-baq-carnaval-cumbiodromo',
    title: 'Carnaval de Barranquilla: Gran Parada de Tradición en el Cumbiódromo',
    description: 'Obra Maestra del Patrimonio Oral e Inmaterial de la Humanidad (UNESCO). Cumbia, congo, marimondas y garabatos desfilando en una explosión de color, alegría y tambores caribeños.',
    category: 'culture',
    date: futureDate(14, 13, 0),
    endDate: futureDate(14, 21, 0),
    timeZone: 'America/Bogota',
    location: {
      type: 'Point',
      coordinates: [-74.7964, 10.9878],
      address: 'Cumbiódromo Vía 40',
      venue: 'Vía 40 con Calle 80',
      city: 'Barranquilla',
      country: 'Colombia',
      countryCode: 'CO'
    },
    price: { amount: 65000, currency: 'COP' },
    images: [{ url: 'https://images.unsplash.com/photo-1549834185-bd9f078a5dfe?w=1200&q=80' }],
    maxAttendees: 300000,
    tags: ['barranquilla', 'carnaval', 'cumbia', 'unesco', 'colombia', 'fiesta'],
    isOfficial: true,
    activityType: 'carnival'
  },
  {
    sourceId: 'mx-oax-dia-de-muertos',
    title: 'Noche de Muertos: Comparsas, Altares & Alumbrada de Panteones en Oaxaca',
    description: 'Una de las celebraciones espirituales y culturales más profundas del mundo. Altares monumentales con flores de cempasúchil, pan de muerto, tapetes de arena, comparsas callejeras y velación de panteones iluminados con cirios.',
    category: 'culture',
    date: futureDate(11, 18, 0),
    endDate: futureDate(12, 4, 0),
    timeZone: 'America/Mexico_City',
    location: {
      type: 'Point',
      coordinates: [-96.7266, 17.0608],
      address: 'Zócalo de Oaxaca y Panteón General San Miguel',
      venue: 'Centro Histórico & Panteón San Miguel',
      city: 'Oaxaca de Juárez',
      country: 'México',
      countryCode: 'MX'
    },
    price: { amount: 0, currency: 'MXN' },
    images: [{ url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&q=80' }],
    maxAttendees: 100000,
    tags: ['oaxaca', 'diademuertos', 'mexico', 'cempasuchil', 'tradicion', 'gratis'],
    isOfficial: true,
    activityType: 'spiritual_festival'
  },
  {
    sourceId: 'de-muc-oktoberfest-theresienwiese',
    title: 'Oktoberfest München: Tradición Bávara en Theresienwiese',
    description: 'La fiesta popular de la cerveza más famosa del mundo en Múnich. Carpas históricas de las seis cervecerías tradicionales bávaras, bandas de oompah en vivo, trajes típicos Dirndl y Lederhosen, y comida tradicional.',
    category: 'food',
    date: futureDate(12, 11, 0),
    endDate: futureDate(12, 23, 0),
    timeZone: 'Europe/Berlin',
    location: {
      type: 'Point',
      coordinates: [11.5498, 48.1314],
      address: 'Bavariaring 5, Ludwigsvorstadt',
      venue: 'Theresienwiese Festgelände',
      city: 'Múnich',
      country: 'Alemania',
      countryCode: 'DE'
    },
    price: { amount: 0, currency: 'EUR' },
    images: [{ url: 'https://images.unsplash.com/photo-1538356111053-748a48e1acb8?w=1200&q=80' }],
    maxAttendees: 400000,
    tags: ['munich', 'oktoberfest', 'alemania', 'cerveza', 'tradicion', 'gastronomia'],
    isOfficial: true,
    activityType: 'beer_festival'
  },
  {
    sourceId: 'br-rio-sambodromo-carnaval',
    title: 'Carnaval do Rio de Janeiro: Desfile das Escolas de Samba no Sambódromo',
    description: 'El mayor espectáculo visual de la tierra. Las mejores escuelas de samba del Grupo Especial (Mangueira, Portela, Beija-Flor) desfilando con carrozas alegóricas monumentales, miles de integrantes y baterías atronadoras en el Sambódromo.',
    category: 'music',
    date: futureDate(19, 21, 0),
    endDate: futureDate(20, 6, 0),
    timeZone: 'America/Sao_Paulo',
    location: {
      type: 'Point',
      coordinates: [-43.1963, -22.9118],
      address: 'Rua Marquês de Sapucaí, Cidade Nova',
      venue: 'Passarela Professor Darcy Ribeiro (Sambódromo)',
      city: 'Río de Janeiro',
      country: 'Brasil',
      countryCode: 'BR'
    },
    price: { amount: 280, currency: 'BRL' },
    images: [{ url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=80' }],
    maxAttendees: 72000,
    tags: ['riodejaneiro', 'sambodromo', 'carnaval', 'samba', 'brasil', 'espetaculo'],
    isOfficial: true,
    activityType: 'carnival'
  },
  {
    sourceId: 'do-sd-festival-presidente',
    title: 'Festival Presidente de Música Latina: Estadio Olímpico Félix Sánchez',
    description: 'El evento musical más monumental del Caribe en Santo Domingo. Tres días de ritmos latinos con los máximos exponentes del merengue, bachata, salsa, pop y género urbano latino en un escenario colosal.',
    category: 'music',
    date: futureDate(21, 17, 0),
    endDate: futureDate(22, 2, 0),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.9174, 18.4811],
      address: 'Av. 27 de Febrero con Av. Máximo Gómez',
      venue: 'Estadio Olímpico Félix Sánchez',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      countryCode: 'DO'
    },
    price: { amount: 2500, currency: 'DOP' },
    images: [{ url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&q=80' }],
    maxAttendees: 50000,
    tags: ['santodomingo', 'festivalpresidente', 'estadioolimpico', 'merengue', 'bachata', 'urbano'],
    isOfficial: true,
    activityType: 'mega_festival'
  },
  {
    sourceId: 'do-veg-carnaval-vegano',
    title: 'Carnaval Vegano: Salida de los Diablos Cojuelos de La Vega',
    description: 'El carnaval más antiguo y famoso de la República Dominicana. Miles de diablos cojuelos con impresionantes caretas artesanales, trajes de satén brillante, vejigas de toro y tarimas de conciertos con las mejores orquestas del país.',
    category: 'culture',
    date: futureDate(13, 14, 0),
    endDate: futureDate(13, 21, 0),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-70.5286, 19.2222],
      address: 'Avenida de los Flamboyanes',
      venue: 'Área del Carnaval Vegano',
      city: 'La Vega',
      country: 'República Dominicana',
      countryCode: 'DO'
    },
    price: { amount: 0, currency: 'DOP' },
    images: [{ url: 'https://images.unsplash.com/photo-1549834185-bd9f078a5dfe?w=1200&q=80' }],
    maxAttendees: 200000,
    tags: ['lavega', 'carnavalvegano', 'diabloscojuelos', 'cultura', 'tradicion', 'gratis'],
    isOfficial: true,
    activityType: 'carnival'
  }
];

module.exports = {
  PLANETARY_ITEMS,
  sanitizeTag
};
