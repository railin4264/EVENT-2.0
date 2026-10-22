'use strict';

/**
 * tripBudgetCalculator.js
 * ------------------------------------------------------------------
 * Complete Trip, Travel & Outing Budget Calculator for EventNow 2.0.
 * Calculates flights, ferries, intercity buses, carpool fuel, lodging,
 * local food/drinks benchmarks, and "Serrucho de Grupo" splitting.
 */

const CITY_BENCHMARKS = {
  'santo domingo': {
    city: 'Santo Domingo', country: 'República Dominicana', countryCode: 'DO',
    currency: 'DOP', airportCode: 'SDQ',
    food: { budget: 350, midRange: 1200, foodie: 2200, eventDrinks: 450 },
    lodging: { hostel: 1500, hotel: 4200, premium: 7500 },
    localTransitDay: 400,
    ferryAvailable: true,
    ferryNote: 'Ferries del Caribe (Santo Domingo - San Juan, PR)'
  },
  'santiago': {
    city: 'Santiago de los Caballeros', country: 'República Dominicana', countryCode: 'DO',
    currency: 'DOP', airportCode: 'STI',
    food: { budget: 300, midRange: 1000, foodie: 1800, eventDrinks: 400 },
    lodging: { hostel: 1400, hotel: 3800, premium: 6500 },
    localTransitDay: 350
  },
  'punta cana': {
    city: 'Punta Cana', country: 'República Dominicana', countryCode: 'DO',
    currency: 'DOP', airportCode: 'PUJ',
    food: { budget: 600, midRange: 2200, foodie: 3800, eventDrinks: 750 },
    lodging: { hostel: 2500, hotel: 7000, premium: 12000 },
    localTransitDay: 800,
    ferryAvailable: true,
    ferryNote: 'Catamarán turístico & excursiones a Isla Saona'
  },
  'new york': {
    city: 'New York', country: 'Estados Unidos', countryCode: 'US',
    currency: 'USD', airportCode: 'JFK',
    food: { budget: 18, midRange: 55, foodie: 110, eventDrinks: 22 },
    lodging: { hostel: 60, hotel: 185, premium: 320 },
    localTransitDay: 15,
    ferryAvailable: true,
    ferryNote: 'NYC Ferry & Staten Island Ferry'
  },
  'miami': {
    city: 'Miami', country: 'Estados Unidos', countryCode: 'US',
    currency: 'USD', airportCode: 'MIA',
    food: { budget: 16, midRange: 45, foodie: 95, eventDrinks: 18 },
    lodging: { hostel: 50, hotel: 150, premium: 260 },
    localTransitDay: 18,
    ferryAvailable: true,
    ferryNote: 'Balearia Caribbean Ferry (Fort Lauderdale - Bahamas)'
  },
  'madrid': {
    city: 'Madrid', country: 'España', countryCode: 'ES',
    currency: 'EUR', airportCode: 'MAD',
    food: { budget: 14, midRange: 35, foodie: 75, eventDrinks: 12 },
    lodging: { hostel: 30, hotel: 90, premium: 160 },
    localTransitDay: 8
  },
  'barcelona': {
    city: 'Barcelona', country: 'España', countryCode: 'ES',
    currency: 'EUR', airportCode: 'BCN',
    food: { budget: 15, midRange: 38, foodie: 80, eventDrinks: 14 },
    lodging: { hostel: 35, hotel: 105, premium: 180 },
    localTransitDay: 9,
    ferryAvailable: true,
    ferryNote: 'Baleària & Trasmed (Barcelona - Mallorca / Ibiza)'
  },
  'ciudad de mexico': {
    city: 'Ciudad de México', country: 'México', countryCode: 'MX',
    currency: 'MXN', airportCode: 'MEX',
    food: { budget: 120, midRange: 450, foodie: 900, eventDrinks: 150 },
    lodging: { hostel: 350, hotel: 1200, premium: 2200 },
    localTransitDay: 100
  },
  'bogota': {
    city: 'Bogotá', country: 'Colombia', countryCode: 'CO',
    currency: 'COP', airportCode: 'BOG',
    food: { budget: 18000, midRange: 60000, foodie: 120000, eventDrinks: 22000 },
    lodging: { hostel: 50000, hotel: 160000, premium: 280000 },
    localTransitDay: 20000
  },
  'medellin': {
    city: 'Medellín', country: 'Colombia', countryCode: 'CO',
    currency: 'COP', airportCode: 'MDE',
    food: { budget: 16000, midRange: 55000, foodie: 110000, eventDrinks: 20000 },
    lodging: { hostel: 45000, hotel: 150000, premium: 260000 },
    localTransitDay: 18000
  },
  'buenos aires': {
    city: 'Buenos Aires', country: 'Argentina', countryCode: 'AR',
    currency: 'ARS', airportCode: 'EZE',
    food: { budget: 8000, midRange: 24000, foodie: 48000, eventDrinks: 9000 },
    lodging: { hostel: 22000, hotel: 65000, premium: 120000 },
    localTransitDay: 3500,
    ferryAvailable: true,
    ferryNote: 'Buquebus / Colonia Express (Buenos Aires - Colonia / Montevideo)'
  },
  'sao paulo': {
    city: 'São Paulo', country: 'Brasil', countryCode: 'BR',
    currency: 'BRL', airportCode: 'GRU',
    food: { budget: 35, midRange: 110, foodie: 220, eventDrinks: 40 },
    lodging: { hostel: 90, hotel: 280, premium: 480 },
    localTransitDay: 30
  },
  'rio de janeiro': {
    city: 'Rio de Janeiro', country: 'Brasil', countryCode: 'BR',
    currency: 'BRL', airportCode: 'GIG',
    food: { budget: 38, midRange: 120, foodie: 240, eventDrinks: 45 },
    lodging: { hostel: 95, hotel: 320, premium: 520 },
    localTransitDay: 32
  },
  'tokio': {
    city: 'Tokio', country: 'Japón', countryCode: 'JP',
    currency: 'JPY', airportCode: 'HND',
    food: { budget: 1100, midRange: 3500, foodie: 7500, eventDrinks: 1200 },
    lodging: { hostel: 4500, hotel: 13500, premium: 24000 },
    localTransitDay: 1200,
    ferryAvailable: true,
    ferryNote: 'Tokyo Water Bus & Tokyo Bay Cruises'
  },
  'londres': {
    city: 'Londres', country: 'Reino Unido', countryCode: 'GB',
    currency: 'GBP', airportCode: 'LHR',
    food: { budget: 12, midRange: 36, foodie: 75, eventDrinks: 12 },
    lodging: { hostel: 35, hotel: 110, premium: 220 },
    localTransitDay: 10,
    ferryAvailable: true,
    ferryNote: 'Uber Boat by Thames Clippers'
  },
  'paris': {
    city: 'París', country: 'Francia', countryCode: 'FR',
    currency: 'EUR', airportCode: 'CDG',
    food: { budget: 15, midRange: 42, foodie: 90, eventDrinks: 14 },
    lodging: { hostel: 38, hotel: 120, premium: 240 },
    localTransitDay: 9,
    ferryAvailable: true,
    ferryNote: 'Batobus Navette sur la Seine'
  },
  'berlin': {
    city: 'Berlín', country: 'Alemania', countryCode: 'DE',
    currency: 'EUR', airportCode: 'BER',
    food: { budget: 12, midRange: 32, foodie: 68, eventDrinks: 10 },
    lodging: { hostel: 28, hotel: 85, premium: 170 },
    localTransitDay: 8
  },
  'santiago de chile': {
    city: 'Santiago', country: 'Chile', countryCode: 'CL',
    currency: 'CLP', airportCode: 'SCL',
    food: { budget: 7000, midRange: 22000, foodie: 45000, eventDrinks: 7500 },
    lodging: { hostel: 20000, hotel: 60000, premium: 110000 },
    localTransitDay: 3000
  },
  'lima': {
    city: 'Lima', country: 'Perú', countryCode: 'PE',
    currency: 'PEN', airportCode: 'LIM',
    food: { budget: 25, midRange: 75, foodie: 160, eventDrinks: 30 },
    lodging: { hostel: 60, hotel: 190, premium: 350 },
    localTransitDay: 25
  },
  'toronto': {
    city: 'Toronto', country: 'Canadá', countryCode: 'CA',
    currency: 'CAD', airportCode: 'YYZ',
    food: { budget: 18, midRange: 52, foodie: 105, eventDrinks: 20 },
    lodging: { hostel: 55, hotel: 175, premium: 310 },
    localTransitDay: 14,
    ferryAvailable: true,
    ferryNote: 'Toronto Island Ferries'
  },
  'roma': {
    city: 'Roma', country: 'Italia', countryCode: 'IT',
    currency: 'EUR', airportCode: 'FCO',
    food: { budget: 15, midRange: 38, foodie: 80, eventDrinks: 12 },
    lodging: { hostel: 35, hotel: 105, premium: 210 },
    localTransitDay: 8
  },
  'puerto plata': {
    city: 'Puerto Plata', country: 'República Dominicana', countryCode: 'DO',
    currency: 'DOP', airportCode: 'POP',
    food: { budget: 350, midRange: 1300, foodie: 2400, eventDrinks: 450 },
    lodging: { hostel: 1500, hotel: 4400, premium: 8000 },
    localTransitDay: 400
  },
  'samana': {
    city: 'Samaná', country: 'República Dominicana', countryCode: 'DO',
    currency: 'DOP', airportCode: 'AZS',
    food: { budget: 400, midRange: 1500, foodie: 2800, eventDrinks: 500 },
    lodging: { hostel: 1600, hotel: 4800, premium: 9000 },
    localTransitDay: 450,
    ferryAvailable: true,
    ferryNote: 'Ferry Samaná - Sabana de la Mar & tours Cayo Levantado'
  },
  'jarabacoa': {
    city: 'Jarabacoa', country: 'República Dominicana', countryCode: 'DO',
    currency: 'DOP',
    food: { budget: 300, midRange: 1100, foodie: 2000, eventDrinks: 400 },
    lodging: { hostel: 1200, hotel: 3800, premium: 7000 },
    localTransitDay: 300
  },
  'la romana': {
    city: 'La Romana', country: 'República Dominicana', countryCode: 'DO',
    currency: 'DOP', airportCode: 'LRM',
    food: { budget: 450, midRange: 1600, foodie: 3000, eventDrinks: 550 },
    lodging: { hostel: 1800, hotel: 5200, premium: 11000 },
    localTransitDay: 450,
    ferryAvailable: true,
    ferryNote: 'Catamaranes a Isla Saona & Isla Catalina desde Bayahíbe'
  }
};

