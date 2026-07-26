const { body, param, query } = require('express-validator');
const {
  isValidObjectId,
  sanitizeHtml
} = require('../middleware/validation');

/**
 * Validation rules for creating a post
 */
const createPostValidation = [
  body('content')
    .trim()
    .notEmpty().withMessage('Post content is required')
    .isLength({ min: 1, max: 1000 }).withMessage('Content must be between 1 and 1000 characters')
    .custom((value) => {
      if (value.trim().length === 0) {
        throw new Error('Content cannot be empty or just whitespace');
      }
      return true;
    })
    .customSanitizer(sanitizeHtml),

  body('type')
    .optional()
    .isIn(['event_share', 'connection', 'tribe_join', 'event_review', 'networking', 'general', 'achievement', 'text'])
    .withMessage('Invalid post type'),

  body('visibility')
    .optional()
    .isIn(['public', 'friends', 'tribe', 'private'])
    .withMessage('Invalid visibility setting'),

  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array'),

  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 30 }).withMessage('Each tag cannot exceed 30 characters')
    .matches(/^[a-zA-Z0-9\u00C0-\u017F_-]+$/).withMessage('Tags can only contain letters, numbers, hyphens and underscores'),

  body('eventId')
    .optional()
    .custom(isValidObjectId).withMessage('Invalid event ID'),

  body('tribeId')
    .optional()
    .custom(isValidObjectId).withMessage('Invalid tribe ID'),

  body('images')
    .optional()
    .isArray().withMessage('Images must be an array')
];

/**
 * Validation rules for updating a post
 */
const updatePostValidation = [
  param('id')
    .custom(isValidObjectId).withMessage('Invalid post ID'),

  body('content')
    .optional()
    .trim()
    .isLength({ min: 1, max: 1000 }).withMessage('Content must be between 1 and 1000 characters')
    .customSanitizer(sanitizeHtml),

  body('visibility')
    .optional()
    .isIn(['public', 'friends', 'tribe', 'private'])
    .withMessage('Invalid visibility setting'),

  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array')
];

/**
 * Validation rules for adding a comment to a post
 */
const addCommentValidation = [
  param('id')
    .custom(isValidObjectId).withMessage('Invalid post ID'),

  body('content')
    .trim()
    .notEmpty().withMessage('Comment content is required')
    .isLength({ min: 1, max: 300 }).withMessage('Comment must be between 1 and 300 characters')
    .customSanitizer(sanitizeHtml)
];

/**
 * Validation rules for getting posts
 */
const getPostsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

  query('type')
    .optional()
    .isIn(['trending', 'conexiones', 'tribus', 'eventos', 'todos', 'event_share', 'connection', 'tribe_join', 'general'])
    .withMessage('Invalid post type filter')
];

/**
 * Validation rules for post ID parameter
 */
const postIdValidation = [
  param('id')
    .custom(isValidObjectId).withMessage('Invalid post ID')
];

module.exports = {
  createPostValidation,
  updatePostValidation,
  addCommentValidation,
  getPostsValidation,
  postIdValidation
};
