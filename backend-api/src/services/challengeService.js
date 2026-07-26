const Challenge = require('../models/Challenge');
const UserChallenge = require('../models/UserChallenge');
const User = require('../models/User');
const logger = require('../utils/logger');

class ChallengeService {
  constructor(gamificationService = null, notificationService = null) {
    this.gamificationService = gamificationService;
    this.notificationService = notificationService;
  }

  /**
   * Get active challenges for a user
   * @param {string} userId - User ID
   * @param {string} type - Challenge type filter (optional)
   * @returns {Promise<Array>} Active challenges with user progress
   */
  async getUserActiveChallenges(userId, type = null) {
    try {
      // Get active challenges
      const challengesQuery = type ?
        Challenge.getChallengesByType(type) :
        Challenge.getActiveChallenges();

      const activeChallenges = await challengesQuery;

      // Get user's progress on these challenges
      const userChallenges = await UserChallenge.find({
        user: userId,
        challengeId: { $in: activeChallenges.map(c => c.id) }
      });

      const userChallengeMap = userChallenges.reduce((map, uc) => {
        map[uc.challengeId] = uc;
        return map;
      }, {});

      // Combine challenge data with user progress
      const enrichedChallenges = activeChallenges.map(challenge => {
        const userProgress = userChallengeMap[challenge.id];
        return {
          ...challenge.toObject(),
          userProgress: userProgress ? {
            id: userProgress._id,
            progress: userProgress.progress,
            isCompleted: userProgress.isCompleted,
            isExpired: userProgress.isExpired,
            startedAt: userProgress.startedAt,
            completedAt: userProgress.completedAt,
            expiresAt: userProgress.expiresAt,
          } : null,
          isEnrolled: !!userProgress,
          timeRemaining: this.calculateTimeRemaining(challenge.endDate),
        };
      });

      return enrichedChallenges;
    } catch (error) {
      logger.error('Error getting user active challenges:', error);
      throw error;
    }
  }

  /**
   * Enroll user in a challenge
   * @param {string} userId - User ID
   * @param {string} challengeId - Challenge ID
   * @returns {Promise<Object>} Enrollment result
   */
  async enrollUserInChallenge(userId, challengeId) {
    try {
      const challenge = await Challenge.findOne({ id: challengeId, isActive: true });
      if (!challenge) {
        throw new Error('Challenge not found or inactive');
      }

      if (challenge.isExpired) {
        throw new Error('Challenge has expired');
      }

      const userChallenge = await UserChallenge.enrollUserInChallenge(userId, challenge);
      if (!userChallenge) {
        throw new Error('User is already enrolled in this challenge');
      }

      // Send notification
      if (this.notificationService) {
        await this.notificationService.createSystemNotification(
          userId,
          '🎯 Nuevo Desafío',
          `Te has inscrito en: ${challenge.title}`,
          { challengeId: challenge.id, type: challenge.type },
          'normal'
        );
      }

      logger.info(`User ${userId} enrolled in challenge: ${challengeId}`);

      return {
        success: true,
        userChallenge: await UserChallenge.findById(userChallenge._id).populate('challenge'),
      };
    } catch (error) {
      logger.error('Error enrolling user in challenge:', error);
      throw error;
    }
  }

  /**
   * Auto-enroll users in daily and weekly challenges
   * @param {string} userId - User ID (optional, if not provided, enrolls all active users)
   * @returns {Promise<Object>} Enrollment result
   */
  async autoEnrollUsersInChallenges(userId = null) {
    try {
      // Get daily and weekly challenges
      const [dailyChallenges, weeklyChallenges] = await Promise.all([
        Challenge.getChallengesByType('daily'),
        Challenge.getChallengesByType('weekly'),
      ]);

      const challengesToEnroll = [...dailyChallenges, ...weeklyChallenges];

      // Get users to enroll
      const users = userId ?
        [await User.findById(userId)] :
        await User.find({ isActive: true }).select('_id');

      let enrollmentCount = 0;
      const errors = [];

      for (const user of users.filter(u => u)) {
        for (const challenge of challengesToEnroll) {
          try {
            const userChallenge = await UserChallenge.enrollUserInChallenge(user._id, challenge);
            if (userChallenge) {
              enrollmentCount++;
            }
          } catch (error) {
            errors.push({ userId: user._id, challengeId: challenge.id, error: error.message });
          }
        }
      }

      logger.info(`Auto-enrolled users in challenges: ${enrollmentCount} enrollments`);

      return {
        success: true,
        enrollmentCount,
        errors: errors.length > 0 ? errors : null,
      };
    } catch (error) {
      logger.error('Error auto-enrolling users in challenges:', error);
      throw error;
    }
  }

