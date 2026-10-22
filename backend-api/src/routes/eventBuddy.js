'use strict';

const express = require('express');
const router = express.Router();
const EventBuddy = require('../models/EventBuddy');
const Event = require('../models/Event');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// GET /api/event-buddy/:eventId - List participants seeking an event buddy
router.get('/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const currentUserId = req.user?.id || req.headers['x-user-id'];

    const buddies = await EventBuddy.find({
      event: eventId,
      status: { $in: ['seeking', 'matched'] }
    })
      .populate('user', 'firstName lastName username avatar isOrganizerVerified verified interests')
      .sort({ createdAt: -1 })
      .lean();

    const formatted = buddies.map(b => ({
      _id: b._id,
      user: {
        _id: b.user?._id,
        firstName: b.user?.firstName || b.user?.username || 'Asistente',
        username: b.user?.username,
        avatar: b.user?.avatar,
        verified: Boolean(b.user?.verified || b.user?.isOrganizerVerified),
        interests: b.interests?.length ? b.interests : (b.user?.interests || [])
      },
      status: b.status,
      seekingGender: b.seekingGender,
      bio: b.bio,
      isSelf: currentUserId ? String(b.user?._id) === String(currentUserId) : false,
      requestsCount: b.requests?.length || 0,
      createdAt: b.createdAt
    }));

    return res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error al consultar compañeros de evento', error: err.message });
  }
});

// POST /api/event-buddy/:eventId - Register or update buddy profile for an event
router.post('/:eventId', protect, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { bio, seekingGender, interests } = req.body;

    const event = await Event.findById(eventId).select('_id title');
    if (!event) {
      return res.status(404).json({ success: false, message: 'Evento no encontrado' });
    }

    let buddy = await EventBuddy.findOne({ event: eventId, user: req.user.id });

    if (buddy) {
      buddy.status = 'seeking';
      if (bio !== undefined) buddy.bio = bio.slice(0, 240);
      if (seekingGender) buddy.seekingGender = seekingGender;
      if (Array.isArray(interests)) buddy.interests = interests.slice(0, 10);
      await buddy.save();
    } else {
      buddy = await EventBuddy.create({
        event: eventId,
        user: req.user.id,
        bio: bio || '¡Busco unirme con alguien para disfrutar este evento!',
        seekingGender: seekingGender || 'any',
        interests: Array.isArray(interests) ? interests.slice(0, 10) : []
      });
    }

    await buddy.populate('user', 'firstName lastName username avatar verified isOrganizerVerified');

    return res.status(201).json({
      success: true,
      message: '¡Te has registrado para encontrar compañero/a de evento!',
      data: buddy
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error al registrar compañero de evento', error: err.message });
  }
});

// DELETE /api/event-buddy/:eventId - Withdraw buddy profile
router.delete('/:eventId', protect, async (req, res) => {
  try {
    const { eventId } = req.params;
    await EventBuddy.findOneAndDelete({ event: eventId, user: req.user.id });

    return res.status(200).json({
      success: true,
      message: 'Has desactivado la búsqueda de compañero para este evento'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error al retirar perfil de compañero', error: err.message });
  }
});

// POST /api/event-buddy/:eventId/request/:buddyId - Send connection request to a buddy
router.post('/:eventId/request/:buddyId', protect, async (req, res) => {
  try {
    const { eventId, buddyId } = req.params;
    const { message } = req.body;

    const targetBuddy = await EventBuddy.findById(buddyId);
    if (!targetBuddy) {
      return res.status(404).json({ success: false, message: 'Perfil de compañero no encontrado' });
    }

    if (String(targetBuddy.user) === String(req.user.id)) {
      return res.status(400).json({ success: false, message: 'No puedes enviarte una solicitud a ti mismo' });
    }

    const alreadyRequested = targetBuddy.requests?.some(r => String(r.fromUser) === String(req.user.id));
    if (alreadyRequested) {
      return res.status(200).json({ success: true, message: 'Ya has enviado una solicitud a este usuario' });
    }

    targetBuddy.requests.push({
      fromUser: req.user.id,
      message: (message || '¡Hola! También voy a este evento, ¿hacemos coro juntos?').slice(0, 200),
      status: 'pending'
    });

    await targetBuddy.save();

    return res.status(200).json({
      success: true,
      message: '¡Solicitud de conexión enviada exitosamente!'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error al enviar solicitud', error: err.message });
  }
});

module.exports = router;
