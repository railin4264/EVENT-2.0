const express = require('express');
const router = express.Router();
const AuditService = require('../services/auditService');
const { protect, restrictTo } = require('../middleware/auth');
const logger = require('../utils/logger');

// @desc    Get paginated audit logs (Admin only)
// @route   GET /api/audit/logs
// @access  Admin
router.get('/logs', [protect, restrictTo('admin')], async (req, res) => {
  try {
    const { page, limit, action, targetType, status, search, startDate, endDate } = req.query;
    const result = await AuditService.getLogs({
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 25,
      action,
      targetType,
      status,
      search,
      startDate,
      endDate
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Get audit logs error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving audit logs' });
  }
});

// @desc    Get audit overview statistics (Admin only)
// @route   GET /api/audit/stats
// @access  Admin
router.get('/stats', [protect, restrictTo('admin')], async (req, res) => {
  try {
    const stats = await AuditService.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Get audit stats error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving audit stats' });
  }
});

module.exports = router;
