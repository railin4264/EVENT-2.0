const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: false,
    maxlength: 2000
  },
  style: {
    backgroundColor: String,
    textColor: String,
    fontSize: String,
    fontFamily: String
  },
  media: [{
    type: {
      type: String,
      enum: ['image', 'video'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    thumbnail: String,
    duration: Number // for videos
  }],
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: false
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: false
    },
    address: String
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
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      enum: ['like', 'love', 'laugh', 'wow', 'sad', 'angry'],
      default: 'like'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  replies: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: {
      type: String,
      required: true,
      maxlength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isDeleted: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
  },
  privacy: {
    type: String,
    enum: ['public', 'friends', 'tribe', 'private'],
    default: 'public'
  },
  tags: [String],
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  poll: {
    question: {
      type: String,
      maxlength: 100
    },
    options: [{
      text: {
        type: String,
        required: true,
        maxlength: 50
      },
      votes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }]
    }]
  }
}, {
  timestamps: true
});

// Index for efficient queries
storySchema.index({ author: 1, createdAt: -1 });
storySchema.index({ expiresAt: 1 });
storySchema.index({ isDeleted: 1 });
storySchema.index({ 'location.coordinates': '2dsphere' });

// Virtual for view count
storySchema.virtual('viewCount').get(function () {
  return this.views.length;
});

// Virtual for reaction count
storySchema.virtual('reactionCount').get(function () {
  return this.reactions.length;
});

// Virtual for reply count
storySchema.virtual('replyCount').get(function () {
  return this.replies.length;
});

// Ensure virtual fields are serialized
storySchema.set('toJSON', { virtuals: true });
storySchema.set('toObject', { virtuals: true });

// Pre-save middleware to handle mentions
storySchema.pre('save', async function (next) {
  if (this.isModified('content') && this.content) {
    // Extract mentions from content (@username)
    const mentionRegex = /@(\w+)/g;
    const usernames = [];
    let match;

    while ((match = mentionRegex.exec(this.content)) !== null) {
      usernames.push(match[1]);
    }

    if (usernames.length > 0) {
      try {
        const User = mongoose.model('User');
        const users = await User.find({ username: { $in: usernames } }, '_id');
        this.mentions = users.map(user => user._id);
      } catch (err) {
        console.error('Error finding mentioned users:', err);
      }
    } else {
      this.mentions = [];
    }
  }
  next();
});

module.exports = mongoose.model('Story', storySchema);




















































































