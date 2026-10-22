const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');
const { protect, optionalAuth } = require('../middleware/auth');
const logger = require('../utils/logger') || console;

// @route   GET /api/suppliers
// @desc    Obtener suplidores verificados para eventos
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, city, search } = req.query;
    const query = { archivedAt: null };
    const escape = value => String(value).slice(0, 120).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    if (category && category !== 'all') {
      query.category = category;
    }
    if (city) {
      query.city = new RegExp(escape(city), 'i');
    }
    if (search) {
      query.$or = [
        { name: new RegExp(escape(search), 'i') },
        { description: new RegExp(escape(search), 'i') },
        { categoryLabel: new RegExp(escape(search), 'i') }
      ];
    }

    const suppliers = await Supplier.find(query).sort({ featured: -1, rating: -1 }).limit(100);
    res.json({
      success: true,
      count: suppliers.length,
      data: suppliers
    });
  } catch (error) {
    logger.error('Error fetching suppliers:', error);
    res.status(500).json({ success: false, message: 'Error al obtener suplidores' });
  }
});

// @route   POST /api/suppliers
// @desc    Crear un nuevo suplidor (protegido)
router.post('/', protect, async (req, res) => {
  try {
    const supplier = await Supplier.create({
      ...Object.fromEntries(['name', 'category', 'categoryLabel', 'description', 'city', 'phone', 'whatsapp', 'instagram', 'priceRange', 'startingPriceDOP', 'image', 'gallery', 'services'].filter(key => req.body[key] !== undefined).map(key => [key, req.body[key]])),
      isVerified: false, rating: 0, reviewsCount: 0, featured: false
    });
    res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    logger.error('Error creating supplier:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
