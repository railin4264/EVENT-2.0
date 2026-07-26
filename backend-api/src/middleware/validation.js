const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Middleware to handle validation errors from express-validator
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));

    logger.warn('Validation failed:', {
      path: req.path,
      method: req.method,
      errors: errorMessages,
      body: req.body,
      query: req.query,
      params: req.params
    });

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages
    });
  }

  next();
};

/**
 * Custom validator for MongoDB ObjectId
 * @param {string} value - Value to validate
 * @returns {boolean} - True if valid ObjectId
 */
const isValidObjectId = (value) => {
  const ObjectId = require('mongoose').Types.ObjectId;
  return ObjectId.isValid(value);
};

/**
 * Custom validator for arrays of ObjectIds
 * @param {Array} value - Array to validate
 * @returns {boolean} - True if all items are valid ObjectIds
 */
const isValidObjectIdArray = (value) => {
  if (!Array.isArray(value)) return false;
  return value.every(id => isValidObjectId(id));
};

/**
 * Custom validator for coordinates [longitude, latitude]
 * @param {Array} value - Coordinates array
 * @returns {boolean} - True if valid coordinates
 */
const isValidCoordinates = (value) => {
  if (!Array.isArray(value) || value.length !== 2) return false;
  const [lng, lat] = value;
  return (
    typeof lng === 'number' && 
    typeof lat === 'number' &&
    lng >= -180 && lng <= 180 &&
    lat >= -90 && lat <= 90
  );
};

/**
 * Custom validator for date ranges
 * @param {string} endDate - End date string
 * @param {Object} options - Options object containing startDate
 * @returns {boolean} - True if end date is after start date
 */
const isValidDateRange = (endDate, { req }) => {
  const startDate = req.body.startDate;
  if (!startDate || !endDate) return true; // Let required validation handle missing dates
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return end > start;
};

/**
 * Custom validator for file types
 * @param {string} mimetype - File mimetype
 * @param {Array} allowedTypes - Array of allowed mimetypes
 * @returns {Function} - Validator function
 */
const isValidFileType = (allowedTypes) => {
  return (mimetype) => {
    return allowedTypes.includes(mimetype);
  };
};

/**
 * Custom validator for URLs
 * @param {string} value - URL to validate
 * @returns {boolean} - True if valid URL
 */
const isValidUrl = (value) => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

/**
 * Custom validator for phone numbers (basic international format)
 * @param {string} value - Phone number to validate
 * @returns {boolean} - True if valid phone number format
 */
const isValidPhoneNumber = (value) => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(value.replace(/[\s-()]/g, ''));
};

/**
 * Custom validator for strong passwords
 * @param {string} value - Password to validate
 * @returns {boolean} - True if password meets requirements
 */
const isStrongPassword = (value) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return strongPasswordRegex.test(value);
};

/**
 * Sanitize HTML content - removes all potentially dangerous HTML
 * Uses a robust approach instead of regex (regex cannot reliably parse HTML)
 * @param {string} value - HTML content to sanitize
 * @returns {string} - Sanitized content
 */
const sanitizeHtml = (value) => {
  if (typeof value !== 'string') return value;
  
  // Remove all HTML tags completely (strip to plain text)
  let sanitized = value
    // Remove script tags and their content
    .replace(/<script\b[^]*?<\/script>/gi, '')
    // Remove style tags and their content
    .replace(/<style\b[^]*?<\/style>/gi, '')
    // Remove all remaining HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove javascript: protocol in any remaining context
    .replace(/javascript\s*:/gi, '')
    // Remove data: protocol (prevents data URI attacks)
    .replace(/data\s*:/gi, '')
    // Remove vbscript: protocol
    .replace(/vbscript\s*:/gi, '')
    // Remove on* event handlers that might survive
    .replace(/on\w+\s*=/gi, '')
    // Decode common HTML entities to prevent double-encoding attacks
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  
  // Second pass: remove any tags that appeared after entity decoding
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  return sanitized.trim();
};

/**
 * Custom validator for pagination parameters
 * @param {number} value - Page or limit value
 * @param {Object} options - Validation options
 * @returns {boolean} - True if valid pagination parameter
 */
const isValidPagination = (value, options = {}) => {
  const { min = 1, max = 100 } = options;
  const num = parseInt(value);
  return !isNaN(num) && num >= min && num <= max;
};

module.exports = {
  validateRequest,
  isValidObjectId,
  isValidObjectIdArray,
  isValidCoordinates,
  isValidDateRange,
  isValidFileType,
  isValidUrl,
  isValidPhoneNumber,
  isStrongPassword,
  sanitizeHtml,
  isValidPagination
};

