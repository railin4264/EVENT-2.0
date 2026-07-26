const { body, param, query } = require('express-validator');
const {
  isValidObjectId,
  isValidCoordinates,
  isValidDateRange,
  sanitizeHtml
} = require('../middleware/validation');

/**
 * Validation rules for creating an event
 */
const createEventValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\u00C0-\u017F\u0400-\u04FF.,!?'-]+$/).withMessage('Title contains invalid characters'),

  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters')
    .customSanitizer(sanitizeHtml),

  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn(['music', 'música', 'sports', 'deportes', 'technology', 'tecnologia', 'tecnología',
      'food', 'comida', 'gastronomía', 'art', 'arte', 'business', 'negocios', 'empresarial',
      'education', 'educación', 'educacion', 'other', 'otro'])
    .withMessage('Invalid category'),

  body('date')
    .notEmpty().withMessage('Event date is required')
    .isISO8601().withMessage('Invalid date format')
    .custom((value) => {
      const twoYearsFromNow = new Date();
      twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
      if (new Date(value) > twoYearsFromNow) {
        throw new Error('Event date cannot be more than 2 years in the future');
      }
      return true;
    }),

  body('endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date format')
    .custom(isValidDateRange).withMessage('End date must be after start date'),

  body('location.coordinates')
    .notEmpty().withMessage('Location coordinates are required')
    .custom(isValidCoordinates).withMessage('Invalid coordinates format'),

  body('location.address')
    .trim()
    .notEmpty().withMessage('Location address is required')
    .isLength({ min: 5, max: 200 }).withMessage('Address must be between 5 and 200 characters'),

  body('location.venue')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Venue name cannot exceed 100 characters'),

  body('maxAttendees')
    .optional()
    .isInt({ min: 1, max: 1000000 }).withMessage('Max attendees must be between 1 and 1,000,000'),

  body('price.amount')
    .optional()
    .isFloat({ min: 0, max: 1000000 }).withMessage('Price must be between 0 and 1,000,000')
    .custom((value) => {
      const decimalPlaces = (value.toString().split('.')[1] || '').length;
      if (decimalPlaces > 2) {
        throw new Error('Price can have maximum 2 decimal places');
      }
      return true;
    }),

  body('price.currency')
    .optional()
    .isIn(['USD', 'EUR', 'GBP', 'DOP', 'MXN', 'COP', 'ARS', 'CLP', 'PEN', 'BRL'])
    .withMessage('Invalid currency'),

  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array'),

  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 30 }).withMessage('Each tag cannot exceed 30 characters')
    .matches(/^[a-zA-Z0-9\u00C0-\u017F_-]+$/).withMessage('Tags can only contain letters, numbers, hyphens and underscores'),

  body('isPrivate')
    .optional()
    .isBoolean().withMessage('isPrivate must be a boolean'),

  body('images')
    .optional()
    .isArray().withMessage('Images must be an array')
];

/**
 * Validation rules for updating an event
 */
const updateEventValidation = [
  param('id')
    .custom(isValidObjectId).withMessage('Invalid event ID'),

  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\u00C0-\u017F\u0400-\u04FF.,!?'-]+$/).withMessage('Title contains invalid characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters')
    .customSanitizer(sanitizeHtml),

  body('category')
    .optional()
    .isIn(['music', 'música', 'sports', 'deportes', 'technology', 'tecnologia', 'tecnología',
      'food', 'comida', 'gastronomía', 'art', 'arte', 'business', 'negocios', 'empresarial',
      'education', 'educación', 'educacion', 'other', 'otro'])
    .withMessage('Invalid category'),

  body('date')
    .optional()
    .isISO8601().withMessage('Invalid date format'),

  body('endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date format')
    .custom(isValidDateRange).withMessage('End date must be after start date'),

  body('maxAttendees')
    .optional()
    .isInt({ min: 1, max: 1000000 }).withMessage('Max attendees must be between 1 and 1,000,000'),

  body('price.amount')
    .optional()
    .isFloat({ min: 0, max: 1000000 }).withMessage('Price must be between 0 and 1,000,000'),

  body('price.currency')
    .optional()
    .isIn(['USD', 'EUR', 'GBP', 'DOP', 'MXN', 'COP', 'ARS', 'CLP', 'PEN', 'BRL'])
    .withMessage('Invalid currency'),

  body('status')
    .optional()
    .isIn(['draft', 'published', 'cancelled', 'completed', 'expired'])
    .withMessage('Invalid status')
];

/**
 * Validation rules for event ID parameter
 */
const eventIdValidation = [
  param('id')
    .custom(isValidObjectId).withMessage('Invalid event ID')
];

/**
 * Validation rules for query parameters
 */
const getEventsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

  query('category')
    .optional()
    .isIn(['music', 'música', 'sports', 'deportes', 'technology', 'tecnologia', 'tecnología',
      'food', 'comida', 'gastronomía', 'art', 'arte', 'business', 'negocios', 'empresarial',
      'education', 'educación', 'educacion', 'other', 'otro'])
    .withMessage('Invalid category'),

  query('lat')
    .optional()
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),

  query('lng')
    .optional()
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),

  query('radius')
    .optional()
    .isFloat({ min: 0.1, max: 100 }).withMessage('Radius must be between 0.1 and 100 km'),

  query('priceMin')
    .optional()
    .isFloat({ min: 0 }).withMessage('Minimum price must be non-negative'),

  query('priceMax')
    .optional()
    .isFloat({ min: 0 }).withMessage('Maximum price must be non-negative'),

  query('status')
    .optional()
    .isIn(['draft', 'published', 'cancelled', 'completed', 'expired'])
    .withMessage('Invalid status')
];

/**
 * Validation rules for adding a comment
 */
const addCommentValidation = [
  param('id')
    .custom(isValidObjectId).withMessage('Invalid event ID'),

  body('text')
    .trim()
    .notEmpty().withMessage('Comment text is required')
    .isLength({ min: 1, max: 500 }).withMessage('Comment must be between 1 and 500 characters')
    .customSanitizer(sanitizeHtml)
];

module.exports = {
  createEventValidation,
  updateEventValidation,
  eventIdValidation,
  getEventsValidation,
  addCommentValidation
};
