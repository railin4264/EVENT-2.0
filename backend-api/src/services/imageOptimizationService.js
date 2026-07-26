/**
 * Image Optimization Service for EventConnect 2.0
 * Handles image processing, optimization, and CDN management
 */

const sharp = require('sharp');
const cloudinary = require('cloudinary').v2;
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const cacheService = require('./cacheService');

class ImageOptimizationService {
  constructor() {
    this.isCloudinaryConfigured = false;
    this.initializeCloudinary();

    // Image processing configurations
    this.imageConfigs = {
      avatar: {
        sizes: [
          { name: 'thumbnail', width: 64, height: 64 },
          { name: 'small', width: 128, height: 128 },
          { name: 'medium', width: 256, height: 256 },
          { name: 'large', width: 512, height: 512 }
        ],
        quality: 85,
        format: 'webp'
      },
      event: {
        sizes: [
          { name: 'thumbnail', width: 320, height: 180 },
          { name: 'small', width: 640, height: 360 },
          { name: 'medium', width: 1280, height: 720 },
          { name: 'large', width: 1920, height: 1080 }
        ],
        quality: 80,
        format: 'webp'
      },
      story: {
        sizes: [
          { name: 'thumbnail', width: 240, height: 426 },
          { name: 'medium', width: 480, height: 854 },
          { name: 'large', width: 720, height: 1280 }
        ],
        quality: 75,
        format: 'webp'
      },
      general: {
        sizes: [
          { name: 'thumbnail', width: 300, height: 200 },
          { name: 'small', width: 600, height: 400 },
          { name: 'medium', width: 1200, height: 800 },
          { name: 'large', width: 1800, height: 1200 }
        ],
        quality: 80,
        format: 'webp'
      }
    };

    // Maximum file sizes
    this.maxFileSizes = {
      avatar: 5 * 1024 * 1024, // 5MB
      event: 10 * 1024 * 1024, // 10MB
      story: 8 * 1024 * 1024, // 8MB
      general: 15 * 1024 * 1024 // 15MB
    };

    // Supported formats
    this.supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif', 'svg'];
  }

