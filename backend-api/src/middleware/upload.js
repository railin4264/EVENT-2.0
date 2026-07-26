const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create subdirectories
const subdirectories = ['images', 'files', 'avatars', 'events', 'tribes'];
subdirectories.forEach(dir => {
  const dirPath = path.join(uploadsDir, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = uploadsDir;

    // Determine upload directory based on field name or file type
    if (file.fieldname === 'avatar') {
      uploadPath = path.join(uploadsDir, 'avatars');
    } else if (file.fieldname === 'eventImage') {
      uploadPath = path.join(uploadsDir, 'events');
    } else if (file.fieldname === 'tribeImage') {
      uploadPath = path.join(uploadsDir, 'tribes');
    } else if (file.mimetype.startsWith('image/')) {
      uploadPath = path.join(uploadsDir, 'images');
    } else {
      uploadPath = path.join(uploadsDir, 'files');
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const extension = path.extname(file.originalname);
    const filename = `${file.fieldname}-${uniqueSuffix}${extension}`;
    cb(null, filename);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  try {
    // Define allowed file types
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedDocumentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'application/zip',
      'application/x-zip-compressed'
    ];

    const allAllowedTypes = [...allowedImageTypes, ...allowedDocumentTypes];

    if (allAllowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const error = new Error('Tipo de archivo no permitido');
      error.code = 'INVALID_FILE_TYPE';
      cb(error, false);
    }
  } catch (error) {
    logger.error('Error in file filter:', error);
    cb(error, false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit to match frontend video limit
    files: 5, // Maximum 5 files per request
  }
});

// Middleware for different upload scenarios
const uploadMiddleware = {
  // Single file uploads
  single: (fieldName) => (req, res, next) => {
    const singleUpload = upload.single(fieldName);

    singleUpload(req, res, (err) => {
      if (err) {
        return handleUploadError(err, res);
      }

      if (req.file) {
        req.file.url = getFileUrl(req, req.file);
        logger.info(`File uploaded: ${req.file.filename}`);
      }

      next();
    });
  },

  // Multiple files (same field)
  array: (fieldName, maxCount = 5) => (req, res, next) => {
    const arrayUpload = upload.array(fieldName, maxCount);

    arrayUpload(req, res, (err) => {
      if (err) {
        return handleUploadError(err, res);
      }

      if (req.files && req.files.length > 0) {
        req.files = req.files.map(file => ({
          ...file,
          url: getFileUrl(req, file)
        }));
        logger.info(`${req.files.length} files uploaded`);
      }

      next();
    });
  },

  // Multiple fields with different files
  fields: (fields) => (req, res, next) => {
    const fieldsUpload = upload.fields(fields);

    fieldsUpload(req, res, (err) => {
      if (err) {
        return handleUploadError(err, res);
      }

      // Add URLs to all uploaded files
      if (req.files) {
        Object.keys(req.files).forEach(fieldName => {
          req.files[fieldName] = req.files[fieldName].map(file => ({
            ...file,
            url: getFileUrl(req, file)
          }));
        });
        logger.info('Multiple field files uploaded');
      }

      next();
    });
  },

  // Avatar upload with specific validation
  avatar: (req, res, next) => {
    const avatarUpload = upload.single('avatar');

    avatarUpload(req, res, (err) => {
      if (err) {
        return handleUploadError(err, res);
      }

      if (req.file) {
        // Additional validation for avatars
        if (!req.file.mimetype.startsWith('image/')) {
          return res.status(400).json({
            success: false,
            message: 'El avatar debe ser una imagen'
          });
        }

        req.file.url = getFileUrl(req, req.file);
        logger.info(`Avatar uploaded: ${req.file.filename}`);
      }

      next();
    });
  },

  // Event images with validation
  eventImages: (req, res, next) => {
    const eventImagesUpload = upload.array('eventImages', 5);

    eventImagesUpload(req, res, (err) => {
      if (err) {
        return handleUploadError(err, res);
      }

      if (req.files && req.files.length > 0) {
        // Validate all files are images
        const invalidFiles = req.files.filter(file => !file.mimetype.startsWith('image/'));
        if (invalidFiles.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Todas las imágenes del evento deben ser archivos de imagen'
          });
        }

        req.files = req.files.map(file => ({
          ...file,
          url: getFileUrl(req, file)
        }));
        logger.info(`${req.files.length} event images uploaded`);
      }

      next();
    });
  }
};

// Helper function to generate file URL
const getFileUrl = (req, file) => {
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  const relativePath = file.path.replace(path.join(__dirname, '../../'), '');
  return `${baseUrl}/${relativePath.replace(/\\/g, '/')}`;
};

// Error handling function
const handleUploadError = (err, res) => {
  logger.error('Upload error:', err);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'El archivo es demasiado grande. Tamaño máximo: 10MB',
      error: 'FILE_TOO_LARGE'
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      message: 'Demasiados archivos. Máximo permitido: 5',
      error: 'TOO_MANY_FILES'
    });
  }

  if (err.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      success: false,
      message: 'Tipo de archivo no permitido',
      error: 'INVALID_FILE_TYPE'
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Campo de archivo inesperado',
      error: 'UNEXPECTED_FIELD'
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Error al subir archivo',
    error: process.env.NODE_ENV === 'development' ? err.message : 'UPLOAD_ERROR'
  });
};

// Utility function to delete file
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`File deleted: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error('Error deleting file:', error);
    return false;
  }
};

// Clean up old files (utility function)
const cleanupOldFiles = (directory, maxAgeInDays = 30) => {
  try {
    const files = fs.readdirSync(directory);
    const now = Date.now();
    const maxAge = maxAgeInDays * 24 * 60 * 60 * 1000; // Convert to milliseconds

    files.forEach(file => {
      const filePath = path.join(directory, file);
      const stats = fs.statSync(filePath);

      if (now - stats.mtime.getTime() > maxAge) {
        deleteFile(filePath);
      }
    });

    logger.info(`Cleanup completed for directory: ${directory}`);
  } catch (error) {
    logger.error('Error during cleanup:', error);
  }
};

module.exports = {
  upload,
  uploadMiddleware,
  deleteFile,
  cleanupOldFiles,
  getFileUrl,
  handleUploadError
};

