const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Reporter is required']
  },
  reportedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reportedEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  },
  reportedTribe: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tribe'
  },
  reportedPost: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  reportedComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  },
  type: {
    type: String,
    required: [true, 'Report type is required'],
    enum: [
      'user', 'event', 'tribe', 'post', 'comment', 'message'
    ]
  },
  category: {
    type: String,
    required: [true, 'Report category is required'],
    enum: [
      'spam',
      'harassment',
      'inappropriate_content',
      'fake_profile',
      'violence',
      'hate_speech',
      'sexual_content',
      'misinformation',
      'copyright',
      'fraud',
      'underage',
      'other'
    ]
  },
  reason: {
    type: String,
    required: [true, 'Report reason is required'],
    maxlength: [1000, 'Reason cannot exceed 1000 characters']
  },
  description: {
    type: String,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  evidence: [{
    type: String, // URLs to screenshots or other evidence
    maxlength: [500, 'Evidence URL cannot exceed 500 characters']
  }],
  status: {
    type: String,
    enum: ['pending', 'under_review', 'reviewed', 'reviewing', 'in_review', 'resolved', 'dismissed', 'escalated'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  adminNotes: {
    type: String,
    maxlength: [2000, 'Admin notes cannot exceed 2000 characters']
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  resolution: {
    type: String,
    maxlength: [1000, 'Resolution cannot exceed 1000 characters']
  },
  actionTaken: {
    type: String,
    enum: [
      'none',
      'warning_sent',
      'content_removed',
      'user_suspended',
      'user_banned',
      'event_cancelled',
      'tribe_deleted',
      'post_removed',
      'comment_removed'
    ]
  },
  metadata: {
    reportedAt: { type: Date, default: Date.now },
    ipAddress: String,
    userAgent: String,
    deviceInfo: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
reportSchema.index({ reporter: 1 });
reportSchema.index({ status: 1 });
reportSchema.index({ type: 1 });
reportSchema.index({ category: 1 });
reportSchema.index({ priority: 1 });
reportSchema.index({ createdAt: -1 });

// Compound indexes
reportSchema.index({ status: 1, priority: -1, createdAt: -1 });
reportSchema.index({ type: 1, status: 1 });

// Virtuals
reportSchema.virtual('isActive').get(function() {
  return ['pending', 'under_review', 'reviewed', 'reviewing', 'in_review', 'escalated'].includes(this.status);
});

reportSchema.virtual('reportedBy').get(function() {
  return this.reporter;
});

reportSchema.virtual('contentId').get(function() {
  const item = this.reportedEvent || this.reportedUser || this.reportedTribe || this.reportedPost || this.reportedComment;
  return item?._id || item || null;
});

reportSchema.virtual('age').get(function() {
  return this.createdAt ? Date.now() - this.createdAt.getTime() : 0;
});

// Methods
reportSchema.methods.markAsReviewed = function(adminId, resolution, actionTaken) {
  this.status = 'resolved';
  this.reviewedBy = adminId;
  this.reviewedAt = new Date();
  this.resolution = resolution;
  this.actionTaken = actionTaken || 'none';
  return this.save();
};

reportSchema.methods.escalate = function(adminNotes) {
  this.status = 'escalated';
  this.priority = 'urgent';
  if (adminNotes) {
    this.adminNotes = adminNotes;
  }
  return this.save();
};

reportSchema.methods.dismiss = function(adminId, reason) {
  this.status = 'dismissed';
  this.reviewedBy = adminId;
  this.reviewedAt = new Date();
  this.resolution = reason;
  return this.save();
};

// Static methods
reportSchema.statics.getReportStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

reportSchema.statics.getReportsByUser = function(userId) {
  return this.find({ reporter: userId })
    .populate('reportedUser', 'username firstName lastName')
    .populate('reportedEvent', 'title')
    .populate('reportedTribe', 'name')
    .sort({ createdAt: -1 });
};

reportSchema.statics.getReportsAgainstUser = function(userId) {
  return this.find({ reportedUser: userId })
    .populate('reporter', 'username firstName lastName')
    .sort({ createdAt: -1 });
};

// Pre-save middleware
reportSchema.pre('save', function(next) {
  // Validate that at least one reported item is present
  const reportedItems = [
    this.reportedUser,
    this.reportedEvent,
    this.reportedTribe,
    this.reportedPost,
    this.reportedComment
  ].filter(Boolean);

  if (reportedItems.length === 0) {
    return next(new Error('At least one reported item must be specified'));
  }

  if (reportedItems.length > 1) {
    return next(new Error('Only one item can be reported at a time'));
  }

  next();
});

module.exports = mongoose.model('Report', reportSchema);
