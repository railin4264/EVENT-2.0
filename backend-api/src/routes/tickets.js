const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const logger = require('../utils/logger');

const router = express.Router();

// @desc    List tickets for the authenticated user
// @route   GET /api/tickets
// @access  Private
router.get('/', [protect], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const tickets = await Ticket.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      count: tickets.length,
      data: tickets
    });
  } catch (error) {
    logger.error('Error listing tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list tickets'
    });
  }
});

// Validation middleware for ticket creation
const validateTicketCreation = [
  body('eventId').isMongoId().withMessage('Valid event ID required'),
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name must be between 1-100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description too long'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be 0 or greater'),
  body('currency').optional().isIn(['usd', 'eur', 'gbp', 'mxn', 'cad']).withMessage('Invalid currency'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('type').optional().isIn(['general', 'vip', 'early_bird', 'group', 'student']).withMessage('Invalid ticket type'),
  body('saleStartDate').isISO8601().withMessage('Valid sale start date required'),
  body('saleEndDate').isISO8601().withMessage('Valid sale end date required'),
  body('minPurchase').optional().isInt({ min: 1 }).withMessage('Min purchase must be at least 1'),
  body('maxPurchase').optional().isInt({ min: 1 }).withMessage('Max purchase must be at least 1')
];

// @desc    Create new ticket for event
// @route   POST /api/tickets
// @access  Private
router.post('/', [protect, ...validateTicketCreation], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { eventId } = req.body;

    // Verify event exists and user owns it
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (event.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create tickets for this event'
      });
    }

    // Validate sale dates
    const saleStartDate = new Date(req.body.saleStartDate);
    const saleEndDate = new Date(req.body.saleEndDate);
    const eventDate = new Date(event.date);

    if (saleStartDate >= saleEndDate) {
      return res.status(400).json({
        success: false,
        message: 'Sale start date must be before sale end date'
      });
    }

    if (saleEndDate > eventDate) {
      return res.status(400).json({
        success: false,
        message: 'Sale end date must be before event date'
      });
    }

    // Create ticket
    const ticketData = {
      ...req.body,
      saleStartDate,
      saleEndDate
    };

    // Set defaults
    if (!ticketData.currency) ticketData.currency = 'usd';
    if (!ticketData.type) ticketData.type = 'general';
    if (!ticketData.minPurchase) ticketData.minPurchase = 1;
    if (!ticketData.maxPurchase) ticketData.maxPurchase = 10;

    const ticket = await Ticket.create(ticketData);

    logger.info(`Ticket created: ${ticket._id} for event ${eventId} by user ${req.user._id}`);

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      data: ticket
    });
  } catch (error) {
    logger.error('Error creating ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create ticket'
    });
  }
});

// @desc    Get tickets for event
// @route   GET /api/tickets/events/:eventId
// @access  Public
router.get('/events/:eventId', [
  param('eventId').isMongoId().withMessage('Valid event ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { eventId } = req.params;
    const { includeInactive } = req.query;

    // Build query
    const query = { eventId };

    // Only show active tickets to public, unless includeInactive is requested by organizer/admin
    if (!includeInactive) {
      query.isActive = true;
    }

    const tickets = await Ticket.find(query).sort({ createdAt: 1 });

    res.json({
      success: true,
      data: tickets.map(ticket => ({
        id: ticket._id,
        name: ticket.name,
        description: ticket.description,
        price: ticket.price,
        currency: ticket.currency,
        type: ticket.type,
        quantity: ticket.quantity,
        sold: ticket.sold,
        remaining: ticket.remaining,
        saleStartDate: ticket.saleStartDate,
        saleEndDate: ticket.saleEndDate,
        minPurchase: ticket.minPurchase,
        maxPurchase: ticket.maxPurchase,
        isActive: ticket.isActive,
        isFree: ticket.isFree,
        isAvailable: ticket.isAvailable(),
        createdAt: ticket.createdAt
      }))
    });
  } catch (error) {
    logger.error('Error getting event tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve tickets'
    });
  }
});

// @desc    Get single ticket
// @route   GET /api/tickets/:ticketId
// @access  Public
router.get('/:ticketId', [
  param('ticketId').isMongoId().withMessage('Valid ticket ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { ticketId } = req.params;

    const ticket = await Ticket.findById(ticketId).populate('eventId', 'title date location');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    res.json({
      success: true,
      data: {
        ...ticket.toObject(),
        remaining: ticket.remaining,
        isAvailable: ticket.isAvailable(),
        canPurchase: (quantity) => ticket.canPurchase(quantity)
      }
    });
  } catch (error) {
    logger.error('Error getting ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve ticket'
    });
  }
});

