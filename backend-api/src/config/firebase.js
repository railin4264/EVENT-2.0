const admin = require('firebase-admin');
const logger = require('../utils/logger');

class FirebaseService {
  constructor() {
    this.app = null;
    this.messaging = null;
    this.initialized = false;
  }

  initialize() {
    try {
      // Check if Firebase credentials are provided
      const serviceAccount = this.getServiceAccount();

      if (!serviceAccount) {
        logger.warn('Firebase service account not configured. Push notifications will be disabled.');
        return false;
      }

      // Initialize Firebase Admin SDK
      this.app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID
      });

      this.messaging = admin.messaging();
      this.initialized = true;

      logger.info('🔥 Firebase Admin SDK initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize Firebase Admin SDK:', error);
      return false;
    }
  }

  getServiceAccount() {
    // Option 1: Load from environment variables (recommended for production)
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      return {
        type: 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
      };
    }

    // Option 2: Load from service account file (development)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      try {
        // eslint-disable-next-line global-require
        const fs = require('fs');
        const path = require('path');
        const resolved = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
        if (!fs.existsSync(resolved)) {
          logger.warn(`Firebase service account file not found at ${resolved}. Push notifications will be disabled.`);
          return null;
        }
        return JSON.parse(fs.readFileSync(resolved, 'utf8'));
      } catch (error) {
        logger.error('Failed to load Firebase service account file:', error);
        return null;
      }
    }

    return null;
  }

  isInitialized() {
    return this.initialized;
  }

  getMessaging() {
    if (!this.initialized) {
      throw new Error('Firebase Admin SDK not initialized');
    }
    return this.messaging;
  }

  // Send push notification to a single device
  async sendToDevice(token, notification, data = {}) {
    if (!this.initialized) {
      logger.warn('Firebase not initialized. Cannot send push notification.');
      return { success: false, error: 'Firebase not initialized' };
    }

    try {
      const message = {
        token: token,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.image
        },
        data: {
          ...data,
          timestamp: new Date().toISOString()
        },
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#6366F1', // EventConnect brand color
            sound: 'default',
            channelId: 'eventconnect_general'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              'content-available': 1
            }
          }
        },
        webpush: {
          notification: {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            vibrate: [200, 100, 200],
            requireInteraction: false
          }
        }
      };

      const response = await this.messaging.send(message);
      logger.info(`Push notification sent successfully: ${response}`);

      return {
        success: true,
        messageId: response,
        token: token
      };
    } catch (error) {
      logger.error('Error sending push notification:', error);

      // Handle token errors
      if (error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered') {
        return {
          success: false,
          error: 'Invalid token',
          shouldRemoveToken: true,
          token: token
        };
      }

      return {
        success: false,
        error: error.message,
        token: token
      };
    }
  }

  // Send push notification to multiple devices
  async sendToDevices(tokens, notification, data = {}) {
    if (!this.initialized) {
      logger.warn('Firebase not initialized. Cannot send push notifications.');
      return { success: false, error: 'Firebase not initialized' };
    }

    if (!Array.isArray(tokens) || tokens.length === 0) {
      return { success: false, error: 'No tokens provided' };
    }

    try {
      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.image
        },
        data: {
          ...data,
          timestamp: new Date().toISOString()
        },
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#6366F1',
            sound: 'default',
            channelId: 'eventconnect_general'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              'content-available': 1
            }
          }
        },
        webpush: {
          notification: {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            vibrate: [200, 100, 200],
            requireInteraction: false
          }
        },
        tokens: tokens
      };

      const response = await this.messaging.sendEachForMulticast(message);

      logger.info(`Batch push notification sent. Success: ${response.successCount}, Failed: ${response.failureCount}`);

      // Handle failed tokens
      const failedTokens = [];
      const tokensToRemove = [];

      if (response.responses) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const token = tokens[idx];
            failedTokens.push({ token, error: resp.error });

            if (resp.error?.code === 'messaging/invalid-registration-token' ||
                resp.error?.code === 'messaging/registration-token-not-registered') {
              tokensToRemove.push(token);
            }
          }
        });
      }

      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
        failedTokens: failedTokens,
        tokensToRemove: tokensToRemove
      };
    } catch (error) {
      logger.error('Error sending batch push notifications:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send to topic (for broadcast messages)
  async sendToTopic(topic, notification, data = {}) {
    if (!this.initialized) {
      logger.warn('Firebase not initialized. Cannot send topic notification.');
      return { success: false, error: 'Firebase not initialized' };
    }

    try {
      const message = {
        topic: topic,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.image
        },
        data: {
          ...data,
          timestamp: new Date().toISOString()
        },
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#6366F1',
            sound: 'default',
            channelId: 'eventconnect_general'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              'content-available': 1
            }
          }
        },
        webpush: {
          notification: {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png'
          }
        }
      };

      const response = await this.messaging.send(message);
      logger.info(`Topic notification sent successfully: ${response}`);

      return {
        success: true,
        messageId: response,
        topic: topic
      };
    } catch (error) {
      logger.error('Error sending topic notification:', error);
      return {
        success: false,
        error: error.message,
        topic: topic
      };
    }
  }

  // Subscribe token to topic
  async subscribeToTopic(tokens, topic) {
    if (!this.initialized) {
      logger.warn('Firebase not initialized. Cannot subscribe to topic.');
      return { success: false, error: 'Firebase not initialized' };
    }

    try {
      const tokensArray = Array.isArray(tokens) ? tokens : [tokens];
      const response = await this.messaging.subscribeToTopic(tokensArray, topic);

      logger.info(`Subscribed ${response.successCount} tokens to topic ${topic}`);

      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
        topic: topic
      };
    } catch (error) {
      logger.error('Error subscribing to topic:', error);
      return {
        success: false,
        error: error.message,
        topic: topic
      };
    }
  }

  // Unsubscribe token from topic
  async unsubscribeFromTopic(tokens, topic) {
    if (!this.initialized) {
      logger.warn('Firebase not initialized. Cannot unsubscribe from topic.');
      return { success: false, error: 'Firebase not initialized' };
    }

    try {
      const tokensArray = Array.isArray(tokens) ? tokens : [tokens];
      const response = await this.messaging.unsubscribeFromTopic(tokensArray, topic);

      logger.info(`Unsubscribed ${response.successCount} tokens from topic ${topic}`);

      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
        topic: topic
      };
    } catch (error) {
      logger.error('Error unsubscribing from topic:', error);
      return {
        success: false,
        error: error.message,
        topic: topic
      };
    }
  }
}

const firebaseService = new FirebaseService();
module.exports = firebaseService;