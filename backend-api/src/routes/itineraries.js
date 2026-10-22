'use strict';

const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const { getEventStyleGuide } = require('../services/eventStyleGuideService');
const { generateWeekendItinerary } = require('../services/weekendItineraryService');

// GET /api/itineraries/weekend-planner - Generate 48-hour weekend itinerary
router.get('/weekend-planner', async (req, res) => {
  try {
    const { city, country, vibe, budgetLimit } = req.query;
    const result = await generateWeekendItinerary({
      city: city || 'Santo Domingo',
      country: country || 'República Dominicana',
      vibe: vibe || 'all',
      budgetLimit: budgetLimit ? parseFloat(budgetLimit) : null
    });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error al generar itinerario', error: err.message });
  }
});

// GET /api/itineraries/events/:eventId/style-guide - Get dress code & style guide for an event
router.get('/events/:eventId/style-guide', async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId).lean();
    if (!event) {
      return res.status(404).json({ success: false, message: 'Evento no encontrado' });
    }

    const guide = getEventStyleGuide(event);
    return res.status(200).json(guide);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error al obtener guía de estilo', error: err.message });
  }
});

module.exports = router;
