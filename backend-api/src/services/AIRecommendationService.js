const Anthropic = require('@anthropic-ai/sdk');
const Event = require('../models/Event');
const User = require('../models/User');
const Tribe = require('../models/Tribe');
const Post = require('../models/Post');
const Follow = require('../models/Follow');

class AIRecommendationService {
  constructor() {
    this.useMLModel = process.env.USE_ML_MODEL === 'true';
    this.fallbackToRules = true;
    this.userPreferences = new Map(); // Cache for user preferences
    this.eventInteractions = new Map(); // Cache for event interactions
  }

  // Initialize user preference learning
  async initializeUserProfile(userId) {
    try {
      const user = await User.findById(userId).populate('interests');
      const userEvents = await Event.find({
        $or: [
          { createdBy: userId },
          { attendees: userId }
        ]
      });

      const followedUsers = await Follow.find({ follower: userId });
      const userPosts = await Post.find({ user: userId });

      // Analyze user behavior patterns
      const preferences = this.analyzeUserBehavior(user, userEvents, followedUsers, userPosts);
      this.userPreferences.set(userId.toString(), preferences);

      return preferences;
    } catch (error) {
      console.error('Error initializing user profile:', error);
      return null;
    }
  }

  // Analyze user behavior patterns
  analyzeUserBehavior(user, events, follows, posts) {
    const preferences = {
      categories: {},
      timePreferences: {},
      locationPreferences: {},
      socialActivity: 0,
      eventCreationRate: 0,
      participationRate: 0
    };

    // Analyze event categories
    events.forEach(event => {
      preferences.categories[event.category] = (preferences.categories[event.category] || 0) + 1;
    });

    // Analyze time preferences
    events.forEach(event => {
      const hour = new Date(event.date).getHours();
      const timeSlot = this.getTimeSlot(hour);
      preferences.timePreferences[timeSlot] = (preferences.timePreferences[timeSlot] || 0) + 1;
    });

    // Calculate social activity score
    preferences.socialActivity = follows.length + (posts.length * 2);
    preferences.eventCreationRate = events.filter(e => e.createdBy.toString() === user._id.toString()).length;
    preferences.participationRate = events.filter(e => e.attendees.includes(user._id)).length;

    return preferences;
  }

  // Get time slot for time preferences
  getTimeSlot(hour) {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
  }

  // Event Recommendations
  async getEventRecommendations(user, options = {}) {
    try {
      const { location, radius = 25, limit = 10 } = options;

      // Initialize or get user preferences
      let userPrefs = this.userPreferences.get(user._id.toString());
      if (!userPrefs) {
        userPrefs = await this.initializeUserProfile(user._id);
      }

      // Get both rule-based and collaborative filtering recommendations
      const ruleBasedRecs = await this.getRuleBasedEventRecommendations(user, options, userPrefs);
      const collaborativeRecs = await this.getCollaborativeRecommendations(user, options, userPrefs);

      // Merge and rank recommendations
      const mergedRecs = this.mergeRecommendations(ruleBasedRecs, collaborativeRecs, limit);

      return mergedRecs;
    } catch (error) {
      console.error('Error in getEventRecommendations:', error);
      return [];
    }
  }

  // Collaborative filtering recommendations
  async getCollaborativeRecommendations(user, options, userPrefs) {
    try {
      // Find similar users based on interests and behavior
      const similarUsers = await this.findSimilarUsers(user, userPrefs);

      if (similarUsers.length === 0) {
        return [];
      }

      // Get events that similar users attended/created
      const similarUserIds = similarUsers.map(u => u.userId);
      const query = {
        status: 'published',
        date: { $gte: new Date() },
        isPrivate: false,
        $or: [
          { createdBy: { $in: similarUserIds } },
          { attendees: { $in: similarUserIds } }
        ],
        attendees: { $ne: user._id }, // Don't recommend events user already joined
        createdBy: { $ne: user._id } // Don't recommend user's own events
      };

      const events = await Event.find(query)
        .populate('createdBy', 'firstName lastName avatar')
        .limit(options.limit || 10);

      return events.map(event => ({
        ...event.toObject(),
        recommendationScore: 15, // Base collaborative score
        recommendationReasons: ['Usuarios similares están interesados'],
        recommendationType: 'collaborative_filtering',
        confidence: 75
      }));
    } catch (error) {
      console.error('Error in collaborative filtering:', error);
      return [];
    }
  }

