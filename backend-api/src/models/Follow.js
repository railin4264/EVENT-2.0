const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
  follower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  following: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'blocked'],
    default: 'accepted' // For public profiles, auto-accept. For private, set to 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  acceptedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
followSchema.index({ follower: 1, following: 1 }, { unique: true });
followSchema.index({ following: 1, status: 1 });
followSchema.index({ follower: 1, status: 1 });
followSchema.index({ createdAt: -1 });

// Prevent users from following themselves
followSchema.pre('save', function(next) {
  if (this.follower.toString() === this.following.toString()) {
    const error = new Error('Users cannot follow themselves');
    return next(error);
  }
  
  // Set acceptedAt when status changes to accepted
  if (this.status === 'accepted' && !this.acceptedAt) {
    this.acceptedAt = new Date();
  }
  
  next();
});

// Static methods
followSchema.statics.followUser = async function(followerId, followingId) {
  // Check if already following
  const existingFollow = await this.findOne({
    follower: followerId,
    following: followingId
  });

  if (existingFollow) {
    if (existingFollow.status === 'blocked') {
      throw new Error('Cannot follow this user');
    }
    if (existingFollow.status === 'accepted') {
      throw new Error('Already following this user');
    }
    if (existingFollow.status === 'pending') {
      throw new Error('Follow request already pending');
    }
  }

  // Create new follow relationship
  const follow = await this.create({
    follower: followerId,
    following: followingId,
    status: 'accepted' // For now, auto-accept all follows
  });

  // Create notification for the followed user
  try {
    const Notification = require('./Notification');
    await Notification.createFollowNotification(followerId, followingId);
  } catch (error) {
    console.error('Error creating follow notification:', error);
    // Don't fail the follow operation if notification fails
  }

  return follow;
};

followSchema.statics.unfollowUser = async function(followerId, followingId) {
  const result = await this.deleteOne({
    follower: followerId,
    following: followingId
  });

  if (result.deletedCount === 0) {
    throw new Error('Not following this user');
  }

  return result;
};

followSchema.statics.isFollowing = async function(followerId, followingId) {
  const follow = await this.findOne({
    follower: followerId,
    following: followingId,
    status: 'accepted'
  });

  return !!follow;
};

followSchema.statics.getFollowers = async function(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  return await this.find({
    following: userId,
    status: 'accepted'
  })
    .populate('follower', 'firstName lastName username avatar verified bio')
    .sort({ acceptedAt: -1 })
    .skip(skip)
    .limit(limit);
};

followSchema.statics.getFollowing = async function(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  return await this.find({
    follower: userId,
    status: 'accepted'
  })
    .populate('following', 'firstName lastName username avatar verified bio')
    .sort({ acceptedAt: -1 })
    .skip(skip)
    .limit(limit);
};

followSchema.statics.getFollowCounts = async function(userId) {
  const [followersCount, followingCount] = await Promise.all([
    this.countDocuments({ following: userId, status: 'accepted' }),
    this.countDocuments({ follower: userId, status: 'accepted' })
  ]);

  return {
    followersCount,
    followingCount
  };
};

followSchema.statics.getFollowRequests = async function(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  return await this.find({
    following: userId,
    status: 'pending'
  })
    .populate('follower', 'firstName lastName username avatar verified bio')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

followSchema.statics.acceptFollowRequest = async function(followId, userId) {
  const follow = await this.findOne({
    _id: followId,
    following: userId,
    status: 'pending'
  });

  if (!follow) {
    throw new Error('Follow request not found');
  }

  follow.status = 'accepted';
  follow.acceptedAt = new Date();
  
  return await follow.save();
};

followSchema.statics.rejectFollowRequest = async function(followId, userId) {
  const result = await this.deleteOne({
    _id: followId,
    following: userId,
    status: 'pending'
  });

  if (result.deletedCount === 0) {
    throw new Error('Follow request not found');
  }

  return result;
};

followSchema.statics.getMutualFollows = async function(userId, otherUserId, limit = 10) {
  // Get users that both users follow
  const mutualFollowing = await this.aggregate([
    {
      $match: {
        follower: { $in: [
          new mongoose.Types.ObjectId(userId),
          new mongoose.Types.ObjectId(otherUserId)
        ]},
        status: 'accepted'
      }
    },
    {
      $group: {
        _id: '$following',
        followers: { $addToSet: '$follower' },
        count: { $sum: 1 }
      }
    },
    {
      $match: {
        count: 2 // Both users follow this person
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: '$user'
    },
    {
      $project: {
        _id: '$user._id',
        firstName: '$user.firstName',
        lastName: '$user.lastName',
        username: '$user.username',
        avatar: '$user.avatar',
        verified: '$user.verified'
      }
    },
    {
      $limit: limit
    }
  ]);

  return mutualFollowing;
};

followSchema.statics.getSuggestedUsers = async function(userId, limit = 10) {
  // Get users followed by people the user follows (friends of friends)
  const suggestions = await this.aggregate([
    // Get users the current user follows
    {
      $match: {
        follower: new mongoose.Types.ObjectId(userId),
        status: 'accepted'
      }
    },
    // Get users that those people follow
    {
      $lookup: {
        from: 'follows',
        localField: 'following',
        foreignField: 'follower',
        as: 'friendsFollows'
      }
    },
    {
      $unwind: '$friendsFollows'
    },
    {
      $match: {
        'friendsFollows.status': 'accepted',
        'friendsFollows.following': { $ne: new mongoose.Types.ObjectId(userId) }
      }
    },
    // Group by suggested user and count mutual connections
    {
      $group: {
        _id: '$friendsFollows.following',
        mutualCount: { $sum: 1 },
        mutualFriends: { $addToSet: '$following' }
      }
    },
    // Exclude users already followed
    {
      $lookup: {
        from: 'follows',
        let: { suggestedUserId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$follower', new mongoose.Types.ObjectId(userId)] },
                  { $eq: ['$following', '$$suggestedUserId'] }
                ]
              }
            }
          }
        ],
        as: 'alreadyFollowing'
      }
    },
    {
      $match: {
        alreadyFollowing: { $size: 0 }
      }
    },
    // Get user details
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: '$user'
    },
    {
      $project: {
        _id: '$user._id',
        firstName: '$user.firstName',
        lastName: '$user.lastName',
        username: '$user.username',
        avatar: '$user.avatar',
        verified: '$user.verified',
        bio: '$user.bio',
        mutualCount: 1,
        mutualFriends: 1
      }
    },
    {
      $sort: { mutualCount: -1 }
    },
    {
      $limit: limit
    }
  ]);

  return suggestions;
};

// Instance methods
followSchema.methods.accept = function() {
  this.status = 'accepted';
  this.acceptedAt = new Date();
  return this.save();
};

followSchema.methods.reject = function() {
  return this.remove();
};

followSchema.methods.block = function() {
  this.status = 'blocked';
  return this.save();
};

module.exports = mongoose.model('Follow', followSchema);