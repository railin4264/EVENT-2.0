const express = require('express');
const router = express.Router();
const GoogleMapsService = require('../services/GoogleMapsService');
const { validateRequest } = require('../middleware/validation');
const { body, query } = require('express-validator');
const logger = require('../utils/logger');

/**
 * @route   POST /api/maps/geocode
 * @desc    Geocode an address to get coordinates
 * @access  Public
 */
router.post('/geocode',
  [
    body('address')
      .notEmpty()
      .withMessage('Address is required')
      .isLength({ min: 3, max: 500 })
      .withMessage('Address must be between 3 and 500 characters')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { address } = req.body;
      
      logger.info(`Geocoding address: ${address}`);
      const result = await GoogleMapsService.geocodeAddress(address);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error geocoding address:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to geocode address'
      });
    }
  }
);

/**
 * @route   GET /api/maps/reverse-geocode
 * @desc    Reverse geocode coordinates to get address
 * @access  Public
 */
router.get('/reverse-geocode',
  [
    query('lat')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be a number between -90 and 90'),
    query('lng')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be a number between -180 and 180')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { lat, lng } = req.query;
      
      logger.info(`Reverse geocoding coordinates: ${lat}, ${lng}`);
      const result = await GoogleMapsService.reverseGeocode(
        parseFloat(lat), 
        parseFloat(lng)
      );
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error reverse geocoding:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to reverse geocode coordinates'
      });
    }
  }
);

/**
 * @route   GET /api/maps/places/search
 * @desc    Search for places using Google Places API
 * @access  Public
 */
router.get('/places/search',
  [
    query('q')
      .notEmpty()
      .withMessage('Search query is required')
      .isLength({ min: 2, max: 200 })
      .withMessage('Query must be between 2 and 200 characters'),
    query('lat')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be a number between -90 and 90'),
    query('lng')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be a number between -180 and 180'),
    query('radius')
      .optional()
      .isInt({ min: 100, max: 50000 })
      .withMessage('Radius must be between 100 and 50000 meters'),
    query('type')
      .optional()
      .isIn([
        'restaurant', 'lodging', 'tourist_attraction', 'establishment',
        'point_of_interest', 'park', 'museum', 'shopping_mall'
      ])
      .withMessage('Invalid place type')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { q, lat, lng, radius, type } = req.query;
      
      const options = {};
      if (lat && lng) {
        options.lat = parseFloat(lat);
        options.lng = parseFloat(lng);
      }
      if (radius) options.radius = parseInt(radius);
      if (type) options.type = type;
      
      logger.info(`Searching places: ${q}`, options);
      const places = await GoogleMapsService.searchPlaces(q, options);
      
      res.json({
        success: true,
        data: places,
        count: places.length
      });
    } catch (error) {
      logger.error('Error searching places:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to search places'
      });
    }
  }
);

/**
 * @route   POST /api/maps/distance-matrix
 * @desc    Get distance matrix between origins and destinations
 * @access  Public
 */
router.post('/distance-matrix',
  [
    body('origins')
      .isArray({ min: 1, max: 10 })
      .withMessage('Origins must be an array with 1-10 items'),
    body('destinations')
      .isArray({ min: 1, max: 10 })
      .withMessage('Destinations must be an array with 1-10 items'),
    body('mode')
      .optional()
      .isIn(['driving', 'walking', 'bicycling', 'transit'])
      .withMessage('Invalid travel mode'),
    body('units')
      .optional()
      .isIn(['metric', 'imperial'])
      .withMessage('Units must be metric or imperial')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { origins, destinations, mode, units } = req.body;
      
      logger.info('Getting distance matrix', { 
        originsCount: origins.length, 
        destinationsCount: destinations.length 
      });
      
      const result = await GoogleMapsService.getDistanceMatrix(
        origins, 
        destinations, 
        { mode, units }
      );
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error getting distance matrix:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to get distance matrix'
      });
    }
  }
);

/**
 * @route   GET /api/maps/photo/:photoReference
 * @desc    Get photo URL from photo reference
 * @access  Public
 */
router.get('/photo/:photoReference',
  [
    query('maxwidth')
      .optional()
      .isInt({ min: 50, max: 1600 })
      .withMessage('Max width must be between 50 and 1600 pixels')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { photoReference } = req.params;
      const { maxwidth = 400 } = req.query;
      
      const photoUrl = GoogleMapsService.getPhotoUrl(
        photoReference, 
        parseInt(maxwidth)
      );
      
      if (!photoUrl) {
        return res.status(400).json({
          success: false,
          message: 'Google Maps API key not configured'
        });
      }
      
      res.json({
        success: true,
        data: { photoUrl }
      });
    } catch (error) {
      logger.error('Error getting photo URL:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to get photo URL'
      });
    }
  }
);

/**
 * @route   POST /api/maps/validate-coordinates
 * @desc    Validate coordinates
 * @access  Public
 */
router.post('/validate-coordinates',
  [
    body('lat')
      .isFloat()
      .withMessage('Latitude must be a number'),
    body('lng')
      .isFloat()
      .withMessage('Longitude must be a number')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { lat, lng } = req.body;
      
      const isValid = GoogleMapsService.validateCoordinates(lat, lng);
      
      res.json({
        success: true,
        data: {
          isValid,
          coordinates: isValid ? [lng, lat] : null
        }
      });
    } catch (error) {
      logger.error('Error validating coordinates:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to validate coordinates'
      });
    }
  }
);

/**
 * @route   POST /api/maps/calculate-distance
 * @desc    Calculate distance between two points
 * @access  Public
 */
router.post('/calculate-distance',
  [
    body('point1.lat').isFloat({ min: -90, max: 90 }),
    body('point1.lng').isFloat({ min: -180, max: 180 }),
    body('point2.lat').isFloat({ min: -90, max: 90 }),
    body('point2.lng').isFloat({ min: -180, max: 180 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { point1, point2 } = req.body;
      
      const distance = GoogleMapsService.calculateDistance(
        point1.lat, point1.lng,
        point2.lat, point2.lng
      );
      
      res.json({
        success: true,
        data: {
          distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
          unit: 'km'
        }
      });
    } catch (error) {
      logger.error('Error calculating distance:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to calculate distance'
      });
    }
  }
);

module.exports = router;

