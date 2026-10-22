const express = require('express');
const router = express.Router();
const SupportTicket = require('../models/SupportTicket');
const AuditService = require('../services/auditService');
const { protect, restrictTo } = require('../middleware/auth');
const logger = require('../utils/logger');

// @desc    Create a new support ticket
// @route   POST /api/support/tickets
// @access  Private (User)
router.post('/tickets', protect, async (req, res) => {
  try {
    const { subject, category, priority, message, relatedEvent } = req.body;

    if (!subject || !subject.trim()) {
      return res.status(400).json({ success: false, message: 'El asunto del ticket es obligatorio' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'El mensaje descriptivo es obligatorio' });
    }

    const ticket = new SupportTicket({
      user: req.user.id,
      subject: subject.trim(),
      category: category || 'other',
      priority: priority || 'medium',
      relatedEvent: relatedEvent || null,
      messages: [{
        sender: req.user.id,
        senderRole: req.user.role === 'admin' ? 'admin' : 'user',
        senderName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username,
        message: message.trim()
      }]
    });

    await ticket.save();

    res.status(201).json({
      success: true,
      message: 'Ticket de soporte creado exitosamente',
      data: ticket
    });
  } catch (error) {
    logger.error('Create support ticket error:', error);
    res.status(500).json({ success: false, message: 'Error al crear el ticket de soporte' });
  }
});

// @desc    Get current user's tickets
// @route   GET /api/support/my-tickets
// @access  Private (User)
router.get('/my-tickets', protect, async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ user: req.user.id })
      .populate('relatedEvent', 'title date location')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      count: tickets.length,
      data: tickets
    });
  } catch (error) {
    logger.error('Get my tickets error:', error);
    res.status(500).json({ success: false, message: 'Error al obtener tickets de soporte' });
  }
});

// @desc    Get a single ticket thread
// @route   GET /api/support/tickets/:id
// @access  Private (Owner or Admin)
router.get('/tickets/:id', protect, async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate('user', 'firstName lastName username email avatar')
      .populate('assignedTo', 'firstName lastName username avatar')
      .populate('relatedEvent', 'title date location');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    }

    // Must be ticket owner or admin
    const isOwner = ticket.user._id.toString() === req.user.id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para ver este ticket' });
    }

    res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    logger.error('Get ticket detail error:', error);
    res.status(500).json({ success: false, message: 'Error al obtener detalle del ticket' });
  }
});

// @desc    Reply to a ticket thread
// @route   POST /api/support/tickets/:id/reply
// @access  Private (Owner or Admin)
router.post('/tickets/:id/reply', protect, async (req, res) => {
  try {
    const { message, attachments } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'El mensaje de respuesta no puede estar vacío' });
    }

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    }

    const isOwner = ticket.user.toString() === req.user.id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para responder a este ticket' });
    }

    const senderRole = isAdmin ? 'admin' : 'user';
    const senderName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username;

    ticket.messages.push({
      sender: req.user.id,
      senderRole,
      senderName,
      message: message.trim(),
      attachments: attachments || []
    });

    // Update status based on who replied
    if (isAdmin) {
      ticket.status = 'waiting_user';
      if (!ticket.assignedTo) ticket.assignedTo = req.user.id;
    } else {
      ticket.status = 'in_progress';
    }

    await ticket.save();

    res.json({
      success: true,
      message: 'Respuesta enviada',
      data: ticket
    });
  } catch (error) {
    logger.error('Reply support ticket error:', error);
    res.status(500).json({ success: false, message: 'Error al enviar respuesta' });
  }
});

// @desc    List all tickets for admin
// @route   GET /api/support/admin/tickets
// @access  Admin
router.get('/admin/tickets', [protect, restrictTo('admin')], async (req, res) => {
  try {
    const { status = 'all', category, priority, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status !== 'all') {
      query.status = status;
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    if (search && search.trim()) {
      const q = search.trim();
      query.$or = [
        { ticketNumber: { $regex: q, $options: 'i' } },
        { subject: { $regex: q, $options: 'i' } }
      ];
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

    const [tickets, total] = await Promise.all([
      SupportTicket.find(query)
        .populate('user', 'firstName lastName username email avatar')
        .populate('assignedTo', 'firstName lastName username avatar')
        .populate('relatedEvent', 'title date')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      SupportTicket.countDocuments(query)
    ]);

    // Count tickets by status for admin quick chips
    const [openCount, inProgressCount, waitingCount, resolvedCount] = await Promise.all([
      SupportTicket.countDocuments({ status: 'open' }),
      SupportTicket.countDocuments({ status: 'in_progress' }),
      SupportTicket.countDocuments({ status: 'waiting_user' }),
      SupportTicket.countDocuments({ status: 'resolved' })
    ]);

    res.json({
      success: true,
      data: tickets,
      counts: {
        all: total,
        open: openCount,
        in_progress: inProgressCount,
        waiting_user: waitingCount,
        resolved: resolvedCount
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Admin list tickets error:', error);
    res.status(500).json({ success: false, message: 'Error al listar tickets de soporte' });
  }
});

// @desc    Update ticket status / resolution notes (Admin only)
// @route   PUT /api/support/admin/tickets/:id/status
// @access  Admin
router.put('/admin/tickets/:id/status', [protect, restrictTo('admin')], async (req, res) => {
  try {
    const { status, priority, resolutionNotes, assignedTo } = req.body;

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    }

    const prevStatus = ticket.status;

    if (status) ticket.status = status;
    if (priority) ticket.priority = priority;
    if (resolutionNotes !== undefined) ticket.resolutionNotes = resolutionNotes;
    if (assignedTo !== undefined) ticket.assignedTo = assignedTo;

    if (status === 'resolved' || status === 'closed') {
      ticket.resolvedAt = new Date();
    }

    await ticket.save();

    // Log admin action to audit trail
    await AuditService.log({
      action: 'support_ticket_status_changed',
      actor: req.user.id,
      actorUsername: req.user.username,
      targetType: 'support_ticket',
      targetId: ticket._id,
      targetLabel: `${ticket.ticketNumber} - ${ticket.subject}`,
      status: 'success',
      details: {
        prevStatus,
        newStatus: ticket.status,
        resolutionNotes: ticket.resolutionNotes
      },
      req
    });

    res.json({
      success: true,
      message: 'Estado del ticket actualizado',
      data: ticket
    });
  } catch (error) {
    logger.error('Update ticket status error:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar el estado del ticket' });
  }
});

module.exports = router;
