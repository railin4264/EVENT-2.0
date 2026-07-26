const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

class CloudinaryService {
  constructor() {
    this.isConfigured = !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    if (!this.isConfigured) {
      logger.warn('Cloudinary not configured. File uploads will be stored locally.');
    } else {
      logger.info('Cloudinary service initialized');
    }
  }

  /**
   * Upload image to Cloudinary
   * @param {string} filePath - Local file path
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result
   */
  async uploadImage(filePath, options = {}) {
    if (!this.isConfigured) {
      throw new Error('Cloudinary not configured');
    }

    try {
      const defaultOptions = {
        resource_type: 'image',
        format: 'auto',
        quality: 'auto:good',
        fetch_format: 'auto',
        ...options
      };

      const result = await cloudinary.uploader.upload(filePath, defaultOptions);

      // Delete local file after successful upload
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      logger.info(`Image uploaded to Cloudinary: ${result.public_id}`);

      return {
        public_id: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        created_at: result.created_at
      };
    } catch (error) {
      logger.error('Error uploading to Cloudinary:', error);
      throw error;
    }
  }

  /**
   * Upload avatar image with specific transformations
   * @param {string} filePath - Local file path
   * @param {string} userId - User ID for folder organization
   * @returns {Promise<Object>} Upload result
   */
  async uploadAvatar(filePath, userId) {
    const options = {
      folder: `avatars/${userId}`,
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ],
      invalidate: true // Invalidate CDN cache
    };

