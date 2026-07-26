const { body, param, query } = require('express-validator');
const {
  isValidObjectId,
  isValidCoordinates,
  sanitizeHtml
} = require('../middleware/validation');

/**
 * Validation rules for creating a tribe
 */
const createTribeValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Tribe name is required')
    .isLength({ min: 3, max: 100 }).withMessage('Name must be between 3 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\u00C0-\u017F\u0400-\u04FF.,!?'-]+$/).withMessage('Name contains invalid characters'),

  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters')
    .custom((value) => {
      if (value.trim().length === 0) {
        throw new Error('Description cannot be empty or just whitespace');
      }
      return true;
    })
    .customSanitizer(sanitizeHtml),

  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn([
      'music', 'sports', 'technology', 'art', 'food', 'travel',
      'education', 'business', 'health', 'fitness', 'gaming',
      'reading', 'photography', 'cooking', 'dancing', 'writing',
      'volunteering', 'outdoors', 'fashion', 'networking',
      'professional', 'hobby', 'cultural', 'spiritual', 'other'
    ])
    .withMessage('Invalid category'),

  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array'),

  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 30 }).withMessage('Each tag cannot exceed 30 characters')
    .matches(/^[a-zA-Z0-9\u00C0-\u017F_-]+$/).withMessage('Tags can only contain letters, numbers, hyphens and underscores'),

  body('location.coordinates')
    .optional()
    .custom(isValidCoordinates).withMessage('Invalid coordinates format'),

  body('location.address')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Address cannot exceed 200 characters'),

  body('location.isVirtual')
    .optional()
    .isBoolean().withMessage('isVirtual must be a boolean'),

  body('settings.privacy')
    .optional()
    .isIn(['public', 'private', 'secret'])
    .withMessage('Invalid privacy setting'),

  body('settings.membership')
    .optional()
    .isIn(['open', 'approval_required', 'invite_only'])
    .withMessage('Invalid membership setting'),

  body('isPublic')
    .optional()
    .isBoolean().withMessage('isPublic must be a boolean')
];

/**
 * Validation rules for updating a tribe
 */
const updateTribeValidation = [
  param('id')
    .custom(isValidObjectId).withMessage('Invalid tribe ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage('Name must be between 3 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\u00C0-\u017F\u0400-\u04FF.,!?'-]+$/).withMessage('Name contains invalid characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters')
    .customSanitizer(sanitizeHtml),

  body('category')
    .optional()
    .isIn([
      'music', 'sports', 'technology', 'art', 'food', 'travel',
      'education', 'business', 'health', 'fitness', 'gaming',
      'reading', 'photography', 'cooking', 'dancing', 'writing',
      'volunteering', 'outdoors', 'fashion', 'networking',
      'professional', 'hobby', 'cultural', 'spiritual', 'other'
    ])
    .withMessage('Invalid category'),

  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array'),

  body('settings.privacy')
    .optional()
    .isIn(['public', 'private', 'secret'])
    .withMessage('Invalid privacy setting'),

  body('settings.membership')
    .optional()
    .isIn(['open', 'approval_required', 'invite_only'])
    .withMessage('Invalid membership setting')
];

/**
 * Validation rules for tribe posts
 */
const createTribePostValidation = [
  param('id')
    .custom(isValidObjectId).withMessage('Invalid tribe ID'),

  body('content')
    .trim()
    .notEmpty().withMessage('Post content is required')
    .isLength({ min: 1, max: 5000 }).withMessage('Content must be between 1 and 5000 characters')
    .customSanitizer(sanitizeHtml),

  body('images')
    .optional()
    .isArray().withMessage('Images must be an array')
];

/**
 * Validation rules for tribe stories
 */
const createTribeStoryValidation = [
  param('id')
    .custom(isValidObjectId).withMessage('Invalid tribe ID'),

  body('media.url')
    .notEmpty().withMessage('Story media URL is required')
    .isURL().withMessage('Invalid media URL'),

  body('media.type')
    .notEmpty().withMessage('Media type is required')
    .isIn(['image', 'video']).withMessage('Media type must be image or video'),

  body('media.thumbnail')
    .optional()
    .isURL().withMessage('Invalid thumbnail URL'),

  body('duration')
    .optional()
    .isInt({ min: 1, max: 30 }).withMessage('Duration must be between 1 and 30 seconds')
];

/**
 * Validation rules for query parameters
 */
const getTribesValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

  query('category')
    .optional()
    .isIn([
      'music', 'sports', 'technology', 'art', 'food', 'travel',
      'education', 'business', 'health', 'fitness', 'gaming',
      'reading', 'photography', 'cooking', 'dancing', 'writing',
      'volunteering', 'outdoors', 'fashion', 'networking',
      'professional', 'hobby', 'cultural', 'spiritual', 'other'
    ])
    .withMessage('Invalid category'),

  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('Search query must be between 1 and 100 characters')
];

/**
 * Validation rules for tribe ID parameter
 */
const tribeIdValidation = [
  param('id')
    .custom(isValidObjectId).withMessage('Invalid tribe ID')
];

/**
 * Validation rules for tribe post ID parameter
 */
const tribePostIdValidation = [
  param('id')
    .custom(isValidObjectId).withMessage('Invalid tribe ID'),
  param('postId')
    .custom(isValidObjectId).withMessage('Invalid post ID')
];

/**
 * Validation rules for tribe story ID parameter
 */
const tribeStoryIdValidation = [
  param('id')
    .custom(isValidObjectId).withMessage('Invalid tribe ID'),
  param('storyId')
    .custom(isValidObjectId).withMessage('Invalid story ID')
];

module.exports = {
  createTribeValidation,
  updateTribeValidation,
  createTribePostValidation,
  createTribeStoryValidation,
  getTribesValidation,
  tribeIdValidation,
  tribePostIdValidation,
  tribeStoryIdValidation
};
