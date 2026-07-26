const User = require('../models/User');
const Achievement = require('../models/Achievement');
const UserAchievement = require('../models/UserAchievement');
const logger = require('../utils/logger');

class GamificationService {
  constructor(notificationService = null) {
    this.notificationService = notificationService;
    this.levelThresholds = [
      0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 3800, 4700,
      5700, 6800, 8000, 9300, 10700, 12200, 13800, 15500, 17300,
      19200, 21200, 23300, 25500, 27800, 30200, 32700, 35300, 38000, 40800,
    ];
  }

  /**
   * Calculate user level based on XP
   * @param {number} xp - User's total XP
   * @returns {Object} Level information
   */
  calculateLevel(xp) {
    let level = 1;
    let xpForNextLevel = this.levelThresholds[1];

    for (let i = 0; i < this.levelThresholds.length; i++) {
      if (xp >= this.levelThresholds[i]) {
        level = i + 1;
        xpForNextLevel = this.levelThresholds[i + 1] || this.levelThresholds[i] + 1000;
      } else {
        break;
      }
    }

    const xpForCurrentLevel = this.levelThresholds[level - 1] || 0;
    const xpNeededForNext = xpForNextLevel - xp;
    const progressToNext = ((xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;

    return {
      level,
      xp,
      xpForCurrentLevel,
      xpForNextLevel,
      xpNeededForNext: Math.max(0, xpNeededForNext),
      progressToNext: Math.min(100, Math.max(0, progressToNext)),
    };
  }

  /**
   * Award XP to user and check for level up
   * @param {string} userId - User ID
   * @param {number} xpAmount - XP amount to award
   * @param {string} source - Source of XP (e.g., 'event_attendance', 'achievement')
   * @returns {Promise<Object>} Updated user with level info
   */
  async awardXP(userId, xpAmount, source = 'unknown') {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const oldLevel = this.calculateLevel(user.gamification.totalXP).level;
      
      // Award XP
      user.gamification.totalXP += xpAmount;
      user.gamification.xpHistory.push({
        amount: xpAmount,
        source,
        timestamp: new Date(),
      });

      // Keep only last 100 XP history entries
      if (user.gamification.xpHistory.length > 100) {
        user.gamification.xpHistory = user.gamification.xpHistory.slice(-100);
      }

      const newLevelInfo = this.calculateLevel(user.gamification.totalXP);
      const newLevel = newLevelInfo.level;

      // Check for level up
      if (newLevel > oldLevel) {
        user.gamification.level = newLevel;
        
        // Create level up notification
        if (this.notificationService) {
          await this.notificationService.createSystemNotification(
            userId,
            '🎉 ¡Subiste de nivel!',
            `¡Felicidades! Has alcanzado el nivel ${newLevel}`,
            { oldLevel, newLevel, xpAwarded: xpAmount },
            'normal'
          );
        }

        logger.info(`User ${userId} leveled up from ${oldLevel} to ${newLevel}`);
      }

      await user.save();

      return {
        user,
        levelInfo: newLevelInfo,
        leveledUp: newLevel > oldLevel,
        oldLevel,
        newLevel,
        xpAwarded: xpAmount,
      };
    } catch (error) {
      logger.error('Error awarding XP:', error);
      throw error;
    }
  }

  /**
   * Track user action for achievement progress
   * @param {string} userId - User ID
   * @param {string} action - Action performed
   * @param {Object} metadata - Additional action metadata
   * @returns {Promise<Array>} Array of unlocked achievements
   */
  async trackAction(userId, action, metadata = {}) {
    try {
      // Get all achievements that track this action
      const achievements = await Achievement.find({
        'requirements.action': action,
        isActive: true,
      });

      const unlockedAchievements = [];

      for (const achievement of achievements) {
        const userAchievement = await UserAchievement.findOrCreateUserAchievement(
          userId,
          achievement
        );

        if (!userAchievement || userAchievement.isCompleted) {
          continue;
        }

        let progressUpdated = false;

        // Update progress based on achievement type
        switch (achievement.requirements.type) {
        case 'count':
          userAchievement.updateProgress(1);
          progressUpdated = true;
          break;

        case 'streak':
          if (this.shouldIncrementStreak(userAchievement, metadata)) {
            userAchievement.updateStreak(true);
            progressUpdated = true;
          }
          break;

        case 'collection':
          if (metadata.location) {
            userAchievement.addLocation(metadata.location);
            progressUpdated = true;
          }
          if (metadata.eventType) {
            userAchievement.addEventType(metadata.eventType);
            progressUpdated = true;
          }
          if (metadata.connectionId) {
            userAchievement.addConnection(metadata.connectionId);
            progressUpdated = true;
          }
          break;

        case 'custom':
          // Handle custom achievement logic
          progressUpdated = this.handleCustomAchievement(userAchievement, metadata);
          break;
        }

        if (progressUpdated) {
          await userAchievement.save();

          // Check if achievement was just completed
          if (userAchievement.isCompleted && userAchievement.isModified('isCompleted')) {
            unlockedAchievements.push(userAchievement);

            // Award XP for achievement
            await this.awardXP(userId, achievement.xpReward, 'achievement');

            // Create achievement notification
            if (this.notificationService) {
              await this.notificationService.createAchievementNotification(
                userId,
                achievement.id,
                achievement.title,
                achievement.description
              );
            }

            logger.info(`User ${userId} unlocked achievement: ${achievement.title}`);
          }
        }
      }

      return unlockedAchievements;
    } catch (error) {
      logger.error('Error tracking action:', error);
      throw error;
    }
  }

  /**
   * Get user's gamification profile
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User's gamification profile
   */
  async getUserProfile(userId) {
    try {
      const user = await User.findById(userId).select('gamification firstName lastName username avatar');
      if (!user) {
        throw new Error('User not found');
      }

      // Initialize gamification if it doesn't exist
      if (!user.gamification) {
        user.gamification = {
          totalXP: 0,
          level: 1,
          achievements: []
        };
        await user.save();
      }

      const levelInfo = this.calculateLevel(user.gamification.totalXP || 0);
      
      const [achievementStats, recentAchievements, leaderboardPosition] = await Promise.all([
        UserAchievement.getUserStats(userId),
        UserAchievement.getRecentUnlocks(userId, 5),
        this.getUserLeaderboardPosition(userId),
      ]);

      return {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          avatar: user.avatar,
        },
        levelInfo,
        stats: achievementStats[0] || {
          totalAchievements: 0,
          completedAchievements: 0,
          totalXP: user.gamification.totalXP || 0,
          completionRate: 0,
        },
        recentAchievements,
        leaderboardPosition,
        badges: this.getUserBadges(levelInfo.level, achievementStats[0]),
      };
    } catch (error) {
      logger.error('Error getting user profile:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard
   * @param {string} type - Leaderboard type ('xp', 'level', 'achievements')
   * @param {number} limit - Number of users to return
   * @param {string} timeframe - Timeframe for leaderboard ('all_time', 'monthly', 'weekly')
   * @returns {Promise<Array>} Leaderboard data
   */
  async getLeaderboard(type = 'xp', limit = 20, timeframe = 'all_time') {
    try {
      let sortField;
      
      switch (type) {
      case 'level':
        sortField = { 'gamification.level': -1, 'gamification.totalXP': -1 };
        break;
      case 'achievements':
        // This would require aggregation with UserAchievement collection
        return this.getAchievementLeaderboard(limit);
      case 'xp':
      default:
        sortField = { 'gamification.totalXP': -1 };
      }

      const users = await User.find({
        'gamification.totalXP': { $gt: 0 },
      })
        .select('firstName lastName username avatar gamification')
        .sort(sortField)
        .limit(limit);

      return users.map((user, index) => ({
        rank: index + 1,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          avatar: user.avatar,
        },
        levelInfo: this.calculateLevel(user.gamification.totalXP),
        totalXP: user.gamification.totalXP,
      }));
    } catch (error) {
      logger.error('Error getting leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get achievement leaderboard
   * @param {number} limit - Number of users to return
   * @returns {Promise<Array>} Achievement leaderboard data
   */
  async getAchievementLeaderboard(limit = 20) {
    try {
      const leaderboard = await UserAchievement.aggregate([
        {
          $match: { isCompleted: true },
        },
        {
          $group: {
            _id: '$user',
            completedAchievements: { $sum: 1 },
            totalXP: { $sum: '$xpAwarded' },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userInfo',
          },
        },
        {
          $unwind: '$userInfo',
        },
        {
          $project: {
            user: {
              id: '$_id',
              firstName: '$userInfo.firstName',
              lastName: '$userInfo.lastName',
              username: '$userInfo.username',
              avatar: '$userInfo.avatar',
            },
            completedAchievements: 1,
            totalXP: 1,
          },
        },
        {
          $sort: { completedAchievements: -1, totalXP: -1 },
        },
        {
          $limit: limit,
        },
      ]);

      return leaderboard.map((entry, index) => ({
        rank: index + 1,
        ...entry,
      }));
    } catch (error) {
      logger.error('Error getting achievement leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get user's position in leaderboard
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User's leaderboard position
   */
  async getUserLeaderboardPosition(userId) {
    try {
      const user = await User.findById(userId).select('gamification');
      if (!user) {
        return { rank: null, total: 0 };
      }

      // Initialize gamification if it doesn't exist
      if (!user.gamification) {
        user.gamification = {
          totalXP: 0,
          level: 1,
          achievements: []
        };
        await user.save();
      }

      const userTotalXP = user.gamification.totalXP || 0;

      const rank = await User.countDocuments({
        'gamification.totalXP': { $gt: userTotalXP },
      });

      const total = await User.countDocuments({
        'gamification.totalXP': { $gt: 0 },
      });

      return {
        rank: rank + 1,
        total,
        percentile: total > 0 ? Math.round(((total - rank) / total) * 100) : 0,
      };
    } catch (error) {
      logger.error('Error getting user leaderboard position:', error);
      return { rank: null, total: 0 };
    }
  }

  /**
   * Get user badges based on level and achievements
   * @param {number} level - User level
   * @param {Object} achievementStats - Achievement statistics
   * @returns {Array} Array of badges
   */
  getUserBadges(level, achievementStats = {}) {
    const badges = [];

    // Level badges
    if (level >= 5) badges.push({ id: 'level_5', name: 'Experimentado', icon: '⭐' });
    if (level >= 10) badges.push({ id: 'level_10', name: 'Veterano', icon: '🌟' });
    if (level >= 20) badges.push({ id: 'level_20', name: 'Maestro', icon: '✨' });
    if (level >= 30) badges.push({ id: 'level_30', name: 'Leyenda', icon: '🏆' });

    // Achievement badges
    if (achievementStats.completedAchievements >= 5) {
      badges.push({ id: 'achiever', name: 'Logros', icon: '🎯' });
    }
    if (achievementStats.completedAchievements >= 10) {
      badges.push({ id: 'collector', name: 'Coleccionista', icon: '🏅' });
    }

    // Completion rate badges
    if (achievementStats.completionRate >= 80) {
      badges.push({ id: 'perfectionist', name: 'Perfeccionista', icon: '💎' });
    }

    return badges;
  }

  /**
   * Initialize achievements for a new user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Created user achievements
   */
  async initializeUserAchievements(userId) {
    try {
      const achievements = await Achievement.getActiveAchievements();
      const userAchievements = [];

      for (const achievement of achievements) {
        if (!achievement.isSecret) {
          const userAchievement = await UserAchievement.createUserAchievement(
            userId,
            achievement
          );
          if (userAchievement) {
            userAchievements.push(userAchievement);
          }
        }
      }

      logger.info(`Initialized ${userAchievements.length} achievements for user ${userId}`);
      return userAchievements;
    } catch (error) {
      logger.error('Error initializing user achievements:', error);
      throw error;
    }
  }

  /**
   * Helper method to determine if streak should be incremented
   * @param {Object} userAchievement - User achievement document
   * @param {Object} metadata - Action metadata
   * @returns {boolean} Whether to increment streak
   */
  shouldIncrementStreak(userAchievement, metadata) {
    const lastUpdate = userAchievement.trackingData.streak?.lastUpdate;
    if (!lastUpdate) return true;

    const now = new Date();
    const lastUpdateDate = new Date(lastUpdate);
    const daysDiff = Math.floor((now - lastUpdateDate) / (1000 * 60 * 60 * 24));

    // Increment if it's been at least 1 day since last update
    return daysDiff >= 1;
  }

  /**
   * Handle custom achievement logic
   * @param {Object} userAchievement - User achievement document
   * @param {Object} metadata - Action metadata
   * @returns {boolean} Whether progress was updated
   */
  handleCustomAchievement(userAchievement, metadata) {
    const { achievementId, currentProgress, requiredProgress } = userAchievement;

    if (!metadata || currentProgress >= requiredProgress) return false;

    // Route to specific custom achievement logic by achievementId prefix
    if (achievementId?.startsWith('streak_')) {
      const lastDate = metadata.lastActivityDate ? new Date(metadata.lastActivityDate) : null;
      if (!lastDate) return false;
      const diffMs = Date.now() - lastDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays <= 1;
    }

    if (achievementId?.startsWith('score_')) {
      const score = metadata.score || 0;
      return score > (userAchievement.lastScore || 0);
    }

    // Generic: increment progress by 1 if metadata signals activity
    if (metadata.increment) {
      userAchievement.currentProgress = Math.min(currentProgress + 1, requiredProgress);
      return true;
    }

    return false;
  }

  /**
   * Set notification service
   * @param {Object} notificationService - Notification service instance
   */
  setNotificationService(notificationService) {
    this.notificationService = notificationService;
  }
}

module.exports = GamificationService;

