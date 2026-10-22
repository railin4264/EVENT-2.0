'use strict';

/**
 * EventNow Style & Dress Code Advisor
 * Infers dress code, aesthetic color palette, actionable styling tips, and weather-aware advice.
 */

const STYLE_PROFILES = {
  gala: {
    dressCode: 'Gala / Noche Elegante',
    vibe: ['#AltaGama', '#Elegancia', '#BlackTie', '#NocheDeLujo'],
    palette: ['#0F172A', '#1E293B', '#D97706', '#F8FAFC'],
    tips: [
      'Vestimenta formal completa: traje oscuro, vestido largo o midi formal.',
      'Calzado formal con tacón cómodo o calzado de vestir pulido.',
      'Accesorios sobrios en tonos dorados o plateados.'
    ],
    editorialHeadline: 'Elegancia Contemporánea: Guía de Gala y Etiqueta Nocturna'
  },
  music_festival: {
    dressCode: 'Festival / Boho Chic / Streetwear Cómodo',
    vibe: ['#FestivalVibes', '#StreetStyle', '#ComfortFirst', '#BohoChic'],
    palette: ['#4F46E5', '#EC4899', '#F59E0B', '#10B981'],
    tips: [
      'Sneakers o botas todo-terreno: prepárate para estar de pie y bailar por horas.',
      'Capas livianas: añade una chaqueta tipo denim o cortavientos para la noche.',
      'Bolso cruzado o riñonera compacta para mantener manos libres y pertenencias seguras.',
      'Gafas de sol con protección UV y protector solar para el atardecer.'
    ],
    editorialHeadline: 'Moda Festivalera: Cómo lucir increíble sin sacrificar comodidad'
  },
  sports_running: {
    dressCode: 'Sportswear Técnico / Running & Outdoor',
    vibe: ['#ActiveLife', '#RunningCommunity', '#FastAndFit', '#Performance'],
    palette: ['#0284C7', '#22C55E', '#EA580C', '#0F172A'],
    tips: [
      'Textiles transpirables tipo Dri-FIT para control de humedad y frescura.',
      'Zapatillas de running adaptadas a asfalto o senderos con buen amortiguamiento.',
      'Gorra deportiva ligera y visera para protección solar.',
      'Cangurera deportiva para hidratación y smartphone.'
    ],
    editorialHeadline: 'Gear Guide: Equipamiento esencial para eventos de alto rendimiento'
  },
  beach_resort: {
    dressCode: 'Tropical Chic / Resort & Playa',
    vibe: ['#TropicalVibe', '#GoldenHour', '#SunsetParty', '#WhiteParty'],
    palette: ['#06B6D4', '#FBBF24', '#FB7185', '#FFFFFF'],
    tips: [
      'Lino, algodón y telas vaporosas en tonos claros, blancos o pasteles.',
      'Sandalias de cuero o alpargatas cómodas para superficies de arena o deck.',
      'Sombrero panamá o bucket hat veraniego.',
      'Lentes de sol polarizados para disfrutar la brisa y el atardecer.'
    ],
    editorialHeadline: 'Resort Wear 2026: El arte de vestir ligero frente al mar'
  },
  tech_conference: {
    dressCode: 'Smart Casual / Tech Business Casual',
    vibe: ['#Networking', '#TechForward', '#SmartCasual', '#Innovators'],
    palette: ['#1E1B4B', '#6366F1', '#38BDF8', '#F1F5F9'],
    tips: [
      'Camisa polo de calidad, blazer ligero desestructurado o suéter fino.',
      'Pantalón chino o denim oscuro sin roturas con sneakers limpios de cuero.',
      'Mochila ejecutiva delgada para laptop o tablet y tarjetas de contacto.',
      'Reloj o smartwatch y libreta de notas para sesiones de networking.'
    ],
    editorialHeadline: 'Networking con Estilo: Del auditorio al after-office tecnológico'
  },
  art_culture: {
    dressCode: 'Creativo Chic / Galería & Vanguardia',
    vibe: ['#ArtLovers', '#CreativeMinds', '#AvantGarde', '#MuseumLook'],
    palette: ['#18181B', '#E11D48', '#8B5CF6', '#F4F4F5'],
    tips: [
      'Prendas con cortes geométricos, texturas contrastantes o siluetas oversize.',
      'Calzado de diseño minimalista o mocasines contemporáneos.',
      'Accesorio focal: bufanda de seda, gafas llamativas o joyería escultórica.'
    ],
    editorialHeadline: 'Vanguardia Urbana: Looks sofisticados para exposiciones y estrenos'
  },
  casual_urban: {
    dressCode: 'Casual Urbano / Chill con Estilo',
    vibe: ['#UrbanChill', '#WeekendPlan', '#EverydayStyle', '#EasyGoing'],
    palette: ['#334155', '#475569', '#3B82F6', '#E2E8F0'],
    tips: [
      'Jeans de buen fit, camiseta gráfica o básica de algodón pesado.',
      'Tus sneakers favoritos con suela limpia y cómoda.',
      'Chaqueta ligera (bomber, hoodie o sobrecamisa de pana/denim).'
    ],
    editorialHeadline: 'Estilo sin esfuerzo: La fórmula infalible para planes de fin de semana'
  }
};

