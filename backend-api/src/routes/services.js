const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const { protect, restrictTo } = require('../middleware/auth');

// @desc    Get all active services
// @route   GET /api/services
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const services = await Service.find({ isActive: true }).sort('order');
    res.json({ success: true, data: services });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @desc    Get service by identifier
// @route   GET /api/services/:identifier
// @access  Private
router.get('/:identifier', protect, async (req, res) => {
  try {
    const service = await Service.findOne({ identifier: req.params.identifier, isActive: true });
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    res.json({ success: true, data: service });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @desc    Create a service (Admin only)
// @route   POST /api/services
// @access  Private/Admin
router.post('/', protect, restrictTo('admin'), async (req, res) => {
  try {
    const service = await Service.create(req.body);
    res.status(201).json({
      success: true,
      data: service
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
