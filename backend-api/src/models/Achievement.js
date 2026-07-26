const mongoose = require('mongoose');
const logger = require('../utils/logger');

const achievementSchema = new mongoose.Schema({
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
  category: {
    type: String,
    enum: ['event', 'social', 'exploration', 'mastery', 'special'],
    required: true,
  },
  rarity: {
    type: String,
    enum: ['common', 'rare', 'epic', 'legendary'],
    default: 'common',
  },
  xpReward: {
    type: Number,
    default: 0,
    min: 0,
  },
  requirements: {
    type: {
      type: String,
      enum: ['count', 'streak', 'collection', 'custom'],
      default: 'count',
    },
    target: {
      type: Number,
      required: function() {
        return ['count', 'streak'].includes(this.requirements.type);
      },
    },
    action: {
      type: String,
      required: true,
    },
    // Additional conditions
    conditions: {
      timeframe: {
        type: String,
        enum: ['day', 'week', 'month', 'year', 'all_time'],
        default: 'all_time',
      },
      location: String,
      eventType: String,
      tribeCategory: String,
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isSecret: {
    type: Boolean,
    default: false,
  },
  unlockConditions: [{
    achievementId: String,
    level: Number,
    xp: Number,
  }],
  tags: [String],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Indexes
achievementSchema.index({ category: 1, isActive: 1 });
achievementSchema.index({ rarity: 1, isActive: 1 });
achievementSchema.index({ 'requirements.action': 1 });

// Statics
achievementSchema.statics.getActiveAchievements = function() {
  return this.find({ isActive: true }).sort({ category: 1, rarity: 1 });
};

achievementSchema.statics.getAchievementsByCategory = function(category) {
  return this.find({ category, isActive: true }).sort({ rarity: 1 });
};

achievementSchema.statics.getSecretAchievements = function() {
  return this.find({ isSecret: true, isActive: true });
};

// Default achievements data
const defaultAchievements = [
  {
    id: 'first_event',
    title: 'Primer Paso',
    description: 'Asiste a tu primer evento',
    icon: '🎯',
    category: 'event',
    rarity: 'common',
    xpReward: 100,
    requirements: {
      type: 'count',
      target: 1,
      action: 'attend_event',
    },
  },
  {
    id: 'event_enthusiast',
    title: 'Entusiasta de Eventos',
    description: 'Asiste a 10 eventos',
    icon: '🎉',
    category: 'event',
    rarity: 'rare',
    xpReward: 500,
    requirements: {
      type: 'count',
      target: 10,
      action: 'attend_event',
    },
  },
  {
    id: 'event_master',
    title: 'Maestro de Eventos',
    description: 'Asiste a 50 eventos',
    icon: '🏆',
    category: 'event',
    rarity: 'epic',
    xpReward: 2000,
    requirements: {
      type: 'count',
      target: 50,
      action: 'attend_event',
    },
  },
  {
    id: 'socializer',
    title: 'Socializador',
    description: 'Conecta con 100 personas',
    icon: '🤝',
    category: 'social',
    rarity: 'rare',
    xpReward: 750,
    requirements: {
      type: 'count',
      target: 100,
      action: 'connect_user',
    },
  },
  {
    id: 'tribe_founder',
    title: 'Fundador de Tribu',
    description: 'Crea tu primera tribu',
    icon: '👥',
    category: 'social',
    rarity: 'rare',
    xpReward: 500,
    requirements: {
      type: 'count',
      target: 1,
      action: 'create_tribe',
    },
  },
  {
    id: 'explorer',
    title: 'Explorador',
    description: 'Asiste a eventos en 5 ciudades diferentes',
    icon: '🗺️',
    category: 'exploration',
    rarity: 'epic',
    xpReward: 1500,
    requirements: {
      type: 'collection',
      target: 5,
      action: 'attend_event_cities',
    },
  },
  {
    id: 'night_owl',
    title: 'Búho Nocturno',
    description: 'Asiste a 5 eventos nocturnos',
    icon: '🦉',
    category: 'special',
    rarity: 'rare',
    xpReward: 600,
    requirements: {
      type: 'count',
      target: 5,
      action: 'attend_night_event',
    },
  },
  {
    id: 'early_bird',
    title: 'Madrugador',
    description: 'Asiste a 5 eventos matutinos',
    icon: '🐦',
    category: 'special',
    rarity: 'rare',
    xpReward: 600,
    requirements: {
      type: 'count',
      target: 5,
      action: 'attend_morning_event',
    },
  },
  {
    id: 'streak_warrior',
    title: 'Guerrero de Rachas',
    description: 'Mantén una racha de 7 días asistiendo a eventos',
    icon: '🔥',
    category: 'mastery',
    rarity: 'epic',
    xpReward: 1000,
    requirements: {
      type: 'streak',
      target: 7,
      action: 'daily_event_attendance',
    },
  },
  {
    id: 'legendary_networker',
    title: 'Networker Legendario',
    description: 'Conecta con 1000 personas',
    icon: '👑',
    category: 'social',
    rarity: 'legendary',
    xpReward: 5000,
    requirements: {
      type: 'count',
      target: 1000,
      action: 'connect_user',
    },
    isSecret: true,
  },
];

// Method to initialize default achievements
achievementSchema.statics.initializeDefaults = async function() {
  try {
    for (const achievementData of defaultAchievements) {
      await this.findOneAndUpdate(
        { id: achievementData.id },
        achievementData,
        { upsert: true, new: true }
      );
    }
    logger.info('Default achievements initialized');
  } catch (error) {
    console.error('Error initializing default achievements:', error);
  }
};

module.exports = mongoose.model('Achievement', achievementSchema);