  /**
   * Track user action for challenge progress
   * @param {string} userId - User ID
   * @param {string} action - Action performed
   * @param {Object} metadata - Additional action metadata
   * @returns {Promise<Array>} Array of completed challenges
   */
  async trackChallengeAction(userId, action, metadata = {}) {
    try {
      // Get user's active challenges that track this action
      const userChallenges = await UserChallenge.find({
        user: userId,
        isCompleted: false,
        isExpired: false,
      }).populate({
        path: 'challenge',
        match: { 'requirements.action': action, isActive: true },
      });

      const completedChallenges = [];

      for (const userChallenge of userChallenges) {
        if (!userChallenge.challenge) continue;

        const challenge = userChallenge.challenge;
        let progressUpdated = false;

        // Update progress based on challenge requirements
        switch (action) {
        case 'attend_event':
          userChallenge.updateProgress(1);
          progressUpdated = true;
          break;

        case 'connect_user':
          userChallenge.updateProgress(1);
          progressUpdated = true;
          break;

        case 'attend_event_types':
          if (metadata.eventType) {
            userChallenge.addEventType(metadata.eventType);
            progressUpdated = true;
          }
          break;

        case 'attend_event_cities':
          if (metadata.location || metadata.city) {
            userChallenge.addLocation(metadata.location || metadata.city);
            progressUpdated = true;
          }
          break;

        case 'daily_event_streak':
          userChallenge.updateDailyStreak();
          progressUpdated = true;
          break;

        default:
          // Handle custom actions
          userChallenge.updateProgress(1);
          progressUpdated = true;
        }

        if (progressUpdated) {
          await userChallenge.save();

          // Check if challenge was just completed
          if (userChallenge.isCompleted && userChallenge.isModified('isCompleted')) {
            completedChallenges.push(userChallenge);

            // Award rewards
            await this.awardChallengeRewards(userId, userChallenge, challenge);

            // Send completion notification
            if (this.notificationService) {
              await this.notificationService.createSystemNotification(
                userId,
                '🏆 ¡Desafío Completado!',
                `¡Has completado el desafío: ${challenge.title}!`,
                {
                  challengeId: challenge.id,
                  xpAwarded: challenge.rewards.xp,
                  type: challenge.type
                },
                'high'
              );
            }

            logger.info(`User ${userId} completed challenge: ${challenge.title}`);
          }
        }
      }

      return completedChallenges;
    } catch (error) {
      logger.error('Error tracking challenge action:', error);
      throw error;
    }
  }

  /**
   * Award rewards for completed challenge
   * @param {string} userId - User ID
   * @param {Object} userChallenge - User challenge document
   * @param {Object} challenge - Challenge document
   * @returns {Promise<Object>} Reward result
   */
  async awardChallengeRewards(userId, userChallenge, challenge) {
    try {
      const rewards = challenge.rewards;

      // Award XP
      if (rewards.xp > 0) {
        if (this.gamificationService) {
          await this.gamificationService.awardXP(userId, rewards.xp, 'challenge');
        }
        userChallenge.rewardsAwarded.xp = rewards.xp;
      }

      // Award badges
      if (rewards.badge) {
        userChallenge.rewardsAwarded.badges.push(rewards.badge);
      }

      // Award items
      if (rewards.items && rewards.items.length > 0) {
        userChallenge.rewardsAwarded.items.push(...rewards.items);
      }

      await userChallenge.save();

      logger.info(`Awarded rewards for challenge ${challenge.id} to user ${userId}:`, rewards);

      return {
        success: true,
        rewards: userChallenge.rewardsAwarded,
      };
    } catch (error) {
      logger.error('Error awarding challenge rewards:', error);
      throw error;
    }
  }

