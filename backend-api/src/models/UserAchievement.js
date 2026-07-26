const mongoose = require('mongoose');

const userAchievementSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  achievement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Achievement',
    required: true,
  },
  achievementId: {
    type: String,
    required: true,
    index: true,
  },
  unlockedAt: {
    type: Date,
    default: Date.now,
  },
  progress: {
    current: {
      type: Number,
      default: 0,
    },
    target: {
      type: Number,
      required: true,
    },
    percentage: {
      type: Number,
      default: 0,
    },
  },
  isCompleted: {
    type: Boolean,
    default: false,
    index: true,
  },
  xpAwarded: {
    type: Number,
    default: 0,
  },
  // Additional tracking data
  trackingData: {
    streak: {
      current: { type: Number, default: 0 },
      best: { type: Number, default: 0 },
      lastUpdate: Date,
    },
    locations: [String],
    eventTypes: [String],
    connections: [String],
    customData: mongoose.Schema.Types.Mixed,
  },
  metadata: {
    source: {
      type: String,
      enum: ['system', 'manual', 'api'],
      default: 'system',
    },
    notes: String,
  },
}, {
  timestamps: true,
});

// Compound indexes
userAchievementSchema.index({ user: 1, achievementId: 1 }, { unique: true });
userAchievementSchema.index({ user: 1, isCompleted: 1 });
userAchievementSchema.index({ user: 1, unlockedAt: -1 });

// Virtual for progress percentage
userAchievementSchema.virtual('progressPercentage').get(function() {
  if (this.progress.target <= 0) return 0;
  return Math.min(100, (this.progress.current / this.progress.target) * 100);
});

// Methods
userAchievementSchema.methods.updateProgress = function(value, type = 'increment') {
  if (this.isCompleted) return this;

  switch (type) {
  case 'increment':
    this.progress.current += value;
    break;
  case 'set':
    this.progress.current = value;
    break;
  case 'decrement':
    this.progress.current = Math.max(0, this.progress.current - value);
    break;
  }

  this.progress.percentage = this.progressPercentage;

  // Check if achievement is completed
  if (this.progress.current >= this.progress.target && !this.isCompleted) {
    this.isCompleted = true;
    this.unlockedAt = new Date();
  }

  return this;
};

userAchievementSchema.methods.updateStreak = function(increment = true) {
  if (!this.trackingData.streak) {
    this.trackingData.streak = { current: 0, best: 0 };
  }

  if (increment) {
    this.trackingData.streak.current += 1;
    if (this.trackingData.streak.current > this.trackingData.streak.best) {
      this.trackingData.streak.best = this.trackingData.streak.current;
    }
  } else {
    this.trackingData.streak.current = 0;
  }

  this.trackingData.streak.lastUpdate = new Date();
  
  // Update progress if this is a streak-based achievement
  this.updateProgress(this.trackingData.streak.current, 'set');
  
  return this;
};

userAchievementSchema.methods.addLocation = function(location) {
  if (!this.trackingData.locations) {
    this.trackingData.locations = [];
  }
  
  if (!this.trackingData.locations.includes(location)) {
    this.trackingData.locations.push(location);
    this.updateProgress(this.trackingData.locations.length, 'set');
  }
  
  return this;
};

userAchievementSchema.methods.addEventType = function(eventType) {
  if (!this.trackingData.eventTypes) {
    this.trackingData.eventTypes = [];
  }
  
  if (!this.trackingData.eventTypes.includes(eventType)) {
    this.trackingData.eventTypes.push(eventType);
    this.updateProgress(this.trackingData.eventTypes.length, 'set');
  }
  
  return this;
};

userAchievementSchema.methods.addConnection = function(connectionId) {
  if (!this.trackingData.connections) {
    this.trackingData.connections = [];
  }
  
  if (!this.trackingData.connections.includes(connectionId)) {
    this.trackingData.connections.push(connectionId);
    this.updateProgress(this.trackingData.connections.length, 'set');
  }
  
  return this;
};

// Statics
userAchievementSchema.statics.getUserAchievements = function(userId, options = {}) {
  const {
    completed = null,
    category = null,
    rarity = null,
    page = 1,
    limit = 20,
  } = options;

  const filter = { user: userId };
  
  if (completed !== null) {
    filter.isCompleted = completed;
  }

  const skip = (page - 1) * limit;

  const query = this.find(filter)
    .populate({
      path: 'achievement',
      match: {
        ...(category && { category }),
        ...(rarity && { rarity }),
        isActive: true,
      },
    })
    .sort({ unlockedAt: -1 })
    .skip(skip)
    .limit(limit);

  return query;
};

userAchievementSchema.statics.getUserStats = function(userId) {
  return this.aggregate([
    { $match: { user: userId } },
    {
      $lookup: {
        from: 'achievements',
        localField: 'achievement',
        foreignField: '_id',
        as: 'achievementData',
      },
    },
    { $unwind: '$achievementData' },
    {
      $group: {
        _id: null,
        totalAchievements: { $sum: 1 },
        completedAchievements: {
          $sum: { $cond: [{ $eq: ['$isCompleted', true] }, 1, 0] },
        },
        totalXP: {
          $sum: { $cond: [{ $eq: ['$isCompleted', true] }, '$xpAwarded', 0] },
        },
        byCategory: {
          $push: {
            category: '$achievementData.category',
            isCompleted: '$isCompleted',
          },
        },
        byRarity: {
          $push: {
            rarity: '$achievementData.rarity',
            isCompleted: '$isCompleted',
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalAchievements: 1,
        completedAchievements: 1,
        totalXP: 1,
        completionRate: {
          $round: [
            {
              $multiply: [
                { $divide: ['$completedAchievements', '$totalAchievements'] },
                100,
              ],
            },
            1,
          ],
        },
        categoryStats: {
          $reduce: {
            input: '$byCategory',
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                {
                  $arrayToObject: [
                    [
                      {
                        k: '$$this.category',
                        v: {
                          total: {
                            $add: [
                              { $ifNull: [{ $getField: { field: '$$this.category', input: '$$value' } }.total, 0] },
                              1,
                            ],
                          },
                          completed: {
                            $add: [
                              { $ifNull: [{ $getField: { field: '$$this.category', input: '$$value' } }.completed, 0] },
                              { $cond: [{ $eq: ['$$this.isCompleted', true] }, 1, 0] },
                            ],
                          },
                        },
                      },
                    ],
                  ],
                },
              ],
            },
          },
        },
      },
    },
  ]);
};

userAchievementSchema.statics.getRecentUnlocks = function(userId, limit = 5) {
  return this.find({
    user: userId,
    isCompleted: true,
  })
    .populate('achievement')
    .sort({ unlockedAt: -1 })
    .limit(limit);
};

userAchievementSchema.statics.createUserAchievement = async function(userId, achievementData) {
  try {
    const userAchievement = new this({
      user: userId,
      achievement: achievementData._id,
      achievementId: achievementData.id,
      progress: {
        current: 0,
        target: achievementData.requirements.target || 1,
        percentage: 0,
      },
      xpAwarded: achievementData.xpReward || 0,
    });

    await userAchievement.save();
    return userAchievement;
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error - user already has this achievement
      return null;
    }
    throw error;
  }
};

userAchievementSchema.statics.findOrCreateUserAchievement = async function(userId, achievementData) {
  let userAchievement = await this.findOne({
    user: userId,
    achievementId: achievementData.id,
  });

  if (!userAchievement) {
    userAchievement = await this.createUserAchievement(userId, achievementData);
  }

  return userAchievement;
};

module.exports = mongoose.model('UserAchievement', userAchievementSchema);










