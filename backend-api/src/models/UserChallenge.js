const mongoose = require('mongoose');

const userChallengeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  challenge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge',
    required: true,
  },
  challengeId: {
    type: String,
    required: true,
    index: true,
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
  },
  expiresAt: {
    type: Date,
    required: true,
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
  isExpired: {
    type: Boolean,
    default: false,
  },
  rewardsAwarded: {
    xp: {
      type: Number,
      default: 0,
    },
    items: [String],
    badges: [String],
  },
  // Tracking data for different challenge types
  trackingData: {
    dailyStreak: {
      current: { type: Number, default: 0 },
      lastUpdate: Date,
    },
    eventTypes: [String],
    locations: [String],
    connections: [String],
    customData: mongoose.Schema.Types.Mixed,
  },
  metadata: {
    source: {
      type: String,
      enum: ['auto_enrolled', 'manual_enrolled'],
      default: 'auto_enrolled',
    },
    difficulty: String,
    attempts: { type: Number, default: 1 },
    notes: String,
  },
}, {
  timestamps: true,
});

// Compound indexes
userChallengeSchema.index({ user: 1, challengeId: 1 }, { unique: true });
userChallengeSchema.index({ user: 1, isCompleted: 1 });
userChallengeSchema.index({ user: 1, expiresAt: 1 });
userChallengeSchema.index({ expiresAt: 1, isCompleted: 0 });

// Virtual for progress percentage
userChallengeSchema.virtual('progressPercentage').get(function() {
  if (this.progress.target <= 0) return 0;
  return Math.min(100, (this.progress.current / this.progress.target) * 100);
});

// Virtual for checking if expired
userChallengeSchema.virtual('expired').get(function() {
  return new Date() > this.expiresAt && !this.isCompleted;
});

// Methods
userChallengeSchema.methods.updateProgress = function(value, type = 'increment') {
  if (this.isCompleted || this.isExpired) return this;

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

  // Check if challenge is completed
  if (this.progress.current >= this.progress.target && !this.isCompleted) {
    this.isCompleted = true;
    this.completedAt = new Date();
  }

  return this;
};

userChallengeSchema.methods.addEventType = function(eventType) {
  if (!this.trackingData.eventTypes) {
    this.trackingData.eventTypes = [];
  }

  if (!this.trackingData.eventTypes.includes(eventType)) {
    this.trackingData.eventTypes.push(eventType);
    this.updateProgress(this.trackingData.eventTypes.length, 'set');
  }

  return this;
};

userChallengeSchema.methods.addLocation = function(location) {
  if (!this.trackingData.locations) {
    this.trackingData.locations = [];
  }

  if (!this.trackingData.locations.includes(location)) {
    this.trackingData.locations.push(location);
    this.updateProgress(this.trackingData.locations.length, 'set');
  }

  return this;
};

userChallengeSchema.methods.addConnection = function(connectionId) {
  if (!this.trackingData.connections) {
    this.trackingData.connections = [];
  }

  if (!this.trackingData.connections.includes(connectionId)) {
    this.trackingData.connections.push(connectionId);
    this.updateProgress(this.trackingData.connections.length, 'set');
  }

  return this;
};

userChallengeSchema.methods.updateDailyStreak = function() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (!this.trackingData.dailyStreak) {
    this.trackingData.dailyStreak = { current: 0 };
  }

  const lastUpdate = this.trackingData.dailyStreak.lastUpdate;
  if (!lastUpdate) {
    this.trackingData.dailyStreak.current = 1;
  } else {
    const lastUpdateDate = new Date(lastUpdate.getFullYear(), lastUpdate.getMonth(), lastUpdate.getDate());
    const daysDiff = (today - lastUpdateDate) / (1000 * 60 * 60 * 24);

    if (daysDiff === 1) {
      // Next day, continue streak
      this.trackingData.dailyStreak.current += 1;
    } else if (daysDiff === 0) {
      // Same day, no change
      return this;
    } else {
      // Streak broken, start over
      this.trackingData.dailyStreak.current = 1;
    }
  }

  this.trackingData.dailyStreak.lastUpdate = now;
  this.updateProgress(this.trackingData.dailyStreak.current, 'set');

  return this;
};

userChallengeSchema.methods.markExpired = function() {
  if (!this.isCompleted) {
    this.isExpired = true;
  }
  return this;
};