  /**
   * Get user challenge statistics
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Challenge statistics
   */
  async getUserChallengeStats(userId) {
    try {
      const stats = await UserChallenge.getUserChallengeStats(userId);
      return stats[0] || {
        totalChallenges: 0,
        completedChallenges: 0,
        expiredChallenges: 0,
        activeChallenges: 0,
        totalXPEarned: 0,
        completionRate: 0,
        typeStats: [],
        difficultyStats: [],
      };
    } catch (error) {
      logger.error('Error getting user challenge stats:', error);
      throw error;
    }
  }

  /**
   * Create new challenge (admin only)
   * @param {Object} challengeData - Challenge data
   * @returns {Promise<Object>} Created challenge
   */
  async createChallenge(challengeData) {
    try {
      const challenge = new Challenge(challengeData);
      await challenge.save();

      logger.info(`New challenge created: ${challenge.title} (${challenge.id})`);

      return {
        success: true,
        challenge,
      };
    } catch (error) {
      logger.error('Error creating challenge:', error);
      throw error;
    }
  }

  /**
   * Expire old challenges and create new ones
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupExpiredChallenges() {
    try {
      // Mark expired user challenges
      const expiredUserChallenges = await UserChallenge.getExpiredChallenges();
      let expiredCount = 0;

      for (const userChallenge of expiredUserChallenges) {
        userChallenge.markExpired();
        await userChallenge.save();
        expiredCount++;
      }

      // Get expired system challenges
      const expiredChallenges = await Challenge.getExpiredChallenges();
      let recreatedCount = 0;

      for (const challenge of expiredChallenges) {
        if (challenge.isRecurring) {
          // Create next instance
          const nextChallenge = challenge.createNextInstance();
          if (nextChallenge) {
            await nextChallenge.save();
            recreatedCount++;
          }
        }

        // Deactivate expired challenge
        challenge.isActive = false;
        await challenge.save();
      }

      logger.info(`Challenge cleanup: ${expiredCount} user challenges expired, ${recreatedCount} challenges recreated`);

      return {
        success: true,
        expiredUserChallenges: expiredCount,
        recreatedChallenges: recreatedCount,
      };
    } catch (error) {
      logger.error('Error cleaning up expired challenges:', error);
      throw error;
    }
  }

  /**
   * Calculate time remaining for a challenge
   * @param {Date} endDate - Challenge end date
   * @returns {Object} Time remaining object
   */
  calculateTimeRemaining(endDate) {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end - now;

    if (diff <= 0) {
      return { expired: true, totalSeconds: 0 };
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / (24 * 60 * 60));
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = totalSeconds % 60;

    return {
      expired: false,
      totalSeconds,
      days,
      hours,
      minutes,
      seconds,
      display: this.formatTimeRemaining(days, hours, minutes),
    };
  }

  /**
   * Format time remaining for display
   * @param {number} days - Days remaining
   * @param {number} hours - Hours remaining
   * @param {number} minutes - Minutes remaining
   * @returns {string} Formatted time string
   */
  formatTimeRemaining(days, hours, minutes) {
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Initialize default challenges
   * @returns {Promise<Object>} Initialization result
   */
  async initializeDefaultChallenges() {
    try {
      await Challenge.initializeDefaults();

      logger.info('Default challenges initialized successfully');

      return {
        success: true,
        message: 'Default challenges initialized',
      };
    } catch (error) {
      logger.error('Error initializing default challenges:', error);
      throw error;
    }
  }

  /**
   * Set gamification service
   * @param {Object} gamificationService - Gamification service instance
   */
  setGamificationService(gamificationService) {
    this.gamificationService = gamificationService;
  }

  /**
   * Set notification service
   * @param {Object} notificationService - Notification service instance
   */
  setNotificationService(notificationService) {
    this.notificationService = notificationService;
  }
}

module.exports = ChallengeService;