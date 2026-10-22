const express = require('express');
const Post = require('../models/Post');
const User = require('../models/User');
const Event = require('../models/Event');
const { protect, optionalAuth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// @desc    Get feed posts
// @route   GET /api/feed
// @access  Public (personalized when authenticated)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const type = req.query.type; // Filter by post type

    // Build filter
    let filter = {
      isDeleted: false,
      visibility: req.user ? { $in: ['public', 'friends'] } : 'public'
    };

    if (type && type !== 'todos') {
      const typeMap = {
        'trending': { isSponsored: true },
        'conexiones': { type: 'connection' },
        'tribus': { type: 'tribe_join' },
        'eventos': { type: 'event_share' }
      };

      if (typeMap[type]) {
        filter = { ...filter, ...typeMap[type] };
      }
    }

    const posts = await Post.find(filter)
      .populate('user', 'username firstName lastName avatar verified')
      .populate('eventData.eventId', 'title location date attendees')
      .populate('tribeData.tribeId', 'name memberCount')
      .populate('likes.user', 'username firstName lastName avatar')
      .populate('comments.user', 'username firstName lastName avatar')
      .skip(startIndex)
      .limit(limit)
      .sort({ isPinned: -1, createdAt: -1 });

    const total = await Post.countDocuments(filter);

    // Format posts for frontend
    const formattedPosts = posts.map(post => ({
      id: post._id,
      type: post.type,
      user: post.user ? {
        name: `${post.user.firstName} ${post.user.lastName}`,
        avatar: post.user.avatar || '👤',
        verified: post.user.verified || false,
        title: post.user.bio ? post.user.bio.substring(0, 50) : undefined
      } : { name: 'Usuario Desconocido', avatar: '👤' },
      content: post.content,
      image: post.images && post.images.length > 0 ? post.images[0].url : undefined,
      eventData: post.eventData && post.eventData.eventId ? {
        name: post.eventData.eventId.title,
        location: post.eventData.eventId.location?.address || post.eventData.location,
        date: new Date(post.eventData.eventId.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        attendees: post.eventData.eventId.attendees?.length || post.eventData.attendees || 0
      } : undefined,
      tribeData: post.tribeData && post.tribeData.tribeId ? {
        name: post.tribeData.tribeId.name,
        memberCount: post.tribeData.tribeId.memberCount || post.tribeData.memberCount || 0
      } : undefined,
      stats: {
        likes: post.likesCount,
        comments: post.commentsCount,
        shares: post.sharesCount
      },
      timestamp: getTimeAgo(post.createdAt),
      liked: req.user ? post.isLikedByUser(req.user.id) : false,
      bookmarked: req.user?.bookmarkedPosts ? req.user.bookmarkedPosts.includes(post._id) : false,
      isPinned: post.isPinned,
      isSponsored: post.isSponsored
    }));

    res.json({
      success: true,
      count: formattedPosts.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      data: formattedPosts
    });
  } catch (error) {
    logger.error('Get feed error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Create new post
// @route   POST /api/feed
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { content, type, images, eventId, tribeId, visibility, tags, location } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Post content is required'
      });
    }

    const postData = {
      user: req.user.id,
      content: content.trim(),
      type: type || 'general',
      visibility: visibility || 'public'
    };

    // Add images if provided
    if (images && Array.isArray(images)) {
      postData.images = images;
    }

    // Add event data if eventId provided
    if (eventId) {
      const event = await Event.findById(eventId);
      if (event) {
        postData.eventData = {
          eventId: event._id,
          name: event.title,
          location: event.location.address,
          date: event.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
          attendees: event.attendees.length
        };
        postData.type = 'event_share';
      }
    }

    // Add tribe data if tribeId provided
    if (tribeId) {
      const Tribe = require('../models/Tribe');
      const tribe = await Tribe.findById(tribeId);
      if (tribe) {
        postData.tribeData = {
          tribeId: tribe._id,
          name: tribe.name,
          memberCount: tribe.members.length
        };
        postData.type = 'tribe_join';
      }
    }

    // Add tags if provided
    if (tags && Array.isArray(tags)) {
      postData.tags = tags;
    }

    // Add location if provided
    if (location) {
      postData.location = location;
    }

    const post = await Post.create(postData);
    await post.populate('user', 'username firstName lastName avatar verified');

    logger.info(`User ${req.user.id} created post ${post._id}`);

    const formattedPost = {
      id: post._id,
      type: post.type,
      user: post.user ? {
        name: `${post.user.firstName} ${post.user.lastName}`,
        avatar: post.user.avatar || '👤',
        verified: post.user.verified || false,
        title: post.user.bio ? post.user.bio.substring(0, 50) : undefined
      } : { name: 'Usuario Desconocido', avatar: '👤' },
      content: post.content,
      image: post.images && post.images.length > 0 ? post.images[0].url : undefined,
      eventData: post.eventData,
      tribeData: post.tribeData,
      stats: {
        likes: 0,
        comments: 0,
        shares: 0
      },
      timestamp: getTimeAgo(post.createdAt),
      liked: false,
      bookmarked: false,
      isPinned: false,
      isSponsored: false
    };

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: formattedPost
    });
  } catch (error) {
    logger.error('Create post error:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(val => ({
        field: val.path,
        message: val.message
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Like/Unlike post
// @route   POST /api/feed/:id/like
// @access  Private
router.post('/:id/like', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const isLiked = post.isLikedByUser(req.user.id);

    if (isLiked) {
      // Unlike post
      post.likes = post.likes.filter(like => like.user.toString() !== req.user.id);
    } else {
      // Like post
      post.likes.push({
        user: req.user.id,
        createdAt: new Date()
      });
    }

    await post.save();

    logger.info(`User ${req.user.id} ${isLiked ? 'unliked' : 'liked'} post ${post._id}`);

    res.json({
      success: true,
      message: isLiked ? 'Post unliked' : 'Post liked',
      data: {
        likesCount: post.likesCount,
        isLiked: !isLiked
      }
    });
  } catch (error) {
    logger.error('Like post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Comment on post
// @route   POST /api/feed/:id/comment
// @access  Private
router.post('/:id/comment', protect, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required'
      });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    post.comments.push({
      user: req.user.id,
      text: text.trim(),
      createdAt: new Date()
    });

    await post.save();
    await post.populate('comments.user', 'username firstName lastName avatar');

    const newComment = post.comments[post.comments.length - 1];

    logger.info(`User ${req.user.id} commented on post ${post._id}`);

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: {
        comment: {
          _id: newComment._id,
          text: newComment.text,
          user: newComment.user,
          createdAt: newComment.createdAt
        },
        commentsCount: post.commentsCount
      }
    });
  } catch (error) {
    logger.error('Comment post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Share post
// @route   POST /api/feed/:id/share
// @access  Private
router.post('/:id/share', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const isShared = post.isSharedByUser(req.user.id);

    if (isShared) {
      // Unshare post
      post.shares = post.shares.filter(share => share.user.toString() !== req.user.id);
    } else {
      // Share post
      post.shares.push({
        user: req.user.id,
        createdAt: new Date()
      });
    }

    await post.save();

    logger.info(`User ${req.user.id} ${isShared ? 'unshared' : 'shared'} post ${post._id}`);

    res.json({
      success: true,
      message: isShared ? 'Post unshared' : 'Post shared',
      data: {
        sharesCount: post.sharesCount,
        isShared: !isShared
      }
    });
  } catch (error) {
    logger.error('Share post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get users who liked post
// @route   GET /api/feed/:id/likes
// @access  Public
router.get('/:id/likes', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('likes.user', 'username firstName lastName avatar verified bio');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const likes = post.likes.map(like => ({
      user: {
        _id: like.user._id,
        username: like.user.username,
        firstName: like.user.firstName,
        lastName: like.user.lastName,
        avatar: like.user.avatar,
        verified: like.user.verified,
        bio: like.user.bio
      },
      createdAt: like.createdAt
    }));

    res.json({
      success: true,
      count: likes.length,
      data: likes
    });
  } catch (error) {
    logger.error('Get post likes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Delete post
// @route   DELETE /api/feed/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user owns the post
    if (post.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this post'
      });
    }

    // Soft delete
    post.isDeleted = true;
    await post.save();

    logger.info(`User ${req.user.id} deleted post ${post._id}`);

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    logger.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update post
// @route   PUT /api/feed/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user owns the post
    if (post.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this post'
      });
    }

    const { content, visibility, tags } = req.body;

    if (content && content.trim()) {
      post.content = content.trim();
    }

    if (visibility) {
      post.visibility = visibility;
    }

    if (tags && Array.isArray(tags)) {
      post.tags = tags;
    }

    await post.save();

    logger.info(`User ${req.user.id} updated post ${post._id}`);

    res.json({
      success: true,
      message: 'Post updated successfully',
      data: post
    });
  } catch (error) {
    logger.error('Update post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get trending feed posts
// @route   GET /api/feed/trending
// @access  Private
router.get('/trending', protect, async (req, res) => {
  try {
    const posts = await Post.find({ isDeleted: false, isSponsored: true })
      .populate('user', 'username firstName lastName avatar verified bio')
      .sort('-createdAt')
      .limit(20);
    const formattedPosts = posts.map(post => ({
      id: post._id,
      type: post.type,
      content: post.content,
      image: post.images && post.images.length > 0 ? post.images[0].url : undefined,
      stats: { likes: post.likesCount, comments: post.commentsCount, shares: post.sharesCount },
      timestamp: getTimeAgo(post.createdAt),
      liked: post.isLikedByUser(req.user.id),
      isSponsored: post.isSponsored
    }));
    res.json({ success: true, count: formattedPosts.length, data: formattedPosts });
  } catch (error) {
    logger.error('Trending feed error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Get post by ID
// @route   GET /api/feed/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    // Guard against non-ObjectId params (e.g. "trending") hitting this route
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid post ID' });
    }
    const post = await Post.findOne({ _id: req.params.id, isDeleted: false })
      .populate('user', 'username firstName lastName avatar verified bio')
      .populate('eventData.eventId', 'title location date attendees')
      .populate('tribeData.tribeId', 'name memberCount')
      .populate('likes.user', 'username firstName lastName avatar')
      .populate('comments.user', 'username firstName lastName avatar');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    logger.error('Get post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Helper function to get relative time
function getTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds}s`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;

  return new Date(date).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short'
  });
}

module.exports = router;
