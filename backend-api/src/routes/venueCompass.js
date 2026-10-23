'use strict';

const express = require('express');
const router = express.Router();
const { getOfflineFestivalPack } = require('../services/venueCompassService');

// GET /api/events/:eventId/offline-pack - Get pre-cacheable offline festival landmarks and compass
router.get('/:eventId/offline-pack', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { lat, lng } = req.query;

    const userLat = lat ? parseFloat(lat) : null;
    const userLng = lng ? parseFloat(lng) : null;

    const pack = await getOfflineFestivalPack(eventId, userLat, userLng);
    return res.status(200).json(pack);
  } catch (err) {
    return res.status(404).json({
      success: false,
      message: err.message || 'Error al obtener el paquete offline del recinto'
    });
  }
});

module.exports = router;