// @desc    Update ticket
// @route   PUT /api/tickets/:ticketId
// @access  Private
router.put('/:ticketId', [
  protect,
  param('ticketId').isMongoId().withMessage('Valid ticket ID required'),
  body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Name must be between 1-100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description too long'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be 0 or greater'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('saleStartDate').optional().isISO8601().withMessage('Valid sale start date required'),
  body('saleEndDate').optional().isISO8601().withMessage('Valid sale end date required'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  body('minPurchase').optional().isInt({ min: 1 }).withMessage('Min purchase must be at least 1'),
  body('maxPurchase').optional().isInt({ min: 1 }).withMessage('Max purchase must be at least 1')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { ticketId } = req.params;

    const ticket = await Ticket.findById(ticketId).populate('eventId');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Check authorization
    if (ticket.eventId.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this ticket'
      });
    }

    // Validate quantity changes
    if (req.body.quantity && req.body.quantity < ticket.sold) {
      return res.status(400).json({
        success: false,
        message: `Cannot reduce quantity below sold tickets (${ticket.sold})`
      });
    }

    // Validate date changes
    if (req.body.saleStartDate || req.body.saleEndDate) {
      const saleStartDate = req.body.saleStartDate ? new Date(req.body.saleStartDate) : ticket.saleStartDate;
      const saleEndDate = req.body.saleEndDate ? new Date(req.body.saleEndDate) : ticket.saleEndDate;
      const eventDate = new Date(ticket.eventId.date);

      if (saleStartDate >= saleEndDate) {
        return res.status(400).json({
          success: false,
          message: 'Sale start date must be before sale end date'
        });
      }

      if (saleEndDate > eventDate) {
        return res.status(400).json({
          success: false,
          message: 'Sale end date must be before event date'
        });
      }
    }

    // Update ticket
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        ticket[key] = req.body[key];
      }
    });

    await ticket.save();

    logger.info(`Ticket updated: ${ticketId} by user ${req.user._id}`);

    res.json({
      success: true,
      message: 'Ticket updated successfully',
      data: ticket
    });
  } catch (error) {
    logger.error('Error updating ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update ticket'
    });
  }
});

// @desc    Delete ticket
// @route   DELETE /api/tickets/:ticketId
// @access  Private
router.delete('/:ticketId', [
  protect,
  param('ticketId').isMongoId().withMessage('Valid ticket ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { ticketId } = req.params;

    const ticket = await Ticket.findById(ticketId).populate('eventId');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Check authorization
    if (ticket.eventId.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this ticket'
      });
    }

    // Check if tickets have been sold
    if (ticket.sold > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete ticket with ${ticket.sold} tickets already sold. Deactivate instead.`
      });
    }

    await Ticket.findByIdAndDelete(ticketId);

    logger.info(`Ticket deleted: ${ticketId} by user ${req.user._id}`);

    res.json({
      success: true,
      message: 'Ticket deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete ticket'
    });
  }
});

// @desc    Get available tickets for purchase
// @route   GET /api/tickets/events/:eventId/available
// @access  Public
router.get('/events/:eventId/available', [
  param('eventId').isMongoId().withMessage('Valid event ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { eventId } = req.params;

    const tickets = await Ticket.getAvailableTickets(eventId);

    res.json({
      success: true,
      data: tickets.map(ticket => ({
        id: ticket._id,
        name: ticket.name,
        description: ticket.description,
        price: ticket.price,
        currency: ticket.currency,
        type: ticket.type,
        remaining: ticket.remaining,
        minPurchase: ticket.minPurchase,
        maxPurchase: ticket.maxPurchase,
        isFree: ticket.isFree
      }))
    });
  } catch (error) {
    logger.error('Error getting available tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve available tickets'
    });
  }
});

// @desc    Check ticket availability for specific quantity
// @route   GET /api/tickets/:ticketId/check/:quantity
// @access  Public
router.get('/:ticketId/check/:quantity', [
  param('ticketId').isMongoId().withMessage('Valid ticket ID required'),
  param('quantity').isInt({ min: 1, max: 50 }).withMessage('Quantity must be between 1 and 50')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { ticketId, quantity } = req.params;

    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    const canPurchase = ticket.canPurchase(parseInt(quantity));
    const available = ticket.isAvailable();

    let message = 'Available for purchase';
    if (!available) {
      message = 'Not available for purchase';
    } else if (!canPurchase) {
      if (parseInt(quantity) > ticket.remaining) {
        message = `Only ${ticket.remaining} tickets remaining`;
      } else if (parseInt(quantity) < ticket.minPurchase) {
        message = `Minimum purchase is ${ticket.minPurchase} tickets`;
      } else if (parseInt(quantity) > ticket.maxPurchase) {
        message = `Maximum purchase is ${ticket.maxPurchase} tickets`;
      }
    }

    res.json({
      success: true,
      data: {
        canPurchase,
        available,
        remaining: ticket.remaining,
        message,
        ticketInfo: {
          name: ticket.name,
          price: ticket.price,
          currency: ticket.currency,
          minPurchase: ticket.minPurchase,
          maxPurchase: ticket.maxPurchase
        }
      }
    });
  } catch (error) {
    logger.error('Error checking ticket availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check ticket availability'
    });
  }
});

module.exports = router;