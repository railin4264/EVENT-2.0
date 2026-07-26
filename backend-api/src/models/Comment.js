const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  // Support both events and posts
  targetType: {
    type: String,
    enum: ['event', 'post'],
    required: [true, 'Target type is required']
  },
  targetId: {
    type: mongoose.Schema.ObjectId,
    required: [true, 'Target ID is required'],
    refPath: 'targetType'
  },
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Author is required']
  },
  content: {
    type: String,
    required: [true, 'Please add comment content'],
    trim: true,
    maxlength: [500, 'Comment cannot be more than 500 characters']
  },
  // For nested replies
  parentId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Comment',
    default: null
  },
  // Array of reply IDs (for efficient queries)
  replies: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Comment'
  }],
  likes: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  isEdited: {
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

// Create indexes for performance
commentSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
commentSchema.index({ targetType: 1, targetId: 1, parentId: 1 });
commentSchema.index({ author: 1, createdAt: -1 });
commentSchema.index({ parentId: 1 });

// Virtual for likes count
commentSchema.virtual('likesCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

// Virtual for replies count
commentSchema.virtual('repliesCount').get(function() {
  return this.replies ? this.replies.length : 0;
});

// Method to check if user liked the comment
commentSchema.methods.isLikedByUser = function(userId) {
  return this.likes && this.likes.some(id => id.toString() === userId.toString());
};

module.exports = mongoose.model('Comment', commentSchema);
