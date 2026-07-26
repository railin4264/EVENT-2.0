const mongoose = require('mongoose');
const logger = require('../utils/logger');

const challengeSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    maxlength: 100,
  },
  description: {
    type: String,
    required: true,
    maxlength: 500,
  },
  icon: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'special'],
    required: true,
  },
  category: {
    type: String,
    enum: ['event', 'social', 'exploration', 'mastery', 'special'],
    required: true,
  },
  requirements: {
    action: {
      type: String,
      required: true,
    },
    target: {
      type: Number,
      required: true,
      min: 1,
    },
    conditions: {
      eventType: String,
      location: String,
      timeframe: String,
    },
  },
  rewards: {
    xp: {
      type: Number,
      default: 0,
      min: 0,
    },
    badge: String,
    items: [String],
  },
  duration: {
    type: Number, // Duration in hours
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isRecurring: {
    type: Boolean,
    default: true,
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'expert'],
    default: 'easy',
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  tags: [String],
  metadata: {
    type: Map,
    of: String,
  },
}, {
  timestamps: true,
});

// Indexes
challengeSchema.index({ type: 1, isActive: 1 });
challengeSchema.index({ startDate: 1, endDate: 1 });
challengeSchema.index({ 'requirements.action': 1 });

// Virtual for checking if challenge is expired
challengeSchema.virtual('isExpired').get(function() {
  return new Date() > this.endDate;
});

// Virtual for checking if challenge is current
challengeSchema.virtual('isCurrent').get(function() {
  const now = new Date();
  return now >= this.startDate && now <= this.endDate && this.isActive;
});

// Statics
challengeSchema.statics.getActiveChallenges = function() {
  const now = new Date();
  return this.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  }).sort({ type: 1, createdAt: -1 });
};

challengeSchema.statics.getChallengesByType = function(type) {
  const now = new Date();
  return this.find({
    type,
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  }).sort({ createdAt: -1 });
};

challengeSchema.statics.getExpiredChallenges = function() {
  const now = new Date();
  return this.find({
    endDate: { $lt: now },
    isActive: true,
  });
};

// Method to create new instance of recurring challenge
challengeSchema.methods.createNextInstance = function() {
  if (!this.isRecurring) return null;

  const nextChallenge = new this.constructor({
    id: `${this.id}_${Date.now()}`,
    title: this.title,
    description: this.description,
    icon: this.icon,
    type: this.type,
    category: this.category,
    requirements: this.requirements,
    rewards: this.rewards,
    duration: this.duration,
    isActive: true,
    isRecurring: this.isRecurring,
    difficulty: this.difficulty,
    startDate: new Date(),
    endDate: new Date(Date.now() + this.duration * 60 * 60 * 1000),
    createdBy: this.createdBy,
    tags: this.tags,
    metadata: this.metadata,
  });

  return nextChallenge;
};

// Default challenges data
const defaultChallenges = [
  {
    id: 'daily_event_attend',
    title: 'Asiste a un evento hoy',
    description: 'Participa en cualquier evento para completar este desafío diario',
    icon: '🎯',
    type: 'daily',
    category: 'event',
    requirements: {
      action: 'attend_event',
      target: 1,
    },
    rewards: {
      xp: 50,
    },
    duration: 24,
    difficulty: 'easy',
    startDate: new Date(),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
  },
  {
    id: 'daily_social_connect',
    title: 'Conecta con 3 personas',
    description: 'Haz 3 nuevas conexiones sociales hoy',
    icon: '🤝',
    type: 'daily',
    category: 'social',
    requirements: {
      action: 'connect_user',
      target: 3,
    },
    rewards: {
      xp: 75,
    },
    duration: 24,
    difficulty: 'medium',
    startDate: new Date(),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
  },
  {
    id: 'weekly_event_variety',
    title: 'Asiste a 3 tipos de eventos diferentes',
    description: 'Explora la diversidad de eventos esta semana',
    icon: '🌈',
    type: 'weekly',
    category: 'exploration',
    requirements: {
      action: 'attend_event_types',
      target: 3,
    },
    rewards: {
      xp: 200,
      badge: 'explorer_week',
    },
    duration: 168, // 7 days
    difficulty: 'medium',
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'weekly_social_network',
    title: 'Conecta con 20 personas esta semana',
    description: 'Expande tu red de contactos durante esta semana',
    icon: '🌐',
    type: 'weekly',
    category: 'social',
    requirements: {
      action: 'connect_user',
      target: 20,
    },
    rewards: {
      xp: 300,
      badge: 'social_butterfly',
    },
    duration: 168,
    difficulty: 'hard',
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'weekly_event_streak',
    title: 'Mantén una racha de 5 días',
    description: 'Asiste a eventos durante 5 días consecutivos',
    icon: '🔥',
    type: 'weekly',
    category: 'mastery',
    requirements: {
      action: 'daily_event_streak',
      target: 5,
    },
    rewards: {
      xp: 400,
      badge: 'streak_master',
    },
    duration: 168,
    difficulty: 'hard',
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'monthly_event_master',
    title: 'Asiste a 30 eventos este mes',
    description: 'Convierte en un verdadero maestro de eventos',
    icon: '👑',
    type: 'monthly',
    category: 'mastery',
    requirements: {
      action: 'attend_event',
      target: 30,
    },
    rewards: {
      xp: 1000,
      badge: 'monthly_master',
      items: ['exclusive_avatar', 'premium_badge'],
    },
    duration: 720, // 30 days
    difficulty: 'expert',
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  },
];

// Method to initialize default challenges
challengeSchema.statics.initializeDefaults = async function() {
  try {
    for (const challengeData of defaultChallenges) {
      const existingChallenge = await this.findOne({
        id: challengeData.id.split('_')[0] + '_' + challengeData.id.split('_')[1] + '_current'
      });

      if (!existingChallenge) {
        challengeData.id = challengeData.id + '_current';
        await this.create(challengeData);
      }
    }
    logger.info('Default challenges initialized');
  } catch (error) {
    console.error('Error initializing default challenges:', error);
  }
};

module.exports = mongoose.model('Challenge', challengeSchema);