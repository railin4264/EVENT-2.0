'use strict';

const Event = require('../models/Event');

/**
 * Offline Venue & Festival Compass Service
 * Generates offline-cacheable stadium/festival landmarks and rendezvous points.
 */

const DEFAULT_LANDMARKS = [
  { id: 'gate_main', name: 'Entrada Principal / Acceso General', type: 'entrance', icon: 'door', offset: [0.0001, 0.0001] },
  { id: 'stage_main', name: 'Tarima Principal / Escenario Estelar', type: 'stage', icon: 'music', offset: [-0.0002, 0.0003] },
  { id: 'first_aid', name: 'Puesto Médico & Primeros Auxilios (Cruz Roja)', type: 'medical', icon: 'heart', offset: [0.0003, -0.0002] },
  { id: 'restrooms_north', name: 'Módulo de Sanitarios Norte', type: 'restroom', icon: 'bath', offset: [-0.0004, -0.0001] },
  { id: 'restrooms_south', name: 'Módulo de Sanitarios Sur', type: 'restroom', icon: 'bath', offset: [0.0002, -0.0004] },
  { id: 'hydration_bar', name: 'Punto de Hidratación & Bebidas', type: 'bar', icon: 'glass', offset: [0.0001, 0.0003] },
  { id: 'lost_found', name: 'Punto de Encuentro de Amigos & Seguridad', type: 'safe_zone', icon: 'shield', offset: [0, 0] }
];

function calculateDistanceAndBearing(fromLat, fromLng, toLat, toLng) {
  const R = 6371e3; // Earth radius in meters
  const rad = deg => deg * Math.PI / 180;
  const deg = rad => rad * 180 / Math.PI;

  const φ1 = rad(fromLat);
  const φ2 = rad(toLat);
  const Δφ = rad(toLat - fromLat);
  const Δλ = rad(toLng - fromLng);

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceMeters = Math.round(R * c);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const bearingDegrees = Math.round((deg(Math.atan2(y, x)) + 360) % 360);

  return { distanceMeters, bearingDegrees };
}

async function getOfflineFestivalPack(eventId, userLat = null, userLng = null) {
  const event = await Event.findById(eventId).lean();
  if (!event) throw new Error('Evento no encontrado');

  const coords = event.location?.coordinates || [-69.9312, 18.4861];
  const centerLng = coords[0];
  const centerLat = coords[1];

  const landmarks = DEFAULT_LANDMARKS.map(l => {
    const lat = centerLat + l.offset[0];
    const lng = centerLng + l.offset[1];
    let distance = null;
    let bearing = null;

    if (userLat != null && userLng != null) {
      const calc = calculateDistanceAndBearing(userLat, userLng, lat, lng);
      distance = calc.distanceMeters;
      bearing = calc.bearingDegrees;
    }

    return {
      id: l.id,
      name: l.name,
      type: l.type,
      icon: l.icon,
      coordinates: [lng, lat],
      distanceMeters: distance,
      compassBearing: bearing
    };
  });

  return {
    success: true,
    eventId: event._id,
    eventTitle: event.title,
    venueName: event.location?.venue || event.location?.address || 'Recinto del Evento',
    venueCenter: {
      latitude: centerLat,
      longitude: centerLng
    },
    offlinePassValidUntil: event.endDate || event.date,
    emergencyHelpline: '911 / Seguridad Interna del Recinto',
    rendezvousSpot: {
      name: 'Punto de Encuentro Oficial EventNow',
      description: 'Zona con iluminación fija y personal de seguridad. Si se te apaga el celular o te separas de tu grupo, espera aquí.',
      coordinates: [centerLng, centerLat]
    },
    landmarks
  };
}

module.exports = { getOfflineFestivalPack, calculateDistanceAndBearing };
