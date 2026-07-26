const mongoose = require('mongoose');

const tribeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre de la tribu es requerido'],
    trim: true,
    minlength: [3, 'El nombre debe tener al menos 3 caracteres'],
    maxlength: [100, 'El nombre no puede exceder 100 caracteres'],
    validate: {
      validator: function (v) {
        return /^[a-zA-Z0-9\s\u00C0-\u017F\u0400-\u04FF.,!?'-]+$/.test(v);
      },
      message: 'El nombre contiene caracteres inválidos'
    }
  },
  description: {
    type: String,
    required: [true, 'La descripción de la tribu es requerida'],
    trim: true,
    minlength: [10, 'La descripción debe tener al menos 10 caracteres'],
    maxlength: [2000, 'La descripción no puede exceder 2000 caracteres'],
    validate: {
      validator: function (v) {
        return v.trim().length > 0;
      },
      message: 'La descripción no puede estar vacía o contener solo espacios'
    }
  },
  category: {
    type: String,
    required: [true, 'La categoría de la tribu es requerida'],
    enum: [
      'music', 'sports', 'technology', 'tech', 'art', 'design', 'food', 'travel',
      'education', 'business', 'health', 'fitness', 'gaming',
      'reading', 'photography', 'cooking', 'dancing', 'writing',
      'volunteering', 'outdoors', 'fashion', 'networking',
      'professional', 'hobby', 'cultural', 'spiritual', 'other'
    ]
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El creador de la tribu es requerido']
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['member', 'moderator', 'admin'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'banned'],
      default: 'active'
    }
  }],
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    address: String,
    isVirtual: {
      type: Boolean,
      default: false
    }
  },
  avatar: {
    url: String,
    alt: String
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Cada tag no puede exceder 30 caracteres']
  }],
  settings: {
    privacy: {
      type: String,
      enum: ['public', 'private', 'secret'],
      default: 'public'
    },
    membership: {
      type: String,
      enum: ['open', 'approval_required', 'invite_only'],
      default: 'open'
    }
  },
  posts: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: [5000, 'El contenido no puede exceder 5000 caracteres']
    },
    images: [{
      url: String,
      alt: String
    }],
    likes: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    comments: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      content: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  stories: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    media: {
      url: {
        type: String,
        required: true
      },
      type: {
        type: String,
        enum: ['image', 'video'],
        required: true
      },
      thumbnail: String
    },
    duration: {
      type: Number,
      default: 5
    },
    views: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      viewedAt: {
        type: Date,
        default: Date.now
      }
    }],
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400 // 24 hours in seconds - MongoDB TTL index
    }
  }],
  stats: {
    totalMembers: { type: Number, default: 0 },
    totalEvents: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
tribeSchema.index({ location: '2dsphere' });
tribeSchema.index({ creator: 1 });
tribeSchema.index({ category: 1 });
tribeSchema.index({ tags: 1 });
// TTL index for stories is automatically created by the expires field in the schema

// Virtuals
tribeSchema.virtual('membersCount').get(function () {
  return this.members.filter(m => m.status === 'active').length;
});

// Methods
tribeSchema.methods.addMember = function (userId, role = 'member') {
  const existingMember = this.members.find(
    m => m.user.toString() === userId.toString()
  );

  if (existingMember) {
    existingMember.role = role;
    existingMember.status = 'active';
  } else {
    this.members.push({
      user: userId,
      role,
      status: 'active'
    });
  }

  this.stats.totalMembers = this.members.filter(
    m => m.status === 'active'
  ).length;
  return this.save();
};

// Static methods
tribeSchema.statics.findNearby = function (coordinates, maxDistance = 10000, limit = 20) {
  return this.find({
    location: {
      $geoWithin: {
        $centerSphere: [coordinates, maxDistance / 6371000]
      }
    },
    isActive: true,
    'settings.privacy': { $ne: 'secret' }
  })
    .populate('creator', 'username firstName lastName avatar')
    .limit(limit)
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('Tribe', tribeSchema);





