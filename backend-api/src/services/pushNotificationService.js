const admin = require('firebase-admin');
const Notification = require('../models/Notification');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/advancedLogger');

class PushNotificationService {
  /**
   * Envía una notificación push a un usuario específico
   */
  async sendPushToUser(userId, notification) {
    try {
      // 1. Buscar tokens FCM del usuario en la base de datos
      const User = require('../models/User');
      const user = await User.findById(userId).select('pushTokens deviceTokens');

      if (!user || !user.pushTokens || user.pushTokens.length === 0) {
        logger.warn(`Usuario ${userId} no tiene tokens de push`);
        return { success: false, reason: 'no_tokens' };
      }

      // 2. Construir el mensaje de notificación
      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl || undefined,
        },
        data: {
          notificationId: notification._id ? notification._id.toString() : '',
          type: notification.type || 'general',
          relatedId: notification.relatedId?.toString() || '',
          url: notification.url || '',
        },
        tokens: user.pushTokens, // Enviar a todos los dispositivos del usuario
      };

      // 3. Verificar que Firebase esté inicializado
      if (!admin.apps.length) {
        logger.warn('Firebase no está inicializado, saltando envío de push');
        return { success: false, reason: 'firebase_not_initialized' };
      }

      // 4. Enviar mediante Firebase Cloud Messaging
      const response = await admin.messaging().sendMulticast(message);

      // 5. Procesar tokens inválidos
      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(user.pushTokens[idx]);
            logger.error(`Error enviando push a token ${idx}:`, resp.error);
          }
        });

        // Eliminar tokens inválidos de la base de datos
        if (failedTokens.length > 0) {
          await User.findByIdAndUpdate(userId, {
            $pull: { pushTokens: { $in: failedTokens } },
          });
        }
      }

      // 6. Registrar estadísticas en Redis
      const redis = await getRedisClient();
      if (redis) {
        const today = new Date().toISOString().split('T')[0];
        await redis.incr(`push:sent:${today}`);
      }

      logger.info(`Push enviado a usuario ${userId}: ${response.successCount}/${user.pushTokens.length} exitosos`);

      return {
        success: response.successCount > 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error) {
      logger.error('Error en sendPushToUser:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envía notificación push a múltiples usuarios
   */
  async sendPushToMultipleUsers(userIds, notification) {
    const results = await Promise.allSettled(
      userIds.map(userId => this.sendPushToUser(userId, notification))
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    return { total: userIds.length, successful, failed: userIds.length - successful };
  }

  /**
   * Envía notificación a todos los miembros de una tribu
   */
  async sendPushToTribe(tribeId, notification) {
    try {
      const Tribe = require('../models/Tribe');
      const tribe = await Tribe.findById(tribeId).select('members');

      if (!tribe) {
        throw new Error('Tribu no encontrada');
      }

      const memberIds = tribe.members.map(m => m.user.toString());
      return await this.sendPushToMultipleUsers(memberIds, notification);
    } catch (error) {
      logger.error('Error en sendPushToTribe:', error);
      throw error;
    }
  }

  /**
   * Envía notificación a todos los asistentes de un evento
   */
  async sendPushToEventAttendees(eventId, notification) {
    try {
      const Event = require('../models/Event');
      const event = await Event.findById(eventId).select('attendees');

      if (!event) {
        throw new Error('Evento no encontrado');
      }

      const attendeeIds = event.attendees.map(a => a.user.toString());
      return await this.sendPushToMultipleUsers(attendeeIds, notification);
    } catch (error) {
      logger.error('Error en sendPushToEventAttendees:', error);
      throw error;
    }
  }

  /**
   * Envía notificación broadcast (a todos los usuarios activos)
   */
  async sendBroadcastPush(notification, filters = {}) {
    try {
      const User = require('../models/User');

      // Construir query con filtros opcionales
      const query = { pushTokens: { $exists: true, $ne: [] } };

      if (filters.location) {
        query.location = {
          $near: {
            $geometry: filters.location,
            $maxDistance: filters.radius || 50000, // 50km por defecto
          },
        };
      }

      if (filters.interests) {
        query.interests = { $in: filters.interests };
      }

      const users = await User.find(query).select('_id').limit(10000); // Limitar a 10k usuarios
      const userIds = users.map(u => u._id.toString());

      return await this.sendPushToMultipleUsers(userIds, notification);
    } catch (error) {
      logger.error('Error en sendBroadcastPush:', error);
      throw error;
    }
  }

  /**
   * Registra un nuevo token de push para un usuario
   */
  async registerPushToken(userId, token, platform = 'android') {
    try {
      const User = require('../models/User');

      await User.findByIdAndUpdate(userId, {
        $addToSet: { pushTokens: token },
        $set: { [`deviceInfo.${platform}Token`]: token },
      });

      logger.info(`Token de push registrado para usuario ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error registrando token:', error);
      throw error;
    }
  }

  /**
   * Elimina un token de push de un usuario
   */
  async unregisterPushToken(userId, token) {
    try {
      const User = require('../models/User');

      await User.findByIdAndUpdate(userId, {
        $pull: { pushTokens: token },
      });

      logger.info(`Token de push eliminado para usuario ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error eliminando token:', error);
      throw error;
    }
  }

  /**
   * Verifica si Firebase está correctamente configurado
   */
  async testFirebaseConnection() {
    try {
      if (!admin.apps.length) {
        return { success: false, error: 'Firebase no inicializado' };
      }

      await admin.messaging().send({
        topic: 'test',
        notification: {
          title: 'Test',
          body: 'Test notification',
        },
      }, true); // dryRun = true

      logger.info('Firebase Cloud Messaging configurado correctamente');
      return { success: true };
    } catch (error) {
      logger.error('Error en configuración de Firebase:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new PushNotificationService();