    return this.uploadImage(filePath, options);
  }

  /**
   * Upload event image with optimizations
   * @param {string} filePath - Local file path
   * @param {string} eventId - Event ID for folder organization
   * @returns {Promise<Object>} Upload result
   */
  async uploadEventImage(filePath, eventId) {
    const options = {
      folder: `events/${eventId}`,
      transformation: [
        { width: 1200, height: 800, crop: 'fill' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]
    };

    return this.uploadImage(filePath, options);
  }

  /**
   * Upload tribe image with optimizations
   * @param {string} filePath - Local file path
   * @param {string} tribeId - Tribe ID for folder organization
   * @returns {Promise<Object>} Upload result
   */
  async uploadTribeImage(filePath, tribeId) {
    const options = {
      folder: `tribes/${tribeId}`,
      transformation: [
        { width: 800, height: 600, crop: 'fill' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]
    };

    return this.uploadImage(filePath, options);
  }

  /**
   * Upload story image with optimizations
   * @param {string} filePath - Local file path
   * @param {string} userId - User ID for folder organization
   * @returns {Promise<Object>} Upload result
   */
  async uploadStoryImage(filePath, userId) {
    const options = {
      folder: `stories/${userId}`,
      transformation: [
        { width: 1080, height: 1920, crop: 'limit' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]
    };

    return this.uploadImage(filePath, options);
  }

  /**
   * Upload post images
   * @param {Array} filePaths - Array of local file paths
   * @param {string} postId - Post ID for folder organization
   * @returns {Promise<Array>} Array of upload results
   */
  async uploadPostImages(filePaths, postId) {
    const uploadPromises = filePaths.map(filePath => {
      const options = {
        folder: `posts/${postId}`,
        transformation: [
          { width: 1000, height: 1000, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ]
      };
      return this.uploadImage(filePath, options);
    });

    return Promise.all(uploadPromises);
  }

  /**
   * Upload any file to Cloudinary
   * @param {string} filePath - Local file path
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result
   */
  async uploadFile(filePath, options = {}) {
    if (!this.isConfigured) {
      throw new Error('Cloudinary not configured');
    }

    try {
      const defaultOptions = {
        resource_type: 'auto',
        ...options
      };

      const result = await cloudinary.uploader.upload(filePath, defaultOptions);

      // Delete local file after successful upload
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      logger.info(`File uploaded to Cloudinary: ${result.public_id}`);

      return {
        public_id: result.public_id,
        url: result.secure_url,
        format: result.format,
        bytes: result.bytes,
        resource_type: result.resource_type,
        created_at: result.created_at
      };
    } catch (error) {
      logger.error('Error uploading file to Cloudinary:', error);
      throw error;
    }
  }

  /**
   * Delete image from Cloudinary
   * @param {string} publicId - Cloudinary public ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteImage(publicId) {
    if (!this.isConfigured) {
      throw new Error('Cloudinary not configured');
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId);
      logger.info(`Image deleted from Cloudinary: ${publicId}`);
      return result;
    } catch (error) {
      logger.error('Error deleting from Cloudinary:', error);
      throw error;
    }
  }

  /**
   * Delete multiple images from Cloudinary
   * @param {Array} publicIds - Array of Cloudinary public IDs
   * @returns {Promise<Object>} Deletion result
   */
  async deleteImages(publicIds) {
    if (!this.isConfigured) {
      throw new Error('Cloudinary not configured');
    }

    try {
      const result = await cloudinary.api.delete_resources(publicIds);
      logger.info(`${publicIds.length} images deleted from Cloudinary`);
      return result;
    } catch (error) {
      logger.error('Error deleting images from Cloudinary:', error);
      throw error;
    }
  }

  /**
   * Get optimized image URL with transformations
   * @param {string} publicId - Cloudinary public ID
   * @param {Object} transformations - Transformation options
   * @returns {string} Optimized image URL
   */
  getOptimizedUrl(publicId, transformations = {}) {
    if (!this.isConfigured) {
      return null;
    }

    return cloudinary.url(publicId, {
      secure: true,
      quality: 'auto:good',
      fetch_format: 'auto',
      ...transformations
    });
  }

  /**
   * Generate thumbnail URL
   * @param {string} publicId - Cloudinary public ID
   * @param {number} width - Thumbnail width
   * @param {number} height - Thumbnail height
   * @returns {string} Thumbnail URL
   */
  getThumbnailUrl(publicId, width = 150, height = 150) {
    return this.getOptimizedUrl(publicId, {
      width,
      height,
      crop: 'fill',
      gravity: 'auto'
    });
  }

  /**
   * Clean up old images in a folder
   * @param {string} folderPath - Cloudinary folder path
   * @param {number} maxAgeInDays - Maximum age in days
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupOldImages(folderPath, maxAgeInDays = 30) {
    if (!this.isConfigured) {
      throw new Error('Cloudinary not configured');
    }

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAgeInDays);

      const resources = await cloudinary.api.resources({
        type: 'upload',
        prefix: folderPath,
        max_results: 500
      });

      const oldResources = resources.resources.filter(resource => {
        const createdAt = new Date(resource.created_at);
        return createdAt < cutoffDate;
      });

      if (oldResources.length > 0) {
        const publicIds = oldResources.map(resource => resource.public_id);
        const result = await this.deleteImages(publicIds);
        logger.info(`Cleaned up ${oldResources.length} old images from ${folderPath}`);
        return result;
      }

      logger.info(`No old images found in ${folderPath}`);
      return { deleted: {} };
    } catch (error) {
      logger.error('Error during cleanup:', error);
      throw error;
    }
  }

  /**
   * Get usage statistics
   * @returns {Promise<Object>} Usage statistics
   */
  async getUsageStats() {
    if (!this.isConfigured) {
      throw new Error('Cloudinary not configured');
    }

    try {
      const usage = await cloudinary.api.usage();
      return {
        credits: usage.credits,
        objects: usage.objects,
        bandwidth: usage.bandwidth,
        storage: usage.storage,
        requests: usage.requests,
        derived_resources: usage.derived_resources
      };
    } catch (error) {
      logger.error('Error getting usage stats:', error);
      throw error;
    }
  }

  /**
   * Check if Cloudinary is properly configured
   * @returns {boolean} Configuration status
   */
  isConfiguredProperly() {
    return this.isConfigured;
  }
}

module.exports = new CloudinaryService();

