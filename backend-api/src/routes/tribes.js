const express = require('express');
const { protect } = require('../middleware/auth');
const { tribeListCache, tribeDetailsCache, invalidateCache } = require('../middleware/cache');
const logger = require('../utils/logger');
const Tribe = require('../models/Tribe');
const User = require('../models/User');

const router = express.Router();

// @desc    Get all tribes
// @route   GET /api/tribes
// @access  Public
router.get('/', tribeListCache, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Build query - show public tribes only
    const query = {
      isActive: true,
      'settings.privacy': { $ne: 'secret' }
    };

    if (req.query.category) {
      query.category = req.query.category;
    }

    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Get tribes with pagination
    const tribes = await Tribe.find(query)
      .populate('creator', 'username firstName lastName avatar')
      .populate('members.user', 'username firstName lastName avatar')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Get total count
    const total = await Tribe.countDocuments(query);

    // Format response
    const formattedTribes = tribes.map(tribe => ({
      _id: tribe._id,
      name: tribe.name,
      description: tribe.description,
      category: tribe.category,
      members: tribe.members.map(member => member.user?._id || member.user),
      memberCount: tribe.membersCount,
      creator: {
        username: tribe.creator?.username,
        firstName: tribe.creator?.firstName,
        lastName: tribe.creator?.lastName,
        avatar: tribe.creator?.avatar
      },
      privacy: tribe.settings?.privacy,
      avatar: tribe.avatar,
      tags: tribe.tags,
      location: tribe.location,
      createdAt: tribe.createdAt
    }));

    res.json({
      success: true,
      count: formattedTribes.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      tribes: formattedTribes
    });
  } catch (error) {
    logger.error('Get tribes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get single tribe
// @route   GET /api/tribes/:id
// @access  Public
router.get('/:id', async (req, res) => {
  if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ success: false, message: 'Invalid tribe ID' });
  }
  try {
    const tribe = await Tribe.findById(req.params.id)
      .populate('creator', 'username firstName lastName avatar')
      .populate('members.user', 'username firstName lastName avatar');

    if (!tribe) {
      return res.status(404).json({
        success: false,
        message: 'Tribe not found'
      });
    }

    // Check if user is member (if authenticated)
    let isMember = false;
    let isAdmin = false;

    if (req.user) {
      const memberEntry = tribe.members.find(m => m.user._id.toString() === req.user.id);
      isMember = !!memberEntry;
      isAdmin = memberEntry?.role === 'admin';
    }

    const formattedTribe = {
      _id: tribe._id,
      name: tribe.name,
      description: tribe.description,
      category: tribe.category,
      members: tribe.members.map(member => ({
        _id: member.user._id,
        username: member.user.username,
        firstName: member.user.firstName,
        lastName: member.user.lastName,
        avatar: member.user.avatar,
        role: member.role,
        status: member.status
      })),
      memberCount: tribe.membersCount,
      creator: {
        _id: tribe.creator?._id,
        username: tribe.creator?.username,
        firstName: tribe.creator?.firstName,
        lastName: tribe.creator?.lastName,
        avatar: tribe.creator?.avatar
      },
      privacy: tribe.settings?.privacy,
      membership: tribe.settings?.membership,
      avatar: tribe.avatar,
      tags: tribe.tags,
      stats: tribe.stats,
      location: tribe.location,
      createdAt: tribe.createdAt,
      isMember,
      isAdmin
    };

    res.json({
      success: true,
      tribe: formattedTribe
    });
  } catch (error) {
    logger.error('Get tribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Create new tribe
// @route   POST /api/tribes
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { name, description, category, isPublic = true, tags = [], location = {} } = req.body;

    // Validate required fields
    if (!name || !description || !category) {
      return res.status(400).json({
        success: false,
        message: 'Name, description, and category are required'
      });
    }

    // Check if tribe name already exists
    const existingTribe = await Tribe.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingTribe) {
      console.log('❌ Create tribe failed: Duplicate name', name);
      return res.status(400).json({
        success: false,
        message: 'A tribe with this name already exists'
      });
    }

    // Map isPublic to privacy setting
    const privacy = isPublic ? 'public' : 'private';

    // Create new tribe
    const newTribe = new Tribe({
      name,
      description,
      category,
      tags,
      location,
      creator: req.user.id,
      members: [{ user: req.user.id, role: 'admin', status: 'active' }],
      settings: {
        privacy,
        membership: 'open'
      }
    });

    await newTribe.save();

    // Populate the created tribe
    const populatedTribe = await Tribe.findById(newTribe._id)
      .populate('creator', 'username firstName lastName avatar')
      .populate('members.user', 'username firstName lastName avatar');

    res.status(201).json({
      success: true,
      message: 'Tribe created successfully',
      tribe: {
        _id: populatedTribe._id,
        name: populatedTribe.name,
        description: populatedTribe.description,
        category: populatedTribe.category,
        members: populatedTribe.members.map(m => m.user._id),
        memberCount: populatedTribe.membersCount,
        creator: {
          _id: populatedTribe.creator._id,
          username: populatedTribe.creator?.username,
          firstName: populatedTribe.creator?.firstName,
          lastName: populatedTribe.creator?.lastName,
          avatar: populatedTribe.creator?.avatar
        },
        privacy: populatedTribe.settings.privacy,
        avatar: populatedTribe.avatar,
        tags: populatedTribe.tags,
        location: populatedTribe.location,
        createdAt: populatedTribe.createdAt
      }
    });
  } catch (error) {
    logger.error('Create tribe error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      console.log('❌ Create tribe failed: Mongoose Validation', messages);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A tribe with this name already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update tribe
// @route   PUT /api/tribes/:id
// @access  Private (Admin only)
router.put('/:id', protect, async (req, res) => {
  try {
    const tribe = await Tribe.findById(req.params.id);

    if (!tribe) {
      return res.status(404).json({
        success: false,
        message: 'Tribe not found'
      });
    }

    // Check if user is admin
    const isAdmin = tribe.members.some(m => m.user.toString() === req.user.id && m.role === 'admin'); if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this tribe'
      });
    }

    const updatedTribe = await Tribe.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('creator', 'username firstName lastName avatar')
      .populate('members.user', 'username firstName lastName avatar');

    res.json({
      success: true,
      message: 'Tribe updated successfully',
      tribe: updatedTribe
    });
  } catch (error) {
    logger.error('Update tribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Delete tribe
// @route   DELETE /api/tribes/:id
// @access  Private (Admin only)
router.delete('/:id', protect, async (req, res) => {
  try {
    const tribe = await Tribe.findById(req.params.id);

    if (!tribe) {
      return res.status(404).json({
        success: false,
        message: 'Tribe not found'
      });
    }

    // Check if user is admin
    const isAdmin = tribe.members.some(m => m.user.toString() === req.user.id && m.role === 'admin'); if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this tribe'
      });
    }

    await Tribe.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Tribe deleted successfully'
    });
  } catch (error) {
    logger.error('Delete tribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Join tribe
// @route   POST /api/tribes/:id/join
// @access  Private
router.post('/:id/join', protect, async (req, res) => {
  try {
    const tribe = await Tribe.findById(req.params.id);

    if (!tribe) {
      return res.status(404).json({
        success: false,
        message: 'Tribe not found'
      });
    }

    // Check if user is already a member
    const existingMember = tribe.members.find(m => m.user && m.user.toString() === req.user.id);

    if (existingMember) {
      // If member is banned, don't allow rejoin
      if (existingMember.status === 'banned') {
        return res.status(403).json({
          success: false,
          message: 'You have been banned from this tribe'
        });
      }

      // If member is inactive, reactivate them
      if (existingMember.status === 'inactive') {
        existingMember.status = 'active';
        existingMember.joinedAt = new Date();
        await tribe.save();

        return res.json({
          success: true,
          message: 'Successfully rejoined tribe'
        });
      }

      // Already an active member
      return res.status(200).json({
        success: true,
        message: 'You are already a member of this tribe',
        alreadyMember: true
      });
    }

    // Add user to members
    tribe.members.push({ user: req.user.id, role: 'member', status: 'active' });
    await tribe.save();

    res.json({
      success: true,
      message: 'Successfully joined tribe'
    });
  } catch (error) {
    logger.error('Join tribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Leave tribe
// @route   POST /api/tribes/:id/leave
// @access  Private
router.post('/:id/leave', protect, async (req, res) => {
  try {
    const tribe = await Tribe.findById(req.params.id);

    if (!tribe) {
      return res.status(404).json({
        success: false,
        message: 'Tribe not found'
      });
    }

    // Check if user is a member
    if (!tribe.members.some(m => m.user.toString() === req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'You are not a member of this tribe'
      });
    }

    // Remove user from members
    tribe.members = tribe.members.filter(m => m.user.toString() !== req.user.id);

    // If user is admin, remove from admins too
    // Role is part of members array

    await tribe.save();

    res.json({
      success: true,
      message: 'Successfully left tribe'
    });
  } catch (error) {
    logger.error('Leave tribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get user's tribes
// @route   GET /api/tribes/user/me
// @access  Private
router.get('/user/me', protect, async (req, res) => {
  try {
    const tribes = await Tribe.find({ 'members.user': req.user.id })
      .populate('creator', 'username firstName lastName avatar')
      .populate('members.user', 'username firstName lastName avatar')
      .sort({ createdAt: -1 });

    const formattedTribes = tribes.map(tribe => ({
      _id: tribe._id,
      name: tribe.name,
      description: tribe.description,
      category: tribe.category,
      members: tribe.members.map(member => member.user?._id || member.user),
      memberCount: tribe.membersCount,
      creator: {
        username: tribe.creator?.username,
        firstName: tribe.creator?.firstName,
        lastName: tribe.creator?.lastName,
        avatar: tribe.creator?.avatar
      },
      privacy: tribe.settings?.privacy,
      avatar: tribe.avatar,
      tags: tribe.tags,
      location: tribe.location,
      createdAt: tribe.createdAt,
      isMember: true,
      isAdmin: tribe.members.some(member => member.user?._id?.toString() === req.user.id && member.role === 'admin')
    }));

    res.json({
      success: true,
      count: formattedTribes.length,
      tribes: formattedTribes
    });
  } catch (error) {
    logger.error('Get user tribes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get nearby tribes
// @route   GET /api/tribes/nearby
// @access  Public
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 10000 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const maxDistance = parseInt(radius);

    // Validate coordinates
    if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates'
      });
    }

    // Find nearby tribes using MongoDB geospatial query
    const tribes = await Tribe.findNearby([longitude, latitude], maxDistance, 20)
      .populate('creator', 'username firstName lastName avatar');

    // Format response with distance calculation
    const formattedTribes = tribes.map(tribe => ({
      _id: tribe._id,
      name: tribe.name,
      description: tribe.description,
      category: tribe.category,
      membersCount: tribe.membersCount,
      creator: {
        username: tribe.creator?.username,
        firstName: tribe.creator?.firstName,
        lastName: tribe.creator?.lastName,
        avatar: tribe.creator?.avatar
      },
      avatar: tribe.avatar,
      tags: tribe.tags,
      location: tribe.location,
      settings: tribe.settings,
      stats: tribe.stats,
      createdAt: tribe.createdAt
    }));

    res.json({
      success: true,
      count: formattedTribes.length,
      tribes: formattedTribes,
      searchLocation: {
        latitude,
        longitude,
        radius: maxDistance
      }
    });
  } catch (error) {
    logger.error('Get nearby tribes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// ============= TRIBE POSTS ROUTES =============

// @desc    Create tribe post
// @route   POST /api/tribes/:id/posts
// @access  Private (Members only)
router.post('/:id/posts', protect, async (req, res) => {
  try {
    const { content, images = [] } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Content is required'
      });
    }

    const tribe = await Tribe.findById(req.params.id);

    if (!tribe) {
      return res.status(404).json({
        success: false,
        message: 'Tribe not found'
      });
    }

    // Check if user is a member
    const isMember = tribe.members.some(m => m.user.toString() === req.user.id && m.status === 'active');
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member to post in this tribe'
      });
    }

    // Create new post
    const newPost = {
      author: req.user.id,
      content: content.trim(),
      images: images.map(img => ({ url: img.url, alt: img.alt || '' })),
      likes: [],
      comments: [],
      createdAt: new Date()
    };

    tribe.posts.unshift(newPost);
    await tribe.save();

    // Populate the author for response
    const savedTribe = await Tribe.findById(tribe._id)
      .populate('posts.author', 'username firstName lastName avatar');

    const createdPost = savedTribe.posts[0];

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post: {
        _id: createdPost._id,
        content: createdPost.content,
        images: createdPost.images,
        author: {
          _id: createdPost.author._id,
          firstName: createdPost.author.firstName,
          lastName: createdPost.author.lastName,
          avatar: createdPost.author.avatar
        },
        likes: createdPost.likes.length,
        comments: createdPost.comments.length,
        createdAt: createdPost.createdAt
      }
    });
  } catch (error) {
    logger.error('Create tribe post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get tribe posts
// @route   GET /api/tribes/:id/posts
// @access  Public (for public tribes) / Private (for private tribes)
router.get('/:id/posts', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const tribe = await Tribe.findById(req.params.id)
      .populate('posts.author', 'username firstName lastName avatar')
      .populate('posts.likes.user', 'username firstName lastName')
      .populate('posts.comments.user', 'username firstName lastName');

    if (!tribe) {
      return res.status(404).json({
        success: false,
        message: 'Tribe not found'
      });
    }

    // Check privacy settings
    if (tribe.settings.privacy !== 'public') {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const isMember = tribe.members.some(m => m.user.toString() === req.user.id);
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const posts = tribe.posts.slice(startIndex, endIndex);

    // Format posts
    const formattedPosts = posts.map(post => ({
      _id: post._id,
      content: post.content,
      images: post.images,
      author: {
        _id: post.author._id,
        firstName: post.author.firstName,
        lastName: post.author.lastName,
        avatar: post.author.avatar
      },
      likes: post.likes.length,
      likedByUser: req.user ? post.likes.some(l => l.user._id.toString() === req.user.id) : false,
      comments: post.comments.length,
      createdAt: post.createdAt
    }));

    res.json({
      success: true,
      count: formattedPosts.length,
      total: tribe.posts.length,
      pagination: {
        page,
        limit,
        pages: Math.ceil(tribe.posts.length / limit)
      },
      posts: formattedPosts
    });
  } catch (error) {
    logger.error('Get tribe posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Delete tribe post
// @route   DELETE /api/tribes/:id/posts/:postId
// @access  Private (Post author or tribe admin)
router.delete('/:id/posts/:postId', protect, async (req, res) => {
  try {
    const tribe = await Tribe.findById(req.params.id);

    if (!tribe) {
      return res.status(404).json({
        success: false,
        message: 'Tribe not found'
      });
    }

    const post = tribe.posts.id(req.params.postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user is post author or tribe admin
    const isAuthor = post.author.toString() === req.user.id;
    const isAdmin = tribe.members.some(m => m.user.toString() === req.user.id && m.role === 'admin');

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this post'
      });
    }

    post.deleteOne();
    await tribe.save();

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    logger.error('Delete tribe post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Like/Unlike tribe post
// @route   POST /api/tribes/:id/posts/:postId/like
// @access  Private (Members only)
router.post('/:id/posts/:postId/like', protect, async (req, res) => {
  try {
    const tribe = await Tribe.findById(req.params.id);

    if (!tribe) {
      return res.status(404).json({
        success: false,
        message: 'Tribe not found'
      });
    }

    // Check if user is a member
    const isMember = tribe.members.some(m => m.user.toString() === req.user.id && m.status === 'active');
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member to like posts'
      });
    }

    const post = tribe.posts.id(req.params.postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if already liked
    const likeIndex = post.likes.findIndex(l => l.user.toString() === req.user.id);

    if (likeIndex > -1) {
      // Unlike
      post.likes.splice(likeIndex, 1);
      await tribe.save();

      res.json({
        success: true,
        message: 'Post unliked',
        liked: false,
        likesCount: post.likes.length
      });
    } else {
      // Like
      post.likes.push({
        user: req.user.id
      });
      await tribe.save();

      res.json({
        success: true,
        message: 'Post liked',
        liked: true,
        likesCount: post.likes.length
      });
    }
  } catch (error) {
    logger.error('Like tribe post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Comment on tribe post
// @route   POST /api/tribes/:id/posts/:postId/comments
// @access  Private (Members only)
router.post('/:id/posts/:postId/comments', protect, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required'
      });
    }

    const tribe = await Tribe.findById(req.params.id);

    if (!tribe) {
      return res.status(404).json({
        success: false,
        message: 'Tribe not found'
      });
    }

    // Check if user is a member
    const isMember = tribe.members.some(m => m.user.toString() === req.user.id && m.status === 'active');
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member to comment on posts'
      });
    }

    const post = tribe.posts.id(req.params.postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Add comment
    const newComment = {
      user: req.user.id,
      content: content.trim(),
      createdAt: new Date()
    };

    post.comments.push(newComment);
    await tribe.save();

    // Populate user details for the new comment
    // We need to re-fetch or populate manually since we just saved
    // For simplicity/performance, we can construct the response with known user details
    // but populating ensures consistency.

    const savedTribe = await Tribe.findById(tribe._id)
      .populate('posts.comments.user', 'username firstName lastName avatar');

    const savedPost = savedTribe.posts.id(post._id);
    const savedComment = savedPost.comments[savedPost.comments.length - 1];

    res.json({
      success: true,
      message: 'Comment added successfully',
      comment: {
        _id: savedComment._id,
        content: savedComment.content,
        user: {
          _id: savedComment.user._id,
          username: savedComment.user.username,
          firstName: savedComment.user.firstName,
          lastName: savedComment.user.lastName,
          avatar: savedComment.user.avatar
        },
        createdAt: savedComment.createdAt
      }
    });

  } catch (error) {
    logger.error('Comment on tribe post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// ============= TRIBE STORIES ROUTES =============

// @desc    Create tribe story
// @route   POST /api/tribes/:id/stories
// @access  Private (Members only)
router.post('/:id/stories', protect, async (req, res) => {
  try {
    const { media, duration = 5 } = req.body;

    if (!media || !media.url || !media.type) {
      return res.status(400).json({
        success: false,
        message: 'Media URL and type are required'
      });
    }

    if (!['image', 'video'].includes(media.type)) {
      return res.status(400).json({
        success: false,
        message: 'Media type must be image or video'
      });
    }

    const tribe = await Tribe.findById(req.params.id);

    if (!tribe) {
      return res.status(404).json({
        success: false,
        message: 'Tribe not found'
      });
    }

    // Check if user is a member
    const isMember = tribe.members.some(m => m.user.toString() === req.user.id && m.status === 'active');
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member to post stories'
      });
    }

    // Create new story
    const newStory = {
      author: req.user.id,
      media: {
        url: media.url,
        type: media.type,
        thumbnail: media.thumbnail || null
      },
      duration: duration,
      views: [],
      createdAt: new Date()
    };

    tribe.stories.unshift(newStory);
    await tribe.save();

    // Populate the author for response
    const savedTribe = await Tribe.findById(tribe._id)
      .populate('stories.author', 'username firstName lastName avatar');

    const createdStory = savedTribe.stories[0];

    res.status(201).json({
      success: true,
      message: 'Story created successfully',
      story: {
        _id: createdStory._id,
        author: {
          _id: createdStory.author._id,
          firstName: createdStory.author.firstName,
          lastName: createdStory.author.lastName,
          avatar: createdStory.author.avatar
        },
        media: createdStory.media,
        duration: createdStory.duration,
        views: createdStory.views.length,
        createdAt: createdStory.createdAt
      }
    });
  } catch (error) {
    logger.error('Create tribe story error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get tribe stories (last 24 hours)
// @route   GET /api/tribes/:id/stories
// @access  Private (Members only)
router.get('/:id/stories', protect, async (req, res) => {
  try {
    const tribe = await Tribe.findById(req.params.id)
      .populate('stories.author', 'username firstName lastName avatar');

    if (!tribe) {
      return res.status(404).json({
        success: false,
        message: 'Tribe not found'
      });
    }

    // Check if user is a member
    const isMember = tribe.members.some(m => m.user.toString() === req.user.id && m.status === 'active');
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member to view stories'
      });
    }

    // Filter stories from last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentStories = tribe.stories.filter(story =>
      new Date(story.createdAt) > twentyFourHoursAgo
    );

    // Format stories
    const formattedStories = recentStories.map(story => ({
      _id: story._id,
      author: {
        _id: story.author._id,
        firstName: story.author.firstName,
        lastName: story.author.lastName,
        avatar: story.author.avatar
      },
      media: story.media,
      duration: story.duration,
      views: story.views.length,
      viewedByUser: story.views.some(v => v.user.toString() === req.user.id),
      createdAt: story.createdAt
    }));

    res.json({
      success: true,
      count: formattedStories.length,
      stories: formattedStories
    });
  } catch (error) {
    logger.error('Get tribe stories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Mark story as viewed
// @route   POST /api/tribes/:id/stories/:storyId/view
// @access  Private (Members only)
router.post('/:id/stories/:storyId/view', protect, async (req, res) => {
  try {
    const tribe = await Tribe.findById(req.params.id);

    if (!tribe) {
      return res.status(404).json({
        success: false,
        message: 'Tribe not found'
      });
    }

    // Check if user is a member
    const isMember = tribe.members.some(m => m.user.toString() === req.user.id && m.status === 'active');
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member to view stories'
      });
    }

    const story = tribe.stories.id(req.params.storyId);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    // Check if already viewed
    const alreadyViewed = story.views.some(v => v.user.toString() === req.user.id);

    if (!alreadyViewed) {
      story.views.push({
        user: req.user.id,
        viewedAt: new Date()
      });
      await tribe.save();
    }

    res.json({
      success: true,
      message: 'Story view recorded',
      viewsCount: story.views.length
    });
  } catch (error) {
    logger.error('View tribe story error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;





