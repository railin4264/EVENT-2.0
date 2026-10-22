const express = require('express');
const Story = require('../models/Story');
const User = require('../models/User');
const { protect, optionalAuth } = require('../middleware/auth');

const logger = require('../utils/logger');
const router = express.Router();

// @desc    Get all stories
// @route   GET /api/stories
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Get stories from last 24 hours that haven't expired
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const stories = await Story.find({
      createdAt: { $gte: twentyFourHoursAgo },
      expiresAt: { $gt: new Date() },
      isDeleted: false
    })
      .populate('author', 'username firstName lastName avatar verified')
      .populate('event', 'title location date')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    const total = await Story.countDocuments({
      createdAt: { $gte: twentyFourHoursAgo },
      expiresAt: { $gt: new Date() },
      isDeleted: false
    });

    // Format stories for frontend
    const formattedStories = stories.map(story => ({
      _id: story._id,
      content: story.content,
      style: story.style,
      media: story.media,
      author: story.author ? {
        _id: story.author._id,
        username: story.author.username,
        firstName: story.author.firstName,
        lastName: story.author.lastName,
        avatar: story.author.avatar
      } : null,
      event: story.event ? {
        _id: story.event._id,
        title: story.event.title,
        location: story.event.location?.address || story.event.location
      } : undefined,
      music: story.music,
      location: story.location,
      views: story.views?.length || 0,
      likes: story.likes?.length || 0,
      replies: story.replies?.length || 0,
      createdAt: story.createdAt,
      expiresAt: story.expiresAt,
      isViewed: story.views?.some(view => view.user.toString() === req.user.id) || false,
      isLiked: story.likes?.some(like => like.user.toString() === req.user.id) || false
    }));

    res.json({
      success: true,
      stories: formattedStories,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get stories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get feed stories (alias for GET /)
// @route   GET /api/stories/feed
// @access  Private
router.get('/feed', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;

    // Get stories from last 24 hours that haven't expired
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const stories = await Story.find({
      createdAt: { $gte: twentyFourHoursAgo },
      expiresAt: { $gt: new Date() },
      isDeleted: false
    })
      .populate('author', 'username firstName lastName avatar verified')
      .populate('event', 'title location date')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    const total = await Story.countDocuments({
      createdAt: { $gte: twentyFourHoursAgo },
      expiresAt: { $gt: new Date() },
      isDeleted: false
    });

    // Format stories for frontend
    const formattedStories = stories.map(story => ({
      _id: story._id,
      content: story.content,
      style: story.style,
      media: story.media,
      author: story.author ? {
        _id: story.author._id,
        username: story.author.username,
        firstName: story.author.firstName,
        lastName: story.author.lastName,
        avatar: story.author.avatar
      } : null,
      event: story.event ? {
        _id: story.event._id,
        title: story.event.title,
        location: story.event.location?.address || story.event.location
      } : undefined,
      music: story.music,
      location: story.location,
      poll: story.poll,
      views: story.views?.length || 0,
      likes: story.likes?.length || 0,
      replies: story.replies?.length || 0,
      createdAt: story.createdAt,
      expiresAt: story.expiresAt,
      isViewed: story.views?.some(view => view.user.toString() === req.user.id) || false,
      isLiked: story.likes?.some(like => like.user.toString() === req.user.id) || false
    }));

    res.json({
      success: true,
      stories: formattedStories,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get feed stories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get current user's stories
// @route   GET /api/stories/my
// @access  Private
router.get('/my', protect, async (req, res) => {
  try {
    const stories = await Story.find({
      author: req.user.id,
      isDeleted: false,
      expiresAt: { $gt: new Date() }
    })
      .populate('event', 'title location date')
      .sort({ createdAt: -1 });

    const formattedStories = stories.map(story => ({
      _id: story._id,
      content: story.content,
      style: story.style,
      media: story.media,
      event: story.event ? {
        _id: story.event._id,
        title: story.event.title,
        location: story.event.location?.address || story.event.location
      } : undefined,
      music: story.music,
      location: story.location,
      views: story.views?.length || 0,
      likes: story.likes?.length || 0,
      replies: story.replies?.length || 0,
      createdAt: story.createdAt,
      expiresAt: story.expiresAt
    }));

    res.json({
      success: true,
      stories: formattedStories
    });
  } catch (error) {
    logger.error('Get my stories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get my stories
// @route   GET /api/stories/my-stories
// @access  Private
router.get('/my-stories', protect, async (req, res) => {
  try {
    const stories = await Story.find({
      author: req.user.id,
      isDeleted: false
    })
      .populate('author', 'username firstName lastName avatar verified')
      .populate('event', 'title location date')
      .sort({ createdAt: -1 });

    const formattedStories = stories.map(story => ({
      _id: story._id,
      content: story.content,
      media: story.media,
      author: story.author ? {
        _id: story.author._id,
        username: story.author.username,
        firstName: story.author.firstName,
        lastName: story.author.lastName,
        avatar: story.author.avatar
      } : null,
      event: story.event ? {
        _id: story.event._id,
        title: story.event.title,
        location: story.event.location?.address || story.event.location
      } : undefined,
      music: story.music,
      location: story.location,
      views: story.views?.length || 0,
      likes: story.likes?.length || 0,
      replies: story.replies?.length || 0,
      createdAt: story.createdAt,
      expiresAt: story.expiresAt,
      isViewed: true, // Always true for own stories
      isLiked: false // Can't like own stories
    }));

    res.json({
      success: true,
      stories: formattedStories
    });
  } catch (error) {
    logger.error('Get my stories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});



// @desc    Get story by ID
// @route   GET /api/stories/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
      .populate('author', 'username firstName lastName avatar verified')
      .populate('event', 'title location date');

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    // Check if story has expired
    if (story.expiresAt < new Date()) {
      return res.status(404).json({
        success: false,
        message: 'Story has expired'
      });
    }

    const formattedStory = {
      _id: story._id,
      content: story.content,
      style: story.style,
      media: story.media,
      author: story.author ? {
        _id: story.author._id,
        username: story.author.username,
        firstName: story.author.firstName,
        lastName: story.author.lastName,
        avatar: story.author.avatar
      } : null,
      event: story.event ? {
        _id: story.event._id,
        title: story.event.title,
        location: story.event.location?.address || story.event.location
      } : undefined,
      music: story.music,
      location: story.location,
      views: story.views?.length || 0,
      likes: story.likes?.length || 0,
      replies: story.replies?.length || 0,
      createdAt: story.createdAt,
      expiresAt: story.expiresAt,
      isViewed: req.user ? (story.views?.some(view => view.user.toString() === req.user.id) || false) : false,
      isLiked: req.user ? (story.likes?.some(like => like.user.toString() === req.user.id) || false) : false
    };

    res.json({
      success: true,
      data: formattedStory
    });
  } catch (error) {
    logger.error('Get story error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

const cloudinaryService = require('../services/cloudinaryService');
const { uploadMiddleware } = require('../middleware/upload');

// @desc    Get stories for a specific event
// @route   GET /api/stories/event/:eventId
// @access  Public (Optional Auth)
router.get('/event/:eventId', optionalAuth, async (req, res) => {
  try {
    const { eventId } = req.params;

    // Get stories for this event from last 24 hours that haven't expired
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const stories = await Story.find({
      event: eventId,
      createdAt: { $gte: twentyFourHoursAgo },
      expiresAt: { $gt: new Date() },
      isDeleted: false
    })
      .populate('author', 'username firstName lastName avatar verified')
      .populate('event', 'title location date')
      .sort({ createdAt: -1 });

    const formattedStories = stories.map(story => ({
      _id: story._id,
      content: story.content,
      style: story.style,
      media: story.media,
      author: story.author ? {
        _id: story.author._id,
        username: story.author.username,
        firstName: story.author.firstName,
        lastName: story.author.lastName,
        avatar: story.author.avatar
      } : null,
      event: story.event ? {
        _id: story.event._id,
        title: story.event.title,
        location: story.event.location?.address || story.event.location
      } : undefined,
      music: story.music,
      location: story.location,
      views: story.views?.length || 0,
      likes: story.likes?.length || 0,
      replies: story.replies?.length || 0,
      createdAt: story.createdAt,
      expiresAt: story.expiresAt,
      isViewed: story.views?.some(view => view.user.toString() === req.user.id) || false,
      isLiked: story.likes?.some(like => like.user.toString() === req.user.id) || false
    }));

    res.json({
      success: true,
      stories: formattedStories
    });
  } catch (error) {
    logger.error('Get event stories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Create new story
// @route   POST /api/stories
// @access  Private
router.post('/', protect, uploadMiddleware.array('media', 5), async (req, res) => {
  try {
    const { content, event, music, location } = req.body;
    const files = req.files;

    logger.info('Creating story request received');
    logger.info(`Headers: ${JSON.stringify(req.headers['content-type'])}`);
    logger.info(`Body content: ${content}`);
    logger.info(`Files count: ${files ? files.length : 0}`);
    if (files) {
      files.forEach((f, i) => logger.info(`File ${i}: ${f.originalname} (${f.mimetype}) ${f.size} bytes`));
    }

    if (!content && (!files || files.length === 0)) {
      logger.warn('Story creation failed: No content or media');
      return res.status(400).json({
        success: false,
        message: 'Story must have content or media'
      });
    }

    // If story is linked to an event, verify user is the event organizer
    if (event) {
      const Event = require('../models/Event');
      const eventDoc = await Event.findById(event);

      if (!eventDoc) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      // Check if user is the event organizer
      if ((eventDoc.createdBy || eventDoc.organizer)?.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Only the event organizer can create stories for this event'
        });
      }
    }

    // Process uploaded files
    const media = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const mediaItem = {
          type: file.mimetype.startsWith('image/') ? 'image' : 'video',
          url: file.url
        };

        // Upload to Cloudinary if configured
        if (cloudinaryService.isConfiguredProperly()) {
          try {
            // Determine resource type based on file mimetype
            const isVideo = file.mimetype.startsWith('video/');
            let cloudinaryResult;
            if (isVideo) {
              cloudinaryResult = await cloudinaryService.uploadFile(file.path, { folder: `stories/videos/${req.user.id}`, resource_type: 'video' });
            } else {
              cloudinaryResult = await cloudinaryService.uploadStoryImage(file.path, req.user.id);
            }

            if (cloudinaryResult) {
              mediaItem.url = cloudinaryResult.url;
              mediaItem.public_id = cloudinaryResult.public_id;

              if (cloudinaryResult.duration) {
                mediaItem.duration = cloudinaryResult.duration;
              }
              // If video, try to get thumbnail
              if (isVideo && cloudinaryResult.secure_url) {
                // Cloudinary generates thumbnails for videos by changing extension to .jpg
                // simplified approach
                mediaItem.thumbnail = cloudinaryResult.secure_url.replace(/\.[^/.]+$/, '.jpg');
              }
            }
          } catch (cloudinaryError) {
            logger.error('Cloudinary upload failed for story:', cloudinaryError);
            // Fallback to local URL (already set)
          }
        }

        media.push(mediaItem);
      }
    }

    // Set expiration to 24 hours from now
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const storyData = {
      author: req.user.id,
      content: content?.trim(),
      expiresAt,
      media // Add the processed media array
    };

    if (event) {
      storyData.event = event;
    }

    if (music) {
      // Parse music if it's sent as string (FormData limitations)
      try {
        storyData.music = typeof music === 'string' ? JSON.parse(music) : music;
      } catch (e) {
        // invalid json, ignore
      }
    }

    if (location) {
      try {
        storyData.location = typeof location === 'string' ? JSON.parse(location) : location;
      } catch (e) {
        // invalid json, ignore
      }
    }

    if (req.body.poll) {
      try {
        const pollData = typeof req.body.poll === 'string' ? JSON.parse(req.body.poll) : req.body.poll;
        // Basic validation
        if (pollData.question && Array.isArray(pollData.options) && pollData.options.length >= 2) {
          storyData.poll = {
            question: pollData.question,
            options: pollData.options.map(opt => ({ text: opt.text, votes: [] }))
          };
        }
      } catch (e) {
        // invalid json, ignore
      }
    }

    if (req.body.style) {
      storyData.style = req.body.style;
    }

    const story = await Story.create(storyData);
    await story.populate('author', 'username firstName lastName avatar verified');

    logger.info(`User ${req.user.id} created story ${story._id}`);

    const formattedStory = {
      _id: story._id,
      content: story.content,
      media: story.media,
      author: {
        _id: story.author._id,
        username: story.author.username,
        firstName: story.author.firstName,
        lastName: story.author.lastName,
        avatar: story.author.avatar
      },
      event: story.event,
      music: story.music,
      location: story.location,
      poll: story.poll, // Return poll data
      views: 0,
      likes: 0,
      replies: 0,
      createdAt: story.createdAt,
      expiresAt: story.expiresAt,
      isViewed: false,
      isLiked: false
    };

    res.status(201).json({
      success: true,
      message: 'Story created successfully',
      data: formattedStory
    });
  } catch (error) {
    logger.error('Create story error:', error);

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

// @desc    View story
// @route   POST /api/stories/:id/view
// @access  Private
router.post('/:id/view', protect, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    // Check if user already viewed this story
    const alreadyViewed = story.views?.some(view => view.user.toString() === req.user.id);

    if (!alreadyViewed) {
      story.views = story.views || [];
      story.views.push({
        user: req.user.id,
        viewedAt: new Date()
      });
      await story.save();
    }

    res.json({
      success: true,
      message: 'Story viewed'
    });
  } catch (error) {
    logger.error('View story error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Like/Unlike story
// @route   POST /api/stories/:id/like
// @access  Private
router.post('/:id/like', protect, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    const isLiked = story.likes?.some(like => like.user.toString() === req.user.id);

    if (isLiked) {
      // Unlike story
      story.likes = story.likes.filter(like => like.user.toString() !== req.user.id);
    } else {
      // Like story
      story.likes = story.likes || [];
      story.likes.push({
        user: req.user.id,
        likedAt: new Date()
      });
    }

    await story.save();

    logger.info(`User ${req.user.id} ${isLiked ? 'unliked' : 'liked'} story ${story._id}`);

    res.json({
      success: true,
      message: isLiked ? 'Story unliked' : 'Story liked'
    });
  } catch (error) {
    logger.error('Like story error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Reply to story
// @route   POST /api/stories/:id/reply
// @access  Private
router.post('/:id/reply', protect, async (req, res) => {
  try {
    const { reply } = req.body;

    if (!reply || !reply.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Reply content is required'
      });
    }

    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    story.replies = story.replies || [];
    story.replies.push({
      user: req.user.id,
      content: reply.trim(),
      createdAt: new Date()
    });

    await story.save();
    await story.populate('replies.user', 'username firstName lastName avatar');

    const newReply = story.replies[story.replies.length - 1];

    logger.info(`User ${req.user.id} replied to story ${story._id}`);

    res.status(201).json({
      success: true,
      data: {
        _id: newReply._id,
        content: newReply.content,
        author: newReply.user,
        createdAt: newReply.createdAt
      }
    });
  } catch (error) {
    logger.error('Reply to story error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get story replies
// @route   GET /api/stories/:id/replies
// @access  Private
router.get('/:id/replies', protect, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
      .populate('replies.user', 'username firstName lastName avatar');

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    const replies = story.replies?.map(reply => ({
      _id: reply._id,
      content: reply.content,
      author: reply.user,
      createdAt: reply.createdAt
    })) || [];

    res.json({
      success: true,
      replies
    });
  } catch (error) {
    logger.error('Get story replies error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});



// @desc    Delete story
// @route   DELETE /api/stories/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    // Check if user owns the story
    if (story.author.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this story'
      });
    }

    story.isDeleted = true;
    await story.save();

    logger.info(`User ${req.user.id} deleted story ${story._id}`);

    res.json({
      success: true,
      message: 'Story deleted successfully'
    });
  } catch (error) {
    logger.error('Delete story error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Vote on story poll
// @route   POST /api/stories/:id/poll/vote
// @access  Private
router.post('/:id/poll/vote', protect, async (req, res) => {
  try {
    const { optionIndex } = req.body;

    if (optionIndex === undefined || optionIndex === null) {
      return res.status(400).json({
        success: false,
        message: 'Option index is required'
      });
    }

    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    if (!story.poll || !story.poll.options || !story.poll.options[optionIndex]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid poll option'
      });
    }

    // Remove previous vote if exists
    story.poll.options.forEach(opt => {
      opt.votes = opt.votes.filter(v => v.toString() !== req.user.id);
    });

    // Add new vote
    story.poll.options[optionIndex].votes.push(req.user.id);

    await story.save();

    res.json({
      success: true,
      message: 'Vote recorded',
      poll: story.poll
    });

  } catch (error) {
    logger.error('Poll vote error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
