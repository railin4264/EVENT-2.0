const xss = require('xss');
const validator = require('validator');
const logger = require('../utils/logger');

/**
 * Sanitize input data to prevent XSS and injection attacks
 */
class InputSanitizer {
  constructor() {
    // Configure XSS options
    this.xssOptions = {
      whiteList: {
        p: [],
        br: [],
        strong: [],
        em: [],
        u: [],
        i: [],
        b: [],
        ul: ['class'],
        ol: ['class'],
        li: ['class'],
        h1: ['class'],
        h2: ['class'],
        h3: ['class'],
        h4: ['class'],
        h5: ['class'],
        h6: ['class'],
        blockquote: ['class'],
        code: ['class'],
        pre: ['class']
      },
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script'],
      allowCommentTag: false
    };
  }

  /**
   * Sanitize a string value
   * @param {string} value - Value to sanitize
   * @param {Object} options - Sanitization options
   * @returns {string} - Sanitized value
   */
  sanitizeString(value, options = {}) {
    if (typeof value !== 'string') return value;

    let sanitized = value;

    // Trim whitespace
    if (options.trim !== false) {
      sanitized = sanitized.trim();
    }

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Normalize unicode
    sanitized = sanitized.normalize('NFC');

    // Escape HTML if not allowing HTML
    if (options.allowHtml === false) {
      sanitized = validator.escape(sanitized);
    } else {
      // Use XSS library for HTML sanitization
      sanitized = xss(sanitized, this.xssOptions);
    }

    // Additional custom sanitization
    if (options.removeEmojis) {
      sanitized = sanitized.replace(/[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f004}\u{1f0cf}\u{1f170}-\u{1f171}\u{1f17e}-\u{1f17f}\u{1f18e}\u{3030}\u{2b50}\u{2b55}\u{2934}-\u{2935}\u{2b05}-\u{2b07}\u{2b1b}-\u{2b1c}\u{3297}\u{3299}\u{303d}\u{00a9}\u{00ae}\u{2122}\u{23f3}\u{24c2}\u{23e9}-\u{23ef}\u{25b6}\u{23f8}-\u{23fa}]/gu, '');
    }

    // Remove excessive whitespace
    if (options.normalizeWhitespace !== false) {
      sanitized = sanitized.replace(/\s+/g, ' ');
    }

    return sanitized;
  }

  /**
   * Sanitize email address
   * @param {string} email - Email to sanitize
   * @returns {string} - Sanitized email
   */
  sanitizeEmail(email) {
    if (typeof email !== 'string') return email;
    return validator.normalizeEmail(email.trim().toLowerCase()) || '';
  }

  /**
   * Sanitize URL
   * @param {string} url - URL to sanitize
   * @returns {string} - Sanitized URL
   */
  sanitizeUrl(url) {
    if (typeof url !== 'string') return url;

    // Remove dangerous protocols
    const sanitized = url.trim();
    if (/^(javascript|data|vbscript):/i.test(sanitized)) {
      return '';
    }

    return sanitized;
  }

  /**
   * Sanitize a filename
   * @param {string} filename - Filename to sanitize
   * @returns {string} - Sanitized filename
   */
  sanitizeFilename(filename) {
    if (typeof filename !== 'string') return filename;

    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
      .substring(0, 255); // Limit length
  }

  /**
   * Sanitize object recursively
   * @param {Object} obj - Object to sanitize
   * @param {Object} options - Sanitization options
   * @returns {Object} - Sanitized object
   */
  sanitizeObject(obj, options = {}) {
    if (obj === null || typeof obj !== 'object') {
      return this.sanitizeString(obj, options);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, options));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key names
      const sanitizedKey = this.sanitizeString(key, { allowHtml: false, trim: true });

      // Skip potentially dangerous keys
      if (/^(__proto__|constructor|prototype)$/i.test(sanitizedKey)) {
        continue;
      }

      // Sanitize values based on field type
      const fieldOptions = this.getFieldOptions(sanitizedKey, options);
      sanitized[sanitizedKey] = this.sanitizeValue(value, fieldOptions);
    }

    return sanitized;
  }

  /**
   * Get field-specific sanitization options
   * @param {string} fieldName - Name of the field
   * @param {Object} globalOptions - Global options
   * @returns {Object} - Field-specific options
   */
  getFieldOptions(fieldName, globalOptions) {
    const fieldOptions = { ...globalOptions };

    // Field-specific rules
    switch (fieldName.toLowerCase()) {
    case 'email':
      fieldOptions.isEmail = true;
      break;
    case 'url':
    case 'website':
    case 'link':
      fieldOptions.isUrl = true;
      break;
    case 'description':
    case 'content':
    case 'body':
      fieldOptions.allowHtml = true;
      break;
    case 'filename':
      fieldOptions.isFilename = true;
      break;
    default:
      fieldOptions.allowHtml = false;
    }

    return fieldOptions;
  }

  /**
   * Sanitize a value based on its type and options
   * @param {*} value - Value to sanitize
   * @param {Object} options - Sanitization options
   * @returns {*} - Sanitized value
   */
  sanitizeValue(value, options) {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      if (options.isEmail) {
        return this.sanitizeEmail(value);
      } else if (options.isUrl) {
        return this.sanitizeUrl(value);
      } else if (options.isFilename) {
        return this.sanitizeFilename(value);
      } else {
        return this.sanitizeString(value, options);
      }
    }

    if (typeof value === 'object') {
      return this.sanitizeObject(value, options);
    }

    return value;
  }
}

// Create singleton instance
const sanitizer = new InputSanitizer();

/**
 * Express middleware for input sanitization
 * @param {Object} options - Sanitization options
 * @returns {Function} - Express middleware function
 */
const sanitizeInput = (options = {}) => {
  return (req, res, next) => {
    try {
      // Sanitize request body
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizer.sanitizeObject(req.body, options);
      }

      // Sanitize query parameters
      if (req.query && typeof req.query === 'object') {
        req.query = sanitizer.sanitizeObject(req.query, {
          ...options,
          allowHtml: false
        });
      }

      // Sanitize URL parameters
      if (req.params && typeof req.params === 'object') {
        req.params = sanitizer.sanitizeObject(req.params, {
          ...options,
          allowHtml: false
        });
      }

      next();
    } catch (error) {
      logger.error('Input sanitization error:', error);
      return res.status(400).json({
        success: false,
        message: 'Invalid input data'
      });
    }
  };
};

/**
 * Strict sanitization for sensitive operations
 */
const sanitizeInputStrict = sanitizeInput({
  allowHtml: false,
  removeEmojis: false,
  normalizeWhitespace: true
});

/**
 * Lenient sanitization for content that may contain HTML
 */
const sanitizeInputLenient = sanitizeInput({
  allowHtml: true,
  removeEmojis: false,
  normalizeWhitespace: false
});

module.exports = {
  sanitizeInput,
  sanitizeInputStrict,
  sanitizeInputLenient,
  InputSanitizer,
  sanitizer
};