function determineStyleProfile(event) {
  const text = `${event.title || ''} ${event.category || ''} ${event.description || ''} ${(event.tags || []).join(' ')}`.toLowerCase();

  if (/gala|opera|black tie|alfombra roja|sinfonica|orquesta filarmonica|recaudacion/i.test(text)) {
    return STYLE_PROFILES.gala;
  }
  if (/running|carrera|maraton|maratón|marathon|bicicleta|ciclismo|crossfit|fitness|5k|10k|21k|42k|triatlon/i.test(text)) {
    return STYLE_PROFILES.sports_running;
  }
  if (/playa|beach|pool party|resort|yate|catamaran|bavaro|punta cana|las terrenas|cabarete/i.test(text)) {
    return STYLE_PROFILES.beach_resort;
  }
  if (/concierto|festival|techno|dj|musica|perreo|rave|electronic|live band|rock/i.test(text)) {
    return STYLE_PROFILES.music_festival;
  }
  if (/conferencia|summit|hackathon|startup|networking|tech|software|ia|inteligencia artificial|web3/i.test(text)) {
    return STYLE_PROFILES.tech_conference;
  }
  if (/arte|teatro|exposicion|exhibition|galeria|escultura|pintura|cine|poesia|museo/i.test(text)) {
    return STYLE_PROFILES.art_culture;
  }

  return STYLE_PROFILES.casual_urban;
}

function getEventStyleGuide(event, weatherData = null) {
  const profile = determineStyleProfile(event);

  let weatherNote = 'Clima agradable para el evento.';
  if (weatherData && typeof weatherData.temperature === 'number') {
    const temp = Math.round(weatherData.temperature);
    if (temp >= 28) {
      weatherNote = `Calor esperado (~${temp}°C): Prioriza telas livianas como algodón y lino, e hidratación constante.`;
    } else if (temp <= 15) {
      weatherNote = `Ambiente fresco (~${temp}°C): Recomendado llevar abrigo o chaqueta abrigada para la noche.`;
    } else {
      weatherNote = `Temperatura óptima (~${temp}°C): Clima perfecto para atuendos de media estación.`;
    }
  }

  return {
    success: true,
    eventId: event._id || event.id,
    dressCode: profile.dressCode,
    vibes: profile.vibe,
    colorPalette: profile.palette,
    stylingTips: profile.tips,
    weatherContext: weatherNote,
    editorialArticle: {
      title: profile.editorialHeadline,
      readTime: '3 min lectura',
      summary: `Consejos prácticos de estilo seleccionados por el equipo editorial de EventNow para destacar en ${event.title || 'tu evento'}.`
    }
  };
}

module.exports = { getEventStyleGuide, determineStyleProfile };
