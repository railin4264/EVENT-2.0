const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['event_share', 'connection', 'tribe_join', 'event_review', 'networking', 'general', 'achievement', 'text'],
    default: 'general'
  },
  content: {
    type: String,
    required: [true, 'Please add post content'],
    trim: true,
    minlength: [1, 'Post content cannot be empty'],
    maxlength: [1000, 'Post cannot be more than 1000 characters'],
    validate: {
      validator: function(v) {
        // Ensure content is not just whitespace
        return v.trim().length > 0;
      },
      message: 'Post content cannot be empty or just whitespace'
    }
  },
  images: [{
    url: String,
    publicId: String
  }],
  eventData: {
    eventId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Event'
    },
    name: String,
    location: String,
    date: String,
    attendees: Number
  },
  tribeData: {
    tribeId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tribe'
    },
    name: String,
    memberCount: Number
  },
  likes: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: [300, 'Comment cannot be more than 300 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  shares: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  visibility: {
    type: String,
    enum: ['public', 'friends', 'tribe', 'private'],
    default: 'public'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Each tag cannot be more than 30 characters'],
    validate: {
      validator: function(v) {
        return /^[a-zA-Z0-9\u00C0-\u017F_-]+$/.test(v);
      },
      message: 'Tags can only contain letters, numbers, hyphens and underscores'
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
    address: String
  },
  isSponsored: {
    type: Boolean,
    default: false
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create indexes
postSchema.index({ user: 1, createdAt: -1 });
postSchema.index({ type: 1, createdAt: -1 });
postSchema.index({ visibility: 1, createdAt: -1 });
postSchema.index({ tags: 1 });
postSchema.index({ location: '2dsphere' });

// Virtual for likes count
postSchema.virtual('likesCount').get(function() {
  return this.likes.length;
});

// Virtual for comments count
postSchema.virtual('commentsCount').get(function() {
  return this.comments.length;
});

// Virtual for shares count
postSchema.virtual('sharesCount').get(function() {
  return this.shares.length;
});

// Method to check if user liked the post (handles both ObjectId[] and [{user}] shapes)
postSchema.methods.isLikedByUser = function(userId) {
  if (!this.likes || !userId) return false;
  const uid = userId.toString();
  return this.likes.some(like => {
    const likeUserId = like && like.user ? like.user.toString() : (like ? like.toString() : null);
    return likeUserId === uid;
  });
};

// Method to check if user shared the post
postSchema.methods.isSharedByUser = function(userId) {
  return this.shares.some(share => share.user.toString() === userId.toString());
};

module.exports = mongoose.model('Post', postSchema);
