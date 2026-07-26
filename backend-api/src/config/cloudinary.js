const cloudinary = require('cloudinary').v2;

class CloudinaryConfig {
  constructor() {
    this.isConfigured = false;
    this.init();
  }

  init() {
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

        this.isConfigured = true;
        console.log('✅ Cloudinary configured successfully');
      } else {
        console.log('⚠️  Cloudinary not configured - missing environment variables');
      }
    } catch (error) {
      console.error('❌ Error configuring Cloudinary:', error.message);
    }
  }

  async uploadImage(filePath, options = {}) {
    if (!this.isConfigured) {
      throw new Error('Cloudinary is not configured');
    }

    try {
      const defaultOptions = {
        folder: process.env.CLOUDINARY_FOLDER || 'eventconnect',
        resource_type: 'auto',
        quality: 'auto',
        fetch_format: 'auto',
        ...options
      };

      const result = await cloudinary.uploader.upload(filePath, defaultOptions);

      return {
        success: true,
        image: {
          publicId: result.public_id,
          url: result.secure_url,
          width: result.width,
          height: result.height,
          format: result.format,
          size: result.bytes,
          createdAt: result.created_at
        }
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async uploadAvatar(filePath, userId, options = {}) {
    if (!this.isConfigured) {
      throw new Error('Cloudinary is not configured');
    }

    try {
      const avatarOptions = {
        folder: `${process.env.CLOUDINARY_FOLDER || 'eventconnect'}/avatars`,
        public_id: `avatar_${userId}`,
        transformation: [
          { width: 300, height: 300, crop: 'fill', gravity: 'face' },
          { quality: 'auto', fetch_format: 'auto' }
        ],
        ...options
      };

      const result = await cloudinary.uploader.upload(filePath, avatarOptions);

      return {
        success: true,
        avatar: {
          publicId: result.public_id,
          url: result.secure_url,
          width: result.width,
          height: result.height,
          format: result.format,
          size: result.bytes
        }
      };
    } catch (error) {
      console.error('Cloudinary avatar upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async uploadEventImage(filePath, eventId, options = {}) {
    if (!this.isConfigured) {
      throw new Error('Cloudinary is not configured');
    }

    try {
      const eventOptions = {
        folder: `${process.env.CLOUDINARY_FOLDER || 'eventconnect'}/events`,
        public_id: `event_${eventId}_${Date.now()}`,
        transformation: [
          { width: 800, height: 600, crop: 'fill', gravity: 'auto' },
          { quality: 'auto', fetch_format: 'auto' }
        ],
        ...options
      };

      const result = await cloudinary.uploader.upload(filePath, eventOptions);

      return {
        success: true,
        image: {
          publicId: result.public_id,
          url: result.secure_url,
          width: result.width,
          height: result.height,
          format: result.format,
          size: result.bytes
        }
      };
    } catch (error) {
      console.error('Cloudinary event image upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async uploadVideo(filePath, options = {}) {
    if (!this.isConfigured) {
      throw new Error('Cloudinary is not configured');
    }

    try {
      const videoOptions = {
        folder: `${process.env.CLOUDINARY_FOLDER || 'eventconnect'}/videos`,
        resource_type: 'video',
        quality: 'auto',
        ...options
      };

      const result = await cloudinary.uploader.upload(filePath, videoOptions);

      return {
        success: true,
        video: {
          publicId: result.public_id,
          url: result.secure_url,
          width: result.width,
          height: result.height,
          format: result.format,
          size: result.bytes,
          duration: result.duration
        }
      };
    } catch (error) {
      console.error('Cloudinary video upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deleteImage(publicId) {
    if (!this.isConfigured) {
      throw new Error('Cloudinary is not configured');
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId);
      
      return {
        success: result.result === 'ok',
        result: result.result
      };
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deleteMultipleImages(publicIds) {
    if (!this.isConfigured) {
      throw new Error('Cloudinary is not configured');
    }

    try {
      const result = await cloudinary.api.delete_resources(publicIds);
      
      return {
        success: true,
        deleted: result.deleted,
        notFound: result.not_found
      };
    } catch (error) {
      console.error('Cloudinary bulk delete error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  generateImageUrl(publicId, transformations = {}) {
    if (!this.isConfigured) {
      throw new Error('Cloudinary is not configured');
    }

    try {
      const url = cloudinary.url(publicId, {
        secure: true,
        ...transformations
      });

      return {
        success: true,
        url
      };
    } catch (error) {
      console.error('Cloudinary URL generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  generateThumbnailUrl(publicId, width = 300, height = 300) {
    return this.generateImageUrl(publicId, {
      width,
      height,
      crop: 'fill',
      gravity: 'auto',
      quality: 'auto',
      fetch_format: 'auto'
    });
  }

  generateResponsiveUrl(publicId, width) {
    return this.generateImageUrl(publicId, {
      width,
      crop: 'scale',
      quality: 'auto',
      fetch_format: 'auto'
    });
  }

  isCloudinaryConfigured() {
    return this.isConfigured;
  }
}

module.exports = new CloudinaryConfig();
















