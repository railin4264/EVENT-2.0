const express = require('express');
const { protect, restrictTo } = require('../middleware/auth');
const logger = require('../utils/logger');
const Report = require('../models/Report');
const User = require('../models/User');
const Event = require('../models/Event');
const Tribe = require('../models/Tribe');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// @desc    Create a new report
// @route   POST /api/reports
// @access  Private
router.post('/', [
  protect,
  body('type').isIn(['user', 'event', 'tribe', 'post', 'comment', 'message']),
  body('category').isIn([
    'spam', 'harassment', 'inappropriate_content', 'fake_profile',
    'violence', 'hate_speech', 'sexual_content', 'misinformation',
    'copyright', 'fraud', 'underage', 'other'
  ]),
  body('reason').isLength({ min: 10, max: 1000 }).trim(),
  body('description').optional().isLength({ max: 2000 }).trim()
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

    const {
      type,
      category,
      reason,
      description,
      reportedUserId,
      reportedEventId,
      reportedTribeId,
      reportedPostId,
      reportedCommentId,
      evidence
    } = req.body;

    // Prevent self-reporting
    if (type === 'user' && reportedUserId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot report yourself'
      });
    }

    // Check if the reported item exists
    let reportedItem = null;
    if (type === 'user' && reportedUserId) {
      reportedItem = await User.findById(reportedUserId);
      if (!reportedItem) {
        return res.status(404).json({
          success: false,
          message: 'Reported user not found'
        });
      }
    } else if (type === 'event' && reportedEventId) {
      reportedItem = await Event.findById(reportedEventId);
      if (!reportedItem) {
        return res.status(404).json({
          success: false,
          message: 'Reported event not found'
        });
      }
    } else if (type === 'tribe' && reportedTribeId) {
      reportedItem = await Tribe.findById(reportedTribeId);
      if (!reportedItem) {
        return res.status(404).json({
          success: false,
          message: 'Reported tribe not found'
        });
      }
    }

    // Check for duplicate reports
    const existingReport = await Report.findOne({
      reporter: req.user.id,
      type,
      ...(reportedUserId && { reportedUser: reportedUserId }),
      ...(reportedEventId && { reportedEvent: reportedEventId }),
      ...(reportedTribeId && { reportedTribe: reportedTribeId }),
      ...(reportedPostId && { reportedPost: reportedPostId }),
      ...(reportedCommentId && { reportedComment: reportedCommentId }),
      status: { $in: ['pending', 'under_review'] }
    });

    if (existingReport) {
      return res.status(400).json({
        success: false,
        message: 'You have already reported this item'
      });
    }

    // Determine priority based on category
    let priority = 'medium';
    if (['violence', 'hate_speech', 'sexual_content', 'underage'].includes(category)) {
      priority = 'high';
    } else if (['spam', 'other'].includes(category)) {
      priority = 'low';
    }

    // Create report
    const report = new Report({
      reporter: req.user.id,
      type,
      category,
      reason,
      description,
      priority,
      evidence: evidence || [],
      ...(reportedUserId && { reportedUser: reportedUserId }),
      ...(reportedEventId && { reportedEvent: reportedEventId }),
      ...(reportedTribeId && { reportedTribe: reportedTribeId }),
      ...(reportedPostId && { reportedPost: reportedPostId }),
      ...(reportedCommentId && { reportedComment: reportedCommentId }),
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        deviceInfo: req.get('X-Device-Info') || 'Unknown'
      }
    });

    await report.save();

    // Log the report
    logger.info(`New report created: ${report._id} by user ${req.user.id}`);

    // Send notification to admins for high/urgent priority reports
    if (priority === 'high' || priority === 'urgent') {
      try {
        // Find all admin users
        const adminUsers = await User.find({ role: 'admin' }).select('_id');

        // Create notifications for all admins
        const notificationPromises = adminUsers.map(admin => {
          return require('../models/Notification').create({
            recipient: admin._id,
            type: 'admin_report',
            title: `${priority.toUpperCase()} Priority Report`,
            message: `New ${priority} priority ${type} report requires attention`,
            data: {
              reportId: report._id,
              reportType: type,
              category: category,
              priority: priority,
              reporterId: req.user.id
            }
          });
        });

        await Promise.all(notificationPromises);
        logger.info(`Admin notifications sent for ${priority} priority report: ${report._id}`);
      } catch (notificationError) {
        logger.error('Failed to send admin notifications:', notificationError);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      report: {
        _id: report._id,
        type: report.type,
        category: report.category,
        status: report.status,
        priority: report.priority,
        createdAt: report.createdAt
      }
    });
  } catch (error) {
    logger.error('Create report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get user's reports
// @route   GET /api/reports/my-reports
// @access  Private
router.get('/my-reports', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const reports = await Report.find({ reporter: req.user.id })
      .populate('reportedUser', 'username firstName lastName avatar')
      .populate('reportedEvent', 'title description')
      .populate('reportedTribe', 'name description')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Report.countDocuments({ reporter: req.user.id });

    const formattedReports = reports.map(report => ({
      _id: report._id,
      type: report.type,
      category: report.category,
      reason: report.reason,
      status: report.status,
      priority: report.priority,
      reportedItem: report.reportedUser || report.reportedEvent || report.reportedTribe,
      createdAt: report.createdAt,
      reviewedAt: report.reviewedAt,
      resolution: report.resolution
    }));

    res.json({
      success: true,
      reports: formattedReports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get my reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get all reports (Admin only)
// @route   GET /api/reports/admin
// @access  Private/Admin
router.get('/admin', protect, restrictTo('admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    
    const { status, type, category, priority } = req.query;

    // Build query
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (category) query.category = category;
    if (priority) query.priority = priority;

    const reports = await Report.find(query)
      .populate('reporter', 'username firstName lastName avatar')
      .populate('reportedUser', 'username firstName lastName avatar')
      .populate('reportedEvent', 'title description')
      .populate('reportedTribe', 'name description')
      .populate('reviewedBy', 'username firstName lastName')
      .skip(skip)
      .limit(limit)
      .sort({ priority: -1, createdAt: -1 });

    const total = await Report.countDocuments(query);
    const stats = await Report.getReportStats();

    res.json({
      success: true,
      reports,
      stats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get admin reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update report status (Admin only)
// @route   PUT /api/reports/:id/status
// @access  Private/Admin
router.put('/:id/status', [
  protect,
  restrictTo('admin'),
  body('status').isIn(['pending', 'under_review', 'resolved', 'dismissed', 'escalated']),
  body('resolution').optional().isLength({ max: 1000 }).trim(),
  body('actionTaken').optional().isIn([
    'none', 'warning_sent', 'content_removed', 'user_suspended',
    'user_banned', 'event_cancelled', 'tribe_deleted', 'post_removed', 'comment_removed'
  ])
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

    const { status, resolution, actionTaken, adminNotes } = req.body;

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    report.status = status;
    if (resolution) report.resolution = resolution;
    if (actionTaken) report.actionTaken = actionTaken;
    if (adminNotes) report.adminNotes = adminNotes;
    
    if (status === 'resolved' || status === 'dismissed') {
      report.reviewedBy = req.user.id;
      report.reviewedAt = new Date();
    }

    await report.save();

    logger.info(`Report ${report._id} status updated to ${status} by admin ${req.user.id}`);

    res.json({
      success: true,
      message: 'Report status updated successfully',
      report
    });
  } catch (error) {
    logger.error('Update report status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get report categories and types
// @route   GET /api/reports/config
// @access  Public
router.get('/config', (req, res) => {
  res.json({
    success: true,
    config: {
      types: [
        { value: 'user', label: 'Usuario' },
        { value: 'event', label: 'Evento' },
        { value: 'tribe', label: 'Tribu' },
        { value: 'post', label: 'Publicación' },
        { value: 'comment', label: 'Comentario' },
        { value: 'message', label: 'Mensaje' }
      ],
      categories: [
        { value: 'spam', label: 'Spam', description: 'Contenido no deseado o repetitivo' },
        { value: 'harassment', label: 'Acoso', description: 'Comportamiento intimidatorio o abusivo' },
        { value: 'inappropriate_content', label: 'Contenido inapropiado', description: 'Contenido que viola las normas de la comunidad' },
        { value: 'fake_profile', label: 'Perfil falso', description: 'Cuenta que se hace pasar por otra persona' },
        { value: 'violence', label: 'Violencia', description: 'Amenazas o incitación a la violencia' },
        { value: 'hate_speech', label: 'Discurso de odio', description: 'Contenido que promueve odio hacia grupos' },
        { value: 'sexual_content', label: 'Contenido sexual', description: 'Contenido sexual explícito o inapropiado' },
        { value: 'misinformation', label: 'Desinformación', description: 'Información falsa o engañosa' },
        { value: 'copyright', label: 'Derechos de autor', description: 'Uso no autorizado de contenido protegido' },
        { value: 'fraud', label: 'Fraude', description: 'Actividades fraudulentas o estafas' },
        { value: 'underage', label: 'Menor de edad', description: 'Contenido relacionado con menores' },
        { value: 'other', label: 'Otro', description: 'Otra razón no listada arriba' }
      ]
    }
  });
});

module.exports = router;
