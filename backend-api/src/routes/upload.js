const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect: authMiddleware } = require('../middleware/auth');
const { uploadMiddleware } = require('../middleware/upload');
const cloudinaryService = require('../services/cloudinaryService');
const logger = require('../utils/logger');

const router = express.Router();

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Datos de entrada inválidos',
      errors: errors.array(),
    });
  }
  next();
};

// @route   POST /api/upload/avatar
// @desc    Upload user avatar
// @access  Private
router.post('/avatar',
  authMiddleware,
  uploadMiddleware.avatar,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se ha subido ningún archivo',
        });
      }

      let imageData = {
        url: req.file.url,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
      };

      // Upload to Cloudinary if configured
      if (cloudinaryService.isConfiguredProperly()) {
        try {
          const cloudinaryResult = await cloudinaryService.uploadAvatar(
            req.file.path,
            req.user.id
          );
          
          imageData = {
            ...imageData,
            cloudinary_id: cloudinaryResult.public_id,
            url: cloudinaryResult.url,
            width: cloudinaryResult.width,
            height: cloudinaryResult.height,
          };
        } catch (cloudinaryError) {
          logger.error('Cloudinary upload failed, using local file:', cloudinaryError);
        }
      }

      logger.info('POST', '/api/upload/avatar', req.user.id);
      res.status(201).json({
        success: true,
        message: 'Avatar subido exitosamente',
        data: imageData,
      });
    } catch (error) {
      logger.error('POST', '/api/upload/avatar', error, req.user.id);
      res.status(500).json({
        success: false,
        message: 'Error al subir el avatar',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   POST /api/upload/event-images
// @desc    Upload event images
// @access  Private
router.post('/event-images',
  authMiddleware,
  [
    body('eventId').optional().isMongoId().withMessage('ID de evento inválido'),
  ],
  validateRequest,
  uploadMiddleware.eventImages,
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se han subido archivos',
        });
      }

      const { eventId } = req.body;
      const uploadedImages = [];

      // Process each uploaded file
      for (const file of req.files) {
        let imageData = {
          url: file.url,
          filename: file.filename,
          size: file.size,
          mimetype: file.mimetype,
          originalName: file.originalname,
        };

        // Upload to Cloudinary if configured
        if (cloudinaryService.isConfiguredProperly()) {
          try {
            const cloudinaryResult = await cloudinaryService.uploadEventImage(
              file.path,
              eventId
            );
            
            imageData = {
              ...imageData,
              cloudinary_id: cloudinaryResult.public_id,
              url: cloudinaryResult.url,
              width: cloudinaryResult.width,
              height: cloudinaryResult.height,
            };
          } catch (cloudinaryError) {
            logger.error('Cloudinary upload failed for event image:', cloudinaryError);
          }
        }

        uploadedImages.push(imageData);
      }

      logger.info('POST', '/api/upload/event-images', req.user.id);
      res.status(201).json({
        success: true,
        message: `${uploadedImages.length} imágenes subidas exitosamente`,
        data: uploadedImages,
      });
    } catch (error) {
      logger.error('POST', '/api/upload/event-images', error, req.user.id);
      res.status(500).json({
        success: false,
        message: 'Error al subir las imágenes del evento',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   POST /api/upload/tribe-image
// @desc    Upload tribe image
// @access  Private
router.post('/tribe-image',
  authMiddleware,
  [
    body('tribeId').isMongoId().withMessage('ID de tribu inválido'),
  ],
  validateRequest,
  uploadMiddleware.single('tribeImage'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se ha subido ningún archivo',
        });
      }

      const { tribeId } = req.body;

      let imageData = {
        url: req.file.url,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        originalName: req.file.originalname,
      };

      // Upload to Cloudinary if configured
      if (cloudinaryService.isConfiguredProperly()) {
        try {
          const cloudinaryResult = await cloudinaryService.uploadTribeImage(
            req.file.path,
            tribeId
          );
          
          imageData = {
            ...imageData,
            cloudinary_id: cloudinaryResult.public_id,
            url: cloudinaryResult.url,
            width: cloudinaryResult.width,
            height: cloudinaryResult.height,
          };
        } catch (cloudinaryError) {
          logger.error('Cloudinary upload failed for tribe image:', cloudinaryError);
        }
      }

      logger.info('POST', '/api/upload/tribe-image', req.user.id);
      res.status(201).json({
        success: true,
        message: 'Imagen de tribu subida exitosamente',
        data: imageData,
      });
    } catch (error) {
      logger.error('POST', '/api/upload/tribe-image', error, req.user.id);
      res.status(500).json({
        success: false,
        message: 'Error al subir la imagen de la tribu',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   POST /api/upload/post-images
// @desc    Upload post images
// @access  Private
router.post('/post-images',
  authMiddleware,
  [
    body('postId').optional().isMongoId().withMessage('ID de post inválido'),
  ],
  validateRequest,
  uploadMiddleware.array('postImages', 5),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se han subido archivos',
        });
      }

      const postId = req.body.postId || `temp_${Date.now()}`;
      const uploadedImages = [];

      // Process each uploaded file
      for (const file of req.files) {
        let imageData = {
          url: file.url,
          filename: file.filename,
          size: file.size,
          mimetype: file.mimetype,
          originalName: file.originalname,
        };

        // Upload to Cloudinary if configured
        if (cloudinaryService.isConfiguredProperly()) {
          try {
            const cloudinaryResult = await cloudinaryService.uploadPostImages(
              [file.path],
              postId
            );
            
            if (cloudinaryResult && cloudinaryResult.length > 0) {
              imageData = {
                ...imageData,
                cloudinary_id: cloudinaryResult[0].public_id,
                url: cloudinaryResult[0].url,
                width: cloudinaryResult[0].width,
                height: cloudinaryResult[0].height,
              };
            }
          } catch (cloudinaryError) {
            logger.error('Cloudinary upload failed for post image:', cloudinaryError);
          }
        }

        uploadedImages.push(imageData);
      }

      logger.info('POST', '/api/upload/post-images', req.user.id);
      res.status(201).json({
        success: true,
        message: `${uploadedImages.length} imágenes subidas exitosamente`,
        data: uploadedImages,
      });
    } catch (error) {
      logger.error('POST', '/api/upload/post-images', error, req.user.id);
      res.status(500).json({
        success: false,
        message: 'Error al subir las imágenes del post',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   POST /api/upload/files
// @desc    Upload general files
// @access  Private
router.post('/files',
  authMiddleware,
  uploadMiddleware.array('files', 5),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se han subido archivos',
        });
      }

      const uploadedFiles = [];

      // Process each uploaded file
      for (const file of req.files) {
        let fileData = {
          url: file.url,
          filename: file.filename,
          size: file.size,
          mimetype: file.mimetype,
          originalName: file.originalname,
        };

        // Upload to Cloudinary if configured (for supported file types)
        if (cloudinaryService.isConfiguredProperly() && file.mimetype.startsWith('image/')) {
          try {
            const cloudinaryResult = await cloudinaryService.uploadFile(
              file.path,
              { folder: 'general' }
            );
            
            fileData = {
              ...fileData,
              cloudinary_id: cloudinaryResult.public_id,
              url: cloudinaryResult.url,
            };
          } catch (cloudinaryError) {
            logger.error('Cloudinary upload failed for general file:', cloudinaryError);
          }
        }

        uploadedFiles.push(fileData);
      }

      logger.info('POST', '/api/upload/files', req.user.id);
      res.status(201).json({
        success: true,
        message: `${uploadedFiles.length} archivos subidos exitosamente`,
        data: uploadedFiles,
      });
    } catch (error) {
      logger.error('POST', '/api/upload/files', error, req.user.id);
      res.status(500).json({
        success: false,
        message: 'Error al subir los archivos',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   DELETE /api/upload/cloudinary/:publicId
// @desc    Delete file from Cloudinary
// @access  Private
router.delete('/cloudinary/:publicId',
  authMiddleware,
  async (req, res) => {
    try {
      const { publicId } = req.params;

      // Decode the public ID (it might be URL encoded)
      const decodedPublicId = decodeURIComponent(publicId);

      if (req.user.role !== 'admin' && !decodedPublicId.includes(req.user.id)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para eliminar este archivo',
        });
      }

      if (!cloudinaryService.isConfiguredProperly()) {
        return res.status(400).json({
          success: false,
          message: 'Cloudinary no está configurado',
        });
      }
      
      const result = await cloudinaryService.deleteImage(decodedPublicId);

      logger.info('DELETE', `/api/upload/cloudinary/${publicId}`, req.user.id);
      res.json({
        success: true,
        message: 'Archivo eliminado exitosamente',
        data: result,
      });
    } catch (error) {
      logger.error('DELETE', `/api/upload/cloudinary/${req.params.publicId}`, error, req.user.id);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar el archivo',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   GET /api/upload/stats
// @desc    Get upload statistics
// @access  Private (Admin only)
router.get('/stats',
  authMiddleware,
  async (req, res) => {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado',
        });
      }

      const stats = {
        local: {
          enabled: true,
          // You could add local storage statistics here
        },
        cloudinary: {
          enabled: cloudinaryService.isConfiguredProperly(),
        }
      };

      if (cloudinaryService.isConfiguredProperly()) {
        try {
          const cloudinaryStats = await cloudinaryService.getUsageStats();
          stats.cloudinary = {
            ...stats.cloudinary,
            ...cloudinaryStats
          };
        } catch (cloudinaryError) {
          logger.error('Error getting Cloudinary stats:', cloudinaryError);
          stats.cloudinary.error = 'No se pudieron obtener las estadísticas';
        }
      }

      logger.info('GET', '/api/upload/stats', req.user.id);
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('GET', '/api/upload/stats', error, req.user.id);
      res.status(500).json({
        success: false,
        message: 'Error al obtener las estadísticas',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

module.exports = router;

