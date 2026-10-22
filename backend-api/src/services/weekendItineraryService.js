'use strict';

const Event = require('../models/Event');

/**
 * 48-Hour Weekend Getaway Itinerary Generator
 * Curates a cohesive 4-stop or 5-stop weekend agenda using real database events.
 */

async function generateWeekendItinerary({ city = 'Santo Domingo', country = 'República Dominicana', vibe = 'all', budgetLimit = null }) {
  const cityRegex = new RegExp(city.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  const query = {
    status: { $in: ['published', 'approved', 'scheduled'] },
    'location.city': cityRegex
  };

  if (vibe !== 'all') {
    if (vibe === 'party' || vibe === 'nightlife') query.category = { $in: ['music', 'entertainment', 'party', 'social'] };
    else if (vibe === 'culture' || vibe === 'art') query.category = { $in: ['art', 'cultural', 'culture', 'theater', 'education'] };
    else if (vibe === 'outdoors' || vibe === 'sports') query.category = { $in: ['sports', 'fitness', 'outdoors', 'community'] };
    else if (vibe === 'family') query.category = { $in: ['family', 'kids', 'community', 'education', 'art'] };
  }

  // Find candidate events
  let events = await Event.find(query)
    .select('title description category location price images date endDate tags externalUrl organizer')
    .sort({ date: 1 })
    .limit(30)
    .lean();

  // If few events in city, expand search to whole country
  if (events.length < 3 && country) {
    const countryRegex = new RegExp(country.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    events = await Event.find({
      status: { $in: ['published', 'approved', 'scheduled'] },
      $or: [{ 'location.country': countryRegex }, { 'location.city': cityRegex }]
    })
      .select('title description category location price images date endDate tags externalUrl organizer')
      .sort({ date: 1 })
      .limit(30)
      .lean();
  }

  // If still empty, get top global/published events
  if (events.length === 0) {
    events = await Event.find({ status: { $in: ['published', 'approved', 'scheduled'] } })
      .select('title description category location price images date endDate tags externalUrl organizer')
      .sort({ date: 1 })
      .limit(15)
      .lean();
  }

  // Build the 4 itinerary time slots
  const slots = [
    {
      slotId: 'friday_night',
      day: 'Viernes',
      timeSlot: '19:30 - 23:00',
      title: 'Apertura de Fin de Semana & Vibra Social',
      recommendedVibe: 'Música, cócteles y desconexión',
      preferredCategories: ['music', 'party', 'social', 'entertainment', 'food']
    },
    {
      slotId: 'saturday_morning',
      day: 'Sábado Mañana',
      timeSlot: '09:30 - 12:30',
      title: 'Energía Matutina & Movimiento',
      recommendedVibe: 'Parque, deporte o taller matutino',
      preferredCategories: ['sports', 'fitness', 'outdoors', 'community', 'education', 'wellness']
    },
    {
      slotId: 'saturday_evening',
      day: 'Sábado Tarde/Noche',
      timeSlot: '16:30 - 22:30',
      title: 'El Evento Estelar del Fin de Semana',
      recommendedVibe: 'Gran concierto, teatro o festival',
      preferredCategories: ['music', 'art', 'cultural', 'entertainment', 'fashion', 'theater']
    },
    {
      slotId: 'sunday_chill',
      day: 'Domingo Chill',
      timeSlot: '11:00 - 16:00',
      title: 'Cierre Relax & Gastronomía',
      recommendedVibe: 'Arte, paseo al aire libre y familia',
      preferredCategories: ['art', 'cultural', 'family', 'food', 'community', 'wellness']
    }
  ];

  const assignedEventIds = new Set();
  const itinerarySchedule = [];
  let totalEstimatedCost = 0;
  let currency = 'DOP';

  for (const slot of slots) {
    // Find matching event for this slot
    let match = events.find(ev => !assignedEventIds.has(String(ev._id)) && slot.preferredCategories.includes(ev.category));
    if (!match) {
      match = events.find(ev => !assignedEventIds.has(String(ev._id)));
    }

    if (match) {
      assignedEventIds.add(String(match._id));
      const priceAmount = Number(match.price?.amount || 0);
      totalEstimatedCost += priceAmount;
      if (match.price?.currency) currency = match.price.currency;

      itinerarySchedule.push({
        slotId: slot.slotId,
        day: slot.day,
        timeSlot: slot.timeSlot,
        phaseTitle: slot.title,
        recommendedVibe: slot.recommendedVibe,
        event: {
          id: match._id,
          title: match.title,
          category: match.category,
          venue: match.location?.venue || match.location?.address || 'Ubicación central',
          address: match.location?.address || '',
          city: match.location?.city || city,
          coordinates: match.location?.coordinates || [-69.9312, 18.4861],
          price: { amount: priceAmount, currency },
          image: match.images?.[0]?.url || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80',
          externalUrl: match.externalUrl
        }
      });
    }
  }

  return {
    success: true,
    destination: {
      city,
      country
    },
    itineraryTitle: `Escapada 48 Horas: Lo Mejor de ${city}`,
    vibe,
    totalEstimatedCost: {
      amount: totalEstimatedCost,
      currency,
      isFree: totalEstimatedCost === 0
    },
    stopsCount: itinerarySchedule.length,
    schedule: itinerarySchedule,
    tipsForTravelers: [
      'Reserva o confirma asistencia a los eventos seleccionados con antelación.',
      'Utiliza la Calculadora de Serrucho integrada para dividir gastos si viajas en grupo.',
      'Descarga tu entrada o guarda la ubicación antes de salir para acceso offline.'
    ]
  };
}

module.exports = { generateWeekendItinerary };