// Statics
userChallengeSchema.statics.getUserChallenges = function(userId, options = {}) {
  const {
    type = null,
    isCompleted = null,
    includeExpired = false,
    page = 1,
    limit = 20,
  } = options;

  const filter = { user: userId };

  if (isCompleted !== null) {
    filter.isCompleted = isCompleted;
  }

  if (!includeExpired) {
    filter.$or = [
      { isExpired: false },
      { isExpired: { $exists: false } }
    ];
  }

  const skip = (page - 1) * limit;

  return this.find(filter)
    .populate({
      path: 'challenge',
      match: type ? { type } : {},
    })
    .sort({ startedAt: -1 })
    .skip(skip)
    .limit(limit);
};

userChallengeSchema.statics.getActiveChallenges = function(userId) {
  const now = new Date();
  return this.find({
    user: userId,
    isCompleted: false,
    isExpired: false,
    expiresAt: { $gte: now },
  }).populate('challenge');
};

userChallengeSchema.statics.getCompletedChallenges = function(userId, limit = 10) {
  return this.find({
    user: userId,
    isCompleted: true,
  })
    .populate('challenge')
    .sort({ completedAt: -1 })
    .limit(limit);
};

userChallengeSchema.statics.getExpiredChallenges = function(userId = null) {
  const now = new Date();
  const filter = {
    isCompleted: false,
    expiresAt: { $lt: now },
    $or: [
      { isExpired: false },
      { isExpired: { $exists: false } }
    ]
  };

  if (userId) {
    filter.user = userId;
  }

  return this.find(filter).populate('challenge');
};

userChallengeSchema.statics.enrollUserInChallenge = async function(userId, challengeData) {
  try {
    const existing = await this.findOne({
      user: userId,
      challengeId: challengeData.id,
    });

    if (existing) {
      return existing; // Already enrolled
    }

    const userChallenge = new this({
      user: userId,
      challenge: challengeData._id,
      challengeId: challengeData.id,
      expiresAt: challengeData.endDate,
      progress: {
        current: 0,
        target: challengeData.requirements.target,
        percentage: 0,
      },
      metadata: {
        difficulty: challengeData.difficulty,
      },
    });

    await userChallenge.save();
    return userChallenge;
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error - user already enrolled
      return null;
    }
    throw error;
  }
};

userChallengeSchema.statics.getUserChallengeStats = function(userId) {
  return this.aggregate([
    { $match: { user: userId } },
    {
      $lookup: {
        from: 'challenges',
        localField: 'challenge',
        foreignField: '_id',
        as: 'challengeData',
      },
    },
    { $unwind: '$challengeData' },
    {
      $group: {
        _id: null,
        totalChallenges: { $sum: 1 },
        completedChallenges: {
          $sum: { $cond: [{ $eq: ['$isCompleted', true] }, 1, 0] },
        },
        expiredChallenges: {
          $sum: { $cond: [{ $eq: ['$isExpired', true] }, 1, 0] },
        },
        totalXPEarned: {
          $sum: { $cond: [{ $eq: ['$isCompleted', true] }, '$rewardsAwarded.xp', 0] },
        },
        byType: {
          $push: {
            type: '$challengeData.type',
            isCompleted: '$isCompleted',
            isExpired: '$isExpired',
          },
        },
        byDifficulty: {
          $push: {
            difficulty: '$challengeData.difficulty',
            isCompleted: '$isCompleted',
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalChallenges: 1,
        completedChallenges: 1,
        expiredChallenges: 1,
        activeChallenges: { $subtract: ['$totalChallenges', { $add: ['$completedChallenges', '$expiredChallenges'] }] },
        totalXPEarned: 1,
        completionRate: {
          $round: [
            {
              $multiply: [
                { $divide: ['$completedChallenges', '$totalChallenges'] },
                100,
              ],
            },
            1,
          ],
        },
        typeStats: '$byType',
        difficultyStats: '$byDifficulty',
      },
    },
  ]);
};

// Pre-save middleware to check expiration
userChallengeSchema.pre('save', function(next) {
  if (new Date() > this.expiresAt && !this.isCompleted && !this.isExpired) {
    this.isExpired = true;
  }
  next();
});

module.exports = mongoose.model('UserChallenge', userChallengeSchema);