  // Find users with similar preferences
  async findSimilarUsers(user, userPrefs) {
    try {
      const users = await User.find({
        _id: { $ne: user._id },
        interests: { $in: user.interests || [] }
      }).limit(50);

      const similarities = [];

      for (const otherUser of users) {
        const similarity = this.calculateUserSimilarity(userPrefs, otherUser);
        if (similarity > 0.3) { // Minimum similarity threshold
          similarities.push({
            userId: otherUser._id,
            similarity
          });
        }
      }

      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 10); // Top 10 similar users
    } catch (error) {
      console.error('Error finding similar users:', error);
      return [];
    }
  }

  // Calculate similarity between users
  calculateUserSimilarity(userPrefs, otherUser) {
    let similarity = 0;
    let factors = 0;

    // Interest similarity
    const commonInterests = (userPrefs.user?.interests || [])
      .filter(interest => (otherUser.interests || []).includes(interest));

    if (commonInterests.length > 0) {
      similarity += (commonInterests.length / Math.max(userPrefs.user?.interests?.length || 1, otherUser.interests?.length || 1)) * 0.4;
      factors++;
    }

    // Location similarity (if available)
    if (userPrefs.user?.location && otherUser.location) {
      // Simple location similarity - in real implementation, calculate actual distance
      similarity += 0.2;
      factors++;
    }

    return factors > 0 ? similarity / factors : 0;
  }

  // Merge different recommendation types
  mergeRecommendations(ruleBasedRecs, collaborativeRecs, limit) {
    const allRecs = new Map();

    // Add rule-based recommendations
    ruleBasedRecs.forEach(rec => {
      allRecs.set(rec._id.toString(), {
        ...rec,
        finalScore: rec.recommendationScore * 1.0 // Rule-based weight
      });
    });

    // Add collaborative filtering recommendations
    collaborativeRecs.forEach(rec => {
      const eventId = rec._id.toString();
      if (allRecs.has(eventId)) {
        // Combine scores if event appears in both
        const existing = allRecs.get(eventId);
        existing.finalScore += rec.recommendationScore * 0.8; // Collaborative weight
        existing.recommendationReasons.push(...rec.recommendationReasons);
        existing.recommendationType = 'hybrid';
      } else {
        allRecs.set(eventId, {
          ...rec,
          finalScore: rec.recommendationScore * 0.8
        });
      }
    });

    return Array.from(allRecs.values())
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, limit);
  }

  async getRuleBasedEventRecommendations(user, options, userPrefs = null) {
    const { location, radius = 25, limit = 10 } = options;

    // Build event query
    const query = {
      status: 'published',
      date: { $gte: new Date() },
      isPrivate: false
    };

    // Geographic filter
    if (location || user.location?.coordinates) {
      const coords = location
        ? [location.lng, location.lat]
        : user.location.coordinates;
      query.location = {
        $geoWithin: {
          $centerSphere: [coords, radius / 6371]
        }
      };
    }

    const events = await Event.find(query)
      .populate('createdBy', 'firstName lastName avatar')
      .limit(limit * 2);

    // Rule-based scoring system with enhanced AI
    const scoredEvents = events.map(event => {
      let score = 0;
      const reasons = [];

      // Score by user interests (enhanced with preference analysis)
      const userInterests = user.interests || [];
      const eventCategory = event.category;

      if (userInterests.includes(eventCategory)) {
        let categoryScore = 20;
        // Boost score if this category is highly preferred by user
        if (userPrefs?.categories?.[eventCategory]) {
          categoryScore += Math.min(userPrefs.categories[eventCategory] * 2, 10);
        }
        score += categoryScore;
        reasons.push('Coincide con tus intereses');
      }

      // Score by time preferences
      if (userPrefs?.timePreferences) {
        const eventHour = new Date(event.date).getHours();
        const eventTimeSlot = this.getTimeSlot(eventHour);
        if (userPrefs.timePreferences[eventTimeSlot]) {
          score += Math.min(userPrefs.timePreferences[eventTimeSlot], 8);
          reasons.push('Horario preferido');
        }
      }

      // Score by popularity
      const attendeesCount = event.attendees?.length || 0;
      if (attendeesCount > 0) {
        score += Math.min(attendeesCount / 10, 15);
        if (attendeesCount > 20) {
          reasons.push('Evento popular');
        }
      }

      // Score by newness
      const daysSinceCreated = (Date.now() - event.createdAt) / (1000 * 60 * 60 * 24);
      if (daysSinceCreated < 3) {
        score += 10;
        reasons.push('Evento reciente');
      }

      // Score by time until event
      const daysUntilEvent = (event.date - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysUntilEvent >= 1 && daysUntilEvent <= 14) {
        score += 15;
        reasons.push('Fecha ideal para planear');
      }

      return {
        ...event.toObject(),
        recommendationScore: Math.max(score, 0),
        recommendationReasons: reasons,
        recommendationType: 'rule_based',
        confidence: this.calculateConfidence(score, reasons.length)
      };
    });

    return scoredEvents
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, limit);
  }

  // Tribe Recommendations
  async getTribeRecommendations(user, options = {}) {
    const { limit = 5 } = options;

    try {
      const userInterests = user.interests || [];

      const query = {
        isActive: true,
        'settings.privacy': { $ne: 'secret' }
      };

      const tribes = await Tribe.find(query)
        .populate('creator', 'firstName lastName avatar')
        .limit(limit * 2);

      const scoredTribes = tribes.map(tribe => {
        let score = 0;
        const reasons = [];

        // Score by interests
        if (userInterests.includes(tribe.category)) {
          score += 25;
          reasons.push('Coincide con tus intereses');
        }

        // Score by optimal size
        const memberCount = tribe.members?.length || 0;
        if (memberCount >= 5 && memberCount <= 100) {
          score += 15;
          reasons.push('Tamaño de comunidad ideal');
        }

        // Score by activity
        const daysSinceCreated = (Date.now() - tribe.createdAt) / (1000 * 60 * 60 * 24);
        if (daysSinceCreated < 30) {
          score += 10;
          reasons.push('Comunidad nueva');
        }

        return {
          ...tribe.toObject(),
          recommendationScore: score,
          recommendationReasons: reasons,
          recommendationType: 'rule_based',
          confidence: this.calculateConfidence(score, reasons.length)
        };
      });

      return scoredTribes
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, limit);
    } catch (error) {
      console.error('Error in getTribeRecommendations:', error);
      return [];
    }
  }

  // Trending Content
  async getTrendingContent(options = {}) {
    const { timeframe = '24h', location, limit = 10, category } = options;

    try {
      const timeframeDays = this.parseTimeframe(timeframe);
      const since = new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1000);

      const query = {
        createdAt: { $gte: since },
        status: 'published',
        isPrivate: false
      };

      if (category) {
        query.category = category;
      }

      if (location) {
        query.location = {
          $geoWithin: {
            $centerSphere: [[location.lng, location.lat], 50 / 6371]
          }
        };
      }

      const events = await Event.find(query)
        .populate('createdBy', 'firstName lastName avatar')
        .limit(limit * 2);

      const trendingEvents = events.map(event => {
        const daysSinceCreated = (Date.now() - event.createdAt) / (1000 * 60 * 60 * 24);
        const attendeesCount = event.attendees?.length || 0;

        const score = attendeesCount / Math.pow(daysSinceCreated + 1, 1.5);

        return {
          ...event.toObject(),
          trendingScore: score,
          recommendationType: 'trending'
        };
      });

      return trendingEvents
        .sort((a, b) => b.trendingScore - a.trendingScore)
        .slice(0, limit);
    } catch (error) {
      console.error('Error in getTrendingContent:', error);
      return [];
    }
  }

  // Utilities
  calculateConfidence(score, reasonCount) {
    const normalizedScore = Math.min(score / 100, 1);
    const reasonBonus = Math.min(reasonCount / 5, 1);
    return Math.round((normalizedScore * 0.7 + reasonBonus * 0.3) * 100);
  }

  parseTimeframe(timeframe) {
    const match = timeframe.match(/(\d+)([hdw])/);
    if (!match) return 1;

    const [, num, unit] = match;
    const number = parseInt(num);

    switch (unit) {
    case 'h': return number / 24;
    case 'd': return number;
    case 'w': return number * 7;
    default: return 1;
    }
  }

  // New: User Recommendations (people to follow)
  async getUserRecommendations(user, options = {}) {
    try {
      const { limit = 5 } = options;

      // Get users with similar interests
      const userInterests = user.interests || [];
      if (userInterests.length === 0) {
        return [];
      }

      const candidateUsers = await User.find({
        _id: { $ne: user._id },
        interests: { $in: userInterests }
      }).limit(50);

      // Filter out users already followed
      const followedUsers = await Follow.find({ follower: user._id });
      const followedIds = followedUsers.map(f => f.following.toString());

      const recommendations = candidateUsers
        .filter(candidate => !followedIds.includes(candidate._id.toString()))
        .map(candidate => {
          const commonInterests = userInterests.filter(
            interest => candidate.interests.includes(interest)
          );

          return {
            user: {
              id: candidate._id,
              username: candidate.username,
              firstName: candidate.firstName,
              lastName: candidate.lastName,
              avatar: candidate.avatar,
              bio: candidate.bio
            },
            score: commonInterests.length,
            reasons: [`${commonInterests.length} intereses en común`],
            commonInterests
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return recommendations;
    } catch (error) {
      console.error('Error getting user recommendations:', error);
      return [];
    }
  }

  // New: Smart Feed Curation
  async getCuratedFeed(user, options = {}) {
    try {
      const { limit = 20, offset = 0 } = options;

      // Get user preferences
      let userPrefs = this.userPreferences.get(user._id.toString());
      if (!userPrefs) {
        userPrefs = await this.initializeUserProfile(user._id);
      }

      // Get followed users
      const followedUsers = await Follow.find({ follower: user._id });
      const followedIds = followedUsers.map(f => f.following);

      // Get posts from followed users and trending content
      const feedPosts = await Post.find({
        $or: [
          { user: { $in: followedIds } },
          { visibility: 'public' }
        ],
        isDeleted: false
      })
        .populate('user', 'firstName lastName username avatar')
        .populate('eventData.eventId', 'title date location category')
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit * 2);

      // Score posts based on relevance
      const scoredPosts = feedPosts.map(post => {
        let score = 0;
        const reasons = [];

        // Higher score for followed users
        if (followedIds.some(id => id.toString() === post.user._id.toString())) {
          score += 30;
          reasons.push('De alguien que sigues');
        }

        // Score by engagement
        const likes = post.likes?.length || 0;
        const comments = post.comments?.length || 0;
        if (likes > 0 || comments > 0) {
          score += Math.min((likes + comments * 2), 20);
          if (likes > 10) reasons.push('Contenido popular');
        }

        // Score by content type preference
        if (post.eventData?.eventId && userPrefs?.categories?.[post.eventData.eventId.category]) {
          score += 15;
          reasons.push('Categoría de interés');
        }

        // Recency boost
        const hoursOld = (Date.now() - post.createdAt) / (1000 * 60 * 60);
        if (hoursOld < 24) {
          score += Math.max(24 - hoursOld, 0) * 0.5;
        }

        return {
          ...post.toObject(),
          feedScore: score,
          feedReasons: reasons
        };
      });

      return scoredPosts
        .sort((a, b) => b.feedScore - a.feedScore)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting curated feed:', error);
      return [];
    }
  }

  // New: Learning from user interactions
  async recordUserInteraction(userId, eventId, interactionType) {
    try {
      const userIdStr = userId.toString();
      const interactions = this.eventInteractions.get(userIdStr) || {};

      if (!interactions[eventId]) {
        interactions[eventId] = [];
      }

      interactions[eventId].push({
        type: interactionType, // 'view', 'like', 'attend', 'share'
        timestamp: new Date()
      });

      this.eventInteractions.set(userIdStr, interactions);

      // Update user preferences based on interaction
      await this.updateUserPreferences(userId, eventId, interactionType);
    } catch (error) {
      console.error('Error recording user interaction:', error);
    }
  }

  async updateUserPreferences(userId, eventId, interactionType) {
    try {
      const event = await Event.findById(eventId);
      if (!event) return;

      const userPrefs = this.userPreferences.get(userId.toString()) || {};

      // Update category preferences based on interaction strength
      const interactionWeight = {
        'view': 1,
        'like': 3,
        'attend': 5,
        'share': 4
      };

      const weight = interactionWeight[interactionType] || 1;
      userPrefs.categories = userPrefs.categories || {};
      userPrefs.categories[event.category] = (userPrefs.categories[event.category] || 0) + weight;

      // Update time preferences
      const eventHour = new Date(event.date).getHours();
      const timeSlot = this.getTimeSlot(eventHour);
      userPrefs.timePreferences = userPrefs.timePreferences || {};
      userPrefs.timePreferences[timeSlot] = (userPrefs.timePreferences[timeSlot] || 0) + weight;

      this.userPreferences.set(userId.toString(), userPrefs);
    } catch (error) {
      console.error('Error updating user preferences:', error);
    }
  }

  // Enhance event title and description using Claude AI
  async enhanceEventDescriptionWithAI(title, description) {
    if (!process.env.ANTHROPIC_API_KEY) return null;
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Eres un experto en marketing de eventos. Mejora este evento para que sea más atractivo y genere más asistencia. Responde SOLO con JSON: {"title": "...", "description": "..."}

Título original: ${title || ''}
Descripción original: ${description || ''}

El texto debe estar en español latinoamericano, ser emocionante, profesional, máximo 2 párrafos para la descripción.`
        }]
      });
      const text = message.content[0].text;
      return JSON.parse(text);
    } catch (error) {
      console.error('Error calling Claude API for event enhancement:', error);
      return null;
    }
  }

  // Get smart recommendations with AI-generated rationale for each event
  async getSmartRecommendations(user, options = {}) {
    try {
      // Get top 5 events via existing rule-based logic
      const topEvents = await this.getEventRecommendations(user, { ...options, limit: 5 });

      if (topEvents.length === 0) {
        return [];
      }

      // If no API key, return events without AI reasons
      if (!process.env.ANTHROPIC_API_KEY) {
        return topEvents.map(event => ({
          ...event,
          aiReason: event.recommendationReasons.join('. ') || 'Recomendado para ti'
        }));
      }

      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const userInterests = (user.interests || []).join(', ') || 'variados';
      const eventList = topEvents.map((e, i) =>
        `${i + 1}. "${e.title}" - Categoría: ${e.category || 'General'} - Fecha: ${e.date ? new Date(e.date).toLocaleDateString('es-DO') : 'Por confirmar'}`
      ).join('\n');

      const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: `Eres un asistente de recomendaciones de eventos. El usuario tiene los siguientes intereses: ${userInterests}.

Aquí hay ${topEvents.length} eventos recomendados para él/ella:
${eventList}

Para cada evento, escribe una frase corta y emocionante en español latinoamericano (máximo 20 palabras) explicando por qué le encantaría. Responde SOLO con un JSON array en este formato exacto:
[{"index": 1, "reason": "..."}, {"index": 2, "reason": "..."}, ...]`
        }]
      });

      const text = message.content[0].text;
      const reasons = JSON.parse(text);
      const reasonMap = {};
      reasons.forEach(r => { reasonMap[r.index] = r.reason; });

      return topEvents.map((event, i) => ({
        ...event,
        aiReason: reasonMap[i + 1] || event.recommendationReasons.join('. ') || 'Recomendado para ti'
      }));
    } catch (error) {
      console.error('Error in getSmartRecommendations:', error);
      // Fall back to rule-based results without AI reasons
      try {
        const fallbackEvents = await this.getEventRecommendations(user, { ...options, limit: 5 });
        return fallbackEvents.map(event => ({
          ...event,
          aiReason: event.recommendationReasons.join('. ') || 'Recomendado para ti'
        }));
      } catch (fallbackError) {
        console.error('Error in getSmartRecommendations fallback:', fallbackError);
        return [];
      }
    }
  }
}

module.exports = new AIRecommendationService();