function getCityBenchmark(cityName = '') {
  const norm = String(cityName).toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [key, val] of Object.entries(CITY_BENCHMARKS)) {
    if (norm.includes(key) || key.includes(norm)) {
      return val;
    }
  }
  // Default benchmark fallback in USD
  return {
    city: cityName || 'Destino Global', country: 'Internacional', countryCode: 'GLOBAL',
    currency: 'USD', airportCode: '',
    food: { budget: 15, midRange: 40, foodie: 80, eventDrinks: 15 },
    lodging: { hostel: 35, hotel: 95, premium: 180 },
    localTransitDay: 12
  };
}

/**
 * Calculates complete itemized trip budget for events.
 */
function calculateTripBudget({
  ticketPrice = 0,
  currency = 'USD',
  destinationCity = 'Santo Domingo',
  originCity = '',
  travelersCount = 1,
  nights = 0,
  lodgingTier = 'hotel', // 'none' | 'hostel' | 'hotel' | 'premium'
  diningTier = 'midRange', // 'budget' | 'midRange' | 'foodie'
  transportMode = 'local', // 'local' | 'carpool' | 'bus' | 'flight' | 'ferry'
  customTransportAmount = 0,
  eventDate = null
}) {
  const count = Math.max(1, Math.min(25, parseInt(travelersCount, 10) || 1));
  const nightCount = Math.max(0, Math.min(30, parseInt(nights, 10) || 0));
  const benchmark = getCityBenchmark(destinationCity);
  const benchmarkCurrency = benchmark.currency;

  // 1. Ticket cost
  const ticketPerPerson = Math.max(0, Number(ticketPrice) || 0);
  const totalTickets = ticketPerPerson * count;

  // 2. Lodging calculation
  let lodgingPerRoomPerNight = 0;
  if (nightCount > 0 && lodgingTier !== 'none') {
    lodgingPerRoomPerNight = benchmark.lodging[lodgingTier] || benchmark.lodging.hotel;
  }
  // Rooms needed: assume 2 adults per room/Airbnb unit
  const roomsCount = Math.ceil(count / 2);
  const totalLodging = lodgingPerRoomPerNight * nightCount * roomsCount;
  const lodgingPerPerson = totalLodging / count;

  // 3. Food & Drinks calculation
  const days = Math.max(1, nightCount + 1);
  const dailyMealCost = (benchmark.food[diningTier] || benchmark.food.midRange) * 2; // 2 solid meals/day
  const eventDrinkCost = benchmark.food.eventDrinks * 2; // drinks & snacks at venue
  const foodPerPerson = (dailyMealCost * days) + eventDrinkCost;
  const totalFood = foodPerPerson * count;

  // 4. Transportation calculation
  let transportTotal = 0;
  let transportPerPerson = 0;
  let transportDetails = {};

  if (transportMode === 'local') {
    const localTransit = benchmark.localTransitDay * days;
    transportPerPerson = localTransit;
    transportTotal = localTransit * count;
    transportDetails = {
      type: 'local_transit',
      label: 'Transporte local (Metro / Uber / Taxi)',
      isShared: false
    };
  } else if (transportMode === 'carpool') {
    // Carpool fuel & toll estimate: flat per car (1 car per 4 people)
    const carsCount = Math.ceil(count / 4);
    const fuelTollsPerCar = benchmarkCurrency === 'DOP' ? 2500 : benchmarkCurrency === 'USD' ? 60 : 45;
    transportTotal = (carsCount * fuelTollsPerCar) + (benchmark.localTransitDay * days * count);
    transportPerPerson = transportTotal / count;
    transportDetails = {
      type: 'carpool',
      label: `Gasolina y peajes (${carsCount} vehículo/s compartido/s) + traslados locales`,
      carsCount,
      isShared: true
    };
  } else if (transportMode === 'bus') {
    const busTicket = benchmarkCurrency === 'DOP' ? 650 : benchmarkCurrency === 'USD' ? 25 : 20;
    transportPerPerson = (busTicket * 2) + (benchmark.localTransitDay * days); // ida y vuelta
    transportTotal = transportPerPerson * count;
    transportDetails = {
      type: 'intercity_bus',
      label: 'Autobús interurbano ida y vuelta + traslados',
      isShared: false
    };
  } else if (transportMode === 'ferry') {
    const ferryTicket = benchmarkCurrency === 'DOP' ? 6000 : benchmarkCurrency === 'USD' ? 120 : 90;
    transportPerPerson = (ferryTicket * 2) + (benchmark.localTransitDay * days);
    transportTotal = transportPerPerson * count;
    transportDetails = {
      type: 'ferry',
      label: benchmark.ferryNote || 'Boleto marítimo / ferry ida y vuelta',
      isShared: false
    };
  } else if (transportMode === 'flight') {
    const flightEst = customTransportAmount > 0 ? customTransportAmount
      : (benchmarkCurrency === 'DOP' ? 25000 : benchmarkCurrency === 'USD' ? 450 : 350);
    transportPerPerson = flightEst + (benchmark.localTransitDay * days);
    transportTotal = transportPerPerson * count;
    transportDetails = {
      type: 'flight',
      label: 'Boleto de avión ida y vuelta estimado + traslados de aeropuerto',
      isShared: false
    };
  }

  // 5. Emergency buffer / incidentals (8%)
  const subtotalTotal = totalTickets + totalLodging + totalFood + transportTotal;
  const bufferTotal = Math.round(subtotalTotal * 0.08);
  const grandTotal = subtotalTotal + bufferTotal;
  const grandTotalPerPerson = Math.round(grandTotal / count);

  // 6. Generate Travel Direct Search URLs
  const searchDate = eventDate ? new Date(eventDate).toISOString().slice(0, 10) : '';
  const originNorm = encodeURIComponent(originCity || 'origen');
  const destNorm = encodeURIComponent(benchmark.city);

  const bookingLinks = {
    googleFlights: originCity ? `https://www.google.com/travel/flights?q=flights%20from%20${originNorm}%20to%20${destNorm}${searchDate ? `%20on%20${searchDate}` : ''}` : null,
    rome2rio: `https://www.rome2rio.com/s/${originNorm}/${destNorm}`,
    bookingLodging: `https://www.booking.com/searchresults.html?ss=${destNorm}`,
    airbnb: `https://www.airbnb.com/s/${destNorm}/homes`,
    ferrySearch: benchmark.ferryAvailable ? 'https://www.ferriesdelcaribe.com/' : null
  };

  return {
    success: true,
    benchmarkCity: benchmark.city,
    currency: benchmarkCurrency,
    inputCurrency: currency,
    parameters: {
      travelersCount: count,
      nights: nightCount,
      days,
      lodgingTier,
      diningTier,
      transportMode,
      originCity: originCity || 'No especificado'
    },
    breakdown: {
      tickets: {
        total: Math.round(totalTickets),
        perPerson: Math.round(ticketPerPerson),
        isShared: false
      },
      transport: {
        total: Math.round(transportTotal),
        perPerson: Math.round(transportPerPerson),
        details: transportDetails
      },
      lodging: {
        total: Math.round(totalLodging),
        perPerson: Math.round(lodgingPerPerson),
        roomsCount,
        nights: nightCount,
        ratePerNight: lodgingPerRoomPerNight,
        isShared: true
      },
      foodAndDrinks: {
        total: Math.round(totalFood),
        perPerson: Math.round(foodPerPerson),
        dailyAveragePerPerson: Math.round(dailyMealCost + (eventDrinkCost / days)),
        isShared: false
      },
      bufferAndIncidentals: {
        total: bufferTotal,
        perPerson: Math.round(bufferTotal / count),
        ratePercentage: 8
      }
    },
    summary: {
      grandTotal: Math.round(grandTotal),
      perPerson: grandTotalPerPerson,
      serruchoSplits: {
        individualOnlyPerPerson: Math.round(ticketPerPerson + foodPerPerson),
        sharedPoolTotal: Math.round(totalLodging + (transportDetails.isShared ? transportTotal : 0)),
        sharedPoolPerPerson: Math.round((totalLodging + (transportDetails.isShared ? transportTotal : 0)) / count)
      }
    },
    bookingLinks
  };
}

module.exports = {
  CITY_BENCHMARKS,
  getCityBenchmark,
  calculateTripBudget
};
