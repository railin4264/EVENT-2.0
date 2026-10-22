'use strict';

const express = require('express');
const router = express.Router();
const Carpool = require('../models/Carpool');
const Event = require('../models/Event');
const { protect } = require('../middleware/auth');

// GET /api/carpools/:eventId - List available carpools for an event
router.get('/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const currentUserId = req.user?.id || req.headers['x-user-id'];

    const carpools = await Carpool.find({
      event: eventId,
      status: { $in: ['open', 'full'] }
    })
      .populate('driver', 'firstName lastName username avatar verified')
      .populate('passengers.user', 'firstName lastName username avatar')
      .sort({ departureTime: 1 })
      .lean();

    const formatted = carpools.map(c => ({
      _id: c._id,
      driver: {
        _id: c.driver?._id,
        name: c.driver?.firstName || c.driver?.username || 'Conductor/a',
        username: c.driver?.username,
        avatar: c.driver?.avatar,
        verified: Boolean(c.driver?.verified)
      },
      departureLocation: c.departureLocation,
      departureTime: c.departureTime,
      totalSeats: c.totalSeats,
      availableSeats: c.availableSeats,
      contributionAmount: c.contributionAmount,
      currency: c.currency,
      vehicleModel: c.vehicleModel,
      notes: c.notes,
      isDriver: currentUserId ? String(c.driver?._id) === String(currentUserId) : false,
      isPassenger: currentUserId ? c.passengers?.some(p => String(p.user?._id) === String(currentUserId) && p.status === 'confirmed') : false,
      status: c.status
    }));

    return res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error al consultar viajes compartidos', error: err.message });
  }
});

// POST /api/carpools/:eventId - Create a new carpool offer
router.post('/:eventId', protect, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { departureLocation, departureTime, totalSeats, contributionAmount, vehicleModel, notes, returnTrip } = req.body;

    const event = await Event.findById(eventId).select('_id title date');
    if (!event) {
      return res.status(404).json({ success: false, message: 'Evento no encontrado' });
    }

    const seats = Math.min(8, Math.max(1, parseInt(totalSeats, 10) || 3));
    const contribution = Math.max(0, parseFloat(contributionAmount) || 0);

    const carpool = await Carpool.create({
      event: eventId,
      driver: req.user.id,
      departureLocation: departureLocation || 'Punto central de encuentro',
      departureTime: departureTime ? new Date(departureTime) : (event.date ? new Date(new Date(event.date).getTime() - 7200000) : new Date()),
      totalSeats: seats,
      availableSeats: seats,
      contributionAmount: contribution,
      vehicleModel: vehicleModel || 'Vehículo particular',
      notes: notes || '¡Llegamos juntos al evento y cuidamos el medio ambiente!',
      returnTrip: returnTrip !== false
    });

    await carpool.populate('driver', 'firstName lastName username avatar verified');

    return res.status(201).json({
      success: true,
      message: '¡Viaje compartido publicado! Tu tribu podrá unirse a tu ruta.',
      data: carpool
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error al publicar viaje compartido', error: err.message });
  }
});

// POST /api/carpools/:eventId/join/:carpoolId - Reserve a seat in a carpool
router.post('/:eventId/join/:carpoolId', protect, async (req, res) => {
  try {
    const { carpoolId } = req.params;
    const carpool = await Carpool.findById(carpoolId);

    if (!carpool) {
      return res.status(404).json({ success: false, message: 'Viaje no encontrado' });
    }

    if (String(carpool.driver) === String(req.user.id)) {
      return res.status(400).json({ success: false, message: 'Eres el conductor de este viaje' });
    }

    if (carpool.availableSeats <= 0) {
      return res.status(400).json({ success: false, message: 'Este viaje ya tiene todos los asientos ocupados' });
    }

    const alreadyPassenger = carpool.passengers.some(p => String(p.user) === String(req.user.id) && p.status === 'confirmed');
    if (alreadyPassenger) {
      return res.status(400).json({ success: false, message: 'Ya tienes un asiento reservado en este viaje' });
    }

    carpool.passengers.push({
      user: req.user.id,
      seatsBooked: 1,
      status: 'confirmed'
    });
    carpool.availableSeats = Math.max(0, carpool.availableSeats - 1);
    if (carpool.availableSeats === 0) {
      carpool.status = 'full';
    }

    await carpool.save();

    return res.status(200).json({
      success: true,
      message: '¡Asiento reservado! Coordina con el conductor para la salida.',
      availableSeats: carpool.availableSeats
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error al unirse al viaje compartido', error: err.message });
  }
});

module.exports = router;
