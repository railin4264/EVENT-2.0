const express = require('express');
const mongoose = require('mongoose');
const { protect: auth } = require('../middleware/auth');
const User = require('../models/User');
const Event = require('../models/Event');
const Follow = require('../models/Follow');

const router = express.Router();

// Get advanced analytics for event creators (B2B Feature)
router.get('/creator-analytics', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    // Find all events created by this user
    const events = await Event.find({ createdBy: userId });

    if (!events.length) {
      return res.json({ success: true, data: { totalViews: 0, totalAttendees: 0, conversionRate: 0, eventsData: [] } });
    }

    let totalViews = 0;
    let totalAttendees = 0;

    const eventsData = events.map(event => {
      const viewsCount = event.views ? event.views.length : 0;
      const attendeesCount = event.attendees ? event.attendees.length : 0;

      totalViews += viewsCount;
      totalAttendees += attendeesCount;

      return {
        _id: event._id,
        title: event.title,
        views: viewsCount,
        attendees: attendeesCount,
        conversionRate: viewsCount > 0 ? ((attendeesCount / viewsCount) * 100).toFixed(2) : 0,
        status: event.status
      };
    });

    const aggregateConversionRate = totalViews > 0 ? ((totalAttendees / totalViews) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        totalViews,
        totalAttendees,
        aggregateConversionRate: `${aggregateConversionRate}%`,
        eventsData
      }
    });
  } catch (error) {
    console.error('Creator analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch creator analytics' });
  }
});

// Get user dashboard stats (fixed ObjectId casting)
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    // Get user stats
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Count events attended
    const eventsAttended = await Event.countDocuments({
      'attendees.user': userObjectId,
      date: { $lt: currentDate }
    });

    // Count events created
    const eventsCreated = await Event.countDocuments({
      createdBy: userObjectId
    });

    // Count connections (followers + following)
    const followersCount = await Follow.countDocuments({ following: userObjectId, status: 'accepted' });
    const followingCount = await Follow.countDocuments({ follower: userObjectId, status: 'accepted' });
    const connections = followersCount + followingCount;

    // Monthly growth
    const monthlyEventsAttended = await Event.countDocuments({
      'attendees.user': userObjectId,
      date: { $gte: firstDayOfMonth, $lt: currentDate }
    });

    const monthlyConnections = await Follow.countDocuments({
      $or: [
        { follower: userObjectId, status: 'accepted', createdAt: { $gte: firstDayOfMonth } },
        { following: userObjectId, status: 'accepted', createdAt: { $gte: firstDayOfMonth } }
      ]
    });

    // Calculate user level based on points
    const points = user.points || 0;
    let level = 'Explorer';
    if (points >= 5000) level = 'Legend';
    else if (points >= 2500) level = 'Expert';
    else if (points >= 1000) level = 'Advanced';
    else if (points >= 500) level = 'Intermediate';
    else if (points >= 100) level = 'Beginner';

    const stats = {
      eventsAttended,
      eventsCreated,
      connections,
      points,
      level,
      monthlyGrowth: {
        events: monthlyEventsAttended,
        connections: monthlyConnections
      }
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
  }
});

// Get user's upcoming events
router.get('/upcoming-events', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const limit = parseInt(req.query.limit) || 5;
    const currentDate = new Date();

    // Get events user is attending or created
    const upcomingEvents = await Event.find({
      $or: [
        { 'attendees.user': userObjectId },
        { createdBy: userObjectId }
      ],
      date: { $gte: currentDate }
    })
      .sort({ date: 1 })
      .limit(limit)
      .select('title date location category attendees');

    const formattedEvents = upcomingEvents.map(event => ({
      _id: event._id,
      title: event.title,
      date: event.date,
      location: {
        name: event.location?.venue || event.location?.address || event.location?.name || 'TBD',
        coordinates: event.location?.coordinates || [0, 0]
      },
      category: event.category,
      attendees: event.attendees?.length || 0
    }));

    res.json({ success: true, data: formattedEvents });
  } catch (error) {
    console.error('Upcoming events error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch upcoming events' });
  }
});

// Get suggested connections
router.get('/suggested-connections', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const limit = parseInt(req.query.limit) || 5;

    // Get users the current user is already following
    const following = await Follow.find({
      follower: userObjectId,
      status: 'accepted'
    }).select('following');

    const followingIds = following.map(f => f.following);
    followingIds.push(userObjectId); // Exclude self

    // Find users with mutual connections or similar interests
    const suggestedUsers = await User.find({
      _id: { $nin: followingIds },
      isActive: true
    })
      .limit(limit * 3) // Get more to filter and randomize
      .select('name avatar interests location');

    // Calculate mutual friends and common interests for each suggestion
    const suggestions = [];

    for (const user of suggestedUsers) {
      // Count mutual connections
      const mutualFriends = await Follow.countDocuments({
        follower: { $in: followingIds },
        following: user._id,
        status: 'accepted'
      });

      // Get current user's interests for comparison
      const currentUser = await User.findById(userId).select('interests');
      const commonInterests = user.interests?.filter(interest =>
        currentUser.interests?.includes(interest)
      ) || [];

      suggestions.push({
        _id: user._id,
        name: user.name,
        avatar: user.avatar,
        mutualFriends,
        commonInterests: commonInterests.slice(0, 3), // Limit to 3 interests
        location: user.location?.city
      });
    }

    // Sort by relevance (mutual friends + common interests)
    suggestions.sort((a, b) => {
      const scoreA = a.mutualFriends * 2 + a.commonInterests.length;
      const scoreB = b.mutualFriends * 2 + b.commonInterests.length;
      return scoreB - scoreA;
    });

    const finalSuggestions = suggestions.slice(0, limit);

    res.json({ success: true, data: finalSuggestions });
  } catch (error) {
    console.error('Suggested connections error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch suggested connections' });
  }
});

module.exports = router;