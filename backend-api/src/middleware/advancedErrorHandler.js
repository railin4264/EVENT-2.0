const logger = require('../utils/advancedLogger');

const advancedErrorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Enhanced error logging
  logger.error('Application Error', {
    message: err.message,
    stack: err.stack,
    name: err.name,
    code: err.code,
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    body: req.method !== 'GET' ? req.body : undefined,
    query: req.query,
    params: req.params
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = {
      statusCode: 404,
      message,
      stack: err.stack,
      path: err.path,
      value: err.value
    };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const duplicateFields = Object.keys(err.keyValue);
    const message = `Duplicate field: ${duplicateFields.join(', ')}`;
    error = {
      statusCode: 400,
      message,
      duplicateFields,
      duplicateValues: err.keyValue
    };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = {
      statusCode: 400,
      message: message.join(', '),
      validationErrors: Object.keys(err.errors).map(field => ({
        field,
        message: err.errors[field].message,
        value: err.errors[field].value
      }))
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = {
      statusCode: 401,
      message
    };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = {
      statusCode: 401,
      message
    };
  }

  // Rate limiting
  if (err.statusCode === 429) {
    error = {
      statusCode: 429,
      message: 'Too many requests, please try again later',
      retryAfter: err.retryAfter || 60
    };
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = {
      statusCode: 413,
      message: 'File size too large',
      maxSize: process.env.MAX_FILE_SIZE || '10MB'
    };
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = {
      statusCode: 400,
      message: 'Unexpected file field',
      field: err.field
    };
  }

  // Default error
  if (!error.statusCode) {
    error.statusCode = 500;
    error.message = 'Internal Server Error';
  }

  // Security: Don't leak error details in production
  const response = {
    success: false,
    message: error.message,
    ...(process.env.NODE_ENV === 'development' && {
      error: error,
      stack: err.stack,
      requestInfo: {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      }
    })
  };

  // Additional response data for specific errors
  if (error.validationErrors) {
    response.validationErrors = error.validationErrors;
  }

  if (error.duplicateFields) {
    response.duplicateFields = error.duplicateFields;
  }

  if (error.retryAfter) {
    res.header('Retry-After', error.retryAfter);
    response.retryAfter = error.retryAfter;
  }

  res.status(error.statusCode).json(response);
};

module.exports = advancedErrorHandler;