  /**
   * Initialize Cloudinary configuration
   */
  initializeCloudinary() {
    try {
      if (process.env.CLOUDINARY_CLOUD_NAME &&
          process.env.CLOUDINARY_API_KEY &&
          process.env.CLOUDINARY_API_SECRET) {

        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
          secure: true
        });

        this.isCloudinaryConfigured = true;
        logger.info('Cloudinary configured successfully');
      } else {
        logger.warn('Cloudinary not configured - using local storage');
      }
    } catch (error) {
      logger.error('Error configuring Cloudinary:', error);
    }
  }

  /**
   * Validate image file
   * @param {Buffer} buffer - Image buffer
   * @param {string} type - Image type (avatar, event, story, general)
   * @param {string} filename - Original filename
   * @returns {Object} Validation result
   */
  async validateImage(buffer, type = 'general', filename = '') {
    try {
      // Check file size
      const maxSize = this.maxFileSizes[type] || this.maxFileSizes.general;
      if (buffer.length > maxSize) {
        return {
          valid: false,
          error: `File size exceeds maximum allowed size of ${Math.round(maxSize / 1024 / 1024)}MB`
        };
      }

      // Check format
      const metadata = await sharp(buffer).metadata();
      if (!this.supportedFormats.includes(metadata.format.toLowerCase())) {
        return {
          valid: false,
          error: `Unsupported format. Supported formats: ${this.supportedFormats.join(', ')}`
        };
      }

      // Check dimensions for specific types
      if (type === 'avatar') {
        if (metadata.width < 64 || metadata.height < 64) {
          return {
            valid: false,
            error: 'Avatar images must be at least 64x64 pixels'
          };
        }
      }

      return {
        valid: true,
        metadata: {
          format: metadata.format,
          width: metadata.width,
          height: metadata.height,
          size: buffer.length
        }
      };
    } catch (error) {
      logger.error('Error validating image:', error);
      return {
        valid: false,
        error: 'Invalid image file'
      };
    }
  }

  /**
   * Process and optimize image
   * @param {Buffer} buffer - Original image buffer
   * @param {string} type - Image type
   * @param {Object} options - Processing options
   * @returns {Object} Processed images
   */
  async processImage(buffer, type = 'general', options = {}) {
    try {
      const config = this.imageConfigs[type] || this.imageConfigs.general;
      const processedImages = {};

      // Get original metadata
      const metadata = await sharp(buffer).metadata();

      // Process each size variant
      for (const sizeConfig of config.sizes) {
        try {
          let sharpInstance = sharp(buffer);

          // Resize image
          sharpInstance = sharpInstance.resize(sizeConfig.width, sizeConfig.height, {
            fit: 'cover',
            position: 'center'
          });

          // Convert format and optimize
          if (config.format === 'webp') {
            sharpInstance = sharpInstance.webp({
              quality: config.quality,
              effort: 6 // Max compression effort
            });
          } else if (config.format === 'jpeg') {
            sharpInstance = sharpInstance.jpeg({
              quality: config.quality,
              mozjpeg: true
            });
          } else if (config.format === 'png') {
            sharpInstance = sharpInstance.png({
              quality: config.quality,
              compressionLevel: 9
            });
          }

          const processedBuffer = await sharpInstance.toBuffer();

          processedImages[sizeConfig.name] = {
            buffer: processedBuffer,
            width: sizeConfig.width,
            height: sizeConfig.height,
            format: config.format,
            size: processedBuffer.length
          };

          logger.debug(`Processed ${type} image variant: ${sizeConfig.name}`);
        } catch (error) {
          logger.error(`Error processing ${sizeConfig.name} variant:`, error);
        }
      }

      // Calculate compression ratio
      const originalSize = buffer.length;
      const totalOptimizedSize = Object.values(processedImages).reduce(
        (sum, img) => sum + img.size, 0
      );
      const compressionRatio = Math.round((1 - totalOptimizedSize / originalSize) * 100);

      logger.info(`Image processing completed. Compression: ${compressionRatio}%`);

      return {
        success: true,
        images: processedImages,
        metadata: {
          original: {
            width: metadata.width,
            height: metadata.height,
            format: metadata.format,
            size: originalSize
          },
          compressionRatio
        }
      };
    } catch (error) {
      logger.error('Error processing image:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Upload image to Cloudinary
   * @param {Buffer} buffer - Image buffer
   * @param {string} folder - Cloudinary folder
   * @param {Object} options - Upload options
   * @returns {Object} Upload result
   */
  async uploadToCloudinary(buffer, folder = 'eventconnect', options = {}) {
    try {
      if (!this.isCloudinaryConfigured) {
        throw new Error('Cloudinary not configured');
      }

      return new Promise((resolve, reject) => {
        const uploadOptions = {
          folder: `${process.env.CLOUDINARY_FOLDER || 'eventconnect'}/${folder}`,
          resource_type: 'auto',
          quality: 'auto:good',
          fetch_format: 'auto',
          flags: 'progressive',
          ...options
        };

        cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        ).end(buffer);
      });
    } catch (error) {
      logger.error('Error uploading to Cloudinary:', error);
      throw error;
    }
  }

  /**
   * Upload processed images to Cloudinary
   * @param {Object} processedImages - Processed images object
   * @param {string} baseFilename - Base filename
   * @param {string} folder - Cloudinary folder
   * @returns {Object} Upload results
   */
  async uploadProcessedImages(processedImages, baseFilename, folder = 'eventconnect') {
    try {
      const uploadResults = {};

      for (const [sizeName, imageData] of Object.entries(processedImages)) {
        try {
          const filename = `${baseFilename}_${sizeName}`;

          const uploadResult = await this.uploadToCloudinary(
            imageData.buffer,
            folder,
            {
              public_id: filename,
              overwrite: true,
              transformation: [
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
              ]
            }
          );

          uploadResults[sizeName] = {
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            width: uploadResult.width,
            height: uploadResult.height,
            format: uploadResult.format,
            size: uploadResult.bytes
          };

          logger.debug(`Uploaded ${sizeName} variant to Cloudinary`);
        } catch (error) {
          logger.error(`Error uploading ${sizeName} variant:`, error);
        }
      }

      return {
        success: true,
        urls: uploadResults
      };
    } catch (error) {
      logger.error('Error uploading processed images:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Complete image optimization workflow
   * @param {Buffer} buffer - Original image buffer
   * @param {string} type - Image type
   * @param {string} userId - User ID (for folder organization)
   * @param {string} filename - Original filename
   * @returns {Object} Complete optimization result
   */
  async optimizeImage(buffer, type = 'general', userId = null, filename = '') {
    try {
      // Generate unique identifier
      const hash = crypto.createHash('md5').update(buffer).digest('hex');
      const timestamp = Date.now();
      const baseFilename = `${type}_${timestamp}_${hash}`;

      // Check cache first
      const cacheKey = `image_optimization:${hash}`;
      const cachedResult = await cacheService.get(cacheKey);
      if (cachedResult) {
        logger.debug('Returning cached optimization result');
        return cachedResult;
      }

      // Validate image
      const validation = await this.validateImage(buffer, type, filename);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Process image
      const processResult = await this.processImage(buffer, type);
      if (!processResult.success) {
        return processResult;
      }

      let result;

      if (this.isCloudinaryConfigured) {
        // Upload to Cloudinary
        const folder = userId ? `users/${userId}/${type}` : type;
        const uploadResult = await this.uploadProcessedImages(
          processResult.images,
          baseFilename,
          folder
        );

        if (!uploadResult.success) {
          return uploadResult;
        }

        result = {
          success: true,
          urls: uploadResult.urls,
          metadata: processResult.metadata,
          storage: 'cloudinary'
        };
      } else {
        // Store locally (fallback)
        const localResult = await this.storeImagesLocally(
          processResult.images,
          baseFilename,
          type
        );

        result = {
          success: true,
          urls: localResult.urls,
          metadata: processResult.metadata,
          storage: 'local'
        };
      }

      // Cache result for 1 hour
      await cacheService.set(cacheKey, result, 3600);

      logger.info(`Image optimization completed for ${type} image`);
      return result;
    } catch (error) {
      logger.error('Error in image optimization workflow:', error);
      return {
        success: false,
        error: 'Image optimization failed'
      };
    }
  }

  /**
   * Store images locally (fallback)
   * @param {Object} processedImages - Processed images
   * @param {string} baseFilename - Base filename
   * @param {string} type - Image type
   * @returns {Object} Local storage result
   */
  async storeImagesLocally(processedImages, baseFilename, type) {
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads', type);
      await fs.mkdir(uploadsDir, { recursive: true });

      const urls = {};

      for (const [sizeName, imageData] of Object.entries(processedImages)) {
        const filename = `${baseFilename}_${sizeName}.${imageData.format}`;
        const filePath = path.join(uploadsDir, filename);

        await fs.writeFile(filePath, imageData.buffer);

        urls[sizeName] = {
          url: `/uploads/${type}/${filename}`,
          width: imageData.width,
          height: imageData.height,
          format: imageData.format,
          size: imageData.size
        };
      }

      return { success: true, urls };
    } catch (error) {
      logger.error('Error storing images locally:', error);
      throw error;
    }
  }

  /**
   * Delete image from Cloudinary
   * @param {string} publicId - Cloudinary public ID
   * @returns {boolean} Success status
   */
  async deleteFromCloudinary(publicId) {
    try {
      if (!this.isCloudinaryConfigured) {
        return false;
      }

      await cloudinary.uploader.destroy(publicId);
      logger.info(`Deleted image from Cloudinary: ${publicId}`);
      return true;
    } catch (error) {
      logger.error('Error deleting image from Cloudinary:', error);
      return false;
    }
  }

  /**
   * Generate responsive image HTML
   * @param {Object} imageUrls - Image URLs object
   * @param {string} alt - Alt text
   * @param {string} className - CSS class
   * @returns {string} HTML string
   */
  generateResponsiveImageHtml(imageUrls, alt = '', className = '') {
    if (!imageUrls || Object.keys(imageUrls).length === 0) {
      return '';
    }

    const sizes = Object.keys(imageUrls).sort((a, b) => {
      const order = ['thumbnail', 'small', 'medium', 'large'];
      return order.indexOf(a) - order.indexOf(b);
    });

    const srcSet = sizes.map(size => {
      const img = imageUrls[size];
      return `${img.url} ${img.width}w`;
    }).join(', ');

    const defaultSrc = imageUrls.medium?.url || imageUrls[sizes[0]]?.url;

    return `<img src="${defaultSrc}" srcset="${srcSet}" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" alt="${alt}" class="${className}" loading="lazy">`;
  }

  /**
   * Get image optimization statistics
   * @returns {Object} Statistics
   */
  async getOptimizationStats() {
    try {
      const stats = {
        cloudinaryConfigured: this.isCloudinaryConfigured,
        supportedFormats: this.supportedFormats,
        imageTypes: Object.keys(this.imageConfigs),
        maxFileSizes: this.maxFileSizes,
        totalProcessed: 0, // This would be tracked separately
        totalSizeReduced: 0 // This would be tracked separately
      };

      return stats;
    } catch (error) {
      logger.error('Error getting optimization stats:', error);
      return null;
    }
  }
}

// Create singleton instance
const imageOptimizationService = new ImageOptimizationService();

module.exports = imageOptimizationService;